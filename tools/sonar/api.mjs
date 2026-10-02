// The one place that handles the SonarQube token. Reads SONAR_HOST_URL, SONAR_PROJECT_KEY and
// SONAR_TOKEN (environment first, then the repository's .env, parsed line by line -- never
// sourced), makes every Web API call with the token in a header, and starts the scanner with the
// token in that child's environment only. Every other child gets an environment without it.
//
// Used by tools/sonar-gate.mjs and tools/sonar-baseline.mjs. See design/sonarqube/design.md.

import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The three settings, plus where the scanner's Java is (not a secret; read the same way because a
// git hook does not see what ~/.bashrc exports when the push comes from a non-login shell).
const KEYS = ["SONAR_HOST_URL", "SONAR_PROJECT_KEY", "SONAR_TOKEN", "SONAR_SCANNER_JAVA_EXE_PATH"];

/** Read one KEY=value from .env text, without running or exporting anything else in it. */
export function parseEnvFile(text, key) {
    for (const raw of text.split(/\r?\n/)) {
        const m = raw.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (!m || m[1] !== key) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        else v = v.replace(/\s+#.*$/, "");
        return v;
    }
    return undefined;
}

/**
 * The settings and where the token came from. `root` is the repository root holding `.env`.
 * @returns {{host?: string, projectKey?: string, token?: string, tokenSource?: string, java?: string}}
 */
export function loadConfig(root, env = process.env) {
    let text = "";
    try {
        text = readFileSync(join(root, ".env"), "utf8");
    } catch {
        // no .env: the environment is the only source
    }
    const out = {};
    const src = {};
    for (const k of KEYS) {
        if (env[k]) {
            out[k] = env[k];
            src[k] = "environment";
        } else {
            const v = parseEnvFile(text, k);
            if (v) {
                out[k] = v;
                src[k] = ".env";
            }
        }
    }
    return {
        host: out.SONAR_HOST_URL?.replace(/\/+$/, ""),
        projectKey: out.SONAR_PROJECT_KEY,
        token: out.SONAR_TOKEN,
        tokenSource: src.SONAR_TOKEN,
        java: out.SONAR_SCANNER_JAVA_EXE_PATH,
    };
}

/** process.env (or `env`) with SONAR_TOKEN removed: for every child that is not the scanner. */
export function envWithoutToken(env = process.env) {
    const { SONAR_TOKEN: _drop, ...rest } = env;
    return rest;
}

export class ApiError extends Error {
    constructor(status, path, body) {
        super(`SonarQube ${path} answered HTTP ${status}${body ? `: ${body.slice(0, 300)}` : ""}`);
        this.status = status;
        this.path = path;
    }
}

/**
 * api/system/status with no token. Resolves to the parsed answer, or null when nothing answers UP
 * within `timeoutMs`, retrying inside that budget: the host name lookup fails now and then on this
 * machine (EAI_AGAIN), and that is not the server being away.
 */
export async function serverStatus(host, timeoutMs = 3000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end - 50) {
        try {
            const res = await fetch(`${host}/api/system/status`, { signal: AbortSignal.timeout(end - Date.now()) });
            if (!res.ok) return null;
            const body = await res.json();
            return body && body.status === "UP" ? body : null;
        } catch {
            await new Promise((r) => setTimeout(r, 200));
        }
    }
    return null;
}

/**
 * Take an exclusive flock(1) on `file`, waiting up to `waitSeconds` (0: do not wait). The lock is
 * taken by a short-lived `flock <fd>` child on a descriptor this process holds open, so it stays
 * held until `release()` or until this process dies -- no lock outlives the push. Resolves to
 * `release` or null when the lock was not obtained in time.
 */
export async function acquireLock(file, waitSeconds) {
    const fd = openSync(file, "a");
    const args = waitSeconds > 0 ? ["-w", String(Math.max(1, Math.floor(waitSeconds))), "3"] : ["-n", "3"];
    const code = await new Promise((resolve) => {
        const c = spawn("flock", args, { stdio: ["ignore", "ignore", "ignore", fd], env: envWithoutToken() });
        c.on("error", () => resolve(-1));
        c.on("close", resolve);
    });
    if (code !== 0) {
        closeSync(fd);
        return null;
    }
    let held = true;
    return () => {
        if (held) closeSync(fd);
        held = false;
    };
}

