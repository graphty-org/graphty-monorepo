// The one place that handles the SonarQube tokens. Reads SONAR_HOST_URL, SONAR_PROJECT_KEY,
// SONAR_TOKEN (the owner's token, used for everything) and the optional SONAR_SCAN_TOKEN (a
// narrower token for scans only; used instead of SONAR_TOKEN for scans when it is set)
// (environment first, then the repository's .env, parsed line by line -- never
// sourced), makes every Web API call with the token in a header, and starts the scanner with the
// token in that child's environment only. Every other child gets an environment without it.
//
// Used by tools/sonar-gate.mjs and tools/sonar-baseline.mjs. See design/sonarqube/design.md.

import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The three settings, plus where the scanner's Java is (not a secret; read the same way because a
// git hook does not see what ~/.bashrc exports when the push comes from a non-login shell).
const KEYS = ["SONAR_HOST_URL", "SONAR_PROJECT_KEY", "SONAR_SCAN_TOKEN", "SONAR_TOKEN", "SONAR_SCANNER_JAVA_EXE_PATH"];

// Read one KEY=value from .env text, without running or exporting anything else in it.
function parseEnvFile(text, key) {
    for (const raw of text.split("\n")) {
        const eq = raw.indexOf("=");
        if (
            eq < 0 ||
            raw
                .slice(0, eq)
                .trim()
                .replace(/^export /, "")
                .trim() !== key
        )
            continue;
        const v = raw.slice(eq + 1).trim();
        const quoted = v.length > 1 && (v[0] === '"' || v[0] === "'") && v.endsWith(v[0]);
        if (quoted) return v.slice(1, -1);
        const comment = v.indexOf(" #");
        return (comment < 0 ? v : v.slice(0, comment)).trim();
    }
    return undefined;
}

/**
 * The settings, from the environment first, then the repository's .env.
 * @param root - The repository root holding `.env`.
 * @param env - The environment to read first.
 * @returns `{ host, projectKey, token, tokenSource, adminToken, java }`, each undefined when unset.
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
        host: withoutTrailingSlash(out.SONAR_HOST_URL),
        projectKey: out.SONAR_PROJECT_KEY,
        token: out.SONAR_SCAN_TOKEN ?? out.SONAR_TOKEN,
        tokenSource: src.SONAR_SCAN_TOKEN ?? src.SONAR_TOKEN,
        adminToken: out.SONAR_TOKEN,
        java: out.SONAR_SCANNER_JAVA_EXE_PATH,
    };
}

const withoutTrailingSlash = (url) => {
    let u = url;
    while (u?.endsWith("/")) u = u.slice(0, -1);
    return u;
};

/**
 * An environment for every child that is not the scanner.
 * @param env - The environment to copy.
 * @returns A copy of `env` without either token.
 */
export function envWithoutToken(env = process.env) {
    const rest = { ...env };
    delete rest.SONAR_TOKEN;
    delete rest.SONAR_SCAN_TOKEN;
    return rest;
}

/** A Web API answer with a non-2xx status; `status` is the HTTP status. */
export class ApiError extends Error {
    /**
     * Describe the failed call.
     * @param status - The HTTP status.
     * @param path - The API path called.
     * @param body - The answer's body, of which the first 300 characters go into the message.
     */
    constructor(status, path, body) {
        const detail = body ? `: ${body.slice(0, 300)}` : "";
        super(`SonarQube ${path} answered HTTP ${status}${detail}`);
        this.status = status;
        this.path = path;
    }
}

/**
 * Ask api/system/status, with no token, retrying inside the budget: the host name lookup fails now
 * and then on this machine (EAI_AGAIN), and that is not the server being away.
 * @param host - The server's base URL.
 * @param timeoutMs - The whole budget.
 * @returns The parsed answer (`{ id, version, status }`), or null when nothing answered UP in time.
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
 * Take an exclusive flock(1) on a file. A short-lived `flock <fd>` child locks a descriptor this
 * process holds open, so the lock stays held until `release()` or until this process dies -- no lock
 * outlives the push.
 * @param file - The lock file (created if missing).
 * @param waitSeconds - How long to wait; 0 does not wait.
 * @returns `release`, or null when the lock was not obtained in time.
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

// fetch, tried up to three times when no answer arrives at all (a network or name lookup error, not
// an HTTP status): on this machine a first lookup of the host fails now and then with EAI_AGAIN.
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
 * A Web API client bound to one host and token. `call(path, params, { method })` returns parsed JSON
 * and throws ApiError on a non-2xx answer; `all(path, params, field)` concatenates every page of a
 * paged search. GET puts params in the query string, POST in a form body; the token is only ever in
 * the Authorization header.
 * @param host - The server's base URL.
 * @param token - The SonarQube token.
 * @param options - Client options.
 * @param options.timeoutMs - The timeout of each request.
 * @returns `{ call, all }`.
 */
export function client(host, token, { timeoutMs = 30000 } = {}) {
    async function call(path, params = {}, { method = "GET" } = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.append(k, String(v));
        const headers = { Authorization: `Bearer ${token}` };
        const get = method === "GET";
        const query = get && qs.size > 0 ? "?" + qs.toString() : "";
        const url = `${host}/${path}${query}`;
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
    // Every page of a paged search, concatenating `field`.
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
 * Start the scanner: `sonar-scanner-npm` from node_modules, or SONAR_GATE_SCANNER (the tests point it
 * at a fake). The token goes into this one child's environment and nowhere else, and its output is
 * redacted; the scanner never runs in debug or verbose mode, because a debug log can print
 * environment values.
 * @param root - The directory to scan from (the repository root).
 * @param args - `-D` arguments.
 * @param options - Scanner options.
 * @param options.token - The token, for the scanner's environment only.
 * @param options.env - The base environment (SONAR_TOKEN in it is replaced).
 * @param options.onOutput - Called with each chunk of the scanner's output, the token redacted.
 * @returns `{ child, done }`; `done` resolves to `{ code, error }`.
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

/**
 * Stop the scanner and everything it started (its JRE): SIGTERM to the whole tree, SIGKILL 2 s later.
 * @param child - The scanner's ChildProcess.
 */
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
