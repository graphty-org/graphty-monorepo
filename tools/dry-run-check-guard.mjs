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
// Methods that change the object they are called on: called on a name the code did not declare
// itself (`routes.splice(0)`), they change what other code reads.
const MUTATING_METHODS = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill"]);
MUTATING_METHODS.add("copyWithin").add("set").add("delete").add("clear").add("add");
// Ways past every object's own shape.
const META_PROPS = new Set(["__proto__", "prototype", "constructor", "__defineGetter__", "__defineSetter__"]);
// Names that reach the whole runtime, or load code the guard never reads.
const GLOBALS = new Set(["eval", "Function", "globalThis", "global", "require", "module"]);
// Walks and steps also may not reach the process, the browser's window or the language's reflection.
const FREE_GLOBALS = new Set([...GLOBALS, "window", "self", "process", "Proxy", "Reflect"]);
// What a walk or a step may not call on Playwright's page, locators or context: each runs code in the
// page, goes to a URL, answers the page's requests or reaches past the page, where a user only clicks,
// types and chooses files.
const PAGE_ESCAPES = new Set([
    "evaluate",
    "evaluateAll",
    "evaluateHandle",
    "$eval",
    "$$eval",
    "waitForFunction",
    "goto",
    "reload",
    "goBack",
    "goForward",
    "setContent",
    "addInitScript",
    "addScriptTag",
    "addStyleTag",
    "exposeFunction",
    "exposeBinding",
    "route",
    "routeFromHAR",
    "routeWebSocket",
    "unroute",
    "unrouteAll",
    "context",
    "dispatchEvent",
    "setExtraHTTPHeaders",
    "setInputFiles",
    "mainFrame",
    "frames",
    "frame",
    "request",
    "opener",
]);

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
    const units = new Map();
    const nodes = new Map();
    for (const s of sf.statements) {
        const [name, unit] = unitOf(s, sf, label);
        units.set(name, unit);
        nodes.set(name, { node: s, sf });
    }
    return { units, nodes };
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
        const name = `check "${id}: ${c.name ? propName(c.name) : code(c, sf)}"`;
        out.units.set(name, code(c, sf));
        out.nodes.set(name, c);
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
        out.nodes.set(`routes.mjs route "${code(el, sf)}"`, el);
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
            out.nodes.set(`routes.mjs route "${id}" ${key}`, p);
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
 * The names a piece of code declares itself (its parameters and variables), and which of them
 * hold an object it made (`const out = {}`): the only ones it may write through.
 * @param root the code
 * @returns name to whether it holds an object the code made
 */
function localsOf(root) {
    const locals = new Map();
    const fresh = (d) =>
        ts.isVariableDeclarationList(d.parent) &&
        (d.parent.flags & ts.NodeFlags.Const) !== 0 &&
        d.initializer !== undefined &&
        (ts.isObjectLiteralExpression(d.initializer) ||
            ts.isArrayLiteralExpression(d.initializer) ||
            ts.isNewExpression(d.initializer));
    const visit = (n) => {
        if (ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isBindingElement(n)) {
            const own = ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && fresh(n);
            for (const name of identifiers(n.name)) locals.set(name, locals.get(name) || own);
        } else if (ts.isCatchClause(n) && n.variableDeclaration) {
            for (const name of identifiers(n.variableDeclaration.name)) locals.set(name, false);
        }
        ts.forEachChild(n, visit);
    };
    visit(root);
    return locals;
}

/**
 * Whether code may write to a target: a variable it declared, or a property of an object it made.
 * @param target the target expression
 * @param locals the code's own names (localsOf)
 * @returns whether the write stays inside the code
 */
function writable(target, locals) {
    let t = target;
    while (ts.isParenthesizedExpression(t)) t = t.expression;
    if (ts.isIdentifier(t)) return locals.has(t.text);
    if (!ts.isPropertyAccessExpression(t) && !ts.isElementAccessExpression(t)) return false;
    const root = rootName(t);
    return root !== undefined && root !== "this" && locals.get(root) === true;
}

