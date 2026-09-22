"""
NLP Topic Clustering using TF-IDF and Cosine Similarity Thresholding.
Groups articles into coherent topic clusters and generates human-readable cluster labels.
"""
import re
import math
import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from config import (
    TFIDF_MAX_FEATURES,
    TFIDF_MIN_DF,
    TFIDF_NGRAM_RANGE,
    COSINE_SIMILARITY_THRESHOLD
)

# Custom news stop words to filter out noise
EXTRA_STOP_WORDS = {
    "said", "says", "mr", "ms", "news", "report", "reported", "according", "world",
    "today", "yesterday", "day", "week", "month", "year", "time", "people", "one",
    "two", "new", "first", "last", "also", "including", "per", "cent", "told",
    "video", "audio", "watch", "listen", "live", "update", "updates", "breaking"
}

def parse_to_dt(val):
    """Safely convert ISO string or datetime object to UTC datetime."""
    if isinstance(val, datetime.datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=datetime.timezone.utc)
        return val.astimezone(datetime.timezone.utc)
    try:
        return datetime.datetime.fromisoformat(str(val).replace("Z", "+00:00")).astimezone(datetime.timezone.utc)
    except Exception:
        import dateutil.parser
        dt = dateutil.parser.parse(str(val))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(datetime.timezone.utc)

def parse_to_iso(val):
    """Safely convert datetime object or string to UTC ISO-8601 string."""
    dt = parse_to_dt(val)
    return dt.isoformat()

