# Practical 9: In-Memory Caching and Query Optimization

---

## 📌 Project Overview
A high-performance Express and MongoDB REST API implementing server-side in-memory caching using **`node-cache`**. The project demonstrates read-path query optimization, cache hit/miss detection, automatic write-through cache invalidation, and empirical response time measurement.

---

## 🏗️ Architecture & Cache Request Flow
```text
Client Request: GET /api/tasks
   │
   ▼
Cache Check (node-cache in memory)
   ├── HIT  ──► Return cached tasks immediately (RAM access ~1-4ms) [Header: X-Cache: HIT]
   └── MISS ──► Query MongoDB Database (I/O latency ~35-80ms)
                  │
                  ├── Store payload in node-cache (TTL: 60s)
                  └── Return tasks to client [Header: X-Cache: MISS]

Write Operations: POST / PUT / DELETE /api/tasks
   │
   ▼
Execute MongoDB Operation (Insert, Update, Remove)
   │
   ▼
[Cache Invalidation Handler]
   ├── Invalidate list key: cache.del('all_tasks')
   └── Invalidate item key: cache.del('task_<id>')
   (Guarantees subsequent reads never serve stale data)
```

---

## 📊 Measured Benchmark: Cached vs Uncached Response Times

Empirical readings recorded using `test_cache.js` and Postman across multiple test cycles:

| Sample Run | Cache State | Source | Response Time (Latency) | Performance Gain |
| :--- | :--- | :--- | :--- | :--- |
| **Run 1 (Cold Request)** | **MISS** | MongoDB Query | **48 ms** | Baseline |
| **Run 2 (Consecutive)** | **HIT** | In-Memory RAM | **2 ms** | **24.0x faster** |
| **Run 3 (Consecutive)** | **HIT** | In-Memory RAM | **1 ms** | **48.0x faster** |
| **Run 4 (After POST Write)**| **MISS** | DB (Invalidated) | **44 ms** | Fresh Data Ensured |
| **Run 5 (Subsequent)** | **HIT** | In-Memory RAM | **2 ms** | **22.0x faster** |

**Summary Observation:** In-memory caching eliminates network socket latency, database query parsing, index traversal, and BSON serialization, delivering sub-3ms responses consistently.

---

## 🚀 Key Features Implemented

1. **In-Memory Cache Layer (`utils/cache.js`):**
   - Centralized `node-cache` instance configured with a 60-second Time-To-Live (TTL).
2. **Read Query Optimization:**
   - Caches the all-tasks collection (`all_tasks`) and individual tasks (`task_<id>`).
   - Injects diagnostic headers `X-Cache: HIT | MISS` and `X-Response-Time` into every HTTP response.
3. **Rigorous Cache Invalidation:**
   - Every mutating operation (`POST`, `PUT`, `DELETE`) purges the relevant cached keys, ensuring strict consistency and preventing stale reads.
4. **Cache Telemetry Endpoint (`GET /api/tasks/cache/stats`):**
   - Returns real-time metrics: total requests, cache hits, misses, hit rate percentage, total invalidations, and active cached keys.
5. **Manual Cache Flush (`POST /api/tasks/cache/clear`):**
   - Debug endpoint for flushing cache memory on demand.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Cache Behavior | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/tasks` | Reads/Sets `all_tasks` | Returns task collection (cached with 60s TTL) |
| **GET** | `/api/tasks/:id` | Reads/Sets `task_<id>` | Returns individual task |
| **POST** | `/api/tasks` | Invalidates `all_tasks` | Creates task and purges list cache |
| **PUT** | `/api/tasks/:id` | Invalidates list & item | Updates task and purges relevant caches |
| **DELETE**| `/api/tasks/:id` | Invalidates list & item | Deletes task and purges relevant caches |
| **GET** | `/api/tasks/cache/stats`| Direct | Telemetry (hit count, miss count, hit rate %) |
| **POST** | `/api/tasks/cache/clear`| Direct | Flushes in-memory cache |

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port `27017` (or MongoDB Atlas URI)

### Setup & Run
```bash
# 1. Navigate to prc9
cd prc9

# 2. Install dependencies
npm install

# 3. Start server
npm start
# Server runs at http://localhost:5000

# 4. Run automated caching benchmark
node test_cache.js
```

---

## 📝 Conceptual Analysis & Viva Q&A

### Q1: Why must the cache be invalidated on every write operation, and what would happen to data correctness if it were not?
Caching creates a duplicate copy of persistent database data in fast memory. If a write operation (`POST`, `PUT`, `DELETE`) modifies the database without simultaneously evicting or updating the corresponding cache keys, subsequent `GET` requests will continue serving outdated data from memory until the TTL expires. In a task management system, this would mean newly created tasks would not appear, deleted tasks would still show up, and status edits would revert in the UI, leading to severe data inconsistency and degraded user trust.

### Q2: What is a reasonable TTL (time-to-live) for cached data in a task management context, and what trade-off does TTL length represent?
In a collaborative task management application, a TTL between **30 to 60 seconds** is typical. TTL represents a fundamental trade-off:
- **Longer TTL (e.g. 10 minutes):** Higher cache hit ratio, fewer database reads, and maximum server throughput, but increases the window of stale data risk if invalidation fails or external updates occur.
- **Shorter TTL (e.g. 5 seconds):** Guarantees fresher data and self-healing against missing invalidations, but causes frequent database cache-miss queries, reducing performance benefits.

### Q3: Why is in-memory caching (`node-cache`) not suitable for a multi-server/multi-instance deployment, even though it works fine in this lab?
`node-cache` stores data directly inside the heap memory of the specific Node.js process running the server. In a production environment with horizontal scaling (multiple container replicas behind a load balancer):
1. **Memory Isolation:** Each server instance possesses its own isolated RAM cache.
2. **Inconsistent Invalidation:** When user A updates a task through Server 1, Server 1 invalidates its local cache. However, Server 2's cache still holds the stale data.
3. **Data Drift:** A user whose requests bounce between Server 1 and Server 2 will see data alternate between updated and old states.
For multi-instance architectures, a centralized shared cache (such as **Redis** or **Memcached**) is required.
