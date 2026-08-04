"""
One-time / idempotent seed script for the Zenzeii Library Catalog (Layer 1).

Populates:
- `genres`        — the 13 controlled-vocabulary genres defined in the brief.
- `book_catalog`  — 10 test books spanning every Layer 1 filter value, so
                     each filter and sort can be verified independently.

Safe to run multiple times: every write is an upsert keyed on `id`, so
re-running never creates duplicates — it resets test fixtures to their
canonical seed values instead. Reads MONGO_URL / DB_NAME from the
environment exactly like the main server; no credentials are hardcoded.

Usage:
    python backend/scripts/seed_catalog.py
"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple

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
from services.catalog_service import (  # noqa: E402
    compute_length_category,
    ensure_catalog_indexes,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_catalog")

ONTOLOGY_VERSION = "layer1-v1"


# --------------------------------------------------------------------------
# Seed data — the 13 genres, implemented exactly as specified in the brief.
# --------------------------------------------------------------------------

GENRES_SEED = [
    {"id": "genre_novel", "name": "Novel", "name_jp": "小説", "description": "A long-form prose narrative", "sort_order": 1},
    {"id": "genre_short_story", "name": "Short Story", "name_jp": "短編小説", "description": "A brief prose narrative, typically under 50 pages", "sort_order": 2},
    {"id": "genre_poetry", "name": "Poetry", "name_jp": "詩", "description": "Verse-form literary work", "sort_order": 3},
    {"id": "genre_essay", "name": "Essay", "name_jp": "随筆", "description": "Personal or reflective non-fiction prose", "sort_order": 4},
    {"id": "genre_classic", "name": "Classic", "name_jp": "古典", "description": "Works of enduring literary recognition", "sort_order": 5},
    {"id": "genre_contemporary", "name": "Contemporary", "name_jp": "現代文学", "description": "Works from the post-war era to present", "sort_order": 6},
    {"id": "genre_historical", "name": "Historical", "name_jp": "歴史小説", "description": "Fiction set in a specific historical period", "sort_order": 7},
    {"id": "genre_mystery", "name": "Mystery", "name_jp": "推理小説", "description": "Suspense and detective fiction", "sort_order": 8},
    {"id": "genre_horror", "name": "Horror", "name_jp": "恐怖小説", "description": "Works of supernatural or psychological fear", "sort_order": 9},
    {"id": "genre_romance", "name": "Romance", "name_jp": "恋愛小説", "description": "Stories centered on romantic relationships", "sort_order": 10},
    {"id": "genre_childrens", "name": "Children's", "name_jp": "児童文学", "description": "Literature written for young readers", "sort_order": 11},
    {"id": "genre_memoir", "name": "Memoir", "name_jp": "回想録", "description": "First-person autobiographical narrative", "sort_order": 12},
    {"id": "genre_anthology", "name": "Anthology", "name_jp": "アンソロジー", "description": "A curated collection of works", "sort_order": 13},
]

# page_count drives length_category via compute_length_category() — never
# set length_category directly, so the two fields can't drift apart.
#
# rating_avg / rating_count / popularity_score / save_count are seeded with
# deliberately varied values (not zero) so sort=popular/rating and the
# filter+sort combination are actually observable in steps 8-10 — an empty
# catalog where every book ties at 0 would make sort verification meaningless.
BOOKS_SEED = [
    {"id": "aozora-kokoro", "title_jp": "こころ", "title_en": "Kokoro", "title_romaji": "Kokoro",
     "author_name": "Natsume Soseki", "author_name_jp": "夏目漱石",
     "genre_ids": ["genre_novel", "genre_classic"],
     "difficulty": Difficulty.INTERMEDIATE, "jlpt_level": JLPTLevel.N2, "language": CatalogLanguage.JAPANESE,
     "page_count": 248, "availability": Availability.FREE,
     "aozora_id": "773", "aozora_url": "https://www.aozora.gr.jp/cards/000148/card773.html", "buy_link": None,
     "publication_year": 1914, "original_publisher": "Iwanami Shoten", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "A meditation on isolation and guilt in early 20th-century Japan.",
     "rating_avg": 4.7, "rating_count": 142, "popularity_score": 3841, "save_count": 530},

    {"id": "aozora-bocchan", "title_jp": "坊っちゃん", "title_en": "Botchan", "title_romaji": "Botchan",
     "author_name": "Natsume Soseki", "author_name_jp": "夏目漱石",
     "genre_ids": ["genre_novel", "genre_classic"],
     "difficulty": Difficulty.BEGINNER, "jlpt_level": JLPTLevel.N3, "language": CatalogLanguage.JAPANESE,
     "page_count": 90, "availability": Availability.FREE,
     "aozora_id": "752", "aozora_url": "https://www.aozora.gr.jp/cards/000148/card752.html", "buy_link": None,
     "publication_year": 1906, "original_publisher": "Shunyodo", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "A hot-blooded young teacher clashes with provincial small-town life.",
     "rating_avg": 4.5, "rating_count": 98, "popularity_score": 2210, "save_count": 310},

    {"id": "aozora-rashomon", "title_jp": "羅生門", "title_en": "Rashomon", "title_romaji": "Rashōmon",
     "author_name": "Akutagawa Ryunosuke", "author_name_jp": "芥川龍之介",
     "genre_ids": ["genre_short_story", "genre_classic"],
     "difficulty": Difficulty.ADVANCED, "jlpt_level": JLPTLevel.N1, "language": CatalogLanguage.JAPANESE,
     "page_count": 20, "availability": Availability.FREE,
     "aozora_id": "127", "aozora_url": "https://www.aozora.gr.jp/cards/000879/card127.html", "buy_link": None,
     "publication_year": 1915, "original_publisher": "Teikoku Bungaku", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "A destitute servant faces a moral reckoning beneath a ruined city gate.",
     "rating_avg": 4.8, "rating_count": 210, "popularity_score": 5120, "save_count": 780},

    {"id": "gutenberg-1342", "title_jp": "高慢と偏見", "title_en": "Pride and Prejudice", "title_romaji": None,
     "author_name": "Jane Austen", "author_name_jp": None,
     "genre_ids": ["genre_novel", "genre_romance"],
     "difficulty": Difficulty.ADVANCED, "jlpt_level": None, "language": CatalogLanguage.ENGLISH,
     "page_count": 432, "availability": Availability.FREE,
     "gutenberg_id": "1342", "buy_link": None,
     "publication_year": 1813, "original_publisher": "T. Egerton", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "Wit, class, and courtship in Regency England — an English-language reference title.",
     "rating_avg": 4.6, "rating_count": 340, "popularity_score": 6700, "save_count": 910},

    {"id": "catalog-snow-country", "title_jp": "雪国", "title_en": "Snow Country", "title_romaji": "Yukiguni",
     "author_name": "Kawabata Yasunari", "author_name_jp": "川端康成",
     "genre_ids": ["genre_novel", "genre_romance"],
     "difficulty": Difficulty.ADVANCED, "jlpt_level": JLPTLevel.N1, "language": CatalogLanguage.JAPANESE,
     "page_count": 175, "availability": Availability.BUY,
     "buy_link": "https://example.com/buy/snow-country",
     "publication_year": 1948, "original_publisher": "Sogensha", "copyright_status": CopyrightStatus.COPYRIGHTED,
     "description_short": "A doomed affair unfolds against the hush of a mountain hot-spring town.",
     "rating_avg": 4.3, "rating_count": 54, "popularity_score": 890, "save_count": 120},

    {"id": "catalog-1q84", "title_jp": "1Q84", "title_en": "1Q84", "title_romaji": None,
     "author_name": "Murakami Haruki", "author_name_jp": "村上春樹",
     "genre_ids": ["genre_novel", "genre_contemporary"],
     "difficulty": Difficulty.INTERMEDIATE, "jlpt_level": JLPTLevel.N2, "language": CatalogLanguage.JAPANESE,
     "page_count": 925, "availability": Availability.BUY,
     "buy_link": "https://example.com/buy/1q84",
     "publication_year": 2009, "original_publisher": "Shinchosha", "copyright_status": CopyrightStatus.COPYRIGHTED,
     "description_short": "Two parallel lives converge in a Tokyo with two moons.",
     "rating_avg": 4.4, "rating_count": 410, "popularity_score": 8200, "save_count": 1200},

    {"id": "aozora-sanshiro", "title_jp": "三四郎", "title_en": "Sanshiro", "title_romaji": "Sanshirō",
     "author_name": "Natsume Soseki", "author_name_jp": "夏目漱石",
     "genre_ids": ["genre_novel", "genre_classic"],
     "difficulty": Difficulty.INTERMEDIATE, "jlpt_level": JLPTLevel.N3, "language": CatalogLanguage.JAPANESE,
     "page_count": 260, "availability": Availability.FREE,
     "aozora_id": "794", "aozora_url": "https://www.aozora.gr.jp/cards/000148/card794.html", "buy_link": None,
     "publication_year": 1908, "original_publisher": "Shunyodo", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "A country student's first encounter with the currents of modern Tokyo.",
     "rating_avg": 4.1, "rating_count": 42, "popularity_score": 610, "save_count": 95},

    {"id": "aozora-gongitsune", "title_jp": "ごん狐", "title_en": "Gon, the Little Fox", "title_romaji": "Gongitsune",
     "author_name": "Niimi Nankichi", "author_name_jp": "新美南吉",
     "genre_ids": ["genre_childrens", "genre_short_story"],
     "difficulty": Difficulty.BEGINNER, "jlpt_level": JLPTLevel.N4, "language": CatalogLanguage.JAPANESE,
     "page_count": 15, "availability": Availability.FREE,
     "aozora_id": "1421", "aozora_url": "https://www.aozora.gr.jp/cards/000121/card1421.html", "buy_link": None,
     "publication_year": 1932, "original_publisher": "Akai Tori", "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "A lonely fox's small acts of penance go unrecognized until it's too late.",
     "rating_avg": 4.9, "rating_count": 76, "popularity_score": 1450, "save_count": 260},

    {"id": "catalog-kitchen", "title_jp": "キッチン", "title_en": "Kitchen", "title_romaji": "Kicchin",
     "author_name": "Yoshimoto Banana", "author_name_jp": "吉本ばなな",
     "genre_ids": ["genre_novel", "genre_contemporary"],
     "difficulty": Difficulty.INTERMEDIATE, "jlpt_level": JLPTLevel.N2, "language": CatalogLanguage.JAPANESE,
     "page_count": 152, "availability": Availability.BUY,
     "buy_link": "https://example.com/buy/kitchen",
     "publication_year": 1988, "original_publisher": "Fukutake Shoten", "copyright_status": CopyrightStatus.COPYRIGHTED,
     "description_short": "Grief, food, and found family in a quietly luminous Tokyo apartment.",
     "rating_avg": 4.2, "rating_count": 88, "popularity_score": 1980, "save_count": 340},

    {"id": "aozora-tsurezuregusa", "title_jp": "徒然草", "title_en": "Essays in Idleness", "title_romaji": "Tsurezuregusa",
     "author_name": "Yoshida Kenko", "author_name_jp": "吉田兼好",
     "genre_ids": ["genre_essay", "genre_classic"],
     "difficulty": Difficulty.NATIVE, "jlpt_level": None, "language": CatalogLanguage.JAPANESE,
     "page_count": 200, "availability": Availability.FREE,
     "aozora_id": "2524", "aozora_url": "https://www.aozora.gr.jp/cards/000203/card2524.html", "buy_link": None,
     "publication_year": 1330, "original_publisher": None, "copyright_status": CopyrightStatus.PUBLIC_DOMAIN,
     "description_short": "Classical-Japanese reflections on impermanence, written in scattered fragments.",
     "rating_avg": 3.9, "rating_count": 21, "popularity_score": 310, "save_count": 40},
]


# --------------------------------------------------------------------------
# Upsert logic
# --------------------------------------------------------------------------

async def seed_genres(db) -> Tuple[int, int]:
    """Upserts every genre in GENRES_SEED. Returns (inserted, updated)."""
    inserted = updated = 0
    for genre in GENRES_SEED:
        result = await db.genres.update_one(
            {"id": genre["id"]},
            {
                "$set": {
                    "name": genre["name"],
                    "name_jp": genre["name_jp"],
                    "description": genre["description"],
                    "layer": 1,
                    "filterable": True,
                    "sort_order": genre["sort_order"],
                },
                "$setOnInsert": {
                    "id": genre["id"],
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


async def seed_books(db) -> Tuple[int, int]:
    """Upserts every book in BOOKS_SEED. Returns (inserted, updated)."""
    inserted = updated = 0
    for book in BOOKS_SEED:
        length_category = compute_length_category(book["page_count"])
        jlpt_level = book.get("jlpt_level")

        fields = {
            "title_jp": book["title_jp"],
            "title_en": book["title_en"],
            "title_romaji": book.get("title_romaji"),
            "author_name": book["author_name"],
            "author_name_jp": book.get("author_name_jp"),
            "genre_ids": book["genre_ids"],
            "difficulty": book["difficulty"].value,
            "jlpt_level": jlpt_level.value if jlpt_level else None,
            "language": book["language"].value,
            "page_count": book["page_count"],
            "length_category": length_category.value if length_category else None,
            "availability": book["availability"].value,
            "aozora_id": book.get("aozora_id"),
            "aozora_url": book.get("aozora_url"),
            "gutenberg_id": book.get("gutenberg_id"),
            "buy_link": book.get("buy_link"),
            "upload_allowed": True,
            "publication_year": book.get("publication_year"),
            "original_publisher": book.get("original_publisher"),
            "copyright_status": book["copyright_status"].value,
            "cover_image": None,
            "description_short": book.get("description_short"),
            "description_long": None,
            "rating_avg": book["rating_avg"],
            "rating_count": book["rating_count"],
            "popularity_score": book["popularity_score"],
            "save_count": book["save_count"],
            "import_status": None,
            "entity_status": EntityStatus.PUBLISHED.value,
            "updated_at": datetime.now(timezone.utc),
            "ontology_version": ONTOLOGY_VERSION,
            "theme_ids": [], "mood_ids": [], "setting_ids": [], "period_ids": [],
            "cultural_concept_ids": [], "award_ids": [], "adaptation_types": [],
        }

        result = await db.book_catalog.update_one(
            {"id": book["id"]},
            {
                "$set": fields,
                "$setOnInsert": {"id": book["id"], "added_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------

async def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"Connecting to MongoDB database: {db_name}")

    await ensure_catalog_indexes(db)

    genres_inserted, genres_updated = await seed_genres(db)
    books_inserted, books_updated = await seed_books(db)

    logger.info("Seed complete.")
    logger.info(f"Genres — inserted: {genres_inserted}, updated: {genres_updated}")
    logger.info(f"Books  — inserted: {books_inserted}, updated: {books_updated}")

    client.close()


if __name__ == "__main__":
    load_dotenv(BACKEND_DIR / ".env")
    asyncio.run(main())
