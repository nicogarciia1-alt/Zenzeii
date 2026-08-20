"""
Business logic for the Zenzeii Library Catalog (Layer 1 and Layer 2).

Owns filter parsing, MongoDB query construction, index management, and the
read operations backing the /api/catalog endpoints. Contains no FastAPI or
HTTP-specific code — callers (routers/catalog.py) are responsible for
turning a raised ValueError into the appropriate HTTP error response.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError

from models.catalog_models import (
    AdaptationTypeResponse,
    AwardResponse,
    BookCatalogDetail,
    BookCatalogItem,
    CatalogListResponse,
    CatalogQueryParams,
    CulturalConceptDetail,
    CulturalConceptResponse,
    EntityStatus,
    GenreResponse,
    HistoricalPeriodResponse,
    LENGTH_MEDIUM_MAX_PAGES,
    LENGTH_SHORT_MAX_PAGES,
    LengthCategory,
    MoodResponse,
    PERIOD_MULTI_YEAR_START,
    PERIOD_OPEN_ENDED_YEAR,
    SettingResponse,
    SortOption,
    TaxonomyResponse,
    ThemeResponse,
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


def format_period_years(year_start: int, year_end: int) -> str:
    """
    Formats historical_periods.years for display from its numeric range.

    year_end == PERIOD_OPEN_ENDED_YEAR (9999) marks a still-ongoing era
    (Reiwa) and renders as "{year_start}-present" rather than a literal
    "-9999". year_start == PERIOD_MULTI_YEAR_START (0) combined with an
    open-ended year_end is the "spans multiple periods" catch-all entry and
    renders as a fixed descriptive string instead of a numeric range.
    """
    if year_start == PERIOD_MULTI_YEAR_START and year_end == PERIOD_OPEN_ENDED_YEAR:
        return "Spans multiple periods"
    if year_end == PERIOD_OPEN_ENDED_YEAR:
        return f"{year_start}-present"
    return f"{year_start}-{year_end}"


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


async def ensure_layer2_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Creates every index required by the 7 Layer 2 taxonomy collections and
    their reference fields on book_catalog.

    Mirrors ensure_catalog_indexes(): not wired into server.py's startup,
    called explicitly from scripts/seed_layer2_taxonomy.py instead. Safe to
    call repeatedly — create_index is a no-op when an identical index
    already exists.
    """
    # themes
    await db.themes.create_index([("id", 1)], unique=True)
    await db.themes.create_index([("layer", 1)])
    await db.themes.create_index([("name", 1)])

    # moods
    await db.moods.create_index([("id", 1)], unique=True)
    await db.moods.create_index([("layer", 1)])
    await db.moods.create_index([("name", 1)])

    # settings
    await db.settings.create_index([("id", 1)], unique=True)
    await db.settings.create_index([("type", 1)])
    await db.settings.create_index([("layer", 1)])

    # historical_periods
    await db.historical_periods.create_index([("id", 1)], unique=True)
    await db.historical_periods.create_index([("year_start", 1), ("year_end", 1)])
    await db.historical_periods.create_index([("sort_order", 1)])

    # cultural_concepts — no `language` field here, so no language_override
    # gotcha like book_catalog's text index needed (see ensure_catalog_indexes).
    await db.cultural_concepts.create_index([("id", 1)], unique=True)
    await db.cultural_concepts.create_index([("cultural_category", 1)])
    await db.cultural_concepts.create_index([("layer", 1)])
    await db.cultural_concepts.create_index(
        [("name", "text"), ("romaji", "text"), ("description_short", "text")],
        name="concepts_text_search",
    )

    # awards
    await db.awards.create_index([("id", 1)], unique=True)
    await db.awards.create_index([("prestige_level", 1)])
    await db.awards.create_index([("badge_display", 1)])

    # adaptation_types
    await db.adaptation_types.create_index([("id", 1)], unique=True)

    # book_catalog — Layer 2 reference fields
    await db.book_catalog.create_index([("theme_ids", 1)])
    await db.book_catalog.create_index([("mood_ids", 1)])
    await db.book_catalog.create_index([("setting_ids", 1)])
    await db.book_catalog.create_index([("period_ids", 1)])
    await db.book_catalog.create_index([("cultural_concept_ids", 1)])
    await db.book_catalog.create_index([("adaptation_types", 1)])
    await db.book_catalog.create_index([("award_ids.award_id", 1)])
    await db.book_catalog.create_index([("award_ids.award_id", 1), ("award_ids.year", -1)])

    # book_catalog — compound discovery combinations
    await db.book_catalog.create_index([("mood_ids", 1), ("difficulty", 1)])
    await db.book_catalog.create_index([("cultural_concept_ids", 1), ("difficulty", 1)])
    # setting_ids+period_ids and theme_ids+mood_ids are both array-pairs — MongoDB
    # rejects compound indexes with more than one array field (CannotIndexParallelArrays).
    # Queries combining two array filters still work via index intersection on the
    # existing single-field indexes above; there's no compound-index shape that fixes this.

    logger.info("Layer 2 taxonomy and book_catalog reference indexes ensured")


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

