import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The "./location" entry point must load without Babylon.js installed.
describe("babylonjs-map/location", () => {
    it("imports nothing from outside src/location", () => {
        const dir = join(import.meta.dirname, "../src/location");
        for (const file of readdirSync(dir)) {
            const source = readFileSync(join(dir, file), "utf8");
            const specifiers = [...source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
            for (const specifier of specifiers) {
                expect(specifier, `${file} imports ${specifier}`).toMatch(/^\.\/[^/]+$/);
            }
        }
    });
});
