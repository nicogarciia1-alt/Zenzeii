"""
Business logic for the Zenzeii Library Catalog (Layer 1).

Owns filter parsing, MongoDB query construction, index management, and the
read operations backing the /api/catalog endpoints. Contains no FastAPI or
HTTP-specific code — callers (routers/catalog.py) are responsible for
turning a raised ValueError into the appropriate HTTP error response.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.catalog_models import (
    BookCatalogDetail,
    BookCatalogItem,
    CatalogListResponse,
    CatalogQueryParams,
    EntityStatus,
    GenreResponse,
    LENGTH_MEDIUM_MAX_PAGES,
    LENGTH_SHORT_MAX_PAGES,
    LengthCategory,
    SortOption,
)

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Computed fields
# --------------------------------------------------------------------------

def compute_length_category(page_count: Optional[int]) -> Optional[LengthCategory]:
    """
    Derives length_category from page_count at write time.

    Never accepted as direct user input — always recomputed from page_count
    so the two fields can't drift out of sync with each other.
    """
    if page_count is None:
        return None
    if page_count <= LENGTH_SHORT_MAX_PAGES:
        return LengthCategory.SHORT
    if page_count <= LENGTH_MEDIUM_MAX_PAGES:
        return LengthCategory.MEDIUM
    return LengthCategory.LONG


# --------------------------------------------------------------------------
# Indexes
# --------------------------------------------------------------------------

async def ensure_catalog_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Creates every index required by Layer 1 filters and sorts.

    Not wired into server.py's own startup — that file is restricted to a
    single router-registration line for this brief. Called explicitly from
    scripts/seed_catalog.py instead. Safe to call repeatedly: create_index
    is a no-op when an identical index already exists.
    """
    # genres
    await db.genres.create_index([("id", 1)], unique=True)
    await db.genres.create_index([("layer", 1)])

    # book_catalog — identity
    await db.book_catalog.create_index([("id", 1)], unique=True)

    # book_catalog — text search
    await db.book_catalog.create_index(
        [("title_jp", "text"), ("title_en", "text"), ("author_name", "text")],
        name="catalog_text_search",
        language_override="catalog_text_language_unused",
    )

    # book_catalog — Layer 1 filters
    await db.book_catalog.create_index([("genre_ids", 1)])
    await db.book_catalog.create_index([("difficulty", 1)])
    await db.book_catalog.create_index([("jlpt_level", 1)])
    await db.book_catalog.create_index([("language", 1)])
    await db.book_catalog.create_index([("availability", 1)])
    await db.book_catalog.create_index([("length_category", 1)])
    await db.book_catalog.create_index([("copyright_status", 1)])
    await db.book_catalog.create_index([("entity_status", 1)])

    # book_catalog — Layer 1 sorts
    await db.book_catalog.create_index([("popularity_score", -1)])
    await db.book_catalog.create_index([("rating_avg", -1)])
    await db.book_catalog.create_index([("added_at", -1)])
    await db.book_catalog.create_index([("publication_year", -1)])
    await db.book_catalog.create_index([("title_en", 1)])

    # book_catalog — compound filter+sort (most common combinations)
    await db.book_catalog.create_index([("genre_ids", 1), ("popularity_score", -1)])
    await db.book_catalog.create_index([("difficulty", 1), ("popularity_score", -1)])
    await db.book_catalog.create_index([("availability", 1), ("added_at", -1)])
    await db.book_catalog.create_index([("entity_status", 1), ("popularity_score", -1)])

    logger.info("book_catalog and genres indexes ensured")


# --------------------------------------------------------------------------
# Sort parsing / mapping
# --------------------------------------------------------------------------

_SORT_FIELD_MAP: Dict[SortOption, List[Tuple[str, int]]] = {
    SortOption.POPULAR: [("popularity_score", -1)],
    SortOption.RATING: [("rating_avg", -1)],
    SortOption.RECENT: [("added_at", -1)],
    SortOption.YEAR: [("publication_year", -1)],
    SortOption.TITLE: [("title_en", 1)],
}


def parse_sort(raw_sort: Optional[str]) -> SortOption:
    """
    Validates a raw `sort` query value against SortOption.

    Accepted as a plain string at the FastAPI layer (not a typed enum) so an
    unknown value can be reported as HTTP 400 "invalid filter value" per the
    brief, rather than FastAPI's automatic 422 for type/enum mismatches.
    """
    if raw_sort is None:
        return SortOption.POPULAR
    try:
        return SortOption(raw_sort)
    except ValueError:
        valid = ", ".join(option.value for option in SortOption)
        raise ValueError(f"Invalid sort value '{raw_sort}'. Must be one of: {valid}")


def build_sort_spec(sort: SortOption) -> List[Tuple[str, int]]:
    """Maps a validated SortOption to a MongoDB sort specification."""
    return _SORT_FIELD_MAP[sort]


# --------------------------------------------------------------------------
# Filter parsing / query building
# --------------------------------------------------------------------------

async def validate_genre_ids(db: AsyncIOMotorDatabase, genre_ids: List[str]) -> None:
    """
    Confirms every requested genre_id exists in the genres collection.

    Raises ValueError (mapped to HTTP 400 by the router) if any are unknown.
    """
    if not genre_ids:
        return
    known = await db.genres.distinct("id", {"id": {"$in": genre_ids}})
    unknown = set(genre_ids) - set(known)
    if unknown:
        raise ValueError(f"Unknown genre id(s): {', '.join(sorted(unknown))}")


