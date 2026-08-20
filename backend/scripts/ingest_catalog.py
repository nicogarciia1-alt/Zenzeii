"""
CSV ingestion script for the Zenzeii Library Catalog (`book_catalog`).

Reads a CSV of books, validates required fields, generates a canonical
`id`, and upserts each row into `book_catalog`. Idempotent — re-running
with the same CSV updates existing rows in place rather than duplicating
them (matches scripts/seed_catalog.py's own upsert-on-`id` convention).

Usage:
    python backend/scripts/ingest_catalog.py path/to/catalog.csv
    python backend/scripts/ingest_catalog.py path/to/catalog.csv --dry-run

--dry-run validates and prints the summary without writing anything.

--------------------------------------------------------------------------
ID generation — four sources, checked in this order per row:
--------------------------------------------------------------------------

1. `gutenberg_id` column populated (numeric) → id = f"gutenberg-{gutenberg_id}"
   No dict lookup needed: server.py's /books/import already accepts any
   numeric gutenberg_id dynamically (services/book_import.py's
   GUTENBERG_BOOKS dict is not required for a book to be importable).

2. `aozora_book_key` column populated → id = f"aozora-{aozora_book_key}",
   used verbatim. If that key isn't in AOZORA_BOOKS (services/book_import.py)
   today, the row is still ingested but flagged in the summary as a NEW
   Aozora book — it only becomes importable once this catalog row also has
   a stored `aozora_url` (server.py's dynamic-Aozora-import fallback reads
   that field when the key isn't hardcoded).

   `aozora_url` MUST be the Aozora Bunko full-text file URL —
   https://www.aozora.gr.jp/cards/{author_id}/files/{book}_{rev}.html —
   NOT the human card/info page (.../cards/{author_id}/card{id}.html).
   Only the files/ page has the <div class="main_text"> structure the
   import fetcher parses; the card page will fail or produce garbage.
   The script warns (not blocks) if aozora_url looks like a card page.

3. No `aozora_book_key` but `aozora_url` is populated → title_en is matched
   exactly (case-insensitive) against AOZORA_BOOKS[*]['title_en'] first, so
   a book that's already hardcoded (just not told to us by key) lands on
   its real, already-working key instead of a guess — slugifying title_en
   is NOT a substitute for this, since most AOZORA_BOOKS keys are romanized
   Japanese ('wagahai-wa-neko'), not English slugs. No match → falls back
   to id = f"aozora-{slugify(title_en)}", flagged for confirmation (though
   the row's own aozora_url already makes it importable regardless).

4. No `aozora_book_key`/`aozora_url` but `aozora_id` (Aozora Bunko card id —
   descriptive metadata only, not used to build the id) is populated →
   same slugify(title_en) fallback as above, ALWAYS flagged NEW/unverified
   — here there's no aozora_url either, so an unverified id is also not yet
   importable until one is added.

5. None of the above → id = f"catalog-{slugify(title_en)}". Buy-only books
   never go through /books/import, so no key-matching concern.

A `gutenberg_id` together with any Aozora signal (`aozora_book_key`,
`aozora_url`, or `aozora_id`) on the same row is treated as an ambiguous
source — the row is skipped with an error.

--------------------------------------------------------------------------
Collision handling
--------------------------------------------------------------------------

Idempotent re-run vs. genuine collision is decided by comparing
(title_en, author_name) case-insensitively against whatever already holds
that `id` — both within the same CSV (two rows landing on the same id) and
against the database (a previous ingestion run, or a hand-seeded book_catalog
entry). A match is a legitimate update; a mismatch is a skip-with-error, so
two unrelated books can never silently overwrite each other by slug alone.

--------------------------------------------------------------------------
Required vs. enrichment fields, and entity_status
--------------------------------------------------------------------------

Required (row skipped if missing/blank): title_en, title_jp, author_name,
availability. Every other recognized column defaults to null/empty if
absent, matching BookCatalogItem/BookCatalogDetail's own optional fields
(models/catalog_models.py) — except difficulty and language, which ARE
optional in the CSV but non-optional in that Pydantic model. Catalog
endpoints only ever construct BookCatalogItem for entity_status="published"
rows (services/catalog_service.py), so a row missing either one is
inserted as entity_status="draft" (invisible to the app, no crash risk)
instead of "published" — it becomes visible automatically once re-run
with both fields present.
"""
import argparse
import asyncio
import csv
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Make `models` / `services` importable regardless of the working directory
# this script is invoked from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from models.catalog_models import (  # noqa: E402
    Availability,
    CatalogLanguage,
    CopyrightStatus,
    Difficulty,
    EntityStatus,
    JLPTLevel,
)
from services.catalog_service import compute_length_category, ensure_catalog_indexes  # noqa: E402
from services.book_import import AOZORA_BOOKS  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("ingest_catalog")

