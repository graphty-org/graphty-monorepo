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

import { ownChild, processes } from "./processes";

/** A WebDriver session in Safari. */
export interface Safari {
    /** Load a URL in the session's window. */
    navigate(url: string): Promise<void>;
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
 * Launch Safari once, wait until it has loaded a page, and quit it, unless Safari is already running.
 *
 * safaridriver gives Safari a fixed 30 seconds to launch and connect when a session is created. On a
 * fresh macOS runner Safari has never run: its first launch does its first-run setup on cold disk
 * caches, can take longer than that, and POST /session fails with "The session timed out while
 * connecting to a Safari instance" (#4580). After one launch that got as far as loading a page,
 * the Safari safaridriver launches is a warm one.
 */
async function warmSafari(): Promise<void> {
    if (processes().some((p) => p.cmdline.includes("Safari.app/Contents/MacOS/Safari"))) {
        return;
    }

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
    await promisify(execFile)("killall", ["Safari"]);
    await quit;
}

/**
 * Start safaridriver and wait until it answers, with Safari launched once beforehand (warmSafari).
 * @returns The driver.
 */
export async function startSafariDriver(): Promise<SafariDriver> {
    await warmSafari();
    const port = await freePort();
    const driver: ChildProcess = ownChild(spawn("safaridriver", ["--port", String(port)], { stdio: "ignore" }));
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
            });
            const at = `/session/${sessionId}`;
            return {
                navigate: async (url) => {
                    await call("POST", `${at}/url`, { url });
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
                            { timeout: 30_000 },
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
