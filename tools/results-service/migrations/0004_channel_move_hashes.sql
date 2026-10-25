-- A nightly promotion's record (design/ci/channels-pipeline/channels.md section 3): release.yml's site job
-- writes the sha256 of the site asset and of channel.json it hung on the site-<sha> prerelease, so promote.yml
-- can refuse an asset someone replaced. Additive: older rows keep NULL.
ALTER TABLE channel_move ADD COLUMN version_commit TEXT;
ALTER TABLE channel_move ADD COLUMN site_sha256 TEXT;
ALTER TABLE channel_move ADD COLUMN channel_sha256 TEXT;
ALTER TABLE channel_move ADD COLUMN run_id INTEGER;
