/**
 * @file Nothing in the undo tests is skipped, and no undoable op is still out of the history's
 * reach.
 *
 * The undo work landed in phases, and a phase could leave a test skipped or marked pending until
 * a later one ported what it needed. This fails on any marker still in place -- `.skip`, `.todo`,
 * `skipIf`, or a title marked pending -- in the history tests under this directory, the browser
 * history tests and the renderer's doors test, and on any undoable op no door dispatches yet. It
 * stays in the suite so that none can be added later.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { pendingOps } from "./pending-ops";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = path.resolve(here, "../../browser");

/** What marks a test as not running: written in pieces, so this file does not match itself. */
const MARKERS = [
    new RegExp(["\\.", "skip", "\\b"].join("")),
    new RegExp(["\\.", "todo", "\\b"].join("")),
    new RegExp(["skip", "If"].join("")),
    new RegExp(["\\(", "pending", ":"].join("")),
];

/**
 * Every TypeScript file under a directory.
 * @param dir - The directory.
 * @returns Their paths.
 */
function sources(dir: string): string[] {
    return readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((name) => name.endsWith(".ts"))
        .map((name) => path.join(dir, name));
}

/** The files checked: all but this one, which names the markers. */
const FILES = [
    ...sources(here).filter((file) => file !== fileURLToPath(import.meta.url)),
    ...readdirSync(browser)
        .filter((name) => (name.startsWith("history-") && name.endsWith(".ts")) || name === "doors.test.ts")
        .map((name) => path.join(browser, name)),
];

describe("the undo tests", () => {
    it("check the files they should", () => {
        const names = FILES.map((file) => path.basename(file));
        for (const name of ["random-sequences.test.ts", "doors.test.ts", "history-random.test.ts", "scale.test.ts"]) {
            assert.include(names, name);
        }
    });

    it("skip nothing and mark nothing pending", () => {
        const found = FILES.flatMap((file) =>
            readFileSync(file, "utf8")
                .split("\n")
                .flatMap((line, at) =>
                    MARKERS.some((marker) => marker.test(line))
                        ? [`${path.relative(here, file)}:${String(at + 1)}: ${line.trim()}`]
                        : [],
                ),
        );

        assert.deepEqual(found, []);
    });

    it("leave no undoable op out of the history's reach", () => {
        assert.deepEqual(pendingOps(), []);
    });
});