/**
 * fetch, tried up to three times when no answer arrives at all (a network or name lookup error, not
 * an HTTP status): on this machine a first lookup of the host fails now and then with EAI_AGAIN.
 */
async function fetchRetrying(url, init, timeoutMs) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
        } catch (err) {
            if (attempt >= 3) throw err;
            await new Promise((r) => setTimeout(r, 300 * attempt));
        }
    }
}

/**
 * A Web API client bound to one host and token. `call(path, params, {method})` returns parsed
 * JSON (or text for non-JSON answers) and throws ApiError on a non-2xx answer. GET puts params in
 * the query string, POST in a form body; the token is only ever in the Authorization header.
 */
export function client(host, token, { timeoutMs = 30000 } = {}) {
    async function call(path, params = {}, { method = "GET" } = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.append(k, String(v));
        const headers = { Authorization: `Bearer ${token}` };
        const get = method === "GET";
        const url = `${host}/${path}${get && [...qs].length ? `?${qs}` : ""}`;
        const body = get ? undefined : qs;
        const res = await fetchRetrying(url, { method, headers, body }, timeoutMs);
        const text = await res.text();
        if (!res.ok) throw new ApiError(res.status, path, text);
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
    /** Every page of a paged search, concatenating `field`. */
    async function all(path, params, field) {
        const out = [];
        for (let p = 1; ; p++) {
            const r = await call(path, { ...params, p, ps: 500 });
            out.push(...(r[field] ?? []));
            const total = r.paging?.total ?? r.total ?? 0;
            if (out.length >= total || (r[field] ?? []).length === 0 || p * 500 >= 10000) return out;
        }
    }
    return { call, all };
}

/**
 * The scanner command: `sonar-scanner-npm` from node_modules, or SONAR_GATE_SCANNER (tests point it
 * at a fake). The token goes into this one child's environment and nowhere else; the scanner is
 * never run in debug or verbose mode, because a debug log can print environment values.
 */
export function startScanner(root, args, { token, env = process.env, onOutput } = {}) {
    const cmd = env.SONAR_GATE_SCANNER || join(root, "node_modules/.bin/sonar-scanner-npm");
    const safeArgs = args.filter((a) => !/^-X$|^--debug$|^-Dsonar\.verbose=/.test(a));
    const child = spawn(cmd, safeArgs, {
        cwd: root,
        env: { ...envWithoutToken(env), SONAR_TOKEN: token },
        stdio: ["ignore", "pipe", "pipe"],
    });
    // Belt and braces: the scanner does not print the token, but if it ever did, the log would not keep it.
    const redact = (d) => onOutput?.(token ? d.toString().split(token).join("***") : d.toString());
    const done = new Promise((resolve) => {
        child.stdout.on("data", redact);
        child.stderr.on("data", redact);
        child.on("error", (err) => resolve({ code: -1, error: err }));
        child.on("close", (code) => resolve({ code }));
    });
    return { child, done };
}

/** Stop the scanner and everything it started (its JRE): SIGTERM to the whole tree, SIGKILL 2 s later. */
export function stopScanner(child) {
    const kids = new Map();
    try {
        const ps = spawnSync("ps", ["-e", "-o", "pid=,ppid="], { encoding: "utf8" }).stdout;
        for (const line of ps.trim().split("\n")) {
            const [pid, ppid] = line.trim().split(/\s+/).map(Number);
            kids.set(ppid, [...(kids.get(ppid) ?? []), pid]);
        }
    } catch {
        // no ps: stop the direct child only
    }
    const tree = [];
    const walk = (pid) => {
        tree.push(pid);
        for (const k of kids.get(pid) ?? []) walk(k);
    };
    walk(child.pid);
    const signal = (sig) =>
        tree.forEach((pid) => {
            try {
                process.kill(pid, sig);
            } catch {
                // already gone
            }
        });
    signal("SIGTERM");
    setTimeout(() => signal("SIGKILL"), 2000).unref();
}
