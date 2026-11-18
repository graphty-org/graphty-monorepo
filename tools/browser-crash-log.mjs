/**
 * Makes a test page that goes away explain itself. When a page's renderer crashes, or the page or the
 * whole browser closes while vitest still needs it, vitest only says "Browser connection was closed
 * while running tests. Was the page closed unexpectedly?" (#8763): nothing tells a renderer killed for
 * memory from a GPU-process or browser crash. So every Playwright provider `withTestGuards` sees is
 * made to print, at that moment, under a "[browser-crash-log]" heading:
 *
 * - which event it was (the page's `crash`, its `close`, the browser's `disconnected`) and the page's URL
 * - the last lines Chromium wrote to its stderr, and how its process ended
 *   ("<process did exit: exitCode=..., signal=SIGKILL>" is the kernel's out-of-memory killer)
 * - the machine's memory (/proc/meminfo), this cgroup's limit, use, peak and out-of-memory kills,
 *   and the biggest processes by resident memory.
 *
 * Chromium's stderr reaches it through Playwright's `pw:browser` debug channel, which this turns on
 * and keeps in memory instead of printing; nothing is printed unless a page goes away. A run that set
 * DEBUG=pw:browser itself still sees every line.
 *
 * Loaded by test-wait-guard.mjs, which test pages load too, so nothing here imports a node module
 * until a provider is created in vitest's own process.
 */

/** How many of Chromium's most recent stderr lines are kept. */
const KEEP_LINES = 200;
/** How many of them a report prints. */
const PRINT_LINES = 60;

/** What a report puts before each stderr line it quotes, so the capture never takes it back. */
const QUOTE = "  | ";

const recent = [];
let capturing = false;

/**
 * Turns on Playwright's browser log and keeps its lines from this process's stderr. Before Playwright
 * loads, which the provider does when it opens its browser, so the setting is read.
 */
function captureBrowserStderr() {
    if (capturing) {
        return;
    }
    capturing = true;
    const debug = process.env.DEBUG ?? "";
    if (/(^|,)pw:browser(,|$)/.test(debug)) {
        return; // the run asked to see it: leave it on screen
    }
    process.env.DEBUG = debug ? `${debug},pw:browser` : "pw:browser";
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk, ...rest) => {
        const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
        if (!text.includes("pw:browser")) {
            return write(chunk, ...rest);
        }
        const others = [];
        for (const line of text.split("\n")) {
            if (isBrowserLine(line)) {
                recent.push(line);
            } else {
                others.push(line);
            }
        }
        recent.splice(0, Math.max(0, recent.length - KEEP_LINES));
        const kept = others.join("\n");
        if (kept.trim()) {
            return write(kept, ...rest);
        }
        rest.find((r) => typeof r === "function")?.();
        return true;
    };
}

/**
 * Whether a line of stderr is Playwright's `pw:browser` log ("<time> pw:browser [pid=1][err] ..." or,
 * on a terminal, the namespace in color near the start), as against a report quoting one.
 * @param line - one line
 * @returns true for a line of that log
 */
function isBrowserLine(line) {
    return !line.startsWith(QUOTE) && line.slice(0, 48).includes("pw:browser");
}

/**
 * The machine's and this cgroup's memory, and the biggest processes. Synchronous, so the report is out
 * before vitest, which fails the run on the same event, exits.
 * @returns lines to print
 */
