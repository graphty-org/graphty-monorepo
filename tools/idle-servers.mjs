// Stops servherd dev servers nobody has used for 12 hours (owner, 2026-11-14; 12 hours since 2026-11-15), so their memory goes back to the
// local test slots. tools/worktree-cleanup.mjs calls it on every --apply pass (every 15 minutes from the servherd
// server `worktree-cleanup`).
//
// A server is in use while anything holds an established TCP connection to its port: an open browser tab keeps
// Vite's HMR websocket open, and a test run connects while it runs. Each pass records, per server, the last time
// one was seen; a server never seen connected counts from the first pass that saw it running (or from its restart,
// a new pid). One idle for --idle hours (default 12) is stopped with pm2 under servherd's PM2 home, which is what
// servherd's own stop does, so servherd_list shows it stopped and servherd_restart brings it back.
//
// Only servers inside the repository's .worktrees/ are candidates. Never stopped: anything in the main checkout
// (the status broker, mockup pages, ci watchers), a live tool's worktree (tools/live-tools.json: the review server,
// visual-review-notify, worktree-cleanup itself), and the owner's proofroom review page.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const KEEP_NAMES = new Set(["proofroom-review"]);

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return undefined;
    }
};

/**
 * The local ports that have an established TCP connection, from /proc/net/tcp and tcp6.
 * @param procDir the proc file system
 * @returns the ports
 */
export function connectedPorts(procDir = "/proc") {
    const ports = new Set();
    for (const f of ["net/tcp", "net/tcp6"]) {
        let text = "";
        try {
            text = readFileSync(join(procDir, f), "utf8");
        } catch {
            continue;
        }
        for (const line of text.split("\n").slice(1)) {
            const [, local, , st] = line.trim().split(/\s+/);
            if (st === "01" && local) ports.add(Number.parseInt(local.split(":")[1], 16));
        }
    }
    return ports;
}

/**
 * The online servherd processes that may be stopped, by pm2 name, with their pid and ports. A pm2 name that any
 * registry entry outside the candidates also uses is left out: it is the same process.
 * @param root the main checkout
 * @param home the home directory (servherd's registry and pid files)
 * @returns map of pm2 name to { pid, ports, names }
 */
function candidates(root, home) {
    const keepDirs = Object.values(readJson(join(root, "tools/live-tools.json")) ?? {})
        .map((t) => t?.worktree && resolve(root, t.worktree))
        .filter((d) => d && d !== root);
    const pidDir = join(home, ".servherd/pm2/pids");
    let pidFiles = [];
    try {
        pidFiles = readdirSync(pidDir);
    } catch {
        // no pm2 home: nothing is online
    }
    const inside = (dir, base) => (dir + "/").startsWith(base + "/");
    const ok = (s) =>
        inside(s.cwd, join(root, ".worktrees")) && !keepDirs.some((d) => inside(s.cwd, d)) && !KEEP_NAMES.has(s.name);
    const out = new Map();
    const banned = new Set();
    for (const s of readJson(join(home, ".servherd/registry.json"))?.servers ?? []) {
        if (!s?.pm2Name || !s.cwd) continue;
        if (!ok(s)) {
            banned.add(s.pm2Name);
            continue;
        }
        const prefix = `${s.pm2Name}-`;
        const file = pidFiles.find((f) => f.startsWith(prefix) && /^\d+\.pid$/.test(f.slice(prefix.length)));
        const pid = file && Number(readFileSync(join(pidDir, file), "utf8"));
        if (!pid || !alive(pid)) continue;
        const c = out.get(s.pm2Name) ?? { pid, ports: [], names: [] };
        c.ports.push(Number(s.port));
        c.names.push(s.name);
        out.set(s.pm2Name, c);
    }
    for (const b of banned) out.delete(b);
    return out;
}

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === "EPERM";
    }
}

/**
 * Stops a pm2 process with servherd's own pm2 (SERVHERD_PM2 overrides) and PM2 home.
 * @param pm2Name the pm2 process name
 * @param home the home directory
 * @returns whether it stopped
 */
function pm2Stop(pm2Name, home) {
    const bin = process.env.SERVHERD_PM2 ?? join(home, "Projects/servherd/node_modules/.bin/pm2");
    if (!existsSync(bin)) return false;
    const r = spawnSync(bin, ["stop", pm2Name], {
        env: { ...process.env, PM2_HOME: join(home, ".servherd/pm2") },
        encoding: "utf8",
    });
    return r.status === 0;
}

/**
 * One pass: records which candidate servers are in use and stops those idle for `idleHours`.
 * @param o `root` the main checkout; optional `idleHours` (default 2), and for tests `home`, `procDir`, `now`
 *   (ms) and `stop(pm2Name)`
 * @returns the stopped servers' names and a summary line
 */
export function stopIdleServers(o) {
    const home = o.home ?? process.env.HOME;
    const now = o.now ?? Date.now();
    const idleMs = (o.idleHours ?? 12) * 3600e3;
    const stop = o.stop ?? ((n) => pm2Stop(n, home));
    const stateFile = join(o.root, "tmp/idle-servers/seen.json");
    const seen = readJson(stateFile) ?? {};
    const used = connectedPorts(o.procDir);
    const next = {};
    const stopped = [];
    const failed = [];
    for (const [pm2Name, c] of candidates(o.root, home)) {
        const prev = seen[pm2Name];
        const fresh = !prev || prev.pid !== c.pid || c.ports.some((p) => used.has(p));
        const at = fresh ? now : prev.at;
        if (now - at < idleMs) next[pm2Name] = { pid: c.pid, at };
        else if (stop(pm2Name)) stopped.push(c.names.join("/"));
        else {
            failed.push(c.names.join("/"));
            next[pm2Name] = { pid: c.pid, at };
        }
    }
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(next, null, 2) + "\n");
    let text = `idle-servers: ${Object.keys(next).length} watched, stopped ${stopped.length}`;
    if (stopped.length) text += ` (${stopped.join(", ")})`;
    if (failed.length) text += `; could not stop ${failed.join(", ")}`;
    return { stopped, text };
}
