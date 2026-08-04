"""
API endpoints for the Zenzeii Library Catalog (Layer 1).

GET /api/catalog             — filtered, sorted, paginated book listing
GET /api/catalog/genres      — controlled vocabulary for the genre filter
GET /api/catalog/{book_id}   — single published catalog entry

All business logic lives in services/catalog_service.py; this module is
responsible only for HTTP concerns: parameter declaration, dependency
injection, and mapping service-layer results/errors to HTTP responses.
"""
import logging
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.catalog_models import (
    Availability,
    BookCatalogDetail,
    CatalogLanguage,
    CatalogListResponse,
    CatalogQueryParams,
    DEFAULT_PAGE_LIMIT,
    Difficulty,
    GenreListResponse,
    JLPTLevel,
    LengthCategory,
    MAX_PAGE_LIMIT,
)
from services import catalog_service

logger = logging.getLogger(__name__)

catalog_router = APIRouter(prefix="/catalog", tags=["catalog"])

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
    within the filtered set. Both apply simultaneously.

    Raises:
        400 — unknown genre id, or an invalid `sort` value.
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
