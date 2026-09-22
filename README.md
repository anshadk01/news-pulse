# 📰 News Pulse — Topic-Clustered News Timeline

News Pulse is a full-stack news intelligence platform that collects news from multiple RSS feeds, extracts and cleans article content, groups related articles using NLP, and displays the results through an interactive React timeline.

## 🚀 Features

* Multi-source RSS news ingestion
* Article extraction and text preprocessing
* SHA-256 URL deduplication
* Publication date normalization
* TF-IDF based topic representation
* Cosine Similarity + Jaccard similarity
* Automatic topic clustering and labels
* Story intensity and duration calculation
* Source filtering and search
* Asynchronous data refresh
* Automated testing
* Docker-ready deployment

## 🛠️ Technology Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* TanStack Query
* Vitest
* React Testing Library

### Backend

* Node.js
* Express.js
* REST API
* Supertest
* Node.js Test Runner
* dotenv

### NLP / Data Processing

* Python
* scikit-learn
* NumPy
* Trafilatura
* BeautifulSoup
* python-dateutil
* TF-IDF
* Cosine Similarity
* Jaccard Similarity

### Database & DevOps

* SQLite for development
* PostgreSQL / Supabase for production
* Docker
* Git & GitHub
* GitHub Actions

---

## 🏗️ Architecture

```text
             RSS FEEDS
     BBC / NPR / Guardian
          / Al Jazeera
               |
               v
      +------------------+
      |  Python Scraper  |
      |                  |
      | RSS Parsing      |
      | Text Extraction  |
      | Preprocessing    |
      | Deduplication    |
      | TF-IDF           |
      | Similarity       |
      | Clustering       |
      +--------+---------+
               |
               v
          +---------+
          | Database|
          | SQLite /|
          |Postgres |
          +----+----+
               |
               v
      +------------------+
      | Node + Express   |
      | REST API         |
      | Job Management   |
      +--------+---------+
               |
               | JSON
               v
      +------------------+
      | React + Vite     |
      | Interactive UI   |
      +------------------+
```

---

## 📁 Project Structure

```text
news-pulse/
├── scraper/
│   ├── config.py
│   ├── rss_parser.py
│   ├── extractor.py
│   ├── clusterer.py
│   ├── database.py
│   ├── main.py
│   ├── tests/
│   └── requirements.txt
│
├── backend/
│   ├── src/
│   │   ├── db.js
│   │   ├── jobManager.js
│   │   ├── routes.js
│   │   └── server.js
│   ├── tests/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── tests/
│   └── package.json
│
├── Dockerfile
└── README.md
```

---

# 🧠 Topic Clustering Methodology

## Why TF-IDF instead of Keyword Overlap?

News Pulse uses **TF-IDF + Cosine Similarity** instead of simple keyword-overlap.

Keyword overlap only checks whether two articles contain the same words. This can fail when different publishers describe the same event using different vocabulary.

TF-IDF gives higher importance to distinctive terms and lower importance to common terms. It was therefore selected because it provides a lightweight, explainable and practical approach for comparing news articles without requiring a large embedding model.

## NLP Pipeline

```text
Article
   ↓
HTML Cleaning
   ↓
Text Normalization
   ↓
Stopword Removal
   ↓
Title + Summary + Body
   ↓
TF-IDF Vectorization
   ↓
Cosine Similarity
   ↓
Jaccard Token Overlap
   ↓
Hybrid Similarity Score
   ↓
Topic Cluster
```

The article title is repeated **3 times** because headlines generally contain the most important information about a news story.

Sublinear TF scaling is also used:

```text
TF = 1 + log(tf)
```

This prevents long articles from dominating shorter articles simply because they contain more words.

---

# 📐 Similarity Calculation

The system combines two signals:

```text
60% → TF-IDF Cosine Similarity
40% → Jaccard Token Overlap
```

Conceptually:

```text
Hybrid Score =
    (0.60 × Cosine Similarity)
    +
    (0.40 × Jaccard Similarity)
```

Cosine similarity measures similarity between TF-IDF vectors, while Jaccard overlap provides additional evidence when articles share meaningful tokens or entities.

---

# 🎯 Threshold Selection

The similarity threshold was empirically tuned to:

```text
0.20
```

Articles with a hybrid similarity score around or above `0.20` are considered related. Approximately **3 shared meaningful story entities** are also used as supporting evidence.

A lower threshold produced overly broad clusters because unrelated news articles can share generic words such as `government`, `official`, `country`, and `new`.

A much higher threshold separated articles covering the same event when publishers used different wording.

Therefore, `0.20` was selected as a practical balance between false merges and missed relationships.

---

# 🏷️ Cluster Labels

After clustering, the system generates human-readable labels by:

