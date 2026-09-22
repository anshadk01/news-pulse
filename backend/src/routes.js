// Root API status & directory
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'News Pulse REST API',
    status: 'online',
    version: '1.0.0',
    documentation: {
      health: '/health',
      timeline: '/timeline',
      clusters: '/clusters',
      clusterDetail: '/clusters/:id',
      triggerIngest: 'POST /ingest/trigger',
      ingestStatus: '/ingest/status/:jobId'
    },
    message: 'News Pulse backend API is running smoothly. Connect your frontend or explore endpoints.'
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'News Pulse API', time: new Date().toISOString() });
});

/**
 * GET /clusters
 * List of topic clusters — label, article count, time range (earliest -> latest article)
 * Optional query params:
 *   - sources (comma-separated source IDs e.g. bbc,npr,guardian)
 *   - limit (default 100)
 *   - offset (default 0)
 */
router.get('/clusters', async (req, res, next) => {
  try {
    const sources = req.query.sources ? req.query.sources.split(',').map(s => s.trim()) : null;
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const clusters = await db.getClusters({ sources, limit, offset });
    res.json({
      success: true,
      count: clusters.length,
      data: clusters
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /clusters/:id
 * Full cluster detail with all articles, sorted chronologically.
 */
router.get('/clusters/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Cluster ID is required' });
    }

    const cluster = await db.getClusterById(id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: `Cluster with ID '${id}' not found` });
    }

    res.json({
      success: true,
      data: cluster
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /timeline
 * Clusters formatted specifically for timeline plotting:
 * label, start/end time, article count, size/intensity metric, source breakdown.
 */
router.get('/timeline', async (req, res, next) => {
  try {
    const sources = req.query.sources ? req.query.sources.split(',').map(s => s.trim()) : null;
    const timelineData = await db.getTimelineData({ sources });

    res.json({
      success: true,
      data: timelineData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /ingest/trigger
 * Triggers python pipeline (scrape + group) as an asynchronous subprocess.
 * Returns a unique job ID.
 */
router.post('/ingest/trigger', (req, res) => {
  try {
    const job = jobManager.createIngestJob();
    res.status(202).json({
      success: true,
      message: 'Ingestion and clustering job enqueued',
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /ingest/status/:jobId
 * Allows the frontend to poll job status and progress.
 */
router.get('/ingest/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: `Job with ID '${jobId}' not found`
    });
  }

  res.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      stage: job.stage,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      durationSeconds: job.durationSeconds,
      result: job.result,
      error: job.error,
      logsCount: job.logs.length
    }
  });
});

module.exports = router;
