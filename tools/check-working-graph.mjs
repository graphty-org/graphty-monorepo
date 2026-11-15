#!/usr/bin/env node
/**
 * The ratchet on readers that ignore the working graph (design/working-graph/design.md section 9).
 * The owner's agreement (2026-11-07): every reader uses the view -- what the filter and the time
 * window leave shown -- and only a reader that must see everything reads the whole graph, by name.
 *
 * graphty-element/test/contracts/working-graph-readers.test.ts walks the session's public API from
 * its API report and proves every reader reads the view, except the ones listed, with the agreed
 * case each is, in graphty-element/working-graph-whole-readers.json. That test fails on a listed
 * reader that now reads the view or no longer exists. This script keeps the list honest. It fails
 * when:
 *
 *   - the list gains a reader compared with the merge base with the branch the pull request merges
 *     into (no flag or trailer changes that): a new reader reads the view, or names the whole graph;
 *   - a row is malformed: no reader, no reason, a case that is not one of the list's own cases, or a
 *     reader listed twice;
 *   - the list's cases gain one compared with the merge base;
 *   - `accessors` (the functions the local/whole-graph-by-name lint rule lets name the whole graph
 *     with wholeGraph()) gains one, or a row has no file, function, reason or agreed case;
 *   - `accessorOwners` or `workingMints` (the files that hold the store, and that may mark a
 *     snapshot as the working graph) gains a file.
 *
 * Usage: node tools/check-working-graph.mjs              (exit 1 on any of the above)
 *        node tools/check-working-graph.mjs --self-test  (prove each failure fires)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { pushBaseRef } from "./push-base.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LIST = "graphty-element/working-graph-whole-readers.json";

/**
 * What is wrong with the list on its own.
 * @param list - the list
 * @returns the failure messages
 */
function malformed(list) {
    const cases = Array.isArray(list.cases) ? list.cases : [];
    if (cases.length === 0) return [`${LIST}: it names no cases`];
    if (!Array.isArray(list.readers)) return [`${LIST}: it has no readers array`];
    const readers = list.readers.map((row) => row.reader);
    return [
        ...list.readers.flatMap((row) => {
            const problems = [];
            if (!row.reader?.trim()) problems.push(`a row names no reader`);
            if (!row.reason?.trim()) problems.push(`"${row.reader}" has no reason`);
            if (!cases.includes(row.case)) problems.push(`"${row.reader}" has case "${row.case}", not one of ${cases}`);
            return problems;
        }),
        ...readers.filter((reader, at) => readers.indexOf(reader) !== at).map((r) => `"${r}" is listed twice`),
        ...(list.accessors ?? []).flatMap((row) => {
            const problems = [];
            const name = accessorKey(row);
            if (!row.file?.trim() || !row.function?.trim()) problems.push(`an accessor names no file or function`);
            if (!row.reason?.trim()) problems.push(`accessor "${name}" has no reason`);
            if (!cases.includes(row.case))
                problems.push(`accessor "${name}" has case "${row.case}", not one of ${cases}`);
            return problems;
        }),
        ...(list.accessors ?? [])
            .map(accessorKey)
            .filter((key, at, all) => all.indexOf(key) !== at)
            .map((key) => `accessor "${key}" is listed twice`),
    ];
}

/**
 * An accessor row's key.
 * @param row - the row
 * @returns file#function
 */
function accessorKey(row) {
    return `${row.file}#${row.function}`;
}

/**
 * What the head adds to the base.
 * @param base - the list on the merge base
 * @param head - the list being checked
 * @returns the failure messages
 */
function gained(base, head) {
    const before = new Set(base.readers.map((row) => row.reader));
    const cases = new Set(base.cases);
    return [
        ...head.readers
            .filter((row) => !before.has(row.reader))
            .map(
                (row) =>
                    `"${row.reader}" is new. The list only shrinks: read the view, or name the whole graph by its word.`,
            ),
        ...head.cases.filter((each) => !cases.has(each)).map((each) => `case "${each}" is new. The cases only shrink.`),
        ...grown(
            base.accessors?.map(accessorKey),
            head.accessors?.map(accessorKey),
            "accessor",
            "read the working graph",
        ),
        ...grown(base.accessorOwners, head.accessorOwners, "store owner", "read the working graph"),
        ...grown(base.workingMints, head.workingMints, "working-graph mint", "take the view's snapshot"),
    ];
}

/**
 * The entries of a list the head adds, once the base has the list at all.
 * @param base - the base's entries, or undefined before the list landed
 * @param head - the head's entries
 * @param what - what an entry is
 * @param instead - what new code does instead
 * @returns the failure messages
 */
function grown(base, head, what, instead) {
    if (base === undefined) return [];
    const before = new Set(base);
    return (head ?? [])
        .filter((entry) => !before.has(entry))
        .map((entry) => `${what} "${entry}" is new. The list only shrinks: ${instead}.`);
}

/**
 * Accessor rows that no longer match the code: a file that is gone, or one that no longer names the
 * function or calls wholeGraph(). The lint rule is what fails a read outside the list; this keeps a
 * row from outliving the read it allowed.
 * @param root - the checkout
 * @param list - the list
 * @returns the failure messages
 */