ONTOLOGY_VERSION = "layer1-v1"

LIST_COLUMNS = ["genre_ids", "theme_ids", "mood_ids", "setting_ids", "period_ids", "adaptation_types"]

REQUIRED_FIELDS = ["title_en", "title_jp", "author_name", "availability"]

RECOGNIZED_COLUMNS = {
    "title_en", "title_jp", "title_romaji", "author_name", "author_name_jp",
    "availability", "difficulty", "jlpt_level", "language", "page_count",
    "publication_year", "cover_image", "aozora_id", "aozora_book_key", "aozora_url",
    "gutenberg_id", "buy_link", "original_publisher", "copyright_status",
    "description_short", "description_long", "upload_allowed", "has_translation",
    *LIST_COLUMNS,
}


class RowError(Exception):
    """Raised to skip the current row with a human-readable reason."""


# --------------------------------------------------------------------------
# Field parsing / validation helpers
# --------------------------------------------------------------------------

def slugify(title_en: str) -> str:
    slug = title_en.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def _enum_lookup(enum_cls) -> Dict[str, str]:
    """Case-insensitive value -> canonical-value map for a str Enum."""
    return {member.value.lower(): member.value for member in enum_cls}


AVAILABILITY_LOOKUP = _enum_lookup(Availability)
DIFFICULTY_LOOKUP = _enum_lookup(Difficulty)
JLPT_LOOKUP = _enum_lookup(JLPTLevel)
LANGUAGE_LOOKUP = _enum_lookup(CatalogLanguage)
COPYRIGHT_LOOKUP = _enum_lookup(CopyrightStatus)


def validate_enum(value: Optional[str], lookup: Dict[str, str], field_name: str) -> Optional[str]:
    value = (value or "").strip()
    if not value:
        return None
    canonical = lookup.get(value.lower())
    if canonical is None:
        raise RowError(f"invalid {field_name} {value!r} (must be one of: {', '.join(sorted(set(lookup.values())))})")
    return canonical


def parse_bool(value: Optional[str], default: bool = True) -> bool:
    if not value or not value.strip():
        return default
    return value.strip().lower() in ("true", "1", "yes", "y")


def parse_int(value: Optional[str], field_name: str) -> Optional[int]:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        raise RowError(f"invalid {field_name} {value!r} (must be an integer)")


def parse_list(value: Optional[str]) -> List[str]:
    if not value or not value.strip():
        return []
    return [v.strip() for v in value.split("|") if v.strip()]


def parse_optional_bool(value: Optional[str]) -> Optional[bool]:
    """Tri-state (unknown/yes/no) — unlike upload_allowed, a blank value means
    None (unknown), not an assumed default in either direction."""
    value = (value or "").strip()
    if not value:
        return None
    return value.lower() in ("true", "1", "yes", "y")


def check_aozora_url_format(aozora_url: Optional[str]) -> Optional[str]:
    """Soft warning — the import fetcher needs the files/ URL, not the card page."""
    if not aozora_url:
        return None
    if "/files/" not in aozora_url and re.search(r"/card\d+\.html", aozora_url):
        return (
            f"aozora_url {aozora_url!r} looks like an Aozora card/info page, not the "
            f"files/ full-text URL — the import fetcher expects "
            f".../files/{{book}}_{{rev}}.html, not .../card{{id}}.html. It will likely "
            f"fail to fetch real content."
        )
    return None


