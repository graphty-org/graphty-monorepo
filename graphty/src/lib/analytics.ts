/**
 * Usage analytics (design/graphty/usage-analytics.md): one PostHog project, two modes. Every reader
 * who has not said Share usage data is counted by a named posthog-js instance in cookieless mode
 * (`tracking: "anonymous"`); a reader who shares is counted by the default instance
 * (`tracking: "shared"`). Each event goes to the one mode current when it is made.
 *
 * Nothing here may carry the reader's data. Every property value comes from an allowlist (catalog
 * ids, command ids, the app's own ids, fixed enums or buckets), and every URL is cut by `cleanUrl`.
 * PostHog's code is one lazy chunk, loaded after first paint (or at once when the reader shares).
 *
 * main.tsx imports this module, so it is part of the landing page: it imports only types and
 * modules already there. What only the workspace knows (the registered command ids, the element's
 * catalogs) reaches it at runtime, through `setCommandAllowlist` and the callers' own checks.
 */

import type { LoadedSourceKind, SelectionDelta, SessionCommand, SourceLoaded } from "@graphty/graphty-element/session";
import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";
// The file's URL, not the module: a failed load is retried at a URL the browser has not seen.
import posthogUrl from "posthog-js/full/no-external?url";

import { appFeatureOn } from "../features";
import { type SiteConfig, siteConfig } from "../siteConfig";
import { startUsageDataIfShared } from "../workspace/privacy/usageData";
import { sentryConfigured } from "./sentry";

/** A property value that may be sent: always an allowlisted id, enum or bucket. */
type Value = string | number | boolean;
/** An event's properties. */
export type UsageProps = Readonly<Record<string, Value | undefined>>;

/** The `ref` and `utm_*` values kept; any other non-empty value is sent as "other". Extend by editing. */
const KNOWN_CHANNELS: ReadonlySet<string> = new Set([
    "hn",
    "reddit",
    "x",
    "bluesky",
    "mastodon",
    "linkedin",
    "github",
    "newsletter",
    "email",
    "producthunt",
]);
const CHANNEL_PARAMS = ["ref", "utm_source", "utm_medium", "utm_campaign"] as const;
/** The address parameter that marks this browser's events as the people who build graphty testing. */
const INTERNAL_PARAM = "internal";
/** Where that mark is kept in this browser, so a page opened from history or a new tab keeps it. */
const INTERNAL_KEY = "graphty.internal";

/** The PostHog survey names the app looks for (the owner names the surveys exactly these). */
export const SURVEY_NAMES = { useCase: "use_case", exportEase: "export_ease" } as const;

/** Where shown survey ids and the answered use case are kept: `{ seen: string[], use_case?: string }`. */
export const SURVEYS_KEY = "graphty.surveys.v1";
const VISITS_KEY = "graphty.visits.v1";

/** Each own event's allowed property keys (section 4). An unknown name is never sent. */
export const EVENT_KEYS: Readonly<Partial<Record<string, readonly string[]>>> = {
    $pageview: [],
    first_visit: [],
    return_visit: ["days"],
    usage_data_shared: [],
    sample_loaded: ["sample", "size"],
    own_file_opened: ["format", "via", "size"],
    layout_changed: ["layout", "outcome"],
    algorithm_run: ["algorithm", "outcome", "code"],
    export_done: ["kind", "format", "destination"],
    style_changed: ["op", "action", "suggested", "by"],
    assistant_used: ["provider", "step", "voice", "outcome", "changed"],
    view_mode: ["mode", "by"],
    xr_entered: ["mode", "outcome", "code"],
    camera_saved: [],
    project_saved: ["kind", "as"],
    timeline_played: [],
    command_run: ["command"],
    command_failed: ["command", "code"],
    graph_action: ["kind", "op", "suggested"],
    canvas_selected: ["target", "count", "via"],
    camera_used: ["kind"],
    nodes_dragged: [],
    source_expanded: ["outcome"],
    panel_opened: ["panel"],
    project_reopened: ["from"],
    load_failed: ["code", "task"],
};
/** The names counted in both modes (section 4.1); every other own name is the shared mode's only. */
export const COUNTED_NAMES: ReadonlySet<string> = new Set([
    "$pageview",
    "first_visit",
    "return_visit",
    "usage_data_shared",
    "sample_loaded",
    "own_file_opened",
    "layout_changed",
    "algorithm_run",
    "export_done",
    "style_changed",
    "assistant_used",
    "view_mode",
    "xr_entered",
    "camera_used",
    "camera_saved",
    "project_saved",
    "project_reopened",
    "load_failed",
    "timeline_played",
]);
/** PostHog's own events that may be sent; any other `$` name (or one a later defaults date adds) is dropped. */
const DOLLAR_EVENTS: ReadonlySet<string> = new Set([
    "$pageview",
    "$pageleave",
    "$autocapture",
    "$rageclick",
    "$dead_click",
    "$web_vitals",
    "$$heatmap",
    "$snapshot",
    "$opt_in",
    "survey shown",
    "survey sent",
    "survey dismissed",
]);
const CLICK_EVENTS: ReadonlySet<string> = new Set(["$autocapture", "$rageclick", "$dead_click"]);
/** Keys every event may carry. */
const BASE_KEYS: ReadonlySet<string> = new Set([
    "token",
    "distinct_id",
    "site",
    "channel_ref",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "visit",
    "use_case",
    "tracking",
    "first_on_page",
    "internal",
]);
/**
 * The `$` keys an anonymous event keeps (section 5). `$cookieless_mode`, `$raw_user_agent`, `$host`
 * and `$timezone` are the inputs of PostHog's server hash; everything else (versions, screen,
 * language, any key a later posthog-js adds) is dropped.
 */
const ANONYMOUS_DOLLAR_KEYS: ReadonlySet<string> = new Set([
    "$cookieless_mode",
    "$raw_user_agent",
    "$host",
    "$timezone",
    "$current_url",
    "$pathname",
    "$referrer",
    "$referring_domain",
    "$browser",
    "$os",
    "$device_type",
    "$lib",
    "$lib_version",
    "$insert_id",
    "$time",
    "$config_defaults",
    "$process_person_profile",
]);

/**
 * Journal ops sent as `graph_action` (section 4.2), each by name: a new op is excluded until listed.
 * Style edits, 2D or 3D, VR or AR and saving a view are counted under names of their own (4.1).
 * The `data.*` loads (`data.import`, `data.import-source`) are left out: each load is counted once,
 * as `sample_loaded` or `own_file_opened` from `source:loaded`. Typed against the element's commands, so a renamed op fails to compile.
 */
const GRAPH_ACTION_OPS: ReadonlySet<string> = new Set<SessionCommand["op"]>([
    "view.remove",
    "note.add",
    "note.update",
    "note.remove",
    "note.merge",
    "annotations.set",
    "annotations.patch",
    "config.set",
    "algo.rename",
    "algo.remove",
    "algo.move",
    "layout.scope",
    "layout.rerun",
    "positions.pin",
    "visibility.set",
    "visibility.hide",
    "visibility.conditions",
    "visibility.context",
    "visibility.steps",
    "data.apply",
    "data.collapse",
    "data.columns",
    "data.declare",
    "data.derive",
    "data.expand",
    "data.issues",
    "data.setSource",
    "data.label",
    "data.source-expand",
    "set.create",
    "set.members",
    "set.redefine",
    "set.remove",
    "set.rename",
    "set.restore",
]);

