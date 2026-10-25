// The "On" test configuration (design/ci/channels-pipeline/features.md, section 7): every declared
// experiment switched on, as on a site whose site.json says { "features": ["all"] }. Appended to the
// setupFiles of the "<name>-features-on" projects only (tools/features-on.mjs). The page default covers
// tests that mount graphty-element without the app's ElementHost. In a hook before every test, not at
// import time: a test file's vi.mock of these modules is registered before they first load, and a test
// that resets the site config or the default in its afterEach does not switch On off for the rest of
// its file.
import { beforeEach } from "vitest";

beforeEach(async () => {
    const { setDefaultFeatures } = await import("@graphty/graphty-element/extend");
    const { loadSiteConfig } = await import("../siteConfig");
    setDefaultFeatures(["all"]);
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify({ features: ["all"] }))}`);
});
