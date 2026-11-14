/**
 * `@graphty/graph-io/sources/github`: the GitHub source, a `file-host` source (design section 2.2).
 * Experimental.
 *
 * - load: one file of a repository, read through GitHub's contents API as raw bytes and handed to
 *   graph-io's format detection (by its file name and its first bytes).
 * - list: every file of the repository at a branch, tag or commit (one request for the whole tree),
 *   narrowed by a folder and a search text, paged by the caller's `size`.
 *
 * Every request goes to the API endpoint (`https://api.github.com/`), which answers browsers with
 * CORS headers, so a token given as `credentials.bearer(token)` goes with each request: it raises the
 * rate limit and reaches private repositories. A private repository without a token is answered
 * like a missing one, with E_SOURCE_NOT_FOUND. An exhausted rate limit is E_SOURCE_QUOTA.
 * @module @graphty/graph-io/sources/github
 */

import { endpointOrigin } from "../credentials.js";
import { defineSource } from "../define.js";
import { failAlone, failOn } from "../fail.js";
import { GITHUB_SOURCE_ID } from "../ids.js";
import { type GraphSource, type SourceContext, type SourceListing, type SourceListQuery } from "../types.js";
import { GITHUB_DESCRIPTOR } from "./descriptor.js";
import { type GithubParams } from "./params.js";

export { GITHUB_DESCRIPTOR } from "./descriptor.js";
export { type GithubParams } from "./params.js";

/** An `owner/name` repository: GitHub's own characters, so it never adds a path segment. */
const REPOSITORY = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

/** The statuses this source classifies itself: GitHub's 403 is a rate limit or a refusal. */
const READ_STATUSES = [403, 404] as const;

/** Files a listing returns when the caller gives no size. */
const DEFAULT_PAGE = 100;

/** One entry of a git tree answer. */
interface TreeEntry {
    readonly path?: unknown;
    readonly type?: unknown;
}

/**
 * Check the repository parameter.
 * @param value - the value
 * @param ctx - the context
 * @returns `owner/name`
 */
function checkedRepository(value: unknown, ctx: SourceContext): string {
    const repository = typeof value === "string" ? value : "";
    if (!REPOSITORY.test(repository)) {
        failOn(ctx.report, "E_SOURCE_PARAM", "the repository is not owner/name", {
            name: "repository",
            reason: "format",
        });
    }
    return repository;
}

/**
 * A slash-separated parameter (a path or a ref) as URL path segments, each encoded. A `.` or `..`
 * segment is refused, so a value never reaches another API route.
 * @param value - the value
 * @param name - the parameter's name
 * @param ctx - the context
 * @returns the trimmed value and its encoded form
 */
function checkedSegments(value: unknown, name: string, ctx: SourceContext): { plain: string; encoded: string } {
    const plain = (typeof value === "string" ? value : "").replace(/^\/+|\/+$/g, "");
    const parts = plain.split("/");
    if (plain === "" || parts.some((part) => part === "" || part === "." || part === "..")) {
        failOn(ctx.report, "E_SOURCE_PARAM", `the ${name} is not a repository path`, { name, reason: "format" });
    }
    return { plain, encoded: parts.map(encodeURIComponent).join("/") };
}

/**
 * How long GitHub asked to wait: `Retry-After` (secondary limits), else until `X-RateLimit-Reset`.
 * @param response - the refused response
 * @returns milliseconds, or null when neither is readable
 */
function waitMs(response: Response): number | null {
    const retryAfter = Number(response.headers.get("retry-after") ?? Number.NaN);
    if (Number.isFinite(retryAfter)) {
        return Math.max(0, retryAfter * 1000);
    }
    const reset = Number(response.headers.get("x-ratelimit-reset") ?? Number.NaN);
    return Number.isFinite(reset) ? Math.max(0, reset * 1000 - Date.now()) : null;
}

/**
 * Fetch from the GitHub API, turning its 403 (a rate limit, or a refusal) and 404 into coded errors.
 * @param ctx - the context
 * @param path - the API path, relative to the endpoint
 * @param what - what a 404 means was not found
 * @param value - the name of what was looked up, for E_SOURCE_NOT_FOUND
 * @param init - the request init
 * @returns the response, status 2xx
 */