/**
 * Whether a journal op is sent as `graph_action`.
 * @param op - the entry's `command.op`.
 * @returns true when it is on the op allowlist.
 */
export function isGraphActionOp(op: string): boolean {
    return GRAPH_ACTION_OPS.has(op);
}

/** Control ids for clickable controls that run no registered command (decision 15). */
const FIXED_CONTROL_IDS: ReadonlySet<string> = new Set([
    "usage-data.share",
    "usage-data.decline",
    "start.open-file",
    "start.sample",
]);

/**
 * A value when it is on its allowlist, else "other".
 * @param value - the value.
 * @param allowed - the allowlist.
 * @returns the value or "other".
 */
export function allowlisted(value: string | undefined, allowed: ReadonlySet<string>): string {
    return value !== undefined && allowed.has(value) ? value : "other";
}

/** The allowlists `sourceLoadedEvent` checks each id against, all from the element's catalogs or the app's own lists. */
export interface LoadAllowlists {
    readonly datasets: ReadonlySet<string>;
    readonly generators: ReadonlySet<string>;
    readonly examples: ReadonlySet<string>;
    /** The app's own start-screen sample ids. */
    readonly startSamples: ReadonlySet<string>;
    /** The element's `FormatId`s. */
    readonly formats: ReadonlySet<string>;
}

/**
 * Maps a `source:loaded` event to its count (section 4.1, mapping rules). The event's `source` and
 * `sourceId` are never used.
 * @param loaded - the event.
 * @param known - the allowlists.
 * @returns the event name and properties, or null for a reload (`callerKey: "reopen"`) or a source
 * re-read in place by `reloadSource` or `remap` (`replaced: "reloadSource"`).
 */
export function sourceLoadedEvent(
    loaded: SourceLoaded,
    known: LoadAllowlists,
): { name: "sample_loaded" | "own_file_opened"; props: UsageProps } | null {
    if (loaded.callerKey === "reopen" || loaded.replaced === "reloadSource") {
        return null;
    }
    const { sample: ids, callerKey } = loaded;
    // A start-screen sample stays one however it was loaded, the join screen's rows included.
    if (loaded.kind === "sample" || ids !== undefined || callerKey?.startsWith("sample:") === true) {
        let sample = "other";
        if (callerKey?.startsWith("sample:") === true) {
            sample = allowlisted(callerKey.slice("sample:".length), known.startSamples);
        } else if (ids !== undefined && "datasetId" in ids) {
            sample = allowlisted(ids.datasetId, known.datasets);
        } else if (ids !== undefined && "generatorId" in ids) {
            sample = allowlisted(ids.generatorId, known.generators);
        } else if (ids !== undefined && "exampleId" in ids) {
            sample = allowlisted(ids.exampleId, known.examples);
        }
        return { name: "sample_loaded", props: { sample } };
    }
    const format = loaded.kind === "server" ? "other" : allowlisted(loaded.format, known.formats);
    return { name: "own_file_opened", props: { format, via: allowlisted(loaded.kind, OPEN_VIA) } };
}

/** How an own file may be opened; a kind a later graphty-element adds is sent as "other". */
const OPEN_VIA: ReadonlySet<string> = new Set<LoadedSourceKind>(["file", "url", "server", "join"]);
/** How a selection may be made; a way a later graphty-element adds is sent as "other". */
export const SELECT_VIA: ReadonlySet<string> = new Set<NonNullable<SelectionDelta["via"]>>(["click", "box", "keys"]);

/**
 * The host each site serves on: nothing is sent from any other. analytics.test.ts checks it against
 * the address each committed graphty/sites/<site>.json serves its datasets from.
 */
export const SITE_HOSTS: Readonly<Partial<Record<string, string>>> = {
    production: "graphty.app",
    nightly: "nightly.graphty.app",
    canary: "canary.graphty.app",
};
/** The module's edges to the network and the page, replaceable by tests (no `vi.mock`, issue #3416). */
export interface AnalyticsCalls {
    /** Loads PostHog's code. */
    importPostHog(): Promise<{ default: PostHog }>;
    /** The page's host name. */
    hostname(): string;
    /** Do Not Track and Global Privacy Control. */
    privacySignals(): { dnt: boolean; gpc: boolean };
    /** Today's local calendar date, "YYYY-MM-DD". */
    today(): string;
    /** Runs the callback after first paint: after `load`, then an idle moment of at most 2 s. */
    afterFirstPaint(run: () => void): void;
    /** Tests only: PostHog's ingest host, with compression off so bodies are plain JSON. */
    posthogHost?: string;
}

/**
 * Runs a callback after the page's `load` event and then an idle moment, capped at two seconds so a
 * page that keeps the main thread busy (the start screen's live graph) still runs it.
 * @param run - the callback.
 */
function afterLoadAndIdle(run: () => void): void {
    const idle = (): void => {
        if (typeof globalThis.requestIdleCallback === "function") {
            globalThis.requestIdleCallback(run, { timeout: 2000 });
        } else {
            globalThis.setTimeout(run, 0);
        }
    };
    if (document.readyState === "complete") {
        idle();
    } else {
        globalThis.addEventListener("load", idle, { once: true });
    }
}

/** Failed loads of posthog-js so far on this page, read by importPostHogModule. */
let failedImports = 0;

/**
 * Loads posthog-js, the one self-contained file it ships. A browser keeps a failed module load for
 * the life of the page and answers every later `import()` of that URL with the same failure without
 * asking the network again (Chromium, Firefox and WebKit alike), so a load after a failure asks for
 * the file at a URL it has not seen (`?retry=<n>`). A load that succeeded is the same URL every time,
 * so every caller gets the one module and its one default instance.
 * @returns the module.
 */
export function importPostHogModule(): Promise<{ default: PostHog }> {
    const url = new URL(posthogUrl, import.meta.url);
    if (failedImports > 0) {
        url.searchParams.set("retry", String(failedImports));
    }
    return (import(/* @vite-ignore */ url.href) as Promise<{ default: PostHog }>).catch((error: unknown) => {
        failedImports++;
        throw error;
    });
}

const defaultCalls: AnalyticsCalls = {
    importPostHog: importPostHogModule,
    hostname: () => globalThis.location.hostname,
    privacySignals: () => {
        const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
        return { dnt: nav.doNotTrack === "1", gpc: nav.globalPrivacyControl === true };
    },
    today: localDate,
    afterFirstPaint: afterLoadAndIdle,
};
let calls: AnalyticsCalls = defaultCalls;

/**
 * Replaces the network and page edges with stand-ins; the ones left out stay the real ones.
 * @param overrides - the stand-ins, or nothing for the real ones again.
 */
export function setAnalyticsCallsForTests(overrides?: Partial<AnalyticsCalls>): void {
    calls = { ...defaultCalls, ...overrides };
}

/** The PostHog calls the app makes. */
export type PostHogClient = Pick<
    PostHog,
    | "init"
    | "capture"
    | "opt_in_capturing"
    | "opt_out_capturing"
    | "reset"
    | "get_distinct_id"
    | "persistence"
    | "startSessionRecording"
    | "stopSessionRecording"
    | "getActiveMatchingSurveys"
