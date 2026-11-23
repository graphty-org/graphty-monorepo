/**
 * prepush-inputs.mjs -- the workspace's package structure and a content hash of what a test shard
 * reads (its input key), for the test results ledger (tools/results/run-group.mjs), the test selector
 * (tools/test-select.mjs) and pnpm run test:changed (tools/test-changed.mjs).
 *
 * The input key of a test shard is made of what the shard reads, never of the branch name or the
 * commit: the shard's definition, the Node version, the GRAPHTY_ and VK_ environment, the installed
 * lockfile, the rule for judging a shard's run (tools/shard-verdict.mjs), every file outside the
 * workspace packages (root configs, the lockfile, tools/, ...), and every file of the shard's package
 * and of each package it is related to. "Related" is the closure of nx's project graph dependencies
 * and of any path reference to another package's directory in the package's own files
 * (`../layout/...`), which covers tests that read another package without importing it. Nothing git
 * ignores counts (shardKeys says why): not the build outputs, not what a run writes (coverage,
 * reports, caches).
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

import { git as runGit } from "./lib/git.mjs";

const git = (root, args, input) => runGit(args, { cwd: root, input, trim: false, stdio: ["pipe", "pipe", "ignore"] });
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

const sortedEntries = (map) => [...map].sort(([a], [b]) => (a < b ? -1 : 1));

/** The checkout this file is in, whose tools/shard-verdict.mjs judges a shard's run. */
const TOOLS_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The environment that chooses what a shard runs: GRAPHTY_* and VK_* (lanes, GPU and browser
 * choices), without the test-slot bookkeeping.
 * @param env the environment
 * @returns sorted `[name, value]` pairs
 */
function laneEnv(env) {
    return Object.keys(env)
        .filter((k) => /^(GRAPHTY_|VK_)/.test(k) && !k.startsWith("GRAPHTY_TEST_SLOT"))
        .sort()
        .map((k) => [k, env[k]]);
}

/**
 * The workspace's packages from nx: each one's directory, build outputs and dependencies.
 * @param root the checkout
 * @returns `{ roots, outputs, deps }` (Maps by project name), or null when nx cannot answer
 */
export function projectGraph(root) {
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
export function pathRefs(root, roots) {
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
 * @param context the installed lockfile and the rule for judging a run (shardKeys)
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
            env: laneEnv(env),
            files: sortedEntries(counted),
            outputs: sortedEntries(outputs),
            ...context,
        }),
    );
}

/**
 * Input keys for the shards of a checkout. The package structure is read once; each call of the
 * returned function reads the files as they are now.
 *
 * Only what is the same for the same tree anywhere on this machine counts, so the same tree has the
 * same key in every worktree, and nothing a run writes changes its own key. Not the build outputs
 * (dist/): they are built from the files the key holds, but not byte for byte the same in two
 * worktrees: graph-format stamps the commit it was built at into its bundle (and so into every bundle
 * that includes it), nx's cache restores a build made at another commit, and tsbuildinfo records which
 * copy of a type package tsc happened to resolve. Same commit, two worktrees: equal files, nine
 * different dist/ hashes.
 * @param root the checkout
 * @param graph the package structure, projectGraph() by default
 * @returns `() => (shard) => key`, or null when the package structure cannot be read
 */
export function shardKeys(root, graph = projectGraph(root)) {
    if (!graph) {
        return null;
    }
    const byDir = new Map([...graph.roots].map(([name, dir]) => [dir, name]));
    const refs = pathRefs(root, graph.roots);
    return () => {
        const files = treeFiles(root);
        // ponytail: a dist/ left stale by a build that did not run is not seen; a shard run builds first.
        const context = {
            lock: outputHash(join(root, "node_modules/.pnpm/lock.yaml")),
            judge: outputHash(join(TOOLS_ROOT, "tools/shard-verdict.mjs")),
        };
        return (shard) => {
            const name = byDir.get(shard.package);
            if (!name) {
                return null;
            }
            const include = related(name, graph.deps, refs);
            return inputKey(shard, files, graph.roots, include, new Map(), process.env, context);
        };
    };
}
