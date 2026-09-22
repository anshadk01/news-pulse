# 🎬 News Pulse: 2–3 Minute Video Walkthrough Script

Use this structured script to record your 2–3 minute video walkthrough (using Loom, OBS, or screen recorder).

---

## ⏱️ Timing Breakdown & Script

### Part 1: Live Demo of the Interactive Timeline (30 – 45 seconds)
* **What to show on screen**: Open the running React frontend (`http://localhost:5173`) in dark theme.
* **What to say**:
  > *"Hi everyone! This is **News Pulse**, a real-time topic-clustered news timeline that ingests breaking stories from global RSS feeds—including BBC News, NPR, The Guardian, and Al Jazeera—and groups related reporting into visual topic clusters.*
  > 
  > *Here on the main dashboard, you can see our continuous topic timeline. Each horizontal block represents a coherent news topic spanning from its earliest to latest published article. The size and glow of the blocks scale with story intensity and cross-outlet converge.*
  > 
  > *I can filter by news outlets—for example, toggling BBC or The Guardian—or search specific keywords. Clicking any topic opens a detailed slide-out reader showing the full chronological progression of the story, article excerpts, and direct links to the original publishers.*
  > 
  > *When I click 'Refresh Data', the UI asynchronously triggers our ingestion pipeline, polls live status, and updates the timeline seamlessly."*

---

### Part 2: How Topic Grouping Works (45 – 60 seconds)
* **What to show on screen**: Open `scraper/clusterer.py` and `scraper/rss_parser.py` in your code editor.
* **What to say**:
  > *"Let's look under the hood at how topic grouping works. In `/scraper/clusterer.py`, we use a tuned NLP pipeline with **TF-IDF vectorization and Cosine Similarity thresholding**.*
  > 
  > *First, we construct a normalized document for each article, boosting the headline by repeating it three times because headlines contain the dense semantic core of the news story. We strip journalistic stopwords like 'reported', 'breaking', or 'says'.*
  > 
  > *Next, we compute TF-IDF vectors using sublinear term frequencies and calculate the pairwise cosine similarity matrix. We combine TF-IDF similarity with non-stopword Jaccard token matching.*
  > 
  > *Then, using graph connected components with a calibrated similarity threshold of 0.20, articles discussing the same event are grouped into the same cluster.*
  > 
  > *Finally, instead of arbitrary cluster IDs, we generate human-readable labels by picking the top 3 distinctive TF-IDF keywords along with the most representative headline."*

---

### Part 3: One Hard Problem & How It Was Solved (30 – 45 seconds)
* **What to show on screen**: Highlight `rss_parser.py` (date parsing & deduplication) or `TimelineView.jsx` (continuous time calculation).
* **What to say**:
  > *"One of the toughest engineering challenges was handling **feed format inconsistencies and publication dates across outlets**. Different feeds use RFC 822 timestamps, ISO strings, or omit timezones entirely, which initially caused timeline plotting errors.*
  > 
  > *We solved this in `rss_parser.py` by building a resilient date normalization pipeline using `python-dateutil` and fallback parsers that converts all timestamps to strict UTC ISO-8601.*
  > 
  > *Additionally, we implemented SHA-256 canonical hashing on sanitized URLs to ensure the ingestion pipeline is idempotent—meaning repeated scraper runs only process fresh articles without duplicating existing stories."*

---

### Part 4: What I'd Improve With More Time (15 – 20 seconds)
* **What to show on screen**: Return to the frontend dashboard.
* **What to say**:
  > *"With more time, I would incorporate dense neural embeddings (like Sentence-Transformers or OpenAI embeddings) stored in pgvector to handle semantic paraphrasing and cross-lingual news tracking across multilingual feeds.*
  > 
  > *Thank you for watching!"*

---

## 📋 Recording Checklist
- [ ] Browser window showing the React dashboard with real live clusters.
- [ ] Code editor showing `clusterer.py` and `rss_parser.py`.
- [ ] Unlisted YouTube or Loom link ready for submission.
