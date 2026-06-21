"""
Wipes books, chapters, sentences, reading_progress, and shelves collections.
Does NOT touch users or vocabulary.
Run once before the shared-book architecture migration.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

COLLECTIONS = ["books", "chapters", "sentences", "reading_progress", "shelves"]


async def wipe():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Connected to: {db_name}")
    print()

    for name in COLLECTIONS:
        result = await db[name].delete_many({})
        print(f"  {name}: deleted {result.deleted_count} documents")

    client.close()
    print()
    print("Done. users and vocabulary untouched.")


if __name__ == "__main__":
    confirm = input("This will permanently delete all books, chapters, sentences, reading_progress, and shelves. Type YES to continue: ")
    if confirm.strip() != "YES":
        print("Aborted.")
    else:
        asyncio.run(wipe())
