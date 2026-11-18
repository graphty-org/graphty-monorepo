/**
 * Real Safari, driven through `safaridriver` (macOS only) over plain W3C WebDriver with Node's own
 * `fetch`: no client library. Safari allows one automation session at a time, in its own window.
 *
 * `safaridriver --enable` must have been run once on the machine (the macOS workflow does it).
 */

import { type ChildProcess, execFile, spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { promisify } from "node:util";

import { WAIT_GUARD_MS } from "../../../tools/test-wait-guard.mjs";
import { ownChild, processes } from "./processes";

/** A WebDriver session in Safari. */
export interface Safari {
    /** Load a URL in the session's window. */
    navigate(url: string): Promise<void>;
    /**
     * Close the current tab and go on in a new one of the same session. Leaving a page by navigating
     * does not end it in Safari: the back-forward cache keeps it, with its storage connections open.
     */
    replaceTab(): Promise<void>;
    /** Run a script in the page; `arguments` holds `args`, and a returned promise is awaited. */
    execute<T>(script: string, args?: unknown[]): Promise<T>;
    /** Hide the window: WebDriver's minimize, else the Dock through AppleScript. */
    minimize(): Promise<"webdriver" | "osascript">;
    /** Bring the window back. */
    restore(): Promise<void>;
    /** End the session; Safari closes its automation window. */
    quit(): Promise<void>;
}

/** A running safaridriver. */
export interface SafariDriver {
    /** Start a session. */
    session(): Promise<Safari>;
    /** Stop the driver. */
    close(): Promise<void>;
}

/**
 * A free loopback port.
 * @returns The port.
 */
function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address() as net.AddressInfo;
            server.close(() => resolve(port));
        });
    });
}

/**
 * Safari's processes, WebKit's, safaridriver's and the Web Inspector daemon's, one per line, for the log.
 * A session that fails to start (#5564) is diagnosed from what was running around it.
 * @returns The processes, or "none".
 */
function safariProcesses(): string {
    const found = processes().filter((p) => /Safari|WebKit|safaridriver|webinspectord/.test(p.cmdline));
    return found.length === 0 ? "none" : found.map((p) => `\n  ${p.pid} ${p.ppid} ${p.cmdline}`).join("");
}

/**
 * The PIDs of the applications webinspectord has finished registering ("Application Updated" in the
 * system log, written once it has looked up the application's icon), as they arrive.
 * @returns The set, a wait for one PID, and a stop.
 */
async function inspectorRegistrations(): Promise<{ until(pid: number): Promise<void>; stop(): void }> {
    const updated = new Set<number>();
    let changed = (): void => undefined;
    const stream = ownChild(
        spawn("log", [
            "stream",
            "--style",
            "compact",
            "--level",
            "info",
            "--predicate",
            'process == "webinspectord" AND eventMessage CONTAINS "Application Updated"',
        ]),
    );
    let started = (): void => undefined;
    const ready = new Promise<void>((resolve, reject) => {
        started = resolve;
        stream.once("exit", (code) => reject(new Error(`log stream exited (${String(code)}) before streaming`)));
    });
    stream.stdout.setEncoding("utf8");
    stream.stdout.on("data", (chunk: string) => {
        started(); // `log stream` prints its filter line once it is streaming
        for (const match of chunk.matchAll(/Application Updated: \d+ - PID:(\d+)/g)) {
            updated.add(Number(match[1]));
        }

        changed();
    });
    await ready;
    return {
        async until(pid) {
            while (!updated.has(pid)) {
                await new Promise<void>((resolve) => (changed = resolve));
            }
        },
        stop: () => stream.kill(),
    };
}

/**
 * Launch Safari once, wait until it has loaded a page and webinspectord has registered it, and quit it,
 * unless Safari is already running (then only the registration is awaited). Runs with safaridriver
 * already started, so the webinspectord that registers it is the one the sessions use.
 *
 * safaridriver gives Safari a fixed 30 seconds to launch and become ready when a session is created.
 * Two first-time costs can fill that window on a fresh macOS runner:
 *
 * - Safari's own first launch, its first-run setup on cold disk caches (#4580).
 * - webinspectord's first application lookup (#8368). safaridriver starts a fresh webinspectord, which
 *   exits again when safaridriver does. Its sandbox cannot reach the LaunchServices database, so the
 *   first time it looks up an application's icon it builds that database itself, on its main thread:
 *   24 seconds on macos-26, during which it answers no application, Safari included.
 *
 * A Safari launched here pays both before the session's clock starts.
 */
async function warmSafari(): Promise<void> {
    const registrations = await inspectorRegistrations();
    try {
        const running = processes().find((p) => p.cmdline.includes("Safari.app/Contents/MacOS/Safari"));
        if (running === undefined) {
            await launchAndQuitSafari(registrations.until);
        } else {
            await registrations.until(running.pid);
        }
    } finally {
        registrations.stop();
    }
}

/**
 * Launch Safari, wait until it has loaded a page and is registered, and quit it.
 * @param registered - Resolves once webinspectord has registered the PID.
 */
