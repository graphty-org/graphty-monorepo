import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { TABLES } from "../../web/src/render.js";

const css = readFileSync(new URL("../../web/src/style.css", import.meta.url), "utf8");

describe("style.css", () => {
    it("gives every table class of render.ts its own column rule, so no table draws one cell per line", () => {
        const missing = [...new Set(Object.values(TABLES).map((t) => t.cls))].filter(
            (cls) => !new RegExp(`\\.${cls} \\.tr\\b`).test(css),
        );
        expect(missing).toEqual([]);
    });
});
