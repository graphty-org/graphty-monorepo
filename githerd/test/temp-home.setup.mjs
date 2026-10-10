import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

// Every test file gets its own temporary HOME, so nothing a test reaches -- the state directory
// ~/.githerd/<repo>/ (lib/store.mjs defaultStateDir), ~/.claude -- is the developer's real one
// (issue #1783). os.homedir() reads HOME, and child processes inherit it.
const home = mkdtempSync(join(tmpdir(), "githerd-test-home-"));
process.env.HOME = home;
afterAll(() => rmSync(home, { recursive: true, force: true }));
