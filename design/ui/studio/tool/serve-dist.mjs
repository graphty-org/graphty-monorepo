// The one static server for a production build of the graphty app (graphty/dist), used by real.mjs's
// sessions and bars.mjs's runs, so both see the same app behavior from the same build.
//
//   const http = createServer(serveDist(dist, { repo, site: (pathname) => body | null }));
//
// The app is at / (so /samples/*.gml resolve); any path that is not a file and has no extension is
// the app's page. `site` may answer a path itself (a tier's own site.json, tier6.mjs siteFile).
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

export const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".wasm": "application/wasm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json",
    ".gml": "text/plain",
    ".txt": "text/plain",
};

export function serveDist(dist, { repo, site } = {}) {
    return async (req, res) => {
        let pathname;
        try {
            pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
        } catch {
            return res.writeHead(400).end();
        }
        const own = site?.(pathname);
        if (own) return res.writeHead(200, { "content-type": "application/json" }).end(own);
        const f = join(dist, normalize(pathname).replace(/^[/\\]+/, ""));
        if (f !== dist && !f.startsWith(dist + sep)) return res.writeHead(403).end();
        let type = TYPES[extname(f)] ?? "application/octet-stream";
        let body = await readFile(f).catch(() => null);
        if (!body) {
            // the deploy writes site.json beside the app (graphty/sites/<channel>.json); a local
            // build has none, and the app's 404 for it ended every setup with SETUP FAILED (tier 4)
            if (repo && f === join(dist, "site.json"))
                body = await readFile(join(repo, "graphty/sites/production.json")).catch(() => null);
            if (body) return res.writeHead(200, { "content-type": "application/json" }).end(body);
            if (extname(f)) return res.writeHead(404).end();
            // a rebuild in progress removes the page for a moment; that must not kill the run
            body = await readFile(join(dist, "index.html")).catch(() => null);
            if (!body) return res.writeHead(503).end();
            type = "text/html";
        }
        res.writeHead(200, { "content-type": type }).end(body);
    };
}
