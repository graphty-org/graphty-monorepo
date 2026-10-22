#!/usr/bin/env node
/**
 * prepush-inputs.mjs -- content hashes of what the pre-push gate checks, so it never repeats work it
 * has already done on byte-identical inputs.
 *
 * Every key is made of what a check reads, never of the branch name or the commit: a clean merge of a
 * branch into golden has exactly the files the branch tested, so the landing push reuses the branch's
 * passes instead of running them again (design/ci/fast-pipeline.md, section 5.3).
 *
 * - The fingerprint of the whole checkout: HEAD and the content of every file git does not ignore
 *   (tracked or not). tools/push-queue.sh uses it to refuse a commit whose gate already failed.
 * - The gate key of a checkout: the content of every file git does not ignore (not HEAD), the
 *   installed lockfile (node_modules/.pnpm/lock.yaml), the gate's own version (the content of the
 *   gate's tools/ and .husky/, which is .worktrees/gate-live for a push through the queue), the Node
 *   version and the environment that chooses lanes (GRAPHTY_*, VK_*, PREPUSH_ALL).
 *   tools/prepush-source-checks.sh records a pass of the source-only checks under it, and
 *   tools/prepush.sh a pass of the whole gate; tools/push-queue.sh lets a push whose whole gate already
 *   passed skip the source-only checks and the wait for a gate slot.
 * - The input key of a test shard: the shard's definition, the Node version, the GRAPHTY_ and VK_
 *   environment, the installed lockfile, the gate's version, every file outside the workspace packages
 *   (root configs, the lockfile, tools/, ...), every file of the shard's package and of each package it
 *   is related to, and the build outputs (dist/ ...) of those packages. "Related" is the closure of
 *   nx's project graph dependencies and of any path reference to another package's directory in the
 *   package's own files (`../layout/...`), which covers tests that read another package without
 *   importing it. tools/prepush-tests.mjs skips a shard whose key has a recorded pass, and records a
 *   pass only when the key is the same after the run as before it.
 *
 * Passes are kept in <main checkout>/tmp/prepush-passes/<kind>/<key>.json (kind: source, gate or
 * shard), shared by every worktree; records older than 14 days are removed.
 *
 * Usage, from the checkout (the gate is the checkout this file is in):
 *   node tools/prepush-inputs.mjs fingerprint            prints the checkout's fingerprint
 *   node tools/prepush-inputs.mjs key                    prints the checkout's gate key
 *   node tools/prepush-inputs.mjs passed <kind> [key]    prints the pass recorded under the key, or exits 1
 *   node tools/prepush-inputs.mjs record <kind> <key> [note]
 *       records a pass when the checkout's gate key is still <key>, else says so and exits 1
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const git = (root, args, input) =>
    execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        input,
        maxBuffer: 1 << 30,
        stdio: ["pipe", "pipe", "ignore"],
    });
const split0 = (s) => s.split("\0").filter(Boolean);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/**
 * Every file git does not ignore, with a hash of its content as it is on disk now: the index's mode and
 * blob id where the file matches the index, else the mode and `git hash-object` of the file (the same
 * mode and blob id git would give it), so a file has the same id staged or not, committed or not.
 * @param root the checkout
 * @param paths only these paths (git pathspecs); every file when empty
 * @returns Map of repo-relative path to content id
 */
function treeFiles(root, paths = []) {
    const files = new Map();
    const only = paths.length > 0 ? ["--", ...paths] : [];
    for (const line of split0(git(root, ["ls-files", "-s", "-z", ...only]))) {
        const tab = line.indexOf("\t");
        const [mode, blob] = line.slice(0, tab).split(" ");
        files.set(line.slice(tab + 1), `${mode}:${blob}`);
    }
    // Tracked files that differ from the index (or only look as if they might), and untracked ones.
    const dirty = [
        ...split0(git(root, ["diff-files", "--name-only", "-z", ...only])),
        ...split0(git(root, ["ls-files", "-o", "--exclude-standard", "-z", ...only])),
    ];
    const modes = new Map();
    for (const f of dirty) {
        try {
            const st = lstatSync(join(root, f));
            // ponytail: hash-object follows a symlink, so a changed symlink keeps a "w:" id of its own.
            if (st.isFile()) modes.set(f, st.mode & 0o111 ? "100755" : "100644");
            else if (st.isSymbolicLink()) modes.set(f, "w");
        } catch {
            files.delete(f); // deleted in the working tree
        }
    }
    const present = [...modes.keys()];
    if (present.length > 0) {
        const ids = git(root, ["hash-object", "--stdin-paths"], present.join("\n") + "\n")
            .trim()
            .split("\n");
        present.forEach((f, i) => files.set(f, `${modes.get(f)}:${ids[i]}`));
    }
    return files;
}

