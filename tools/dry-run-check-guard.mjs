#!/usr/bin/env node
/**
 * dry-run-check-guard.mjs -- refuses a branch that removes or changes an existing outcome check of
 * the dry run (graphty/dry-run/, design/ci/fast-pipeline.md section 4.4), or anything that decides
 * whether a check passes.
 *
 * A dry-run route has steps (what the user does) and outcome checks (what the user then sees). The
 * author of a UI change may re-record steps; weakening a check to make a route pass is what this
 * stops. Everything on the path to a verdict is protected, each part compared, without its comments
 * or layout, with its code at the base:
 *
 *  - in graphty/dry-run/routes.mjs: every check of every route ("<route id>: <check name>"), every
 *    other property of a route but `walk`, every import and top-level statement, and every top-level
 *    declaration a check or a protected part uses, directly or through another. A declaration only
 *    the walks use is a step, and free.
 *  - every top-level statement of graphty/dry-run/readers.mjs (what checks read the page through)
 *    and of graphty/dry-run/run.mjs (the runner: it calls the walks and checks, retries them and
 *    gives the verdict).
 *
 * Adding a route, a check, a step, a helper or a reader is free, and so is changing a walk or a step.
 * A walk or a step that writes to a protected name (`assert.equal = ...`, `this.checks = ...`) is
 * always refused. Removing or changing a protected part is refused unless the branch is a
 * check-change branch: every file its commits change is under graphty/dry-run/, and every one of its
 * commits carries a `Dry-run-check-change: <reason>` trailer. Merge commits are not counted, and
 * neither are commits already on origin/master (a merge of master brings those). Such a
 * branch is made from a different session than the change that made the check fail, and holds only
 * that change.
 *
 *   node tools/dry-run-check-guard.mjs [--base <ref>] [--head <ref>]
 *   node tools/dry-run-check-guard.mjs --self-test
 *
 * --base defaults to the merge base of HEAD with origin/master. Exit 0: allowed (it prints what it
 * compared); 1: refused (it names each part removed or changed and how to proceed); 2: usage.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import ts from "typescript";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

export const ROUTES = "graphty/dry-run/routes.mjs";
export const READERS = "graphty/dry-run/readers.mjs";
export const RUNNER = "graphty/dry-run/run.mjs";
export const TRAILER = "Dry-run-check-change";
const FIRST_ASSIGNMENT = ts.SyntaxKind.FirstAssignment;
const LAST_ASSIGNMENT = ts.SyntaxKind.LastAssignment;
const MUTATORS = /^(?:Object\.(?:assign|defineProperty|defineProperties|setPrototypeOf)|Reflect\.\w+)$/;

const git = (args, cwd, env = process.env) =>
    execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const parse = (text) => ts.createSourceFile("f.mjs", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const isJsDoc = (n) => n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode;

/**
 * A node's code with no comments and no layout: its tokens, one space apart.
 * @param node the node
 * @param sf its source file
 * @returns the code
 */
export function code(node, sf) {
    const kids = node.getChildren(sf).filter((k) => !isJsDoc(k));
    if (!kids.length) return node.getText(sf);
    return kids
        .map((k) => code(k, sf))
        .filter(Boolean)
        .join(" ");
}

/**
 * Every identifier in a node that names a variable (not the `ok` of `assert.ok` or a property key).
 * @param node the node
 * @param out where to add them
 * @returns out
 */
function identifiers(node, out = new Set()) {
    if (ts.isIdentifier(node)) out.add(node.text);
    if (ts.isPropertyAccessExpression(node)) return identifiers(node.expression, out);
    if (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) {
        if (ts.isComputedPropertyName(node.name)) identifiers(node.name, out);
        node.forEachChild((k) => {
            if (k !== node.name) identifiers(k, out);
        });
        return out;
    }
    // forEachChild stops at the first callback that returns something truthy, so return nothing.
    ts.forEachChild(node, (k) => {
        identifiers(k, out);
    });
    return out;
}

/**
 * The names a top-level statement declares (imports included).
 * @param s the statement
 * @returns the names
 */
