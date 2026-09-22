/**
 * Database client supporting PostgreSQL (pg) and SQLite (sqlite3).
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');
const DEFAULT_SQLITE_PATH = path.resolve(__dirname, '../../newspulse.db');

let pgPool = null;
let sqliteDb = null;

function initTables() {
  const schema = `
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
    CREATE INDEX IF NOT EXISTS idx_articles_pubdate ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_clusters_time ON topic_clusters(start_time DESC);
  `;
  if (sqliteDb) {
    sqliteDb.exec(schema, (err) => {
      if (err) console.error('[DB] SQLite table init error:', err);
    });
  }
}

if (isPostgres) {
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  const dbPath = process.env.SQLITE_PATH || DEFAULT_SQLITE_PATH;
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('[DB] SQLite connection error:', err.message);
    } else {
      console.log(`[DB] Connected to SQLite database at ${dbPath}`);
      initTables();
    }
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres && pgPool) {
      // Convert SQLite ? to Postgres $1, $2
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      pgPool.query(pgSql, params, (err, res) => {
        if (err) return reject(err);
        resolve(res.rows);
      });
    } else {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    }
  });
}

function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres && pgPool) {
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      pgPool.query(pgSql, params, (err, res) => {
        if (err) return reject(err);
        resolve(res.rows[0] || null);
      });
    } else {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    }
  });
}

/**
 * Get all topic clusters with optional source filtering and search.
 */
async function getClusters({ sources, limit = 100, offset = 0 } = {}) {
  let sql = `
    SELECT 
      c.id,
      c.label,
      c.keywords,
      c.representative_headline,
      c.article_count,
      c.start_time,
      c.end_time,
      c.duration_hours,
      c.intensity_score,
      c.source_breakdown,
      c.created_at,
      c.updated_at
    FROM topic_clusters c
    WHERE c.article_count > 0
  `;
  const params = [];

  sql += ` ORDER BY c.end_time DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const rows = await query(sql, params);
  
  let clusters = rows.map(r => ({
    id: r.id,
    label: r.label,
    keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords || '[]') : (r.keywords || []),
    representativeHeadline: r.representative_headline,
    articleCount: Number(r.article_count),
    startTime: r.start_time instanceof Date ? r.start_time.toISOString() : r.start_time,
    endTime: r.end_time instanceof Date ? r.end_time.toISOString() : r.end_time,
    durationHours: Number(r.duration_hours || 0),
    intensityScore: Number(r.intensity_score || 1.0),
    sourceBreakdown: typeof r.source_breakdown === 'string' ? JSON.parse(r.source_breakdown || '{}') : (r.source_breakdown || {}),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at
  }));

  // Apply source filtering if provided
  if (sources && Array.isArray(sources) && sources.length > 0) {
    clusters = clusters.filter(c => {
      const clusterSources = Object.keys(c.sourceBreakdown);
      return sources.some(s => clusterSources.includes(s));
    });
  }

  return clusters;
}

/**
 * Get full cluster details and its chronological articles.
 */
async function getClusterById(clusterId) {
  const cluster = await getRow(`SELECT * FROM topic_clusters WHERE id = ?`, [clusterId]);
  if (!cluster) return null;

  const articles = await query(
    `SELECT id, cluster_id, source_id, source_name, title, summary, body_text, url, published_at, author, image_url
     FROM articles
     WHERE cluster_id = ?
     ORDER BY published_at ASC`,
    [clusterId]
  );

  return {
    id: cluster.id,
    label: cluster.label,
    keywords: typeof cluster.keywords === 'string' ? JSON.parse(cluster.keywords || '[]') : (cluster.keywords || []),
    representativeHeadline: cluster.representative_headline,
    articleCount: Number(cluster.article_count),
    startTime: cluster.start_time instanceof Date ? cluster.start_time.toISOString() : cluster.start_time,
    endTime: cluster.end_time instanceof Date ? cluster.end_time.toISOString() : cluster.end_time,
    durationHours: Number(cluster.duration_hours || 0),
    intensityScore: Number(cluster.intensity_score || 1.0),
    sourceBreakdown: typeof cluster.source_breakdown === 'string' ? JSON.parse(cluster.source_breakdown || '{}') : (cluster.source_breakdown || {}),
    articles: articles.map(a => ({
      id: a.id,
      sourceId: a.source_id,
      sourceName: a.source_name,
      title: a.title,
      summary: a.summary,
      bodyText: a.body_text,
      url: a.url,
      publishedAt: a.published_at instanceof Date ? a.published_at.toISOString() : a.published_at,
      author: a.author,
      imageUrl: a.image_url
    }))
  };
}

/**
 * Get structured timeline data optimized for charting and visual plotting.
 */
async function getTimelineData({ sources } = {}) {
  const clusters = await getClusters({ sources, limit: 150 });
  
  // Calculate global time boundaries
  let globalStart = null;
  let globalEnd = null;

  clusters.forEach(c => {
    const s = new Date(c.startTime).getTime();
    const e = new Date(c.endTime).getTime();
    if (!globalStart || s < globalStart) globalStart = s;
    if (!globalEnd || e > globalEnd) globalEnd = e;
  });

  return {
    totalClusters: clusters.length,
    timeRange: {
      globalStart: globalStart ? new Date(globalStart).toISOString() : null,
      globalEnd: globalEnd ? new Date(globalEnd).toISOString() : null
    },
    clusters: clusters.map(c => ({
      id: c.id,
      label: c.label,
      representativeHeadline: c.representativeHeadline,
      keywords: c.keywords,
      startTime: c.startTime,
      endTime: c.endTime,
      durationHours: c.durationHours,
      articleCount: c.articleCount,
      intensityScore: c.intensityScore,
      sourceBreakdown: c.sourceBreakdown
    }))
  };
}

module.exports = {
  query,
  getRow,
  getClusters,
  getClusterById,
  getTimelineData
};
