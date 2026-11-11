// The reference pages: docs/reference/cli.md shows each command's --help verbatim, checked block by block against
// what the CLI prints today (when it fails, paste the new help text into the page), and docs/reference/vitest.md
// documents every value the Vitest entry points export.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CLI = fileURLToPath(new URL("../trusted/cli.mjs", import.meta.url));
const PAGE = readFileSync(new URL("../docs/reference/cli.md", import.meta.url), "utf8");

/** Each help block on the page: the command it documents ("" for the top-level help) and the text shown. */
const blocks = [...PAGE.matchAll(/(?:^## ([a-z-]+)\n\n)?```text\n([\s\S]*?)```/gm)].map((m) => ({
    command: m[1] ?? "",
    text: m[2],
}));

/**
 * What `visual-review [command] --help` prints.
 * @param {string} command - the command, or "" for the top-level help
 * @returns {string} its standard output
 */
function help(command) {
    const args = command === "" ? [CLI, "--help"] : [CLI, command, "--help"];
    return spawnSync(process.execPath, args, { encoding: "utf8" }).stdout;
}

describe("the command-line reference page", () => {
    it("documents the top-level help and every command it lists", () => {
        const listed = [...help("").matchAll(/^ {2}([a-z-]+) {2,}/gm)].map((m) => m[1]);
        expect(blocks.map((b) => b.command)).toEqual(["", ...listed]);
    });

    for (const { command, text } of blocks) {
        it(`shows \`${command || "--help"}\` as the CLI prints it`, () => {
            expect(text.trim()).toBe(help(command).trim());
        });
    }
});

describe("the Vitest reference page", () => {
    const page = readFileSync(new URL("../docs/reference/vitest.md", import.meta.url), "utf8");
    for (const file of ["story-test.d.mts", "story-test-setup.d.mts"]) {
        const types = readFileSync(new URL(`../capture/${file}`, import.meta.url), "utf8");
        const exported = [...types.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
        it(`documents every value ${file} exports`, () => {
            expect(exported.length).toBeGreaterThan(0);
            for (const name of exported) {
                expect(page).toContain(`### \`${name}`);
            }
        });
    }
});