function stale(root, list) {
    return (list.accessors ?? []).flatMap((row) => {
        const path = join(root, "graphty-element", row.file);
        if (!existsSync(path)) return [`accessor "${accessorKey(row)}": the file is gone; delete the row`];
        const text = readFileSync(path, "utf8");
        const member = row.function.split(".").at(-1).replace(/^#/, "");
        return text.includes("wholeGraph(") && text.includes(member)
            ? []
            : [`accessor "${accessorKey(row)}": the file no longer reads the whole graph there; delete the row`];
    });
}

/**
 * The list on the merge base. It is absent only before this check first landed.
 * @param root - the checkout
 * @returns the list
 */
function baseList(root) {
    const { env } = process;
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
    const ref = env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : pushBaseRef({ cwd: root });
    const base = git("merge-base", "HEAD", ref).trim();
    if (git("ls-tree", "--name-only", base, LIST).trim() === "") return undefined;
    return JSON.parse(git("show", `${base}:${LIST}`));
}

/**
 * Every failure of the ratchet.
 * @param base - the list on the merge base, or undefined before it landed
 * @param head - the list in this checkout
 * @returns the failure messages
 */
function failures(base, head) {
    const problems = malformed(head);
    return problems.length > 0 || base === undefined ? problems : gained(base, head);
}

/** Proves each failure fires. */
function selfTest() {
    const row = (reader) => ({ reader, case: "filter", reason: "why" });
    const head = { cases: ["filter", "full graph"], readers: [row("a()"), row("b()")] };
    const expect = (name, messages, pattern) => {
        if (!messages.some((m) => pattern.test(m))) throw new Error(`self-test ${name}: got ${messages.join("; ")}`);
    };

    if (failures(head, head).length > 0) throw new Error(`self-test clean: ${failures(head, head).join("; ")}`);
    if (failures(undefined, head).length > 0) throw new Error("self-test first landing: a missing base must pass");
    const shrunk = { ...head, readers: [row("a()")] };
    if (failures(head, shrunk).length > 0) throw new Error("self-test shrink: a shorter list must pass");
    expect("gain", failures(head, { ...head, readers: [...head.readers, row("c()")] }), /is new/);
    expect("gain case", failures(head, { ...head, cases: [...head.cases, "mine"] }), /case "mine" is new/);
    expect("no reason", failures(head, { ...head, readers: [{ reader: "a()", case: "filter" }] }), /no reason/);
    expect("no reader", failures(head, { ...head, readers: [{ case: "filter", reason: "y" }] }), /no reader/);
    expect("bad case", failures(head, { ...head, readers: [{ ...row("a()"), case: "x" }] }), /not one of/);
    expect("repeated", failures(head, { ...head, readers: [row("a()"), row("a()")] }), /listed twice/);
    expect("no cases", failures(head, { ...head, cases: [] }), /no cases/);
    const reach = (fn) => ({ file: "src/a.ts", function: fn, case: "filter", reason: "why" });
    const withReach = { ...head, accessors: [reach("f")], accessorOwners: ["s.ts"], workingMints: ["v.ts"] };
    if (failures(withReach, withReach).length > 0) throw new Error("self-test accessors clean");
    if (failures(head, withReach).length > 0) throw new Error("self-test accessors first landing must pass");
    expect(
        "accessor gain",
        failures(withReach, { ...withReach, accessors: [reach("f"), reach("g")] }),
        /accessor "src\/a.ts#g" is new/,
    );
    expect(
        "owner gain",
        failures(withReach, { ...withReach, accessorOwners: ["s.ts", "t.ts"] }),
        /store owner "t.ts" is new/,
    );
    expect("mint gain", failures(withReach, { ...withReach, workingMints: ["v.ts", "w.ts"] }), /mint "w.ts" is new/);
    expect(
        "accessor no reason",
        failures(withReach, { ...withReach, accessors: [{ ...reach("f"), reason: "" }] }),
        /has no reason/,
    );
    expect(
        "accessor bad case",
        failures(withReach, { ...withReach, accessors: [{ ...reach("f"), case: "x" }] }),
        /not one of/,
    );
    expect(
        "accessor twice",
        failures(withReach, { ...withReach, accessors: [reach("f"), reach("f")] }),
        /listed twice/,
    );
    console.log("check-working-graph: self-test passed");
}

if (process.argv[2] === "--self-test") {
    selfTest();
} else {
    const head = JSON.parse(readFileSync(join(ROOT, LIST), "utf8"));
    const problems = [...failures(baseList(ROOT), head), ...stale(ROOT, head)];
    if (problems.length > 0) {
        for (const problem of problems) console.error(`${LIST}: ${problem}`);
        console.error(`\ncheck-working-graph: ${problems.length} failure(s). Every reader reads the working graph.`);
        process.exit(1);
    }

    console.log(
        `check-working-graph: passed; ${head.readers.length} reader(s) and ${head.accessors?.length ?? 0} accessor(s) read the whole graph by agreement`,
    );
}
