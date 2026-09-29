/**
 * @file Static: nothing under src/ writes a record's `data` except the attribute writer
 * (design/sets/sets-design.md 6.2). A write that bypasses it bumps no revision, and a resolution
 * cached against that revision answers from values the graph no longer holds.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

/** The writer's own file. */
const WRITER = join("session", "attributes.ts");

/**
 * Writes that stay, each with why a missed revision cannot follow from it. Keyed by file and the
 * exact source line, so a moved line keeps its entry and a new write in the same file does not.
 */
const ALLOWED: readonly (readonly [file: string, line: string, reason: string])[] = [
    [
        join("session", "GraphSession.ts"),
        "this.data = parts.data;",
        "assigns the session's data surface, not a record's attributes",
    ],
    [
        join("session", "GraphSession.ts"),
        "dispatcher.services.data = headlessDataService(store.store, dispatcher, readData);",
        "assigns the dispatcher's data service, not a record's attributes; records are written by the " +
            "graph primitives, which bump every field they change (session/project/graphOps.ts)",
    ],
    [
        join("managers", "DataManager.ts"),
        "dispatcher.services.data = {",
        "assigns the dispatcher's data service, not a record's attributes, as above",
    ],
];

/** `Object.assign(<x>.data` and `<x>.data =` (not `==`). */
const WRITE = /Object\.assign\(\s*[\w.$[\]]*\.data\b|\.data\s*=(?!=)/;

describe("one attribute writer", () => {
    it("src/ writes .data only through writeAttributes and the allowlist", () => {
        const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
        const offenders: string[] = [];
        const used = new Set<number>();

        for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
            if (!entry.endsWith(".ts") || entry === WRITER) {
                continue;
            }

            const lines = readFileSync(join(root, entry), "utf8").split("\n");
            lines.forEach((text, index) => {
                const code = text.trim();
                if (code.startsWith("//") || code.startsWith("*") || !WRITE.test(code)) {
                    return;
                }

                const allowed = ALLOWED.findIndex(([file, line]) => file === entry && line === code);
                if (allowed === -1) {
                    offenders.push(`${entry}:${index + 1}: ${code}`);
                } else {
                    used.add(allowed);
                }
            });
        }

        assert.deepStrictEqual(offenders, [], "route these writes through writeAttributes (session/attributes.ts)");
        assert.deepStrictEqual(
            ALLOWED.filter((_, index) => !used.has(index)).map(([file, line]) => `${file}: ${line}`),
            [],
            "an allowlist entry that matches nothing is stale; remove it",
        );
    });
});
