import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const LIB = fileURLToPath(new URL("../lib/", import.meta.url));

describe("source scan", () => {
    it("no library code runs git stash, reset, checkout, clean or rebase, or forces a removal or push", () => {
        /** @type {string[]} */
        const files = [];
        const walk = (/** @type {string} */ d) => {
            for (const name of readdirSync(d)) {
                const p = join(d, name);
                if (statSync(p).isDirectory()) walk(p);
                else if (p.endsWith(".mjs")) files.push(p);
            }
        };
        walk(LIB);
        const banned = /["'](stash|reset|checkout|clean|rebase|--force|--force-with-lease)["']/;
        const hits = files.flatMap((f) =>
            readFileSync(f, "utf8")
                .split("\n")
                .map((line, i) => [f, i + 1, line])
                .filter(([, , line]) => banned.test(String(line))),
        );
        expect(hits).toEqual([]);
        expect(files.some((f) => f.endsWith("worktrees.mjs"))).toBe(true);
        expect(files.some((f) => f.endsWith(join("actor", "push.mjs")))).toBe(true);
    });
});
