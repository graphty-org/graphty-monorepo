-- The rolling screenshot slices (design/visual-testing/early-capture.md, 4c). story_capture: one row per story a
-- story-slices.yml bin rendered, from commit `sha` and compared with that commit's visual-baselines tree; only a
-- story's newest row counts. story_reach: the story units a master merge can reach (ci.yml's select-graphs job),
-- which orders the next slice. story_notify: when the owner was last told about the rolling queue, by kind.
-- Rows are pruned to each story's newest plus 7 days, the slice artifacts' retention.
CREATE TABLE story_capture (
    project TEXT NOT NULL,
    story TEXT NOT NULL,
    mode TEXT NOT NULL,
    sha TEXT NOT NULL,
    baselines_tree TEXT NOT NULL,
    run_id INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    artifact TEXT NOT NULL,
    status TEXT NOT NULL,
    hash TEXT,
    baseline_hash TEXT,
    at INTEGER NOT NULL,
    PRIMARY KEY (run_id, attempt, project, story, mode)
);
CREATE INDEX story_capture_newest ON story_capture (project, story, mode, at);
CREATE INDEX story_capture_at ON story_capture (at);

CREATE TABLE story_reach (
    sha TEXT NOT NULL,
    unit TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (sha, unit)
);
CREATE INDEX story_reach_at ON story_reach (at);

CREATE TABLE story_notify (
    kind TEXT PRIMARY KEY,
    at INTEGER NOT NULL
);
