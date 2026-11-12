// The "On" test configuration (design/ci/channels-pipeline/features.md, section 7): every declared
// experiment switched on, as on a site whose site.json says { "features": ["all"] }. Appended to the
// setupFiles of the "<name>-features-on" projects only (tools/features-on.mjs). The page default covers
// tests that mount graphty-element without the app's ElementHost. In hooks, not at import time, so a
// test file's vi.mock of these modules is registered before they first load. beforeAll (registered
// before the file's own) covers elements a file mounts in its beforeAll; beforeEach switches On back on
// after a test that reset the site config or the default.
import { beforeAll, beforeEach } from "vitest";

async function switchOn(): Promise<void> {
    const { setDefaultFeatures } = await import("@graphty/graphty-element/extend");
    const { loadSiteConfig } = await import("../siteConfig");
    setDefaultFeatures(["all"]);
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: ["all"] }))}`);
}

beforeAll(switchOn);
beforeEach(switchOn);
