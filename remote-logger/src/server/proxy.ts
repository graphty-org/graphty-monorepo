/**
 * Reverse proxy with automatic remote-logger injection.
 *
 * Proxies requests to a target URL and injects the remote-logger script
 * into HTML responses. Non-HTML responses pass through unmodified.
 * @module server/proxy
 */

import type * as http from "http";
import httpProxy from "http-proxy";
import * as https from "https";
import { defaultTreeAdapter, type DefaultTreeAdapterMap,html as parse5Html, parse, serialize } from "parse5";

const HEADERS_TO_REMOVE = [
    "content-security-policy",
    "content-security-policy-report-only",
    "x-frame-options",
    "strict-transport-security",
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "link",
    "etag",
    "cache-control",
    "age",
    "server",
    "x-sveltekit-page",
    "x-vercel-cache",
    "x-vercel-id",
    "x-powered-by",
    "via",
];

/**
 * Extract the origin (protocol + host) from a full URL.
 * @param targetUrl - The full target URL
 * @returns The origin portion of the URL
 */
function extractOrigin(targetUrl: string): string {
    const parsed = new URL(targetUrl);
    return parsed.origin;
}

/**
 * Extract the path portion from a full URL.
 * @param targetUrl - The full target URL
 * @returns The path including query string
 */
function extractPath(targetUrl: string): string {
    const parsed = new URL(targetUrl);
    return parsed.pathname + parsed.search;
}


/**
 * Rewrite a Location header to route back through the proxy.
 * @param location - The original Location header value
 * @param proxyBaseUrl - The proxy base URL (e.g., "/proxy/")
 * @returns The rewritten Location header
 */
function rewriteLocationHeader(location: string, proxyBaseUrl: string): string {
    if (location.startsWith("http://") || location.startsWith("https://")) {
        return proxyBaseUrl + location;
    }
    return location;
}

/**
 * Rewrite Set-Cookie attributes for proxied responses.
 * Removes Domain (wrong domain) and Secure (proxy may serve over HTTP).
 * @param cookie - The original Set-Cookie header value
 * @returns The rewritten cookie
 */
function rewriteSetCookie(cookie: string): string {
    let rewritten = cookie.replace(/;\s*domain=[^;]*/gi, "");
    rewritten = rewritten.replace(/;\s*secure/gi, "");
    return rewritten;
}

type Element = DefaultTreeAdapterMap["element"];
type Document = DefaultTreeAdapterMap["document"];

/**
 * Find the first element with a given tag name in the AST.
 * @param node - The AST node to search from
 * @param tagName - The tag name to find
 * @returns The element or null
 */