async function githubFetch(
    ctx: SourceContext,
    path: string,
    what: "repository" | "file",
    value: string,
    init: RequestInit = {},
): Promise<Response> {
    const response = await ctx.fetch(path, { ...init, allowStatus: READ_STATUSES });
    if (response.ok) {
        return response;
    }
    await response.body?.cancel().catch(() => undefined);
    const origin = endpointOrigin(ctx.endpoint);
    const limited =
        response.headers.get("x-ratelimit-remaining") === "0" || response.headers.get("retry-after") !== null;
    if (response.status === 403 && limited) {
        failOn(ctx.report, "E_SOURCE_QUOTA", "GitHub's rate limit is used up", {
            origin,
            retryAfterMs: waitMs(response),
        });
    }
    if (response.status === 403) {
        failOn(ctx.report, "E_SOURCE_FORBIDDEN", "GitHub answered 403", { origin, status: 403, serverCode: null });
    }
    return failOn(ctx.report, "E_SOURCE_NOT_FOUND", `GitHub has no such ${what}`, { origin, what, value });
}

/**
 * Fetch from the GitHub API and parse the body as JSON.
 * @param ctx - the context
 * @param path - the API path
 * @param repository - the repository, for E_SOURCE_NOT_FOUND
 * @returns the parsed body
 */
async function githubJson(ctx: SourceContext, path: string, repository: string): Promise<unknown> {
    const response = await githubFetch(ctx, path, "repository", repository, {
        headers: { Accept: "application/vnd.github+json" },
    });
    try {
        return (await response.json()) as unknown;
    } catch {
        return failOn(ctx.report, "E_SOURCE_RESPONSE", "the GitHub answer is not JSON", {
            origin: endpointOrigin(ctx.endpoint),
            expected: "json",
            contentType: response.headers.get("content-type"),
        });
    }
}

/**
 * The ref a listing reads: the caller's, else the repository's default branch.
 * @param repository - the checked repository
 * @param ref - the caller's ref
 * @param ctx - the context
 * @returns the ref, encoded as URL path segments
 */
async function listedRef(repository: string, ref: unknown, ctx: SourceContext): Promise<string> {
    if (ref !== undefined && ref !== "") {
        return checkedSegments(ref, "ref", ctx).encoded;
    }
    const repo = (await githubJson(ctx, `repos/${repository}`, repository)) as { default_branch?: unknown };
    return checkedSegments(repo.default_branch, "ref", ctx).encoded;
}

/**
 * The GitHub source. Experimental.
 * @category Network sources
 */
export const githubSource: GraphSource<GithubParams> = defineSource<GithubParams>({
    id: GITHUB_SOURCE_ID,
    descriptor: GITHUB_DESCRIPTOR,
    async file(params, ctx) {
        const repository = checkedRepository(params.repository, ctx);
        const path = checkedSegments(params.path, "path", ctx);
        const query =
            params.ref === undefined || params.ref === ""
                ? ""
                : `?ref=${encodeURIComponent(checkedSegments(params.ref, "ref", ctx).plain)}`;
        const body = await githubFetch(
            ctx,
            `repos/${repository}/contents/${path.encoded}${query}`,
            "file",
            `${repository}/${path.plain}`,
            { headers: { Accept: "application/vnd.github.raw" } },
        );
        // no format: graph-io detects it from the file name and the first bytes
        return { body, filename: path.plain.split("/").at(-1) };
    },
    async list(query: SourceListQuery<GithubParams>, ctx): Promise<SourceListing> {
        const { params } = query;
        const repository = checkedRepository(params.repository, ctx);
        const ref = await listedRef(repository, params.ref, ctx);
        const folder =
            params.path === undefined || params.path === ""
                ? ""
                : `${checkedSegments(params.path, "path", ctx).plain}/`;
        const body = (await githubJson(ctx, `repos/${repository}/git/trees/${ref}?recursive=1`, repository)) as {
            tree?: unknown;
        };
        if (!Array.isArray(body.tree)) {
            failOn(ctx.report, "E_SOURCE_RESPONSE", "the GitHub tree answer has no tree", {
                origin: endpointOrigin(ctx.endpoint),
                expected: "github-tree",
                contentType: "application/json",
            });
        }
        // ponytail: one tree request; GitHub truncates a tree past 100,000 entries, so a repository
        // that large lists only part of its files. Walk the contents API folder by folder if that matters.
        const search = query.search?.toLowerCase() ?? "";
        const files = (body.tree as readonly TreeEntry[]).flatMap((entry) =>
            entry.type === "blob" &&
            typeof entry.path === "string" &&
            entry.path.startsWith(folder) &&
            entry.path.toLowerCase().includes(search)
                ? [entry.path]
                : [],
        );
        const start = Number(query.cursor?.start ?? 0);
        const size = query.size ?? DEFAULT_PAGE;
        const items = files.slice(start, start + size).map((path) => ({
            params: params.ref === undefined ? { repository, path } : { repository, path, ref: params.ref },
            name: path,
        }));
        const end = start + items.length;
        return { items, next: end < files.length ? { start: end } : null, total: files.length };
    },
});

