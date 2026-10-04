// Phase 1 Automated Test Suite: DevScope AI Builder Orchestration Bridge
// Asserts end-to-end integration between DUDOS Next.js frontend and FastAPI backend.

import assert from 'node:assert';

const FASTAPI_BASE = 'http://127.0.0.1:8000';
const NEXTJS_BASE = 'http://localhost:3000';
// Must match the builder's DUDOS_SERVICE_TOKEN.
const SERVICE_TOKEN = process.env.DEVSCOPE_SERVICE_TOKEN || '';

async function runTests() {
  console.log('🚀 [PHASE 1 TEST] Starting DevScope Orchestration Bridge verification...\n');

  // Test 1: FastAPI Public Health
  console.log('Test 1: FastAPI Public Health (GET /health)');
  const res1 = await fetch(`${FASTAPI_BASE}/health`);
  assert.strictEqual(res1.status, 200, 'FastAPI /health should return 200');
  const data1 = await res1.json();
  assert.strictEqual(data1.status, 'ok', 'Health status should be ok');
  console.log('  ✅ Passed: FastAPI public health probe responds.\n');

  // Test 2: FastAPI DevScope Integration Probe
  console.log('Test 2: FastAPI DevScope Authenticated Probe (GET /api/v1/integrations/dudos/health)');
  const res2 = await fetch(`${FASTAPI_BASE}/api/v1/integrations/dudos/health`, {
    headers: { 'X-DUDOS-Token': SERVICE_TOKEN },
  });
  assert.strictEqual(res2.status, 200, 'Integration health should return 200');
  const data2 = await res2.json();
  assert.strictEqual(data2.status, 'ok');
  console.log('  ✅ Passed: DevScope integration probe responds.\n');

  // Test 3: Next.js Server-to-Server Health Bridge
  console.log('Test 3: Next.js Server Bridge (GET /api/devscope?view=health)');
  const res3 = await fetch(`${NEXTJS_BASE}/api/devscope?view=health`);
  assert.strictEqual(res3.status, 200, 'Next.js health bridge should return 200');
  const data3 = await res3.json();
  assert.strictEqual(data3.state, 'connected', 'DevScope state should be connected');
  assert.strictEqual(data3.token_configured, true, 'Token must be configured');
  console.log(`  ✅ Passed: Next.js bridge reports state="${data3.state}", token_configured=true.\n`);

  // Test 4: Project Submission via FastAPI Bridge
  console.log('Test 4: Project Submission via FastAPI (POST /api/v1/integrations/dudos/projects)');
  const testRunId = Date.now().toString(36);
  const testIdempKey = 'idemp_test_' + testRunId;
  const testExternalProjId = 'cproj_test_' + testRunId;
  const submissionPayload = {
    source: 'dudos',
    external_project_id: testExternalProjId,
    external_revision: 1,
    idempotency_key: testIdempKey,
    project: {
      name: 'Omni Retail Platform',
      type: 'custom_software',
      business_objective: 'Enterprise eCommerce and point of sale integration',
      target_users: 'Retail staff and online consumers',
      requirements: 'User registration\nProduct catalog\nCart & Checkout\nPayment gateway',
      srs: '1. The system shall support 10,000 daily orders.\n2. The system shall integrate bKash and Nagad.',
      pages: ['Storefront', 'Product Details', 'Checkout', 'Admin Dashboard'],
      features: ['Authentication', 'Catalog Search', 'Order Processing'],
    },
    technology_preferences: {
      platform: 'web',
      backend: 'FastAPI',
      database: 'PostgreSQL',
    },
  };

  const res4 = await fetch(`${FASTAPI_BASE}/api/v1/integrations/dudos/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DUDOS-Token': SERVICE_TOKEN,
      'X-Request-Id': 'req_test_001',
    },
    body: JSON.stringify(submissionPayload),
  });
  assert.strictEqual(res4.status, 200, 'Submit project should return 200');
  const data4 = await res4.json();
  assert(data4.build_id, 'Build ID must be present');
  assert.strictEqual(data4.status, 'submitted', 'Status must be submitted');
  assert.strictEqual(data4.reused, false, 'First submission must have reused=false');
  console.log(`  ✅ Passed: Project submitted with build_id="${data4.build_id}".\n`);

  // Test 5: Idempotency Enforcement (Duplicate Submission)
  console.log('Test 5: Idempotency Verification (Resubmitting identical idempotency_key)');
  const res5 = await fetch(`${FASTAPI_BASE}/api/v1/integrations/dudos/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DUDOS-Token': SERVICE_TOKEN,
    },
    body: JSON.stringify(submissionPayload),
  });
  assert.strictEqual(res5.status, 200);
  const data5 = await res5.json();
  assert.strictEqual(data5.build_id, data4.build_id, 'Must return same build_id');
  assert.strictEqual(data5.reused, true, 'Duplicate submission must return reused=true');
  console.log('  ✅ Passed: Idempotency confirmed: returned identical build_id with reused=true.\n');

  // Test 6: Polling Build Status
  console.log(`Test 6: Polling Build Status (GET /api/v1/integrations/dudos/builds/${data4.build_id})`);
  const res6 = await fetch(`${FASTAPI_BASE}/api/v1/integrations/dudos/builds/${data4.build_id}`);
  assert.strictEqual(res6.status, 200);
  const data6 = await res6.json();
  assert.strictEqual(data6.build_id, data4.build_id);
  assert(data6.status, 'Status must exist');
  assert(data6.preview_url, 'Preview URL must exist');
  console.log(`  ✅ Passed: Polling status returned status="${data6.status}", preview_url="${data6.preview_url}".\n`);

  // Test 7: Approval Gate
  console.log(`Test 7: Approval Gate Submission (POST /api/v1/integrations/dudos/builds/${data4.build_id}/approvals)`);
  const res7 = await fetch(`${FASTAPI_BASE}/api/v1/integrations/dudos/builds/${data4.build_id}/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: 'approved',
      comment: 'Architecture approved by Tech Lead',
    }),
  });
  assert.strictEqual(res7.status, 200);
  const data7 = await res7.json();
  assert.strictEqual(data7.recorded, true, 'Approval must be recorded');
  assert.strictEqual(data7.decision, 'approved');
  console.log('  ✅ Passed: Approval recorded and forwarded.\n');

  // Test 8: Next.js Client Route Submission
  console.log('Test 8: Full End-to-End Next.js Route Submission (POST /api/devscope)');
  const res8 = await fetch(`${NEXTJS_BASE}/api/devscope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: 'cproj_next_002',
      name: 'Cloud Logistics ERP',
      requirements: 'Fleet management and order routing',
      pages: ['Dashboard', 'Tracking', 'Fleet'],
      features: ['GPS Sync', 'Driver App'],
      tech_stack: 'Next.js + FastAPI',
    }),
  });
  assert.strictEqual(res8.status, 200);
  const data8 = await res8.json();
  assert.strictEqual(data8.success, true);
  assert(data8.result.build_id);
  assert(data8.result.customer_status);
  assert(Array.isArray(data8.result.milestones), 'Must return 5 structured milestones');
  assert.strictEqual(data8.result.milestones.length, 5, 'Must have 5 milestones');
  console.log(`  ✅ Passed: Next.js route submitted successfully. Build ID="${data8.result.build_id}", customer_status="${data8.result.customer_status}".\n`);

  console.log('🎉 ALL 8 TESTS PASSED! Phase 1 (DevScope Orchestration Bridge) is 100% verified.');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