>;

/** The two modes (decision 16): which instance an event goes to, named on it as `tracking`. */
export type TrackingMode = "anonymous" | "shared";

// Module state, all reset by resetAnalyticsForTests.
let bootSearch: string | undefined;
let channel: { path: string; params: Record<string, string> } | undefined;
/** True once the anonymous mode is on for this page: a PostHog key and the site's own host. */
let counting = false;
/** Section 4.1 names already sent on this page, in either mode (decision 14). */
const sentOnPage = new Set<string>();
/** The `internal` super property: true once `?internal=1` marked this browser (readInternal). */
let internal = false;
/** The `visit` super property: "first" or the return bucket; absent under DNT or GPC. */
let visit: string | undefined;
/** True while the reader shares: the shared mode is current. */
let wanted = false;
let initialized = false;
/** The shared-mode client (posthog-js's default instance). */
let client: PostHogClient | undefined;
/** The anonymous-mode client (the named cookieless instance). */
let anonymousClient: Pick<PostHogClient, "capture"> | undefined;
let anonymousStarted = false;
let importing: Promise<{ default: PostHog }> | undefined;
/** Counts made before their mode's instance was ready, each tagged with that mode. */
const buffer: { mode: TrackingMode; name: string; props: Record<string, Value> }[] = [];
const BUFFER_MAX = 20;
let commandAllowlist: ReadonlySet<string> = new Set();
const listeners = new Set<(name: string, props: Readonly<Record<string, Value>>) => void>();

/**
 * The page's query string as it was at boot, before anything removed a parameter from the address
 * bar. Readers of the query that run after boot read this rather than `location.search`.
 * @returns the boot query, or the address bar's while nothing was removed yet.
 */
export function bootQuery(): URLSearchParams {
    return new URLSearchParams(bootSearch ?? globalThis.location.search);
}

/** Keeps the boot query before the address bar is first changed. */
function snapshotBootQuery(): void {
    bootSearch ??= globalThis.location.search;
}

/**
 * A channel value as sent: the value when it is a known channel, "other" for any other.
 * @param value - the raw value.
 * @returns the value to send, or undefined for an empty one.
 */
function channelValue(value: string | null): string | undefined {
    if (value === null || value === "") {
        return undefined;
    }
    const lower = value.toLowerCase();
    return KNOWN_CHANNELS.has(lower) ? lower : "other";
}

/**
 * The kept channel parameters of a query.
 * @param search - the query.
 * @returns each set channel parameter with its cleaned value.
 */
function channelParams(search: URLSearchParams): Record<string, string> {
    const out: Record<string, string> = {};
    for (const name of CHANNEL_PARAMS) {
        const value = channelValue(search.get(name));
        if (value !== undefined) {
            out[name] = value;
        }
    }
    return out;
}

/** What any URL outside this site is sent as: a file's or a server's address, even its origin, never leaves. */
export const EXTERNAL_URL = "external";

/**
 * Cuts a URL to what may be sent: a same-origin URL to its path plus the cleaned channel
 * parameters, any other web URL to {@link EXTERNAL_URL}, any other scheme to the scheme alone.
 * @param href - an absolute or relative URL.
 * @returns the URL to send ("" when it does not parse).
 */
export function cleanUrl(href: string): string {
    let url: URL;
    try {
        url = new URL(href, globalThis.location.href);
    } catch {
        return "";
    }
    if (!/^https?:$/.test(url.protocol)) {
        return url.protocol;
    }
    if (url.origin !== globalThis.location.origin) {
        return EXTERNAL_URL;
    }
    const query = new URLSearchParams(channelParams(url.searchParams)).toString();
    return url.pathname + (query === "" ? "" : `?${query}`);
}

/**
 * The origin of a URL, for a referrer.
 * @param href - the URL.
 * @returns its origin, or "" when it is empty or does not parse.
 */
function originOf(href: string): string {
    try {
        const { origin } = new URL(href);
        return origin === "null" ? "" : origin;
    } catch {
        return "";
    }
}

/**
 * Reads the page's path and channel parameters into a module value, at boot.
 * @returns the path and the cleaned channel parameters.
 */
export function readChannel(): { path: string; params: Record<string, string> } {
    snapshotBootQuery();
    channel = {
        path: globalThis.location.pathname,
        params: channelParams(new URLSearchParams(globalThis.location.search)),
    };
    return channel;
}

/**
 * The boot path with its channel, as sent.
 * @returns the URL.
 */
function bootUrl(): string {
    const { path, params } = channel ?? readChannel();
    const query = new URLSearchParams(params).toString();
    return path + (query === "" ? "" : `?${query}`);
}

/**
 * Removes the address bar's query and hash before a recorder starts, so no replay records them.
 * Does nothing unless a recorder will start (a PostHog key, or a Sentry DSN).
 */
export function stripQueryForRecorders(): void {
    if (siteConfig().analytics?.posthogKey === undefined && !sentryConfigured()) {
        return;
    }
    snapshotBootQuery();
    const { location, history } = globalThis;
    if (location.search !== "" || location.hash !== "") {
        history.replaceState(history.state, "", location.pathname);
    }
}

/**
 * Reads the internal mark at boot: `?internal=1` keeps it in this browser, `?internal=0` removes it.
 * Only `internal: true` is ever sent; the stored key never leaves the device.
 */
function readInternal(): void {
    const asked = bootQuery().get(INTERNAL_PARAM);
    try {
        if (asked === "1") {
            localStorage.setItem(INTERNAL_KEY, "1");
        } else if (asked === "0") {
            localStorage.removeItem(INTERNAL_KEY);
        }
        internal = localStorage.getItem(INTERNAL_KEY) !== null;
    } catch {
        // Storage blocked: this page's address alone.
        internal = asked === "1";
    }
}

/** The address parameters removed at boot: the four channel ones and the internal mark. */
const BOOT_PARAMS = [...CHANNEL_PARAMS, INTERNAL_PARAM];

/** Removes the boot parameters from the address bar, keeping the path, the hash and every other parameter. */
function removeChannelFromAddress(): void {
    const url = new URL(globalThis.location.href);
    if (BOOT_PARAMS.some((name) => url.searchParams.has(name))) {
        snapshotBootQuery();
        for (const name of BOOT_PARAMS) {
            url.searchParams.delete(name);
        }
        globalThis.history.replaceState(globalThis.history.state, "", url.pathname + url.search + url.hash);
    }
}

/**
 * Today's local calendar date.
 * @returns "YYYY-MM-DD".
 */