/**
 * What a GitHub link names: the repository, and the ref and file path when it has them. Experimental.
 * @category Network sources
 */
export interface GithubLink {
    /** `owner/name`. */
    readonly repository: string;
    /** The branch, tag or commit in the link (only its first path segment), when it names one. */
    readonly ref?: string | undefined;
    /** The file or folder path in the link, when it names one. */
    readonly path?: string | undefined;
}

/**
 * Read a GitHub link: a repository page (`https://github.com/<owner>/<name>`), a file or folder page
 * (`.../blob/<ref>/<path>`, `.../tree/<ref>/<path>`) or a raw file
 * (`https://raw.githubusercontent.com/<owner>/<name>/<ref>/<path>`). The result is the params of the
 * `github` source: a file link loads as it is; a repository or folder link is a listing's params.
 * A ref holding a slash is read as its first segment. Rejects with `E_SOURCE_PARAM`
 * (`name: "url"`): `reason: "format"` when the text is not such a link, `"credentials-in-url"`
 * when it carries a user name or password. Experimental.
 * @param url - the link
 * @returns the repository, ref and path it names
 * @example
 * ```ts
 * const link = parseGithubUrl("https://github.com/owner/name/blob/main/data/karate.graphml");
 * if (link.path !== undefined) {
 *     const { snapshot } = await loadFromSource(githubSource, { ...link, path: link.path });
 * }
 * ```
 * @category Network sources
 */
export function parseGithubUrl(url: string | URL): GithubLink {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return refuse("format");
    }
    if (parsed.username !== "" || parsed.password !== "") {
        return refuse("credentials-in-url");
    }
    const host = parsed.host.toLowerCase();
    const parts = parsed.pathname
        .split("/")
        .filter((part) => part !== "")
        .map(decodeURIComponent);
    const [owner = "", name = ""] = parts;
    const repository = `${owner}/${name.replace(/\.git$/, "")}`;
    if (parsed.protocol !== "https:" || !REPOSITORY.test(repository)) {
        return refuse("format");
    }
    let rest: string[];
    if (host === "raw.githubusercontent.com" && parts.length > 3) {
        rest = parts.slice(2);
    } else if (host === "github.com" || host === "www.github.com") {
        if (parts.length === 2) {
            return { repository };
        }
        if ((parts[2] !== "blob" && parts[2] !== "tree") || parts.length < 4) {
            return refuse("format");
        }
        rest = parts.slice(3);
    } else {
        return refuse("format");
    }
    const [ref, ...path] = rest;
    return path.length === 0 ? { repository, ref } : { repository, ref, path: path.join("/") };
}

/**
 * Reject a GitHub link.
 * @param reason - why
 * @returns never
 */
function refuse(reason: "format" | "credentials-in-url"): never {
    return failAlone("E_SOURCE_PARAM", "not a GitHub link", { name: "url", reason }, `source:${GITHUB_SOURCE_ID}`);
}
