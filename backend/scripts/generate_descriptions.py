"""
Description-generation script for the Zenzeii Library Catalog (`book_catalog`).

Reads every published book with an empty `description_long`, asks OpenAI for
an editorial description, and writes description_long directly onto that
book's `book_catalog` document in MongoDB. description_short is left
untouched — all published books already have one.

Usage:
    python backend/scripts/generate_descriptions.py
    python backend/scripts/generate_descriptions.py --dry-run
    python backend/scripts/generate_descriptions.py --book-id gutenberg-1342

--dry-run processes only the first 5 matching books and prints the generated
JSON to the console instead of writing to MongoDB.

--book-id generates a description for exactly one book, by id, regardless of
its current entity_status or description_long (useful for testing or
regenerating a single entry) — instead of the normal published+empty query.
"""
import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from openai import AsyncOpenAI

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("generate_descriptions")

# gpt-4o-mini pricing, USD per 1M tokens (input/output) — used only for the
# end-of-run cost estimate printed to the console, not sent to OpenAI.
PRICE_PER_1M_INPUT = 0.150
PRICE_PER_1M_OUTPUT = 0.600

SYSTEM_PROMPT = (
    "Refined editorial voice. Specific. No clichés. Each description must name "
    "the emotional or thematic core of the work, not just its surface plot. "
    "Write as if the reader is already holding the book — not pitching it to them. "
    "Do not start with the title or author name. "
    'Never use the phrase "enduring relevance" or any variation of it. '
    'Never use "pivotal work," "significant work," or "stands as a testament." '
    'Never include "Ideal for readers who" or any recommendation-style closing sentence. '
    "Do not invent specific character names, genders, or plot details. Speak only to "
    "themes, atmosphere, and emotional register — things that are true of the work as "
    "a whole without naming invented specifics."
)

USER_PROMPT_TEMPLATE = """You are a literary editor for Zenzeii, a curated library of Japanese literature.

Write a professional description for:
Title: {title_en} ({title_jp})
Author: {author_name}
Year: {publication_year}
Genre: {genre_ids}
Length: {page_count}

Return JSON with one key:
- "description_long": Write two paragraphs, separated by a blank line. The first introduces the emotional and thematic core of the work. The second gives a sense of atmosphere, style, or what makes this author's treatment distinctive. For short stories or essays under 30 pages, one substantial paragraph is enough. Do not invent specific character names, genders, or plot details. Speak to themes, atmosphere, and emotional register only. Do not use phrases like "enduring relevance", "pivotal work", "significant work", "stands as a testament", or "ideal for readers who". Do not start with the title or author name. Write as if the reader is already holding the book."""


def build_user_prompt(book: dict) -> str:
    genre_ids = book.get("genre_ids") or []
    page_count = book.get("page_count")
    return USER_PROMPT_TEMPLATE.format(
        title_en=book.get("title_en") or "",
        title_jp=book.get("title_jp") or "",
        author_name=book.get("author_name") or "",
        publication_year=book.get("publication_year") or "Unknown",
        genre_ids=", ".join(genre_ids) if genre_ids else "Unspecified",
        page_count=f"{page_count} pages" if page_count else "Unknown",
    )


async def generate_description(client: AsyncOpenAI, book: dict) -> Optional[dict]:
    """Calls OpenAI for one book. Returns {"description_long", "usage"} or None on failure."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(book)},
            ],
            temperature=0.7,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)

        description_long = (data.get("description_long") or "").strip()

        if not description_long:
            logger.error(f"{book['id']}: response missing description_long — {raw!r}")
            return None

        usage = response.usage
        return {
            "description_long": description_long,
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
        }

    except Exception as e:
        logger.error(f"{book['id']}: OpenAI call failed — {e}")
        return None


async def fetch_books(db, book_id: Optional[str]) -> list:
    projection = {
        "id": 1, "title_en": 1, "title_jp": 1, "author_name": 1,
        "publication_year": 1, "genre_ids": 1, "page_count": 1,
        "description_long": 1,
    }

    if book_id:
        doc = await db.book_catalog.find_one({"id": book_id}, projection)
        if doc is None:
            logger.error(f"No book_catalog entry found with id {book_id!r}")
            return []
        return [doc]

    query = {
        "entity_status": "published",
        "$or": [{"description_long": None}, {"description_long": ""}],
    }
    cursor = db.book_catalog.find(query, projection)
    return [doc async for doc in cursor]


async def run(dry_run: bool, book_id: Optional[str], force: bool) -> None:
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_api_key:
        logger.error("OPENAI_API_KEY is not set")
        sys.exit(1)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")
    client_mongo = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client_mongo[db_name]
    logger.info(f"Connecting to MongoDB database: {db_name}")

    books = await fetch_books(db, book_id)
    if book_id and not force and books:
        existing = (books[0].get("description_long") or "").strip()
        if existing:
            logger.warning(
                f"{book_id}: description_long already exists — skipping "
                f"(pass --force to regenerate)"
            )
            client_mongo.close()
            return
    if dry_run:
        books = books[:5]

    if not books:
        logger.info("No matching books found — nothing to do.")
        client_mongo.close()
        return

    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Generating descriptions for {len(books)} book(s)")

    client_openai = AsyncOpenAI(api_key=openai_api_key)
    updated = 0
    failed = 0
    total_prompt_tokens = 0
    total_completion_tokens = 0

    for book in books:
        result = await generate_description(client_openai, book)
        if result is None:
            failed += 1
            continue

        total_prompt_tokens += result["prompt_tokens"]
        total_completion_tokens += result["completion_tokens"]

        if dry_run:
            print()
            print(f"--- {book['id']} ({book.get('title_en')}) ---")
            print(json.dumps(
                {"description_long": result["description_long"]},
                ensure_ascii=False, indent=2,
            ))
        else:
            await db.book_catalog.update_one(
                {"id": book["id"]},
                {"$set": {
                    "description_long": result["description_long"],
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            updated += 1
            preview = result["description_long"][:80]
            print(f'✓ {book.get("title_en")} — "{preview}..."')

    total_tokens = total_prompt_tokens + total_completion_tokens
    estimated_cost = (
        total_prompt_tokens / 1_000_000 * PRICE_PER_1M_INPUT
        + total_completion_tokens / 1_000_000 * PRICE_PER_1M_OUTPUT
    )

    print()
    if dry_run:
        print(f"[DRY RUN] Generated: {len(books) - failed}   Failed: {failed}")
    else:
        print(f"Updated: {updated}   Failed: {failed}")
    print(f"Total tokens: {total_tokens} (prompt: {total_prompt_tokens}, completion: {total_completion_tokens})")
    print(f"Estimated cost: ${estimated_cost:.4f}")

    client_mongo.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI descriptions for book_catalog entries via OpenAI.")
    parser.add_argument("--dry-run", action="store_true", help="Process only the first 5 books and print to console")
    parser.add_argument("--book-id", type=str, default=None, help="Generate a description for a single book id")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate description even if one already exists (only relevant with --book-id)"
    )
    args = parser.parse_args()

    load_dotenv(BACKEND_DIR / ".env")
    asyncio.run(run(dry_run=args.dry_run, book_id=args.book_id, force=args.force))


if __name__ == "__main__":
    main()
