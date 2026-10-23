/**
 * The Chromium lifecycle harness: Chrome for Testing driven over the raw DevTools protocol.
 *
 * Playwright's Chromium launch adds `--disable-back-forward-cache`,
 * `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows` and
 * `--disable-renderer-backgrounding`, so a back/forward-cache or background test run under it
 * passes without testing anything. This harness starts the same Chrome for Testing build Playwright
 * installed, without those flags, and talks to it over the browser's WebSocket with Node's own
 * `WebSocket`. It runs in Chrome's headless mode, which since Chrome 112 is the full browser without
 * a window system: tab discarding, freezing, the back/forward cache and session restore all work in
 * it (each test proves its trigger happened), and it runs the same on a developer's machine, this
 * repository's workstation and a CI runner, none of which needs an X server. With `DISPLAY` set it
 * runs headed on that display instead, for watching a test.
 *
 * It loads the test extension in `discard-extension/`, whose service worker the tests drive to call
 * `chrome.tabs.discard` the way Memory Saver and tab-suspender extensions do.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { type Proc, processTree } from "./processes";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The test extension that discards tabs. */
export const DISCARD_EXTENSION = path.join(here, "discard-extension");

/** A DevTools protocol message from the browser. */
interface Message {
    readonly id?: number;
    readonly method?: string;
    readonly params?: Record<string, unknown>;
    readonly result?: Record<string, unknown>;
    readonly error?: { message: string };
    readonly sessionId?: string;
}

