-- What the D1 bill (#9784) asked for. Rows read and written are what Cloudflare bills, so:
-- A record's flaky check and a plan read's master evidence look up the invocations of one commit, variant and inputs
-- key. With only inv_sha, the flaky check scanned the whole failure table for every master record (about 1.8 million
-- rows a call at a month's history, some 2,600 calls a day). inv_sha_variant serves every lookup inv_sha served.
CREATE INDEX IF NOT EXISTS inv_sha_variant ON invocation(sha, variant, inputs);
DROP INDEX IF EXISTS inv_sha;
-- duration_run rewrote its run's row for every posted duration row (one write each) though only a later start
-- changes it: now only that does.
DROP TRIGGER IF EXISTS duration_summary;
CREATE TRIGGER IF NOT EXISTS duration_summary AFTER INSERT ON duration
WHEN NEW.kind IS NOT NULL AND NEW.started_at IS NOT NULL AND coalesce(NEW.conclusion, '') != 'cancelled'
BEGIN
  INSERT INTO duration_last (kind, workflow, job, step, task, run_id, sha, started_at)
    VALUES (NEW.kind, NEW.workflow, NEW.job, NEW.step, NEW.task, NEW.run_id, NEW.sha, NEW.started_at)
    ON CONFLICT DO UPDATE SET run_id = excluded.run_id, sha = excluded.sha, started_at = excluded.started_at
    WHERE excluded.run_id >= duration_last.run_id;
  INSERT INTO duration_run (kind, workflow, run_id, started_at)
    VALUES (NEW.kind, NEW.workflow, NEW.run_id, NEW.started_at)
    ON CONFLICT DO UPDATE SET started_at = excluded.started_at WHERE excluded.started_at > duration_run.started_at;
END;
-- A variant's per-file median durations (GET /v1/plan fileMs), kept for a few hours: computing them reads the
-- variant's newest 1,000 invocations and every file row of each, and a light check asks for ~48 variants.
CREATE TABLE IF NOT EXISTS file_ms (variant TEXT PRIMARY KEY, body TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID;
-- The Worker's own D1 use per UTC day and route (GET /v1/usage), which its daily caps are checked against. Each
-- isolate adds what it counted every minute or so, so a day holds about one row per route.
CREATE TABLE IF NOT EXISTS usage_day (day TEXT NOT NULL, route TEXT NOT NULL, requests INTEGER NOT NULL,
  rows_read INTEGER NOT NULL, rows_written INTEGER NOT NULL, PRIMARY KEY (day, route)) WITHOUT ROWID;
