# News Pulse — Topic-Clustered News Timeline

**News Pulse** is an end-to-end full-stack news intelligence platform that continuously ingests live RSS feeds from global news outlets, normalizes disparate formats, extracts full-text articles, groups related reporting into coherent topic clusters using **TF-IDF Vectorization & Cosine Similarity Thresholding**, and visualizes them on a responsive, interactive timeline built with **React (Vite), TanStack Query, and Framer Motion**.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NEWS PULSE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

 [RSS Feeds]          [Python Pipeline (/scraper)]          [Storage Layer]
 ┌─────────────┐     ┌────────────────────────────┐      ┌──────────────────┐
 │ • BBC News  │────>│ • Feed Normalizer (RFC822) │─────>│ SQLite (Dev)     │
 │ • NPR News  │     │ • SHA-256 Deduplication    │      │  - or -          │
 │ • Guardian  │     │ • Full Text (trafilatura)  │      │ PostgreSQL /     │
 │ • Al Jazeera│     │ • TF-IDF + Cosine Clustering│     │ Supabase (Prod)  │
 └─────────────┘     └────────────────────────────┘      └────────┬─────────┘
                                                                  │
                                                                  ▼
 [React Frontend (/frontend)]           [Node.js REST API (/backend)]
 ┌──────────────────────────────┐       ┌──────────────────────────────┐
 │ • Responsive Time Axis       │<─────>│ • GET  /clusters             │
 │ • Visual Intensity Sizing    │(JSON) │ • GET  /clusters/:id         │
 │ • Source Filter (BBC/NPR/etc)│       │ • GET  /timeline             │
 │ • Chronological Story Drawer │       │ • POST /ingest/trigger       │
 │ • TanStack Query & Motion    │       │ • GET  /ingest/status/:jobId │
 └──────────────────────────────┘       └──────────────────────────────┘
```

---

## 🚀 Directory Structure

```
news-pulse/
├── scraper/              # Python RSS Ingestion, Extraction & NLP Topic Clustering
│   ├── config.py         # Feeds, headers, DB paths, and NLP thresholds
│   ├── rss_parser.py     # Date parsing, HTML sanitization, SHA-256 deduplication
│   ├── extractor.py      # Resilient full-text extractor (trafilatura + bs4 fallback)
│   ├── clusterer.py      # TF-IDF + Cosine Similarity threshold grouping & labels
│   ├── database.py       # Unified SQLite / PostgreSQL driver layer
│   ├── main.py           # CLI orchestrator & JSON status emitter
│   ├── tests/            # Pytest test suite
│   └── requirements.txt
│
├── backend/              # Node.js Express REST API
│   ├── src/
│   │   ├── db.js         # SQLite / PostgreSQL async query client
│   │   ├── jobManager.js # Async job queue & Python subprocess runner
│   │   ├── routes.js     # /clusters, /timeline, /ingest API endpoints
│   │   └── server.js     # Express app configuration & middleware
│   ├── tests/            # Automated API test suite
│   ├── .env.example
│   └── package.json
│
├── frontend/             # React (Vite) + TanStack Query + Tailwind CSS
│   ├── src/
│   │   ├── api/client.js # TanStack Query hooks & polling client
│   │   ├── components/   # Header, TimelineView, ClusterCard, Drawer, Modals
│   │   ├── App.jsx       # Root dashboard state orchestrator
│   │   └── index.css     # Dark glassmorphism & responsive styles
│   ├── tests/            # Vitest component unit tests
│   ├── vite.config.js
│   └── package.json
│
├── README.md             # Documentation (Architecture, Methodology, Deployment)
└── VIDEO_SCRIPT.md       # 2–3 Minute Video Walkthrough Script
```

---

## 📡 News Sources Used

| Source | Category | URL |
| :--- | :--- | :--- |
| **BBC News** | World / Top Stories | `http://feeds.bbci.co.uk/news/world/rss.xml` |
| **NPR News** | General / National | `https://feeds.npr.org/1001/rss.xml` |
| **The Guardian** | World News | `https://www.theguardian.com/world/rss` |
| **Al Jazeera English** | World / International | `https://www.aljazeera.com/xml/rss/all.xml` |

---

## 🧠 Topic-Grouping Methodology (Option B: TF-IDF + Cosine Similarity)

### 1. Vectorization & Lexical Weighting
- **Preprocessing**: Cleans raw HTML tags, strips URL parameters, normalizes whitespace, and filters both English stopwords and custom journalistic filler words (`said`, `reported`, `breaking`, `update`).
- **Title Boosting**: Article titles carry the dense semantic core of the story. In the TF-IDF corpus, the title is repeated ($3\times$) alongside the summary and leading body text.
- **Sublinear TF Scaling**: Uses `sublinear_tf=True` ($1 + \log(\text{tf})$) to prevent long article bodies from overwhelming concise breaking news summaries.

