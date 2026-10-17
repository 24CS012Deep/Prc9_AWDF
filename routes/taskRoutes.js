const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const cache = require('../utils/cache');

const ALL_TASKS_KEY = 'all_tasks';
const TASK_KEY_PREFIX = 'task_';

/**
 * GET /api/tasks/cache/stats
 * Telemetry endpoint exposing cache hits, misses, hit ratio, and active keys
 */
router.get('/cache/stats', (req, res) => {
  res.status(200).json({
    success: true,
    cacheTelemetry: cache.getStats()
  });
});

/**
 * POST /api/tasks/cache/clear
 * Manually flushes the entire in-memory cache
 */
router.post('/cache/clear', (req, res) => {
  cache.flush();
  res.status(200).json({
    success: true,
    message: 'In-memory cache successfully flushed.'
  });
});

/**
 * GET /api/tasks
 * Retrieves all tasks with in-memory caching
 */
router.get('/', async (req, res, next) => {
  try {
    const start = Date.now();
    const cachedTasks = cache.get(ALL_TASKS_KEY);

    if (cachedTasks) {
      const responseTime = Date.now() - start;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', `${responseTime}ms`);
      return res.status(200).json({
        success: true,
        source: 'cache',
        cacheStatus: 'HIT',
        responseTimeMs: responseTime,
        count: cachedTasks.length,
        tasks: cachedTasks
      });
    }

    // Cache MISS: Query MongoDB
    const tasks = await Task.find().sort({ createdAt: -1 });

    // Store in cache for subsequent read requests
    cache.set(ALL_TASKS_KEY, tasks);

    const responseTime = Date.now() - start;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    res.status(200).json({
      success: true,
      source: 'database',
      cacheStatus: 'MISS',
      responseTimeMs: responseTime,
      count: tasks.length,
      tasks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 * Retrieves single task with individual cache key
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `${TASK_KEY_PREFIX}${id}`;

    const cachedTask = cache.get(cacheKey);
    if (cachedTask) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        success: true,
        source: 'cache',
        cacheStatus: 'HIT',
        task: cachedTask
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    cache.set(cacheKey, task);
    res.setHeader('X-Cache', 'MISS');

    res.status(200).json({
      success: true,
      source: 'database',
      cacheStatus: 'MISS',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Creates a new task and invalidates the cached task collection
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      completed: completed || false,
      priority: priority || 'medium'
    });

    // Write Invalidation: Purge stale list cache
    cache.del(ALL_TASKS_KEY);

    res.status(201).json({
      success: true,
      message: 'Task created successfully. Cache invalidated.',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Updates task and invalidates both collection cache and item cache
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, completed, priority } = req.body;

    const task = await Task.findByIdAndUpdate(
      id,
      { title, description, completed, priority },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Write Invalidation: Purge both collection and specific task key
    cache.del(ALL_TASKS_KEY);
    cache.del(`${TASK_KEY_PREFIX}${id}`);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully. Cache invalidated.',
      task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Removes task and invalidates relevant caches
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Write Invalidation
    cache.del(ALL_TASKS_KEY);
    cache.del(`${TASK_KEY_PREFIX}${id}`);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully. Cache invalidated.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
