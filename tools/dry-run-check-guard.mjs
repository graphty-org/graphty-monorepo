#!/usr/bin/env node
/**
 * dry-run-check-guard.mjs -- refuses a branch that removes or changes an existing outcome check of
 * the dry run (graphty/dry-run/, design/ci/fast-pipeline.md section 4.4).
 *
 * A dry-run route has steps (what the user does) and outcome checks (what the user then sees). The
 * author of a UI change may re-record steps; weakening a check to make a route pass is what this
 * stops. Protected, each compared with its text at the base:
 *
 *  - every check of every route in graphty/dry-run/routes.mjs, by "<route id>: <check name>"
 *  - every top-level function and constant of routes.mjs's "what checks read" section, which the
 *    checks call
 *  - every top-level function and constant of graphty/dry-run/readers.mjs, which the checks read
 *    the page through
 *
 * Adding a route, a check, a helper or a reader is free. Removing or changing one is refused unless
 * the branch is a check-change branch: every file it changes is under graphty/dry-run/, and every
 * one of its commits carries a `Dry-run-check-change: <reason>` trailer. Such a branch is made from
 * a different session than the change that made the check fail, and holds only that change.
 *
 *   node tools/dry-run-check-guard.mjs [--base <ref>] [--head <ref>]
 *   node tools/dry-run-check-guard.mjs --self-test
 *
 * --base defaults to the merge base of HEAD with origin/golden. Exit 0: allowed (it prints what it
 * compared); 1: refused (it names each check removed or changed and how to proceed); 2: usage.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const ROUTES = "graphty/dry-run/routes.mjs";
export const READERS = "graphty/dry-run/readers.mjs";
export const TRAILER = "Dry-run-check-change";
const HELPERS_START = /^\/\/ -+ what checks read/m;
const HELPERS_END = /^\/\/ -+ the routes/m;
const DECLARATION = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/;

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const squash = (text) => text.replaceAll(/\s+/g, " ").trim();

/**
 * A file's top-level declarations, by name: each runs from its first line to the next declaration.
 * @param text the source
 * @returns name to its text, whitespace collapsed
 */
export function declarations(text) {
    const out = new Map();
    let name = null;
    let lines = [];
    const flush = () => name && out.set(name, squash(lines.join("\n")));
    for (const line of text.split("\n")) {
        const m = DECLARATION.exec(line);
        if (m) {
            flush();
            name = m[1];
            lines = [];
        }
        if (name) lines.push(line);
    }
    flush();
    return out;
}

/**
 * The "what checks read" section of routes.mjs.
 * @param text routes.mjs's text
 * @returns the section, or nothing when the file has no markers
 */
function helperSection(text) {
    const start = text.search(HELPERS_START);
    const end = text.search(HELPERS_END);
    return start >= 0 && end > start ? text.slice(start, end) : "";
}

/**
 * Every protected unit of one version of the dry run.
 * @param routesText routes.mjs's text, or null when it does not exist
 * @param readersText readers.mjs's text, or null
 * @returns unit name to its text
 */
