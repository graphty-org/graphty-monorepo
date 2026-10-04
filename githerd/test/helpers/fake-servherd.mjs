/**
 * A fake servherd (and pm2) for the launcher tests. State lives in `FAKE_SERVHERD_DIR`:
 * `registry.json` (the servers), `calls.jsonl` (one `{pid, argv, cwd, pm2Home}` line per invocation) and
 * `pids.jsonl` (every process it spawned, so a test can kill them all).
 *
 * Usage, like the real one: `node fake-servherd.mjs --json start -n <name> -e K=V ... -- <command>`,
 * `node fake-servherd.mjs --json restart <name>`, `node fake-servherd.mjs --json list`. With `pm2`
 * first it acts as pm2: `node fake-servherd.mjs pm2 delete <pm2 name>`,
 * `node fake-servherd.mjs pm2 start <file.json>`, `node fake-servherd.mjs pm2 jlist`.
 *
 * `start` spawns the command detached, answers "existing" for an unchanged command whose process
 * is alive, and "restarted" (after stopping the old process) for a changed one or a dead process.
 * `FAKE_SERVHERD_SLEEP_MS` makes it sleep first, after logging the call.
 */
import { spawn } from "node:child_process";
import { appendFileSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const dir = /** @type {string} */ (process.env.FAKE_SERVHERD_DIR);
const registryFile = join(dir, "registry.json");
let argv = process.argv.slice(2);
appendFileSync(
    join(dir, "calls.jsonl"),
    `${JSON.stringify({ pid: process.pid, argv, cwd: process.cwd(), pm2Home: process.env.PM2_HOME ?? null })}\n`,
);
appendFileSync(join(dir, "pids.jsonl"), `${process.pid}\n`);
if (process.env.FAKE_SERVHERD_SLEEP_MS) await sleep(Number(process.env.FAKE_SERVHERD_SLEEP_MS));

/** @type {Record<string, any>} */
let registry = {};
try {
    registry = JSON.parse(readFileSync(registryFile, "utf8"));
} catch {
    // first call
}
const save = () => writeFileSync(registryFile, JSON.stringify(registry, null, 2));

/**
 * Waits.
 * @param {number} ms how long
 * @returns {Promise<void>} resolves after it
 */
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Whether a process is alive (a zombie is not).
 * @param {number | null} pid the process
 * @returns {boolean} true when alive
 */
function alive(pid) {
    if (!pid) return false;
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z";
    } catch {
        return false;
    }
}

/**
 * Stops a server's process group: SIGTERM, then SIGKILL after 1.6 s, as pm2 does.
 * @param {any} entry the server
 */
async function stop(entry) {
    const pid = entry.pid;
    entry.pid = null;
    if (!alive(pid)) return;
    for (const signal of ["SIGTERM", "SIGCONT"]) {
        try {
            process.kill(-pid, signal);
        } catch {
            // gone
        }
    }
    for (let i = 0; i < 16 && alive(pid); i++) await sleep(100);
    try {
        process.kill(-pid, "SIGKILL");
    } catch {
        // gone
    }
    while (alive(pid)) await sleep(50);
}

/**
 * Spawns a server's command detached.
 * @param {any} entry the server
 */
function launch(entry) {
    const [cmd, ...args] = entry.resolvedCommand.split(" ");
    const out = openSync(join(dir, `${entry.name}.log`), "a");
    const child = spawn(cmd, args, {
        cwd: entry.cwd,
        detached: true,
        stdio: ["ignore", out, out],
        env: { ...process.env, ...entry.env, PORT: String(entry.port) },
    });
    child.unref();
    entry.pid = child.pid;
    appendFileSync(join(dir, "pids.jsonl"), `${child.pid}\n`);
}

/**
 * A free port.
 * @returns {Promise<number>} the port
 */
function freePort() {
    return new Promise((resolve) => {
        const server = createServer().listen(0, "127.0.0.1", () => {
            const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
            server.close(() => resolve(port));
        });
    });
}

if (argv[0] === "pm2") {
    const [, verb, arg] = argv;
    if (verb === "delete") {
        const entry = Object.values(registry).find((e) => e.pm2Name === arg);
        if (!entry) {
            console.error(`[PM2][ERROR] Process or Namespace ${arg} not found`);
            process.exit(1);
        }
        await stop(entry);
        entry.autorestart = false;
    } else if (verb === "jlist") {
        const list = Object.values(registry).map((e) => ({
            name: e.pm2Name,
            pid: e.pid,
            pm2_env: { status: alive(e.pid) ? "online" : "stopped", autorestart: e.autorestart },
        }));
        console.log(JSON.stringify(list));
        process.exit(0);
    } else if (verb === "start") {
        const app = JSON.parse(readFileSync(arg, "utf8")).apps[0];
        const entry = Object.values(registry).find((e) => e.pm2Name === app.name);
        entry.resolvedCommand = [app.script, ...app.args].join(" ");
        entry.cwd = app.cwd;
        entry.env = app.env;
        entry.autorestart = app.autorestart;
        launch(entry);
    }
    save();
    process.exit(0);
}

const json = argv[0] === "--json";
if (json) argv = argv.slice(1);
const reply = (/** @type {string} */ action, /** @type {any} */ server) =>
    console.log(JSON.stringify({ success: true, data: { action, server, status: "online" } }, null, 2));

if (argv[0] === "start") {
    const sep = argv.indexOf("--");
    const opts = argv.slice(1, sep);
    const command = argv.slice(sep + 1).join(" ");
    const name = opts[opts.indexOf("-n") + 1];
    /** @type {Record<string, string>} */
    const env = {};
    opts.forEach((o, i) => {
        if (o === "-e") {
            const [k, ...v] = opts[i + 1].split("=");
            env[k] = v.join("=");
        }
    });
    let entry = registry[name];
    let action = "started";
    if (entry) {
        if (entry.command === command && alive(entry.pid)) {
            reply("existing", entry);
            process.exit(0);
        }
        await stop(entry);
        action = "restarted";
    } else {
        entry = { name, pm2Name: `servherd-${name}`, port: await freePort(), cwd: process.cwd(), autorestart: false };
        registry[name] = entry;
    }
    const resolve = (/** @type {string} */ s) => s.replaceAll("{{port}}", String(entry.port));
    entry.command = command;
    entry.resolvedCommand = resolve(command);
    entry.env = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, resolve(v)]));
    entry.autorestart = false;
    launch(entry);
    save();
    reply(action, entry);
} else if (argv[0] === "restart") {
    const entry = registry[argv[1]];
    await stop(entry);
    launch(entry);
    save();
    reply("restarted", entry);
} else if (argv[0] === "list") {
    const servers = Object.values(registry).map((e) => ({ server: e, status: alive(e.pid) ? "online" : "stopped" }));
    console.log(JSON.stringify({ success: true, data: { servers } }, null, 2));
} else {
    console.log(JSON.stringify({ success: false, data: null, error: { message: `unknown: ${argv.join(" ")}` } }));
    process.exit(1);
}