/**
 * A hash of a file or of a directory's whole content, or "absent".
 * @param path absolute path
 * @returns the hash
 */
export function outputHash(path) {
    const h = createHash("sha256");
    const walk = (p, rel) => {
        const st = lstatSync(p);
        if (st.isSymbolicLink()) {
            h.update(`L ${rel} ${readlinkSync(p)}\0`);
        } else if (st.isDirectory()) {
            for (const name of readdirSync(p).sort()) {
                walk(join(p, name), `${rel}/${name}`);
            }
        } else {
            h.update(`F ${rel} ${st.mode & 0o111 ? "x" : "-"} ${st.size}\0`);
            h.update(readFileSync(p));
        }
    };
    if (!existsSync(path)) {
        return "absent";
    }
    walk(path, ".");
    return h.digest("hex");
}

/**
 * The checkout's fingerprint: HEAD and every file git does not ignore, by content.
 * @param root the checkout
 * @returns hex hash
 */
export function fingerprint(root) {
    const files = treeFiles(root);
    const head = git(root, ["rev-parse", "HEAD"]).trim();
    return sha256(JSON.stringify([head, [...files].sort(([a], [b]) => (a < b ? -1 : 1))]));
}

const sortedEntries = (map) => [...map].sort(([a], [b]) => (a < b ? -1 : 1));

/** The gate whose scripts these are: the checkout this file is in. */
export const GATE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The environment that chooses what the gate runs: GRAPHTY_* and VK_* (lanes, GPU and browser
 * choices) and PREPUSH_ALL, without the test-slot bookkeeping.
 * @param env the environment
 * @returns sorted `[name, value]` pairs
 */
export function laneEnv(env = process.env) {
    return Object.keys(env)
        .filter((k) => /^(GRAPHTY_|VK_)/.test(k) || k === "PREPUSH_ALL")
        .filter((k) => !k.startsWith("GRAPHTY_TEST_SLOT"))
        .sort()
        .map((k) => [k, env[k]]);
}

/**
 * What every key shares besides the checked files: the installed lockfile and the gate's own version.
 * @param root the checkout
 * @param gateRoot the checkout whose tools/ and .husky/ run the gate
 * @returns `{ lock, gate }`
 */
export function gateContext(root, gateRoot = GATE_ROOT) {
    let gate;
    try {
        gate = sortedEntries(treeFiles(gateRoot, ["tools", ".husky"]));
    } catch {
        // a gate copy outside git: its files as they are
        gate = ["tools", ".husky"].map((d) => outputHash(join(gateRoot, d)));
    }
    return { lock: outputHash(join(root, "node_modules/.pnpm/lock.yaml")), gate: sha256(JSON.stringify(gate)) };
}

/**
 * The gate key of a checkout: the content of every file git does not ignore (not HEAD, not the branch),
 * the installed lockfile, the gate's version, the Node version and the lane environment.
 * @param root the checkout
 * @param gateRoot the checkout whose tools/ and .husky/ run the gate
 * @param env the environment
 * @returns hex hash
 */
export function gateKey(root, gateRoot = GATE_ROOT, env = process.env) {
    return sha256(
        JSON.stringify({
            files: sortedEntries(treeFiles(root)),
            ...gateContext(root, gateRoot),
            node: process.version,
            env: laneEnv(env),
        }),
    );
}

/**
 * The workspace's packages from nx: each one's directory, build outputs and dependencies.
 * @param root the checkout
 * @returns `{ roots, outputs, deps }` (Maps by project name), or null when nx cannot answer
 */