function memoryReport() {
    const { readFileSync } = process.getBuiltinModule("node:fs");
    const { execFileSync } = process.getBuiltinModule("node:child_process");
    const read = (path) => {
        try {
            return readFileSync(path, "utf8").trim();
        } catch {
            return undefined;
        }
    };
    const lines = [];
    const meminfo = read("/proc/meminfo");
    if (meminfo) {
        const keep = /^(MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree|Committed_AS):/;
        const shown = meminfo.split("\n").filter((l) => keep.test(l));
        lines.push(`meminfo: ${shown.map((l) => l.replaceAll(/\s+/g, " ")).join("; ")}`);
    }
    const cgroup = read("/proc/self/cgroup")?.match(/^0::(.*)$/m)?.[1];
    if (cgroup !== undefined) {
        const dir = `/sys/fs/cgroup${cgroup === "/" ? "" : cgroup}`;
        for (const file of ["memory.max", "memory.current", "memory.peak", "memory.swap.current", "memory.events"]) {
            const value = read(`${dir}/${file}`);
            if (value !== undefined) {
                lines.push(`cgroup ${cgroup} ${file}: ${value.replaceAll("\n", "; ")}`);
            }
        }
    }
    try {
        const ps = execFileSync("ps", ["-eo", "pid,rss,etimes,args", "--sort=-rss"], { encoding: "utf8" });
        lines.push(
            "biggest processes (rss kB):",
            ...ps
                .split("\n")
                .slice(0, 11)
                .map((l) => `  ${l.slice(0, 220)}`),
        );
    } catch (error) {
        lines.push(`ps failed: ${String(error)}`);
    }
    return lines;
}

/**
 * Prints what happened, Chromium's last stderr lines and the memory.
 * @param event - what went away and how
 */
function report(event) {
    const lines = [
        `[browser-crash-log] ${event} at ${new Date().toISOString()}`,
        `Chromium's last ${String(Math.min(PRINT_LINES, recent.length))} stderr lines:`,
        ...recent.slice(-PRINT_LINES).map((l) => `${QUOTE}${l}`),
    ];
    try {
        lines.push(...memoryReport());
    } catch (error) {
        lines.push(`memory report failed: ${String(error)}`);
    }
    console.error(lines.join("\n"));
}

/** The pages, contexts and browsers something asked to close: their closing is no news. */
const asked = new WeakSet();
/** The pages, contexts and browsers already watched. */
const watched = new WeakSet();

/**
 * Notes when something calls `close()` on a page, a context or a browser.
 * @param target - the page, context or browser
 * @returns the target
 */
function noteClose(target) {
    if (!watched.has(target)) {
        watched.add(target);
        const close = target.close.bind(target);
        target.close = (...args) => {
            asked.add(target);
            return close(...args);
        };
    }
    return target;
}

/**
 * Reports a page that crashes, and a page that closes or a browser that disconnects when nothing asked
 * it to (vitest closes its pages, contexts and browser when a run ends, and a session's old page
 * before opening its new one).
 * @param provider - a provider `playwright()` built (vitest's PlaywrightBrowserProvider)
 */
function watch(provider) {
    const openBrowser = provider.openBrowser.bind(provider);
    provider.openBrowser = async (...args) => {
        const browser = await openBrowser(...args);
        if (!watched.has(browser)) {
            noteClose(browser);
            browser.on("disconnected", () => {
                if (!asked.has(browser)) {
                    report("the browser disconnected while tests were running");
                }
            });
        }
        return browser;
    };
    const openBrowserPage = provider.openBrowserPage.bind(provider);
    provider.openBrowserPage = async (...args) => {
        const page = noteClose(await openBrowserPage(...args));
        const context = noteClose(page.context());
        page.on("crash", () => report(`the page's renderer crashed (${page.url()})`));
        page.on("close", () => {
            if (![page, context, context.browser()].some((t) => t && asked.has(t))) {
                report(`the page closed while tests were running (${page.url()})`);
            }
        });
        return page;
    };
}

/**
 * Makes a Playwright provider report a page or browser that goes away mid-run. In place, as
 * test-wait-guard.mjs's action deadline, because vitest keeps the object the config holds.
 * @param provider - the value `playwright()` returned
 */
export function logBrowserCrashes(provider) {
    if (provider.crashLogged || typeof provider.providerFactory !== "function") {
        return;
    }
    provider.crashLogged = true;
    captureBrowserStderr();
    const factory = provider.providerFactory;
    provider.providerFactory = (...args) => {
        const built = factory(...args);
        watch(built);
        return built;
    };
}
