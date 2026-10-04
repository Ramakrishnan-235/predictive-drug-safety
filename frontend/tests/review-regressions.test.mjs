import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, API_BASE } from '../src/lib/api.ts';
import { normalizePatient } from '../src/lib/patientData.ts';
import { createDemoTelemetryStream } from '../src/lib/telemetryStream.ts';

test('API helper retains caller payload and configured API base', async (t) => {
  let captured;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    captured = { url, options };
    return Response.json({ success: true });
  });
  const request = { name: 'Example', drugs: ['hydralazine', 'gabapentin'] };
  assert.deepEqual(await apiRequest('/admissions/ingest', { method: 'POST', body: JSON.stringify(request) }), { success: true });
  assert.equal(captured.url, `${API_BASE}/admissions/ingest`);
  assert.deepEqual(JSON.parse(captured.options.body), request);
});

test('server mutation failure rejects with the actual API detail', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Inference unavailable' }, { status: 503 }));
  await assert.rejects(apiRequest('/admissions/ingest'), /Inference unavailable/);
});

test('network failure rejects instead of reporting synthetic success', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Connection refused'); });
  await assert.rejects(apiRequest('/cpoe/sign'), /Connection refused/);
});

test('API timeouts abort requests and reject', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(apiRequest('/patients', {}, 5), { name: 'AbortError' });
});

test('caller cancellation reaches the fetch signal', async (t) => {
  const controller = new AbortController();
  let receivedSignal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => new Promise((_resolve, reject) => {
    receivedSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  const pending = apiRequest('/patients', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(receivedSignal.aborted, true);
});

test('settled API requests clear timeout and caller abort subscription', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const caller = new AbortController();
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    requestSignal = options.signal;
    return Response.json({ ok: true });
  });
  await apiRequest('/patients', { signal: caller.signal }, 100);
  caller.abort();
  t.mock.timers.tick(100);
  assert.equal(requestSignal.aborted, false);
});

test('patient presentation preserves server identity, zero-valued metrics and medications', () => {
  const server = { hadm_id: 994349, name: 'New Patient', age: 0, risk_percentage: 0, drug_count: 0, creatinine: 0, high_risk_meds: [] };
  const actual = normalizePatient(server);
  assert.equal(actual.hadm_id, 994349);
  assert.equal(actual.risk_percentage, 0);
  assert.equal(actual.drug_count, 0);
  assert.equal(actual.creatinine, 0);
  assert.deepEqual(actual.high_risk_meds, []);
  assert.equal(actual.initials, 'NP');
  assert.equal(actual.primary_recommendation, 'Clinical review pending');
});

test('normalizing a sparse census row supplies safe searchable display fields', () => {
  const actual = normalizePatient({ hadm_id: 12, name: 'Another Patient', renal_egfr: null, renal_stage: null, blood_pressure: null, bp_drop: null });
  assert.deepEqual(actual.high_risk_meds, []);
  assert.equal(typeof actual.primary_recommendation, 'string');
  assert.equal(typeof actual.recommendation_tags, 'string');
  assert.equal(typeof actual.review_time, 'string');
  assert.equal(actual.renal_egfr, null);
  assert.equal(actual.blood_pressure, null);
});

test('fallback SSE pulses carry explicit demo source and cancellation clears its timer', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const reader = createDemoTelemetryStream().getReader();
  const initial = await reader.read();
  const payload = JSON.parse(new TextDecoder().decode(initial.value).slice(6).trim());
  assert.equal(payload.source, 'demo');
  t.mock.timers.tick(3000);
  assert.equal((await reader.read()).done, false);
  await reader.cancel();
  assert.doesNotThrow(() => t.mock.timers.tick(12000));
  assert.equal((await reader.read()).done, true);
});

test('request abort closes fallback SSE and clears its timer', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const controller = new AbortController();
  const reader = createDemoTelemetryStream(controller.signal).getReader();
  await reader.read();
  controller.abort();
  assert.equal((await reader.read()).done, true);
  assert.doesNotThrow(() => t.mock.timers.tick(12000));
});
