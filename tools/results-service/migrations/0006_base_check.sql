-- A base check a pull request asked for (#3925, results-service.md 6.3): one row per test file, variant and base
-- commit, so ci.yml's base-checks job dispatches base-check.yml once however many pull requests or attempts fail
-- the same untouched test on the same base.
CREATE TABLE base_check (
    base TEXT NOT NULL,
    file TEXT NOT NULL,
    variant TEXT NOT NULL,
    pr INTEGER,
    asked_at INTEGER NOT NULL,
    PRIMARY KEY (base, file, variant)
);