function localDate(): string {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Days from one local date to another.
 * @param from - "YYYY-MM-DD".
 * @param to - "YYYY-MM-DD".
 * @returns whole days, NaN when either does not parse.
 */
function daysBetween(from: string, to: string): number {
    const day = (text: string): number => {
        const [y, m, d] = text.split("-").map(Number);
        return Date.UTC(y, m - 1, d) / 86_400_000;
    };
    return Math.round(day(to) - day(from));
}

/**
 * The `return_visit` bucket for a visit record and today.
 * @param first - the first visit's local date.
 * @param today - today's local date.
 * @param last - the last visit's local date; the first when absent.
 * @returns the bucket, null on the first visit's day (or when the first visit is dated up to two
 * days later than today: a time zone crossed westward), or "reset" when the last visit was more
 * than 395 days ago, either date is more than two days ahead of today, or either is unreadable.
 */
export function visitBucket(
    first: string,
    today: string,
    last: string = first,
): "1" | "2-7" | "8-30" | "30+" | "reset" | null {
    const days = daysBetween(first, today);
    const sinceLast = daysBetween(last, today);
    // A date more than two days ahead is no time-zone hop but a clock that was wrong: keeping it
    // would stop every count from this browser until the real date caught up.
    if (!Number.isFinite(days) || !Number.isFinite(sinceLast) || sinceLast > 395 || days < -2 || sinceLast < -2) {
        return "reset";
    }
    if (days <= 0) {
        return null;
    }
    if (days === 1) {
        return "1";
    }
    if (days <= 7) {
        return "2-7";
    }
    return days <= 30 ? "8-30" : "30+";
}

/** Sends `first_visit` or `return_visit` from the visit record, at most once a day. Only the bucket leaves the page. */
/** Removes the visit record: under Do Not Track or GPC the app keeps none, even one written before. */
function forgetVisits(): void {
    try {
        localStorage.removeItem(VISITS_KEY);
    } catch {
        // Storage blocked: nothing is stored.
    }
}

/**
 * Removes the app's own visit and survey records, for a No with the usage-analytics experiment off:
 * an earlier visit with it on may have written them, and nothing else removes them while it is off.
 */
export function forgetAnalyticsRecords(): void {
    forgetVisits();
    try {
        localStorage.removeItem(SURVEYS_KEY);
    } catch {
        // Storage blocked: nothing is stored.
    }
}

function countVisit(): void {
    const today = calls.today();
    let record: { first: string; last: string } | null = null;
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(VISITS_KEY) ?? "null");
        const date = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof parsed === "object" && parsed !== null) {
            const { first, last } = parsed as Record<string, unknown>;
            if (typeof first === "string" && typeof last === "string" && date.test(first) && date.test(last)) {
                record = { first, last };
            }
        }
        const bucket = record === null ? "reset" : visitBucket(record.first, today, record.last);
        if (record === null || bucket === "reset") {
            localStorage.setItem(VISITS_KEY, JSON.stringify({ first: today, last: today }));
            visit = "first";
            count("first_visit");
            return;
        }
        visit = bucket ?? "first";
        // A last visit dated today or later was already counted: a reader whose clock or time zone
        // moved back is not counted again, and the record keeps its dates.
        if (record.last < today && bucket !== null) {
            localStorage.setItem(VISITS_KEY, JSON.stringify({ first: record.first, last: today }));
            count("return_visit", { days: bucket });
        }
    } catch {
        // Storage blocked: the page view only.
    }
}

/**
 * Whether the page is served from its site's own host. Nothing is sent from anywhere else: a local
 * build or a studio server that answers with a real site's site.json must not count into that site.
 * @param config - the site's configuration; the loaded one by default.
 * @returns true on the host the site's name serves on.
 */
export function onOwnHost(config: SiteConfig = siteConfig()): boolean {
    const host = SITE_HOSTS[config.site];
    return host !== undefined && calls.hostname() === host;
}

/**
 * Whether this reader's visits are counted: not under Do Not Track or Global Privacy Control.
 * @returns true when neither signal is set.
 */
function visitsCounted(): boolean {
    const { dnt, gpc } = calls.privacySignals();
    return !dnt && !gpc;
}

/**
 * The PostHog key and ingest host to send with, when PostHog may run on this page.
 * @param config - the site's configuration.
 * @returns them, or undefined without a key or host, or off the site's own host.
 */
function postHogTarget(config: SiteConfig): { key: string; host: string } | undefined {
    const key = config.analytics?.posthogKey;
    const host = calls.posthogHost ?? config.analytics?.posthogHost;
    return key === undefined || host === undefined || !onOwnHost(config) ? undefined : { key, host };
}

/**
 * Whether this page sends PostHog anything: the usage-analytics experiment on, a PostHog key and
 * host in site.json, and the site's own host. The words that say what is sent follow this, so a
 * site with the experiment on and nothing to send to (no PostHog ids) says what it does: nothing.
 * @param config - the site's configuration; the loaded one by default.
 * @returns true when PostHog may run on this page.
 */
export function analyticsSends(config: SiteConfig = siteConfig()): boolean {
    return appFeatureOn("usage-analytics", config.features) && postHogTarget(config) !== undefined;
}

/**
 * Says why a site with PostHog ids sends nothing from this host: off on purpose for a local build; on
 * a site whose host moved, this line says why it went quiet.
 * @param config - the site's configuration.
 */
function warnOffHost(config: SiteConfig): void {
    if (config.analytics !== undefined && !onOwnHost(config)) {
        console.warn(
            `[graphty] analytics is off: ${calls.hostname()} is not the host of the ${config.site} site (${SITE_HOSTS[config.site] ?? "none"})`,
        );
    }
}

/**
 * Starts this page view's counts: the page view (into the mode current now), then the visit event,
 * then removes the channel parameters from the address bar. Sends nothing without a PostHog key or
 * off the site's own host.
 * @param config - the site's configuration.
 */
export function startPageCounts(config: SiteConfig): void {
    warnOffHost(config);
    if (postHogTarget(config) !== undefined) {
        counting = true;
        count("$pageview");
        if (visitsCounted()) {
            countVisit();
        } else {
            forgetVisits();
        }
    }
    removeChannelFromAddress();
}

/**
 * Everything analytics does at boot (section 3), in order. Where the page sends PostHog nothing (the
 * usage-analytics experiment off, a site with no PostHog ids, or off the site's own
 * host; section 11) only error reporting starts, for a reader who said Share on an earlier visit: no
 * PostHog, no visit record, and the address bar left as it is.
 * @param config - the site's configuration.
 */
export function startAnalyticsAtBoot(config: SiteConfig): void {
    if (!analyticsSends(config)) {
        if (appFeatureOn("usage-analytics", config.features)) {
            warnOffHost(config);
        }
        startUsageDataIfShared();
        return;
    }
    readChannel();
    readInternal();
    startUsageDataIfShared();
    startPageCounts(config);
    calls.afterFirstPaint(() => {
        startAnonymous(config);
    });
}

/**
 * An event's allowlisted properties.
 * @param name - the event name.
 * @param props - the properties given.
 * @returns them, or null for an unknown event name.
 */
function allowedProps(name: string, props: UsageProps): Record<string, Value> | null {
    const keys = EVENT_KEYS[name];
    if (keys === undefined) {
        return null;
    }
    const out: Record<string, Value> = {};
    for (const key of keys) {
        const value = props[key];
        if (value !== undefined) {
            out[key] = value;
        }
    }
    return out;
}

/**
 * Hands an event to one mode's instance, or keeps it, tagged with that mode, while the instance loads.
 * @param mode - the mode it is sent in.
 * @param name - the event name.
 * @param props - the allowlisted properties.
 */