/** A tab attached over a flattened DevTools session. */
export interface Tab {
    readonly targetId: string;
    readonly sessionId: string;
    /** Send a command to the tab. */
    send(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>;
    /** Evaluate an expression in the page, awaiting a promise, and return its value. */
    evaluate<T>(expression: string): Promise<T>;
    /** Every event the tab has received, in order. */
    readonly events: Message[];
    /** Wait for an event of the tab, at index `from` of `events` or later (one already received counts). */
    waitEvent(
        method: string,
        predicate?: (params: Record<string, unknown>) => boolean,
        from?: number,
    ): Promise<Record<string, unknown>>;
}

/** A running Chrome for Testing. */
export interface Chrome {
    /** `headless`, or `headed` on the display `DISPLAY` names. */
    readonly mode: "headed" | "headless";
    readonly pid: number;
    readonly userDataDir: string;
    /** Send a browser-level command. */
    send(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<Record<string, unknown>>;
    /** Every browser-level event, in order. */
    readonly events: Message[];
    /** Wait for a browser-level event (one already received counts). */
    waitEvent(
        method: string,
        predicate?: (params: Record<string, unknown>) => boolean,
    ): Promise<Record<string, unknown>>;
    /** Open a tab and attach to it. */
    open(url: string, options?: { background?: boolean; browserContextId?: string }): Promise<Tab>;
    /** Attach to an existing page target. */
    attach(targetId: string): Promise<Tab>;
    /** The page targets whose URL contains `fragment`. */
    pages(fragment?: string): Promise<{ targetId: string; url: string }[]>;
    /** Wait until a page target whose URL contains `fragment` exists, and attach to it. */
    waitPage(fragment: string): Promise<Tab>;
    /** The renderer processes of this browser, extension renderers left out. */
    renderers(): Proc[];
    /** Evaluate an expression in the test extension's service worker. */
    extension<T>(expression: string): Promise<T>;
    /** Resolves when the browser process has exited. */
    readonly exited: Promise<void>;
    /** Close the browser (SIGTERM, then wait). */
    close(): Promise<void>;
}

/**
 * More Chromium switches from `GRAPHTY_LIFECYCLE_CHROME_ARGS` (space-separated), for every Chromium
 * these tests launch. SwiftShader draws a 5,000-node graph in about 27 s a frame, so the larger
 * graphs need a real GPU: on an NVIDIA workstation, `--use-angle=gl-egl --ignore-gpu-blocklist`
 * with `GRAPHTY_EGL_LIB_DIR` naming the driver's libEGL tree (see {@link chromeEnv}).
 * @returns The switches.
 */
export function chromeArgs(): string[] {
    return (process.env.GRAPHTY_LIFECYCLE_CHROME_ARGS ?? "").split(" ").filter((arg) => arg !== "");
}

/**
 * Chromium's environment: `GRAPHTY_EGL_LIB_DIR`, when set, goes first on `LD_LIBRARY_PATH`, for
 * Chromium only (the same variable the browser project reads); Firefox crashes with it.
 * @returns The environment.
 */
export function chromeEnv(): NodeJS.ProcessEnv {
    const egl = process.env.GRAPHTY_EGL_LIB_DIR ?? "";
    return egl === ""
        ? process.env
        : { ...process.env, LD_LIBRARY_PATH: [egl, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") };
}

/**
 * Launch Chrome for Testing on a profile, with the discard extension and no Playwright flags.
 * @param userDataDir - The profile directory; a relaunch on the same one keeps its storage.
 * @param args - More command-line switches (`--restore-last-session`).
 * @returns The browser.
 */
export async function launchChrome(userDataDir: string, args: readonly string[] = []): Promise<Chrome> {
    const screen = process.env.DISPLAY ?? null;
    // chrome://discards is one of the internal debugging pages Chrome keeps switched off until this
    // Local State preference is set (chrome://chrome-urls has the button that sets it).
    const localState = path.join(userDataDir, "Local State");
    if (!existsSync(localState)) {
        mkdirSync(userDataDir, { recursive: true });
        writeFileSync(localState, '{ "internal_only_uis_enabled": true }');
    }

    // With core dumps off: Page.crash kills the renderer with a signal that dumps a core of about
    // 900 MB. `ulimit -c 0` stops a core written to a file, but where the kernel pipes cores to a
    // program (apport on GitHub's Ubuntu runners and Ubuntu desktops, systemd-coredump elsewhere) it
    // ignores the limit (core(5)), and the renderer is not gone -- no Inspector.targetCrashed -- until
    // that program has read the whole dump. A limit of exactly 1 byte is the kernel's own signal to
    // skip a piped dump, and below the smallest core it writes to a file, so on Linux prlimit sets it.
    const child = spawn(
        process.platform === "linux" ? "prlimit" : "/bin/sh",
        [
            ...(process.platform === "linux" ? ["--core=1", "--"] : ["-c", 'ulimit -c 0 && exec "$0" "$@"']),
            chromium.executablePath(),
            `--user-data-dir=${userDataDir}`,
            "--remote-debugging-port=0",
            "--no-first-run",
            "--no-default-browser-check",
            "--password-store=basic",
            "--use-mock-keychain",
            // GitHub's Ubuntu runners refuse the unprivileged user namespaces Chrome's sandbox needs.
            "--no-sandbox",
            "--enable-unsafe-swiftshader",
            `--disable-extensions-except=${DISCARD_EXTENSION}`,
            `--load-extension=${DISCARD_EXTENSION}`,
            ...(screen === null ? ["--headless"] : []),
            ...chromeArgs(),
            ...args,
            // A URL on the command line takes the place of the restored session.
            ...(args.includes("--restore-last-session") ? [] : ["about:blank"]),
        ],
        {
            stdio: ["ignore", "ignore", "pipe"],
            env: screen === null ? chromeEnv() : { ...chromeEnv(), DISPLAY: screen },
        },
    );
    // Interrupted or failed, the run's browsers are reaped by profile (./processes).
    const exited = new Promise<void>((resolve) => child.on("exit", () => resolve()));
    let stderr = (): string => "";
    const endpoint = await new Promise<string>((resolve, reject) => {
        let text = "";
        const read = (chunk: Buffer): void => {
            text += chunk.toString();
            const match = /DevTools listening on (ws:\S+)/.exec(text);
            if (match) {
                resolve(match[1]);
            }

            // Keep the end of the log, for a failure report.
            text = text.slice(-20_000);
        };
        child.stderr?.on("data", read);
        void exited.then(() => reject(new Error(`Chrome exited before listening: ${text.slice(-2000)}`)));
        stderr = () => text;
    });

    const socket = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener("error", () => reject(new Error("could not connect to Chrome")), { once: true });
    });

    let nextId = 1;
    const pending = new Map<number, { resolve: (r: Record<string, unknown>) => void; reject: (e: Error) => void }>();
    const browserEvents: Message[] = [];
    const tabEvents = new Map<string, Message[]>();
    const waiters = new Set<() => void>();
    socket.addEventListener("message", (event: MessageEvent) => {
        const message = JSON.parse(String(event.data)) as Message;
        if (message.id !== undefined) {
            const call = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) {
                call?.reject(new Error(message.error.message));
            } else {
                call?.resolve(message.result ?? {});
            }

            return;
        }

        const list = message.sessionId === undefined ? browserEvents : tabEvents.get(message.sessionId);
        list?.push(message);
        waiters.forEach((wake) => wake());
    });
    socket.addEventListener("close", () => {
        pending.forEach((call) => call.reject(new Error(`the browser connection closed: ${stderr().slice(-3000)}`)));
        pending.clear();
    });

    const send = (
        method: string,
        params: Record<string, unknown> = {},
        sessionId?: string,
    ): Promise<Record<string, unknown>> =>
        new Promise((resolve, reject) => {
            if (socket.readyState !== WebSocket.OPEN) {
                reject(new Error(`the browser connection is closed (${method}): ${stderr().slice(-3000)}`));
                return;
            }

            const id = nextId++;
            pending.set(id, { resolve, reject });
            socket.send(JSON.stringify({ id, method, params, sessionId }));
        });