async function launchAndQuitSafari(registered: (pid: number) => Promise<void>): Promise<void> {
    let loaded = (): void => undefined;
    const seen = new Promise<void>((resolve) => (loaded = resolve));
    const server = http.createServer((_request, response) => {
        response.end("<!doctype html><title>warm</title>");
        loaded();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const started = Date.now();
    // -W: `open` exits when Safari does, which is how its quit is awaited below.
    const safari = spawn("open", [
        "-W",
        "-g",
        "-a",
        "Safari",
        `http://127.0.0.1:${(server.address() as net.AddressInfo).port}/`,
    ]);
    const quit = new Promise<void>((resolve) => safari.once("exit", () => resolve()));
    try {
        await seen; // a launch that never loads the page is bounded by the workflow step's limit
    } finally {
        server.close();
    }

    console.log(`[safari] first launch loaded a page after ${Date.now() - started} ms`);
    const safariPid = processes().find((p) => p.cmdline.includes("Safari.app/Contents/MacOS/Safari"))?.pid;
    if (safariPid !== undefined) {
        await registered(safariPid); // a Safari that never registers is bounded by the workflow step's limit
        console.log(`[safari] webinspectord registered it after ${Date.now() - started} ms`);
    }

    const killed = Date.now();
    await promisify(execFile)("killall", ["Safari"]);
    await quit;
    console.log(`[safari] first launch quit after ${Date.now() - killed} ms; still running: ${safariProcesses()}`);
}

/**
 * Start safaridriver and wait until it answers, then launch Safari once (warmSafari).
 * @returns The driver.
 */
export async function startSafariDriver(): Promise<SafariDriver> {
    const port = await freePort();
    // --diagnose: safaridriver logs every session to ~/Library/Logs/com.apple.WebDriver, which the macOS
    // workflow keeps when a step fails.
    const driver: ChildProcess = ownChild(
        spawn("safaridriver", ["--port", String(port), "--diagnose"], { stdio: "ignore" }),
    );
    const exited = new Promise<void>((resolve) => driver.once("exit", () => resolve()));
    const base = `http://127.0.0.1:${port}`;

    // It listens within a moment of starting; until then a request is refused at once.
    for (let attempt = 0; ; attempt++) {
        try {
            await fetch(`${base}/status`);
            break;
        } catch (error) {
            if (attempt > 20_000 || driver.exitCode !== null) {
                driver.kill();
                throw new Error(`safaridriver did not start: ${String(error)}`);
            }

            await new Promise((resolve) => setImmediate(resolve));
        }
    }

    try {
        await warmSafari();
    } catch (error) {
        driver.kill();
        throw error;
    }

    const call = async <T>(method: string, url: string, body?: unknown): Promise<T> => {
        const response = await fetch(`${base}${url}`, {
            method,
            headers: { "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = (await response.json()) as { value: T & { error?: string; message?: string } };
        if (!response.ok) {
            throw new Error(`${method} ${url}: ${json.value.error ?? response.status}: ${json.value.message ?? ""}`);
        }

        return json.value;
    };

    return {
        async session() {
            const { sessionId } = await call<{ sessionId: string }>("POST", "/session", {
                capabilities: { alwaysMatch: { browserName: "safari" } },
            }).catch((error: unknown) => {
                throw new Error(`${String(error)}\nrunning: ${safariProcesses()}`, { cause: error });
            });
            const at = `/session/${sessionId}`;
            return {
                navigate: async (url) => {
                    await call("POST", `${at}/url`, { url });
                },
                replaceTab: async () => {
                    const { handle } = await call<{ handle: string }>("POST", `${at}/window/new`, { type: "tab" });
                    await call("DELETE", `${at}/window`);
                    await call("POST", `${at}/window`, { handle });
                },
                async execute<T>(script: string, args: unknown[] = []): Promise<T> {
                    // The async form, so a returned promise is awaited the same way in every case; the body
                    // is an async function, so a script may use await.
                    const result = await call<T | { __error: string }>("POST", `${at}/execute/async`, {
                        script: `const done = arguments[arguments.length - 1];
                            (async function () { ${script} }).apply(null, Array.from(arguments).slice(0, -1))
                                .then(done, (error) => done({ __error: String(error) }));`,
                        args,
                    });
                    if (result !== null && typeof result === "object" && "__error" in result) {
                        throw new Error(`script failed in Safari: ${result.__error}`);
                    }

                    return result;
                },
                async minimize() {
                    try {
                        await call("POST", `${at}/window/minimize`, {});
                        return "webdriver";
                    } catch {
                        await promisify(execFile)(
                            "osascript",
                            ["-e", 'tell application "Safari" to set miniaturized of front window to true'],
                            { timeout: WAIT_GUARD_MS },
                        ); // an Automation permission prompt nobody answers would hang it
                        return "osascript";
                    }
                },
                restore: async () => {
                    await call("POST", `${at}/window/maximize`, {});
                },
                quit: async () => {
                    await call("DELETE", at);
                },
            };
        },
        async close() {
            driver.kill();
            await exited;
        },
    };
}