function boundNames(s) {
    if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) && s.name) return [s.name.text];
    if (ts.isVariableStatement(s)) return s.declarationList.declarations.flatMap((d) => [...identifiers(d.name)]);
    if (ts.isImportDeclaration(s) && s.importClause) return [...identifiers(s.importClause)];
    return [];
}

/**
 * A top-level statement as a protected unit: named by what it declares, or by its code.
 * @param s the statement
 * @param sf its source file
 * @param label the file, for the name
 * @returns [name, code]
 */
function unitOf(s, sf, label) {
    const text = code(s, sf);
    const names = ts.isImportDeclaration(s) ? [] : boundNames(s);
    if (names.length) return [`${label}: ${names.join(", ")}`, text];
    const short =
        text.length > 80
            ? `${text.slice(0, 80)}... (${createHash("sha256").update(text).digest("hex").slice(0, 8)})`
            : text;
    return [`${label}: "${short}"`, text];
}

/**
 * Every top-level statement of a file, as units.
 * @param text the file
 * @param label the file's name in the units' names
 * @returns unit name to code
 */
function fileUnits(text, label) {
    const sf = parse(text);
    return new Map(sf.statements.map((s) => unitOf(s, sf, label)));
}

/**
 * The `routes` array of a statement, when it is `export const routes = [...]`.
 * @param s the statement
 * @returns the array literal, or nothing
 */
function routesArray(s) {
    if (!ts.isVariableStatement(s)) return undefined;
    const d = s.declarationList.declarations.find((x) => ts.isIdentifier(x.name) && x.name.text === "routes");
    return d?.initializer && ts.isArrayLiteralExpression(d.initializer) ? d.initializer : undefined;
}

const propName = (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) ? n.text : n.getText());

/**
 * One route's checks, as units named "<route id>: <check name>".
 * @param checks the object literal of its checks
 * @param id the route's id
 * @param sf the source file
 * @param out the units and protected roots to add to
 */
function checkUnits(checks, id, sf, out) {
    for (const c of checks.properties) {
        out.units.set(`check "${id}: ${c.name ? propName(c.name) : code(c, sf)}"`, code(c, sf));
        out.roots.push(c);
    }
}

/**
 * The units of one route, and the parts of it that are free (its walk).
 * @param el the route's object literal
 * @param i its index, the name of a route without an id
 * @param sf the source file
 * @param out the units, protected roots and free nodes to add to
 */
function routeUnits(el, i, sf, out) {
    if (!ts.isObjectLiteralExpression(el)) {
        out.units.set(`routes.mjs route "${code(el, sf)}"`, code(el, sf));
        out.roots.push(el);
        return;
    }
    const idProp = el.properties.find((p) => p.name && propName(p.name) === "id" && ts.isPropertyAssignment(p));
    const id = idProp && ts.isStringLiteral(idProp.initializer) ? idProp.initializer.text : `#${i}`;
    for (const p of el.properties) {
        const key = p.name ? propName(p.name) : code(p, sf);
        if (key === "walk") {
            out.free.push(p);
        } else if (key === "checks" && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
            checkUnits(p.initializer, id, sf, out);
        } else {
            out.units.set(`routes.mjs route "${id}" ${key}`, code(p, sf));
            out.roots.push(p);
        }
    }
}

/**
 * The top-level names the protected parts use, directly or through other declarations.
 * @param roots the protected parts
 * @param declared top-level name to its statement
 * @returns the names reached
 */
function reach(roots, declared) {
    const reached = new Set();
    const queue = [...roots];
    while (queue.length) {
        for (const name of identifiers(queue.pop())) {
            if (!declared.has(name) || reached.has(name)) continue;
            reached.add(name);
            queue.push(declared.get(name));
        }
    }
    return reached;
}

/**
 * The name an assignment target writes through: `assert` for `assert.ok.x`, `this` for `this.y`.
 * @param target the target expression
 * @returns the name, or nothing
 */
function rootName(target) {
    let t = target;
    while (
        t &&
        (ts.isPropertyAccessExpression(t) || ts.isElementAccessExpression(t) || ts.isParenthesizedExpression(t))
    )
        t = t.expression;
    if (!t) return undefined;
    if (t.kind === ts.SyntaxKind.ThisKeyword) return "this";
    return ts.isIdentifier(t) ? t.text : undefined;
}

