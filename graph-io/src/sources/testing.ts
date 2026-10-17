/**
 * Testing a source without a network: `replayFetch` answers requests from recorded responses and
 * refuses any request it has no recording for. Browser-safe (no file system), so a graphty-element
 * story and a third party's tests use it the same way.
 */

/**
 * One recorded exchange. Experimental.
 * @category Network sources
 */
export interface Recording {
    /** The request method. @defaultValue "GET" */
    readonly method?: string | undefined;
    /** The request URL. Query parameters match in any order. */
    readonly url: string;
    /** The request body, when it must match (JSON bodies compare as JSON). */
    readonly requestBody?: string | undefined;
    /**
     * true: the request must carry a credential; false: it must not. Absent: either. A credential
     * is an Authorization header, or a header or query parameter named in `secretHeaders` /
     * `secretQuery`; its value is never compared.
     */
    readonly credential?: boolean | undefined;
    /** The response status. @defaultValue 200 */
    readonly status?: number | undefined;
    /** The response headers. */
    readonly headers?: Readonly<Record<string, string>> | undefined;
    /** The response body: text, or a value sent as JSON. */
    readonly body?: unknown;
}

/**
 * The options of `replayFetch`. Experimental.
 * @category Network sources
 */
export interface ReplayOptions {
    /** What an unrecorded request does: "throw" (the only choice; the test fails). @defaultValue "throw" */
    readonly onUnrecorded?: "throw" | undefined;
    /** Query parameters that hold a credential: ignored when matching, counted as a credential. */
    readonly secretQuery?: readonly string[] | undefined;
    /** Request headers that hold a credential, beside Authorization. */
    readonly secretHeaders?: readonly string[] | undefined;
}

/**
 * One request `replayFetch` answered. Experimental.
 * @category Network sources
 */
export interface ReplayCall {
    /** The method. */
    readonly method: string;
    /** The URL, origin and path only. */
    readonly url: string;
    /** Whether a credential was sent. */
    readonly credential: boolean;
}

/**
 * A fetch that answers from recordings, plus the requests it answered. Experimental.
 * @category Network sources
 */
export type ReplayFetch = typeof fetch & {
    /** The requests answered, in order. */
    readonly calls: readonly ReplayCall[];
};

/**
 * A fetch that answers every request from recordings: the first unused recording that matches
 * (method, URL with its query in any order, body when recorded, and whether a credential was
 * sent), else the last one that matched, so a recording answers every repeat. A request with no
 * matching recording rejects with an Error naming its method and URL, which a source never
 * retries. Like fetch, a request whose signal is already aborted rejects with the signal's
 * reason. Pass it as the `fetch` option. Experimental.
 * @param recordings - the recorded exchanges
 * @param options - which headers and query parameters hold a credential
 * @returns the fetch
 * @example
 * ```ts
 * const fetch = replayFetch([{ url: "https://example.com/api/people.json?team=core", body: [{ id: "ana", knows: [] }] }]);
 * await loadFromSource("people", { team: "core" }, { endpoint: "https://example.com", fetch });
 * ```
 * @category Network sources
 */
export function replayFetch(recordings: readonly Recording[], options: ReplayOptions = {}): ReplayFetch {
    const secretQuery = new Set(options.secretQuery ?? []);
    const secretHeaders = ["authorization", ...(options.secretHeaders ?? []).map((h) => h.toLowerCase())];
    const used = new Set<number>();
    const calls: ReplayCall[] = [];

    const key = (url: URL): string => {
        const params = [...url.searchParams].filter(([k]) => !secretQuery.has(k)).sort(compare);
        return `${url.origin}${url.pathname}?${new URLSearchParams(params).toString()}`;
    };

    const replay = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init);
        // like fetch: an aborted signal rejects with its reason before anything is answered
        request.signal.throwIfAborted();
        const url = new URL(request.url);
        const method = request.method.toUpperCase();
        const body = method === "GET" || method === "HEAD" ? "" : await request.clone().text();
        const credential =
            secretHeaders.some((h) => request.headers.has(h)) ||
            [...url.searchParams.keys()].some((k) => secretQuery.has(k));
        const wanted = key(url);
        const matches: number[] = [];
        recordings.forEach((r, i) => {
            if (
                (r.method ?? "GET").toUpperCase() === method &&
                key(new URL(r.url)) === wanted &&
                (r.credential === undefined || r.credential === credential) &&
                (r.requestBody === undefined || sameBody(r.requestBody, body))
            ) {
                matches.push(i);
            }
        });
        const index = matches.find((i) => !used.has(i)) ?? matches.at(-1);
        if (index === undefined) {
            throw new Error(`replayFetch: no recording for ${method} ${url.origin}${url.pathname}`);
        }
        used.add(index);
        calls.push({ method, url: `${url.origin}${url.pathname}`, credential });
        const r = recordings[index];
        const status = r.status ?? 200;
        const text = bodyText(r.body);
        const headers = new Headers(r.headers);
        if (text !== null && typeof r.body !== "string" && !headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }
        const nullBody = status === 204 || status === 304 || (status >= 300 && status < 400 && text === null);
        return new Response(nullBody ? null : text, { status, headers });
    };
    return Object.assign(replay, { calls });
}

/**
 * A recorded body as response text.
 * @param body - the recorded body
 * @returns the text, or null for no body
 */
function bodyText(body: unknown): string | null {
    if (body === undefined || body === null) {
        return null;
    }
    return typeof body === "string" ? body : JSON.stringify(body);
}

/**
 * Compare two query entries by key, then value.
 * @param a - one entry
 * @param b - another
 * @returns the order
 */
function compare(a: [string, string], b: [string, string]): number {
    return a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]);
}

/**
 * Whether two bodies are the same, as JSON when both parse.
 * @param recorded - the recorded body
 * @param sent - the sent body
 * @returns true when they match
 */
function sameBody(recorded: string, sent: string): boolean {
    try {
        return JSON.stringify(JSON.parse(recorded)) === JSON.stringify(JSON.parse(sent));
    } catch {
        return recorded === sent;
    }
}

/**
 * A recording made from a real exchange, without its credential: the request's headers are never
 * kept, query parameters named in `secretQuery` are removed from the URL, and of the response only
 * the status, the Content-Type and the headers named in `keepHeaders` are kept. Experimental.
 * @param request - the request sent
 * @param response - its response (read; pass a clone to keep using it)
 * @param options - what to keep and drop
 * @param options.keepHeaders - response headers to keep beside Content-Type
 * @param options.secretQuery - query parameters removed from the URL
 * @returns the recording
 * @category Network sources
 */
export async function recordingFrom(
    request: Request,
    response: Response,
    options: { readonly keepHeaders?: readonly string[]; readonly secretQuery?: readonly string[] } = {},
): Promise<Recording> {
    const headers: Record<string, string> = {};
    for (const name of ["content-type", ...(options.keepHeaders ?? [])]) {
        const value = response.headers.get(name);
        if (value !== null) {
            headers[name.toLowerCase()] = value;
        }
    }
    const url = new URL(request.url);
    for (const name of options.secretQuery ?? []) {
        url.searchParams.delete(name);
    }
    const method = request.method.toUpperCase();
    const requestBody = method === "GET" || method === "HEAD" ? undefined : await request.clone().text();
    return {
        method,
        url: url.toString(),
        ...(requestBody === undefined || requestBody === "" ? {} : { requestBody }),
        status: response.status,
        headers,
        body: await response.text(),
    };
}
