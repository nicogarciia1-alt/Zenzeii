"""
One-time / idempotent seed script for the Zenzeii Library Catalog (Layer 2).

Populates the 7 Layer 2 taxonomy collections with their full controlled
vocabulary:

- `themes`               (39 entries)
- `moods`                (24 entries)
- `settings`             (32 entries)
- `historical_periods`   (11 entries)
- `cultural_concepts`    (23 entries)
- `awards`               (10 entries)
- `adaptation_types`     (6 entries)

Also creates every Layer 2 index (via ensure_layer2_indexes) and tags 3 of
the 10 Layer 1 test books with sample theme/mood/setting/period/concept
data, so Layer 2 filters have something real to filter against. It does
NOT create, upsert, or otherwise modify any book_catalog document as a
whole — the 3 tagged books must already exist from seed_catalog.py; only
their Layer 2 array fields are $set, every Layer 1 field is left untouched.

Safe to run multiple times: every taxonomy write is an upsert keyed on
`id`. Reads MONGO_URL / DB_NAME from the environment exactly like the main
server; no credentials are hardcoded.

Usage:
    python backend/scripts/seed_layer2_taxonomy.py
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

# Make `models` / `services` importable regardless of the working directory
# this script is invoked from.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from models.catalog_models import CulturalCategory, SettingType  # noqa: E402
from services.catalog_service import ensure_layer2_indexes, format_period_years  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed_layer2_taxonomy")


# --------------------------------------------------------------------------
# themes — the human concerns at the heart of a book. 39 entries, seeded
# exactly as specified in the brief. sort_order is assigned by list
# position (enumerate), not hardcoded here — see seed_taxonomy_collection().
# --------------------------------------------------------------------------

THEMES_SEED = [
    {"id": "theme_family", "name": "Family", "name_jp": "家族", "description": "Stories centered on family bonds and tensions"},
    {"id": "theme_love", "name": "Love", "name_jp": "愛", "description": "Romantic or profound human love"},
    {"id": "theme_friendship", "name": "Friendship", "name_jp": "友情", "description": "The bonds between friends"},
    {"id": "theme_identity", "name": "Identity", "name_jp": "アイデンティティ", "description": "The search for self and belonging"},
    {"id": "theme_coming_of_age", "name": "Coming of Age", "name_jp": "成長", "description": "A young person's transition to adulthood"},
    {"id": "theme_nature", "name": "Nature", "name_jp": "自然", "description": "The natural world as presence or metaphor"},
    {"id": "theme_memory", "name": "Memory", "name_jp": "記憶", "description": "The role of memory and the past"},
    {"id": "theme_loss", "name": "Loss", "name_jp": "喪失", "description": "Grief, absence, and what remains"},
    {"id": "theme_death", "name": "Death", "name_jp": "死", "description": "Mortality and what it means to live"},
    {"id": "theme_war", "name": "War", "name_jp": "戦争", "description": "The experience and aftermath of conflict"},
    {"id": "theme_food", "name": "Food", "name_jp": "食", "description": "Food as culture, comfort, and identity"},
    {"id": "theme_loneliness", "name": "Loneliness", "name_jp": "孤独", "description": "Isolation and the desire for connection"},
    {"id": "theme_isolation", "name": "Isolation", "name_jp": "孤立", "description": "Enforced or chosen separation from others"},
    {"id": "theme_redemption", "name": "Redemption", "name_jp": "贖罪", "description": "The possibility of repair and forgiveness"},
    {"id": "theme_justice", "name": "Justice", "name_jp": "正義", "description": "Fairness, law, and moral reckoning"},
    {"id": "theme_power", "name": "Power", "name_jp": "権力", "description": "Authority, control, and resistance"},
    {"id": "theme_ambition", "name": "Ambition", "name_jp": "野心", "description": "The drive to achieve and its costs"},
    {"id": "theme_spirituality", "name": "Spirituality", "name_jp": "精神性", "description": "Faith, ritual, and the sacred"},
    {"id": "theme_dreams", "name": "Dreams", "name_jp": "夢", "description": "Aspiration, fantasy, and the subconscious"},
    {"id": "theme_childhood", "name": "Childhood", "name_jp": "幼年期", "description": "The world as seen through a child's eyes"},
    {"id": "theme_aging", "name": "Aging", "name_jp": "老い", "description": "Growing old and the passage of time"},
    {"id": "theme_society", "name": "Society", "name_jp": "社会", "description": "Social structures, norms, and pressure"},
    {"id": "theme_class", "name": "Class", "name_jp": "階級", "description": "Social class and economic inequality"},
    {"id": "theme_gender", "name": "Gender", "name_jp": "ジェンダー", "description": "Gender roles, identity, and expectation"},
    {"id": "theme_freedom", "name": "Freedom", "name_jp": "自由", "description": "Liberty, constraint, and the cost of both"},
    {"id": "theme_duty", "name": "Duty", "name_jp": "義務", "description": "Obligation to others, family, or nation"},
    {"id": "theme_honor", "name": "Honor", "name_jp": "名誉", "description": "Reputation, dignity, and shame culture"},
    {"id": "theme_shame", "name": "Shame", "name_jp": "恥", "description": "The weight of social and personal shame"},
    {"id": "theme_beauty", "name": "Beauty", "name_jp": "美", "description": "Aesthetic experience and the pursuit of beauty"},
    {"id": "theme_impermanence", "name": "Impermanence", "name_jp": "無常", "description": "The Buddhist awareness that all things pass"},
    {"id": "theme_revenge", "name": "Revenge", "name_jp": "復讐", "description": "Retribution and its moral complexity"},
    {"id": "theme_betrayal", "name": "Betrayal", "name_jp": "裏切り", "description": "Trust broken and its consequences"},
    {"id": "theme_survival", "name": "Survival", "name_jp": "生存", "description": "Endurance under extreme conditions"},
    {"id": "theme_illness", "name": "Illness", "name_jp": "病", "description": "Physical or mental illness as lived experience"},
    {"id": "theme_creativity", "name": "Creativity", "name_jp": "創造性", "description": "Art, writing, and the creative act"},
    {"id": "theme_language", "name": "Language", "name_jp": "言語", "description": "Words, silence, and the limits of expression"},
    {"id": "theme_travel", "name": "Travel", "name_jp": "旅", "description": "Journey as discovery or escape"},
    {"id": "theme_home", "name": "Home", "name_jp": "家", "description": "Belonging, place, and the idea of home"},
    {"id": "theme_exile", "name": "Exile", "name_jp": "亡命", "description": "Displacement and longing for origin"},
]


# --------------------------------------------------------------------------
# moods — the emotional atmosphere of reading a book. 24 entries.
# --------------------------------------------------------------------------

MOODS_SEED = [
    {"id": "mood_cozy", "name": "Cozy", "name_jp": "ほっこり", "description": "Warm, safe, and comforting — like a blanket on a rainy day"},
    {"id": "mood_emotional", "name": "Emotional", "name_jp": "感動的", "description": "Deeply moving, likely to bring tears"},
    {"id": "mood_reflective", "name": "Reflective", "name_jp": "内省的", "description": "Invites quiet contemplation and slow reading"},
    {"id": "mood_hopeful", "name": "Hopeful", "name_jp": "希望的", "description": "Ends with light, even through difficulty"},
    {"id": "mood_dark", "name": "Dark", "name_jp": "暗い", "description": "Heavy, difficult, unflinching"},
    {"id": "mood_funny", "name": "Funny", "name_jp": "面白い", "description": "Genuinely humorous or comic in tone"},
    {"id": "mood_dreamlike", "name": "Dreamlike", "name_jp": "夢幻的", "description": "Surreal, lyrical, slightly unreal"},
    {"id": "mood_suspenseful", "name": "Suspenseful", "name_jp": "緊張感", "description": "Keeps you reading, afraid to stop"},
    {"id": "mood_peaceful", "name": "Peaceful", "name_jp": "穏やか", "description": "Quiet, unhurried, no urgency"},
    {"id": "mood_melancholic", "name": "Melancholic", "name_jp": "哀愁", "description": "Tinged with sadness and longing"},
    {"id": "mood_tense", "name": "Tense", "name_jp": "張り詰めた", "description": "Constant unease or psychological pressure"},
    {"id": "mood_bittersweet", "name": "Bittersweet", "name_jp": "切ない", "description": "Joy and sorrow held together"},
    {"id": "mood_uplifting", "name": "Uplifting", "name_jp": "元気が出る", "description": "Leaves you feeling better than before"},
    {"id": "mood_haunting", "name": "Haunting", "name_jp": "忘れられない", "description": "Stays with you long after the last page"},
    {"id": "mood_mysterious", "name": "Mysterious", "name_jp": "神秘的", "description": "Something withheld, something unexplained"},
    {"id": "mood_nostalgic", "name": "Nostalgic", "name_jp": "懐かしい", "description": "A longing for a past time or place"},
    {"id": "mood_meditative", "name": "Meditative", "name_jp": "瞑想的", "description": "Slow, deep, requires patience and attention"},
    {"id": "mood_unsettling", "name": "Unsettling", "name_jp": "不安な", "description": "Disturbs without being outright dark"},
    {"id": "mood_warm", "name": "Warm", "name_jp": "温かい", "description": "Human connection, kindness, goodness"},
    {"id": "mood_cold", "name": "Cold", "name_jp": "冷たい", "description": "Detached, clinical, emotionally distant"},
    {"id": "mood_whimsical", "name": "Whimsical", "name_jp": "気まぐれ", "description": "Playful, light, imaginative"},
    {"id": "mood_intense", "name": "Intense", "name_jp": "激しい", "description": "High emotional or narrative stakes throughout"},
    {"id": "mood_gentle", "name": "Gentle", "name_jp": "優しい", "description": "Soft in tone, kind in spirit"},
    {"id": "mood_urgent", "name": "Urgent", "name_jp": "切迫した", "description": "Propulsive, demanding to be finished quickly"},
]


# --------------------------------------------------------------------------
# settings — where a story takes place. 32 entries. The brief's controlled
# vocabulary table gives id/name/name_jp/type only — it doesn't supply
# one-sentence descriptions (the schema requires `description: str`), so
# these were written here to fill that gap, kept factual and neutral.
# --------------------------------------------------------------------------

SETTINGS_SEED = [
    {"id": "setting_tokyo", "name": "Tokyo", "name_jp": "東京", "type": SettingType.CITY.value, "description": "Japan's sprawling capital — a byword for speed, anonymity, and modern life"},
    {"id": "setting_kyoto", "name": "Kyoto", "name_jp": "京都", "type": SettingType.CITY.value, "description": "The former imperial capital, layered with temples, shrines, and traditional culture"},
    {"id": "setting_osaka", "name": "Osaka", "name_jp": "大阪", "type": SettingType.CITY.value, "description": "Japan's mercantile heart, known for its directness, food culture, and comic energy"},
    {"id": "setting_hokkaido", "name": "Hokkaido", "name_jp": "北海道", "type": SettingType.REGION.value, "description": "Japan's northernmost island — vast, rural, and shaped by snow and frontier history"},
    {"id": "setting_okinawa", "name": "Okinawa", "name_jp": "沖縄", "type": SettingType.REGION.value, "description": "The subtropical island chain with its own distinct language, cuisine, and history"},
    {"id": "setting_countryside", "name": "Countryside", "name_jp": "田舎", "type": SettingType.PLACE_TYPE.value, "description": "Rural Japan, away from the cities — a slower, older way of life"},
    {"id": "setting_mountains", "name": "Mountains", "name_jp": "山", "type": SettingType.PLACE_TYPE.value, "description": "Japan's mountainous interior, often a site of retreat, hardship, or spiritual encounter"},
    {"id": "setting_seaside", "name": "Seaside", "name_jp": "海辺", "type": SettingType.PLACE_TYPE.value, "description": "Coastal towns and shorelines, tied to fishing life and the rhythm of the tide"},
    {"id": "setting_forest", "name": "Forest", "name_jp": "森", "type": SettingType.PLACE_TYPE.value, "description": "Deep woodland, often carrying an air of mystery or the sacred"},
    {"id": "setting_school", "name": "School", "name_jp": "学校", "type": SettingType.PLACE_TYPE.value, "description": "The Japanese school as a stage for youth, ritual, and social pressure"},
    {"id": "setting_workplace", "name": "Workplace", "name_jp": "職場", "type": SettingType.PLACE_TYPE.value, "description": "The Japanese office or workplace, with its own hierarchies and unspoken rules"},
    {"id": "setting_home", "name": "Home", "name_jp": "家", "type": SettingType.PLACE_TYPE.value, "description": "The domestic space — family, routine, and what happens behind closed doors"},
    {"id": "setting_temple", "name": "Temple", "name_jp": "寺", "type": SettingType.PLACE_TYPE.value, "description": "A Buddhist temple, often a site of ritual, reflection, or refuge"},
    {"id": "setting_shrine", "name": "Shrine", "name_jp": "神社", "type": SettingType.PLACE_TYPE.value, "description": "A Shinto shrine, where the sacred meets the everyday"},
    {"id": "setting_onsen", "name": "Onsen", "name_jp": "温泉", "type": SettingType.PLACE_TYPE.value, "description": "A hot spring resort, associated with rest, vulnerability, and quiet conversation"},
    {"id": "setting_cafe", "name": "Café", "name_jp": "喫茶店", "type": SettingType.PLACE_TYPE.value, "description": "A small café or coffee shop, a familiar backdrop for conversation and solitude"},
    {"id": "setting_restaurant", "name": "Restaurant", "name_jp": "料理屋", "type": SettingType.PLACE_TYPE.value, "description": "A restaurant or eatery, where food and human connection intertwine"},
    {"id": "setting_hospital", "name": "Hospital", "name_jp": "病院", "type": SettingType.PLACE_TYPE.value, "description": "A hospital or clinic, the setting for illness, care, and mortality"},
    {"id": "setting_prison", "name": "Prison", "name_jp": "刑務所", "type": SettingType.PLACE_TYPE.value, "description": "A prison or place of confinement, testing endurance and morality"},
    {"id": "setting_village", "name": "Village", "name_jp": "村", "type": SettingType.PLACE_TYPE.value, "description": "A small rural community, bound by tradition and shared history"},
    {"id": "setting_island", "name": "Island", "name_jp": "島", "type": SettingType.PLACE_TYPE.value, "description": "A small or remote island, isolated from the mainland"},
    {"id": "setting_historical_jp", "name": "Historical Japan", "name_jp": "歴史的日本", "type": SettingType.ERA_CONTEXT.value, "description": "Japan in an unspecified or blended historical past"},
    {"id": "setting_feudal_jp", "name": "Feudal Japan", "name_jp": "封建時代", "type": SettingType.ERA_CONTEXT.value, "description": "Feudal-era Japan, the world of samurai, lords, and rigid social order"},
    {"id": "setting_postwar_jp", "name": "Post-war Japan", "name_jp": "戦後日本", "type": SettingType.ERA_CONTEXT.value, "description": "Japan in the years of reconstruction after 1945"},
    {"id": "setting_contemporary_jp", "name": "Contemporary Japan", "name_jp": "現代日本", "type": SettingType.ERA_CONTEXT.value, "description": "Present-day Japan, with its modern institutions and daily life"},
    {"id": "setting_foreign", "name": "Foreign Country", "name_jp": "海外", "type": SettingType.PLACE_TYPE.value, "description": "A setting outside Japan, viewed through a Japanese lens"},
    {"id": "setting_imaginary", "name": "Imaginary World", "name_jp": "想像の世界", "type": SettingType.PLACE_TYPE.value, "description": "A fictional or fantastical world with no real-world counterpart"},
    {"id": "setting_tokyo_suburbs", "name": "Tokyo Suburbs", "name_jp": "東京郊外", "type": SettingType.REGION.value, "description": "The residential areas surrounding central Tokyo"},
    {"id": "setting_kansai", "name": "Kansai Region", "name_jp": "関西", "type": SettingType.REGION.value, "description": "The Kansai region, home to Osaka, Kyoto, and Kobe"},
    {"id": "setting_tohoku", "name": "Tohoku", "name_jp": "東北", "type": SettingType.REGION.value, "description": "The Tohoku region of northeastern Japan, rural and historically marked by hardship"},
    {"id": "setting_hiroshima", "name": "Hiroshima", "name_jp": "広島", "type": SettingType.CITY.value, "description": "The city of Hiroshima, inseparable from the memory of the atomic bombing"},
    {"id": "setting_nagasaki", "name": "Nagasaki", "name_jp": "長崎", "type": SettingType.CITY.value, "description": "The city of Nagasaki, marked by both its port history and the atomic bombing"},
]


# --------------------------------------------------------------------------
# historical_periods — 11 entries, chronological. `years` is never
# hand-typed — it's computed from year_start/year_end via
# format_period_years() when the upsert document is built, so the display
# string can never drift from the numeric range used for range queries.
# --------------------------------------------------------------------------

PERIODS_SEED = [
    {"id": "period_heian", "name": "Heian", "name_jp": "平安", "year_start": 794, "year_end": 1185, "description": "The classical age of Japanese literature and court culture"},
    {"id": "period_kamakura", "name": "Kamakura", "name_jp": "鎌倉", "year_start": 1185, "year_end": 1333, "description": "Military rule and the rise of samurai literature"},
    {"id": "period_muromachi", "name": "Muromachi", "name_jp": "室町", "year_start": 1336, "year_end": 1573, "description": "The age of Noh theatre and Zen-influenced arts"},
    {"id": "period_edo", "name": "Edo", "name_jp": "江戸", "year_start": 1603, "year_end": 1868, "description": "Urban culture, haiku, and popular fiction flourished"},
    {"id": "period_meiji", "name": "Meiji", "name_jp": "明治", "year_start": 1868, "year_end": 1912, "description": "Rapid modernization and the birth of the modern Japanese novel"},
    {"id": "period_taisho", "name": "Taisho", "name_jp": "大正", "year_start": 1912, "year_end": 1926, "description": "Democracy, Western influence, and literary experimentation"},
    {"id": "period_showa_early", "name": "Early Showa", "name_jp": "昭和前期", "year_start": 1926, "year_end": 1945, "description": "War, nationalism, and profound literary darkness"},
    {"id": "period_showa_post", "name": "Post-war Showa", "name_jp": "昭和後期", "year_start": 1945, "year_end": 1989, "description": "Reconstruction, economic growth, and literary renaissance"},
    {"id": "period_heisei", "name": "Heisei", "name_jp": "平成", "year_start": 1989, "year_end": 2019, "description": "Globalization, digital age, and literary introspection"},
    {"id": "period_reiwa", "name": "Reiwa", "name_jp": "令和", "year_start": 2019, "year_end": 9999, "description": "The current era of contemporary Japanese literature"},
    {"id": "period_multi", "name": "Multiple Periods", "name_jp": "複数時代", "year_start": 0, "year_end": 9999, "description": "The work spans or references multiple historical periods"},
]


# --------------------------------------------------------------------------
# cultural_concepts — Zenzeii's most distinctive feature. 23 entries.
# Descriptions reproduced faithfully from the brief, including romaji
# derived from each concept's standard romanization.
# --------------------------------------------------------------------------

CONCEPTS_SEED = [
    {
        "id": "concept_mono_no_aware", "name": "Mono no Aware", "name_jp": "物の哀れ", "romaji": "mono no aware",
        "cultural_category": CulturalCategory.AESTHETIC_PHILOSOPHY.value,
        "description_short": "The bittersweet awareness that all beautiful things are impermanent",
        "description_long": "Mono no aware — literally \"the pathos of things\" — is one of the central aesthetic concepts in Japanese literature. Coined by scholar Motoori Norinaga in reference to The Tale of Genji, it describes the gentle sadness and beauty that arises from awareness of impermanence. A cherry blossom is most beautiful because it falls.",
    },
    {
        "id": "concept_wabi_sabi", "name": "Wabi-Sabi", "name_jp": "侘び寂び", "romaji": "wabi-sabi",
        "cultural_category": CulturalCategory.AESTHETIC_PHILOSOPHY.value,
        "description_short": "Finding beauty in imperfection, incompleteness, and impermanence",
        "description_long": "Wabi-sabi is a Japanese aesthetic philosophy that finds beauty in what is weathered, incomplete, or transient. Wabi originally meant the loneliness of living in nature; sabi meant the beauty of aging and wear. Together they describe an aesthetic that values the humble, the irregular, and the quietly decaying over the polished and perfect.",
    },
    {
        "id": "concept_ikigai", "name": "Ikigai", "name_jp": "生き甲斐", "romaji": "ikigai",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "The reason you get up in the morning — your purpose and joy in life",
        "description_long": "Ikigai describes the intersection of what you love, what you are good at, what the world needs, and what you can be paid for. In literature, characters searching for or living their ikigai create some of Japan's most compelling stories about work, purpose, and belonging.",
    },
    {
        "id": "concept_ma", "name": "Ma", "name_jp": "間", "romaji": "ma",
        "cultural_category": CulturalCategory.AESTHETIC_PHILOSOPHY.value,
        "description_short": "The meaningful pause — negative space in time, sound, and relationship",
        "description_long": "Ma is the Japanese concept of negative space — the pause between notes in music, the empty space in a painting, the silence in conversation. It is not emptiness but potential. In literature, what is left unsaid, the spaces between events, and the moments of stillness carry as much meaning as the words themselves.",
    },
    {
        "id": "concept_omotenashi", "name": "Omotenashi", "name_jp": "おもてなし", "romaji": "omotenashi",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "Wholehearted hospitality given without expectation of return",
        "description_long": "Omotenashi is the Japanese philosophy of selfless hospitality — anticipating needs before they are expressed, serving without visible effort, and giving without expecting acknowledgment. It appears in literature through the rituals of tea ceremony, the grace of inn culture, and the quiet devotion of service.",
    },
    {
        "id": "concept_gaman", "name": "Gaman", "name_jp": "我慢", "romaji": "gaman",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "Enduring the seemingly unbearable with patience and dignity",
        "description_long": "Gaman describes the Japanese cultural value of bearing hardship quietly and with dignity, without complaint. It is stoicism expressed through silence rather than words. In literature, characters who embody gaman often carry the weight of entire communities without acknowledging their own suffering.",
    },
    {
        "id": "concept_amae", "name": "Amae", "name_jp": "甘え", "romaji": "amae",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "The comfort of depending on another's benevolence and goodwill",
        "description_long": "Amae, theorized by psychiatrist Doi Takeo, describes the pleasant feeling of depending on another's indulgence — like a child with a parent, or a person with a trusted friend. It is not weakness but intimacy. Japanese literature is full of relationships shaped by amae, often invisible to Western readers unfamiliar with the concept.",
    },
    {
        "id": "concept_honne_tatemae", "name": "Honne and Tatemae", "name_jp": "本音と建前", "romaji": "honne to tatemae",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "The gap between true feelings (honne) and public face (tatemae)",
        "description_long": "Honne refers to a person's true feelings and desires; tatemae is the face presented to the world, shaped by social expectation. The tension between these two — what one feels and what one shows — drives much of Japanese literary drama, creating characters who communicate in layers of meaning and implication.",
    },
    {
        "id": "concept_bushido", "name": "Bushido", "name_jp": "武士道", "romaji": "bushido",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "The samurai code of loyalty, honor, and disciplined self-sacrifice",
        "description_long": "Bushido — the way of the warrior — is the ethical code of the samurai, emphasizing loyalty, honor, martial mastery, and the readiness to die with dignity. It shaped centuries of Japanese culture and continues to appear in literature as both an ideal and a critique.",
    },
    {
        "id": "concept_tea_ceremony", "name": "Tea Ceremony", "name_jp": "茶道", "romaji": "chado",
        "cultural_category": CulturalCategory.SPIRITUAL_PRACTICE.value,
        "description_short": "The meditative ritual of preparing and drinking tea as a spiritual practice",
        "description_long": "Chado — the way of tea — is a ritualized form of preparing and drinking matcha tea that embodies principles of harmony, respect, purity, and tranquility. It is simultaneously art, meditation, and social ritual. In literature, tea ceremony scenes carry layers of meaning about character, relationship, and spiritual state.",
    },
    {
        "id": "concept_zen", "name": "Zen", "name_jp": "禅", "romaji": "zen",
        "cultural_category": CulturalCategory.SPIRITUAL_PRACTICE.value,
        "description_short": "The Buddhist practice of direct experience over doctrine — present, spare, sudden",
        "description_long": "Zen Buddhism emphasizes direct experience of awakening over intellectual study. Its influence on Japanese literature is profound: in the spare language of haiku, the sudden reversals of narrative, the embrace of paradox, and the value placed on silence and the present moment over explanation and analysis.",
    },
    {
        "id": "concept_shinto", "name": "Shinto", "name_jp": "神道", "romaji": "shinto",
        "cultural_category": CulturalCategory.SPIRITUAL_PRACTICE.value,
        "description_short": "Japan's indigenous spirituality — the sacred found in nature and ancestor",
        "description_long": "Shinto is Japan's indigenous spiritual tradition, centered on kami — sacred spirits present in nature, ancestors, and significant places. In literature, the Shinto worldview creates a landscape that is alive and responsive, where forests, rivers, and mountains are not settings but presences.",
    },
    {
        "id": "concept_hanami", "name": "Hanami", "name_jp": "花見", "romaji": "hanami",
        "cultural_category": CulturalCategory.SEASONAL_TRADITION.value,
        "description_short": "Cherry blossom viewing — the Japanese ritual of celebrating spring's fragile beauty",
        "description_long": "Hanami is the traditional Japanese practice of gathering beneath cherry blossoms to eat, drink, and appreciate their brief beauty. As a literary motif, hanami carries the full weight of mono no aware — the blossoms are beautiful precisely because they fall within a week. It appears in literature as celebration, elegy, and meditation on impermanence.",
    },
    {
        "id": "concept_matsuri", "name": "Matsuri", "name_jp": "祭り", "romaji": "matsuri",
        "cultural_category": CulturalCategory.SEASONAL_TRADITION.value,
        "description_short": "Japanese festivals — communal celebration connecting community to the sacred",
        "description_long": "Matsuri are Japanese festivals, typically held at shrines and temples, combining music, dance, food, and ritual to honor kami and mark seasonal transitions. In literature, matsuri scenes represent community, tradition, the intersection of sacred and secular, and often the moment when suppressed feelings surface.",
    },
    {
        "id": "concept_obon", "name": "Obon", "name_jp": "お盆", "romaji": "obon",
        "cultural_category": CulturalCategory.SEASONAL_TRADITION.value,
        "description_short": "The summer festival honoring the spirits of ancestors who return to visit",
        "description_long": "Obon is a Buddhist festival in which the spirits of ancestors are believed to return to the world of the living for three days. Families gather, lanterns are lit, and Bon Odori dances are performed. In literature, Obon creates a liminal space between the living and the dead, the past and the present.",
    },
    {
        "id": "concept_onsen_culture", "name": "Onsen Culture", "name_jp": "温泉文化", "romaji": "onsen bunka",
        "cultural_category": CulturalCategory.CULTURAL_PRACTICE.value,
        "description_short": "The Japanese hot spring tradition — communal bathing as restoration and connection",
        "description_long": "Onsen culture centers on the ritual of bathing in natural hot springs, either alone or communally, as a form of physical and spiritual restoration. In literature, onsen scenes create space for vulnerability, reflection, and the dissolution of social barriers — characters are, literally, without armor.",
    },
    {
        "id": "concept_kintsugi", "name": "Kintsugi", "name_jp": "金継ぎ", "romaji": "kintsugi",
        "cultural_category": CulturalCategory.AESTHETIC_PHILOSOPHY.value,
        "description_short": "Repairing broken things with gold — beauty made from damage and repair",
        "description_long": "Kintsugi is the art of repairing broken pottery with gold, silver, or platinum lacquer, treating the breakage as part of the object's history rather than something to hide. As a literary concept, it speaks to characters who have been broken and repaired — whose damage is visible and beautiful, not concealed.",
    },
    {
        "id": "concept_satoyama", "name": "Satoyama", "name_jp": "里山", "romaji": "satoyama",
        "cultural_category": CulturalCategory.CULTURAL_PRACTICE.value,
        "description_short": "The traditional Japanese landscape where human life and nature meet",
        "description_long": "Satoyama describes the zone between mountain forest and flat farmland — managed, inhabited, deeply shaped by human activity but still wild. It represents the Japanese ideal of living with nature rather than conquering it, and appears in literature as both a real place and a metaphor for harmonious coexistence.",
    },
    {
        "id": "concept_natsukashii", "name": "Natsukashii", "name_jp": "懐かしい", "romaji": "natsukashii",
        "cultural_category": CulturalCategory.LITERARY_CONCEPT.value,
        "description_short": "A warm, melancholic longing for something fondly remembered from the past",
        "description_long": "Natsukashii is often translated as \"nostalgic,\" but it carries more warmth and specificity than the English word — it is the feeling upon encountering something from the past that you had forgotten but immediately recognize and love. It is nostalgia without sadness, remembrance with gratitude.",
    },
    {
        "id": "concept_kodawari", "name": "Kodawari", "name_jp": "拘り", "romaji": "kodawari",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "Uncompromising devotion to craft, quality, and one's personal standard",
        "description_long": "Kodawari describes an almost stubborn insistence on doing something in a particular way — a chef's precise technique, a craftsman's refusal to cut corners, an artist's singular vision. In literature, characters with strong kodawari are often compelling precisely because their devotion makes them difficult and magnificent in equal measure.",
    },
    {
        "id": "concept_mottainai", "name": "Mottainai", "name_jp": "もったいない", "romaji": "mottainai",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "The regret of waste — honoring the inherent value of all things",
        "description_long": "Mottainai expresses sorrow at waste or the misuse of something valuable. It encompasses the sense that objects have inherent worth and should be used fully, repaired, and treasured. In literature, mottainai manifests as care for objects, the ethics of consumption, and the moral weight of what is discarded.",
    },
    {
        "id": "concept_shoganai", "name": "Shoganai", "name_jp": "しょうがない", "romaji": "shoganai",
        "cultural_category": CulturalCategory.SOCIAL_VALUE.value,
        "description_short": "Acceptance of what cannot be changed — graceful resignation to the inevitable",
        "description_long": "Shoganai — it cannot be helped — is the Japanese acceptance of circumstances beyond one's control. Not defeat, but a mature recognition of limits. In literature, characters who invoke shoganai are often carrying losses or constraints they have chosen not to fight, finding dignity in acceptance rather than resistance.",
    },
    {
        "id": "concept_aware", "name": "Aware", "name_jp": "哀れ", "romaji": "aware",
        "cultural_category": CulturalCategory.LITERARY_CONCEPT.value,
        "description_short": "The feeling of pathos — sensitivity to beauty, sadness, and the human condition",
        "description_long": "Aware — the root of mono no aware — is the raw feeling of pathos, the emotional sensitivity to beauty and sadness. A character who is aware feels everything, carries the weight of the world's beauty and fragility. It is both a gift and a burden, and it drives some of Japanese literature's most memorable protagonists.",
    },
]


# --------------------------------------------------------------------------
# awards — literary prizes. Dual role: Layer 2 filter + Layer 1 badge via
# badge_display. `country` is "Japan" for every domestic prize; the
# International Booker Prize is marked "International" since it is not a
# Japan-specific award (it recognizes fiction translated into English).
# --------------------------------------------------------------------------

AWARDS_SEED = [
    {"id": "award_akutagawa", "name": "Akutagawa Prize", "name_jp": "芥川賞", "founded_year": 1935, "country": "Japan", "prestige_level": 1, "badge_display": True, "description": "Japan's most prestigious award for emerging literary fiction authors"},
    {"id": "award_naoki", "name": "Naoki Prize", "name_jp": "直木賞", "founded_year": 1935, "country": "Japan", "prestige_level": 1, "badge_display": True, "description": "Japan's premier award for popular fiction and storytelling"},
    {"id": "award_tanizaki", "name": "Tanizaki Prize", "name_jp": "谷崎潤一郎賞", "founded_year": 1965, "country": "Japan", "prestige_level": 1, "badge_display": True, "description": "Awarded for outstanding full-length fiction by established authors"},
    {"id": "award_noma", "name": "Noma Literary Prize", "name_jp": "野間文芸賞", "founded_year": 1941, "country": "Japan", "prestige_level": 2, "badge_display": True, "description": "One of Japan's oldest and most respected literary prizes"},
    {"id": "award_yomiuri", "name": "Yomiuri Prize", "name_jp": "読売文学賞", "founded_year": 1949, "country": "Japan", "prestige_level": 2, "badge_display": False, "description": "Annual prize across multiple literary categories from the Yomiuri Shimbun"},
    {"id": "award_mishima", "name": "Mishima Prize", "name_jp": "三島由紀夫賞", "founded_year": 1988, "country": "Japan", "prestige_level": 2, "badge_display": False, "description": "Awarded to experimental and innovative fiction"},
    {"id": "award_dazai", "name": "Dazai Osamu Prize", "name_jp": "太宰治賞", "founded_year": 1964, "country": "Japan", "prestige_level": 3, "badge_display": False, "description": "Regional prize for emerging fiction writers"},
    {"id": "award_bungei", "name": "Bungei Prize", "name_jp": "文藝賞", "founded_year": 1962, "country": "Japan", "prestige_level": 3, "badge_display": False, "description": "Awarded by Kawade Shobo Shinsha for debut and emerging fiction"},
    {"id": "award_shibata", "name": "Shibata Renzaburo Prize", "name_jp": "柴田錬三郎賞", "founded_year": 1987, "country": "Japan", "prestige_level": 3, "badge_display": False, "description": "Awarded for popular entertainment fiction"},
    {"id": "award_booker_int", "name": "International Booker Prize", "name_jp": "国際ブッカー賞", "founded_year": 1969, "country": "International", "prestige_level": 1, "badge_display": True, "description": "For works of fiction translated into English — for Japanese books in translation"},
]


# --------------------------------------------------------------------------
# adaptation_types — simple lookup collection. 6 entries.
# --------------------------------------------------------------------------

ADAPTATION_TYPES_SEED = [
    {"id": "adaptation_anime", "name": "Anime", "name_jp": "アニメ"},
    {"id": "adaptation_film", "name": "Film", "name_jp": "映画"},
    {"id": "adaptation_drama", "name": "TV Drama", "name_jp": "テレビドラマ"},
    {"id": "adaptation_stage", "name": "Stage Play", "name_jp": "舞台劇"},
    {"id": "adaptation_manga", "name": "Manga", "name_jp": "漫画"},
    {"id": "adaptation_game", "name": "Video Game", "name_jp": "ゲーム"},
]


# --------------------------------------------------------------------------
# Sample Layer 2 tags for 3 of the 10 Layer 1 test books, so filter testing
# has real data. Three genuinely distinct mood/theme/setting combinations —
# exceeds the brief's "at minimum 2" requirement. Deliberately limited to
# theme/mood/setting/period/cultural_concept — award_ids and (with one
# exception) adaptation_types are left untouched rather than attributing
# literary prizes or adaptations to real, identifiable authors/works without
# being certain those attributions are factually correct. Rashomon's film
# adaptation (Kurosawa, 1950) is well-documented public knowledge and is
# included; the others are not.
# --------------------------------------------------------------------------

BOOK_LAYER2_TAGS: Dict[str, Dict[str, Any]] = {
    "aozora-kokoro": {
        "theme_ids": ["theme_isolation", "theme_identity", "theme_death"],
        "mood_ids": ["mood_melancholic", "mood_reflective"],
        "setting_ids": ["setting_tokyo", "setting_historical_jp"],
        "period_ids": ["period_meiji"],
        "cultural_concept_ids": ["concept_mono_no_aware"],
    },
    "aozora-rashomon": {
        "theme_ids": ["theme_survival", "theme_justice", "theme_betrayal"],
        "mood_ids": ["mood_dark", "mood_tense", "mood_unsettling"],
        "setting_ids": ["setting_historical_jp", "setting_kyoto"],
        "period_ids": ["period_heian"],
        "cultural_concept_ids": ["concept_aware"],
        "adaptation_types": ["adaptation_film"],
    },
    "catalog-1q84": {
        "theme_ids": ["theme_identity", "theme_love", "theme_dreams"],
        "mood_ids": ["mood_mysterious", "mood_dreamlike", "mood_suspenseful"],
        "setting_ids": ["setting_tokyo", "setting_contemporary_jp"],
        "period_ids": ["period_heisei"],
        "cultural_concept_ids": ["concept_ma"],
    },
}


# --------------------------------------------------------------------------
# Upsert logic
# --------------------------------------------------------------------------

async def seed_taxonomy_collection(
    db: AsyncIOMotorDatabase,
    collection_name: str,
    entries: List[Dict[str, Any]],
) -> Tuple[int, int]:
    """
    Upserts a list of taxonomy documents into db[collection_name], keyed by
    `id`. sort_order is assigned by list position (1-indexed) rather than
    hardcoded per entry, so reordering the seed list is the only thing
    needed to change display order. Generic across all 7 Layer 2
    collections — each already carries its own collection-specific fields
    (type, cultural_category, badge_display, ...); this function adds
    nothing beyond sort_order and created_at.

    Returns (inserted, updated).
    """
    inserted = updated = 0
    for sort_order, entry in enumerate(entries, start=1):
        fields = {k: v for k, v in entry.items() if k != "id"}
        fields["sort_order"] = sort_order

        result = await db[collection_name].update_one(
            {"id": entry["id"]},
            {
                "$set": fields,
                "$setOnInsert": {"id": entry["id"], "created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


def build_period_documents() -> List[Dict[str, Any]]:
    """
    Adds the computed `years` display string to each PERIODS_SEED entry.

    Kept separate from PERIODS_SEED itself so `years` is always derived
    from format_period_years(), never hand-typed and liable to drift from
    year_start/year_end.
    """
    documents = []
    for period in PERIODS_SEED:
        doc = dict(period)
        doc["years"] = format_period_years(period["year_start"], period["year_end"])
        documents.append(doc)
    return documents


async def tag_books_with_layer2_data(db: AsyncIOMotorDatabase) -> int:
    """
    Sets Layer 2 array fields on the 3 books listed in BOOK_LAYER2_TAGS.

    Does not upsert and does not touch any Layer 1 field — these books
    must already exist from scripts/seed_catalog.py. Only the specific
    Layer 2 keys present in each entry's dict are $set; every other field
    on the document (title, difficulty, rating, etc.) is left untouched.
    Logs a warning (not an error) for any book_id not found, since running
    this script before seed_catalog.py is a likely operator mistake rather
    than a data-integrity problem this script itself needs to fix.
    """
    tagged = 0
    for book_id, layer2_fields in BOOK_LAYER2_TAGS.items():
        result = await db.book_catalog.update_one({"id": book_id}, {"$set": layer2_fields})
        if result.matched_count == 0:
            logger.warning(f"book_catalog id='{book_id}' not found — skipped Layer 2 tagging")
        else:
            tagged += 1
    return tagged


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------

async def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "zenzeii")

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"Connecting to MongoDB database: {db_name}")

    await ensure_layer2_indexes(db)

    collections_seed = [
        ("themes", THEMES_SEED),
        ("moods", MOODS_SEED),
        ("settings", SETTINGS_SEED),
        ("historical_periods", build_period_documents()),
        ("cultural_concepts", CONCEPTS_SEED),
        ("awards", AWARDS_SEED),
        ("adaptation_types", ADAPTATION_TYPES_SEED),
    ]

    logger.info("Seed complete. Per-collection results:")
    for collection_name, entries in collections_seed:
        inserted, updated = await seed_taxonomy_collection(db, collection_name, entries)
        logger.info(f"  {collection_name:<20} inserted: {inserted:>3}  updated: {updated:>3}")

    tagged = await tag_books_with_layer2_data(db)
    logger.info(f"  {'book_catalog (tags)':<20} tagged:   {tagged:>3} / {len(BOOK_LAYER2_TAGS)}")

    client.close()


if __name__ == "__main__":
    load_dotenv(BACKEND_DIR / ".env")
    asyncio.run(main())