/**
 * What a node writes to, if it writes at all.
 * @param n the node
 * @returns the target expression, or nothing
 */
function writeTarget(n) {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= FIRST_ASSIGNMENT && n.operatorToken.kind <= LAST_ASSIGNMENT)
        return n.left;
    if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) {
        const op = n.operator;
        return op === ts.SyntaxKind.PlusPlusToken || op === ts.SyntaxKind.MinusMinusToken ? n.operand : undefined;
    }
    if (ts.isDeleteExpression(n)) return n.expression;
    if (ts.isCallExpression(n) && MUTATORS.test(n.expression.getText())) return n.arguments[0];
    return undefined;
}

/**
 * Writes from free code (walks, steps) to protected names.
 * @param free the free nodes
 * @param names the protected names
 * @param sf the source file
 * @returns one line per write
 */
function freeWrites(free, names, sf) {
    const found = [];
    const visit = (n) => {
        const name = rootName(writeTarget(n));
        if (name && names.has(name)) found.push(`writes to ${name}: ${code(n, sf)}`);
        ts.forEachChild(n, visit);
    };
    free.forEach(visit);
    return found;
}

/**
 * routes.mjs's protected units, and the writes its free code makes to protected names.
 * @param text routes.mjs
 * @returns its units (unit name to code) and the writes its free code makes to protected names
 */
function routesUnits(text) {
    const sf = parse(text);
    const out = { units: new Map(), roots: [], free: [] };
    const declared = new Map();
    const imported = [];
    for (const s of sf.statements) {
        const list = routesArray(s);
        if (list) {
            list.elements.forEach((el, i) => routeUnits(el, i, sf, out));
            continue;
        }
        for (const n of boundNames(s)) declared.set(n, s);
        if (ts.isImportDeclaration(s)) imported.push(...boundNames(s));
        if (ts.isImportDeclaration(s) || !boundNames(s).length) {
            out.units.set(...unitOf(s, sf, "routes.mjs"));
            out.roots.push(s);
        }
    }
    const reached = reach(out.roots, declared);
    for (const s of sf.statements) {
        if (routesArray(s) || ts.isImportDeclaration(s) || !boundNames(s).length) continue;
        if (boundNames(s).some((n) => reached.has(n))) out.units.set(...unitOf(s, sf, "routes.mjs"));
        else out.free.push(s);
    }
    const names = new Set([...reached, ...imported, "routes", "this", "globalThis"]);
    return { units: out.units, writes: freeWrites(out.free, names, sf) };
}

/**
 * Every protected unit of one version of the dry run.
 * @param files each file's text, or null when it does not exist
 * @param [files.routes] routes.mjs
 * @param [files.readers] readers.mjs
 * @param [files.runner] run.mjs
 * @returns the units (unit name to code) and the writes free code makes to protected names
 */