export async function protectedUnits(routesText, readersText) {
    const units = new Map();
    if (routesText !== null) {
        const dir = mkdtempSync(join(tmpdir(), "dry-run-guard-"));
        try {
            const file = join(dir, "routes.mjs");
            writeFileSync(file, routesText);
            const { routes } = await import(pathToFileURL(file).href);
            for (const r of routes)
                for (const [name, check] of Object.entries(r.checks ?? {}))
                    units.set(`check "${r.id}: ${name}"`, squash(String(check)));
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
        for (const [name, text] of declarations(helperSection(routesText)))
            units.set(`check helper ${name} (routes.mjs)`, text);
    }
    if (readersText !== null)
        for (const [name, text] of declarations(readersText)) units.set(`reader ${name} (readers.mjs)`, text);
    return units;
}

/**
 * What a branch did to the protected units.
 * @param base units at the base
 * @param head units at the head
 * @returns the units removed and changed, by name
 */
export function compare(base, head) {
    const removed = [...base.keys()].filter((k) => !head.has(k));
    const changed = [...base.keys()].filter((k) => head.has(k) && head.get(k) !== base.get(k));
    return { removed, changed };
}

/**
 * Whether a branch is a check-change branch: it changes nothing outside graphty/dry-run/ and every
 * commit states its reason in the trailer.
 * @param files the files the branch changes
 * @param messages its commit messages
 * @returns the reasons it is not, empty when it is
 */
export function checkChangeProblems(files, messages) {
    const problems = [];
    const outside = files.filter((f) => !f.startsWith("graphty/dry-run/"));
    if (outside.length) problems.push(`it also changes files outside graphty/dry-run/: ${outside.join(", ")}`);
    const trailer = new RegExp(String.raw`^${TRAILER}:\s*(.{10,})$`, "m");
    const bare = messages.filter((m) => !trailer.test(m));
    if (!messages.length || bare.length)
        problems.push(`${bare.length || "no"} commit(s) lack a "${TRAILER}: <reason, 10 characters or more>" trailer`);
    return problems;
}

const show = (ref, path, cwd) => {
    try {
        return git(["show", `${ref}:${path}`], cwd);
    } catch {
        return null;
    }
};

async function main(argv) {
    let o;
    try {
        ({ values: o } = parseArgs({
            args: argv,
            options: {
                base: { type: "string" },
                head: { type: "string", default: "HEAD" },
                "self-test": { type: "boolean" },
            },
        }));
    } catch {
        console.error("usage: node tools/dry-run-check-guard.mjs [--base <ref>] [--head <ref>] | --self-test");
        return 2;
    }
    if (o["self-test"]) return selfTest();
    const cwd = git(["rev-parse", "--show-toplevel"]).trim();
    const base = o.base ?? git(["merge-base", o.head, "origin/golden"], cwd).trim();
    const before = await protectedUnits(show(base, ROUTES, cwd), show(base, READERS, cwd));
    const after = await protectedUnits(show(o.head, ROUTES, cwd), show(o.head, READERS, cwd));
    const { removed, changed } = compare(before, after);
    const added = [...after.keys()].filter((k) => !before.has(k)).length;
    if (!removed.length && !changed.length) {
        console.log(
            `dry-run checks: ${before.size} kept, ${added} added, none removed or changed (base ${base.slice(0, 10)})`,
        );
        return 0;
    }
    const files = git(["diff", "--name-only", `${base}...${o.head}`], cwd)
        .split("\n")
        .filter(Boolean);
    const messages = git(["log", "--format=%B%x00", `${base}..${o.head}`], cwd)
        .split("\0")
        .map((m) => m.trim())
        .filter(Boolean);
    const problems = checkChangeProblems(files, messages);
    const list = [...removed.map((k) => `  removed: ${k}`), ...changed.map((k) => `  changed: ${k}`)].join("\n");
    if (!problems.length) {
        console.log(`dry-run checks: a check-change branch, allowed:\n${list}`);
        return 0;
    }
    console.error(
        `REFUSED: this branch removes or changes dry-run outcome checks:\n${list}\n` +
            `A branch may re-record a route's steps, but not weaken what the route checks. If a check is ` +
            `wrong, change it on a branch of its own, from a different session, holding only that change, ` +
            `with a "${TRAILER}: <why>" trailer on every commit (graphty/dry-run/README.md). This branch ` +
            `does not qualify because ${problems.join("; and ")}.`,
    );
    return 1;
}

// ---------------------------------------------------------------- self-test

async function selfTest() {
    const assert = (await import("node:assert/strict")).default;
    const routes = (checks) =>
        `import assert from "node:assert/strict";\n// ---- what checks read\nconst blue = "#0000FF";\nasync function only(g) { assert.ok(g); }\n// ---- the routes\nexport const routes = [{ id: "r1", walk() {}, checks: { ${checks} } }];\n`;
    const base = await protectedUnits(
        routes(`"a is blue": async (g) => only(g, blue), "b": (g) => assert.ok(g)`),
        "export const counts = (page) => page;\n",
    );
    const same = await protectedUnits(
        routes(`"a is blue":   async (g) =>\n only(g, blue), "b": (g) => assert.ok(g), "c new": () => 1`),
        "export const counts = (page) => page;\nexport const more = 1;\n",
    );
    assert.deepEqual(compare(base, same), { removed: [], changed: [] }, "whitespace and additions are free");
    const weaker = await protectedUnits(
        routes(`"a is blue": async (g) => true, "b": (g) => assert.ok(g)`),
        "export const counts = (page) => page;\n",
    );
    assert.deepEqual(compare(base, weaker).changed, ['check "r1: a is blue"'], "a changed check is caught");
    const gone = await protectedUnits(
        routes(`"a is blue": async (g) => only(g, blue)`),
        "export const counts = (page) => page;\n",
    );
    assert.deepEqual(compare(base, gone).removed, ['check "r1: b"'], "a removed check is caught");
    const helper = await protectedUnits(
        routes(`"a is blue": async (g) => only(g, blue), "b": (g) => assert.ok(g)`).replace("assert.ok(g); }", "}"),
        "export const counts = (page) => page;\n",
    );
    assert.deepEqual(compare(base, helper).changed, ["check helper only (routes.mjs)"], "a weakened helper is caught");
    const reader = await protectedUnits(
        routes(`"a is blue": async (g) => only(g, blue), "b": (g) => assert.ok(g)`),
        "export const counts = () => 1;\n",
    );
    assert.deepEqual(compare(base, reader).changed, ["reader counts (readers.mjs)"], "a changed reader is caught");
    assert.deepEqual(compare(new Map(), base), { removed: [], changed: [] }, "a first version protects nothing yet");
    const reason = `fix(graphty): the check read the wrong column\n\n${TRAILER}: names live in label on this file`;
    assert.deepEqual(
        checkChangeProblems(["graphty/dry-run/routes.mjs"], [reason]),
        [],
        "a check-change branch qualifies",
    );
    assert.equal(
        checkChangeProblems(["graphty/dry-run/routes.mjs", "graphty/src/App.tsx"], [reason]).length,
        1,
        "with other files it does not",
    );
    assert.equal(
        checkChangeProblems(["graphty/dry-run/routes.mjs"], ["fix: no trailer"]).length,
        1,
        "without the trailer it does not",
    );
    assert.equal(
        checkChangeProblems(["graphty/dry-run/routes.mjs"], [`x\n\n${TRAILER}: short`]).length,
        1,
        "a reason under 10 characters does not count",
    );
    console.log("dry-run-check-guard self-test: ok");
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
