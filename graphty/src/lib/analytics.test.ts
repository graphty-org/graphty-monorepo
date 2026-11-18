/**
 * Usage analytics through its seams (no module mocks): the anonymous counts and their payload, the
 * visit record, the address bar, the two modes and the switch between them, PostHog's lifecycle with
 * a stand-in client, and what `cleanPostHogEvent` lets through in each mode. The `hostname`, `privacySignals` and `today` seams make graphty.app, no DNT and a
 * fixed day the default, so no case depends on the clock.
 */
import type { SourceLoaded } from "@graphty/graphty-element/session";
import type { CaptureResult, PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, type Mock, vi } from "vitest";

import { loadSiteConfig, resetSiteConfig, type SiteAnalytics, type SiteConfig } from "../siteConfig";
import { answerUsageData, forgetUsageAnswer, setUsageSenderForTests } from "../workspace/privacy/usageData";
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
    onOwnHost,
    onUsageEvent,
    postHog,
    readChannel,
    readSurveyState,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setCommandAllowlist,
    setPostHogClientForTests,
    SITE_HOSTS,
    sourceLoadedEvent,
    startAnalyticsAtBoot,
    startPageCounts,
    startPostHog,
    stopPostHog,
    stripQueryForRecorders,
    SURVEYS_KEY,
    visitBucket,
    writeSurveyState,
} from "./analytics";
import { resetSentryState, type SentryCalls, setSentryCallsForTests, stopSentry } from "./sentry";

const KEY = "phc_testkey123";
const HOST = "https://eu.i.posthog.com";
/** A site's analytics block that turns PostHog on. */
const PH: SiteAnalytics = { posthogKey: KEY, posthogHost: HOST };
const VISITS = "graphty.visits.v1";
const USAGE = "graphty.usageData.v1";

/** The day every case runs on, through the `today` seam. */
const TODAY = "2026-06-15";

/** What the anonymous stand-in recorded, after `cleanPostHogEvent(event, "anonymous")`. */
let anon: { event: string; properties: Record<string, unknown> }[] = [];

/** Installs a recording stand-in for the anonymous mode's instance. */
function installAnonymous(): void {
    setPostHogClientForTests(
        {
            capture: (event, properties) => {
                anon.push({ event, properties: properties ?? {} });
                return undefined;
            },
        },
        "anonymous",
    );
}

/** A fresh page: module state forgotten, the anonymous stand-in installed again and its records cleared. */
function freshPage(): void {
    resetAnalyticsForTests();
    anon = [];
    installAnonymous();
}

/**
 * Installs recording seams: graphty.app, no DNT, a fixed day, and a first paint that never comes
 * (so nothing imports posthog-js unless a case runs the callback itself).
 * @param overrides - seams to replace too.
 */
