#!/usr/bin/env node
/**
 * Makes round 2's large file, too big for the repository, into <main>/tmp/demo-video/data:
 * fraud-50k.json, the synthetic fraud network (data/round2/make-fraud.mjs) at 50,000 accounts,
 * for the scale chapter. Nothing is downloaded: the bioinformatics scale shot uses the app's own
 * BioPlex 3.0 sample (10,251 proteins), which the app fetches itself.
 *
 *   node tools/demo-video/data/fetch-round2.mjs
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { mkdirp, OUT } from "../lib/env.mjs";

const dir = mkdirp(join(OUT, "data"));
execFileSync(
    process.execPath,
    [join(import.meta.dirname, "round2/make-fraud.mjs"), "--accounts", "50000", "--out", join(dir, "fraud-50k.json")],
    { stdio: "inherit" },
);
