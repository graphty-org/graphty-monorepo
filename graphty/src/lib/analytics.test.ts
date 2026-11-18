/**
 * Usage analytics through its seams (no module mocks): Umami's counts and their payload, the visit
 * record, the address bar, PostHog's lifecycle with a stand-in client, and what `cleanPostHogEvent`
 * lets through. The `hostname` and `privacySignals` seams make graphty.app and no DNT the default.
 */
import type { SourceLoaded } from "@graphty/graphty-element/session";
import type { CaptureResult, PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, type Mock, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig, type SiteAnalytics, type SiteConfig } from "../siteConfig";
import { forgetUsageAnswer } from "../workspace/privacy/usageData";
import {
    allowlisted,
    bootQuery,
    cleanPostHogEvent,
    cleanUrl,
    count,
    detail,
    isGraphActionOp,
    type LoadAllowlists,
    maskEveryAttribute,
    onUsageEvent,
    panelId,
    postHog,
    readChannel,
    readSurveyState,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setCommandAllowlist,
    setPostHogClientForTests,
    sourceLoadedEvent,
    startAnalyticsAtBoot,
    startPageCounts,
    startPostHog,
    stopPostHog,
    stripQueryForRecorders,
    SURVEYS_KEY,
    type UmamiBody,
    visitBucket,
    writeSurveyState,
} from "./analytics";
import { resetSentryState, type SentryCalls, setSentryCallsForTests, stopSentry } from "./sentry";

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const KEY = "phc_testkey123";
const HOST = "https://eu.i.posthog.com";
const VISITS = "graphty.visits.v1";
const USAGE = "graphty.usageData.v1";

/** What the Umami seam received. */
let sends: UmamiBody[] = [];

/**
 * Installs recording seams: graphty.app, no DNT, Umami sends recorded.
 * @param overrides - seams to replace too.
 */
function installCalls(overrides: Parameters<typeof setAnalyticsCallsForTests>[0] = {}): void {
    setAnalyticsCallsForTests({
        send: (body) => {
            sends.push(body);
            return undefined;
        },
        hostname: () => "graphty.app",
        privacySignals: () => ({ dnt: false, gpc: false }),
        ...overrides,
    });
}

/**
 * Loads a site.json for production with the given analytics block.
 * @param analytics - the block.
 * @returns the configuration.
 */
