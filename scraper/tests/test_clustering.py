import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from rss_parser import generate_article_id, clean_html_text, parse_publication_date
from clusterer import cluster_articles, preprocess_text

def test_article_id_generation():
    url1 = "https://www.bbc.com/news/world-12345?ref=rss"
    url2 = "https://www.bbc.com/news/world-12345"
    title = "Historic Space Mission Launches Successfully"

    # Query params stripped, deterministic hash
    id1 = generate_article_id(url1, title)
    id2 = generate_article_id(url2, title)
    assert id1 == id2
    assert len(id1) == 16

def test_clean_html_text():
    raw_html = "<p>Scientists discover <strong>new exoplanet</strong> in nearby galaxy. <a href='#'>Read more</a></p>"
    cleaned = clean_html_text(raw_html)
    assert cleaned == "Scientists discover new exoplanet in nearby galaxy. Read more"

def test_parse_publication_date():
    entry_rfc = {"pubDate": "Sun, 20 Sep 2026 14:30:00 GMT"}
    iso_rfc = parse_publication_date(entry_rfc)
    assert "2026-09-20" in iso_rfc

    entry_iso = {"published": "2026-09-21T09:15:00+00:00"}
    iso_dt = parse_publication_date(entry_iso)
    assert "2026-09-21" in iso_dt

def test_tfidf_topic_clustering():
    articles = [
        {
            "id": "art-1",
            "source_id": "bbc",
            "source_name": "BBC News",
            "title": "Federal Reserve cuts interest rates by 25 basis points amidst inflation cooldown",
            "summary": "The US Federal Reserve decided to lower interest rates as inflation trends downward.",
            "body_text": "Federal Reserve policymakers voted unanimously to cut borrowing costs.",
            "url": "https://bbc.com/fed-cuts-rates",
            "published_at": "2026-09-20T10:00:00Z"
        },
        {
            "id": "art-2",
            "source_id": "guardian",
            "source_name": "The Guardian",
            "title": "US Central Bank cuts interest rates after inflation cools",
            "summary": "Economic markets respond positively as the Federal Reserve slashes rates.",
            "body_text": "Interest rates reduction marks a turning point for global monetary policy.",
            "url": "https://guardian.com/us-rate-cuts",
            "published_at": "2026-09-20T12:00:00Z"
        },
        {
            "id": "art-3",
            "source_id": "npr",
            "source_name": "NPR News",
            "title": "NASA James Webb telescope discovers atmospheric water on distant super-Earth",
            "summary": "Astronomers using the James Webb Space Telescope detect distinct water vapor signatures.",
            "body_text": "The discovery opens new possibilities for exoplanet research.",
            "url": "https://npr.org/jwst-water-exoplanet",
            "published_at": "2026-09-20T14:00:00Z"
        }
    ]

    clusters, article_map = cluster_articles(articles)
    
    # Expect 2 clusters: economy/rates (art-1, art-2) and astronomy (art-3)
    assert len(clusters) == 2
    
    # Check that art-1 and art-2 are in the same cluster
    assert article_map["art-1"] == article_map["art-2"]
    assert article_map["art-1"] != article_map["art-3"]

    fed_cluster = next(c for c in clusters if c["id"] == article_map["art-1"])
    assert fed_cluster["article_count"] == 2
    assert "bbc" in fed_cluster["source_breakdown"]
    assert "guardian" in fed_cluster["source_breakdown"]
    assert fed_cluster["duration_hours"] > 0
