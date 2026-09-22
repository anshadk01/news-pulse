/**
 * Asynchronous job queue manager for scraper subprocess execution.
 */
const { spawn } = require('child_process');
const path = require('path');

const jobs = new Map();

// Path to Python scraper
const SCRAPER_SCRIPT_PATH = path.resolve(__dirname, '../../scraper/main.py');
const SCRAPER_DIR = path.resolve(__dirname, '../../scraper');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';

/**
 * Trigger an asynchronous ingestion run.
 */
function createIngestJob() {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const job = {
    id: jobId,
    status: 'queued',
    stage: 'Initializing scraper pipeline',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSeconds: null,
    result: null,
    error: null,
    logs: []
  };

  jobs.set(jobId, job);

  // Run subprocess asynchronously
  setImmediate(() => {
    executeJob(jobId);
  });

  return job;
}

/**
 * Execute the scraper subprocess.
 */
function executeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  job.stage = 'Fetching RSS feeds and extracting content';

  console.log(`[JOB ${jobId}] Starting Python scraper subprocess: ${PYTHON_BIN} ${SCRAPER_SCRIPT_PATH}`);

  const child = spawn(PYTHON_BIN, [SCRAPER_SCRIPT_PATH], {
    cwd: SCRAPER_DIR,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (const line of lines) {
      job.logs.push(line);
      console.log(`[JOB ${jobId}] ${line}`);

      if (line.includes('[INGEST]')) {
        job.stage = 'Ingesting RSS feeds from BBC, NPR, Guardian, and Al Jazeera';
      } else if (line.includes('[EXTRACTOR]')) {
        job.stage = 'Extracting full article bodies and cleaning text';
      } else if (line.includes('[PIPELINE] Running TF-IDF')) {
        job.stage = 'Vectorizing content and clustering topic groups with TF-IDF';
      } else if (line.startsWith('JSON_RESULT:')) {
        try {
          const jsonStr = line.replace('JSON_RESULT:', '');
          job.result = JSON.parse(jsonStr);
        } catch (e) {
          console.error(`[JOB ${jobId}] Failed to parse JSON_RESULT:`, e);
        }
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    job.logs.push(`[STDERR] ${text.trim()}`);
    console.error(`[JOB ${jobId} STDERR] ${text.trim()}`);
  });

  child.on('error', (err) => {
    job.status = 'failed';
    job.stage = 'Failed to spawn process';
    job.error = err.message;
    job.finishedAt = new Date().toISOString();
    console.error(`[JOB ${jobId}] Subprocess error:`, err);
  });

  child.on('close', (code) => {
    job.finishedAt = new Date().toISOString();
    const duration = (new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000;
    job.durationSeconds = Number(duration.toFixed(2));

    if (code === 0 && (!job.result || job.result.status === 'success')) {
      job.status = 'completed';
      job.stage = 'Pipeline finished successfully';
    } else {
      job.status = 'failed';
      job.stage = 'Scraper pipeline encountered errors';
      if (!job.error) {
        job.error = job.result?.error || `Process exited with code ${code}`;
      }
    }

    console.log(`[JOB ${jobId}] Finished with status ${job.status} in ${job.durationSeconds}s`);
  });
}

/**
 * Fetch job status by ID.
 */
function getJob(jobId) {
  return jobs.get(jobId) || null;
}

module.exports = {
  createIngestJob,
  getJob
};