function toMode(mode: TrackingMode, name: string, props: Record<string, Value>): void {
    const target = mode === "shared" ? client : anonymousClient;
    if (target === undefined) {
        // A page's first count of a name is always kept: there is at most one per counted name, and
        // dropping it would leave the name marked sent and never counted on this page.
        if (buffer.length < BUFFER_MAX || props.first_on_page === true) {
            buffer.push({ mode, name, props });
        }
        return;
    }
    try {
        target.capture(name, props);
    } catch {
        // Best effort.
    }
}

/**
 * Tells every `onUsageEvent` listener.
 * @param name - the event name.
 * @param props - the allowlisted properties.
 */
function notify(name: string, props: Readonly<Record<string, Value>>): void {
    for (const listener of listeners) {
        listener(name, props);
    }
}

/**
 * Whether the anonymous mode sends a name: it is on for this page and, for usage_data_shared, the
 * reader's visits are counted. The opt-in rate is usage_data_shared over first_visit, so a reader
 * whose visits are not counted (DNT or GPC) is left out of both.
 * @param name - the event name.
 * @returns true when it is sent.
 */
function countsAnonymously(name: string): boolean {
    return counting && (name !== "usage_data_shared" || visitsCounted());
}

/**
 * Counts an event of section 4.1 into the mode current now: in the anonymous mode at most once per
 * name per page view, in the shared mode every time. The first of a name on the page, in either
 * mode, carries `first_on_page: true`, so counting those counts each page view once.
 * @param name - the event name.
 * @param props - its properties; keys not on the event's allowlist are dropped.
 */
export function count(name: string, props: UsageProps = {}): void {
    const clean = allowedProps(name, props);
    if (clean === null) {
        return;
    }
    const counted = COUNTED_NAMES.has(name);
    const first = counted && !sentOnPage.has(name);
    if (wanted) {
        if (counted) {
            sentOnPage.add(name);
        }
        toMode("shared", name, first ? { ...clean, first_on_page: true } : clean);
    } else if (first && countsAnonymously(name)) {
        sentOnPage.add(name);
        toMode("anonymous", name, { ...clean, first_on_page: true });
    }
    notify(name, clean);
    retryFailedLoad();
}

/**
 * Sends an event to PostHog only, while sharing is on (section 4.2).
 * @param name - the event name.
 * @param props - its properties; keys not on the event's allowlist are dropped.
 */
export function detail(name: string, props: UsageProps = {}): void {
    const clean = allowedProps(name, props);
    if (clean === null) {
        return;
    }
    if (wanted) {
        toMode("shared", name, clean);
    }
    notify(name, clean);
}

/**
 * Listens to every `count` and `detail`, with the event name and its allowlisted properties.
 * @param listener - called for each.
 * @returns a function that stops listening.
 */
export function onUsageEvent(listener: (name: string, props: Readonly<Record<string, Value>>) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * The registered command ids, which `control` may carry. Called by the workspace once its registry is built.
 * @param ids - the command ids.
 */
export function setCommandAllowlist(ids: Iterable<string>): void {
    commandAllowlist = new Set(ids);
}

/**
 * The `callerKey` the app passes to graphty-element for writes it makes for itself, not the reader
 * (its starting choices for every project, a project's name). Every journal entry that carries a
 * `callerKey` is the app's own and is never sent (workspace/privacy/useUsageEvents.ts).
 */
export const APP_CALLER_KEY = "app";

/** The attributes PostHog's replay keeps; every other attribute is masked. */
const REPLAY_KEPT_ATTRIBUTES: ReadonlySet<string> = new Set([
    "class",
    "role",
    "type",
    "tabindex",
    "disabled",
    "style",
    "aria-expanded",
    "aria-selected",
    "aria-checked",
    "aria-pressed",
    "aria-disabled",
    "aria-hidden",
    "aria-current",
    "aria-haspopup",
    "data-ph-capture-attribute-control",
]);

/**
 * PostHog replay's attribute mask, an allowlist: an attribute that starts carrying reader text later
 * is masked without anyone listing it.
 * @param key - the attribute name.
 * @param value - its value.
 * @returns the value for an allowlisted attribute, else "*".
 */
export function maskEveryAttribute(key: string, value: string): string {
    return REPLAY_KEPT_ATTRIBUTES.has(key) ? value : "*";
}

/** The attribute names known to carry reader text, kept in Sentry's list itself as a floor. */
const KNOWN_READER_ATTRIBUTES: readonly string[] = [
    "title",
    "aria-label",
    "aria-description",
    "aria-valuetext",
    "alt",
    "placeholder",
    "value",
    "name",
    "href",
    "download",
    "label",
    "for",
    "id",
    "data-part",
    "data-key",
    "data-source",
    "data-entry",
    "data-card",
    "data-card-row",
    "data-group-row",
    "data-group-field",
    "data-item",
    "data-item-settings",
    "data-id",
    "data-row",
    "data-line",
    "data-unset-line",
    "data-notes",
    "data-shader",
    "data-receipt",
    "data-result",
    "data-value-listbox",
    "data-section",
    "data-option",
    "data-chat",
    "data-chat-open",
    "data-step-pane",
    "data-branch",
    "data-add",
    "data-start",
    "data-run",
];

/**
 * Sentry's attribute list, answering "masked" for every attribute PostHog's replay does not keep.
 * Sentry's replay takes only a list of names and asks it `maskAttributes.includes(name)`
 * (@sentry/replay 11.12, `maskAttribute`), so this list's `includes` is the same allowlist as
 * {@link maskEveryAttribute}: a `data-*` attribute added later is masked without anyone listing
 * it. It still holds the known names, so an SDK that copied it into a plain array would mask those.
 */
class EveryAttributeExceptKept extends Array<string> {
    override includes(name: string): boolean {
        return !REPLAY_KEPT_ATTRIBUTES.has(name);
    }
}

/**
 * The attributes Sentry's error replay masks: every one but {@link REPLAY_KEPT_ATTRIBUTES}.
 * Pass it to `replayIntegration` as is; a copy (`[...list]`) loses the allowlist.
 * @returns a fresh list.
 */
export function sentryMaskedAttributes(): string[] {
    const list = new EveryAttributeExceptKept();
    list.push(...KNOWN_READER_ATTRIBUTES);
    return list;
}

/** The stored survey state: shown survey ids and the answered use case. */
export interface SurveyState {
    readonly seen: readonly string[];
    readonly use_case?: string;
}

/**
 * Reads the stored survey state.
 * @returns it, empty when none or unreadable.
 */
export function readSurveyState(): SurveyState {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(SURVEYS_KEY) ?? "null");
        if (typeof parsed === "object" && parsed !== null) {
            const { seen, use_case: useCase } = parsed as Record<string, unknown>;
            return {
                seen: Array.isArray(seen) ? seen.filter((id): id is string => typeof id === "string") : [],
                ...(typeof useCase === "string" ? { use_case: useCase } : {}),
            };
        }
    } catch {
        // Unreadable or blocked: nothing seen.
    }
    return { seen: [] };
}

/**
 * Stores the survey state, best effort.
 * @param state - the state.
 */
export function writeSurveyState(state: SurveyState): void {
    try {
        localStorage.setItem(SURVEYS_KEY, JSON.stringify(state));
    } catch {
        // Storage blocked.
    }
}

