-- The held nightly candidate (design/ci/channels-pipeline.md section 3, "Held candidate"): one row at most. A full
-- run that is still not green-clean after its same-commit re-run holds its commit (base); fixes merged forward into
-- branch channel/candidate move head. Promotion or the owner's abandon deletes the row.
CREATE TABLE candidate (id INTEGER PRIMARY KEY CHECK (id = 1), base TEXT NOT NULL, head TEXT NOT NULL,
  issue INTEGER, at INTEGER NOT NULL);
