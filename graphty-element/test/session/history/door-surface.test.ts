/**
 * @file The completeness check of the door list: every public member of every root in
 * `src/session/commands/doors.ts` has a row, every row names a public member, and every type a
 * public member hands back that has methods is itself a root.
 *
 * The declared types are read with the TypeScript compiler by `door-surface-scan.mjs`, in a child
 * process: in this worker under `--coverage` every block of the compiler would be counted, which
 * made building the program about five times slower (see that file). The scan runs once while the
 * file is collected, which has no timeout, as in test/packaging/node-safe-entries.test.ts (#491):
 * it is a fixed amount of compiler work whose wall time grows with how busy the machine is, and
 * in a hook it failed the 10 s hook limit on a machine running several pre-push gates at once.
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { assert, describe, it } from "vitest";

import { DOOR_ROOTS, type DoorRoot } from "../../../src/session/commands/doors";

const SCAN = fileURLToPath(new URL("door-surface-scan.mjs", import.meta.url));

/** What `door-surface-scan.mjs` prints. */
interface Scan {
    /** By `file:Name`: whether it is declared, its public members, and the handles each hands back. */
    roots: Record<string, { declared: boolean; members: string[]; handles: Record<string, string[]> }>;
    /** Every exported class under `src/managers/`, as `file:Name`. */
    managers: string[];
}

const { stdout } = await promisify(execFile)(process.execPath, [SCAN, ...DOOR_ROOTS.map(keyOf)], {
    maxBuffer: 64 * 1024 * 1024,
});
const scan = JSON.parse(stdout) as Scan;

/**
 * A root's key, as `door-surface-scan.mjs` spells one.
 * @param root - The root.
 * @returns `file:Name`.
 */
function keyOf(root: DoorRoot): string {
    return `${root.file}:${root.name}`;
}

/**
 * The scanned declaration of a root, which must exist.
 * @param root - The root.
 * @returns Its public members and their handle types.
 */
function scanned(root: DoorRoot): Scan["roots"][string] {
    const found = scan.roots[keyOf(root)];
    assert.isTrue(found?.declared, `${root.file} declares no class or interface ${root.name}`);

    return found;
}

describe("the door list is complete", () => {
    it("classifies every public member of every root, and names no member that is not one", () => {
        const unclassified: string[] = [];
        const stale: string[] = [];
        for (const root of DOOR_ROOTS) {
            const names = scanned(root).members;
            assert.isTrue(
                (root.doors === undefined) !== (root.whole === undefined),
                `${root.name} must have exactly one of doors and whole`,
            );
            if (root.doors === undefined) {
                continue;
            }

            unclassified.push(
                ...names.filter((name) => !Object.hasOwn(root.doors ?? {}, name)).map((name) => `${root.name}.${name}`),
            );
            stale.push(
                ...Object.keys(root.doors)
                    .filter((name) => !names.includes(name))
                    .map((name) => `${root.name}.${name}`),
            );
        }

        assert.deepEqual(unclassified, [], "public members doors.ts does not classify");
        assert.deepEqual(stale, [], "rows in doors.ts naming no public member");
    });

    it("makes every handle type a public member hands back a root", () => {
        const roots = new Set(DOOR_ROOTS.map(keyOf));
        const escaped = new Map<string, string>();
        for (const root of DOOR_ROOTS) {
            for (const [member, handles] of Object.entries(scanned(root).handles)) {
                for (const handle of handles) {
                    if (!roots.has(handle) && !escaped.has(handle)) {
                        escaped.set(handle, `${root.name}.${member}`);
                    }
                }
            }
        }

        assert.deepEqual(
            Object.fromEntries(escaped),
            {},
            "handle types (and where they were reached) that are not roots",
        );
    });

    it("makes every manager class a root", () => {
        const roots = new Set(DOOR_ROOTS.map(keyOf));
        assert.isNotEmpty(scan.managers);
        assert.deepEqual(
            scan.managers.filter((key) => !roots.has(key)),
            [],
        );
    });
});
