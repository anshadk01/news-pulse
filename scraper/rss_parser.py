"""
Resilient RSS Ingestion & Feed Normalizer for News Pulse.
Handles format variations, date parsing edge-cases, and deterministic deduplication.
"""
import hashlib
import re
import datetime
from email.utils import parsedate_to_datetime
import dateutil.parser
import feedparser
from bs4 import BeautifulSoup
from config import RSS_FEEDS, MAX_ARTICLES_PER_FEED, USER_AGENT

def generate_article_id(url, title):
    """Generate deterministic SHA-256 hash ID from canonical URL and title."""
    clean_url = url.split("?")[0].strip().lower()
    clean_title = re.sub(r"\s+", " ", title).strip().lower()
    raw = f"{clean_url}|{clean_title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

def clean_html_text(raw_html):
    """Strip HTML tags and clean whitespace for clean summary text."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    # Remove script and style elements
    for s in soup(["script", "style"]):
        s.extract()
    text = soup.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()

def parse_publication_date(entry):
    """
    Robustly parse publication dates across varying RSS formats:
    pubDate, published, updated, dc:date, or published_parsed.
    Always returns UTC ISO-8601 string.
    """
    raw_date = None
    for field in ["published", "pubDate", "updated", "created", "dc_date"]:
        if field in entry and entry[field]:
            raw_date = entry[field]
            break

    if raw_date:
        try:
            # Try dateutil parser first
            dt = dateutil.parser.parse(str(raw_date))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt.astimezone(datetime.timezone.utc).isoformat()
        except Exception:
            pass

        try:
            # Try RFC 822 email parser
            dt = parsedate_to_datetime(str(raw_date))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt.astimezone(datetime.timezone.utc).isoformat()
        except Exception:
            pass

    # Fallback to feedparser's published_parsed tuple
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            dt = datetime.datetime(*entry.published_parsed[:6], tzinfo=datetime.timezone.utc)
            return dt.isoformat()
        except Exception:
            pass

    # Default fallback to current time
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def extract_image_url(entry):
    """Extract lead/hero image URL from enclosure, media:thumbnail, or media:content."""
    # 1. Check enclosures
    if hasattr(entry, "enclosures") and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get("type", "").startswith("image/") and enc.get("href"):
                return enc["href"]

    # 2. Check media_content
    if hasattr(entry, "media_content") and entry.media_content:
        for m in entry.media_content:
            if m.get("url"):
                return m["url"]

    # 3. Check media_thumbnail
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        for thumb in entry.media_thumbnail:
            if thumb.get("url"):
                return thumb["url"]

    # 4. Check inline HTML <img> in summary/content
    summary_html = ""
    if hasattr(entry, "summary"):
        summary_html = entry.summary
    elif hasattr(entry, "description"):
        summary_html = entry.description

    if summary_html:
        soup = BeautifulSoup(summary_html, "html.parser")
        img = soup.find("img")
        if img and img.get("src"):
            return img["src"]

    return None

def fetch_and_normalize_feed(feed_meta):
    """
    Fetch and normalize a single RSS feed into a uniform internal schema.
    """
    feed_id = feed_meta["id"]
    feed_name = feed_meta["name"]
    feed_url = feed_meta["url"]

    print(f"[INGEST] Fetching feed: {feed_name} ({feed_url})...")
    
    parsed = feedparser.parse(
        feed_url,
        agent=USER_AGENT,
        request_headers={"User-Agent": USER_AGENT}
    )

    if parsed.bozo and not parsed.entries:
        print(f"[WARN] Failed or malformed feed from {feed_name}: {parsed.get('bozo_exception', 'Unknown error')}")
        return []

    articles = []
    for entry in parsed.entries[:MAX_ARTICLES_PER_FEED]:
        title = clean_html_text(entry.get("title", ""))
        url = entry.get("link", "").strip()
        if not title or not url:
            continue

        # Extract summary with fallback chain
        raw_summary = ""
        if hasattr(entry, "summary"):
            raw_summary = entry.summary
        elif hasattr(entry, "description"):
            raw_summary = entry.description
        elif hasattr(entry, "content") and entry.content:
            raw_summary = entry.content[0].get("value", "")

        summary = clean_html_text(raw_summary)
        published_at = parse_publication_date(entry)
        image_url = extract_image_url(entry)
        author = entry.get("author") or entry.get("dc_creator") or feed_name

        article_id = generate_article_id(url, title)

        articles.append({
            "id": article_id,
            "source_id": feed_id,
            "source_name": feed_name,
            "title": title,
            "summary": summary,
            "url": url,
            "published_at": published_at,
            "author": author,
            "image_url": image_url
        })

    print(f"[INGEST] Parsed {len(articles)} articles from {feed_name}")
    return articles

def fetch_all_feeds(feeds=None):
    """Ingest and normalize all configured RSS feeds."""
    target_feeds = feeds or RSS_FEEDS
    all_articles = []
    for feed_meta in target_feeds:
        try:
            articles = fetch_and_normalize_feed(feed_meta)
            all_articles.extend(articles)
        except Exception as e:
            print(f"[ERROR] Ingestion failed for {feed_meta.get('name')}: {e}")
    return all_articles
