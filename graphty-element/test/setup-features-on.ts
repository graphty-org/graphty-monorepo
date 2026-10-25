// The "On" test configuration (design/ci/channels-pipeline/features.md, section 7): every declared
// experiment switched on, through setDefaultFeatures (what ./extend exports). Appended to the setupFiles
// of the "<name>-features-on" projects only (tools/features-on.mjs). In a hook, not at import time, so a
// test file's vi.mock of the feature registry is registered before the module first loads.
import { beforeAll } from "vitest";

beforeAll(async () => {
    const { setDefaultFeatures } = await import("../src/features/resolve");
    setDefaultFeatures(["all"]);
});
