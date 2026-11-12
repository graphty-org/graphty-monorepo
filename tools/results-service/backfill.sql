-- One batch of copying the duration rows that predate migration 0009's trigger into its summary tables (#5597):
-- the runs after duration_backfill.done, through the run holding the 50,000th row after it (so a batch reads at
-- most 50,000 rows plus one run's), sought by the primary key. Idempotent: an upsert keeps a key's highest run
-- and a run's latest start, as the trigger does, so a batch run twice, or over rows the trigger already copied,
-- changes nothing. results-service.yml runs it until the last statement answers finished = 1; D1 runs the file as
-- one batch, so a batch that fails leaves `done` where it was and the next attempt repeats it.
UPDATE duration_backfill SET hi = min(last, coalesce((SELECT run_id FROM duration NOT INDEXED WHERE run_id > done
  ORDER BY run_id LIMIT 1 OFFSET 49999), last)) WHERE done < last;
INSERT INTO duration_last (kind, workflow, job, step, task, run_id, sha, started_at)
  SELECT kind, workflow, job, step, task, max(run_id), sha, started_at FROM duration NOT INDEXED
  WHERE run_id > (SELECT done FROM duration_backfill) AND run_id <= (SELECT hi FROM duration_backfill)
    AND kind IS NOT NULL AND started_at IS NOT NULL AND coalesce(conclusion, '') != 'cancelled'
  GROUP BY kind, workflow, job, step, task
  ON CONFLICT DO UPDATE SET run_id = excluded.run_id, sha = excluded.sha, started_at = excluded.started_at
    WHERE excluded.run_id >= duration_last.run_id;
INSERT INTO duration_run (kind, workflow, run_id, started_at)
  SELECT kind, workflow, run_id, max(started_at) FROM duration NOT INDEXED
  WHERE run_id > (SELECT done FROM duration_backfill) AND run_id <= (SELECT hi FROM duration_backfill)
    AND kind IS NOT NULL AND started_at IS NOT NULL AND coalesce(conclusion, '') != 'cancelled'
  GROUP BY kind, workflow, run_id
  ON CONFLICT DO UPDATE SET started_at = max(duration_run.started_at, excluded.started_at);
UPDATE duration_backfill SET done = hi WHERE done < last;
SELECT done >= last AS finished, done, last FROM duration_backfill;