export function protectedUnits({ routes = null, readers = null, runner = null }) {
    const r = routes === null ? { units: new Map(), writes: [] } : routesUnits(routes);
    const units = new Map([
        ...r.units,
        ...(readers === null ? [] : fileUnits(readers, "readers.mjs")),
        ...(runner === null ? [] : fileUnits(runner, "run.mjs")),
    ]);
    return { units, writes: r.writes };
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

/**
 * A branch's own commits: no merge commits, none already on origin/master.
 * @param cwd the repository
 * @param base the base ref
 * @param head the head ref
 * @param env git's environment
 * @returns the files its commits change and their messages
 */
export function branchCommits(cwd, base, head, env = process.env) {
    let master = [];
    try {
        git(["rev-parse", "--verify", "--quiet", "origin/master"], cwd, env);
        master = ["--not", "origin/master"];
    } catch {
        // no origin/master here: every commit since the base is the branch's
    }
    const log = (...format) => git(["log", "--no-merges", ...format, `${base}..${head}`, ...master], cwd, env);
    const files = [...new Set(log("--name-only", "--format=").split("\n").filter(Boolean))];
    const messages = log("--format=%B%x00")
        .split("\0")
        .map((m) => m.trim())
        .filter(Boolean);
    return { files, messages };
}

const show = (ref, path, cwd) => {
    try {
        return git(["show", `${ref}:${path}`], cwd);
    } catch {
        return null;
    }
};

const versionAt = (ref, cwd) =>
    protectedUnits({
        routes: show(ref, ROUTES, cwd),
        readers: show(ref, READERS, cwd),
        runner: show(ref, RUNNER, cwd),
    });

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
    const base = o.base ?? git(["merge-base", o.head, "origin/master"], cwd).trim();
    const before = versionAt(base, cwd);
    const after = versionAt(o.head, cwd);
    if (after.writes.length) {
        console.error(
            `REFUSED: a walk or a step of the dry run writes to something the checks rely on:\n` +
                after.writes.map((w) => "  " + w).join("\n") +
                "\n" +
                `Steps may only drive the page through the user's hands (graphty/dry-run/README.md).`,
        );
        return 1;
    }
    const { removed, changed } = compare(before.units, after.units);
    const added = [...after.units.keys()].filter((k) => !before.units.has(k)).length;
    if (!removed.length && !changed.length) {
        console.log(
            `dry-run checks: ${before.units.size} kept, ${added} added, none removed or changed (base ${base.slice(0, 10)})`,
        );
        return 0;
    }
    const { files, messages } = branchCommits(cwd, base, o.head);
    const problems = checkChangeProblems(files, messages);
    const list = [...removed.map((k) => `  removed: ${k}`), ...changed.map((k) => `  changed: ${k}`)].join("\n");
    if (!problems.length) {
        console.log(`dry-run checks: a check-change branch, allowed:\n${list}`);
        return 0;
    }
    console.error(
        `REFUSED: this branch removes or changes dry-run outcome checks, or code that decides them:\n${list}\n` +
            `A branch may re-record a route's steps, but not weaken what the route checks. If a check is ` +
            `wrong, change it on a branch of its own, from a different session, holding only that change, ` +
            `with a "${TRAILER}: <why>" trailer on every commit (graphty/dry-run/README.md). This branch ` +
            `does not qualify because ${problems.join("; and ")}.`,
    );
    return 1;
}

// ---------------------------------------------------------------- self-test

const ROUTES_FIXTURE = `/** The routes. */
import assert from "node:assert/strict";

/** a step */
async function openIt(u) {
    await u.click("Open");
}

const blue = "#0000FF";
/** the helper */
async function only(g, color) {
    assert.equal(await g.color(), color);
}

export const routes = [
    {
        id: "r1",
        from: "T1",
        async walk(u) {
            await openIt(u);
        },
        checks: {
            "a is blue": async (g) => only(g, blue),
            b: (g) => assert.ok(g),
        },
    },
];
`;
const READERS_FIXTURE = "export const counts = (page) => page;\n";
const RUNNER_FIXTURE = `const CHECK_MS = 15000;
async function eventually(fn, g) {
    for (;;) {
        try {
            return await fn(g);
        } catch (err) {
            if (Date.now() > CHECK_MS) throw err;
        }
    }
}
`;