    const waitIn = (
        list: Message[],
        method: string,
        predicate: (params: Record<string, unknown>) => boolean = () => true,
        from = 0,
    ): Promise<Record<string, unknown>> =>
        new Promise((resolve) => {
            const check = (): void => {
                const found = list.find((m, i) => i >= from && m.method === method && predicate(m.params ?? {}));
                if (found !== undefined) {
                    waiters.delete(check);
                    resolve(found.params ?? {});
                }
            };
            waiters.add(check);
            check();
        });

    const attach = async (targetId: string): Promise<Tab> => {
        const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })) as {
            sessionId: string;
        };
        const events: Message[] = [];
        tabEvents.set(sessionId, events);
        const tabSend = (method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> =>
            send(method, params, sessionId);
        await tabSend("Page.enable");
        await tabSend("Inspector.enable");
        return {
            targetId,
            sessionId,
            send: tabSend,
            events,
            waitEvent: (method, predicate, from) => waitIn(events, method, predicate, from),
            evaluate: async <T>(expression: string): Promise<T> => {
                const reply = (await tabSend("Runtime.evaluate", {
                    expression,
                    awaitPromise: true,
                    returnByValue: true,
                })) as {
                    result: { value: T };
                    exceptionDetails?: { exception?: { description?: string }; text: string };
                };
                if (reply.exceptionDetails) {
                    throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
                }

                return reply.result.value;
            },
        };
    };

    const pages = async (fragment = ""): Promise<{ targetId: string; url: string }[]> => {
        const { targetInfos } = (await send("Target.getTargets")) as {
            targetInfos: { targetId: string; type: string; url: string }[];
        };
        return targetInfos.filter((t) => t.type === "page" && t.url.includes(fragment));
    };

    await send("Target.setDiscoverTargets", { discover: true });
    let workerSession: Promise<string> | undefined;

    const chrome: Chrome = {
        mode: screen === null ? "headless" : "headed",
        pid: child.pid ?? 0,
        userDataDir,
        send,
        events: browserEvents,
        waitEvent: (method, predicate) => waitIn(browserEvents, method, predicate),
        attach,
        pages,
        async open(url, options = {}) {
            const { targetId } = (await send("Target.createTarget", {
                url: "about:blank",
                background: options.background ?? false,
                ...(options.browserContextId === undefined ? {} : { browserContextId: options.browserContextId }),
            })) as { targetId: string };
            const tab = await attach(targetId);
            await tab.send("Page.navigate", { url });
            return tab;
        },
        async waitPage(fragment) {
            const isIt = (p: Record<string, unknown>): boolean => {
                const info = p.targetInfo as { type: string; url: string };
                return info.type === "page" && info.url.includes(fragment);
            };
            const existing = (await pages(fragment))[0]?.targetId;
            if (existing !== undefined) {
                return attach(existing);
            }

            const found = (await Promise.race([
                waitIn(browserEvents, "Target.targetCreated", isIt),
                waitIn(browserEvents, "Target.targetInfoChanged", isIt),
            ])) as { targetInfo: { targetId: string } };
            return attach(found.targetInfo.targetId);
        },
        renderers: () =>
            processTree(child.pid ?? 0).filter(
                (proc) => proc.cmdline.includes("--type=renderer") && !proc.cmdline.includes("--extension-process"),
            ),
        async extension<T>(expression: string): Promise<T> {
            // Attached once and kept attached: a worker DevTools is attached to is not stopped as idle.
            workerSession ??= (async () => {
                const worker = (await waitIn(browserEvents, "Target.targetCreated", (p) => {
                    // Chrome ships component extensions with workers of their own; ours is worker.js.
                    const info = p.targetInfo as { type: string; url: string };
                    return info.type === "service_worker" && info.url.endsWith("/worker.js");
                })) as { targetInfo: { targetId: string } };
                const reply = (await send("Target.attachToTarget", {
                    targetId: worker.targetInfo.targetId,
                    flatten: true,
                })) as { sessionId: string };
                return reply.sessionId;
            })();
            const reply = (await send(
                "Runtime.evaluate",
                { expression, awaitPromise: true, returnByValue: true },
                await workerSession,
            )) as { result: { value: T }; exceptionDetails?: { exception?: { description?: string }; text: string } };
            if (reply.exceptionDetails) {
                throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
            }

            return reply.result.value;
        },
        exited,
        async close() {
            const tree = processTree(child.pid ?? 0);
            socket.close();
            child.kill("SIGTERM");
            await exited;
            // Helpers that outlive the browser would keep writing into the profile.
            for (const proc of tree) {
                try {
                    process.kill(proc.pid, "SIGKILL");
                } catch {
                    // Gone with the browser.
                }
            }
        },
    };
    return chrome;
}