def build_catalog_filter(params: CatalogQueryParams) -> Dict[str, Any]:
    """
    Translates validated CatalogQueryParams into a MongoDB filter document.

    Only entity_status="published" books are ever returned by the catalog
    endpoints — draft and archived entries are mid-curation or retired and
    are not part of the public library. This base filter is unconditional.
    """
    query: Dict[str, Any] = {"entity_status": EntityStatus.PUBLISHED.value}

    if params.q:
        query["$text"] = {"$search": params.q}

    if params.genre:
        query["genre_ids"] = {"$in": params.genre}

    if params.difficulty:
        query["difficulty"] = {"$in": [value.value for value in params.difficulty]}

    if params.jlpt:
        query["jlpt_level"] = {"$in": [value.value for value in params.jlpt]}

    if params.length:
        query["length_category"] = {"$in": [value.value for value in params.length]}

    if params.language:
        query["language"] = {"$in": [value.value for value in params.language]}

    if params.availability:
        query["availability"] = {"$in": [value.value for value in params.availability]}

    if params.year_from is not None or params.year_to is not None:
        year_range: Dict[str, int] = {}
        if params.year_from is not None:
            year_range["$gte"] = params.year_from
        if params.year_to is not None:
            year_range["$lte"] = params.year_to
        query["publication_year"] = year_range

    return query


def build_filters_applied(params: CatalogQueryParams) -> Dict[str, List[str]]:
    """Builds the `filters_applied` field for the API response — non-empty filters only."""
    applied: Dict[str, List[str]] = {}

    if params.genre:
        applied["genre"] = params.genre
    if params.difficulty:
        applied["difficulty"] = [value.value for value in params.difficulty]
    if params.jlpt:
        applied["jlpt"] = [value.value for value in params.jlpt]
    if params.length:
        applied["length"] = [value.value for value in params.length]
    if params.language:
        applied["language"] = [value.value for value in params.language]
    if params.availability:
        applied["availability"] = [value.value for value in params.availability]

    return applied


# --------------------------------------------------------------------------
# Shelf status
# --------------------------------------------------------------------------

async def get_shelved_book_ids(
    db: AsyncIOMotorDatabase,
    user_id: Optional[str],
    book_ids: List[str],
) -> set:
    """
    Returns the subset of book_ids the given user already has on a shelf.

    Returns an empty set with no query when user_id is None (unauthenticated
    request) — per the brief, is_on_shelf must always be false in that case.
    """
    if not user_id or not book_ids:
        return set()
    cursor = db.user_shelves.find(
        {"user_id": user_id, "book_id": {"$in": book_ids}},
        {"book_id": 1},
    )
    return {doc["book_id"] async for doc in cursor}


# --------------------------------------------------------------------------
# Read operations
# --------------------------------------------------------------------------

async def list_catalog(
    db: AsyncIOMotorDatabase,
    params: CatalogQueryParams,
    user_id: Optional[str] = None,
) -> CatalogListResponse:
    """
    Executes a filtered, sorted, paginated catalog query.

    Raises ValueError (mapped to HTTP 400 by the router) if any requested
    genre_id is unknown.
    """
    await validate_genre_ids(db, params.genre)

    mongo_filter = build_catalog_filter(params)
    sort_spec = build_sort_spec(params.sort)
    skip = (params.page - 1) * params.limit

    total = await db.book_catalog.count_documents(mongo_filter)
    cursor = (
        db.book_catalog.find(mongo_filter)
        .sort(sort_spec)
        .skip(skip)
        .limit(params.limit)
    )
    raw_books = [doc async for doc in cursor]

    shelved_ids = await get_shelved_book_ids(db, user_id, [doc["id"] for doc in raw_books])
    books = [
        BookCatalogItem(**doc, is_on_shelf=doc["id"] in shelved_ids)
        for doc in raw_books
    ]

    pages = (total + params.limit - 1) // params.limit if total > 0 else 0

    return CatalogListResponse(
        total=total,
        page=params.page,
        limit=params.limit,
        pages=pages,
        sort=params.sort,
        filters_applied=build_filters_applied(params),
        books=books,
    )


async def get_book_by_id(
    db: AsyncIOMotorDatabase,
    book_id: str,
    user_id: Optional[str] = None,
) -> Optional[BookCatalogDetail]:
    """
    Fetches a single published catalog entry.

    Returns None (mapped to HTTP 404 by the router) if the book doesn't
    exist, or exists but is not entity_status="published" — draft and
    archived entries are never visible through this endpoint.
    """
    doc = await db.book_catalog.find_one({
        "id": book_id,
        "entity_status": EntityStatus.PUBLISHED.value,
    })
    if doc is None:
        return None

    shelved_ids = await get_shelved_book_ids(db, user_id, [book_id])
    return BookCatalogDetail(**doc, is_on_shelf=book_id in shelved_ids)


async def list_genres(db: AsyncIOMotorDatabase) -> List[GenreResponse]:
    """Returns all genres for the filter UI, ordered by sort_order."""
    cursor = db.genres.find().sort("sort_order", 1)
    return [GenreResponse(**doc) async for doc in cursor]