function selfTestUnits(assert) {
    const units = ({ routes = ROUTES_FIXTURE, readers = READERS_FIXTURE, runner = RUNNER_FIXTURE }) =>
        protectedUnits({ routes, readers, runner });
    const delta = (files) => compare(units({}).units, units(files).units);
    const nothing = { removed: [], changed: [] };
    const free = ROUTES_FIXTURE.replace('"a is blue":', '"a is blue":   ')
        .replace("/** the helper */", "/** the helper, which reads the color */")
        .replace('u.click("Open")', 'u.click("Open file")')
        .replace("        checks: {", '        checks: {\n            "c new": () => 1,')
        .replace(
            "export const routes = [",
            'export const routes = [\n    { id: "r2", async walk() {}, checks: { x: () => 1 } },',
        );
    assert.deepEqual(delta({ routes: free }), nothing, "layout, comments, steps and additions are free");
    assert.deepEqual(delta({ readers: `${READERS_FIXTURE}export const more = 1;\n` }), nothing, "a new reader is free");
    const weaker = ROUTES_FIXTURE.replace("only(g, blue)", "true");
    assert.deepEqual(delta({ routes: weaker }).changed, ['check "r1: a is blue"'], "a changed check is caught");
    assert.deepEqual(delta({ routes: ROUTES_FIXTURE.replace(/ {12}b: .*\n/, "") }).removed, ['check "r1: b"']);
    const helper = ROUTES_FIXTURE.replace("assert.equal(await g.color(), color);", "");
    assert.deepEqual(delta({ routes: helper }).changed, ["routes.mjs: only"], "a weakened helper is caught");
    const loose = ROUTES_FIXTURE.replace("node:assert/strict", "node:assert");
    assert.equal(delta({ routes: loose }).removed.length, 1, "a swapped assert import is caught");
    const noop = ROUTES_FIXTURE.replace(
        'import assert from "node:assert/strict";',
        "const assert = new Proxy(() => {}, { get: () => () => {} });",
    );
    assert.ok(delta({ routes: noop }).removed.length, "a no-op assert in place of the import is caught");
    assert.deepEqual(delta({ routes: ROUTES_FIXTURE.replace('from: "T1"', 'from: "T2"') }).changed, [
        'routes.mjs route "r1" from',
    ]);
    assert.deepEqual(delta({ readers: "export const counts = () => 1;\n" }).changed, ["readers.mjs: counts"]);
    const swallow = RUNNER_FIXTURE.replace("throw err;", "return;");
    assert.deepEqual(delta({ runner: swallow }).changed, ["run.mjs: eventually"], "a weakened runner is caught");
    for (const write of ["assert.equal = () => {};", "this.checks = {};", "only = async () => {};"]) {
        const sneaky = ROUTES_FIXTURE.replace("await openIt(u);", `await openIt(u);\n            ${write}`);
        assert.equal(units({ routes: sneaky }).writes.length, 1, `a walk that runs ${write} is caught`);
    }
    const stepWrite = ROUTES_FIXTURE.replace('await u.click("Open");', "Object.assign(assert, { ok() {} });");
    assert.equal(units({ routes: stepWrite }).writes.length, 1, "a step that rewrites assert is caught");
    assert.deepEqual(units({}).writes, [], "honest steps write nothing protected");
    assert.deepEqual(compare(new Map(), units({}).units), nothing, "a first version protects nothing yet");
}

function selfTestBranches(assert) {
    const reason = `fix(graphty): the check read the wrong column\n\n${TRAILER}: names live in label on this file`;
    assert.deepEqual(checkChangeProblems(["graphty/dry-run/routes.mjs"], [reason]), [], "a check-change branch");
    assert.equal(checkChangeProblems(["graphty/dry-run/routes.mjs", "graphty/src/App.tsx"], [reason]).length, 1);
    assert.equal(checkChangeProblems(["graphty/dry-run/routes.mjs"], ["fix: no trailer"]).length, 1);
    assert.equal(checkChangeProblems(["graphty/dry-run/routes.mjs"], [`x\n\n${TRAILER}: short`]).length, 1);
    // A check-change branch that merged master in: the merge commit has no trailer and is not counted.
    const dir = mkdtempSync(join(tmpdir(), "dry-run-guard-"));
    const env = isolatedGitEnv();
    const g = (...args) => git(args, dir, env).trim();
    const commit = (file, message) => {
        writeFileSync(join(dir, file), message);
        g("add", "-A");
        g("commit", "-q", "-m", message);
    };
    try {
        g("init", "-q", "-b", "master");
        commit("base.txt", "base");
        g("checkout", "-q", "-b", "fix");
        commit("routes.mjs", reason);
        g("checkout", "-q", "master");
        commit("other.txt", "feat: something else on master");
        g("checkout", "-q", "fix");
        g("merge", "-q", "--no-edit", "master");
        const { messages } = branchCommits(dir, g("merge-base", "fix", "master"), "fix", env);
        assert.deepEqual(messages, [reason], "a merge commit is not one of the branch's commits");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

async function selfTest() {
    const assert = (await import("node:assert/strict")).default;
    selfTestUnits(assert);
    selfTestBranches(assert);
    console.log("dry-run-check-guard self-test: ok");
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
