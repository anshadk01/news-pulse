"""
Configuration settings and RSS feed definitions for News Pulse.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "newspulse.db"

# Load environment variables from .env files if present
load_dotenv(BASE_DIR / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

# Database Configuration (PostgreSQL supported via DATABASE_URL, with SQLite fallback)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# Curated reputable news RSS feeds with source metadata
RSS_FEEDS = [
    {
        "id": "bbc",
        "name": "BBC News",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "category": "World",
        "color": "#bb1919"
    },
    {
        "id": "npr",
        "name": "NPR News",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "category": "General",
        "color": "#1b629b"
    },
    {
        "id": "guardian",
        "name": "The Guardian",
        "url": "https://www.theguardian.com/world/rss",
        "category": "World",
        "color": "#005689"
    },
    {
        "id": "aljazeera",
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "category": "World",
        "color": "#e05a1e"
    }
]

# Scraping & Extraction Parameters
USER_AGENT = "NewsPulseBot/1.0 (+https://github.com/news-pulse; contact@newspulse.dev)"
REQUEST_TIMEOUT_SECONDS = 6
MAX_ARTICLES_PER_FEED = 25  # Ingest recent 25 per feed per run

# Clustering Hyperparameters (Tuned for news headlines & content)
TFIDF_MAX_FEATURES = 5000
TFIDF_MIN_DF = 1
TFIDF_NGRAM_RANGE = (1, 2)
COSINE_SIMILARITY_THRESHOLD = 0.20  # Calibrated for high precision topic overlap
MIN_CLUSTER_SIZE_FOR_NAMING = 1
