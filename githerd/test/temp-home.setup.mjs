import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

import { removeTempDirs } from "./helpers/temp-dir.mjs";

// Every test file gets its own temporary HOME, so nothing a test reaches -- the state directory
// ~/.githerd/<repo>/ (lib/store.mjs defaultStateDir), ~/.claude -- is the developer's real one
// (issue #1783). os.homedir() reads HOME, and child processes inherit it.
const home = mkdtempSync(join(tmpdir(), "githerd-test-home-"));
process.env.HOME = home;
// Registered before the test file's own hooks, so it runs after them: a daemon or child process a
// file stops in its afterAll is gone before its directories are (tempDir, helpers/temp-dir.mjs).
afterAll(() => {
    removeTempDirs();
    rmSync(home, { recursive: true, force: true });
});