# --------------------------------------------------------------------------
# ID generation
# --------------------------------------------------------------------------

def find_aozora_key_by_title(title_en: str) -> Optional[str]:
    """Exact, case-insensitive match against AOZORA_BOOKS[*]['title_en'] — the
    only reliable join key available when a row gives aozora_url but no
    aozora_book_key. Slugifying title_en is NOT a substitute for this: most
    AOZORA_BOOKS keys are romanized Japanese ('wagahai-wa-neko'), not English
    slugs, but their title_en values ('I Am a Cat') match CSV titles exactly.
    """
    title_lower = title_en.strip().lower()
    for key, info in AOZORA_BOOKS.items():
        if (info.get("title_en") or "").strip().lower() == title_lower:
            return key
    return None


def generate_id(row: dict) -> Tuple[str, str]:
    """Returns (id, flag_note). flag_note is "" unless the row needs a summary callout."""
    gutenberg_id = (row.get("gutenberg_id") or "").strip()
    aozora_book_key = (row.get("aozora_book_key") or "").strip()
    aozora_id = (row.get("aozora_id") or "").strip()
    aozora_url = (row.get("aozora_url") or "").strip()

    has_gutenberg = bool(gutenberg_id)
    has_aozora = bool(aozora_book_key or aozora_id or aozora_url)

    if has_gutenberg and has_aozora:
        raise RowError(
            "ambiguous source — both gutenberg_id and an Aozora signal "
            "(aozora_book_key/aozora_id/aozora_url) are populated"
        )

    if has_gutenberg:
        try:
            gid = int(gutenberg_id)
        except ValueError:
            raise RowError(f"invalid gutenberg_id {gutenberg_id!r} (must be numeric)")
        return f"gutenberg-{gid}", ""

    if aozora_book_key:
        book_id = f"aozora-{aozora_book_key}"
        if aozora_book_key in AOZORA_BOOKS:
            return book_id, ""
        return book_id, (
            f"NEW Aozora book — '{aozora_book_key}' is not yet in AOZORA_BOOKS "
            f"(services/book_import.py). Needs an entry there, or this row's own "
            f"aozora_url, for 'Add to Library' to actually work."
        )

    if aozora_url:
        # No explicit book_key — try to resolve to an existing hardcoded
        # entry by title before falling back to a guessed slug, so books
        # that are already in AOZORA_BOOKS (just not told to us by key)
        # land on their real, already-working id.
        title_en = (row.get("title_en") or "").strip()
        matched_key = find_aozora_key_by_title(title_en)
        if matched_key:
            return f"aozora-{matched_key}", ""
        slug = slugify(title_en)
        if not slug:
            raise RowError(f"could not generate a slug from title_en {title_en!r}")
        return f"aozora-{slug}", (
            f"NEW/unverified Aozora book — no aozora_book_key given and title_en "
            f"{title_en!r} matched no existing AOZORA_BOOKS entry, id guessed as "
            f"'aozora-{slug}'. This row's own aozora_url makes it importable as-is "
            f"(via the dynamic-import fallback) — the flag is just to confirm the id "
            f"looks right, not that it's broken."
        )

    if aozora_id:
        title_en = (row.get("title_en") or "").strip()
        slug = slugify(title_en)
        if not slug:
            raise RowError(f"could not generate a slug from title_en {title_en!r}")
        return f"aozora-{slug}", (
            f"NEW/unverified Aozora book — no aozora_book_key given, id guessed as "
            f"'aozora-{slug}' from title_en. Most AOZORA_BOOKS keys are romanized "
            f"Japanese, not English slugs — confirm this key (or add aozora_book_key "
            f"explicitly) before relying on it."
        )

    title_en = (row.get("title_en") or "").strip()
    slug = slugify(title_en)
    if not slug:
        raise RowError(f"could not generate a slug from title_en {title_en!r}")
    return f"catalog-{slug}", ""