/**
 * What a piece of code does outside itself that could change a verdict: a write to anything it did
 * not declare or make, a mutating call on a name it did not declare, a way past an object's shape,
 * a name that reaches the whole runtime, or a dynamic import. Free code (walks and steps) also may
 * not read a protected name (no alias of `assert` or of the routes), compute a property name, or
 * call one of the page's escapes from the user's hands (PAGE_ESCAPES).
 * @param root the code
 * @param sf its source file
 * @param [free] the protected names, for free code; none for a unit added to a protected file
 * @returns one line per finding, empty for code that keeps to itself
 */
export function scan(root, sf, free = null) {
    const ctx = { locals: localsOf(root), free, sf };
    const found = [];
    const visit = (n) => {
        const why = writeFinding(n, ctx) ?? callFinding(n, ctx) ?? accessFinding(n, ctx) ?? nameFinding(n, ctx);
        if (why) found.push(`${why}: ${code(n, sf)}`);
        else children(n).forEach(visit);
    };
    visit(root);
    return found;
}

/**
 * The parts of a node scan() looks into: not the name of a property read, a property key or a
 * function's own name, which are not variables.
 * @param n the node
 * @returns its children to scan
 */
function children(n) {
    if (ts.isPropertyAccessExpression(n)) return [n.expression];
    const kids = [];
    n.forEachChild((k) => {
        kids.push(k);
    });
    const named = ts.isPropertyAssignment(n) || ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n);
    return named && n.name && !ts.isComputedPropertyName(n.name) ? kids.filter((k) => k !== n.name) : kids;
}

/**
 * A write past the code's own locals: an assignment, ++, delete, Object.assign and the like.
 * @param n the node
 * @param ctx what scan() knows of the code
 * @param ctx.locals the code's own names (localsOf)
 * @param ctx.sf its source file
 * @returns why it is a finding, or nothing
 */
function writeFinding(n, { locals, sf }) {
    const target = writeTarget(n);
    if (target === undefined) return undefined;
    if (!ts.isCallExpression(n))
        return writable(target, locals) ? undefined : `writes to ${rootName(target) ?? code(target, sf)}`;
    if (ts.isObjectLiteralExpression(target) || writable(target, locals)) return undefined;
    return `writes to ${rootName(target) ?? "an object"}`;
}

/**
 * A call that loads code or changes, in place, an object the code did not declare.
 * @param n the node
 * @param ctx what scan() knows of the code
 * @param ctx.locals the code's own names (localsOf)
 * @returns why it is a finding, or nothing
 */
function callFinding(n, { locals }) {
    if (!ts.isCallExpression(n)) return undefined;
    const callee = n.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return "imports code at run time";
    if (!ts.isPropertyAccessExpression(callee) || !MUTATING_METHODS.has(callee.name.text)) return undefined;
    const root = rootName(callee.expression);
    return root === undefined || root === "this" || !locals.has(root)
        ? `changes ${root ?? "an object"} in place`
        : undefined;
}

/**
 * A property read that goes past an object's shape, past the user's hands (free code), or by a
 * computed name (free code).
 * @param n the node
 * @param ctx what scan() knows of the code
 * @param ctx.free the protected names, for free code
 * @returns why it is a finding, or nothing
 */