function site(analytics: SiteAnalytics): Promise<SiteConfig> {
    resetSiteConfig();
    const file = { site: "production", features: [], analytics };
    return loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(file))}`);
}

/**
 * The names Umami received, page views as "pageview".
 * @returns them in order.
 */
function umamiNames(): string[] {
    return sends.map((body) => body.payload.name ?? "pageview");
}

/**
 * A local date some days from today.
 * @param days - days to add (negative for the past).
 * @returns "YYYY-MM-DD".
 */
function dayFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A PostHog stand-in: each member a recording function. */
type Fake = Record<
    | "init"
    | "capture"
    | "opt_in_capturing"
    | "opt_out_capturing"
    | "reset"
    | "register"
    | "startSessionRecording"
    | "stopSessionRecording"
    | "getActiveMatchingSurveys",
    Mock
>;

/**
 * A PostHog stand-in whose every member records its calls.
 * @returns the stand-in.
 */
function fakePostHog(): Fake {
    return {
        init: vi.fn(),
        capture: vi.fn(),
        opt_in_capturing: vi.fn(),
        opt_out_capturing: vi.fn(),
        reset: vi.fn(),
        register: vi.fn(),
        startSessionRecording: vi.fn(),
        stopSessionRecording: vi.fn(),
        getActiveMatchingSurveys: vi.fn(),
    };
}

/** The names a recording stand-in's `capture` received. */
const capturedNames = (capture: Mock): string[] => capture.mock.calls.map((call) => String(call[0]));

const address = globalThis.location.href;

beforeEach(() => {
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    sends = [];
    installCalls();
    for (const key of [VISITS, SURVEYS_KEY]) {
        localStorage.removeItem(key);
    }
});
afterEach(() => {
    globalThis.history.replaceState(null, "", address);
    resetAnalyticsForTests();
    resetSiteConfig();
    forgetUsageAnswer();
    setAnalyticsCallsForTests();
    stopSentry();
    resetSentryState();
    setSentryCallsForTests();
    vi.restoreAllMocks();
});

describe("Umami counts", () => {
    it("sends nothing without a website id or off the site's host, and leaves the visit record alone", async () => {
        startPageCounts(await site({}));
        installCalls({ hostname: () => "evil.example" });
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });

        assert.deepEqual(sends, []);
        assert.isNull(localStorage.getItem(VISITS));
    });

    for (const signals of [
        { dnt: true, gpc: false },
        { dnt: false, gpc: true },
    ]) {
        it(`under ${signals.dnt ? "Do Not Track" : "GPC"} sends the page view and no visit event`, async () => {
            installCalls({ privacySignals: () => signals });
            startPageCounts(await site({ umamiWebsiteId: UMAMI }));

            assert.deepEqual(umamiNames(), ["pageview"]);
            assert.isNull(localStorage.getItem(VISITS));
        });
    }

    it("pins the payload: the boot path with known channels only, a referrer origin, a fixed title", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn&url=https://x.example/y.csv&features=a#h");
        readChannel();
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));

        const [view] = sends;
        assert.deepEqual(Object.keys(view.payload).sort(), ["hostname", "referrer", "title", "url", "website"]);
        assert.equal(view.type, "event");
        assert.equal(view.payload.url, `${globalThis.location.pathname}?ref=hn`);
        assert.equal(view.payload.title, "graphty");
        assert.equal(view.payload.website, UMAMI);
        assert.equal(view.payload.hostname, "graphty.app");
        assert.match(view.payload.referrer, /^(|https?:\/\/[^/]+)$/);
    });

    it("cuts URLs: unknown channel values to other, other sites to their origin", () => {
        const path = globalThis.location.pathname;
        assert.equal(cleanUrl(`${path}?utm_campaign=u_8f3k2q9&ref=HN`), `${path}?ref=hn&utm_campaign=other`);
        assert.equal(cleanUrl(`${path}?ref=<script>`), `${path}?ref=other`);
        assert.equal(cleanUrl("https://private.example/SECRET.csv?x=1#y"), "https://private.example");
        assert.equal(cleanUrl("blob:null/abc"), "blob:");
        assert.equal(cleanUrl("http://["), "");
    });

    it("removes the channel from the address bar after the page view, and keeps the boot query", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn&utm_source=x&features=a#h");
        startAnalyticsAtBoot(await site({ umamiWebsiteId: UMAMI }));

        assert.deepEqual(
            sends.filter((body) => body.payload.name === undefined).map((body) => body.payload.url),
            [`${globalThis.location.pathname}?ref=hn&utm_source=x`],
        );
        assert.equal(globalThis.location.search, "?features=a");
        assert.equal(globalThis.location.hash, "#h");
        assert.equal(bootQuery().get("features"), "a");
        assert.equal(bootQuery().get("ref"), "hn");
    });

    it("with Share stored, removes the whole query before either recorder starts", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn&utm_source=x&features=a#h");
        const seenAtStart: string[] = [];
        const record = (): void => {
            seenAtStart.push(globalThis.location.search + globalThis.location.hash);
        };
        setSentryCallsForTests({
            init: vi.fn(record),
            close: vi.fn(() => Promise.resolve(true)),
            replayIntegration: vi.fn(() => ({
                name: "Replay",
                startBuffering: vi.fn(),
                stop: vi.fn(() => Promise.resolve()),
            })),
            defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" },
        } as unknown as Partial<SentryCalls>);
        const fake = fakePostHog();
        installCalls({
            importPostHog: () => {
                record();
                return Promise.resolve({ default: fake as unknown as PostHog });
            },
        });
        localStorage.setItem(USAGE, "share");
        startAnalyticsAtBoot(await site({ umamiWebsiteId: UMAMI, posthogKey: KEY, posthogHost: HOST }));

        assert.deepEqual(seenAtStart, ["", ""]);
        assert.equal(sends[0].payload.url, `${globalThis.location.pathname}?ref=hn&utm_source=x`);
        assert.equal(bootQuery().get("features"), "a");
    });

    it("strips the query for a DSN alone, and not at all with neither a DSN nor a key", async () => {
        await site({});
        globalThis.history.replaceState(null, "", "?features=a");
        setSentryCallsForTests({ defaultConfig: { dsn: "" } });
        stripQueryForRecorders();
        assert.equal(globalThis.location.search, "?features=a");

        setSentryCallsForTests({ defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" } });
        stripQueryForRecorders();
        assert.equal(globalThis.location.search, "");
    });
});

describe("the visit record", () => {
    it("buckets days since the first visit", () => {
        const from = (days: number): string => new Date(Date.UTC(2026, 0, 1 + days)).toISOString().slice(0, 10);
        const buckets = [0, 1, 2, 7, 8, 30, 31, 400].map((days) => visitBucket(from(0), from(days)));
        assert.deepEqual(buckets, [null, "1", "2-7", "2-7", "8-30", "8-30", "30+", "reset"]);
    });

    it("sends first_visit, then one return_visit a day, and nothing more that day", async () => {
        const config = await site({ umamiWebsiteId: UMAMI });
        startPageCounts(config);
        assert.deepEqual(umamiNames(), ["pageview", "first_visit"]);

        resetAnalyticsForTests();
        sends = [];
        localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-3), last: dayFromToday(-1) }));
        startPageCounts(config);
        assert.deepEqual(umamiNames(), ["pageview", "return_visit"]);
        assert.deepEqual(sends[1].payload.data, { days: "2-7" });

        resetAnalyticsForTests();
        sends = [];
        startPageCounts(config);
        assert.deepEqual(umamiNames(), ["pageview"]);
        assert.deepEqual(JSON.parse(localStorage.getItem(VISITS) ?? ""), {
            first: dayFromToday(-3),
            last: dayFromToday(0),
        });
    });

    it("resets a record older than 395 days", async () => {
        localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-400), last: dayFromToday(-2) }));
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        assert.deepEqual(umamiNames(), ["pageview", "first_visit"]);
    });

    it("sends the page view only when storage throws", async () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        assert.deepEqual(umamiNames(), ["pageview"]);
    });
});

describe("count and detail", () => {
    it("sends each name to Umami once a page view, and every occurrence to PostHog", async () => {
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        const capture = vi.fn();
        setPostHogClientForTests({ capture });
        sends = [];
        for (let i = 0; i < 10; i++) {
            count("algorithm_run", { algorithm: `a${String(i)}`, outcome: "succeeded" });
        }
        count("layout_changed", { layout: "ngraph", outcome: "applied" });
        count("layout_changed", { layout: "circular", outcome: "applied" });
        count("export_done", { kind: "graph", format: "json", destination: "download" });

        assert.deepEqual(umamiNames(), ["algorithm_run", "layout_changed", "export_done"]);
        assert.equal(capture.mock.calls.length, 13);
    });

    it("drops keys off the event's allowlist and unknown names, and tells listeners", async () => {
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        sends = [];
        const heard: [string, unknown][] = [];
        const stop = onUsageEvent((name, props) => heard.push([name, props]));
        count("sample_loaded", { sample: "karate", fileName: "SECRET.csv" });
        count("not_an_event", { x: "y" });
        detail("command_run", { command: "view.fit", label: "SECRET" });
        stop();
        detail("command_run", { command: "view.fit" });

        assert.deepEqual(heard, [
            ["sample_loaded", { sample: "karate" }],
            ["command_run", { command: "view.fit" }],
        ]);
        assert.deepEqual(umamiNames(), ["sample_loaded"]);
        assert.notInclude(JSON.stringify(sends), "SECRET");
    });

    it("maps load events and allowlists ids, and never forwards a source key or id", () => {
        const known: LoadAllowlists = {
            datasets: new Set(["karate"]),
            generators: new Set(["grid"]),
            examples: new Set(["ex-1"]),
            startSamples: new Set(["tile-1"]),
            formats: new Set(["graphml", "csv"]),
        };
        const loaded = (event: Partial<SourceLoaded>): SourceLoaded =>
            ({ source: "SECRET_SOURCE", mode: "replace", ...event }) as SourceLoaded;
        const results = [
            sourceLoadedEvent(loaded({ kind: "sample", sample: { datasetId: "karate" } }), known),
            sourceLoadedEvent(loaded({ kind: "sample", sample: { generatorId: "SECRET_GEN" } }), known),
            sourceLoadedEvent(loaded({ kind: "server", sourceId: "SECRET_ID", sample: { exampleId: "ex-1" } }), known),
            sourceLoadedEvent(loaded({ kind: "url", callerKey: "sample:tile-1" }), known),
            sourceLoadedEvent(loaded({ kind: "file", format: "graphml" }), known),
            sourceLoadedEvent(loaded({ kind: "url", format: "dot" }), known),
            sourceLoadedEvent(loaded({ kind: "server", sourceId: "SECRET_ID" }), known),
            sourceLoadedEvent(loaded({ kind: "file", callerKey: "reopen" }), known),
        ];
        assert.deepEqual(results, [
            { name: "sample_loaded", props: { sample: "karate" } },
            { name: "sample_loaded", props: { sample: "other" } },
            { name: "sample_loaded", props: { sample: "ex-1" } },
            { name: "own_file_opened", props: { format: "other", via: "url" } },
            { name: "own_file_opened", props: { format: "graphml", via: "file" } },
            { name: "own_file_opened", props: { format: "other", via: "url" } },
            { name: "own_file_opened", props: { format: "other", via: "server" } },
            null,
        ]);
        assert.notInclude(JSON.stringify(results), "SECRET");
        assert.equal(allowlisted("E_UNKNOWN_CODE", new Set(["E_PARSE"])), "other");
    });

    it("allowlists journal ops and panel ids", () => {
        assert.isTrue(isGraphActionOp("style.encode"));
        assert.isTrue(isGraphActionOp("data.apply"));
        assert.isFalse(isGraphActionOp("layout.set"));
        assert.isFalse(isGraphActionOp("visibility.window"));
        assert.equal(panelId("settings:privacy"), "settings");
        assert.equal(panelId("data-page"), "data-page");
        assert.equal(panelId("SECRET project"), "other");
    });
});

describe("the default Umami sender", () => {
    it("posts to Umami's endpoint with exactly its headers, keeps nothing it returns, and swallows failures", async () => {
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: true, gpc: false }),
        });
        // site.json is read through fetch, so it is loaded before fetch is replaced.
        const config = await site({ umamiWebsiteId: UMAMI });
        const echo = { cache: "CACHE_TOKEN_X", sessionId: "SESSION_X", visitId: "VISIT_X" };
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(echo)));
        startPageCounts(config);
        count("sample_loaded", { sample: "karate" });

        assert.equal(fetchSpy.mock.calls.length, 2);
        const [url, options] = fetchSpy.mock.calls[0];
        assert.equal(url, "https://gateway.umami.is/api/send");
        assert.deepEqual(
            { ...options, body: undefined },
            {
                method: "POST",
                keepalive: true,
                credentials: "omit",
                headers: {
                    "Content-Type": "application/json",
                    "x-umami-website-id": UMAMI,
                    "x-umami-hostname": "graphty.app",
                },
                body: undefined,
            },
        );
        const all =
            JSON.stringify(fetchSpy.mock.calls) +
            JSON.stringify(Object.keys(localStorage).map((key) => localStorage.getItem(key))) +
            JSON.stringify(Object.keys(sessionStorage).map((key) => sessionStorage.getItem(key)));
        for (const value of Object.values(echo)) {
            assert.notInclude(all, value);
        }

        fetchSpy.mockRejectedValueOnce(new Error("offline"));
        fetchSpy.mockImplementationOnce(() => {
            throw new Error("blocked");
        });
        count("own_file_opened", { format: "csv", via: "file" });
        count("export_done", { kind: "image", format: "png", destination: "download" });
        assert.equal(fetchSpy.mock.calls.length, 4);
    });

    it("sends nothing more on the page once Umami says the site is disabled", async () => {
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: true, gpc: false }),
        });
        const config = await site({ umamiWebsiteId: UMAMI });
        const reply = Promise.resolve({ disabled: true });
        const json = vi.fn(() => reply);
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ json } as unknown as Response);
        startPageCounts(config);
        // The sender awaited this reply before the test does, so it has read it once this settles.
        await vi.waitFor(() => {
            assert.equal(json.mock.calls.length, 1);
        });
        await reply;

        count("sample_loaded", { sample: "karate" });
        count("export_done", { kind: "graph" });
        count("layout_changed", { layout: "ngraph", outcome: "applied" });
        assert.equal(fetchSpy.mock.calls.length, 1);
    });
});

describe("PostHog", () => {
    /**
     * A PostHog stand-in served by the import seam.
     * @returns the stand-in, the import count and the import's promise.
     */
    function serve(): { fake: Fake; imports: Mock; loaded: Promise<{ default: PostHog }> } {
        const fake = fakePostHog();
        const loaded = Promise.resolve({ default: fake as unknown as PostHog });
        const imports = vi.fn(() => loaded);
        installCalls({ importPostHog: imports });
        return { fake, imports, loaded };
    }

    it("never loads without a key", async () => {
        const { imports } = serve();
        await site({ umamiWebsiteId: UMAMI });
        startPostHog();
        assert.equal(imports.mock.calls.length, 0);
        assert.isUndefined(postHog());
    });

    it("inits with exactly the privacy options, then opts in, and never registers", async () => {
        const { fake, loaded } = serve();
        await site({ posthogKey: KEY, posthogHost: HOST });
        startPostHog();
        await loaded;

        assert.equal(fake.init.mock.calls.length, 1);
        const [key, options] = fake.init.mock.calls[0] as [string, Record<string, unknown>];
        assert.equal(key, KEY);
        const recording = options.session_recording as Record<string, unknown>;
        const maskRequest = recording.maskCapturedNetworkRequestFn as (request: { name: string }) => { name: string };
        assert.equal(maskRequest({ name: "https://private.example/SECRET.csv?q=1" }).name, "https://private.example");
        assert.deepEqual(options, {
            api_host: HOST,
            defaults: "2026-08-30",
            persistence: "localStorage",
            person_profiles: "identified_only",
            opt_out_capturing_by_default: true,
            disable_external_dependency_loading: true,
            advanced_disable_flags: false,
            capture_pageview: true,
            capture_pageleave: true,
            autocapture: { dom_event_allowlist: ["click", "change", "submit"], capture_copied_text: false },
            mask_all_text: true,
            mask_all_element_attributes: true,
            rageclick: true,
            capture_dead_clicks: true,
            capture_heatmaps: true,
            capture_exceptions: false,
            capture_performance: { web_vitals: true, network_timing: false },
            enable_recording_console_log: false,
            save_referrer: false,
            save_campaign_params: false,
            opt_out_persistence_by_default: true,
            session_recording: {
                captureJsonLd: false,
                maskAllInputs: true,
                maskTextSelector: "*",
                maskAttributeFn: maskEveryAttribute,
                blockSelector: 'graphty-element, canvas, img, video, input[type="file"]',
                recordHeaders: false,
                recordBody: false,
                maskCapturedNetworkRequestFn: maskRequest,
            },
            disable_surveys: false,
            before_send: cleanPostHogEvent,
        });
        assert.equal(fake.opt_in_capturing.mock.calls.length, 1);
        assert.equal(fake.register.mock.calls.length, 0);
        assert.strictEqual(postHog(), fake);
    });

    it("loads once and inits once for two starts, and not at all after a stop that came first", async () => {
        const { fake, imports, loaded } = serve();
        await site({ posthogKey: KEY, posthogHost: HOST });
        startPostHog();
        startPostHog();
        await loaded;
        assert.equal(imports.mock.calls.length, 1);
        assert.equal(fake.init.mock.calls.length, 1);

        resetAnalyticsForTests();
        const second = serve();
        startPostHog();
        stopPostHog();
        await second.loaded;
        assert.equal(second.fake.init.mock.calls.length, 0);
    });

    it("on stop opts out, never resets, and deletes its keys and the stored use case", async () => {
        const { fake, loaded } = serve();
        await site({ posthogKey: KEY, posthogHost: HOST });
        startPostHog();
        await loaded;
        localStorage.setItem(`ph_${KEY}_posthog`, "{}");
        sessionStorage.setItem(`ph_${KEY}_window_id`, "w");
        localStorage.setItem(`__ph_opt_in_out_${KEY}`, "0");
        writeSurveyState({ seen: ["s1"], use_case: "teach" });

        stopPostHog();

        assert.equal(fake.opt_out_capturing.mock.calls.length, 1);
        assert.equal(fake.stopSessionRecording.mock.calls.length, 1);
        assert.equal(fake.reset.mock.calls.length, 0);
        assert.isUndefined(postHog());
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
        assert.isNull(sessionStorage.getItem(`ph_${KEY}_window_id`));
        assert.equal(localStorage.getItem(`__ph_opt_in_out_${KEY}`), "0");
        assert.deepEqual(readSurveyState(), { seen: ["s1"] });
        localStorage.removeItem(`__ph_opt_in_out_${KEY}`);
    });

    it("on a start after a stop resets, opts in and records again, with no second init", async () => {
        const { fake, loaded } = serve();
        await site({ posthogKey: KEY, posthogHost: HOST });
        startPostHog();
        await loaded;
        stopPostHog();
        const order: string[] = [];
        for (const member of ["reset", "opt_in_capturing", "startSessionRecording"] as const) {
            fake[member].mockImplementation(() => order.push(member));
        }
        startPostHog();

        assert.deepEqual(order, ["reset", "opt_in_capturing", "startSessionRecording"]);
        assert.equal(fake.init.mock.calls.length, 1);
    });

    it("sends counts made while it loads once it is ready, and drops them on a stop", async () => {
        const first = serve();
        await site({ posthogKey: KEY, posthogHost: HOST });
        startPostHog();
        count("sample_loaded", { sample: "karate" });
        detail("command_run", { command: "view.fit" });
        await first.loaded;
        assert.deepEqual(capturedNames(first.fake.capture), ["sample_loaded", "command_run"]);

        resetAnalyticsForTests();
        const second = serve();
        startPostHog();
        count("sample_loaded", { sample: "karate" });
        stopPostHog();
        startPostHog();
        await second.loaded;
        assert.deepEqual(capturedNames(second.fake.capture), []);
    });

    it("starts from boot for a reader who shared, and the first visit reaches it", async () => {
        const { fake, imports, loaded } = serve();
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const config = await site({ umamiWebsiteId: UMAMI, posthogKey: KEY, posthogHost: HOST });

        localStorage.setItem(USAGE, "declined");
        startAnalyticsAtBoot(config);
        assert.equal(imports.mock.calls.length, 0);
        assert.include(umamiNames(), "pageview");

        resetAnalyticsForTests();
        localStorage.removeItem(VISITS);
        localStorage.setItem(USAGE, "share");
        startAnalyticsAtBoot(config);
        await loaded;
        assert.equal(imports.mock.calls.length, 1);
        assert.include(capturedNames(fake.capture), "first_visit");
    });
});

describe("cleanPostHogEvent", () => {
    /**
     * An event as PostHog hands it to before_send.
     * @param event - its name.
     * @param properties - its properties.
     * @returns the event.
     */
    const ev = (event: string, properties: Record<string, unknown> = {}): CaptureResult => ({
        uuid: "u",
        event,
        properties,
    });

    it("drops every event while sharing is off", () => {
        assert.isNull(cleanPostHogEvent(ev("$pageview")));
    });

    it("adds the super properties", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn");
        readChannel();
        startPageCounts(await site({ umamiWebsiteId: UMAMI }));
        setPostHogClientForTests({});
        const out = cleanPostHogEvent(ev("$pageview"));

        assert.include(out?.properties, {
            site: "production",
            channel_ref: "hn",
            visit: "first",
            $geoip_disable: true,
        });
    });

    it("cuts every URL at any depth, but leaves a recording alone", () => {
        setPostHogClientForTests({});
        const secret = "https://private.example/SECRET?q=SECRET";
        const out = cleanPostHogEvent(
            ev("$web_vitals", {
                nested: { deeper: [secret] },
                $external_click_url: secret,
                $web_vitals_LCP_event: { $current_url: secret },
                $referrer: secret,
                $heatmap_data: { [secret]: [{ x: 1 }] },
            }),
        );
        assert.notInclude(JSON.stringify(out), "SECRET");
        assert.equal(out?.properties.$referrer, "https://private.example");

        const snapshot = { $snapshot_data: [{ href: secret }] };
        assert.deepEqual(
            cleanPostHogEvent(ev("$snapshot", snapshot))?.properties.$snapshot_data,
            snapshot.$snapshot_data,
        );
    });

    it("drops person properties and titles", () => {
        setPostHogClientForTests({});
        const out = cleanPostHogEvent({
            ...ev("$pageview", { title: "SECRET", $title: "SECRET", $set: { a: "SECRET" } }),
            $set: { name: "SECRET" },
            $set_once: { name: "SECRET" },
        });
        assert.notInclude(JSON.stringify(out), "SECRET");
    });

    it("drops names off the allowlist and keys PostHog adds on its own", () => {
        setPostHogClientForTests({});
        assert.isNull(cleanPostHogEvent(ev("$exception")));
        assert.isNull(cleanPostHogEvent(ev("$identify")));
        assert.isNull(cleanPostHogEvent(ev("made_up_event")));
        const view = cleanPostHogEvent(ev("$pageview", { ph_keyword: "SECRET", other: "SECRET", $lib: "web" }));
        const click = cleanPostHogEvent(ev("$autocapture", { ph_keyword: "SECRET", $elements_chain: "button" }));
        assert.notInclude(JSON.stringify([view, click]), "SECRET");
        assert.equal(view?.properties.$lib, "web");
    });

    it("drops clicks on the canvas, and keeps the heatmap", () => {
        setPostHogClientForTests({});
        for (const name of ["$autocapture", "$rageclick", "$dead_click"]) {
            assert.isNull(
                cleanPostHogEvent(ev(name, { $elements_chain: 'canvas:nth-child="1";graphty-element.ph-no-capture' })),
            );
            assert.isNull(cleanPostHogEvent(ev(name, { $elements: [{ tag_name: "canvas" }] })));
        }
        assert.isNotNull(cleanPostHogEvent(ev("$$heatmap", { $heatmap_data: {} })));
    });

    it("keeps control for a fixed id, and for a command only once commands are registered", () => {
        setPostHogClientForTests({});
        const control = (id: string): unknown =>
            cleanPostHogEvent(ev("$autocapture", { control: id }))?.properties.control;
        assert.equal(control("usage-data.share"), "usage-data.share");
        assert.isUndefined(control("history.undo"));
        setCommandAllowlist(["history.undo"]);
        assert.equal(control("history.undo"), "history.undo");
        assert.isUndefined(control("SECRET project"));
    });

    it("keeps ids, session keys and super properties on an own event, and drops the rest", () => {
        setPostHogClientForTests({});
        const out = cleanPostHogEvent(
            ev("command_run", {
                command: "view.fit",
                token: "t",
                distinct_id: "d",
                $session_id: "s",
                $window_id: "w",
                $lib: "web",
                label: "SECRET",
            }),
        );
        assert.include(out?.properties, {
            command: "view.fit",
            token: "t",
            distinct_id: "d",
            $session_id: "s",
            $window_id: "w",
            $lib: "web",
            site: "unknown",
        });
        assert.notInclude(JSON.stringify(out), "SECRET");
    });

    it("keeps a survey's response keys", () => {
        setPostHogClientForTests({});
        const out = cleanPostHogEvent(
            ev("survey sent", { $survey_id: "s", $survey_response: "teach", $survey_response_abc: "typed" }),
        );
        assert.include(out?.properties, { $survey_id: "s", $survey_response: "teach", $survey_response_abc: "typed" });
    });

    it("adds the answered use case, as other when it is no id", () => {
        setPostHogClientForTests({});
        writeSurveyState({ seen: [], use_case: "teach" });
        assert.equal(cleanPostHogEvent(ev("$pageview"))?.properties.use_case, "teach");
        writeSurveyState({ seen: [], use_case: "my SECRET text" });
        assert.equal(cleanPostHogEvent(ev("$pageview"))?.properties.use_case, "other");
    });

    it("runs a stand-in's captures through it, and turns off again", () => {
        const capture = vi.fn();
        const undo = setPostHogClientForTests({ capture });
        postHog()?.capture("command_run", { command: "view.fit", label: "SECRET" });
        postHog()?.capture("made_up_event");
        assert.deepEqual(capturedNames(capture), ["command_run"]);
        assert.notInclude(JSON.stringify(capture.mock.calls), "SECRET");
        undo();
        assert.isUndefined(postHog());
    });
});

describe("maskEveryAttribute", () => {
    it("keeps only attributes that carry no reader text", () => {
        for (const kept of ["class", "role", "style", "aria-expanded", "data-ph-capture-attribute-control"]) {
            assert.equal(maskEveryAttribute(kept, "v"), "v");
        }
        for (const masked of ["name", "href", "id", "title", "aria-label", "data-x", "foo"]) {
            assert.equal(maskEveryAttribute(masked, "SECRET"), "*");
        }
    });
});
