/**
 * The Firefox lifecycle harness: Firefox driven over Marionette, its own remote protocol.
 *
 * Playwright drives Firefox through Juggler, which reaches web pages only. Firefox's low-memory tab
 * unloader (`TabUnloader`, the code that unloads background tabs when the system runs low on
 * memory) lives in the browser's own chrome, so the test needs Marionette's chrome context, which
 * Firefox opens only when started with `-marionette -remote-allow-system-access`. The protocol is a
 * length-prefixed JSON stream over TCP (`<bytes>:[0, id, command, params]`), so this harness speaks
 * it directly with Node's `net`, as cdp-harness.ts speaks the DevTools protocol: no geckodriver,
 * no download at install time.
 *
 * It starts Mozilla's own Firefox, not Playwright's build: Playwright's Firefox never reports a
 * background tab as hidden (`document.visibilityState` stays "visible" after another tab is
 * selected, checked on its Firefox 141 build), so the write the element starts on hide would never
 * run. `stockFirefox()` downloads the pinned release from Mozilla once and keeps it in the user's
 * cache; `GRAPHTY_FIREFOX` names another binary instead.
 */

import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { homedir } from "node:os";
import path from "node:path";

/** The Firefox release the harness downloads. Raise it with each Firefox release worth checking. */
export const FIREFOX_VERSION = "158.0";

/**
 * Mozilla's Firefox for this Linux machine: `GRAPHTY_FIREFOX` when set, else the pinned release,
 * downloaded from archive.mozilla.org into `~/.cache/graphty-lifecycle` the first time.
 * @returns The path of the `firefox` binary.
 */
export async function stockFirefox(): Promise<string> {
    if (process.env.GRAPHTY_FIREFOX) {
        return process.env.GRAPHTY_FIREFOX;
    }

    const dir = path.join(homedir(), ".cache", "graphty-lifecycle", `firefox-${FIREFOX_VERSION}`);
    const binary = path.join(dir, "firefox", "firefox");
    if (!existsSync(binary)) {
        const url = `https://archive.mozilla.org/pub/firefox/releases/${FIREFOX_VERSION}/linux-x86_64/en-US/firefox-${FIREFOX_VERSION}.tar.xz`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`downloading ${url}: HTTP ${response.status}`);
        }

        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        const archive = path.join(dir, "firefox.tar.xz");
        writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
        execFileSync("tar", ["-xJf", archive, "-C", dir]);
        rmSync(archive);
    }

    return binary;
}

/** A Marionette reply: `[1, id, error, result]`. */
type Reply = [1, number, { error: string; message: string } | null, { value?: unknown } | null];

/** A running Firefox with a Marionette session. */
export interface Marionette {
    /** Run a script in the browser's chrome (privileged) context; `arguments` holds `args`. */
    chrome<T>(script: string, args?: unknown[]): Promise<T>;
    /** Run a script in the current tab's page. */
    content<T>(script: string, args?: unknown[]): Promise<T>;
    /** Run a script in the current tab's page that ends by calling `arguments[arguments.length - 1](value)`. */
    contentAsync<T>(script: string, args?: unknown[]): Promise<T>;
    /** Send any Marionette command, in whichever context is current. */
    send<T>(command: string, params?: Record<string, unknown>): Promise<T>;
    /** Kill the browser. */
    close(): Promise<void>;
}

/** The preferences a test profile starts with: no first-run pages, WebGL on Mesa's software GL. */
const PREFS: Record<string, string | number | boolean> = {
    "marionette.port": 0,
    "browser.shell.checkDefaultBrowser": false,
    "browser.startup.homepage_override.mstone": "ignore",
    "browser.aboutwelcome.enabled": false,
    "datareporting.policy.dataSubmissionEnabled": false,
    "toolkit.telemetry.reportingpolicy.firstRun": false,
    "webgl.force-enabled": true,
};

/**
 * Start Firefox on a profile with Marionette's chrome context open.
 * @param userDataDir - The profile directory.
 * @param executable - The Firefox to start (`stockFirefox()`).
 * @returns The harness.
 */
