-- POST /v1/durations answers its trend and lastSeen from these, not from a scan of the duration table's 30-day
-- window: that scan grew with every run (about 3 million rows after 8 days) until each post held the single-threaded
-- D1 database past 10 s, and every other read queued behind it (#5597). A trigger keeps both tables, so every
-- writer of duration keeps them. Rows of a cancelled run, or without a kind or start, are left out, as the reads
-- left them out.
-- Schema only: the rows that predate the trigger are copied in by backfill.sql, in bounded batches (0010). Filling
-- them here in one statement held D1 past its storage timeout and the deploy failed (code 7429, #5597). Every
-- statement is IF NOT EXISTS, so it is correct whatever an earlier, failed apply of this file left behind.
-- duration_last: each key's newest sample (highest run id). duration_run: each run of a workflow and kind.
CREATE TABLE IF NOT EXISTS duration_last (kind TEXT NOT NULL, workflow TEXT NOT NULL, job TEXT NOT NULL,
  step TEXT NOT NULL, task TEXT NOT NULL, run_id INTEGER NOT NULL, sha TEXT, started_at INTEGER NOT NULL,
  PRIMARY KEY (kind, workflow, job, step, task)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS duration_run (kind TEXT NOT NULL, workflow TEXT NOT NULL, run_id INTEGER NOT NULL,
  started_at INTEGER NOT NULL, PRIMARY KEY (kind, workflow, run_id)) WITHOUT ROWID;
-- the trend reads a task's newest samples over every job that ran it; only the task rows, so building it writes
-- a fraction of the table
CREATE INDEX IF NOT EXISTS duration_task ON duration(kind, workflow, task, started_at) WHERE task != '';

CREATE TRIGGER IF NOT EXISTS duration_summary AFTER INSERT ON duration
WHEN NEW.kind IS NOT NULL AND NEW.started_at IS NOT NULL AND coalesce(NEW.conclusion, '') != 'cancelled'
BEGIN
  INSERT INTO duration_last (kind, workflow, job, step, task, run_id, sha, started_at)
    VALUES (NEW.kind, NEW.workflow, NEW.job, NEW.step, NEW.task, NEW.run_id, NEW.sha, NEW.started_at)
    ON CONFLICT DO UPDATE SET run_id = excluded.run_id, sha = excluded.sha, started_at = excluded.started_at
    WHERE excluded.run_id >= duration_last.run_id;
  INSERT INTO duration_run (kind, workflow, run_id, started_at)
    VALUES (NEW.kind, NEW.workflow, NEW.run_id, NEW.started_at)
    ON CONFLICT DO UPDATE SET started_at = max(duration_run.started_at, excluded.started_at);
END;
