"""
API endpoints for the Zenzeii Library Catalog (Layer 1 and Layer 2).

GET /api/catalog                    — filtered, sorted, paginated book listing
GET /api/catalog/genres             — controlled vocabulary for the genre filter
GET /api/catalog/taxonomy           — every Layer 2 taxonomy entity in one call
GET /api/catalog/concepts/{id}      — cultural concept detail (full description)
GET /api/catalog/{book_id}          — single published catalog entry

All business logic lives in services/catalog_service.py; this module is
responsible only for HTTP concerns: parameter declaration, dependency
injection, and mapping service-layer results/errors to HTTP responses.
"""
import logging
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.catalog_models import (
    Availability,
    BookCatalogDetail,
    CatalogLanguage,
    CatalogListResponse,
    CatalogQueryParams,
    CulturalConceptDetail,
    DEFAULT_PAGE_LIMIT,
    Difficulty,
    GenreListResponse,
    JLPTLevel,
    LengthCategory,
    MAX_PAGE_LIMIT,
    ShelfDetail,
    ShelfListResponse,
    TAXONOMY_CACHE_MAX_AGE_SECONDS,
    TaxonomyResponse,
)
from services import catalog_service

logger = logging.getLogger(__name__)

catalog_router = APIRouter(prefix="/catalog", tags=["catalog"])

# Separate router (its own top-level "/shelves" prefix, not nested under
# "/catalog") so shelves land at GET /api/shelves and /api/shelves/{slug},
# not /api/catalog/shelves — matches the brief's endpoint spec. Lives in
# this file per the brief; registered independently in server.py.
shelves_router = APIRouter(prefix="/shelves", tags=["shelves"])

# Unlike server.security (HTTPBearer with auto_error=True, used by
# get_current_user for endpoints that require login), catalog browsing
# works for anonymous users too — a missing/invalid token just means
# is_on_shelf reports False instead of the request being rejected.
_optional_bearer = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
    """
    Returns the live Motor database handle.

    Imported lazily inside the function body, not at module load time.
    server.py registers this router (so importing it at module level here
    would be circular), and `db` is reassigned inside server.py's lifespan
    handler after startup — an early `from server import db` would bind to
    the pre-startup None and never see the real client.
    """
    import server
    return server.db


async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
) -> Optional[str]:
    """
    Best-effort auth for endpoints where a token is optional.

    Returns None instead of raising when no Authorization header is present
    or the token fails to validate. Catalog browsing never requires login;
    is_on_shelf simply reports False in that case, per the brief.
    """
    if credentials is None:
        return None
    import server  # lazy import — see get_db()
    try:
        payload = jwt.decode(
            credentials.credentials, server.JWT_SECRET, algorithms=[server.JWT_ALGORITHM]
        )
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


