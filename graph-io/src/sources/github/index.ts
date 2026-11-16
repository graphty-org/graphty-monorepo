/**
 * `@graphty/graph-io/sources/github`: the GitHub source, a `file-host` source (design section 2.2).
 * Experimental.
 *
 * - load: one file of a repository, read through GitHub's contents API as raw bytes and handed to
 *   graph-io's format detection (by its file name and its first bytes).
 * - list: every file of the repository at a branch, tag or commit (one request for the whole tree),
 *   narrowed by a folder and a search text, paged by the caller's `size`.
 * - a release: with `release` (a tag, or "latest"), `path` names one of the release's assets, and a
 *   listing lists them. The asset is downloaded from its public address, without the token, which
 *   GitHub would not let follow its redirect: a private repository's assets cannot be read, and a
 *   browser cannot read any, since the host GitHub redirects to sends no CORS headers (Node only).
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

/** One asset of a release answer. */
interface ReleaseAsset {
    readonly name?: unknown;
    readonly browser_download_url?: unknown;
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
    const parts = (typeof value === "string" ? value : "").split("/");
    // a leading or trailing slash is dropped
    while (parts[0] === "" && parts.length > 1) {
        parts.shift();
    }
    while (parts.at(-1) === "" && parts.length > 1) {
        parts.pop();
    }
    const plain = parts.join("/");
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
    what: "repository" | "release" | "file",
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
 * @param value - the repository (or release) looked up, for E_SOURCE_NOT_FOUND
 * @param what - what a 404 means was not found
 * @returns the parsed body
 */
async function githubJson(
    ctx: SourceContext,
    path: string,
    value: string,
    what: "repository" | "release" = "repository",
): Promise<unknown> {
    const response = await githubFetch(ctx, path, what, value, {
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
 * A release's assets, by name: the tag's release, or the latest one for "latest".
 * @param repository - the checked repository
 * @param release - the tag, or "latest"
 * @param ctx - the context
 * @returns each asset's name and download address
 */
async function releaseAssets(
    repository: string,
    release: string,
    ctx: SourceContext,
): Promise<{ name: string; url: string }[]> {
    const route =
        release === "latest" ? "releases/latest" : `releases/tags/${checkedSegments(release, "release", ctx).encoded}`;
    const body = (await githubJson(ctx, `repos/${repository}/${route}`, `${repository}@${release}`, "release")) as {
        assets?: unknown;
    };
    if (!Array.isArray(body.assets)) {
        failOn(ctx.report, "E_SOURCE_RESPONSE", "the GitHub release answer has no assets", {
            origin: endpointOrigin(ctx.endpoint),
            expected: "github-release",
            contentType: "application/json",
        });
    }
    return (body.assets as readonly ReleaseAsset[]).flatMap((asset) =>
        typeof asset.name === "string" &&
        typeof asset.browser_download_url === "string" &&
        asset.browser_download_url.startsWith("https://")
            ? [{ name: asset.name, url: asset.browser_download_url }]
            : [],
    );
}

/**
 * One page of names, narrowed by the query's search text.
 * @param names - every name, in order
 * @param query - the listing query (search, size, cursor)
 * @param params - the params that load a name
 * @returns the page
 */
function page(
    names: readonly string[],
    query: SourceListQuery<GithubParams>,
    params: (name: string) => Readonly<Record<string, unknown>>,
): SourceListing {
    const search = query.search?.toLowerCase() ?? "";
    const found = names.filter((name) => name.toLowerCase().includes(search));
    const start = Number(query.cursor?.start ?? 0);
    const size = query.size ?? DEFAULT_PAGE;
    const items = found.slice(start, start + size).map((name) => ({ params: params(name), name }));
    const end = start + items.length;
    return { items, next: end < found.length ? { start: end } : null, total: found.length };
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
        if (params.release !== undefined && params.release !== "") {
            const assets = await releaseAssets(repository, params.release, ctx);
            const asset = assets.find((each) => each.name === path.plain);
            if (asset === undefined) {
                failOn(ctx.report, "E_SOURCE_NOT_FOUND", "the GitHub release has no such asset", {
                    origin: endpointOrigin(ctx.endpoint),
                    what: "file",
                    value: `${repository}@${params.release}/${path.plain}`,
                });
            }
            // another origin than the API's, so the token stays behind
            return { body: await ctx.fetch(asset.url), filename: asset.name };
        }
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
        const { release } = params;
        if (release !== undefined && release !== "") {
            const assets = await releaseAssets(repository, release, ctx);
            return page(
                assets.map((asset) => asset.name),
                query,
                (path) => ({ repository, release, path }),
            );
        }
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
        const files = (body.tree as readonly TreeEntry[]).flatMap((entry) =>
            entry.type === "blob" && typeof entry.path === "string" && entry.path.startsWith(folder)
                ? [entry.path]
                : [],
        );
        return page(files, query, (path) =>
            params.ref === undefined ? { repository, path } : { repository, path, ref: params.ref },
        );
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
    /** The file or folder path in the link, when it names one; for a release link, the asset's name. */
    readonly path?: string | undefined;
    /** The release's tag (or "latest") in a release link. */
    readonly release?: string | undefined;
}

/**
 * Read a GitHub link: a repository page (`https://github.com/<owner>/<name>`), a file or folder page
 * (`.../blob/<ref>/<path>`, `.../tree/<ref>/<path>`) or a raw file
 * (`https://raw.githubusercontent.com/<owner>/<name>/<ref>/<path>`), a release page
 * (`.../releases/tag/<tag>`, `.../releases/latest`) or a release asset
 * (`.../releases/download/<tag>/<asset>`, `.../releases/latest/download/<asset>`). The result is the params of the
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
        if (parts[2] === "releases") {
            return releaseLink(repository, parts.slice(3));
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
 * Read the part of a release link after `releases/`.
 * @param repository - the link's repository
 * @param rest - the path parts after `releases`
 * @returns the repository, release and asset the link names
 */
function releaseLink(repository: string, rest: readonly string[]): GithubLink {
    const [first, ...more] = rest;
    if (first === "latest") {
        if (more.length === 0) {
            return { repository, release: "latest" };
        }
        return more.length === 2 && more[0] === "download"
            ? { repository, release: "latest", path: more[1] }
            : refuse("format");
    }
    if (first === "tag" && more.length > 0) {
        return { repository, release: more.join("/") };
    }
    return first === "download" && more.length > 1
        ? { repository, release: more.slice(0, -1).join("/"), path: more.at(-1) }
        : refuse("format");
}

/**
 * Reject a GitHub link.
 * @param reason - why
 * @returns never
 */
function refuse(reason: "format" | "credentials-in-url"): never {
    return failAlone("E_SOURCE_PARAM", "not a GitHub link", { name: "url", reason }, `source:${GITHUB_SOURCE_ID}`);
}
