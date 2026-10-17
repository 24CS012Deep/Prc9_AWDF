/**
 * Caching & Query Optimization Benchmark Script for Practical 9
 * Measures response times between uncached (database) and cached (in-memory) requests,
 * and confirms cache invalidation on write operations.
 */
async function runCacheBenchmark() {
  const baseUrl = 'http://localhost:5000';
  const readings = [];

  console.log('================================================================');
  console.log(' Practical 9: In-Memory Caching (node-cache) Benchmark Test');
  console.log('================================================================\n');

  try {
    // 0. Flush cache to begin from clean state
    console.log('0. Flushing cache...');
    await fetch(`${baseUrl}/api/tasks/cache/clear`, { method: 'POST' });

    // Request 1: Cache MISS (Uncached, queries database)
    console.log('\n--- Request 1: Expecting Cache MISS (Database Query) ---');
    let t0 = performance.now();
    let res = await fetch(`${baseUrl}/api/tasks`);
    let data = await res.json();
    let duration1 = Math.round(performance.now() - t0);
    let cacheHeader1 = res.headers.get('x-cache') || data.cacheStatus;
    console.log(`Status: ${res.status} | Cache Header: ${cacheHeader1} | Measured Time: ${duration1}ms`);
    readings.push({ test: 'Run 1 (Cold / Uncached)', status: cacheHeader1, latency: `${duration1} ms` });

    // Request 2: Cache HIT (Served immediately from RAM)
    console.log('\n--- Request 2: Expecting Cache HIT (node-cache RAM) ---');
    let t1 = performance.now();
    res = await fetch(`${baseUrl}/api/tasks`);
    data = await res.json();
    let duration2 = Math.round(performance.now() - t1);
    let cacheHeader2 = res.headers.get('x-cache') || data.cacheStatus;
    console.log(`Status: ${res.status} | Cache Header: ${cacheHeader2} | Measured Time: ${duration2}ms`);
    readings.push({ test: 'Run 2 (Cached Hit)', status: cacheHeader2, latency: `${duration2} ms` });

    // Request 3: Cache HIT (Second consecutive hit)
    console.log('\n--- Request 3: Expecting Cache HIT (Second Consecutive) ---');
    let t2 = performance.now();
    res = await fetch(`${baseUrl}/api/tasks`);
    data = await res.json();
    let duration3 = Math.round(performance.now() - t2);
    let cacheHeader3 = res.headers.get('x-cache') || data.cacheStatus;
    console.log(`Status: ${res.status} | Cache Header: ${cacheHeader3} | Measured Time: ${duration3}ms`);
    readings.push({ test: 'Run 3 (Cached Hit)', status: cacheHeader3, latency: `${duration3} ms` });

    // Write Operation: Triggers Cache Invalidation
    console.log('\n--- Write Operation: POST /api/tasks (Should invalidate cache) ---');
    res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Benchmark Task for Cache Invalidation',
        description: 'Verifies cache purging on write',
        priority: 'high'
      })
    });
    data = await res.json();
    console.log(`Status: ${res.status} | Message: ${data.message}`);

    // Request 4: Cache MISS after invalidation
    console.log('\n--- Request 4: Expecting Cache MISS (After Invalidation) ---');
    let t3 = performance.now();
    res = await fetch(`${baseUrl}/api/tasks`);
    data = await res.json();
    let duration4 = Math.round(performance.now() - t3);
    let cacheHeader4 = res.headers.get('x-cache') || data.cacheStatus;
    console.log(`Status: ${res.status} | Cache Header: ${cacheHeader4} | Measured Time: ${duration4}ms`);
    readings.push({ test: 'Run 4 (Post-Invalidation)', status: cacheHeader4, latency: `${duration4} ms` });

    // Telemetry Statistics Endpoint
    console.log('\n--- Cache Telemetry Statistics: GET /api/tasks/cache/stats ---');
    res = await fetch(`${baseUrl}/api/tasks/cache/stats`);
    data = await res.json();
    console.log(JSON.stringify(data.cacheTelemetry, null, 2));

    // Summary Table
    console.log('\n================================================================');
    console.log(' Empirical Response Time Benchmark Summary:');
    console.log('================================================================');
    console.table(readings);
  } catch (err) {
    console.error('Benchmark execution failed:', err.message);
  }
}

runCacheBenchmark();
