-- The results store's schema (design/ci/channels-pipeline/results-service.md, section 4). Changes are additive
-- only: a new migration file, never an edit of this one.
CREATE TABLE invocation (
  id TEXT PRIMARY KEY,      -- "<run_id>.<run_attempt>.<job>.<group>.<try>" or "local.<ms>.<host>.<pid>.<group>"
  kind TEXT NOT NULL,       -- set by the Worker from the credential, never from the body
  sha TEXT NOT NULL, tree TEXT NOT NULL, base_sha TEXT, pr INTEGER, ref TEXT,
  variant TEXT NOT NULL, inputs TEXT NOT NULL, env TEXT NOT NULL,
  try INTEGER NOT NULL,     -- 1 = the run, 2 = the retry of its failed files in the same job
  outcome TEXT NOT NULL,    -- passed | failed | error | infra | cancelled
  reused_from TEXT, dirty INTEGER NOT NULL DEFAULT 0, note TEXT, run_url TEXT,
  started_at INTEGER NOT NULL, secs REAL NOT NULL);
CREATE INDEX inv_variant_inputs ON invocation(variant, inputs, outcome);
CREATE INDEX inv_sha ON invocation(sha);
CREATE TABLE file_run (invocation TEXT NOT NULL, file TEXT NOT NULL,
  passed INTEGER, failed INTEGER, skipped INTEGER, ms INTEGER, PRIMARY KEY (invocation, file)) WITHOUT ROWID;
CREATE TABLE failure (invocation TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  status TEXT NOT NULL, signature TEXT NOT NULL, key TEXT NOT NULL, first_line TEXT,
  message TEXT,             -- first 2,000 characters
  seen_at INTEGER NOT NULL, PRIMARY KEY (invocation, file, name)) WITHOUT ROWID;
CREATE INDEX failure_test ON failure(file, name, key);
CREATE TABLE quarantine (family TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  issue INTEGER, reason TEXT, proof TEXT, since INTEGER NOT NULL, expires INTEGER NOT NULL,
  passes INTEGER NOT NULL DEFAULT 0, left_at INTEGER, left_why TEXT, PRIMARY KEY (family, file, name, since));
CREATE TABLE tracked_issue (signature TEXT PRIMARY KEY, kind TEXT NOT NULL,  -- flaky | failing-on-master | parity
  number INTEGER, state TEXT, opened_at INTEGER, last_seen INTEGER);
CREATE TABLE duration (run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, workflow TEXT NOT NULL,
  job TEXT NOT NULL, step TEXT NOT NULL DEFAULT '', task TEXT NOT NULL DEFAULT '', sha TEXT, kind TEXT,
  started_at INTEGER, ms INTEGER, conclusion TEXT, PRIMARY KEY (run_id, attempt, job, step, task)) WITHOUT ROWID;
