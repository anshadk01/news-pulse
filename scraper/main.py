"""
Main entry point for News Pulse scraper and topic clustering pipeline.
"""
import sys
import json
import time
from database import Database
from rss_parser import fetch_all_feeds
from extractor import enrich_articles_with_body
from clusterer import cluster_articles

def run_pipeline(extract_full_text=True):
    start_time = time.time()
    result = {
        "status": "success",
        "fetched_count": 0,
        "new_articles_count": 0,
        "total_articles": 0,
        "clusters_count": 0,
        "duration_seconds": 0.0,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    try:
        db = Database()
        print("[PIPELINE] Initialized database.")

        # 1. Fetch current articles from all RSS sources
        raw_articles = fetch_all_feeds()
        result["fetched_count"] = len(raw_articles)
        print(f"[PIPELINE] Fetched {len(raw_articles)} raw feed entries.")

        # 2. Check for deduplication against existing database
        existing_urls = db.get_existing_urls()
        new_articles = [a for a in raw_articles if a["url"] not in existing_urls]
        result["new_articles_count"] = len(new_articles)
        print(f"[PIPELINE] Found {len(new_articles)} new unique articles (deduplicated against {len(existing_urls)} existing).")

        # 3. Enrich new articles with full body extraction
        if new_articles and extract_full_text:
            new_articles = enrich_articles_with_body(new_articles, max_extract=25)

        # 4. Save new articles
        if new_articles:
            db.save_articles(new_articles)
            print(f"[PIPELINE] Saved {len(new_articles)} new articles into database.")

        # 5. Load all articles for topic clustering
        all_articles = db.get_all_articles_for_clustering()
        result["total_articles"] = len(all_articles)

        if all_articles:
            print(f"[PIPELINE] Running TF-IDF and Cosine Similarity topic clustering on {len(all_articles)} articles...")
            clusters, article_cluster_map = cluster_articles(all_articles)
            db.update_clusters_and_assignments(clusters, article_cluster_map)
            result["clusters_count"] = len(clusters)
            print(f"[PIPELINE] Successfully created {len(clusters)} topic clusters.")
        else:
            print("[PIPELINE] No articles available to cluster.")

        duration = round(time.time() - start_time, 2)
        result["duration_seconds"] = duration
        print(f"[PIPELINE] Pipeline finished in {duration}s. Status: SUCCESS")

    except Exception as e:
        import traceback
        result["status"] = "error"
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        print(f"[ERROR] Pipeline execution failed: {e}", file=sys.stderr)

    # Output JSON line for backend subprocess reader
    print(f"JSON_RESULT:{json.dumps(result)}")
    return result

if __name__ == "__main__":
    run_pipeline()