export async function launchMarionette(userDataDir: string, executable: string): Promise<Marionette> {
    writeFileSync(
        path.join(userDataDir, "user.js"),
        Object.entries(PREFS)
            .map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`)
            .join("\n"),
    );
    const browser: ChildProcess = spawn(
        executable,
        [
            "-marionette",
            "-remote-allow-system-access",
            "-headless",
            "-no-remote",
            "-profile",
            userDataDir,
            "about:blank",
        ],
        {
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                LIBGL_ALWAYS_SOFTWARE: "1",
                __GLX_VENDOR_LIBRARY_NAME: "mesa",
                __EGL_VENDOR_LIBRARY_FILENAMES: "/usr/share/glvnd/egl_vendor.d/50_mesa.json",
                MOZ_WEBGL_FORCE_EGL: "1",
            },
        },
    );
    const exited = new Promise<void>((resolve) => browser.once("exit", () => resolve()));

    // Firefox logs the port Marionette listens on (marionette.port 0 picks a free one).
    let output = "";
    const port = await new Promise<number>((resolve, reject) => {
        const read = (chunk: Buffer): void => {
            output += chunk.toString();
            const match = /Marionette\s+INFO\s+Listening on port (\d+)/.exec(output);
            if (match) {
                resolve(Number(match[1]));
            }
        };
        browser.stdout?.on("data", read);
        browser.stderr?.on("data", read);
        void exited.then(() => reject(new Error(`Firefox exited before Marionette listened: ${output.slice(-2000)}`)));
    });

    const socket = net.connect(port, "127.0.0.1");
    const waiting = new Map<number, (reply: Reply) => void>();
    let hello: (() => void) | undefined;
    const greeted = new Promise<void>((resolve) => (hello = resolve));
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        for (;;) {
            const colon = buffer.indexOf(":");
            if (colon < 0) {
                return;
            }

            const length = Number(buffer.subarray(0, colon).toString());
            if (buffer.length < colon + 1 + length) {
                return;
            }

            const message = JSON.parse(buffer.subarray(colon + 1, colon + 1 + length).toString()) as unknown;
            buffer = buffer.subarray(colon + 1 + length);
            if (Array.isArray(message)) {
                const reply = message as Reply;
                waiting.get(reply[1])?.(reply);
                waiting.delete(reply[1]);
            } else {
                hello?.();
            }
        }
    });
    await greeted;

    let nextId = 0;
    let context: "chrome" | "content" = "content";
    const send = async <T>(command: string, params: Record<string, unknown> = {}): Promise<T> => {
        const id = ++nextId;
        const text = JSON.stringify([0, id, command, params]);
        const reply = await new Promise<Reply>((resolve) => {
            waiting.set(id, resolve);
            socket.write(`${Buffer.byteLength(text)}:${text}`);
        });
        if (reply[2] !== null) {
            throw new Error(`${command}: ${reply[2].error}: ${reply[2].message}`);
        }

        return reply[3]?.value as T;
    };
    const inContext = async (wanted: "chrome" | "content"): Promise<void> => {
        if (context !== wanted) {
            await send("Marionette:SetContext", { value: wanted });
            context = wanted;
        }
    };

    await send("WebDriver:NewSession", { capabilities: { alwaysMatch: { "moz:firefoxOptions": {} } } });
    return {
        send,
        async chrome<T>(script: string, args: unknown[] = []) {
            await inContext("chrome");
            return send<T>("WebDriver:ExecuteScript", { script, args });
        },
        async content<T>(script: string, args: unknown[] = []) {
            await inContext("content");
            return send<T>("WebDriver:ExecuteScript", { script, args });
        },
        async contentAsync<T>(script: string, args: unknown[] = []) {
            await inContext("content");
            return send<T>("WebDriver:ExecuteAsyncScript", { script, args, scriptTimeout: 60_000 });
        },
        async close() {
            socket.destroy();
            browser.kill("SIGKILL");
            await exited;
        },
    };
}
