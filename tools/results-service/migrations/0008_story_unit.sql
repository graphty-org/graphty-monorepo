-- When each rolling slice unit (a story file, or one `<file>#<k>/<n>` part of a heavy one) was last captured whole
-- by a story-slices.yml bin (design/visual-testing/early-capture.md, 4a): the slice planner renders the oldest units
-- first. A unit's newest row is the one of its highest run id, then attempt, never of its write time. Pruned with
-- story_capture to each unit's newest plus 7 days.
CREATE TABLE story_unit (
    project TEXT NOT NULL,
    unit TEXT NOT NULL,
    sha TEXT NOT NULL,
    run_id INTEGER NOT NULL,
    attempt INTEGER NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (run_id, attempt, project, unit)
);
CREATE INDEX story_unit_newest ON story_unit (project, unit, run_id, attempt);
