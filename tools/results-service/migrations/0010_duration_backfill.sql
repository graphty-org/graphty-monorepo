-- Where backfill.sql stands in copying the duration rows that predate 0009's trigger into duration_last and
-- duration_run (#5597). Rows with a run id up to `last` may predate it; each batch copies the runs after `done`
-- up to `hi` and moves `done` on. A row added since is the trigger's, and copying it again changes nothing.
-- One row; max(run_id) reads the end of the primary key, so this costs nothing however big the table is.
CREATE TABLE IF NOT EXISTS duration_backfill (id INTEGER PRIMARY KEY CHECK (id = 1), done INTEGER NOT NULL,
  hi INTEGER NOT NULL, last INTEGER NOT NULL);
INSERT OR IGNORE INTO duration_backfill (id, done, hi, last) SELECT 1, -1, -1, coalesce(max(run_id), -1) FROM duration;
