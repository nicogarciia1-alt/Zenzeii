"""
Pydantic models for the Zenzeii Library Catalog (Layer 1 and Layer 2).

Covers the catalog's MongoDB collections and their API contracts:

- `genres`             — Layer 1 controlled vocabulary.
- `book_catalog`       — the single source of truth for the library. Separate
                          from the `books` collection, which only holds books
                          that have already been imported for reading.
- `themes`, `moods`, `settings`, `historical_periods`, `cultural_concepts`,
  `awards`, `adaptation_types` — Layer 2 discovery taxonomy. Each is an
  independent, reusable entity collection; book documents reference these
  by ID and never duplicate the vocabulary as free text.

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


class SettingType(str, Enum):
    """Classifies a `settings` entry — Kyoto is a city, Edo-era Japan is an era_context."""
    CITY = "city"
    REGION = "region"
    PLACE_TYPE = "place_type"
    ERA_CONTEXT = "era_context"


class CulturalCategory(str, Enum):
    """Classifies a `cultural_concepts` entry, e.g. Zen is a spiritual_practice."""
    AESTHETIC_PHILOSOPHY = "aesthetic_philosophy"
    SOCIAL_VALUE = "social_value"
    SPIRITUAL_PRACTICE = "spiritual_practice"
    SEASONAL_TRADITION = "seasonal_tradition"
    CULTURAL_PRACTICE = "cultural_practice"
    LITERARY_CONCEPT = "literary_concept"


# --------------------------------------------------------------------------
# Named constants — no magic numbers in length-category computation.
# --------------------------------------------------------------------------

LENGTH_SHORT_MAX_PAGES = 99
LENGTH_MEDIUM_MAX_PAGES = 300

DEFAULT_PAGE_LIMIT = 24
MAX_PAGE_LIMIT = 48

# historical_periods.year_end for the current, still-ongoing era (Reiwa).
PERIOD_OPEN_ENDED_YEAR = 9999
# historical_periods.year_start for the "spans multiple periods" catch-all entry.
PERIOD_MULTI_YEAR_START = 0

TAXONOMY_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24  # 24h — taxonomy changes rarely


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
# Theme — Layer 2 discovery taxonomy (`themes` collection)
# The human concerns at the heart of a book: family, loss, identity, ...
# --------------------------------------------------------------------------

class Theme(BaseModel):
    """A single theme document as stored in the `themes` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    layer: int = 2
    filterable: bool = True
    searchable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ThemeResponse(BaseModel):
    """Theme shape returned to the discovery filter UI."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    sort_order: int


# --------------------------------------------------------------------------
# Mood — Layer 2 discovery taxonomy (`moods` collection)
# The emotional atmosphere of reading a book, distinct from its plot.
# --------------------------------------------------------------------------

class Mood(BaseModel):
    """A single mood document as stored in the `moods` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    layer: int = 2
    filterable: bool = True
    searchable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MoodResponse(BaseModel):
    """Mood shape returned to the discovery filter UI."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    sort_order: int


# --------------------------------------------------------------------------
# Setting — Layer 2 discovery taxonomy (`settings` collection)
# Where a story takes place: a city, a region, a kind of place, or an era.
# --------------------------------------------------------------------------

class Setting(BaseModel):
    """A single setting document as stored in the `settings` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    type: SettingType
    description: str
    layer: int = 2
    filterable: bool = True
    searchable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SettingResponse(BaseModel):
    """Setting shape returned to the discovery filter UI."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    type: SettingType
    description: str
    sort_order: int


# --------------------------------------------------------------------------
# HistoricalPeriod — Layer 2 discovery taxonomy (`historical_periods`)
# The Japanese historical era a book is set in or emerged from.
# --------------------------------------------------------------------------

class HistoricalPeriod(BaseModel):
    """A single period document as stored in the `historical_periods` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    years: str
    year_start: int
    year_end: int
    description: str
    layer: int = 2
    filterable: bool = True
    searchable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HistoricalPeriodResponse(BaseModel):
    """Period shape returned to the discovery filter UI."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    years: str
    year_start: int
    year_end: int
    description: str
    sort_order: int


# --------------------------------------------------------------------------
# CulturalConcept — Layer 2 discovery taxonomy (`cultural_concepts`)
# Zenzeii's most distinctive feature: Japanese aesthetic and philosophical
# concepts (Mono no Aware, Wabi-Sabi, ...). Each carries a short description
# for filter tooltips and a long description for the concept detail page.
# --------------------------------------------------------------------------

class CulturalConcept(BaseModel):
    """A single concept document as stored in the `cultural_concepts` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    romaji: str
    description_short: str = Field(max_length=120)
    description_long: str
    cultural_category: CulturalCategory
    layer: int = 2
    filterable: bool = True
    searchable: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CulturalConceptResponse(BaseModel):
    """
    Concept shape for the taxonomy list and filter chips.

    Carries description_short only — description_long is reserved for
    GET /api/catalog/concepts/{concept_id}, which explains the concept in
    full rather than in a tooltip-sized fragment.
    """
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    romaji: str
    description_short: str
    cultural_category: CulturalCategory
    sort_order: int