/**
 * The super properties merged into every PostHog event (section 4.2); `use_case`, a survey answer,
 * is shared-mode data only.
 * @param mode - the mode the event is sent in.
 * @returns them.
 */
function superProperties(mode: TrackingMode): Record<string, Value> {
    const params: Partial<Record<string, string>> = channel?.params ?? {};
    const useCase = mode === "shared" ? readSurveyState().use_case : undefined;
    return {
        tracking: mode,
        site: siteConfig().site,
        ...(params.ref === undefined ? {} : { channel_ref: params.ref }),
        ...(params.utm_source === undefined ? {} : { utm_source: params.utm_source }),
        ...(params.utm_medium === undefined ? {} : { utm_medium: params.utm_medium }),
        ...(params.utm_campaign === undefined ? {} : { utm_campaign: params.utm_campaign }),
        ...(visit === undefined ? {} : { visit }),
        ...(internal ? { internal: true } : {}),
        ...(useCase === undefined ? {} : { use_case: /^[\w-]{1,40}$/.test(useCase) ? useCase : "other" }),
        $geoip_disable: true,
    };
}

/**
 * Cuts every web URL at any depth.
 * @param value - a property value.
 * @returns the value with every http(s) URL string replaced by `cleanUrl` of it.
 */
function cleanDeep(value: unknown): unknown {
    if (typeof value === "string") {
        return /^https?:\/\//i.test(value) ? cleanUrl(value) : value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => cleanDeep(item));
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, cleanDeep(inner)]));
    }
    return value;
}

/**
 * Whether a click event happened on the graph's canvas.
 * @param props - the event's properties.
 * @returns true when its element chain holds graphty-element or a canvas.
 */
function onCanvas(props: Record<string, unknown>): boolean {
    const chain = props.$elements_chain;
    if (typeof chain === "string" && /(^|;)\s*(graphty-element|canvas)(?=[.:;]|$)/.test(chain)) {
        return true;
    }
    const elements = props.$elements;
    return (
        Array.isArray(elements) &&
        elements.some((element: unknown) => {
            const tag = (element as { tag_name?: unknown } | null)?.tag_name;
            return tag === "graphty-element" || tag === "canvas";
        })
    );
}

/**
 * PostHog's `before_send` for each mode: drops what may not be sent and cuts what may. The shared
 * mode's steps are in section 6, the anonymous mode's in section 5.
 * @param event - the event PostHog is about to send.
 * @param mode - the instance it came from; the shared one by default.
 * @returns the event to send, or null to drop it.
 */
export function cleanPostHogEvent(event: CaptureResult | null, mode: TrackingMode = "shared"): CaptureResult | null {
    if (event === null) {
        return null;
    }
    const name = event.event;
    const raw = event.properties as Record<string, unknown>;
    const cookieless = raw.$cookieless_mode === true;
    // Each instance sends only what is its own: the shared one never runs cookieless, and an
    // anonymous event proves it was built in cookieless mode.
    if (mode === "shared" ? !wanted || cookieless : !COUNTED_NAMES.has(name) || !cookieless) {
        return null;
    }
    const ownKeys = EVENT_KEYS[name];
    if (ownKeys === undefined && !DOLLAR_EVENTS.has(name)) {
        return null;
    }
    if (CLICK_EVENTS.has(name) && onCanvas(raw)) {
        return null;
    }
    const merged: Record<string, unknown> = { ...raw, ...superProperties(mode) };
    delete merged.$set;
    delete merged.$set_once;
    delete merged.title;
    delete merged.$title;
    // A recording is left whole: walking every batch costs CPU on each flush, and cutting its
    // stylesheet and font URLs breaks replay styling. The address-bar strip protects its URLs.
    const cleaned = name === "$snapshot" ? merged : cleanUrls(raw, merged);
    if (name === "$pageview") {
        Object.assign(cleaned, pageViewUrls());
    }
    const { $set: _set, $set_once: _setOnce, ...rest } = event;
    const properties =
        mode === "shared" ? allowedKeys(name, ownKeys ?? [], cleaned) : anonymousKeys(ownKeys ?? [], cleaned);
    return { ...rest, properties };
}

/**
 * The page view's URLs: it is sent when its instance is ready, after the address bar lost its
 * channel, so they come from the boot path and the referrer's origin, never from the address bar.
 * @returns `$current_url`, `$pathname`, `$referrer` and `$referring_domain`.
 */
function pageViewUrls(): Record<string, string> {
    const referrer = originOf(document.referrer);
    return {
        $current_url: bootUrl(),
        $pathname: (channel ?? readChannel()).path,
        $referrer: referrer === "" ? "$direct" : referrer,
        $referring_domain: referrer === "" ? "$direct" : new URL(referrer).host,
    };
}

/**
 * The properties an anonymous event may carry (section 5, step 4): its own allowlist, the keys of
 * every event and the few `$` keys PostHog needs; everything else is dropped.
 * @param ownKeys - the event's own allowlist.
 * @param properties - the cleaned properties.
 * @returns the kept properties.
 */
function anonymousKeys(ownKeys: readonly string[], properties: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
        if (ANONYMOUS_DOLLAR_KEYS.has(key) || (BASE_KEYS.has(key) && key !== "use_case") || ownKeys.includes(key)) {
            out[key] = value;
        }
    }
    out.$geoip_disable = true;
    return out;
}

/**
 * Cuts every URL in an event's properties: by value at any depth, referrers to their origin, and
 * the heatmap's keys.
 * @param raw - the properties as PostHog gave them.
 * @param merged - the properties with the super properties merged.
 * @returns the properties with every URL cut.
 */
function cleanUrls(raw: Record<string, unknown>, merged: Record<string, unknown>): Record<string, unknown> {
    const cleaned = cleanDeep(merged) as Record<string, unknown>;
    for (const key of ["$referrer", "$initial_referrer"]) {
        const value = raw[key];
        if (typeof value === "string" && /^https?:/i.test(value)) {
            cleaned[key] = originOf(value);
        }
    }
    const heatmap = raw.$heatmap_data;
    if (typeof heatmap === "object" && heatmap !== null) {
        cleaned.$heatmap_data = Object.fromEntries(
            Object.entries(heatmap).map(([url, data]) => [cleanUrl(url), cleanDeep(data)]),
        );
    }
    return cleaned;
}

/**
 * The properties an event may carry: every `$` key (PostHog's own, linking events to sessions and
 * replays), the keys of every event, the event's own allowlist, and `control` on a click only when
 * it is a registered command or a fixed control id.
 * @param name - the event name.
 * @param ownKeys - the event's own allowlist.
 * @param properties - the cleaned properties.
 * @returns the kept properties.
 */
function allowedKeys(
    name: string,
    ownKeys: readonly string[],
    properties: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
        if (key === "control" && CLICK_EVENTS.has(name)) {
            if (typeof value === "string" && (commandAllowlist.has(value) || FIXED_CONTROL_IDS.has(value))) {
                out[key] = value;
            }
        } else if (key.startsWith("$") || BASE_KEYS.has(key) || ownKeys.includes(key)) {
            out[key] = value;
        }
    }
    return out;
}

/**
 * PostHog's init options (section 6).
 * @param host - the ingest host.
 * @returns the options.
 */
