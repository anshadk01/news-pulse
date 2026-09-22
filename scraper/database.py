"""
Unified Database access layer supporting both SQLite and PostgreSQL.
"""
import os
import json
import sqlite3
import datetime
from pathlib import Path
from config import DATABASE_URL, DEFAULT_SQLITE_PATH

class Database:
    def __init__(self, db_url=None):
        self.db_url = db_url or DATABASE_URL
        self.is_postgres = self.db_url.startswith("postgres://") or self.db_url.startswith("postgresql://")
        self._init_db()

    def get_connection(self):
        if self.is_postgres:
            try:
                import psycopg2
                import psycopg2.extras
                conn = psycopg2.connect(self.db_url)
                return conn
            except ImportError:
                print("[WARN] psycopg2 not found, falling back to SQLite.")
                self.is_postgres = False

        # SQLite connection
        sqlite_file = DEFAULT_SQLITE_PATH
        if self.db_url.startswith("sqlite:///"):
            sqlite_file = self.db_url.replace("sqlite:///", "")
        
        Path(sqlite_file).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(sqlite_file)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    def _init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        if self.is_postgres:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS topic_clusters (
                id VARCHAR(128) PRIMARY KEY,
                label VARCHAR(512) NOT NULL,
                keywords TEXT,
                representative_headline TEXT,
                article_count INTEGER DEFAULT 0,
                start_time TIMESTAMPTZ,
                end_time TIMESTAMPTZ,
                duration_hours REAL DEFAULT 0,
                intensity_score REAL DEFAULT 1.0,
                source_breakdown TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id VARCHAR(64) PRIMARY KEY,
                cluster_id VARCHAR(128) REFERENCES topic_clusters(id) ON DELETE SET NULL,
                source_id VARCHAR(64) NOT NULL,
                source_name VARCHAR(128) NOT NULL,
                title TEXT NOT NULL,
                summary TEXT,
                body_text TEXT,
                url TEXT UNIQUE NOT NULL,
                published_at TIMESTAMPTZ NOT NULL,
                author VARCHAR(256),
                image_url TEXT,
                extracted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_pubdate ON articles(published_at DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_clusters_time ON topic_clusters(start_time DESC);")
        else:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS topic_clusters (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                keywords TEXT,
                representative_headline TEXT,
                article_count INTEGER DEFAULT 0,
                start_time TEXT,
                end_time TEXT,
                duration_hours REAL DEFAULT 0,
                intensity_score REAL DEFAULT 1.0,
                source_breakdown TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                cluster_id TEXT REFERENCES topic_clusters(id) ON DELETE SET NULL,
                source_id TEXT NOT NULL,
                source_name TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT,
                body_text TEXT,
                url TEXT UNIQUE NOT NULL,
                published_at TEXT NOT NULL,
                author TEXT,
                image_url TEXT,
                extracted_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_pubdate ON articles(published_at DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_clusters_time ON topic_clusters(start_time DESC);")

        conn.commit()
        conn.close()

    def get_existing_urls(self):
        """Fetch set of all stored article URLs for fast deduplication check."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT url FROM articles")
        urls = {row[0] for row in cursor.fetchall()}
        conn.close()
        return urls

    def save_articles(self, articles):
        """Batch save new raw articles."""
        if not articles:
            return 0
        conn = self.get_connection()
        cursor = conn.cursor()
        inserted = 0

        for art in articles:
            try:
                if self.is_postgres:
                    cursor.execute("""
                        INSERT INTO articles (id, cluster_id, source_id, source_name, title, summary, body_text, url, published_at, author, image_url, extracted_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (url) DO NOTHING;
                    """, (
                        art["id"], art.get("cluster_id"), art["source_id"], art["source_name"],
                        art["title"], art["summary"], art.get("body_text", ""), art["url"],
                        art["published_at"], art.get("author"), art.get("image_url"),
                        datetime.datetime.utcnow().isoformat()
                    ))
                else:
                    cursor.execute("""
                        INSERT OR IGNORE INTO articles (id, cluster_id, source_id, source_name, title, summary, body_text, url, published_at, author, image_url, extracted_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        art["id"], art.get("cluster_id"), art["source_id"], art["source_name"],
                        art["title"], art["summary"], art.get("body_text", ""), art["url"],
                        art["published_at"], art.get("author"), art.get("image_url"),
                        datetime.datetime.utcnow().isoformat()
                    ))
                inserted += 1
            except Exception as e:
                print(f"[ERROR] Failed to insert article {art['url']}: {e}")

        conn.commit()
        conn.close()
        return inserted

    def get_all_articles_for_clustering(self):
        """Fetch all articles for TF-IDF topic clustering."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, source_id, source_name, title, summary, body_text, url, published_at, author, image_url FROM articles ORDER BY published_at DESC")
        rows = cursor.fetchall()
        articles = []
        for r in rows:
            articles.append({
                "id": r["id"] if isinstance(r, dict) or hasattr(r, 'keys') else r[0],
                "source_id": r["source_id"] if isinstance(r, dict) or hasattr(r, 'keys') else r[1],
                "source_name": r["source_name"] if isinstance(r, dict) or hasattr(r, 'keys') else r[2],
                "title": r["title"] if isinstance(r, dict) or hasattr(r, 'keys') else r[3],
                "summary": r["summary"] if isinstance(r, dict) or hasattr(r, 'keys') else r[4],
                "body_text": r["body_text"] if isinstance(r, dict) or hasattr(r, 'keys') else r[5],
                "url": r["url"] if isinstance(r, dict) or hasattr(r, 'keys') else r[6],
                "published_at": r["published_at"] if isinstance(r, dict) or hasattr(r, 'keys') else r[7],
                "author": r["author"] if isinstance(r, dict) or hasattr(r, 'keys') else r[8],
                "image_url": r["image_url"] if isinstance(r, dict) or hasattr(r, 'keys') else r[9]
            })
        conn.close()
        return articles

    def update_clusters_and_assignments(self, clusters, article_cluster_map):
        """Atomic update of topic clusters and article cluster assignments."""
        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.datetime.utcnow().isoformat()

        # Clear existing clusters and re-link
        cursor.execute("DELETE FROM topic_clusters")

        for c in clusters:
            if self.is_postgres:
                cursor.execute("""
                    INSERT INTO topic_clusters (id, label, keywords, representative_headline, article_count, start_time, end_time, duration_hours, intensity_score, source_breakdown, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    c["id"], c["label"], json.dumps(c["keywords"]), c["representative_headline"],
                    c["article_count"], c["start_time"], c["end_time"], c["duration_hours"],
                    c["intensity_score"], json.dumps(c["source_breakdown"]), now, now
                ))
            else:
                cursor.execute("""
                    INSERT INTO topic_clusters (id, label, keywords, representative_headline, article_count, start_time, end_time, duration_hours, intensity_score, source_breakdown, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c["id"], c["label"], json.dumps(c["keywords"]), c["representative_headline"],
                    c["article_count"], c["start_time"], c["end_time"], c["duration_hours"],
                    c["intensity_score"], json.dumps(c["source_breakdown"]), now, now
                ))

        # Update article cluster IDs
        for art_id, cluster_id in article_cluster_map.items():
            if self.is_postgres:
                cursor.execute("UPDATE articles SET cluster_id = %s WHERE id = %s", (cluster_id, art_id))
            else:
                cursor.execute("UPDATE articles SET cluster_id = ? WHERE id = ?", (cluster_id, art_id))

        conn.commit()
        conn.close()