async def validate_ids_against_collection(
    db: AsyncIOMotorDatabase,
    collection_name: str,
    ids: List[str],
    label: str,
) -> None:
    """
    Confirms every id in `ids` exists in db[collection_name].

    Generic across every controlled-vocabulary collection (genres, themes,
    moods, settings, historical_periods, cultural_concepts, awards,
    adaptation_types) — they all use `id` as their unique key. Raises
    ValueError (mapped to HTTP 400 by the router, not FastAPI's automatic
    422) naming the unknown ids, prefixed with `label` for a readable
    message.
    """
    if not ids:
        return
    known = await db[collection_name].distinct("id", {"id": {"$in": ids}})
    unknown = set(ids) - set(known)
    if unknown:
        raise ValueError(f"Unknown {label} id(s): {', '.join(sorted(unknown))}")


# (params attribute, collection name, error-message label) for every
# ID-reference filter validated by validate_filter_ids() below.
_ID_FILTER_COLLECTIONS = [
    ("genre", "genres", "genre"),
    ("theme", "themes", "theme"),
    ("mood", "moods", "mood"),
    ("setting", "settings", "setting"),
    ("period", "historical_periods", "period"),
    ("concept", "cultural_concepts", "concept"),
    ("award", "awards", "award"),
    ("adaptation", "adaptation_types", "adaptation"),
]


async def validate_filter_ids(db: AsyncIOMotorDatabase, params: CatalogQueryParams) -> None:
    """
    Validates every Layer 1 and Layer 2 ID-reference filter on `params`
    against its taxonomy collection in one pass.

    Raises ValueError (mapped to HTTP 400 by the router) on the first
    unknown id found, checked in the order listed in _ID_FILTER_COLLECTIONS.
    """
    for attr_name, collection_name, label in _ID_FILTER_COLLECTIONS:
        ids = getattr(params, attr_name)
        await validate_ids_against_collection(db, collection_name, ids, label)


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

    # --- Layer 2 discovery filters ---
    if params.theme:
        query["theme_ids"] = {"$in": params.theme}

    if params.mood:
        query["mood_ids"] = {"$in": params.mood}

    if params.setting:
        query["setting_ids"] = {"$in": params.setting}

    if params.period:
        query["period_ids"] = {"$in": params.period}

    if params.concept:
        query["cultural_concept_ids"] = {"$in": params.concept}

    if params.award:
        # award_ids is [{award_id, year}] — match on the embedded award_id.
        query["award_ids.award_id"] = {"$in": params.award}

    if params.adaptation:
        query["adaptation_types"] = {"$in": params.adaptation}

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

    if params.theme:
        applied["theme"] = params.theme
    if params.mood:
        applied["mood"] = params.mood
    if params.setting:
        applied["setting"] = params.setting
    if params.period:
        applied["period"] = params.period
    if params.concept:
        applied["concept"] = params.concept
    if params.award:
        applied["award"] = params.award
    if params.adaptation:
        applied["adaptation"] = params.adaptation

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