class CulturalConceptDetail(BaseModel):
    """Full concept shape for GET /api/catalog/concepts/{concept_id}."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    romaji: str
    description_short: str
    description_long: str
    cultural_category: CulturalCategory


# --------------------------------------------------------------------------
# Award — Layer 2 discovery taxonomy (`awards` collection)
# Literary prizes. Dual role: a discovery filter (Layer 2) and a prestige
# badge on the book card (Layer 1 display) — badge_display controls the
# latter. Distinct from AwardReference below, which is the lightweight
# {award_id, year} pair embedded on a book document.
# --------------------------------------------------------------------------

class Award(BaseModel):
    """A single award document as stored in the `awards` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    founded_year: int
    country: str
    prestige_level: int
    layer: int = 2
    filterable: bool = True
    badge_display: bool = False
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AwardResponse(BaseModel):
    """Award shape returned to the discovery filter UI and for badge rendering."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    description: str
    founded_year: int
    country: str
    prestige_level: int
    badge_display: bool
    sort_order: int


# --------------------------------------------------------------------------
# AdaptationType — Layer 2 discovery taxonomy (`adaptation_types`)
# Simple lookup collection for media adaptation kinds (anime, film, ...).
# --------------------------------------------------------------------------

class AdaptationType(BaseModel):
    """A single adaptation-type document as stored in the `adaptation_types` collection."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdaptationTypeResponse(BaseModel):
    """Adaptation-type shape returned to the discovery filter UI."""
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_jp: str
    sort_order: int


class TaxonomyResponse(BaseModel):
    """Response body for GET /api/catalog/taxonomy — every Layer 2 entity in one call."""
    model_config = ConfigDict(extra="ignore")

    themes: List[ThemeResponse]
    moods: List[MoodResponse]
    settings: List[SettingResponse]
    historical_periods: List[HistoricalPeriodResponse]
    cultural_concepts: List[CulturalConceptResponse]
    awards: List[AwardResponse]
    adaptation_types: List[AdaptationTypeResponse]


# --------------------------------------------------------------------------
# Award reference — embedded in book_catalog.award_ids
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
    serializer. Layer 2 fields (theme_ids, mood_ids, etc.) reference
    entities in their own taxonomy collections by ID — never free text.
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
    has_translation: Optional[bool] = None
    featured_quote: Optional[str] = None
    featured_quote_source: Optional[str] = None

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
    Layer 2 taxonomy arrays — list/card view stays Layer 1 only by design;
    Layer 2 tags are available via BookCatalogDetail on the book page. Adds
    `is_on_shelf`, which is computed per-request from the caller's auth
    context, not stored on the document.
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
    page, plus the Layer 2 taxonomy arrays (theme_ids, mood_ids, etc.) —
    raw ID references, resolved into full entities by the caller via
    GET /api/catalog/taxonomy, not denormalized here. Still excludes
    ontology_version and entity_status, per the brief.

    `is_marked` mirrors `is_on_shelf`: computed per-request from the
    caller's auth context against the `marked_books` collection, never
    stored on the book_catalog document itself. Marking is independent of
    owning a book — any published catalog book can be marked, whether or
    not it's on the user's shelf.
    """
    description_short: Optional[str] = None
    description_long: Optional[str] = None
    has_translation: Optional[bool] = None
    featured_quote: Optional[str] = None
    featured_quote_source: Optional[str] = None
    aozora_id: Optional[str] = None
    aozora_url: Optional[str] = None
    gutenberg_id: Optional[str] = None
    buy_link: Optional[str] = None
    upload_allowed: bool = True
    original_publisher: Optional[str] = None
    copyright_status: CopyrightStatus = CopyrightStatus.UNKNOWN
    save_count: int = 0
    is_marked: bool = False
    shelved_at: Optional[str] = None
    linked_upload_id: Optional[str] = None
    linked_upload_status: Optional[str] = None
    linked_upload_at: Optional[str] = None
    my_rating: Optional[int] = None
    rating_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    )

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
    """
    Validated filter/sort/pagination parameters for GET /api/catalog.

    Layer 1 filters (genre..availability) are typed enums, validated by
    FastAPI itself. Layer 2 filters (theme..adaptation) are plain strings —
    their taxonomy collections are open-ended and DB-validated at query
    time via validate_ids_against_collection(), so an unknown ID returns
    400, not FastAPI's automatic 422 for a type mismatch.
    """
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

    # --- Layer 2 discovery filters ---
    theme: List[str] = Field(default_factory=list)
    mood: List[str] = Field(default_factory=list)
    setting: List[str] = Field(default_factory=list)
    period: List[str] = Field(default_factory=list)
    concept: List[str] = Field(default_factory=list)
    award: List[str] = Field(default_factory=list)
    adaptation: List[str] = Field(default_factory=list)

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
