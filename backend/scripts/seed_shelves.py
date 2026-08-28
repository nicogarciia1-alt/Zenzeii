"""
One-time / idempotent seed script for the Zenzeii Library `shelves` collection.

Upserts curated shelf documents (slug, title, title_jp, description,
kanji_text, image_url, book_ids), keyed by `slug` — safe to re-run as new
shelves are added or to refresh a field (e.g. image_url) on an existing one.

Seeds Tokyo Stories only for now — Kyoto & Tradition and shelves 3-6 arrive
in a follow-up brief and get appended to SHELVES_SEED below.

book_ids reference book_catalog's own generated ids (see ingest_catalog.py's
ID generation — NOT any id column a source CSV might carry, which the
ingester ignores). The 9 buy-availability ids below are ingest_catalog.py's
catalog-{slugify(title_en)} fallback, computed by hand from batch_003's
title_en values since there's no aozora_url/gutenberg_id signal for them.

Usage:
    python backend/scripts/seed_shelves.py
"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Make `services` importable regardless of the working directory this
# script is invoked from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from services.catalog_service import ensure_shelves_indexes  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_shelves")


SHELVES_SEED: List[Dict[str, Any]] = [
    {
        "slug": "tokyo-stories",
        "title": "Tokyo Stories",
        "title_jp": "東京物語",
        "description": (
            "The city that never sits still. Novels and stories rooted in "
            "Tokyo's streets — its loneliness and electricity, from Meiji "
            "alleys to postwar neon."
        ),
        "kanji_text": "東京は、静かな物語に満ちている。",
        "image_url": "",
        "book_ids": [
            "aozora-sanshiro",
            "catalog-the-scarlet-gang-of-asakusa",
            "catalog-norwegian-wood",
            "catalog-after-dark",
            "catalog-convenience-store-woman",
            "catalog-tokyo-ueno-station",
            "catalog-breasts-and-eggs",
            "catalog-days-at-the-morisaki-bookshop",
            "catalog-coin-locker-babies",
            "catalog-moshi-moshi",
        ],
    },
]


async def seed_shelves(db: AsyncIOMotorDatabase, entries: List[Dict[str, Any]]) -> Tuple[int, int]:
    """Upserts shelf documents keyed by `slug`. Returns (inserted, updated)."""
    inserted = updated = 0
    for entry in entries:
        fields = {k: v for k, v in entry.items() if k != "slug"}
        fields["updated_at"] = datetime.now(timezone.utc)

        result = await db.shelves.update_one(
            {"slug": entry["slug"]},
            {
                "$set": fields,
                "$setOnInsert": {"slug": entry["slug"], "created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


async def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"Connecting to MongoDB database: {db_name}")

    await ensure_shelves_indexes(db)

    inserted, updated = await seed_shelves(db, SHELVES_SEED)
    logger.info(f"shelves — inserted: {inserted}  updated: {updated}")

    client.close()


if __name__ == "__main__":
    load_dotenv(BACKEND_DIR / ".env")
    asyncio.run(main())
