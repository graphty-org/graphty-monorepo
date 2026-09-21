import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// process.cwd(), not import.meta.url: the default project runs under happy-dom, which rewrites
// import.meta.url to an http: URL (test/helpers/performance-regression.ts:46 locates its file the same way).
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};

describe("graph-format wiring", () => {
    it("declares @graphty/graph-format as a workspace dependency and a caret peer", () => {
        // workspace:^ and not workspace:*: pnpm publishes workspace:* as an EXACT pin, which would
        // lock every consumer of @graphty/algorithms to one graph-format patch (design 17.7 D-PEER-1X).
        expect(packageJson.dependencies?.["@graphty/graph-format"]).toBe("workspace:^");
        expect(packageJson.peerDependencies?.["@graphty/graph-format"]).toBe("^1.0.0");
    });

    it("resolves the format at runtime", async () => {
        const format = await import("@graphty/graph-format");
        expect(format.FORMAT_VERSION).toBe(1);
        expect(typeof format.GraphBuilder).toBe("function");
    });
});
