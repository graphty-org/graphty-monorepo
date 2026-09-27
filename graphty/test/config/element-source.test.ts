/**
 * The app tests must run the graphty-element the working tree contains, as the dev server and
 * Storybook do. A prebundled copy of the element's dist sits in Vite's dependency cache, which
 * does not refresh when the dist is rebuilt, so the tests would run stale element code.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { Alias } from "vite";
import { describe, expect, it } from "vitest";

import vitestConfig from "../../vitest.config";

const ELEMENT_ROOT = resolve(__dirname, "../../../graphty-element");

/** Resolve an import through an ordered alias list the way Vite does: first match wins. */
function applyAliases(aliases: Alias[], id: string): string {
    for (const { find, replacement } of aliases) {
        if (typeof find === "string" ? id === find || id.startsWith(`${find}/`) : find.test(id)) {
            return id.replace(find, replacement);
        }
    }
    return id;
}

describe("the app test config", () => {
    const aliases = vitestConfig.resolve?.alias as Alias[];

    it.each([
        ["@graphty/graphty-element", "index.ts"],
        ["@graphty/graphty-element/schema", "schema.ts"],
    ])("resolves %s to the element source", (id, file) => {
        const resolved = applyAliases(aliases, id);
        expect(resolved).toBe(resolve(ELEMENT_ROOT, file));
        expect(existsSync(resolved)).toBe(true);
    });

    it("does not prebundle graphty-element", () => {
        expect(vitestConfig.optimizeDeps?.include ?? []).not.toContain("@graphty/graphty-element");
    });
});