def preprocess_text(text):
    """Clean and normalize raw text for TF-IDF vectorization."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"[^a-zA-Z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def compute_cluster_label_and_keywords(cluster_articles, vectorizer, feature_names):
    """
    Extract top 3-4 distinctive keyphrases for the cluster and select
    the most central representative headline.
    """
    if not cluster_articles:
        return "Uncategorized News", [], ""

    # Aggregate text for cluster
    cluster_docs = [
        preprocess_text(f"{a['title']} {a['title']} {a.get('summary', '')}")
        for a in cluster_articles
    ]

    try:
        cluster_vec = vectorizer.transform(cluster_docs)
        mean_tfidf = np.asarray(cluster_vec.mean(axis=0)).flatten()
        
        # Get top term indices
        top_indices = mean_tfidf.argsort()[::-1]
        top_keywords = []
        for idx in top_indices:
            term = feature_names[idx]
            if term not in EXTRA_STOP_WORDS and len(term) > 2:
                top_keywords.append(term.title())
            if len(top_keywords) >= 4:
                break
    except Exception:
        top_keywords = []

    # Select representative headline (the one with highest average similarity to others or shortest crisp title)
    rep_headline = cluster_articles[0]["title"]
    if len(cluster_articles) > 1:
        # Find title closest to mean length and containing top keywords
        scored_headlines = []
        for a in cluster_articles:
            score = sum(1 for kw in top_keywords if kw.lower() in a["title"].lower())
            scored_headlines.append((score, -len(a["title"]), a["title"]))
        scored_headlines.sort(reverse=True)
        rep_headline = scored_headlines[0][2]

    # Create descriptive label
    if top_keywords:
        label = " • ".join(top_keywords[:3])
    else:
        label = rep_headline[:50] + "..." if len(rep_headline) > 50 else rep_headline

    return label, top_keywords, rep_headline

def cluster_articles(articles):
    """
    Group articles into topic clusters using TF-IDF and Cosine Similarity thresholding.
    Returns (clusters_list, article_cluster_map).
    """
    if not articles:
        return [], {}

    # Single article case
    if len(articles) == 1:
        art = articles[0]
        c_id = f"cluster-{art['id'][:8]}"
        cluster = {
            "id": c_id,
            "label": art["title"],
            "keywords": [w.title() for w in art["title"].split()[:3] if len(w) > 3],
            "representative_headline": art["title"],
            "article_count": 1,
            "start_time": art["published_at"],
            "end_time": art["published_at"],
            "duration_hours": 0.0,
            "intensity_score": 1.0,
            "source_breakdown": {art["source_id"]: 1},
            "article_ids": [art["id"]]
        }
        return [cluster], {art["id"]: c_id}

    # 1. Build document representations with title boost
    corpus = []
    for a in articles:
        title = a.get("title", "")
        summary = a.get("summary", "")
        body = a.get("body_text", "")
        # Repeat title 3x for higher lexical importance
        combined = f"{title} {title} {title} {summary} {body[:600]}"
        corpus.append(preprocess_text(combined))

    # 2. Compute TF-IDF matrix
    vectorizer = TfidfVectorizer(
        max_features=TFIDF_MAX_FEATURES,
        min_df=TFIDF_MIN_DF,
        ngram_range=TFIDF_NGRAM_RANGE,
        stop_words="english",
        sublinear_tf=True
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
        feature_names = vectorizer.get_feature_names_out()
    except Exception as e:
        print(f"[WARN] TF-IDF vectorizer fallback: {e}")
        feature_names = []

    # 3. Calculate pairwise Cosine Similarity
    sim_matrix = cosine_similarity(tfidf_matrix)

    # Calculate token overlap (Jaccard similarity of meaningful tokens)
    token_sets = []
    for doc in corpus:
        tokens = set(t for t in doc.split() if len(t) > 2 and t not in EXTRA_STOP_WORDS)
        token_sets.append(tokens)

    n = len(articles)

    # Combined hybrid similarity matrix
    hybrid_sim = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i == j:
                hybrid_sim[i][j] = 1.0
                continue
            
            # Jaccard overlap
            set_i, set_j = token_sets[i], token_sets[j]
            intersection = len(set_i.intersection(set_j))
            union = len(set_i.union(set_j))
            jaccard = intersection / union if union > 0 else 0.0

            # Weighted combination: 60% TF-IDF cosine + 40% keyword overlap
            hybrid_sim[i][j] = (0.60 * sim_matrix[i][j]) + (0.40 * jaccard)

    # 4. Graph Connected Components / Threshold clustering
    visited = [False] * n
    clusters = []
    article_cluster_map = {}

    for i in range(n):
        if visited[i]:
            continue

        # BFS / Queue to find all connected articles above threshold
        queue = [i]
        cluster_indices = []
        visited[i] = True

        while queue:
            curr = queue.pop(0)
            cluster_indices.append(curr)

            for j in range(n):
                if not visited[j]:
                    set_i, set_j = token_sets[curr], token_sets[j]
                    shared_words_count = len(set_i.intersection(set_j))
                    
                    # Group if hybrid similarity crosses threshold OR if they share 3+ core story terms
                    is_connected = (
                        hybrid_sim[curr][j] >= COSINE_SIMILARITY_THRESHOLD or
                        (shared_words_count >= 3 and hybrid_sim[curr][j] >= 0.10)
                    )

                    if is_connected:
                        visited[j] = True
                        queue.append(j)

        cluster_arts = [articles[idx] for idx in cluster_indices]
        
        # Sort articles chronologically
        cluster_arts.sort(key=lambda x: parse_to_dt(x["published_at"]))

        earliest_dt = parse_to_dt(cluster_arts[0]["published_at"])
        latest_dt = parse_to_dt(cluster_arts[-1]["published_at"])
        duration_hours = max(0.1, round((latest_dt - earliest_dt).total_seconds() / 3600.0, 2))

        # Generate label and keywords
        label, keywords, rep_headline = compute_cluster_label_and_keywords(
            cluster_arts, vectorizer, feature_names
        )

        # Source breakdown
        source_counts = {}
        for a in cluster_arts:
            s_id = a["source_id"]
            source_counts[s_id] = source_counts.get(s_id, 0) + 1

        # Intensity score: combines article count & cross-source diversity
        diversity_bonus = (len(source_counts) - 1) * 0.8
        volume_score = math.log2(len(cluster_arts) + 1) * 1.5
        intensity = min(10.0, round(1.0 + volume_score + diversity_bonus, 2))

        # Deterministic cluster ID based on earliest article
        cluster_id = f"c_{cluster_arts[0]['id'][:10]}"

        clusters.append({
            "id": cluster_id,
            "label": label,
            "keywords": keywords,
            "representative_headline": rep_headline,
            "article_count": len(cluster_arts),
            "start_time": parse_to_iso(cluster_arts[0]["published_at"]),
            "end_time": parse_to_iso(cluster_arts[-1]["published_at"]),
            "duration_hours": duration_hours,
            "intensity_score": intensity,
            "source_breakdown": source_counts,
            "article_ids": [a["id"] for a in cluster_arts]
        })

        for a in cluster_arts:
            article_cluster_map[a["id"]] = cluster_id

    # Sort clusters by latest activity / start time descending
    clusters.sort(key=lambda c: c["end_time"], reverse=True)

    return clusters, article_cluster_map
