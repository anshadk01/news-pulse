/**
 * Backend API automated test suite.
 */
const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = path.join(os.tmpdir(), `news-pulse-api-test-${process.pid}.db`);
const app = require('../src/server');

describe('News Pulse API Endpoints', () => {

  test('GET / and GET /api return the API directory', async () => {
    for (const endpoint of ['/', '/api']) {
      const res = await request(app).get(endpoint);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.service, 'News Pulse REST API');
    }
  });

  test('GET /health returns 200 and status ok', async () => {
    for (const endpoint of ['/health', '/api/health']) {
      const res = await request(app).get(endpoint);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'ok');
    }
  });

  test('GET /clusters returns topic clusters array', async () => {
    const res = await request(app).get('/clusters');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    if (res.body.data.length > 0) {
      const cluster = res.body.data[0];
      assert.ok(cluster.id);
      assert.ok(cluster.label);
      assert.ok(cluster.startTime);
      assert.ok(cluster.endTime);
      assert.ok(typeof cluster.articleCount === 'number');
    }
  });

  test('GET /timeline returns formatted timeline schema', async () => {
    const res = await request(app).get('/timeline');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.data.totalClusters === 'number');
    assert.ok(res.body.data.timeRange);
    assert.ok(Array.isArray(res.body.data.clusters));
  });

  test('GET /clusters/:id with non-existent ID returns 404', async () => {
    const res = await request(app).get('/clusters/non_existent_cluster_99999');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
  });

  test('POST /ingest/trigger enqueues a job and returns jobId', async () => {
    const res = await request(app).post('/ingest/trigger');
    assert.strictEqual(res.statusCode, 202);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.jobId);
    assert.ok(res.body.status === 'queued' || res.body.status === 'running');

    // Poll status immediately
    const pollRes = await request(app).get(`/ingest/status/${res.body.jobId}`);
    assert.strictEqual(pollRes.statusCode, 200);
    assert.strictEqual(pollRes.body.data.jobId, res.body.jobId);
  });

  test('GET /ingest/status/:jobId with invalid ID returns 404', async () => {
    const res = await request(app).get('/ingest/status/invalid_job_id_xyz');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
  });
});