async def get_linked_upload(db: AsyncIOMotorDatabase, user_id: Optional[str], book_id: str) -> Optional[dict]:
    """
    The user's most recent EPUB upload made through this catalog book's
    acquisition flow, if any — see server.py's upload_book/process_upload_fast,
    which stamp source_catalog_id onto the uploaded book_doc.

    Uploads always get their own book_id, entirely separate from the
    catalog entry (buy-availability catalog books have no chapters/sentences
    of their own to read), so this is the only way to answer "has this user
    already imported a copy of this specific catalog book" — book_id's own
    is_on_shelf/shelved_at track shelving of the catalog entry itself, which
    never happens for a 'buy' book.
    """
    if not user_id:
        return None
    doc = await db.books.find_one(
        {"source_catalog_id": book_id, "uploaded_by": user_id},
        {"id": 1, "import_status": 1, "created_at": 1},
        sort=[("created_at", -1)],
    )
    return doc


async def get_shelved_at(db: AsyncIOMotorDatabase, user_id: Optional[str], book_id: str) -> Optional[str]:
    """
    When the given user added this book to their shelf, or None if it isn't
    there (or unauthenticated) — same shape as is_book_marked/get_my_rating.
    """
    if not user_id:
        return None
    doc = await db.user_shelves.find_one({"user_id": user_id, "book_id": book_id}, {"added_at": 1})
    return doc["added_at"] if doc else None


async def is_book_marked(db: AsyncIOMotorDatabase, user_id: Optional[str], book_id: str) -> bool:
    """
    Whether the given user has marked this book, independent of shelf status.

    Returns False with no query when user_id is None, matching
    get_shelved_book_ids's handling of unauthenticated requests.
    """
    if not user_id:
        return False
    doc = await db.marked_books.find_one({"user_id": user_id, "book_id": book_id}, {"_id": 1})
    return doc is not None


async def get_my_rating(db: AsyncIOMotorDatabase, user_id: Optional[str], book_id: str) -> Optional[int]:
    """
    The given user's own 1-5 rating for this book, or None if unrated
    (or unauthenticated) — distinct from book_catalog.rating_avg, which is
    the aggregate across all users.
    """
    if not user_id:
        return None
    doc = await db.ratings.find_one({"user_id": user_id, "book_id": book_id}, {"rating": 1})
    return doc["rating"] if doc else None


