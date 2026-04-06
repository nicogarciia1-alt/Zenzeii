"""
Translation Worker - Separate background process for translations
Runs independently from the web server to prevent blocking
"""
import asyncio
import os
import sys
import signal
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.translation import translate_batch_for_worker

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("translation_worker")

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Worker configuration
MAX_CONCURRENT_BATCHES = 2  # Limit concurrent translations
BATCH_SIZE = 12  # Sentences per batch
POLL_INTERVAL = 3  # Seconds between queue checks
SENTENCES_PER_BOOK_BATCH = 100  # How many sentences to translate per cycle

# Graceful shutdown
shutdown_event = asyncio.Event()


def signal_handler(signum, frame):
    logger.info("Shutdown signal received")
    shutdown_event.set()


async def get_translation_jobs(db):
    """
    Get books/chapters that need translation work.
    Prioritizes:
    1. Books in "preparing" status (initial import)
    2. Chapters with pending sentences that users have accessed
    """
    jobs = []

    # Priority 1 & 2: Any book with untranslated sentences (preparing or completed)
    all_books = await db.books.find(
        {"import_status": {"$in": ["preparing", "completed"]}},
        {"_id": 0, "id": 1, "title": 1, "import_status": 1}
    ).to_list(20)

    for book in all_books:
        pending = await db.sentences.count_documents({
            "book_id": book["id"],
            "translation_status": {"$ne": "completed"}
        })
        if pending > 0:
            jobs.append({
                "type": "initial_import",
                "book_id": book["id"],
                "book_title": book["title"],
                "priority": 1 if book["import_status"] == "preparing" else 2,
            })
    
    # Priority 2: Chapters that have been accessed (translation_requested flag)
    requested_chapters = await db.chapters.find(
        {"translation_requested": True},
        {"_id": 0, "id": 1, "book_id": 1, "title": 1}
    ).to_list(10)
    
    for chapter in requested_chapters:
        pending_count = await db.sentences.count_documents({
            "chapter_id": chapter["id"],
            "translation_status": {"$ne": "completed"}
        })
        
        if pending_count > 0:
            jobs.append({
                "type": "chapter_request",
                "chapter_id": chapter["id"],
                "book_id": chapter["book_id"],
                "chapter_title": chapter.get("title", ""),
                "priority": 2,
                "pending_count": pending_count
            })
        else:
            # All done, clear the flag
            await db.chapters.update_one(
                {"id": chapter["id"]},
                {"$unset": {"translation_requested": ""}}
            )
    
    return sorted(jobs, key=lambda x: x["priority"])


async def process_translation_batch(db, sentences):
    """Process a single batch of sentences"""
    if not sentences:
        return 0
    
    sentence_ids = [s["id"] for s in sentences]
    english_texts = [s["english"] for s in sentences]
    
    results = await translate_batch_for_worker(sentence_ids, english_texts)
    
    # Save results to database
    for sid, data in results.items():
        await db.sentences.update_one(
            {"id": sid},
            {"$set": data}
        )
    
    return len(results)


async def process_job(db, job, semaphore):
    """Process a single translation job with concurrency control"""
    async with semaphore:
        try:
            if job["type"] == "initial_import":
                # Get untranslated sentences for this book
                sentences = await db.sentences.find(
                    {
                        "book_id": job["book_id"],
                        "translation_status": {"$ne": "completed"}
                    },
                    {"_id": 0, "id": 1, "english": 1}
                ).sort("order", 1).limit(SENTENCES_PER_BOOK_BATCH).to_list(SENTENCES_PER_BOOK_BATCH)
                
                if sentences:
                    logger.info(f"[INITIAL] Processing {len(sentences)} sentences for {job['book_title']}")
                    
                    # Process in smaller batches
                    total_translated = 0
                    for i in range(0, len(sentences), BATCH_SIZE):
                        if shutdown_event.is_set():
                            break
                        batch = sentences[i:i + BATCH_SIZE]
                        translated = await process_translation_batch(db, batch)
                        total_translated += translated
                        await asyncio.sleep(0.5)  # Small delay between batches
                    
                    logger.info(f"[INITIAL] Translated {total_translated} sentences for {job['book_title']}")
                    
            elif job["type"] == "chapter_request":
                # Get untranslated sentences for this chapter
                sentences = await db.sentences.find(
                    {
                        "chapter_id": job["chapter_id"],
                        "translation_status": {"$ne": "completed"}
                    },
                    {"_id": 0, "id": 1, "english": 1}
                ).sort("order", 1).limit(SENTENCES_PER_BOOK_BATCH).to_list(SENTENCES_PER_BOOK_BATCH)
                
                if sentences:
                    logger.info(f"[CHAPTER] Processing {len(sentences)} sentences for chapter {job.get('chapter_title', job['chapter_id'])}")
                    
                    total_translated = 0
                    for i in range(0, len(sentences), BATCH_SIZE):
                        if shutdown_event.is_set():
                            break
                        batch = sentences[i:i + BATCH_SIZE]
                        translated = await process_translation_batch(db, batch)
                        total_translated += translated
                        await asyncio.sleep(0.5)
                    
                    logger.info(f"[CHAPTER] Translated {total_translated} sentences")
                    
        except Exception as e:
            logger.error(f"Error processing job: {e}", exc_info=True)


async def worker_loop():
    """Main worker loop"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Semaphore to limit concurrent translations
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_BATCHES)
    
    logger.info(f"Translation worker started (max concurrency: {MAX_CONCURRENT_BATCHES})")
    
    while not shutdown_event.is_set():
        try:
            # Get pending jobs
            jobs = await get_translation_jobs(db)
            
            if jobs:
                # Process jobs concurrently (limited by semaphore)
                tasks = [process_job(db, job, semaphore) for job in jobs[:3]]
                await asyncio.gather(*tasks)
            else:
                # No work, wait before checking again
                await asyncio.sleep(POLL_INTERVAL)
                
        except Exception as e:
            logger.error(f"Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(5)
    
    client.close()
    logger.info("Translation worker stopped")


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
