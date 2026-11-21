/**
 * Test support for the real posthog-js chunk: its ingest host is pointed at a same-origin prefix
 * that these wrappers answer themselves, so no request reaches a server, and every body sent there
 * is recorded. Used by the real-chunk tests (analytics.posthog, analytics.cookieless,
 * analytics.cookieless-reload) and the app's network proof. Never imported by app code.
 */

/** The sentinel ingest host: a same-origin prefix answered by {@link interceptPostHog}. */
export const POSTHOG_TEST_HOST = `${globalThis.location.origin}/__posthog_test__`;

/** The canned remote config and flags: autocapture allowed, recording, surveys and the rest off. */
export const POSTHOG_TEST_CONFIG = JSON.stringify({
    flags: {},
    featureFlags: {},
    featureFlagPayloads: {},
    errorsWhileComputingFlags: false,
    // eslint-disable-next-line camelcase -- PostHog's remote config field, spelled as its server sends it
    autocapture_opt_out: false,
    sessionRecording: false,
    surveys: false,
    heatmaps: false,
    capturePerformance: false,
    supportedCompression: [],
});

/** What the wrappers recorded, and how to answer and undo. */
export interface PostHogTestNetwork {
    /** Every request body sent to the sentinel host, as text. */
    readonly bodies: string[];
    /** Every URL requested on the sentinel host. */
    readonly urls: string[];
    /** Sets the remote config answered from now on. */
    setRemoteConfig(json: string): void;
    /** Puts the real fetch, XMLHttpRequest and sendBeacon back, and the browser's own bot tells. */
    restore(): void;
}

/**
 * Reads a request body as text.
 * @param body - what the page sent.
 * @returns its text.
 */
async function bodyText(body: unknown): Promise<string> {
    if (body === null || body === undefined) {
        return "";
    }
    if (typeof body === "string") {
        return body;
    }
    if (body instanceof Blob) {
        return body.text();
    }
    if (body instanceof URLSearchParams || body instanceof FormData) {
        return new Response(body).text();
    }
    return JSON.stringify(body);
}

/** The browser facts posthog-js reads to drop a bot's events; Playwright's browser reports itself as one. */
const BOT_TELLS = ["userAgent", "webdriver", "userAgentData"] as const;

/**
 * What every wrapper records into, one set for the whole file: posthog-js keeps the `fetch` it found
 * when it loaded, so an earlier case's wrapper still answers a later case's requests, and must
 * record where that case looks.
 */
const bodies: string[] = [];
const urls: string[] = [];
let remoteConfig = POSTHOG_TEST_CONFIG;

/**
 * Answers every request to the sentinel host here, recording its body, and makes the test browser
 * look like a reader's, so posthog-js does not drop every event as a bot's. Clears what earlier
 * cases recorded.
 * @returns the recorded requests and the undo.
 */
export function interceptPostHog(): PostHogTestNetwork {
    bodies.length = 0;
    urls.length = 0;
    remoteConfig = POSTHOG_TEST_CONFIG;
    const answer = (url: string): string =>
        url.includes("/flags") || url.includes("/config") ? remoteConfig : JSON.stringify({ status: 1 });

    const realFetch = globalThis.fetch;
    const realSend = XMLHttpRequest.prototype.send;
    const realOpen = XMLHttpRequest.prototype.open;
    const realBeacon = navigator.sendBeacon.bind(navigator);

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith(POSTHOG_TEST_HOST)) {
            return realFetch(input, init);
        }
        urls.push(url);
        bodies.push(await bodyText(init?.body ?? (input instanceof Request ? await input.text() : undefined)));
        return new Response(answer(url), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const opened = new WeakMap<XMLHttpRequest, string>();
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]): void {
        opened.set(this, String(args[1]));
        (realOpen as (...a: unknown[]) => void).apply(this, args);
    };
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
        const url = opened.get(this) ?? "";
        if (!url.startsWith(POSTHOG_TEST_HOST)) {
            realSend.call(this, body);
            return;
        }
        urls.push(url);
        void bodyText(body).then((text) => bodies.push(text));
    };
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
        if (!String(url).startsWith(POSTHOG_TEST_HOST)) {
            return realBeacon(url, data);
        }
        urls.push(String(url));
        void bodyText(data).then((text) => bodies.push(text));
        return true;
    };

    const values = {
        userAgent: navigator.userAgent.replaceAll("Headless", ""),
        webdriver: false,
        userAgentData: undefined,
    };
    for (const name of BOT_TELLS) {
        Object.defineProperty(navigator, name, { configurable: true, get: () => values[name] });
    }

    return {
        bodies,
        urls,
        setRemoteConfig: (json) => {
            remoteConfig = json;
        },
        restore: () => {
            globalThis.fetch = realFetch;
            XMLHttpRequest.prototype.send = realSend;
            XMLHttpRequest.prototype.open = realOpen;
            navigator.sendBeacon = realBeacon;
            for (const name of BOT_TELLS) {
                Reflect.deleteProperty(navigator, name);
            }
        },
    };
}

/** One event as posthog-js batches it. */
export interface SentEvent {
    readonly event: string;
    readonly properties: Record<string, unknown> & { $time?: number };
}

/**
 * The events in recorded batch bodies: an `{ batch }` object or a bare array of events.
 * @param texts - the bodies.
 * @returns each event with its properties.
 */
export function sentEvents(texts: readonly string[]): SentEvent[] {
    const events: SentEvent[] = [];
    for (const text of texts) {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            continue;
        }
        const batch = Array.isArray(parsed) ? parsed : (parsed as { batch?: unknown }).batch;
        if (Array.isArray(batch)) {
            events.push(...(batch as SentEvent[]));
        } else if (typeof parsed === "object" && parsed !== null && "event" in parsed) {
            events.push(parsed as SentEvent);
        }
    }
    return events;
}