1. Collecting articles belonging to a cluster.
2. Calculating important TF-IDF terms.
3. Selecting the top 3 distinctive terms.
4. Selecting a representative headline.

Example:

```text
Federal Reserve | Interest Rates | Inflation

"Federal Reserve holds rates steady..."
```

---

# 📊 Story Intensity

Story intensity considers both:

* Number of articles in a cluster
* Number of different news sources covering the story

Article volume uses logarithmic scaling:

```text
log2(N + 1)
```

where `N` is the number of articles.

A story reported by several different publishers therefore receives higher visual intensity than an isolated article.

---

# ⚠️ Known Limitation

The main limitation is **vocabulary drift**.

A story may evolve over several days:

```text
Initial Event
     ↓
Rescue Operation
     ↓
Investigation
     ↓
Political Response
```

As the vocabulary changes, TF-IDF similarity can decrease. This can cause later developments of the same story to form a separate cluster.

Short headlines with little body text can also produce weak similarity scores.

A future version could use **Sentence Transformers + vector embeddings + pgvector** for stronger semantic matching.

---

# 🔌 What Runs Where?

## Frontend — React

Location:

```text
/frontend
```

Development server:

```text
http://localhost:5173
```

Responsible for:

* Timeline visualization
* Filtering and search
* Story details
* Animations
* API polling
* User interaction

React is kept separate from the processing layer so the browser only handles presentation and user interaction.

---

## Backend — Node.js + Express

Location:

```text
/backend
```

Development server:

```text
http://localhost:5000
```

Responsible for:

* REST API
* Database queries
* Ingestion triggers
* Job management
* Starting the Python pipeline

Main endpoints:

```text
GET  /health
GET  /clusters
GET  /clusters/:id
GET  /timeline
POST /ingest/trigger
GET  /ingest/status/:jobId
```

Node.js acts as the API and orchestration layer between the frontend, database and Python pipeline.

---

## Python Scraper / NLP Pipeline

Location:

```text
/scraper
```

Responsible for:

```text
RSS
 ↓
Extraction
 ↓
Cleaning
 ↓
Deduplication
 ↓
TF-IDF
 ↓
Similarity
 ↓
Clustering
 ↓
Database
```

Python is used because it provides mature libraries for NLP, text processing and machine learning.

---

## Database

### Development

**SQLite** is used locally because it requires no separate database server and makes development simple.

### Production

**PostgreSQL** is recommended for production because it provides better concurrency, scalability and managed cloud deployment options such as Supabase or Neon.

---

# 🔄 Complete Data Flow

When the user clicks **Refresh Data**:

```text
React
  |
  | POST /ingest/trigger
  v
Node.js
  |
  | Starts Python process
  v
Python Scraper
  |
  ├── Fetch RSS feeds
  ├── Extract articles
  ├── Remove duplicates
  ├── Run NLP clustering
  └── Save results
          |
          v
       Database
          |
          v
     Node.js API
          |
          v
React + TanStack Query
          |
          v
Updated Timeline
```

This separation keeps:

```text
React      → UI and user interaction
Node.js    → API and orchestration
Python     → Data processing and NLP
Database   → Persistent storage
```

---

# 🧪 Testing

### Python

```bash
cd scraper
pip install -r requirements.txt
pytest tests/ -v
```

Tests cover RSS parsing, deduplication, date handling, text processing and clustering.

### Backend

```bash
cd backend
npm install
npm test
npm start
```

Tests cover health checks, cluster APIs, timeline APIs and ingestion jobs.

### Frontend

```bash
cd frontend
npm install
npm test
npm run dev
```

Tests cover components, filters, cluster rendering and user interactions.

---

# 🐳 Docker

Build:

```bash
docker build -t news-pulse .
```

Run:

```bash
docker run -p 5000:5000 news-pulse
```

Docker provides a consistent environment for the Node.js and Python dependencies required by the backend and NLP pipeline.

---

# 🚀 Local Setup

### 1. Scraper

```bash
cd scraper
pip install -r requirements.txt
python main.py
```

### 2. Backend

```bash
cd backend
npm install
npm start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

# 🌍 Production Architecture

```text
React + Vite
     |
     v
  Vercel
     |
     v
Node + Python + Docker
     |
     v
  Render
     |
     v
PostgreSQL
     |
     v
   Neon
```

---

# 📌 Summary

News Pulse combines:

```text
RSS Ingestion
+ Python NLP
+ TF-IDF
+ Cosine Similarity
+ Jaccard Similarity
+ Topic Clustering
+ Node.js REST API
+ React
+ TanStack Query
+ SQLite / PostgreSQL
+ Docker
+ Automated Testing
```

The goal is to transform individual news articles from multiple publishers into a structured timeline of evolving stories and cross-source reporting.