@catalog_router.get("/genres", response_model=GenreListResponse)
async def get_catalog_genres(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns every genre for the Layer 1 filter UI, ordered for display.

    The brief specifies a 24h cache for this response; that's a caller-side
    (frontend/CDN) concern — genres change rarely but this endpoint itself
    does not implement caching.
    """
    genres = await catalog_service.list_genres(db)
    return GenreListResponse(genres=genres)


@catalog_router.get("/taxonomy", response_model=TaxonomyResponse)
async def get_catalog_taxonomy(response: Response, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns every Layer 2 taxonomy entity in one call — themes, moods,
    settings, historical periods, cultural concepts, awards, and adaptation
    types. Used to populate the discovery filter UI.

    Sets Cache-Control directly since taxonomy changes rarely and this is a
    new endpoint; unlike GET /api/catalog/genres (Layer 1, already shipped),
    caching isn't left as a frontend/CDN-only concern here.
    """
    response.headers["Cache-Control"] = f"public, max-age={TAXONOMY_CACHE_MAX_AGE_SECONDS}"
    return await catalog_service.get_taxonomy(db)


@catalog_router.get("/concepts/{concept_id}", response_model=CulturalConceptDetail)
async def get_catalog_concept(concept_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns a single cultural concept with its full long-form description,
    for tooltip/explanation UI.

    Raises:
        404 — concept_id not found in the cultural_concepts collection.
    """
    concept = await catalog_service.get_concept_by_id(db, concept_id)
    if concept is None:
        raise HTTPException(status_code=404, detail="Cultural concept not found")
    return concept


@catalog_router.get("", response_model=CatalogListResponse)
async def get_catalog(
    q: Optional[str] = Query(None, description="Full-text search across title and author"),
    genre: List[str] = Query([], description="Genre id slug, repeatable"),
    difficulty: List[Difficulty] = Query([], description="Difficulty enum, repeatable"),
    jlpt: List[JLPTLevel] = Query([], description="JLPT level, repeatable"),
    length: List[LengthCategory] = Query([], description="Length category, repeatable"),
    language: List[CatalogLanguage] = Query([], description="Language enum, repeatable"),
    availability: List[Availability] = Query([], description="Availability enum, repeatable"),
    year_from: Optional[int] = Query(None, description="Publication year range start"),
    year_to: Optional[int] = Query(None, description="Publication year range end"),
    theme: List[str] = Query([], description="Theme id slug, repeatable (Layer 2)"),
    mood: List[str] = Query([], description="Mood id slug, repeatable (Layer 2)"),
    setting: List[str] = Query([], description="Setting id slug, repeatable (Layer 2)"),
    period: List[str] = Query([], description="Historical period id slug, repeatable (Layer 2)"),
    concept: List[str] = Query([], description="Cultural concept id slug, repeatable (Layer 2)"),
    award: List[str] = Query([], description="Award id slug, repeatable (Layer 2)"),
    adaptation: List[str] = Query([], description="Adaptation type id slug, repeatable (Layer 2)"),
    sort: Optional[str] = Query(
        None, description="Sort order — one of: popular, rating, recent, year, title"
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT),
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Primary catalog listing. Filters narrow the result set; sort reorders
    within the filtered set. Both apply simultaneously. Layer 2 filters
    (theme..adaptation) combine with Layer 1 filters and with each other the
    same way: OR within a field's repeated values, AND across fields.

    Raises:
        400 — unknown id for any Layer 1 or Layer 2 reference filter
              (genre, theme, mood, setting, period, concept, award,
              adaptation), or an invalid `sort` value.
        422 — malformed query parameters (raised automatically by FastAPI
              for values that don't match a declared type or enum).
    """
    try:
        parsed_sort = catalog_service.parse_sort(sort)
        params = CatalogQueryParams(
            q=q,
            genre=genre,
            difficulty=difficulty,
            jlpt=jlpt,
            length=length,
            language=language,
            availability=availability,
            year_from=year_from,
            year_to=year_to,
            theme=theme,
            mood=mood,
            setting=setting,
            period=period,
            concept=concept,
            award=award,
            adaptation=adaptation,
            sort=parsed_sort,
            page=page,
            limit=limit,
        )
        return await catalog_service.list_catalog(db, params, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@catalog_router.get("/{book_id}", response_model=BookCatalogDetail)
async def get_catalog_book(
    book_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Returns a single published catalog entry for the book detail page.

    Raises:
        404 — book not found, or exists but is not entity_status="published".
    """
    book = await catalog_service.get_book_by_id(db, book_id, user_id=user_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found in catalog")
    return book


@shelves_router.get("", response_model=ShelfListResponse)
async def get_shelves(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns every shelf for the main library's Discover Japan section —
    slug, title, title_jp, description, image_url, and resolved book_count.
    """
    shelves = await catalog_service.list_shelves(db)
    return ShelfListResponse(shelves=shelves)


@shelves_router.get("/{slug}", response_model=ShelfDetail)
async def get_shelf(
    slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Returns a single shelf with its books resolved in curation order.

    Raises:
        404 — no shelf with this slug.
    """
    shelf = await catalog_service.get_shelf_by_slug(db, slug, user_id=user_id)
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf not found")
    return shelf
