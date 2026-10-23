/**
 * Splitting one project's capture across several machines, and joining the parts again.
 *
 * `capture --shard <i>/<n>` captures part i of n. The parts are fixed by the story ids alone: sorted,
 * the k-th id (from 0) goes to part (k mod n) + 1, so the same stories and the same n give the same
 * parts on every machine, every story is in exactly one part, and no part is empty while there are
 * at least n stories. Neighbouring ids (the slow stories of one file) land in different parts. What
 * no story owns -- a baseline whose story is gone, a rename whose new id is not a story -- is part 1's.
 *
 * A part's results.json says `shard: { index, count, finished }` and is never `complete`, so a part
 * handed to the gate on its own fails it as an unfinished capture. `capture --merge` joins the n
 * finished parts into one directory that holds what an unsharded capture writes, item for item:
 * the same items in the same order, `complete: true`, and every PNG.
 */

import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { validateResults } from "../trusted/lib/results.mjs";

/**
 * Orders strings by UTF-16 code unit, the same on every machine and locale (never localeCompare).
 * @param {string} a one string
 * @param {string} b another
 * @returns {number} negative, zero or positive
 */
const byCodePoint = (a, b) => (a < b ? -1 : Number(a > b));

/**
 * Reads a `--shard` value.
 * @param {string} text `<i>/<n>`, 1 <= i <= n
 * @returns {{ index: number, count: number }} the part and the number of parts
 */
export function parseShard(text) {
    const m = /^(\d{1,4})\/(\d{1,4})$/.exec(text);
    const index = m ? Number(m[1]) : 0;
    const count = m ? Number(m[2]) : 0;
    if (index < 1 || index > count) {
        throw new Error(`--shard must be <i>/<n> with 1 <= i <= n, such as 1/4; got "${text}"`);
    }
    return { index, count };
}

/**
 * Which ids one part captures.
 * @param {string[]} ids the project's story ids (after any --stories filter), in any order
 * @param {{ index: number, count: number } | null} shard the part, or null for all of them
 * @returns {(id: string) => boolean} true for an id of this part; an id not in `ids` is part 1's
 */
export function shardFilter(ids, shard) {
    if (!shard) {
        return () => true;
    }
    const position = new Map([...ids].sort(byCodePoint).map((id, k) => [id, k]));
    return (id) => (position.get(id) ?? 0) % shard.count === shard.index - 1;
}

/** Fields every part of one capture must agree on. */
const SAME = ["version", "project", "commit", "headSha", "pr", "runId", "seeded", "reference", "scale", "clock"];
/**
 * The environment, less the CPU model, which may differ between runners without changing a pixel.
 * @param {object} env a results.json's environment
 * @returns {string} the rest, as JSON
 */
const environment = (env) => JSON.stringify({ ...env, cpu: undefined });

async function readPart(dir) {
    let r;
    try {
        r = JSON.parse(await readFile(join(dir, "results.json"), "utf8"));
    } catch (e) {
        throw new Error(`${dir}: no readable results.json (${e.message})`);
    }
    const problems = validateResults(r);
    if (problems.length > 0) {
        throw new Error(`${dir}/results.json is invalid: ${problems[0]}`);
    }
    if (r.shard?.finished !== true) {
        throw new Error(`${dir}: not a finished part of a sharded capture (capture --shard)`);
    }
    return r;
}

/**
 * Joins the parts of one sharded capture into `out`: results.json as one unsharded capture writes
 * it, and every PNG of every part. Refuses parts of different captures, a missing or repeated part,
 * an unfinished part, and a file two parts both hold.
 * @param {string[]} dirs the parts' output directories, in any order
 * @param {string} out the directory to write; it must not be one of the parts
 * @returns {Promise<object>} the joined results.json contents
 */
export async function mergeShards(dirs, out) {
    if (dirs.some((d) => resolve(d) === resolve(out))) {
        throw new Error("--out must be a new directory, not one of the parts");
    }
    const parts = await Promise.all(dirs.map(readPart));
    const count = parts[0]?.shard.count;
    const indices = parts.map((r) => r.shard.index).sort((a, b) => a - b);
    if (parts.length !== count || parts.some((r, k) => r.shard.count !== count || indices[k] !== k + 1)) {
        const got = parts.map((r) => `${r.shard.index}/${r.shard.count}`).join(", ") || "none";
        throw new Error(`--merge needs every part 1/n to n/n exactly once; got ${got}`);
    }
    const [first] = parts;
    for (const r of parts) {
        const differs = SAME.find((k) => JSON.stringify(r[k]) !== JSON.stringify(first[k]));
        if (differs || environment(r.environment) !== environment(first.environment)) {
            throw new Error(`parts ${first.shard.index} and ${r.shard.index} differ in ${differs ?? "environment"}`);
        }
    }
    await mkdir(out, { recursive: true });
    for (const dir of dirs) {
        for (const e of await readdir(dir, { recursive: true, withFileTypes: true })) {
            const name = relative(dir, join(e.parentPath, e.name));
            if (e.isFile() && !/^results\.json(\.tmp)?$/.test(name)) {
                await mkdir(dirname(join(out, name)), { recursive: true });
                // EXCL: a file two parts both hold is refused, never overwritten.
                await copyFile(join(dir, name), join(out, name), constants.COPYFILE_EXCL);
            }
        }
    }
    const header = { ...first };
    delete header.shard;
    const attempts = parts.map((r) => r.runAttempt).filter((a) => a !== null);
    const merged = {
        ...header,
        // A re-run of one failed part is a later attempt of the same run.
        runAttempt: attempts.length > 0 ? Math.max(...attempts) : null,
        capturedAt: parts.map((r) => r.capturedAt).sort(byCodePoint)[0],
        complete: true,
        expected: parts.reduce((sum, r) => sum + r.expected, 0),
        items: parts.flatMap((r) => r.items).sort((a, b) => (a.file < b.file ? -1 : 1)),
    };
    const problems = validateResults(merged);
    if (problems.length > 0) {
        throw new Error(`the joined results.json is invalid:\n${problems.slice(0, 20).join("\n")}`);
    }
    await writeResults(out, merged);
    return merged;
}

/**
 * Writes results.json through a temporary file, so a reader never sees half of it.
 * @param {string} out the directory
 * @param {object} results the contents
 */
export async function writeResults(out, results) {
    const tmp = join(out, "results.json.tmp");
    await writeFile(tmp, `${JSON.stringify(results, null, 2)}\n`);
    await rename(tmp, join(out, "results.json"));
}