### 2. Similarity Metric & Thresholding
- Computes pairwise cosine similarities across the TF-IDF feature space:
  $$\text{Cosine Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
- Uses a hybrid metric combining TF-IDF cosine similarity ($60\%$) with non-stopword Jaccard token overlap ($40\%$).
- **Threshold Calibration**: Empirically tuned to **`0.20`** (or $\ge 3$ shared story entities). This captures multi-outlet reporting on the same underlying event (e.g. Federal Reserve interest rate decisions, global climate summits) while avoiding spurious links between unrelated stories.

### 3. Deterministic Label Generation
- Rather than arbitrary cluster numbers, each cluster is labeled deterministically by identifying the top $3$ terms with the highest mean TF-IDF weight inside the cluster.
- The most central representative headline is selected to serve as the descriptive subtitle.

### 4. Time Span & Intensity Metrics
- Calculates `startTime` (earliest article) and `endTime` (latest article).
- `durationHours` $=\max(0.1, (\text{endTime} - \text{startTime}) / 3600)$.
- `intensityScore` balances article volume ($\log_2(N+1)$) and cross-source diversity multiplier (more outlets reporting on the same event yields a higher visual intensity score).

### Limitations Noticed
1. **Vocabulary Drift / Fast-Evolving Stories**: As a breaking story develops over several days (e.g., initial disaster $\rightarrow$ rescue operation $\rightarrow$ political inquiry), keyword overlap decreases, which may cause late-stage follow-ups to form a secondary adjacent cluster rather than merging into the original event.
2. **Short Headlines**: Rare articles with extremely terse headlines ($<5$ words) and no body text have lower vector overlap and may remain as single-article clusters unless they share unique named entities.

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Scraper Setup & Test
```bash
cd scraper
pip install -r requirements.txt

# Run unit tests
pytest tests/ -v

# Run live ingestion & clustering
python main.py
```

### 2. Backend Setup & Test
```bash
cd backend
npm install

# Run automated API tests
npm test

# Start the API server (http://localhost:5000)
npm start
```

### 3. Frontend Setup & Test
```bash
cd frontend
npm install

# Run unit tests
npm test

# Start the Vite development server (http://localhost:5173)
npm run dev

# Or build for production
npm run build
```

---

## 🌐 Complete Step-by-Step Deployment Guide

The assessment requires a live deployment of all components on free-tier platforms.

### Architecture Mapping
- **Database**: **Supabase** or **Neon** (Free Managed PostgreSQL)
- **Backend API & Python Scraper**: **Render** or **Railway** (Dockerized Node + Python runtime)
- **Frontend**: **Vercel** or **Netlify** (Vite + React SPA)
- **Scheduled Ingestion**: Built-in **Node Subprocess trigger** on UI refresh + **GitHub Actions Cron** (every 4 hours)

---

### Step 1: Database Setup (Supabase / Neon) — *2 minutes*
1. Create a free account at [supabase.com](https://supabase.com) or [neon.tech](https://neon.tech).
2. Create a new project (e.g. `news-pulse-db`).
3. Copy the **PostgreSQL Connection URI** from Database Settings:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

---

### Step 2: Push Repository to GitHub
```bash
git init
git add .
git commit -m "feat: complete news-pulse full-stack system"
git branch -M main
git remote add origin https://github.com/<your-username>/news-pulse.git
git push -u origin main
```

---

### Step 3: Deploy Backend API on Render or Railway — *3 minutes*

#### Option A: Render (Recommended)
1. Go to [render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository `news-pulse`.
3. Select **Docker** as the Environment (Render detects the included `Dockerfile` automatically).
4. In **Environment Variables**, add:
   - `DATABASE_URL` = `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
5. Click **Create Web Service**.
6. Once deployed, copy your live backend URL (e.g. `https://news-pulse-api.onrender.com`).

---

### Step 4: Deploy React Frontend on Vercel — *2 minutes*
1. Go to [vercel.com](https://vercel.com) and click **Add New...** $\rightarrow$ **Project**.
2. Import your GitHub repository `news-pulse`.
3. In **Project Settings**:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://news-pulse-api.onrender.com` *(your live Render backend URL from Step 3)*
5. Click **Deploy**.
6. Your frontend is live at `https://news-pulse-app.vercel.app`!

---

### Step 5: (Optional) Enable GitHub Actions Cron
1. In your GitHub repo, go to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Add a new repository secret:
   - Name: `DATABASE_URL`
   - Value: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
3. The `.github/workflows/scheduled_ingest.yml` workflow will automatically run every 4 hours.

---

## 🧪 Automated Testing Summary

- **Scraper (`pytest`)**: Verifies SHA-256 deduplication hashing, RFC 822/ISO publication date normalization, HTML cleaning, and TF-IDF topic clustering assertions.
- **Backend API (`node --test` + `supertest`)**: Verifies `GET /health`, `GET /clusters`, `GET /timeline`, `GET /clusters/:id` (404/200), `POST /ingest/trigger`, and `GET /ingest/status/:jobId`.
- **Frontend (`vitest` + `@testing-library/react`)**: Verifies `SourceFilter` button toggles, `ClusterCard` rendering, metadata badges, and click triggers.