function installCalls(overrides: Parameters<typeof setAnalyticsCallsForTests>[0] = {}): void {
    setAnalyticsCallsForTests({
        afterFirstPaint: () => undefined,
        hostname: () => "graphty.app",
        privacySignals: () => ({ dnt: false, gpc: false }),
        today: () => TODAY,
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
 * The names the anonymous stand-in recorded.
 * @returns them in order.
 */
function anonNames(): string[] {
    return anon.map((record) => record.event);
}

/**
 * A date some days from {@link TODAY}.
 * @param days - days to add (negative for the past).
 * @returns "YYYY-MM-DD".
 */
function dayFromToday(days: number): string {
    const [y, m, d] = TODAY.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A PostHog stand-in: each member a recording function. */
type Fake = Record<
    | "init"
    | "capture"
    | "opt_in_capturing"
    | "opt_out_capturing"
    | "reset"
    | "get_distinct_id"
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
        get_distinct_id: vi.fn(),
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
    anon = [];
    installAnonymous();
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
    setUsageSenderForTests();
    setAnalyticsCallsForTests();
    stopSentry();
    resetSentryState();
    setSentryCallsForTests();
    vi.restoreAllMocks();
});

describe("anonymous counts", () => {
    it("sends nothing without a key or off the site's host, and leaves the visit record alone", async () => {
        const info = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        startPageCounts(await site({}));
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });
        installCalls({ hostname: () => "evil.example" });
        startPageCounts(await site(PH));
        count("export_done", { kind: "graph", format: "json", destination: "download" });

        assert.deepEqual(anon, []);
        assert.isNull(localStorage.getItem(VISITS));
        // A site whose host moved says why it went quiet.
        assert.isTrue(
            info.mock.calls.some(([line]) =>
                String(line).includes("evil.example is not the host of the production site"),
            ),
        );
    });

    it("knows each committed site's host, the one its own datasets are served from", () => {
        const files = import.meta.glob<{ site: string; datasets: string }>("../../sites/*.json", {
            eager: true,
            import: "default",
        });
        assert.isNotEmpty(Object.keys(files));
        for (const [path, file] of Object.entries(files)) {
            const host = new URL(file.datasets).hostname;
            installCalls({ hostname: () => host });
            assert.isTrue(onOwnHost({ site: file.site as "production", features: [] }), `${path} on ${host}`);
            assert.equal(SITE_HOSTS[file.site], host, path);
        }
    });

    for (const signals of [
        { dnt: true, gpc: false },
        { dnt: false, gpc: true },
    ]) {
        it(`under ${signals.dnt ? "Do Not Track" : "GPC"} sends the page view and no visit event, and keeps no visit record`, async () => {
            // A record written on a visit before the signal was switched on.
            localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-3), last: dayFromToday(-1) }));
            installCalls({ privacySignals: () => signals });
            startPageCounts(await site(PH));

            assert.deepEqual(anonNames(), ["$pageview"]);
            assert.isNull(localStorage.getItem(VISITS));
        });
    }

    it("pins the page view: the boot path with known channels only, a referrer origin, no title", async () => {
        globalThis.history.replaceState(
            null,
            "",
            "?ref=hn&url=https://x.example/y.csv&utm_campaign=u_8f3k2q9&features=a#h",
        );
        readChannel();
        startPageCounts(await site(PH));

        // The positive control for the anonymous stand-in: a count on it is recorded.
        const [view] = anon;
        assert.equal(view.event, "$pageview");
        const props = view.properties;
        assert.equal(props.$current_url, `${globalThis.location.pathname}?ref=hn&utm_campaign=other`);
        assert.equal(props.$pathname, globalThis.location.pathname);
        assert.match(String(props.$referrer), /^(\$direct|https?:\/\/[^/]+)$/);
        assert.include(props, {
            tracking: "anonymous",
            first_on_page: true,
            $cookieless_mode: true,
            distinct_id: "$posthog_cookieless",
            $host: globalThis.location.host,
            site: "production",
            channel_ref: "hn",
            utm_campaign: "other",
            $geoip_disable: true,
        });
        for (const key of ["title", "$title", "$screen_height", "$browser_language", "use_case"]) {
            assert.notProperty(props, key);
        }
    });

    it("cuts URLs: unknown channel values to other, other sites to a fixed token", () => {
        const path = globalThis.location.pathname;
        assert.equal(cleanUrl(`${path}?utm_campaign=u_8f3k2q9&ref=HN`), `${path}?ref=hn&utm_campaign=other`);
        assert.equal(cleanUrl(`${path}?ref=<script>`), `${path}?ref=other`);
        assert.equal(cleanUrl("https://private.example/SECRET.csv?x=1#y"), "external");
        // Not even a server's origin: the address of a server the reader opens is theirs.
        assert.equal(cleanUrl("https://neo4j.internal-hospital.example:7473/db"), "external");
        assert.equal(cleanUrl("blob:null/abc"), "blob:");
        assert.equal(cleanUrl("http://["), "");
    });

    it("removes the channel from the address bar after the page view, and keeps the boot query", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn&utm_source=x&features=a#h");
        startAnalyticsAtBoot(await site(PH));

        assert.deepEqual(
            anon.filter((record) => record.event === "$pageview").map((record) => record.properties.$current_url),
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
        startAnalyticsAtBoot(await site(PH));
        await vi.waitFor(() => {
            assert.include(capturedNames(fake.capture), "$pageview");
        });

        assert.deepEqual(seenAtStart, ["", ""]);
        // The page view went to the shared mode only, and still carries the boot channel.
        assert.notInclude(anonNames(), "$pageview");
        const [, props] = fake.capture.mock.calls.find((call) => call[0] === "$pageview") as [string, object];
        const view = cleanPostHogEvent({ uuid: "u", event: "$pageview", properties: { ...props } });
        assert.equal(view?.properties.$current_url, `${globalThis.location.pathname}?ref=hn&utm_source=x`);
        assert.equal(view?.properties.tracking, "shared");
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
    it("buckets days since the first visit, and resets on a last visit over 395 days ago", () => {
        const from = (days: number): string => new Date(Date.UTC(2026, 0, 1 + days)).toISOString().slice(0, 10);
        const buckets = [0, 1, 2, 7, 8, 30, 31, 400].map((days) => visitBucket(from(0), from(days)));
        assert.deepEqual(buckets, [null, "1", "2-7", "2-7", "8-30", "8-30", "30+", "reset"]);
        // A regular reader whose first visit is over 395 days old stays a returning one.
        assert.equal(visitBucket(from(0), from(800), from(799)), "30+");
        assert.equal(visitBucket(from(0), from(800), from(400)), "reset");
        // A last visit dated after today (a clock moved back, a trip west) keeps its record.
        assert.equal(visitBucket(from(0), from(5), from(6)), "2-7");
        assert.isNull(visitBucket(from(6), from(5), from(6)));
        // A clock that was years ahead on one visit does not stop every count until 2030.
        assert.equal(visitBucket(from(0), from(5), from(1500)), "reset");
        assert.equal(visitBucket(from(1500), from(5), from(1500)), "reset");
        assert.isNull(visitBucket(from(7), from(5), from(7)), "a two-day time-zone hop is kept");
        // A date that does not parse is a stale record.
        assert.equal(visitBucket("nonsense", from(5)), "reset");
    });

    it("sends first_visit, then one return_visit a day, and nothing more that day", async () => {
        const config = await site(PH);
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview", "first_visit"]);

        freshPage();
        localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-3), last: dayFromToday(-1) }));
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview", "return_visit"]);
        assert.equal(anon[1].properties.days, "2-7");

        freshPage();
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview"]);
        assert.deepEqual(JSON.parse(localStorage.getItem(VISITS) ?? ""), {
            first: dayFromToday(-3),
            last: dayFromToday(0),
        });
    });

    it("resets a record whose last visit is older than 395 days, and keeps a regular reader's", async () => {
        const config = await site(PH);
        localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-400), last: dayFromToday(-2) }));
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview", "return_visit"]);
        assert.equal(anon[1].properties.days, "30+");

        freshPage();
        localStorage.setItem(VISITS, JSON.stringify({ first: dayFromToday(-500), last: dayFromToday(-400) }));
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview", "first_visit"]);
    });

    it("counts nothing again, and keeps the record, when the last visit is dated after today", async () => {
        const config = await site(PH);
        const record = { first: dayFromToday(-10), last: dayFromToday(1) };
        localStorage.setItem(VISITS, JSON.stringify(record));
        startPageCounts(config);
        assert.deepEqual(anonNames(), ["$pageview"]);
        assert.deepEqual(JSON.parse(localStorage.getItem(VISITS) ?? ""), record);
    });

    it("sends the page view only when storage throws", async () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        startPageCounts(await site(PH));
        assert.deepEqual(anonNames(), ["$pageview"]);
    });
});

