// The "On" test configuration (design/ci/channels-pipeline/features.md, section 7): every declared
// experiment switched on, through setDefaultFeatures (what ./extend exports). Appended to the setupFiles
// of the "<name>-features-on" projects only (tools/features-on.mjs). In hooks, not at import time, so a
// test file's vi.mock of the feature registry is registered before the module first loads. beforeAll
// (registered before the file's own) covers elements a file creates in its beforeAll; beforeEach switches
// On back on after a test that reset the default.
import { beforeAll, beforeEach } from "vitest";

async function switchOn(): Promise<void> {
    const { setDefaultFeatures } = await import("../src/features/resolve");
    setDefaultFeatures(["all"]);
}

beforeAll(switchOn);
beforeEach(switchOn);
