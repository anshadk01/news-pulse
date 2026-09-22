"""
Resilient Full Article Body Extractor.
Extracts main article text via trafilatura with BeautifulSoup fallback.
"""
import requests
import trafilatura
from bs4 import BeautifulSoup
from config import USER_AGENT, REQUEST_TIMEOUT_SECONDS

def extract_article_body(url):
    """
    Fetch and extract clean article body text from a webpage URL.
    Returns extracted text string, or empty string if failed.
    """
    if not url:
        return ""

    # Strategy 1: Trafilatura (highest quality article text & boilerplate removal)
    try:
        downloaded = trafilatura.fetch_url(url, timeout=REQUEST_TIMEOUT_SECONDS)
        if downloaded:
            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=False,
                no_fallback=False
            )
            if extracted and len(extracted.strip()) > 50:
                return extracted.strip()
    except Exception as e:
        # Silently fall back to next strategy
        pass

    # Strategy 2: Direct HTTP request + BeautifulSoup fallback
    try:
        headers = {"User-Agent": USER_AGENT}
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        if resp.status_code == 200 and resp.text:
            # Trafilatura parse on HTML
            extracted = trafilatura.extract(resp.text)
            if extracted and len(extracted.strip()) > 50:
                return extracted.strip()

            # Plain paragraph aggregator
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.extract()

            paragraphs = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 40]
            if paragraphs:
                return "\n\n".join(paragraphs[:15])
    except Exception:
        pass

    return ""

def enrich_articles_with_body(articles, max_extract=30):
    """
    Enrich raw articles with their full body text.
    Extracts up to max_extract to balance speed and completeness.
    """
    enriched = []
    print(f"[EXTRACTOR] Extracting full body text for {min(len(articles), max_extract)} articles...")
    
    for idx, art in enumerate(articles):
        # We extract body for the newest articles; for remaining we use title + summary
        if idx < max_extract:
            try:
                body = extract_article_body(art["url"])
                art["body_text"] = body if body else art.get("summary", "")
            except Exception as e:
                art["body_text"] = art.get("summary", "")
        else:
            art["body_text"] = art.get("summary", "")
        enriched.append(art)

    return enriched
