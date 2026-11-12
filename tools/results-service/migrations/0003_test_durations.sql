-- Per-test duration histories, one JSON blob per test shard, for tools/vitest-time-budget.mjs (the history its
-- VITEST_DURATION_HISTORY file holds: "<project>\0<file>\0<test>" -> the last durations in ms). Additive.
CREATE TABLE test_durations (name TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at INTEGER NOT NULL,
  run_id INTEGER) WITHOUT ROWID;
