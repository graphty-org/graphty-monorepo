-- A variant's invocations newest first. A plan read asks each variant for its newest 1,000 runs and its failures of
-- the last 7 days; with only inv_variant_inputs, D1 read every run the variant ever had and sorted them, for each of
-- a light check's ~47 variants, so the read grew with history until most pull requests' plan reads answered
-- HTTP 500 (D1 overloaded) and lost the master excuse and the quarantine (#8208, #8363).
CREATE INDEX IF NOT EXISTS inv_variant_started ON invocation(variant, started_at);