function findElement(node: Document | Element, tagName: string): Element | null {
    if (defaultTreeAdapter.isElementNode(node) && node.tagName === tagName) {
        return node;
    }
    const children = node.childNodes ?? [];
    for (const child of children) {
        if (defaultTreeAdapter.isElementNode(child)) {
            const found = findElement(child, tagName);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

/**
 * Strip integrity attributes from all script and link elements in the AST.
 * @param node - The AST node to search from
 */
function stripIntegrityAttributes(node: Document | Element): void {
    if (defaultTreeAdapter.isElementNode(node)) {
        if (node.tagName === "script" || node.tagName === "link") {
            node.attrs = node.attrs.filter(a => a.name !== "integrity");
        }
    }
    const children = node.childNodes ?? [];
    for (const child of children) {
        if (defaultTreeAdapter.isElementNode(child)) {
            stripIntegrityAttributes(child);
        }
    }
}

const XHTML_NS = parse5Html.NS.HTML;

const CHROME_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Inject the remote-logger script and base tag into HTML using parse5.
 * Inserts base at start of head, script at end of head, and strips
 * integrity attributes from script/link elements.
 * @param html - The original HTML string
 * @param scriptUrl - URL to the remote-logger script
 * @param baseHref - Base href for rewriting absolute paths
 * @returns The modified HTML
 */
export function injectScript(html: string, scriptUrl: string, baseHref: string): string {
    const doc = parse(html);

    const head = findElement(doc, "head");
    if (head) {
        const baseEl = defaultTreeAdapter.createElement("base", XHTML_NS, [{ name: "href", value: baseHref }]);
        const scriptEl = defaultTreeAdapter.createElement("script", XHTML_NS, [{ name: "src", value: scriptUrl }]);

        // Insert base at start of head (before any relative URLs)
        if (head.childNodes.length > 0) {
            defaultTreeAdapter.insertBefore(head, baseEl, head.childNodes[0]);
        } else {
            defaultTreeAdapter.appendChild(head, baseEl);
        }

        // Append script at end of head
        defaultTreeAdapter.appendChild(head, scriptEl);
    }

    stripIntegrityAttributes(doc);

    return serialize(doc);
}

/**
 * Check if a content-type header indicates HTML.
 * @param contentType - The Content-Type header value
 * @returns True if the content is HTML
 */
function isHtmlContentType(contentType: string | undefined): boolean {
    if (!contentType) {
        return false;
    }
    return contentType.includes("text/html");
}

/**
 * Validate that a URL is a valid proxy target.
 * @param targetUrl - The URL to validate
 * @returns True if the URL is valid for proxying
 */
export function isValidProxyTarget(targetUrl: string): boolean {
    try {
        const parsed = new URL(targetUrl);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

/** Result of creating a proxy instance. */
export interface ProxyInstance {
    /** Handle an incoming proxy request. */
    handleRequest: (
        req: http.IncomingMessage,
        res: http.ServerResponse,
        targetUrl: string,
        requestProtocol: string,
        requestHost: string,
    ) => void;
    /** Close the proxy and free resources. */
    close: () => void;
}

/**
 * Create a proxy instance that injects the remote-logger into HTML responses.
 * @param proxyBasePath - Base path for the proxy (e.g., "/proxy/")
 * @param quiet - Suppress terminal output
 * @returns A proxy instance with handleRequest and close methods
 */
export function createProxy(proxyBasePath: string, quiet: boolean): ProxyInstance {
    // Custom TLS agent to avoid JA3 fingerprint-based blocking by CDNs.
    // Fastly, Akamai, etc. blocklist Node.js's default TLS fingerprint.
    // Using a custom sigalgs list changes the fingerprint without restricting
    // TLS version, so sites that only support TLS 1.2 still work.
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        sigalgs: "ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512",
    });

    const proxy = httpProxy.createProxyServer({
        selfHandleResponse: true,
        changeOrigin: true,
        followRedirects: false,
        secure: false,
    });

    proxy.on("proxyRes", (proxyRes, req, res) => {
        const chunks: Buffer[] = [];

        proxyRes.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });

        proxyRes.on("end", () => {
            const body = Buffer.concat(chunks);

            // Copy headers with modifications
            const headers: Record<string, string | string[]> = {};
            for (const [key, value] of Object.entries(proxyRes.headers)) {
                if (value === undefined) {
                    continue;
                }
                if (HEADERS_TO_REMOVE.includes(key.toLowerCase())) {
                    continue;
                }

                if (key.toLowerCase() === "location" && typeof value === "string") {
                    headers[key] = rewriteLocationHeader(value, proxyBasePath);
                    continue;
                }

                if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
                    headers[key] = value.map(rewriteSetCookie);
                    continue;
                }

                headers[key] = value;
            }

            const contentType = proxyRes.headers["content-type"];
            const statusCode = proxyRes.statusCode ?? 200;

            if (isHtmlContentType(contentType)) {
                const html = body.toString("utf-8");
                const reqExtra = req as http.IncomingMessage & { _proxyTargetUrl?: string; _proxyScriptUrl?: string };
                const originalUrl = reqExtra._proxyTargetUrl;
                const reqScriptUrl = reqExtra._proxyScriptUrl ?? "/remote-logger.js";
                const baseHref = originalUrl ? `${proxyBasePath}${extractOrigin(originalUrl)}/` : proxyBasePath;
                const modified = injectScript(html, reqScriptUrl, baseHref);

                headers["content-type"] = "text/html; charset=utf-8";
                headers["cache-control"] = "no-cache, no-store";

                res.writeHead(statusCode, headers);
                res.end(modified);
            } else {
                if (body.length > 0) {
                    headers["content-length"] = String(body.length);
                }
                res.writeHead(statusCode, headers);
                res.end(body);
            }
        });
    });

    proxy.on("error", (err, _req, res) => {
        const isTlsError = err.message.includes("SSL") ||
            err.message.includes("TLS") ||
            err.message.includes("EPROTO");

        const message = isTlsError
            ? `TLS connection failed: ${err.message}`
            : err.message;

        if (!quiet) {
            console.error(`[proxy] Error: ${message}`);
        }

        const serverRes = res as http.ServerResponse;
        if (!serverRes.headersSent) {
            serverRes.writeHead(502, { "Content-Type": "application/json" });
        }
        serverRes.end(JSON.stringify({ error: "Bad Gateway", message }));
    });

    const handleRequest = (
        req: http.IncomingMessage,
        res: http.ServerResponse,
        targetUrl: string,
        requestProtocol: string,
        requestHost: string,
    ): void => {
        if (!isValidProxyTarget(targetUrl)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid target URL. Must start with http:// or https://" }));
            return;
        }

        const target = extractOrigin(targetUrl);
        const targetPath = extractPath(targetUrl);

        // Stash per-request data for the proxyRes handler
        const reqExtra = req as http.IncomingMessage & { _proxyTargetUrl?: string; _proxyScriptUrl?: string };
        reqExtra._proxyTargetUrl = targetUrl;
        reqExtra._proxyScriptUrl = `${requestProtocol}://${requestHost}/remote-logger.js`;

        // Override the request path to the target's path
        req.url = targetPath;

        // Request uncompressed content so we can modify HTML
        req.headers["accept-encoding"] = "identity";

        // Strip headers that reveal this is a cross-origin/proxy/headless request.
        // CDNs like Fastly use these for bot detection.
        delete req.headers["sec-fetch-site"];
        delete req.headers["sec-fetch-mode"];
        delete req.headers["sec-fetch-dest"];
        delete req.headers["sec-fetch-user"];
        delete req.headers["sec-ch-ua"];
        delete req.headers["sec-ch-ua-mobile"];
        delete req.headers["sec-ch-ua-platform"];
        delete req.headers.origin;
        delete req.headers.referer;

        // Use a standard Chrome UA to avoid bot detection
        req.headers["user-agent"] = CHROME_UA;

        const proxyOptions: httpProxy.ServerOptions = { target };
        if (targetUrl.startsWith("https://")) {
            proxyOptions.agent = httpsAgent;
        }

        proxy.web(req, res, proxyOptions);
    };

    const close = (): void => {
        proxy.close();
    };

    return { handleRequest, close };
}