function accessFinding(n, { free }) {
    let key;
    if (ts.isPropertyAccessExpression(n)) key = n.name.text;
    else if (!ts.isElementAccessExpression(n)) return undefined;
    else if (ts.isStringLiteral(n.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(n.argumentExpression))
        key = n.argumentExpression.text;
    else if (free && !ts.isNumericLiteral(n.argumentExpression) && !ts.isPrefixUnaryExpression(n.argumentExpression))
        return "computes a property name";
    if (META_PROPS.has(key)) return `reaches past an object's shape (${key})`;
    if (free && PAGE_ESCAPES.has(key)) return `goes past the user's hands (${key})`;
    return undefined;
}

/**
 * A name that reaches the whole runtime, or, in free code, `this` or a name the checks rely on.
 * @param n the node
 * @param ctx what scan() knows of the code
 * @param ctx.free the protected names, for free code
 * @returns why it is a finding, or nothing
 */
function nameFinding(n, { free }) {
    if (free && n.kind === ts.SyntaxKind.ThisKeyword) return "reads this";
    if (!ts.isIdentifier(n)) return undefined;
    if ((free ? FREE_GLOBALS : GLOBALS).has(n.text)) return `reaches ${n.text}`;
    return free?.has(n.text) ? `reads ${n.text}, which the checks rely on` : undefined;
}

/**
 * Whether a top-level statement is an import or declares nothing (it runs when the file loads).
 * @param s the statement
 * @returns whether it is
 */
const declaresNothing = (s) => ts.isImportDeclaration(s) || !boundNames(s).length;

/**
 * Add a top-level statement of routes.mjs to its protected units.
 * @param out the units and their nodes
 * @param s the statement
 * @param sf its source file
 * @returns the statement
 */
function addUnit(out, s, sf) {
    const [name, text] = unitOf(s, sf, "routes.mjs");
    out.units.set(name, text);
    out.nodes.set(name, s);
    return s;
}

/**
 * routes.mjs's protected units, and the writes its free code makes to protected names.
 * @param text routes.mjs
 * @returns its units (unit name to code) and the writes its free code makes to protected names
 */
function routesUnits(text) {
    const sf = parse(text);
    const out = { units: new Map(), roots: [], free: [], nodes: new Map() };
    const declared = new Map();
    const imported = [];
    for (const s of sf.statements) {
        const list = routesArray(s);
        if (list) {
            list.elements.forEach((el, i) => routeUnits(el, i, sf, out));
            continue;
        }
        boundNames(s).forEach((n) => declared.set(n, s));
        if (ts.isImportDeclaration(s)) imported.push(...boundNames(s));
        if (declaresNothing(s)) out.roots.push(addUnit(out, s, sf));
    }
    const reached = reach(out.roots, declared);
    for (const s of sf.statements) {
        if (routesArray(s) || declaresNothing(s)) continue;
        if (boundNames(s).some((n) => reached.has(n))) addUnit(out, s, sf);
        else out.free.push(s);
    }
    const names = new Set([...reached, ...imported, "routes", "this", "globalThis"]);
    for (const [name, node] of out.nodes) out.nodes.set(name, { node, sf });
    return { units: out.units, nodes: out.nodes, writes: out.free.flatMap((n) => scan(n, sf, names)) };
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
    const none = { units: new Map(), nodes: new Map(), writes: [] };
    const parts = [
        routes === null ? none : routesUnits(routes),
        readers === null ? none : fileUnits(readers, "readers.mjs"),
        runner === null ? none : fileUnits(runner, "run.mjs"),
    ];
    return {
        units: new Map(parts.flatMap((p) => [...p.units])),
        nodes: new Map(parts.flatMap((p) => [...p.nodes])),
        writes: parts[0].writes,
    };
}

/**
 * The parts a branch adds to the protected files that act outside themselves: an import, a
 * statement that runs on load, or code that scan() finds reaching out. Each counts as a change to
 * what decides a verdict, since it runs beside the protected parts and can change them.
 * @param base the units at the base
 * @param head protectedUnits() at the head
 * @returns one line per such part
 */
export function riskyAdditions(base, head) {
    const out = [];
    for (const [name, { node, sf }] of head.nodes) {
        if (base.has(name)) continue;
        const loads = ts.isStatement(node) && declaresNothing(node);
        const reach = loads ? [] : scan(node, sf);
        if (loads) out.push(`${name} (runs when the file loads)`);
        else if (reach.length) out.push(`${name} (${reach[0]})`);
    }
    return out;
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
            `REFUSED: a walk or a step of the dry run reaches past the user's hands, or into what the checks rely on:\n` +
                after.writes.map((w) => "  " + w).join("\n") +
                "\n" +
                `Steps may only click, type and choose files through the user's hands (graphty/dry-run/README.md).`,
        );
        return 1;
    }
    const { removed, changed } = compare(before.units, after.units);
    // A first version (nothing at the base) is reviewed as a whole; after that, an addition that
    // acts outside itself counts as a change.
    const risky = before.units.size ? riskyAdditions(before.units, after) : [];
    const added = [...after.units.keys()].filter((k) => !before.units.has(k)).length;
    if (!removed.length && !changed.length && !risky.length) {
        console.log(
            `dry-run checks: ${before.units.size} kept, ${added} added, none removed or changed (base ${base.slice(0, 10)})`,
        );
        return 0;
    }
    const { files, messages } = branchCommits(cwd, base, o.head);
    const problems = checkChangeProblems(files, messages);
    const list = [
        ...removed.map((k) => `  removed: ${k}`),
        ...changed.map((k) => `  changed: ${k}`),
        ...risky.map((k) => `  added, acting outside itself: ${k}`),
    ].join("\n");
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