function postHogOptions(host: string): Partial<PostHogConfig> {
    const plain = calls.posthogHost !== undefined;
    return {
        api_host: host,
        // Pinned with the posthog-js version: a later dated defaults set can turn on new captures.
        defaults: "2026-08-30",
        persistence: "localStorage",
        person_profiles: "identified_only",
        opt_out_capturing_by_default: true,
        disable_external_dependency_loading: true,
        advanced_disable_flags: false,
        // The app's own count("$pageview") at boot is the only page view (section 3).
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
            maskCapturedNetworkRequestFn: (request) => ({ ...request, name: cleanUrl(request.name) }),
            ...(plain ? { compress_events: false } : {}),
        },
        disable_surveys: false,
        // Only the app's own SurveyCard asks a question: a popover survey made in PostHog by
        // mistake is never drawn, so no open text is asked outside the one disclosed box.
        disable_surveys_automatic_display: true,
        before_send: cleanPostHogEvent,
        ...(plain ? { disable_compression: true } : {}),
    };
}

/**
 * The anonymous instance's init options (section 5): cookieless, nothing stored, nothing captured
 * on its own; the only thing it sends is what `count()` hands it.
 * @param host - the ingest host.
 * @returns the options.
 */
function anonymousOptions(host: string): Partial<PostHogConfig> {
    return {
        api_host: host,
        defaults: "2026-08-30",
        // No storage and no id from the page; $cookieless_mode on every event.
        cookieless_mode: "always",
        // Explicit, so ?__posthog_debug=true in the address never writes ph_debug to localStorage
        // (posthog-js reads the URL for its default and stores the flag when it is true).
        debug: false,
        disable_persistence: true,
        // Both needed: without its own name and memory persistence, this init's disabled
        // persistence removes ph_<token>_posthog, the shared instance's stored id (section 5).
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
        // No toolbar: its init writes and removes a localStorage "test" key on every load, whatever
        // the other options say (posthog-js toolbar.js maybeLoadToolbar).
        __extensionClasses: { toolbar: undefined },
        before_send: (event) => cleanPostHogEvent(event, "anonymous"),
        ...(calls.posthogHost === undefined ? {} : { disable_compression: true }),
    };
}

/**
 * Sends one mode's events kept while its instance loaded.
 * @param mode - the mode whose instance is now ready.
 */
function flushBuffer(mode: TrackingMode): void {
    const kept = buffer.filter((entry) => entry.mode === mode);
    for (const entry of kept) {
        buffer.splice(buffer.indexOf(entry), 1);
    }
    for (const { name, props } of kept) {
        toMode(mode, name, props);
    }
}

/**
 * Creates the anonymous instance from the loaded posthog-js, once per page, before the shared one.
 * @param posthog - posthog-js's default export.
 * @param target - the key and host.
 * @param target.key - the PostHog project key.
 * @param target.host - the ingest host.
 */
function initAnonymous(posthog: PostHog, target: { key: string; host: string }): void {
    if (anonymousClient !== undefined) {
        return;
    }
    // posthog-js types init() as always returning, but it returns undefined when it cannot start.
    const instance = posthog.init(target.key, anonymousOptions(target.host), "anonymous") as PostHog | undefined;
    if (instance !== undefined) {
        anonymousClient = instance;
        flushBuffer("anonymous");
    }
}

/**
 * Starts the anonymous mode (section 5), after first paint: loads posthog-js once and creates the
 * named cookieless instance, whatever the reader's answer, because a reader who withdraws needs it.
 * @param config - the site's configuration.
 */
function startAnonymous(config: SiteConfig = siteConfig()): void {
    const target = postHogTarget(config);
    if (target === undefined || anonymousStarted) {
        return;
    }
    anonymousStarted = true;
    importing ??= calls.importPostHog();
    importing.then(
        ({ default: posthog }) => {
            initAnonymous(posthog, target);
        },
        () => {
            anonymousStarted = false;
            loadFailed(() => {
                startAnonymous(config);
            });
        },
    );
}

/** Starts to repeat after posthog-js failed to load, run on the next count or when the browser is back online. */
const retries: (() => void)[] = [];

/**
 * Records a failed load of posthog-js, to be tried again (the buffered counts wait for it).
 * @param retry - the start to repeat.
 */
function loadFailed(retry: () => void): void {
    importing = undefined;
    if (retries.length === 0) {
        globalThis.addEventListener("online", retryFailedLoad);
    }
    retries.push(retry);
}

/** Tries every failed load again, once. */
function retryFailedLoad(): void {
    if (retries.length === 0) {
        return;
    }
    globalThis.removeEventListener("online", retryFailedLoad);
    for (const retry of retries.splice(0)) {
        retry();
    }
}

/**
 * Takes the id another tab's Share made and saved, so one reader is one person across tabs.
 * @param posthog - this page's client.
 * @returns true when a new id was read; false when storage holds none (that tab has not saved one).
 */
function adoptStoredId(posthog: PostHogClient): boolean {
    const before = posthog.get_distinct_id();
    posthog.persistence?.load(true);
    const after = posthog.get_distinct_id();
    return typeof after === "string" && after !== "" && after !== before;
}

/** The storage listener of a tab waiting for another tab's new PostHog id; undefined when none waits. */
let waitingForId: ((event: StorageEvent) => void) | undefined;

/**
 * Whether storage holds a PostHog id for a project key.
 * @param key - the PostHog project key.
 * @returns true when it does, or when storage cannot be read (there is then no id to share).
 */
function hasStoredId(key: string): boolean {
    try {
        return localStorage.getItem(`ph_${key}_posthog`) !== null;
    } catch {
        return true;
    }
}

/**
 * Starts PostHog in this tab once another tab saves its new id: that tab's Share started this one
 * before its own posthog-js had loaded and saved one, and an id made here would split one reader
 * into two people.
 * @param key - the PostHog project key.
 */
function waitForStoredId(key: string): void {
    if (waitingForId !== undefined) {
        return;
    }
    const idKey = `ph_${key}_posthog`;
    waitingForId = (event) => {
        if (event.key !== idKey || event.newValue === null) {
            return;
        }
        stopWaitingForId();
        startPostHog(false);
    };
    globalThis.addEventListener("storage", waitingForId);
}

/** Stops waiting for another tab's id. */
function stopWaitingForId(): void {
    if (waitingForId !== undefined) {
        globalThis.removeEventListener("storage", waitingForId);
        waitingForId = undefined;
    }
}

/**
 * Starts PostHog: the reader said Share. Loads its code on the first start of the page, and only
 * then; a later start opts the same client in again with a fresh id.
 * @param fresh - true (the default) when the Share was made in this tab, which makes the new id;
 * false when another tab's Share started this one, which takes that tab's id.
 */