# --------------------------------------------------------------------------
# Row -> book_catalog fields
# --------------------------------------------------------------------------

def build_fields(row: dict, force_publish: bool = False) -> Tuple[dict, Optional[str]]:
    missing = [f for f in REQUIRED_FIELDS if not (row.get(f) or "").strip()]
    if missing:
        raise RowError(f"missing required field(s): {', '.join(missing)}")

    availability = validate_enum(row.get("availability"), AVAILABILITY_LOOKUP, "availability")
    difficulty = validate_enum(row.get("difficulty"), DIFFICULTY_LOOKUP, "difficulty")
    jlpt_level = validate_enum(row.get("jlpt_level"), JLPT_LOOKUP, "jlpt_level")
    language = validate_enum(row.get("language"), LANGUAGE_LOOKUP, "language")
    copyright_status = validate_enum(row.get("copyright_status"), COPYRIGHT_LOOKUP, "copyright_status")

    page_count = parse_int(row.get("page_count"), "page_count")
    publication_year = parse_int(row.get("publication_year"), "publication_year")

    aozora_url = (row.get("aozora_url") or "").strip() or None
    url_warning = check_aozora_url_format(aozora_url)

    length_category = compute_length_category(page_count)
    entity_status = (
        EntityStatus.PUBLISHED.value
        if (force_publish or (difficulty and language))
        else EntityStatus.DRAFT.value
    )

    fields = {
        "title_jp": row["title_jp"].strip(),
        "title_en": row["title_en"].strip(),
        "title_romaji": (row.get("title_romaji") or "").strip() or None,
        "author_name": row["author_name"].strip(),
        "author_name_jp": (row.get("author_name_jp") or "").strip() or None,
        "cover_image": (row.get("cover_image") or "").strip() or None,
        "genre_ids": parse_list(row.get("genre_ids")),
        "difficulty": difficulty,
        "jlpt_level": jlpt_level,
        "language": language,
        "page_count": page_count,
        "length_category": length_category.value if length_category else None,
        "availability": availability,
        "publication_year": publication_year,
        "aozora_id": (row.get("aozora_id") or "").strip() or None,
        "aozora_url": aozora_url,
        "gutenberg_id": (row.get("gutenberg_id") or "").strip() or None,
        "buy_link": (row.get("buy_link") or "").strip() or None,
        "upload_allowed": parse_bool(row.get("upload_allowed"), default=True),
        "original_publisher": (row.get("original_publisher") or "").strip() or None,
        "copyright_status": copyright_status or CopyrightStatus.UNKNOWN.value,
        "description_short": (row.get("description_short") or "").strip() or None,
        "description_long": (row.get("description_long") or "").strip() or None,
        "has_translation": parse_optional_bool(row.get("has_translation")),
        "rating_avg": 0.0,
        "rating_count": 0,
        "popularity_score": 0,
        "save_count": 0,
        "import_status": None,
        "entity_status": entity_status,
        "updated_at": datetime.now(timezone.utc),
        "ontology_version": ONTOLOGY_VERSION,
        "theme_ids": parse_list(row.get("theme_ids")),
        "mood_ids": parse_list(row.get("mood_ids")),
        "setting_ids": parse_list(row.get("setting_ids")),
        "period_ids": parse_list(row.get("period_ids")),
        "cultural_concept_ids": [],
        "award_ids": [],
        "adaptation_types": parse_list(row.get("adaptation_types")),
    }
    return fields, url_warning


# --------------------------------------------------------------------------
# Ingestion loop
# --------------------------------------------------------------------------

