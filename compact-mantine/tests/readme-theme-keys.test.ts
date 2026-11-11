import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { componentExtensions } from "../src/theme/components";

// The README's mergeThemeOverrides warning lists every theme.components key the theme extends,
// because an override naming one of them replaces the compact treatment (issue #142). This keeps
// that list equal to what the theme actually extends.
describe("README theme component keys", () => {
    it("lists exactly the components the theme extends", () => {
        const readme = readFileSync(path.join(import.meta.dirname, "..", "README.md"), "utf8");
        const block = /<!-- theme-component-keys:start -->([\s\S]*?)<!-- theme-component-keys:end -->/.exec(readme);
        expect(block).not.toBeNull();
        const listed = [...(block?.[1] ?? "").matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1]).sort();
        expect(listed).toEqual(Object.keys(componentExtensions).sort());
    });
});