export function startPostHog(fresh = true): void {
    const target = postHogTarget(siteConfig());
    if (target === undefined) {
        return;
    }
    const { key, host } = target;
    if (!fresh && !hasStoredId(key)) {
        // Counts stay in the anonymous mode until the id arrives, so a Share tab that closes or
        // fails before saving one loses nothing here; a No stops the wait (stopPostHog).
        waitForStoredId(key);
        return;
    }
    stopWaitingForId();
    wanted = true;
    if (client !== undefined) {
        try {
            // reset() first: in posthog-js 1.445 it also clears the stored consent, so opting in
            // after it holds. reset(true) makes a new device id too: stop deleted the stored one,
            // but posthog-js still holds it in memory, and a plain reset() would keep it and save
            // it again, linking this reader to what was recorded before they said No.
            if (fresh || !adoptStoredId(client)) {
                client.reset(true);
            }
            client.opt_in_capturing();
            // Saved now, not after posthog-js's debounce: usageData.ts stores the answer after this,
            // and the other tabs take the id when they see the answer.
            client.persistence?.flush();
            client.startSessionRecording();
        } catch {
            // Best effort.
        }
        return;
    }
    importing ??= calls.importPostHog();
    importing.then(
        ({ default: posthog }) => {
            if (counting || anonymousStarted) {
                // Created first, so the order both inits run in is always the same (section 5).
                initAnonymous(posthog, target);
            }
            if (!wanted || initialized) {
                return;
            }
            initialized = true;
            posthog.init(key, postHogOptions(host));
            client = posthog;
            if (!fresh) {
                // Started by another tab's Share: that tab's id, whatever this page's posthog-js held.
                adoptStoredId(posthog);
            }
            posthog.opt_in_capturing();
            // Saved now, not after posthog-js's debounce: a tab that another tab's Share started
            // waits for this id (waitForStoredId) rather than make its own.
            posthog.persistence?.flush();
            flushBuffer("shared");
        },
        () => {
            loadFailed(() => {
                if (wanted) {
                    startPostHog(fresh);
                }
            });
        },
    );
}

/**
 * The starts of the keys posthog-js writes: its persistence (`ph_`) and the survey records its
 * capture of "survey sent" or "survey dismissed" writes straight to localStorage, past before_send
 * and whatever the persistence setting (`seenSurvey_`, and its survey code's `inProgressSurvey_`
 * and `lastSeenSurveyDate`).
 */
const POSTHOG_KEY_STARTS = ["ph_", "seenSurvey_", "inProgressSurvey_", "lastSeenSurveyDate"];

/**
 * Removes PostHog's keys from a storage, keeping its opt-out marker (`__ph_opt_in_out_<token>`).
 * @param storage - localStorage or sessionStorage.
 */
function removePostHogKeys(storage: Storage): void {
    for (const key of Object.keys(storage)) {
        if (POSTHOG_KEY_STARTS.some((start) => key.startsWith(start))) {
            storage.removeItem(key);
        }
    }
}

/**
 * Empties the buffer of shared entries on a stop. A page's first count of a name moves to the
 * anonymous mode, which counts every page view anyway, so a No before the shared instance loaded
 * loses no page view (section 3); the rest are dropped. Anonymous entries stay theirs.
 */
function endSharedBuffer(): void {
    for (let index = buffer.length - 1; index >= 0; index--) {
        const entry = buffer[index];
        if (entry.mode !== "shared") {
            continue;
        }
        if (entry.props.first_on_page === true && countsAnonymously(entry.name)) {
            entry.mode = "anonymous";
        } else {
            if (entry.props.first_on_page === true) {
                sentOnPage.delete(entry.name);
            }
            buffer.splice(index, 1);
        }
    }
    flushBuffer("anonymous");
}

/**
 * Stops PostHog: the reader said No, here or in another tab. Never calls `reset()`, which would
 * post a new id to PostHog's flags endpoint past every guard.
 */
export function stopPostHog(): void {
    wanted = false;
    stopWaitingForId();
    endSharedBuffer();
    if (client !== undefined) {
        try {
            client.stopSessionRecording();
        } catch {
            // Best effort.
        }
        try {
            client.opt_out_capturing();
        } catch {
            // Best effort.
        }
    }
    try {
        removePostHogKeys(localStorage);
        removePostHogKeys(sessionStorage);
    } catch {
        // Storage blocked.
    }
    const { seen, use_case: useCase } = readSurveyState();
    if (useCase !== undefined) {
        writeSurveyState({ seen });
    }
}

/**
 * The PostHog client while sharing is on, for the survey card.
 * @returns the client, or undefined whenever sharing is off.
 */
export function postHog(): PostHogClient | undefined {
    return wanted ? client : undefined;
}

/**
 * Marks one mode's instance ready with a stand-in client, touching neither the address bar nor
 * site.json. Every `capture` on it passes through `cleanPostHogEvent` for that mode first, and the
 * stand-in's own `capture` gets what that returns (nothing when it returns null). The anonymous
 * stand-in first adds what posthog-js's cookieless capture adds, so its cleaning sees a real shape.
 * @param standIn - the stand-in; members left out do nothing.
 * @param mode - the mode it stands in for; "shared" (the default) also marks sharing on.
 * @returns a function that removes it again.
 */
export function setPostHogClientForTests(standIn: Partial<PostHogClient>, mode: TrackingMode = "shared"): () => void {
    if (mode === "anonymous") {
        const anonymous: Pick<PostHogClient, "capture"> = {
            capture: (event, properties) => {
                const built = {
                    ...properties,
                    $cookieless_mode: true,
                    distinct_id: "$posthog_cookieless",
                    $raw_user_agent: navigator.userAgent,
                    $host: globalThis.location.host,
                    $timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                };
                const cleaned = cleanPostHogEvent({ uuid: "", event, properties: built }, "anonymous");
                return cleaned === null ? undefined : standIn.capture?.(cleaned.event, cleaned.properties);
            },
        };
        anonymousClient = anonymous;
        flushBuffer("anonymous");
        return () => {
            if (anonymousClient === anonymous) {
                anonymousClient = undefined;
            }
        };
    }
    const noop = (): undefined => undefined;
    const wrapped: PostHogClient = {
        init: noop as unknown as PostHogClient["init"],
        opt_in_capturing: noop,
        opt_out_capturing: noop,
        reset: noop,
        get_distinct_id: () => "",
        startSessionRecording: noop,
        stopSessionRecording: noop,
        getActiveMatchingSurveys: (callback) => {
            callback([]);
        },
        ...standIn,
        capture: (event, properties) => {
            const cleaned = cleanPostHogEvent({ uuid: "", event, properties: { ...properties } });
            return cleaned === null ? undefined : standIn.capture?.(cleaned.event, cleaned.properties);
        },
    };
    wanted = true;
    initialized = true;
    client = wrapped;
    flushBuffer("shared");
    return () => {
        if (client === wrapped) {
            wanted = false;
            initialized = false;
            client = undefined;
        }
    };
}

/** Forgets everything this module holds, as on a fresh page. For tests. */
export function resetAnalyticsForTests(): void {
    bootSearch = undefined;
    channel = undefined;
    counting = false;
    sentOnPage.clear();
    internal = false;
    visit = undefined;
    wanted = false;
    initialized = false;
    client = undefined;
    anonymousClient = undefined;
    anonymousStarted = false;
    importing = undefined;
    // failedImports stays: the page's module map still holds the failed URLs.
    retries.length = 0;
    globalThis.removeEventListener("online", retryFailedLoad);
    stopWaitingForId();
    buffer.length = 0;
    commandAllowlist = new Set();
    listeners.clear();
}
