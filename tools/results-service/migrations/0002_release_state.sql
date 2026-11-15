-- The release state the full run and ci.yml's release-due job read (design/ci/channels-pipeline/channels.md,
-- sections 5 and 7). Additive: written by deploy-pages.yml (site) and release.yml (verdict, channel_move).
CREATE TABLE site (sha TEXT PRIMARY KEY, built_at INTEGER NOT NULL, run_id INTEGER);  -- site-<sha> exists
CREATE INDEX site_built ON site(built_at);
CREATE TABLE verdict (run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, sha TEXT NOT NULL,
  state TEXT NOT NULL,      -- green-clean | green-images | red | owner-item | approved | rejected
  lane TEXT, issue INTEGER, at INTEGER NOT NULL, PRIMARY KEY (run_id, attempt, sha, state)) WITHOUT ROWID;
CREATE INDEX verdict_sha ON verdict(sha, at);
CREATE INDEX verdict_at ON verdict(at);
CREATE TABLE channel_move (channel TEXT NOT NULL, sha TEXT NOT NULL, at INTEGER NOT NULL,
  PRIMARY KEY (channel, at)) WITHOUT ROWID;
CREATE INDEX duration_key ON duration(kind, workflow, job, step, task, started_at);
CREATE INDEX file_run_file ON file_run(file);