async def ingest(db, csv_path: Path, dry_run: bool, force_publish: bool = False):
    inserted = updated = skipped = 0
    errors: List[str] = []
    notes: List[str] = []
    warnings: List[str] = []
    seen_ids: Dict[str, Tuple[str, str, int]] = {}

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        unrecognized = set(reader.fieldnames or []) - RECOGNIZED_COLUMNS
        for col in sorted(unrecognized):
            logger.warning(f"unrecognized column {col!r} — ignored")

        for line_no, row in enumerate(reader, start=2):  # header is line 1
            try:
                book_id, note = generate_id(row)
                fields, url_warning = build_fields(row, force_publish=force_publish)
                title_en = fields["title_en"]
                author_name = fields["author_name"]

                if book_id in seen_ids:
                    prev_title, prev_author, prev_line = seen_ids[book_id]
                    if prev_title.lower() == title_en.lower() and prev_author.lower() == author_name.lower():
                        errors.append(
                            f"line {line_no}: duplicate row for id {book_id!r} "
                            f"(already processed at line {prev_line}) — skipped"
                        )
                    else:
                        errors.append(
                            f"line {line_no}: id collision on {book_id!r} — {title_en!r} by "
                            f"{author_name!r} vs {prev_title!r} by {prev_author!r} from line "
                            f"{prev_line} — skipped"
                        )
                    skipped += 1
                    continue

                existing = await db.book_catalog.find_one({"id": book_id}, {"title_en": 1, "author_name": 1})
                if existing:
                    ex_title = existing.get("title_en") or ""
                    ex_author = existing.get("author_name") or ""
                    if ex_title.lower() != title_en.lower() or ex_author.lower() != author_name.lower():
                        errors.append(
                            f"line {line_no}: id {book_id!r} already used in the database by "
                            f"{ex_title!r} by {ex_author!r} — skipped"
                        )
                        skipped += 1
                        continue

                seen_ids[book_id] = (title_en, author_name, line_no)

                if note:
                    notes.append(f"line {line_no} ({book_id}): {note}")
                if url_warning:
                    warnings.append(f"line {line_no} ({book_id}): {url_warning}")

                if dry_run:
                    inserted += 0 if existing else 1
                    updated += 1 if existing else 0
                    continue

                result = await db.book_catalog.update_one(
                    {"id": book_id},
                    {
                        "$set": fields,
                        "$setOnInsert": {"id": book_id, "added_at": datetime.now(timezone.utc)},
                    },
                    upsert=True,
                )
                if result.upserted_id is not None:
                    inserted += 1
                else:
                    updated += 1

            except RowError as e:
                errors.append(f"line {line_no}: {e}")
                skipped += 1

    return inserted, updated, skipped, errors, notes, warnings


def print_summary(inserted, updated, skipped, errors, notes, warnings, dry_run):
    mode = "[DRY RUN] " if dry_run else ""
    print()
    print(f"{mode}Inserted: {inserted}   Updated: {updated}   Skipped: {skipped}")

    if errors:
        print()
        print("Skipped rows:")
        for e in errors:
            print(f"  {e}")

    if notes:
        print()
        print("New / unverified Aozora books (ingested, but flagged):")
        for n in notes:
            print(f"  {n}")

    if warnings:
        print()
        print("Warnings:")
        for w in warnings:
            print(f"  {w}")


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------

async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest a catalog CSV into book_catalog.")
    parser.add_argument("csv_path", type=Path, help="Path to the catalog CSV file")
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing")
    parser.add_argument(
        "--force-publish",
        action="store_true",
        help=(
            "One-time override: publish every row in THIS run regardless of "
            "missing difficulty/language, instead of the normal hybrid gate "
            "(published only if both are present, else draft). Does not change "
            "the gate for any other run — omit this flag and the default rule "
            "applies as usual."
        ),
    )
    args = parser.parse_args()

    if not args.csv_path.exists():
        logger.error(f"CSV file not found: {args.csv_path}")
        sys.exit(1)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"Connecting to MongoDB database: {db_name}")

    if not args.dry_run:
        await ensure_catalog_indexes(db)

    inserted, updated, skipped, errors, notes, warnings = await ingest(
        db, args.csv_path, args.dry_run, force_publish=args.force_publish
    )
    print_summary(inserted, updated, skipped, errors, notes, warnings, args.dry_run)

    client.close()


if __name__ == "__main__":
    load_dotenv(BACKEND_DIR / ".env")
    asyncio.run(main())
