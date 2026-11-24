-- Each story's and each slice unit's newest capture, kept as they are written (#9974). GET /v1/story-captures
-- found them with window functions over story_capture and story_unit, and a self-join for each story's first
-- unapproved render: four passes over a week of rows, about 750,000 rows read a call, and some 900 calls a day spent
-- the Worker's daily D1 read cap (754 million rows on 2026-11-24). Now a read is one row per story and per unit.
--
-- story_newest.first_unapproved: the sha of the story's first changed, new or unseeded render since its last
-- unchanged one, under its newest row's baselines tree (tools/full-run.mjs's pick rule, early-capture.md 4e).
-- ponytail: kept in arrival order, so a late re-run of an older slice, and renders under a tree the story had before
-- its last tree change, no longer count; recompute from story_capture if that ever matters.
CREATE TABLE IF NOT EXISTS story_newest (project TEXT NOT NULL, story TEXT NOT NULL, mode TEXT NOT NULL,
  sha TEXT NOT NULL, baselines_tree TEXT NOT NULL, run_id INTEGER NOT NULL, attempt INTEGER NOT NULL,
  artifact TEXT NOT NULL, status TEXT NOT NULL, hash TEXT, baseline_hash TEXT, at INTEGER NOT NULL,
  first_unapproved TEXT, PRIMARY KEY (project, story, mode)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS unit_newest (project TEXT NOT NULL, unit TEXT NOT NULL, sha TEXT NOT NULL,
  run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (project, unit)) WITHOUT ROWID;
-- the prune on each write reads only rows past their 7 days, as story_capture_at does for story_capture
CREATE INDEX IF NOT EXISTS story_unit_at ON story_unit (at);

-- The rows already stored, once
INSERT OR IGNORE INTO story_newest (project, story, mode, sha, baselines_tree, run_id, attempt, artifact, status, hash,
    baseline_hash, at)
  SELECT project, story, mode, sha, baselines_tree, run_id, attempt, artifact, status, hash, baseline_hash, at
  FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY project, story, mode ORDER BY run_id DESC, attempt DESC) AS rn
        FROM story_capture) WHERE rn = 1;
UPDATE story_newest SET first_unapproved = (SELECT c.sha FROM story_capture c
    WHERE c.project = story_newest.project AND c.story = story_newest.story AND c.mode = story_newest.mode
      AND c.baselines_tree = story_newest.baselines_tree AND c.status IN ('changed', 'new', 'unseeded')
      AND NOT EXISTS (SELECT 1 FROM story_capture u WHERE u.project = c.project AND u.story = c.story
        AND u.mode = c.mode AND u.baselines_tree = c.baselines_tree AND u.status = 'unchanged'
        AND (u.run_id > c.run_id OR (u.run_id = c.run_id AND u.attempt > c.attempt)))
    ORDER BY c.run_id, c.attempt LIMIT 1)
  WHERE status != 'unchanged';
INSERT OR IGNORE INTO unit_newest (project, unit, sha, run_id, attempt, at)
  SELECT project, unit, sha, run_id, attempt, at
  FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY project, unit ORDER BY run_id DESC, attempt DESC) AS rn
        FROM story_unit) WHERE rn = 1;

-- Newest by run id, then attempt, never by write time: a late re-run of an older slice changes nothing
CREATE TRIGGER IF NOT EXISTS story_newest_keep AFTER INSERT ON story_capture
BEGIN
  INSERT INTO story_newest (project, story, mode, sha, baselines_tree, run_id, attempt, artifact, status, hash,
      baseline_hash, at, first_unapproved)
    VALUES (NEW.project, NEW.story, NEW.mode, NEW.sha, NEW.baselines_tree, NEW.run_id, NEW.attempt, NEW.artifact,
      NEW.status, NEW.hash, NEW.baseline_hash, NEW.at,
      CASE WHEN NEW.status = 'unchanged' THEN NULL
        ELSE coalesce((SELECT p.first_unapproved FROM story_newest p WHERE p.project = NEW.project
            AND p.story = NEW.story AND p.mode = NEW.mode AND p.baselines_tree = NEW.baselines_tree),
          CASE WHEN NEW.status IN ('changed', 'new', 'unseeded') THEN NEW.sha END) END)
    ON CONFLICT (project, story, mode) DO UPDATE SET sha = excluded.sha, baselines_tree = excluded.baselines_tree,
      run_id = excluded.run_id, attempt = excluded.attempt, artifact = excluded.artifact, status = excluded.status,
      hash = excluded.hash, baseline_hash = excluded.baseline_hash, at = excluded.at,
      first_unapproved = excluded.first_unapproved
    WHERE excluded.run_id > story_newest.run_id
       OR (excluded.run_id = story_newest.run_id AND excluded.attempt > story_newest.attempt);
END;
CREATE TRIGGER IF NOT EXISTS unit_newest_keep AFTER INSERT ON story_unit
BEGIN
  INSERT INTO unit_newest (project, unit, sha, run_id, attempt, at)
    VALUES (NEW.project, NEW.unit, NEW.sha, NEW.run_id, NEW.attempt, NEW.at)
    ON CONFLICT (project, unit) DO UPDATE SET sha = excluded.sha, run_id = excluded.run_id,
      attempt = excluded.attempt, at = excluded.at
    WHERE excluded.run_id > unit_newest.run_id
       OR (excluded.run_id = unit_newest.run_id AND excluded.attempt > unit_newest.attempt);
END;
