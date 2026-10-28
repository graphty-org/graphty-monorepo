import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The "./location" and "./projection" entry points must load without Babylon.js installed: they
// import only their own folder's files and these small parsers.
const ALLOWED = ["coordinate-parser", "mgrs", "ngeohash", "utm"];

describe.each(["location", "projection"])("babylonjs-map/%s", (entry) => {
    it("imports nothing from Babylon.js or the rest of the package", () => {
        const dir = join(import.meta.dirname, "../src", entry);
        for (const file of readdirSync(dir)) {
            const source = readFileSync(join(dir, file), "utf8");
            const specifiers = [...source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
            for (const specifier of specifiers) {
                expect(
                    /^\.\/[^/]+$/.test(specifier) || ALLOWED.includes(specifier),
                    `${file} imports ${specifier}`,
                ).toBe(true);
            }
        }
    });
});