function projectGraph(root) {
    if (!existsSync(join(root, "nx.json"))) {
        return null;
    }
    const file = join(root, "tmp", `nx-graph-${process.pid}.json`);
    try {
        mkdirSync(dirname(file), { recursive: true });
        execFileSync("pnpm", ["exec", "nx", "graph", `--file=${file}`], {
            cwd: root,
            stdio: "ignore",
            env: { ...process.env, NX_DAEMON: "false" },
        });
        const { nodes, dependencies } = JSON.parse(readFileSync(file, "utf8")).graph;
        const roots = new Map();
        const outputs = new Map();
        const deps = new Map();
        for (const [name, node] of Object.entries(nodes)) {
            const r = node.data.root;
            roots.set(name, r);
            outputs.set(
                name,
                (node.data.targets?.build?.outputs ?? []).map((o) =>
                    o.replace("{projectRoot}", r).replace("{workspaceRoot}/", "").replace(/^\.\//, ""),
                ),
            );
            deps.set(name, new Set((dependencies[name] ?? []).map((d) => d.target).filter((t) => nodes[t])));
        }
        return { roots, outputs, deps };
    } catch {
        return null;
    } finally {
        try {
            execFileSync("rm", ["-f", file]);
        } catch {
            // nothing to remove
        }
    }
}

/**
 * The packages each package reaches by a relative path in its own files (`../../graph-format/src/x.ts`
 * resolved from the file that names it, or `{workspaceRoot}/algorithms/...`), tracked or not: a test
 * or config that reads another package without importing it. A package that reads another one by a
 * path built at run time declares it in its project.json `implicitDependencies`, which nx's graph has.
 * @param root the checkout
 * @param roots Map of project name to directory
 * @returns Map of project name to the Set of project names it refers to
 */
function pathRefs(root, roots) {
    const byDir = new Map([...roots].map(([name, dir]) => [dir, name]));
    const refs = new Map();
    for (const [name, dir] of roots) {
        let out = "";
        try {
            out = git(root, [
                "grep",
                "-o",
                "-I",
                "--untracked",
                "-E",
                String.raw`(\.\./)+[A-Za-z0-9_.@-]+|\{workspaceRoot\}/[A-Za-z0-9_.@-]+`,
                "--",
                dir,
            ]);
        } catch {
            // git grep exits 1 when nothing matches
        }
        const found = new Set();
        for (const line of out.split("\n")) {
            const colon = line.indexOf(":");
            const [file, ref] = [line.slice(0, colon), line.slice(colon + 1)];
            const target = ref.startsWith("{workspaceRoot}/")
                ? ref.slice("{workspaceRoot}/".length)
                : posix.normalize(posix.join(posix.dirname(file), ref));
            const other = byDir.get(target.split("/")[0]);
            if (other && other !== name) {
                found.add(other);
            }
        }
        refs.set(name, found);
    }
    return refs;
}

/**
 * A package and everything it reaches through the given edges.
 * @param name a project name
 * @param edges Maps of project name to a Set of project names
 * @returns Set of project names, the package included
 */
export function related(name, ...edges) {
    const seen = new Set([name]);
    const todo = [name];
    while (todo.length > 0) {
        const p = todo.pop();
        for (const e of edges) {
            for (const q of e.get(p) ?? []) {
                if (!seen.has(q)) {
                    seen.add(q);
                    todo.push(q);
                }
            }
        }
    }
    return seen;
}

/**
 * The input key of a shard.
 * @param shard the shard's SHARDS entry
 * @param files treeFiles()
 * @param roots Map of every project name to its directory
 * @param include the projects whose files and outputs count (the shard's package and its related ones)
 * @param outputs Map of a build output path to its outputHash(), for the projects in `include`
 * @param env the environment
 * @param context gateContext(): the installed lockfile and the gate's version
 * @returns hex hash
 */
export function inputKey(shard, files, roots, include, outputs, env = process.env, context = {}) {
    const under = (f, dir) => f === dir || f.startsWith(`${dir}/`);
    const all = [...roots.values()];
    const mine = [...include].map((p) => roots.get(p));
    const counted = [...files].filter(([f]) => !all.some((d) => under(f, d)) || mine.some((d) => under(f, d)));
    return sha256(
        JSON.stringify({
            shard,
            node: process.version,
            env: laneEnv(env).filter(([k]) => k !== "PREPUSH_ALL"),
            files: sortedEntries(counted),
            outputs: sortedEntries(outputs),
            ...context,
        }),
    );
}

/**
 * Input keys for the shards of a checkout. The package structure is read once; each call of the
 * returned function reads the files and build outputs as they are now.
 * @param root the checkout
 * @returns `() => (shard) => key`, or null when the package structure cannot be read
 */
export function shardKeys(root) {
    const graph = projectGraph(root);
    if (!graph) {
        return null;
    }
    const byDir = new Map([...graph.roots].map(([name, dir]) => [dir, name]));
    const refs = pathRefs(root, graph.roots);
    return () => {
        const files = treeFiles(root);
        const context = gateContext(root);
        const outputs = new Map();
        return (shard) => {
            const name = byDir.get(shard.package);
            if (!name) {
                return null;
            }
            const include = related(name, graph.deps, refs);
            const mine = new Map();
            for (const p of include) {
                for (const o of graph.outputs.get(p) ?? []) {
                    if (!outputs.has(o)) {
                        outputs.set(o, outputHash(join(root, o)));
                    }
                    mine.set(o, outputs.get(o));
                }
            }
            return inputKey(shard, files, graph.roots, include, mine, process.env, context);
        };
    };
}

/**
 * How many tests a shard's log says passed: the sum over every vitest summary line
 * (`Tests  12 passed | 1 skipped (13)`) in it, terminal colors left out.
 * @param log the shard's whole output
 * @returns the number of passed tests, 0 when the log has no summary
 */
export function testsPassed(log) {
    let n = 0;
    for (const raw of log.split("\n")) {
        // Drop each color code: ESC, "[", digits and semicolons, "m".
        const line = raw
            .split("\u001b[")
            .map((part, i) => (i === 0 ? part : part.slice(part.indexOf("m") + 1)))
            .join("")
            .trim();
        // The number before the first " passed" ("Tests  2 failed | 5 passed (7)" -> 5).
        const at = line.startsWith("Tests ") ? line.indexOf(" passed") : -1;
        let from = at;
        while (from > 0 && line[from - 1] >= "0" && line[from - 1] <= "9") {
            from--;
        }
        n += from < at ? Number(line.slice(from, at)) : 0;
    }
    return n;
}

/**
 * Which shards already passed on these exact inputs.
 * @param shards the shards to run
 * @param keys Map of shard name to its input key (null = unknown)
 * @param passOf the pass recorded under a key, or null (passStore(main).get bound to "shard")
 * @returns `{ run, skipped: [{ shard, pass }] }`
 */
export function partitionByPasses(shards, keys, passOf) {
    const run = [];
    const skipped = [];
    for (const s of shards) {
        const key = keys.get(s.shard);
        const pass = key ? passOf(key) : null;
        if (pass) {
            skipped.push({ shard: s, pass });
        } else {
            run.push(s);
        }
    }
    return { run, skipped };
}

const KEEP_DAYS = 14;

/**
 * The pass records of every branch, kept in <main checkout>/tmp/prepush-passes/<kind>/<key>.json.
 * @param main the main checkout
 * @returns `{ get(kind, key), record(kind, key, entry) }`; get returns the entry or null
 */
export function passStore(main) {
    const dir = (kind) => join(main, "tmp/prepush-passes", kind);
    const file = (kind, key) => {
        if (!/^[a-z]+$/.test(kind) || !/^[0-9a-f]{64}$/.test(key)) {
            throw new Error(`not a pass kind and key: ${kind} ${key}`);
        }
        return join(dir(kind), `${key}.json`);
    };
    const get = (kind, key) => {
        try {
            return JSON.parse(readFileSync(file(kind, key), "utf8"));
        } catch {
            return null;
        }
    };
    const record = (kind, key, entry) => {
        const f = file(kind, key);
        mkdirSync(dir(kind), { recursive: true });
        const old = Date.now() - KEEP_DAYS * 86_400_000;
        for (const name of readdirSync(dir(kind))) {
            try {
                if (statSync(join(dir(kind), name)).mtimeMs < old) rmSync(join(dir(kind), name), { force: true });
            } catch {
                // removed by another process
            }
        }
        const tmp = `${f}.${process.pid}`;
        writeFileSync(tmp, JSON.stringify({ ...entry, key }, null, 2) + "\n");
        renameSync(tmp, f);
    };
    return { get, record };
}

/**
 * Where this checkout's work is: the main checkout (which keeps the records), the branch and the commit.
 * @param root the checkout
 * @returns `{ main, branch, sha }`
 */
function where(root) {
    const out = (args) => {
        try {
            return git(root, args).trim();
        } catch {
            return "";
        }
    };
    return {
        main: dirname(out(["rev-parse", "--path-format=absolute", "--git-common-dir"])),
        branch: out(["symbolic-ref", "--short", "-q", "HEAD"]) || null,
        sha: out(["rev-parse", "HEAD"]) || null,
    };
}

/**
 * The command line: fingerprint, key, passed and record (see the top of this file).
 * @param argv the arguments after the script
 * @param root the checkout
 * @returns the exit code
 */
export function cli(argv, root = process.cwd()) {
    const [command, kind, given, note] = argv;
    if (command === "fingerprint") {
        console.log(fingerprint(root));
        return 0;
    }
    if (command === "key") {
        console.log(gateKey(root));
        return 0;
    }
    if (!["passed", "record"].includes(command) || !kind) {
        console.error("usage: prepush-inputs.mjs fingerprint | key | passed <kind> [key] | record <kind> <key> [note]");
        return 2;
    }
    const { main, branch, sha } = where(root);
    const store = passStore(main);
    if (command === "passed") {
        const pass = store.get(kind, given || gateKey(root));
        if (pass) console.log(JSON.stringify(pass));
        return pass ? 0 : 1;
    }
    if (!given || gateKey(root) !== given) {
        console.error(`prepush-inputs: not recorded: the checkout changed while the ${kind} checks ran`);
        return 1;
    }
    store.record(kind, given, { branch, sha, cwd: root, at: new Date().toISOString(), note: note || undefined });
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    process.exitCode = cli(process.argv.slice(2));
}
