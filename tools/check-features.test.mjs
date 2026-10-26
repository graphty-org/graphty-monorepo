// Tests of tools/check-features.mjs on small fixture trees: a clean tree passes, and each rule fails
// naming what broke it.
//
//   node --test tools/check-features.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { checkFeatures } from "./check-features.mjs";

const TMP = mkdtempSync(join(tmpdir(), "check-features-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
let n = 0;

const registry = (rows, graduated = "") => `
export type FeatureId = "timeline";
export const FEATURES: readonly FeatureDescriptor[] = Object.freeze([
${rows}
]);
export const GRADUATED_FEATURES: readonly string[] = Object.freeze([${graduated}]);
`;
const TIMELINE = `    { id: "timeline", plainName: "Timeline", issue: 3474, since: "2026-10-01" },`;
const RESOLVE = `export function featuresFromUrl(url, param = "features") {\n    return new URL(url).searchParams.getAll(param); // never location.href\n}\n`;
const LAYOUT = `/**\n * The timeline layout.\n * @experimental timeline\n */\nexport const timelineLayout = { id: "timeline-layout", feature: "timeline" };\n`;

// A tree with the registry, the features module, one flagged descriptor and one API report.
function tree(overrides = {}) {
    const root = join(TMP, `t${n++}`);
    const files = {
        "graphty-element/src/features/registry.ts": registry(TIMELINE),
        "graphty-element/src/features/resolve.ts": RESOLVE,
        "graphty-element/src/catalog/layouts.ts": LAYOUT,
        "graphty-element/api/catalog.api.md": "// @public\nexport function featuresFromUrl(url: string): string[];\n",
        ...overrides,
    };
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(root, dirname(path)), { recursive: true });
        writeFileSync(join(root, path), content);
    }
    return root;
}

const problems = (overrides) => checkFeatures(tree(overrides)).problems;

describe("check-features", () => {
    it("passes a clean tree and counts the files that reference each flag", () => {
        const { problems: found, flags } = checkFeatures(tree());
        assert.deepEqual(found, []);
        assert.deepEqual(flags, [
            { id: "timeline", issue: 3474, since: "2026-10-01", files: ["graphty-element/src/catalog/layouts.ts"] },
        ]);
    });

    it("fails an experimental export in the API report, naming it", () => {
        const found = problems({
            "graphty-element/api/index.api.md": "// @beta\nexport function scrubTimeline(at: number): void;\n",
        });
        assert.equal(found.length, 1);
        assert.match(found[0], /index\.api\.md:1: experimental public API "export function scrubTimeline/);
    });

    it("fails an @experimental tag naming no row, or an unknown one", () => {
        const found = problems({
            "graphty-element/src/a.ts": "/**\n * @experimental\n */\nexport const a = 1;\n",
            "graphty-element/src/b.ts": "/**\n * @experimental mapz\n */\nexport const b = 1;\n",
        });
        assert.deepEqual(found, [
            "graphty-element/src/a.ts:2: @experimental names no feature id",
            'graphty-element/src/b.ts:2: @experimental tag names "mapz", which is not in FEATURES',
        ]);
    });

    it("fails a row without a tracking issue", () => {
        const found = problems({
            "graphty-element/src/features/registry.ts": registry(
                `    { id: "timeline", plainName: "Timeline", since: "2026-10-01" },`,
            ),
        });
        assert.deepEqual(found, [
            'graphty-element/src/features/registry.ts: FEATURES row "timeline" names no tracking issue (issue: <number>)',
        ]);
    });

    it("fails a features module that reads the host's URL, storage or environment", () => {
        const found = problems({
            "graphty-element/src/features/resolve.ts": `${RESOLVE}export const fromPage = () => featuresFromUrl(location.href);\nexport const saved = localStorage.getItem("f");\nexport const env = import.meta.env.VITE_FEATURES;\n`,
        });
        assert.equal(found.length, 3);
        assert.match(found[0], /resolve\.ts: the features module reads location/);
        assert.match(found[1], /reads localStorage/);
        assert.match(found[2], /reads import\.meta\.env/);
    });

    it("fails a flagged field without its tag, unknown ids anywhere, and a lingering graduated id", () => {
        const found = problems({
            "graphty-element/src/features/registry.ts": registry(TIMELINE, `"old-map"`),
            "graphty-element/src/catalog/layouts.ts": `export const timelineLayout = { feature: "timeline" };\n`,
            "graphty/src/Panel.tsx": `if (el.features.has("mapz")) show();\nconst legacy = "old-map";\n`,
            "graphty/src/Panel.stories.tsx": `export const S = { parameters: { features: ["timeline", "nope"] } };\n`,
            "graphty/sites/nightly.json": `{ "site": "nightly", "features": ["timeline", "gone"] }\n`,
            "graphty-element/src/errors.ts": `details: { feature: "webllm" },\n`,
        });
        assert.deepEqual(found.sort(), [
            'graphty-element/src/catalog/layouts.ts:1: feature field "timeline" has no @experimental timeline tag in its doc comment',
            'graphty/sites/nightly.json:1: site configuration names "gone", which is not in FEATURES',
            'graphty/src/Panel.stories.tsx:1: story features parameter names "nope", which is not in FEATURES',
            'graphty/src/Panel.tsx:1: features.has call names "mapz", which is not in FEATURES',
            'graphty/src/Panel.tsx:2: graduated feature "old-map" is still named',
        ]);
    });
});