async def get_rating_distribution(db: AsyncIOMotorDatabase, book_id: str) -> Dict[str, int]:
    """
    Count of ratings at each star value (1-5) for a book, for the Reviews
    tab's distribution bars. Every key is always present (0 when no ratings
    exist at that value) so the caller never needs a defensive .get().
    """
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    pipeline = [
        {"$match": {"book_id": book_id}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
    ]
    async for doc in db.ratings.aggregate(pipeline):
        distribution[str(doc["_id"])] = doc["count"]
    return distribution


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
    Layer 1 or Layer 2 filter id is unknown to its taxonomy collection.

    A book_catalog doc that fails BookCatalogItem validation (e.g.
    entity_status="published" with difficulty/language still null — reachable
    via ingest_catalog.py's --force-publish override) is logged and skipped
    rather than failing the whole request; pydantic.ValidationError is a
    ValueError subclass, so without this the router's `except ValueError`
    would turn one malformed row into a 400 for every book on the page.
    `total`/`pages` still reflect the raw query count, not the post-skip
    count — a page can render fewer than `limit` books while a malformed doc
    exists, which self-corrects once that doc is fixed.
    """
    await validate_filter_ids(db, params)

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
    books = []
    for doc in raw_books:
        try:
            books.append(BookCatalogItem(**doc, is_on_shelf=doc["id"] in shelved_ids))
        except ValidationError as exc:
            logger.warning(f"Skipping malformed book_catalog doc {doc.get('id')!r} in catalog list: {exc}")

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
    exist, exists but is not entity_status="published" (draft/archived
    entries are never visible through this endpoint), or exists but fails
    BookCatalogDetail validation (e.g. difficulty/language still null
    despite entity_status="published" — reachable via ingest_catalog.py's
    --force-publish override). The last case logs a warning since it's a
    real data gap, not an absent book, but is otherwise indistinguishable
    from 404 to the caller — same as list_catalog's handling of the same
    condition, see its docstring.
    """
    doc = await db.book_catalog.find_one({
        "id": book_id,
        "entity_status": EntityStatus.PUBLISHED.value,
    })
    if doc is None:
        return None

    shelved_ids = await get_shelved_book_ids(db, user_id, [book_id])
    shelved_at = await get_shelved_at(db, user_id, book_id)
    linked_upload = await get_linked_upload(db, user_id, book_id)
    marked = await is_book_marked(db, user_id, book_id)
    my_rating = await get_my_rating(db, user_id, book_id)
    distribution = await get_rating_distribution(db, book_id)
    try:
        return BookCatalogDetail(
            **doc,
            is_on_shelf=book_id in shelved_ids,
            shelved_at=shelved_at,
            linked_upload_id=linked_upload["id"] if linked_upload else None,
            linked_upload_status=linked_upload["import_status"] if linked_upload else None,
            linked_upload_at=linked_upload["created_at"] if linked_upload else None,
            is_marked=marked,
            my_rating=my_rating,
            rating_distribution=distribution,
        )
    except ValidationError as exc:
        logger.warning(f"book_catalog doc {book_id!r} is published but fails validation: {exc}")
        return None


async def list_genres(db: AsyncIOMotorDatabase) -> List[GenreResponse]:
    """Returns all genres for the filter UI, ordered by sort_order."""
    cursor = db.genres.find().sort("sort_order", 1)
    return [GenreResponse(**doc) async for doc in cursor]


async def get_taxonomy(db: AsyncIOMotorDatabase) -> TaxonomyResponse:
    """
    Fetches every Layer 2 taxonomy collection in one call, each ordered by
    sort_order, for GET /api/catalog/taxonomy.
    """
    themes = [ThemeResponse(**doc) async for doc in db.themes.find().sort("sort_order", 1)]
    moods = [MoodResponse(**doc) async for doc in db.moods.find().sort("sort_order", 1)]
    settings = [SettingResponse(**doc) async for doc in db.settings.find().sort("sort_order", 1)]
    periods = [
        HistoricalPeriodResponse(**doc)
        async for doc in db.historical_periods.find().sort("sort_order", 1)
    ]
    concepts = [
        CulturalConceptResponse(**doc)
        async for doc in db.cultural_concepts.find().sort("sort_order", 1)
    ]
    awards = [AwardResponse(**doc) async for doc in db.awards.find().sort("sort_order", 1)]
    adaptations = [
        AdaptationTypeResponse(**doc)
        async for doc in db.adaptation_types.find().sort("sort_order", 1)
    ]

    return TaxonomyResponse(
        themes=themes,
        moods=moods,
        settings=settings,
        historical_periods=periods,
        cultural_concepts=concepts,
        awards=awards,
        adaptation_types=adaptations,
    )


async def get_concept_by_id(db: AsyncIOMotorDatabase, concept_id: str) -> Optional[CulturalConceptDetail]:
    """
    Fetches a single cultural concept with its full long-form description.

    Returns None (mapped to HTTP 404 by the router) if concept_id is unknown.
    """
    doc = await db.cultural_concepts.find_one({"id": concept_id})
    if doc is None:
        return None
    return CulturalConceptDetail(**doc)
