"""
Pydantic models for the Zenzeii Library Catalog (Layer 1).

Covers two MongoDB collections and their API contracts:

- `genres`        — controlled vocabulary, referenced by ID, never duplicated.
- `book_catalog`  — the single source of truth for the library. Separate
                     from the `books` collection, which only holds books
                     that have already been imported for reading.

This module defines shapes only — no query logic, no database calls.
See services/catalog_service.py for filter parsing and query building.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------
# Enums — controlled vocabularies for Layer 1 fields.
# str subclassing means these serialize as their plain value (e.g. "beginner")
# in both MongoDB documents and JSON responses.
# --------------------------------------------------------------------------

class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    NATIVE = "native"


class JLPTLevel(str, Enum):
    N5 = "N5"
    N4 = "N4"
    N3 = "N3"
    N2 = "N2"
    N1 = "N1"


class CatalogLanguage(str, Enum):
    JAPANESE = "ja"
    JAPANESE_ENGLISH = "ja_en"
    ENGLISH = "en"


class LengthCategory(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class Availability(str, Enum):
    FREE = "free"
    BUY = "buy"
    UPLOAD = "upload"


class CopyrightStatus(str, Enum):
    PUBLIC_DOMAIN = "public_domain"
    COPYRIGHTED = "copyrighted"
    UNKNOWN = "unknown"


class ImportStatus(str, Enum):
    NOT_IMPORTED = "not_imported"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"


class EntityStatus(str, Enum):
    DRAFT = "draft"
    REVIEWED = "reviewed"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SortOption(str, Enum):
    POPULAR = "popular"
    RATING = "rating"
    RECENT = "recent"
    YEAR = "year"
    TITLE = "title"


# --------------------------------------------------------------------------
# Named constants — no magic numbers in length-category computation.
# --------------------------------------------------------------------------

LENGTH_SHORT_MAX_PAGES = 99
LENGTH_MEDIUM_MAX_PAGES = 300

DEFAULT_PAGE_LIMIT = 24
MAX_PAGE_LIMIT = 48


# --------------------------------------------------------------------------
# Genre — controlled vocabulary collection (`genres`)
# --------------------------------------------------------------------------

class Genre(BaseModel):
    """A single genre document as stored in the `genres` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    layer: int = 1
    filterable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GenreResponse(BaseModel):
    """Genre shape returned to the filter UI — internal bookkeeping fields excluded."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    sort_order: int


class GenreListResponse(BaseModel):
    """Response body for GET /api/catalog/genres."""
    genres: List[GenreResponse]


# --------------------------------------------------------------------------
# Award reference — embedded in book_catalog.award_ids (Layer 2 placeholder)
# --------------------------------------------------------------------------

class AwardReference(BaseModel):
    model_config = ConfigDict(extra="ignore")

    award_id: str
    year: int


# --------------------------------------------------------------------------
# BookCatalog — the central catalog document (`book_catalog` collection)
# --------------------------------------------------------------------------

class BookCatalog(BaseModel):
    """
    Full document shape for the `book_catalog` collection.

    Every field is defensively typed with an explicit default so a
    partially-populated document never crashes a query or response
    serializer. Layer 2 fields are present but always empty at this stage —
    they are populated by the next brief, not by this one.
    """
    model_config = ConfigDict(extra="ignore")

    # --- Identity ---
    id: str
    title_jp: str
    title_en: str
    title_romaji: Optional[str] = None
    author_name: str
    author_name_jp: Optional[str] = None

    # --- Classification (Layer 1) ---
    genre_ids: List[str] = Field(default_factory=list)
    difficulty: Difficulty
    jlpt_level: Optional[JLPTLevel] = None
    language: CatalogLanguage
    page_count: Optional[int] = None
    length_category: Optional[LengthCategory] = None

    # --- Availability ---
    availability: Availability
    aozora_id: Optional[str] = None
    aozora_url: Optional[str] = None
    gutenberg_id: Optional[str] = None
    buy_link: Optional[str] = None
    upload_allowed: bool = True

    # --- Publication ---
    publication_year: Optional[int] = None
    original_publisher: Optional[str] = None
    copyright_status: CopyrightStatus = CopyrightStatus.UNKNOWN

    # --- Discovery ---
    cover_image: Optional[str] = None
    description_short: Optional[str] = Field(default=None, max_length=280)
    description_long: Optional[str] = None

    # --- Community (Layer 1 sort signals) ---
    rating_avg: float = 0.0
    rating_count: int = 0
    popularity_score: int = 0
    save_count: int = 0

    # --- Import status ---
    import_status: Optional[ImportStatus] = None

    # --- Catalog management ---
    entity_status: EntityStatus = EntityStatus.DRAFT
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ontology_version: Optional[str] = None

    # --- Layer 2 placeholders (populated in the next brief) ---
    theme_ids: List[str] = Field(default_factory=list)
    mood_ids: List[str] = Field(default_factory=list)
    setting_ids: List[str] = Field(default_factory=list)
    period_ids: List[str] = Field(default_factory=list)
    cultural_concept_ids: List[str] = Field(default_factory=list)
    award_ids: List[AwardReference] = Field(default_factory=list)
    adaptation_types: List[str] = Field(default_factory=list)


class BookCatalogItem(BaseModel):
    """
    Book shape returned inside GET /api/catalog list results.

    Excludes internal-only fields (ontology_version, entity_status) and the
    not-yet-populated Layer 2 arrays. Adds `is_on_shelf`, which is computed
    per-request from the caller's auth context, not stored on the document.
    """
    model_config = ConfigDict(extra="ignore")

    id: str
    title_jp: str
    title_en: str
    title_romaji: Optional[str] = None
    author_name: str
    author_name_jp: Optional[str] = None
    cover_image: Optional[str] = None
    genre_ids: List[str] = Field(default_factory=list)
    difficulty: Difficulty
    jlpt_level: Optional[JLPTLevel] = None
    language: CatalogLanguage
    length_category: Optional[LengthCategory] = None
    page_count: Optional[int] = None
    availability: Availability
    publication_year: Optional[int] = None
    rating_avg: float = 0.0
    rating_count: int = 0
    popularity_score: int = 0
    import_status: Optional[ImportStatus] = None
    is_on_shelf: bool = False


class BookCatalogDetail(BookCatalogItem):
    """
    Full shape for GET /api/catalog/{book_id}.

    Adds fields not needed in list view but required on the book detail
    page, plus the (currently empty) Layer 2 placeholder arrays. Still
    excludes ontology_version and entity_status, per the brief.
    """
    description_short: Optional[str] = None
    description_long: Optional[str] = None
    aozora_id: Optional[str] = None
    aozora_url: Optional[str] = None
    gutenberg_id: Optional[str] = None
    buy_link: Optional[str] = None
    upload_allowed: bool = True
    original_publisher: Optional[str] = None
    copyright_status: CopyrightStatus = CopyrightStatus.UNKNOWN
    save_count: int = 0

    theme_ids: List[str] = Field(default_factory=list)
    mood_ids: List[str] = Field(default_factory=list)
    setting_ids: List[str] = Field(default_factory=list)
    period_ids: List[str] = Field(default_factory=list)
    cultural_concept_ids: List[str] = Field(default_factory=list)
    award_ids: List[AwardReference] = Field(default_factory=list)
    adaptation_types: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Query parameters — parsed representation of a GET /api/catalog request.
# Built by the router from FastAPI Query() parameters and handed to
# catalog_service, so the service layer never touches FastAPI request
# objects directly.
# --------------------------------------------------------------------------

class CatalogQueryParams(BaseModel):
    """Validated filter/sort/pagination parameters for GET /api/catalog."""
    model_config = ConfigDict(extra="ignore")

    q: Optional[str] = None
    genre: List[str] = Field(default_factory=list)
    difficulty: List[Difficulty] = Field(default_factory=list)
    jlpt: List[JLPTLevel] = Field(default_factory=list)
    length: List[LengthCategory] = Field(default_factory=list)
    language: List[CatalogLanguage] = Field(default_factory=list)
    availability: List[Availability] = Field(default_factory=list)
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    sort: SortOption = SortOption.POPULAR
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=DEFAULT_PAGE_LIMIT, ge=1, le=MAX_PAGE_LIMIT)


class CatalogListResponse(BaseModel):
    """Response body for GET /api/catalog."""
    model_config = ConfigDict(extra="ignore")

    total: int
    page: int
    limit: int
    pages: int
    sort: SortOption
    filters_applied: Dict[str, List[str]]
    books: List[BookCatalogItem]