function selfTestReach(assert) {
    const base = protectedUnits({ routes: ROUTES_FIXTURE, readers: READERS_FIXTURE, runner: RUNNER_FIXTURE });
    const head = ({ routes = ROUTES_FIXTURE, readers = READERS_FIXTURE, runner = RUNNER_FIXTURE }) =>
        protectedUnits({ routes, readers, runner });
    const risky = (files) => riskyAdditions(base.units, head(files));
    const neuter = "Object.assign(assert, { equal() {}, ok() {} });\n";
    const top = (text) => ROUTES_FIXTURE.replace("export const routes = [", `${text}export const routes = [`);
    assert.equal(risky({ routes: top(neuter) }).length, 1, "a new top-level statement in routes.mjs is caught");
    const side = 'import assert from "node:assert/strict";\nimport "./patch.mjs";';
    const sideImport = ROUTES_FIXTURE.replace('import assert from "node:assert/strict";', side);
    assert.equal(risky({ routes: sideImport }).length, 1, "a new side-effect import is caught");
    assert.equal(risky({ readers: READERS_FIXTURE + neuter }).length, 1, "a new statement in readers.mjs is caught");
    assert.equal(risky({ runner: RUNNER_FIXTURE + neuter }).length, 1, "a new statement in run.mjs is caught");
    const viaConst = `${READERS_FIXTURE}export const x = ${neuter}`;
    assert.equal(risky({ readers: viaConst }).length, 1, "a new reader that rewrites assert is caught");
    const check = (body) =>
        ROUTES_FIXTURE.replace("        checks: {", `        checks: {\n            z: () => ${body},`);
    assert.equal(risky({ routes: check("routes.splice(1)") }).length, 1, "a new check that drops routes is caught");
    assert.deepEqual(risky({ routes: check("assert.ok(g)") }), [], "an honest new check is free");
    const honest = `${READERS_FIXTURE}export const ids = (page) => page.evaluate(() => { const out = {}; out.a = 1; return out; });\n`;
    assert.deepEqual(risky({ readers: honest }), [], "an honest new reader is free");
    const walk = (line) =>
        head({ routes: ROUTES_FIXTURE.replace("await openIt(u);", `await openIt(u);\n            ${line}`) });
    for (const line of [
        "const a = assert; a.ok = () => {};",
        "for (const r of routes) for (const k in r.checks) r.checks[k] = () => {};",
        "await u.page.evaluate(() => 1);",
        'await u.page.goto("/?sample=x");',
        "await u.page.context().addInitScript(() => 1);",
        'await u.page.route("**", (r) => r.abort());',
        'await u.page["evaluate"](() => 1);',
        "await u.page[name](() => 1);",
        "Array.prototype.includes = () => true;",
        'await import("node:assert/strict");',
        "u.page.x = 1;",
    ])
        assert.ok(walk(line).writes.length, `a walk that runs ${line} is caught`);
    assert.deepEqual(walk('await u.click("Open file");').writes, [], "a walk that clicks is free");
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
    selfTestReach(assert);
    selfTestBranches(assert);
    console.log("dry-run-check-guard self-test: ok");
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
