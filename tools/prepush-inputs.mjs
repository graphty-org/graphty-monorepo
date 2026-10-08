#!/usr/bin/env node
/**
 * prepush-inputs.mjs -- content hashes of what the pre-push gate checks, so it never repeats work it
 * has already done on byte-identical inputs.
 *
 * - The fingerprint of the whole checkout: HEAD and the content of every file git does not ignore
 *   (tracked or not). tools/prepush-source-checks.sh records it when the source-only checks pass, and
 *   tools/prepush.sh skips those checks only when the checkout still has that fingerprint.
 * - The input key of a test shard: the shard's definition, the Node version, the GRAPHTY_ and VK_
 *   environment, every file outside the workspace packages (root configs, the lockfile, tools/, ...),
 *   every file of the shard's package and of each package it is related to, and the build outputs
 *   (dist/ ...) of those packages. "Related" is the closure of nx's project graph dependencies and of
 *   any path reference to another package's directory in the package's own files (`../layout/...`),
 *   which covers tests that read another package without importing it. tools/prepush-tests.mjs skips
 *   a shard whose key equals the key of a run of that shard that PASSED on this branch, and records a
 *   pass only when the key is the same after the run as before it.
 *
 * Usage: node tools/prepush-inputs.mjs fingerprint   (prints the checkout's fingerprint)
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
 * Every file git does not ignore, with a hash of its content as it is on disk now: the index's blob id
 * where the file matches the index, else `git hash-object` of the file (the same blob id git would give it).
 * @param root the checkout
 * @returns Map of repo-relative path to content id
 */
export function treeFiles(root) {
    const files = new Map();
    for (const line of split0(git(root, ["ls-files", "-s", "-z"]))) {
        const tab = line.indexOf("\t");
        const [mode, blob] = line.slice(0, tab).split(" ");
        files.set(line.slice(tab + 1), `${mode}:${blob}`);
    }
    // Tracked files that differ from the index (or only look as if they might), and untracked ones.
    const dirty = [
        ...split0(git(root, ["diff-files", "--name-only", "-z"])),
        ...split0(git(root, ["ls-files", "-o", "--exclude-standard", "-z"])),
    ];
    const present = dirty.filter((f) => {
        try {
            return lstatSync(join(root, f)).isFile() || lstatSync(join(root, f)).isSymbolicLink();
        } catch {
            files.delete(f); // deleted in the working tree
            return false;
        }
    });
    if (present.length > 0) {
        const ids = git(root, ["hash-object", "--stdin-paths"], present.join("\n") + "\n")
            .trim()
            .split("\n");
        present.forEach((f, i) => files.set(f, `w:${ids[i]}`));
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
                "(\\.\\./)+[A-Za-z0-9_.@-]+|\\{workspaceRoot\\}/[A-Za-z0-9_.@-]+",
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
 * @returns hex hash
 */
export function inputKey(shard, files, roots, include, outputs, env = process.env) {
    const under = (f, dir) => f === dir || f.startsWith(`${dir}/`);
    const all = [...roots.values()];
    const mine = [...include].map((p) => roots.get(p));
    const counted = [...files].filter(([f]) => !all.some((d) => under(f, d)) || mine.some((d) => under(f, d)));
    const envKeys = Object.keys(env)
        .filter((k) => /^(GRAPHTY_|VK_)/.test(k) && !k.startsWith("GRAPHTY_TEST_SLOT"))
        .sort();
    return sha256(
        JSON.stringify({
            shard,
            node: process.version,
            env: envKeys.map((k) => [k, env[k]]),
            files: counted.sort(([a], [b]) => (a < b ? -1 : 1)),
            outputs: [...outputs].sort(([a], [b]) => (a < b ? -1 : 1)),
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
            return inputKey(shard, files, graph.roots, include, mine);
        };
    };
}

/**
 * Which shards already passed on these exact inputs.
 * @param shards the shards to run
 * @param keys Map of shard name to its input key (null = unknown)
 * @param passes the branch's pass records: shard name -> `{ key, sha, at }`
 * @returns `{ run, skipped: [{ shard, pass }] }`
 */
export function partitionByPasses(shards, keys, passes) {
    const run = [];
    const skipped = [];
    for (const s of shards) {
        const key = keys.get(s.shard);
        const pass = passes[s.shard];
        if (key && pass && pass.key === key) {
            skipped.push({ shard: s, pass });
        } else {
            run.push(s);
        }
    }
    return { run, skipped };
}

/**
 * The pass records of one branch, kept in <main checkout>/tmp/prepush-passes/.
 * @param main the main checkout
 * @param branch the branch name
 * @returns `{ read(), record(shard, entry) }`
 */
export function passStore(main, branch) {
    const file = join(main, "tmp/prepush-passes", `${encodeURIComponent(branch)}.json`);
    const read = () => {
        try {
            return JSON.parse(readFileSync(file, "utf8"));
        } catch {
            return {};
        }
    };
    const record = (shard, entry) => {
        const all = { ...read(), [shard]: entry };
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.${process.pid}`;
        writeFileSync(tmp, JSON.stringify(all, null, 2) + "\n");
        renameSync(tmp, file);
    };
    return { read, record };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === "fingerprint") {
    console.log(fingerprint(process.cwd()));
}