describe("count and detail", () => {
    it("sends each name once a page view in the anonymous mode, and every occurrence in the shared mode", async () => {
        startPageCounts(await site(PH));
        anon = [];
        for (let i = 0; i < 10; i++) {
            count("algorithm_run", { algorithm: `a${String(i)}`, outcome: "succeeded" });
        }
        count("layout_changed", { layout: "ngraph", outcome: "applied" });
        count("layout_changed", { layout: "circular", outcome: "applied" });
        count("export_done", { kind: "graph", format: "json", destination: "download" });
        assert.deepEqual(anonNames(), ["algorithm_run", "layout_changed", "export_done"]);
        assert.isTrue(anon.every((record) => record.properties.first_on_page === true));

        // Share: every occurrence goes to the shared mode, none first on the page again.
        const capture = vi.fn();
        setPostHogClientForTests({ capture });
        for (let i = 0; i < 3; i++) {
            count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });
        }
        assert.equal(capture.mock.calls.length, 3);
        assert.isTrue(
            capture.mock.calls.every((call) => (call[1] as Record<string, unknown>).first_on_page === undefined),
        );
        assert.isTrue(capture.mock.calls.every((call) => (call[1] as Record<string, unknown>).tracking === "shared"));
        assert.lengthOf(anon, 3);

        // A fresh page that shares first: the first occurrence is the first on the page.
        freshPage();
        const shared = vi.fn();
        setPostHogClientForTests({ capture: shared });
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });
        assert.deepEqual(
            shared.mock.calls.map((call) => (call[1] as Record<string, unknown>).first_on_page),
            [true, undefined],
        );
    });

    it("reports every count in exactly one mode, the one current when it was made", async () => {
        const shared: string[] = [];
        startPageCounts(await site(PH));
        count("sample_loaded", { sample: "karate" });
        setPostHogClientForTests({
            capture: (event) => {
                shared.push(event);
                return undefined;
            },
        });
        count("export_done", { kind: "graph", format: "json", destination: "download" });
        stopPostHog();
        count("layout_changed", { layout: "ngraph", outcome: "applied" });
        // Already sent on this page, in the anonymous mode: not again.
        count("sample_loaded", { sample: "karate" });
        // Already sent on this page, in the shared mode: not again either.
        count("export_done", { kind: "image", format: "png", destination: "download" });
        startPostHog();
        count("algorithm_run", { algorithm: "degree", outcome: "succeeded" });

        assert.deepEqual(anonNames(), ["$pageview", "first_visit", "sample_loaded", "layout_changed"]);
        assert.deepEqual(shared, ["export_done", "algorithm_run"]);
        assert.isTrue(anon.every((record) => record.properties.tracking === "anonymous"));
    });

    it("keeps counts made before either instance is ready, each for the mode it was made in", async () => {
        resetAnalyticsForTests();
        anon = [];
        let resolve: (() => void) | undefined;
        installCalls({
            importPostHog: () =>
                new Promise((done) => {
                    resolve = () => {
                        done({ default: fakePostHog() as unknown as PostHog });
                    };
                }),
        });
        startPageCounts(await site(PH));
        count("sample_loaded", { sample: "karate" });
        startPostHog();
        count("export_done", { kind: "graph", format: "json", destination: "download" });
        detail("command_run", { command: "view.fit" });

        const shared = vi.fn();
        installAnonymous();
        setPostHogClientForTests({ capture: shared });
        assert.deepEqual(anonNames(), ["$pageview", "first_visit", "sample_loaded"]);
        assert.deepEqual(capturedNames(shared), ["export_done", "command_run"]);
        assert.isDefined(resolve);
    });

    it("counts Share in the anonymous mode only, and nothing under Do Not Track or for No", async () => {
        setUsageSenderForTests({ start: () => undefined, stop: () => undefined });
        startPageCounts(await site(PH));
        anon = [];
        answerUsageData("share");
        assert.deepEqual(anonNames(), ["usage_data_shared"]);

        freshPage();
        forgetUsageAnswer();
        startPageCounts(await site(PH));
        anon = [];
        answerUsageData("declined");
        assert.deepEqual(anon, []);

        freshPage();
        forgetUsageAnswer();
        installCalls({ privacySignals: () => ({ dnt: true, gpc: false }) });
        startPageCounts(await site(PH));
        anon = [];
        answerUsageData("share");
        assert.deepEqual(anon, []);
    });

    it("drops keys off the event's allowlist and unknown names, and tells listeners", async () => {
        startPageCounts(await site(PH));
        anon = [];
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
        assert.deepEqual(anonNames(), ["sample_loaded"]);
        assert.notInclude(JSON.stringify(anon), "SECRET");
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
            // An app sample added to a graph that holds data, through the join screen.
            sourceLoadedEvent(loaded({ kind: "join", callerKey: "sample:tile-1" }), known),
            sourceLoadedEvent(loaded({ kind: "file", format: "graphml" }), known),
            sourceLoadedEvent(loaded({ kind: "url", format: "dot" }), known),
            sourceLoadedEvent(loaded({ kind: "server", sourceId: "SECRET_ID" }), known),
            sourceLoadedEvent(loaded({ kind: "file", callerKey: "reopen" }), known),
            // A column-role change re-reads the source in place: not a file the reader opened.
            sourceLoadedEvent(loaded({ kind: "file", format: "csv", replaced: "reloadSource" }), known),
            // A Replace brings in the reader's own file.
            sourceLoadedEvent(loaded({ kind: "file", format: "csv", replaced: "replaceSource" }), known),
            // A kind a later graphty-element adds is "other" until it is listed.
            sourceLoadedEvent(loaded({ kind: "SECRET_KIND" as SourceLoaded["kind"], format: "csv" }), known),
        ];
        assert.deepEqual(results, [
            { name: "sample_loaded", props: { sample: "karate" } },
            { name: "sample_loaded", props: { sample: "other" } },
            { name: "sample_loaded", props: { sample: "ex-1" } },
            { name: "sample_loaded", props: { sample: "tile-1" } },
            { name: "sample_loaded", props: { sample: "tile-1" } },
            { name: "own_file_opened", props: { format: "graphml", via: "file" } },
            { name: "own_file_opened", props: { format: "other", via: "url" } },
            { name: "own_file_opened", props: { format: "other", via: "server" } },
            null,
            null,
            { name: "own_file_opened", props: { format: "csv", via: "file" } },
            { name: "own_file_opened", props: { format: "csv", via: "other" } },
        ]);
        assert.notInclude(JSON.stringify(results), "SECRET");
        assert.equal(allowlisted("E_UNKNOWN_CODE", new Set(["E_PARSE"])), "other");
    });

    it("allowlists journal ops", () => {
        assert.isTrue(isGraphActionOp("style.encode"));
        assert.isTrue(isGraphActionOp("data.apply"));
        assert.isFalse(isGraphActionOp("layout.set"));
        assert.isFalse(isGraphActionOp("visibility.window"));
        // A load is counted once, from source:loaded, never as a graph action too.
        assert.isFalse(isGraphActionOp("data.import"));
        assert.isFalse(isGraphActionOp("data.import-source"));
        // An op a later graphty-element adds is not sent until it is listed, whatever its prefix.
        assert.isFalse(isGraphActionOp("data.reload"));
        assert.isFalse(isGraphActionOp("set.export"));
        assert.isTrue(isGraphActionOp("set.create"));
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
        await site({});
        startPostHog();
        assert.equal(imports.mock.calls.length, 0);
        assert.isUndefined(postHog());
    });

    it("never loads, and Sentry never starts, off the site's own host, even after Share", async () => {
        const { imports } = serve();
        installCalls({ importPostHog: imports, hostname: () => "localhost" });
        const sentryInit = vi.fn();
        setSentryCallsForTests({
            init: sentryInit,
            defaultConfig: { dsn: "https://public@o0.ingest.sentry.io/0" },
        });
        // The live sender, as the app runs it.
        setUsageSenderForTests();
        await site(PH);
        answerUsageData("share");
        startPostHog();
        assert.equal(imports.mock.calls.length, 0);
        assert.equal(sentryInit.mock.calls.length, 0);
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
        assert.equal(maskRequest({ name: "https://private.example/SECRET.csv?q=1" }).name, "external");
        assert.deepEqual(options, {
            api_host: HOST,
            defaults: "2026-08-30",
            persistence: "localStorage",
            person_profiles: "identified_only",
            opt_out_capturing_by_default: true,
            disable_external_dependency_loading: true,
            advanced_disable_flags: false,
            capture_pageview: false,
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
            disable_surveys_automatic_display: true,
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
        // A new device id too, or the one held from before the No would come back.
        assert.deepEqual(fake.reset.mock.calls, [[true]]);
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

    it("moves the page view to the anonymous mode when a No comes before the shared instance loads", async () => {
        resetAnalyticsForTests();
        // posthog-js never arrives, and no anonymous instance is ready yet.
        installCalls({ importPostHog: () => new Promise<never>(() => undefined) });
        localStorage.setItem(USAGE, "share");
        startAnalyticsAtBoot(await site(PH));
        count("sample_loaded", { sample: "karate" });
        stopPostHog();
        count("sample_loaded", { sample: "les-miserables" });
        installAnonymous();

        assert.deepEqual(anonNames(), ["$pageview", "first_visit", "sample_loaded"]);
        for (const record of anon) {
            assert.include(record.properties, { first_on_page: true, tracking: "anonymous" });
        }
        assert.equal(anon[2].properties.sample, "karate");
    });

    it("keeps counting in the anonymous mode while waiting for another tab's id, so a Share tab that closes loses nothing", async () => {
        const { fake, imports } = serve();
        const config = await site(PH);
        startPageCounts(config);
        // Another tab's Share, before that tab saved its id; that tab then closes and never saves one.
        startPostHog(false);
        count("sample_loaded", { sample: "karate" });
        count("layout_changed", { layout: "circular" });

        assert.deepEqual(anonNames(), ["$pageview", "first_visit", "sample_loaded", "layout_changed"]);
        assert.include(anon[2].properties, { first_on_page: true, tracking: "anonymous" });
        assert.equal(imports.mock.calls.length, 0, "no id of its own while it waits");
        assert.deepEqual(capturedNames(fake.capture), []);
        // A No meanwhile changes nothing already counted.
        stopPostHog();
        assert.equal(anon.length, 4);
    });

    it("keeps a page's first count while it loads even when other events filled the buffer", async () => {
        const { fake, loaded } = serve();
        await site(PH);
        startPostHog();
        for (let index = 0; index < 25; index++) {
            detail("command_run", { command: "view.fit" });
        }
        count("sample_loaded", { sample: "karate" });
        await loaded;

        const sample = fake.capture.mock.calls.find((call) => call[0] === "sample_loaded");
        assert.isDefined(sample, "the first count was kept");
        assert.include(sample?.[1] as Record<string, unknown>, { first_on_page: true });
    });

    it("starts the anonymous instance through the real after-first-paint hook", async () => {
        resetAnalyticsForTests();
        const anonymous = fakePostHog();
        const { fake, imports } = serve();
        fake.init.mockImplementation((_key: string, _options: unknown, name?: string) =>
            name === "anonymous" ? anonymous : fake,
        );
        // Every seam as the other cases have it, but afterFirstPaint left at its default.
        setAnalyticsCallsForTests({
            importPostHog: imports,
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
            today: () => TODAY,
        });
        startAnalyticsAtBoot(await site(PH));

        await vi.waitFor(() => {
            assert.include(capturedNames(anonymous.capture), "$pageview");
        });
        assert.equal(imports.mock.calls.length, 1);
        assert.deepEqual(
            (fake.init.mock.calls as [string, unknown, string?][]).map((call) => call[2]),
            ["anonymous"],
        );
    });

    it("tries a failed posthog-js load again on the next count, and sends the kept page view", async () => {
        resetAnalyticsForTests();
        const anonymous = fakePostHog();
        const fake = fakePostHog();
        fake.init.mockImplementation((_key: string, _options: unknown, name?: string) =>
            name === "anonymous" ? anonymous : fake,
        );
        let failed: Promise<never> | undefined;
        let loaded: Promise<{ default: PostHog }> | undefined;
        const imports = vi.fn(() => {
            if (failed === undefined) {
                failed = Promise.reject(new Error("network"));
                return failed;
            }
            loaded = Promise.resolve({ default: fake as unknown as PostHog });
            return loaded;
        });
        installCalls({ importPostHog: imports, afterFirstPaint: (run) => run() });
        startAnalyticsAtBoot(await site(PH));
        await failed?.catch(() => undefined);
        assert.equal(imports.mock.calls.length, 1);
        assert.deepEqual(capturedNames(anonymous.capture), []);

        count("sample_loaded", { sample: "karate" });
        assert.equal(imports.mock.calls.length, 2, "tried again");
        await loaded;
        assert.deepEqual(capturedNames(anonymous.capture), ["$pageview", "first_visit", "sample_loaded"]);
    });

    it("tries a failed load again when the browser is back online, for a reader who shares", async () => {
        const fake = fakePostHog();
        let attempt = 0;
        let loaded: Promise<{ default: PostHog }> | undefined;
        let failed: Promise<never> | undefined;
        const imports = vi.fn(() => {
            attempt++;
            if (attempt === 1) {
                failed = Promise.reject(new Error("network"));
                return failed;
            }
            loaded = Promise.resolve({ default: fake as unknown as PostHog });
            return loaded;
        });
        installCalls({ importPostHog: imports });
        await site(PH);
        startPostHog();
        count("sample_loaded", { sample: "karate" });
        await failed?.catch(() => undefined);
        assert.deepEqual(capturedNames(fake.capture), []);

        globalThis.dispatchEvent(new Event("online"));
        await loaded;
        assert.equal(imports.mock.calls.length, 2);
        assert.include(capturedNames(fake.capture), "sample_loaded");
    });

    it("starts from boot for a reader who shared, and the first visit reaches the shared mode only", async () => {
        const { fake, imports, loaded } = serve();
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const config = await site(PH);

        localStorage.setItem(USAGE, "declined");
        startAnalyticsAtBoot(config);
        assert.equal(imports.mock.calls.length, 0);
        assert.include(anonNames(), "$pageview");

        freshPage();
        localStorage.removeItem(VISITS);
        localStorage.setItem(USAGE, "share");
        startAnalyticsAtBoot(config);
        await loaded;
        assert.equal(imports.mock.calls.length, 1);
        assert.include(capturedNames(fake.capture), "first_visit");
        assert.notInclude(anonNames(), "first_visit");
    });

    for (const answer of ["declined", "share", null] as const) {
        it(`loads posthog-js once, only after first paint, and creates the anonymous instance first (${String(answer)})`, async () => {
            resetAnalyticsForTests();
            const anonymous = fakePostHog();
            const { fake, imports, loaded } = serve();
            fake.init.mockImplementation((_key: string, _options: unknown, name?: string) =>
                name === "anonymous" ? anonymous : fake,
            );
            let paint: (() => void) | undefined;
            installCalls({
                importPostHog: imports,
                afterFirstPaint: (run) => {
                    paint = run;
                },
            });
            if (answer !== null) {
                localStorage.setItem(USAGE, answer);
            }
            startAnalyticsAtBoot(await site(PH));
            assert.equal(imports.mock.calls.length, answer === "share" ? 1 : 0, "Share loads at once");
            paint?.();
            await loaded;
            await loaded;

            assert.equal(imports.mock.calls.length, 1);
            const inits = fake.init.mock.calls as [string, Record<string, unknown>, string?][];
            assert.deepEqual(
                inits.map((call) => call[2]),
                answer === "share" ? ["anonymous", undefined] : ["anonymous"],
            );
            const [key, options] = inits[0];
            assert.equal(key, KEY);
            // before_send is a closure: checked by what it does, the rest exactly.
            const { before_send: beforeSend, ...rest } = options as { before_send: (e: CaptureResult) => unknown };
            assert.isNull(beforeSend({ uuid: "u", event: "$autocapture", properties: { $cookieless_mode: true } }));
            const kept = beforeSend({ uuid: "u", event: "sample_loaded", properties: { $cookieless_mode: true } });
            assert.equal((kept as CaptureResult).properties.tracking, "anonymous");
            assert.deepEqual(rest, {
                api_host: HOST,
                defaults: "2026-08-30",
                cookieless_mode: "always",
                debug: false,
                disable_persistence: true,
                persistence: "memory",
                persistence_name: "graphty_anonymous",
                person_profiles: "never",
                disable_external_dependency_loading: true,
                advanced_disable_flags: true,
                advanced_disable_feature_flags: true,
                capture_pageview: false,
                capture_pageleave: false,
                autocapture: false,
                rageclick: false,
                capture_dead_clicks: false,
                capture_heatmaps: false,
                capture_exceptions: false,
                capture_performance: false,
                disable_session_recording: true,
                disable_surveys: true,
                disable_product_tours: true,
                disable_conversations: true,
                disable_scroll_properties: true,
                save_referrer: false,
                save_campaign_params: false,
                __extensionClasses: { toolbar: undefined },
            });
            assert.equal(capturedNames(anonymous.capture).includes("$pageview"), answer !== "share");
            assert.equal(capturedNames(fake.capture).includes("$pageview"), answer === "share");
        });
    }
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

    it("drops every event while sharing is off, and a cookieless one in the shared mode", () => {
        assert.isNull(cleanPostHogEvent(ev("$pageview")));
        setPostHogClientForTests({});
        assert.isNull(cleanPostHogEvent(ev("$pageview", { $cookieless_mode: true })));
        assert.equal(cleanPostHogEvent(ev("command_run", { command: "view.fit" }))?.properties.tracking, "shared");
    });

    it("in the anonymous mode keeps only the counts, their keys and the hash inputs", () => {
        const cookieless = { $cookieless_mode: true };
        for (const name of [
            "$autocapture",
            "$pageleave",
            "$web_vitals",
            "$$heatmap",
            "$snapshot",
            "$opt_in",
            "command_run",
            "survey shown",
            "survey sent",
            "survey dismissed",
        ]) {
            assert.isNull(cleanPostHogEvent(ev(name, cookieless), "anonymous"), name);
        }
        assert.isNull(cleanPostHogEvent(ev("$pageview"), "anonymous"), "not built in cookieless mode");
        writeSurveyState({ seen: [], use_case: "teach" });
        const out = cleanPostHogEvent(
            ev("algorithm_run", {
                ...cookieless,
                algorithm: "katz",
                outcome: "failed",
                code: "E_X",
                $raw_user_agent: "ua",
                $host: "graphty.app",
                $timezone: "UTC",
                $browser: "Chrome",
                $os: "Linux",
                $browser_version: 1,
                $os_version: "2",
                $screen_height: 1,
                $viewport_width: 1,
                $browser_language: "en",
                $timezone_offset: 0,
                $device: "d",
                ph_keyword: "SECRET",
                use_case: "teach",
                $future_key: "x",
                $current_url: "https://private.example/SECRET",
            }),
            "anonymous",
        );
        assert.deepEqual(Object.keys(out?.properties ?? {}).sort(), [
            "$browser",
            "$cookieless_mode",
            "$current_url",
            "$geoip_disable",
            "$host",
            "$os",
            "$raw_user_agent",
            "$timezone",
            "algorithm",
            "code",
            "outcome",
            "site",
            "tracking",
        ]);
        assert.equal(out?.properties.tracking, "anonymous");
        assert.equal(out?.properties.$current_url, "external");
    });

    it("adds the super properties", async () => {
        globalThis.history.replaceState(null, "", "?ref=hn");
        readChannel();
        startPageCounts(await site(PH));
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
