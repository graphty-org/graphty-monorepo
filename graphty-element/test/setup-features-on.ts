// The "On" test configuration (design/ci/channels-pipeline/features.md, section 7): every declared
// experiment switched on, through setDefaultFeatures (what ./extend exports). Appended to the setupFiles
// of the "<name>-features-on" projects only (tools/features-on.mjs). In a hook before every test, not at
// import time: a test file's vi.mock of the feature registry is registered before the module first loads,
// and a test that resets the default in its afterEach does not switch On off for the rest of its file.
import { beforeEach } from "vitest";

beforeEach(async () => {
    const { setDefaultFeatures } = await import("../src/features/resolve");
    setDefaultFeatures(["all"]);
});
