/**
 * Keeps a long browser test run from exhausting its page's file descriptors.
 *
 * Vitest runs every test file of a browser project in one page, loading the file's whole module
 * graph again in a fresh iframe. Vite serves a source module with `Cache-Control: no-cache`, so
 * from the second load on Chromium answers it from its HTTP cache after a 304. In Chromium 158
 * (Playwright 1.65's build, chromium_headless_shell-1254) each response read back from the cache
 * reaches the renderer as its own shared memory region, one file descriptor that stays open until
 * a full garbage collection: about 1,700 for each load of the graphty app. Chromium caps a
 * renderer at 16,384, and on reaching it drops every WebSocket of the page with 1001 "going away",
 * so vitest stops with "Browser connection was closed while running tests" (#3568: graphty-23's 41
 * real-element files ended after 23 to 39 of them). Chromium 143 held about 60 for the same run.
 *
 * `noStoreRevalidated` turns a response the cache would revalidate (no `Cache-Control`, or
 * `no-cache`) into `no-store`, so each load is a plain network read whose memory goes with the
 * iframe. Pre-bundled dependencies (`max-age=31536000,immutable`) are untouched, so the megabytes
 * of them stay cached across files (#3350).
 */

/**
 * The value a response should carry instead of `value`.
 * @param value - its `Cache-Control`, or undefined
 * @returns `no-store` for a response the browser would revalidate, else `value`
 */
export function noStoreFor(value) {
    return value === undefined || /\bno-cache\b/i.test(String(value)) ? "no-store" : value;
}

/**
 * Makes one response carry `no-store` in place of a revalidating `Cache-Control`, whether its
 * handler set the header or passes it to `writeHead`.
 * @param res - the server response
 */
function serveNoStore(res) {
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
        const headers = args.find((arg) => arg !== null && typeof arg === "object" && !Array.isArray(arg));
        const key = headers ? Object.keys(headers).find((k) => k.toLowerCase() === "cache-control") : undefined;
        if (key) {
            headers[key] = noStoreFor(headers[key]);
        } else {
            res.setHeader("Cache-Control", noStoreFor(res.getHeader("Cache-Control")));
        }
        return writeHead.apply(this, args);
    };
}

/**
 * A Vite plugin that serves revalidated responses as `no-store` (see the file comment).
 * @returns the plugin
 */
export function noStoreRevalidated() {
    return {
        name: "graphty:browser-test-no-store",
        configureServer(server) {
            server.middlewares.use((_req, res, next) => {
                serveNoStore(res);
                next();
            });
        },
    };
}
