-- The run that holds a base check's claim (#7265): the same run asking again (a retry whose first answer was lost)
-- is answered `dispatch: true` again, and only that run may release a claim whose dispatch failed. A row from before
-- this migration has no run, so no run holds it.
ALTER TABLE base_check ADD COLUMN run_id INTEGER;
ALTER TABLE base_check ADD COLUMN attempt INTEGER;
