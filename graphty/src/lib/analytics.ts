/**
 * Usage analytics (design/graphty/usage-analytics.md): anonymous counts to Umami for every visitor,
 * and PostHog for readers who said Share usage data.
 *
 * Nothing here may carry the reader's data. Every property value comes from an allowlist (catalog
 * ids, command ids, the app's own ids, fixed enums or buckets), every URL is cut by `cleanUrl`, and
 * PostHog's code is fetched only after Share.
 *
 * main.tsx imports this module, so it is part of the landing page: it imports only types and
 * modules already there. What only the workspace knows (the registered command ids, the element's
 * catalogs) reaches it at runtime, through `setCommandAllowlist` and the callers' own checks.
 */

import type { SourceLoaded } from "@graphty/graphty-element/session";
import type { CaptureResult, PostHog, PostHogConfig } from "posthog-js";

import { type SiteConfig, siteConfig } from "../siteConfig";
import { startUsageDataIfShared } from "../workspace/privacy/usageData";
import { sentryConfigured } from "./sentry";

/** A property value that may be sent: always an allowlisted id, enum or bucket. */
type Value = string | number | boolean;
/** An event's properties. */
export type UsageProps = Readonly<Record<string, Value | undefined>>;

/** The `ref` and `utm_*` values kept; any other non-empty value is sent as "other". Extend by editing. */
export const KNOWN_CHANNELS: readonly string[] = [
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
];
const CHANNEL_PARAMS = ["ref", "utm_source", "utm_medium", "utm_campaign"] as const;

/** The PostHog survey names the app looks for (the owner names the surveys exactly these). */
export const SURVEY_NAMES = { useCase: "use_case", exportEase: "export_ease" } as const;

/** Where shown survey ids and the answered use case are kept: `{ seen: string[], use_case?: string }`. */
export const SURVEYS_KEY = "graphty.surveys.v1";
const VISITS_KEY = "graphty.visits.v1";

/** Each own event's allowed property keys (section 4). An unknown name is never sent. */
const EVENT_KEYS: Readonly<Record<string, readonly string[]>> = {
    first_visit: [],
    return_visit: ["days"],
    usage_data_shared: [],
    sample_loaded: ["sample"],
    own_file_opened: ["format", "via"],
    layout_changed: ["layout", "outcome"],
    algorithm_run: ["algorithm", "outcome", "code"],
    export_done: ["kind", "format", "destination"],
    command_run: ["command"],
    command_failed: ["command", "code"],
    graph_action: ["kind", "op", "action", "suggested"],
    canvas_selected: ["target", "count", "via"],
    camera_used: ["kind"],
    nodes_dragged: [],
    source_expanded: ["outcome"],
    panel_opened: ["panel"],
    project_reopened: [],
    load_failed: ["code", "task"],
};
/** The names Umami counts (section 4.1); every other own name is PostHog's only. */
const UMAMI_NAMES: ReadonlySet<string> = new Set([
    "first_visit",
    "return_visit",
    "usage_data_shared",
    "sample_loaded",
    "own_file_opened",
    "layout_changed",
    "algorithm_run",
    "export_done",
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
]);

/** Journal ops sent as `graph_action` (section 4.2); `data.*` and `set.*` by prefix. A new op is excluded until listed. */
const GRAPH_ACTION_OPS: ReadonlySet<string> = new Set([
    "style.encode",
    "styles.encode",
    "style.patch",
    "style.template",
    "shader.set",
    "view.dimension",
    "view.immersive",
    "view.save",
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
]);

/**
 * Whether a journal op is sent as `graph_action`.
 * @param op - the entry's `command.op`.
 * @returns true when it is on the op allowlist.
 */
export function isGraphActionOp(op: string): boolean {
    return GRAPH_ACTION_OPS.has(op) || op.startsWith("data.") || op.startsWith("set.");
}

/** The panel ids `panel_opened` may send: the store's dialog ids, places and pages. */
const PANEL_IDS: ReadonlySet<string> = new Set([
    // dialogs
    "about",
    "analyze",
    "custom-model",
    "export",
    "generators",
    "layout",
    "path",
    "quick-actions",
    "report",
    "samples",
    "score",
    "settings",
    "shader-editor",
    "shortcuts",
    "view",
    // places
    "graph",
    "data",
    "assistant",
    "notes",
    // pages
    "panels",
    "data-page",
]);

/**
 * The id `panel_opened` sends for a dialog id, place or page.
 * @param id - the store's value.
 * @returns the id, "settings" for any `settings:<tab>`, else "other".
 */
export function panelId(id: string): string {
    const base = id.startsWith("settings:") ? "settings" : id;
    return PANEL_IDS.has(base) ? base : "other";
}

/** Control ids for clickable controls that run no registered command (decision 15). */
export const FIXED_CONTROL_IDS: ReadonlySet<string> = new Set([
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
 * @returns the event name and properties, or null for a reload (`callerKey: "reopen"`).
 */
export function sourceLoadedEvent(
    loaded: SourceLoaded,
    known: LoadAllowlists,
): { name: "sample_loaded" | "own_file_opened"; props: UsageProps } | null {
    if (loaded.callerKey === "reopen") {
        return null;
    }
    if (loaded.kind === "sample" || loaded.sample !== undefined) {
        let sample = "other";
        const { sample: ids, callerKey } = loaded;
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
    return { name: "own_file_opened", props: { format, via: loaded.kind } };
}

/** The site each name serves on: Umami counts only there. */
const SITE_HOSTS: Readonly<Record<string, string>> = {
    production: "graphty.app",
    nightly: "nightly.graphty.app",
    canary: "canary.graphty.app",
};
const UMAMI_URL = "https://gateway.umami.is/api/send";

/** What one Umami request carries (section 5). */
export interface UmamiBody {
    readonly type: "event";
    readonly payload: {
        readonly website: string;
        readonly hostname: string;
        readonly title: "graphty";
        readonly url: string;
        readonly referrer: string;
        readonly name?: string;
        readonly data?: Record<string, Value>;
    };
}

/** The module's edges to the network and the page, replaceable by tests (no `vi.mock`, issue #3416). */
export interface AnalyticsCalls {
    /** Sends one Umami request. */
    send(body: UmamiBody): Promise<unknown> | undefined;
    /** Loads PostHog's code. */
    importPostHog(): Promise<{ default: PostHog }>;
    /** The page's host name. */
    hostname(): string;
    /** Do Not Track and Global Privacy Control. */
    privacySignals(): { dnt: boolean; gpc: boolean };
    /** Tests only: PostHog's ingest host, with compression off so bodies are plain JSON. */
    posthogHost?: string;
}

const defaultCalls: AnalyticsCalls = {
    send: sendToUmami,
    importPostHog: () => import("posthog-js/full/no-external"),
    hostname: () => globalThis.location.hostname,
    privacySignals: () => {
        const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
        return { dnt: nav.doNotTrack === "1", gpc: nav.globalPrivacyControl === true };
    },
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
    | "startSessionRecording"
    | "stopSessionRecording"
    | "getActiveMatchingSurveys"
>;

// Module state, all reset by resetAnalyticsForTests.
let bootSearch: string | undefined;
let channel: { path: string; params: Record<string, string> } | undefined;
/** The Umami website id while counting is on for this page, else null. */
let umamiWebsite: string | null = null;
let umamiDisabled = false;
const umamiSent = new Set<string>();
/** The `visit` super property: "first" or the return bucket; absent under DNT or GPC. */
let visit: string | undefined;
let wanted = false;
let initialized = false;
let client: PostHogClient | undefined;
let importing: Promise<{ default: PostHog }> | undefined;
const buffer: [string, Record<string, Value>][] = [];
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
    return KNOWN_CHANNELS.includes(lower) ? lower : "other";
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

/**
 * Cuts a URL to what may be sent: a same-origin URL to its path plus the cleaned channel
 * parameters, any other web URL to its origin, any other scheme to the scheme alone.
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
        return url.origin;
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

/** Removes the four channel parameters from the address bar, keeping the path, the hash and every other parameter. */
function removeChannelFromAddress(): void {
    const url = new URL(globalThis.location.href);
    if (CHANNEL_PARAMS.some((name) => url.searchParams.has(name))) {
        snapshotBootQuery();
        for (const name of CHANNEL_PARAMS) {
            url.searchParams.delete(name);
        }
        globalThis.history.replaceState(globalThis.history.state, "", url.pathname + url.search + url.hash);
    }
}

/**
 * The default Umami sender: Umami's documented collection endpoint, with the headers its own
 * tracker sends and no `x-umami-cache`. Of the reply only `disabled` is read; the cache token and
 * the session and visit ids it returns are never kept.
 * @param body - the request body.
 * @returns settles once sent; never rejects.
 */
async function sendToUmami(body: UmamiBody): Promise<void> {
    try {
        const response = await fetch(UMAMI_URL, {
            method: "POST",
            keepalive: true,
            credentials: "omit",
            headers: {
                "Content-Type": "application/json",
                "x-umami-website-id": body.payload.website,
                "x-umami-hostname": body.payload.hostname,
            },
            body: JSON.stringify(body),
        });
        const reply: unknown = await response.json();
        if (typeof reply === "object" && reply !== null && (reply as { disabled?: unknown }).disabled === true) {
            umamiDisabled = true;
        }
    } catch {
        // Nothing retries and nothing queues.
    }
}

/**
 * Sends one Umami request, swallowing every failure.
 * @param name - the event name, or undefined for the page view.
 * @param data - the allowlisted properties.
 */
function sendUmami(name: string | undefined, data?: Record<string, Value>): void {
    if (umamiWebsite === null || umamiDisabled) {
        return;
    }
    const body: UmamiBody = {
        type: "event",
        payload: {
            website: umamiWebsite,
            hostname: calls.hostname(),
            title: "graphty",
            url: bootUrl(),
            referrer: originOf(document.referrer),
            ...(name === undefined ? {} : { name }),
            ...(data === undefined || Object.keys(data).length === 0 ? {} : { data }),
        },
    };
    try {
        void Promise.resolve(calls.send(body)).catch(() => undefined);
    } catch {
        // A synchronous failure is swallowed too.
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
 * The `return_visit` bucket for a first visit and today.
 * @param first - the first visit's local date.
 * @param today - today's local date.
 * @returns the bucket, null on the same day, or "reset" for a record older than 395 days (or unreadable).
 */
export function visitBucket(first: string, today: string): "1" | "2-7" | "8-30" | "30+" | "reset" | null {
    const days = daysBetween(first, today);
    if (!Number.isFinite(days) || days < 0 || days > 395) {
        return "reset";
    }
    if (days === 0) {
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
function countVisit(): void {
    const today = localDate();
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
        const bucket = record === null ? "reset" : visitBucket(record.first, today);
        if (record === null || bucket === "reset") {
            localStorage.setItem(VISITS_KEY, JSON.stringify({ first: today, last: today }));
            visit = "first";
            count("first_visit");
            return;
        }
        visit = bucket ?? "first";
        if (record.last !== today && bucket !== null) {
            localStorage.setItem(VISITS_KEY, JSON.stringify({ first: record.first, last: today }));
            count("return_visit", { days: bucket });
        }
    } catch {
        // Storage blocked: the page view only.
    }
}

/**
 * Starts Umami's counts for this page view: the page view, then the visit event, then removes the
 * channel parameters from the address bar. Sends nothing without a website id or off the site's own host.
 * @param config - the site's configuration.
 */
export function startPageCounts(config: SiteConfig): void {
    const website = config.analytics?.umamiWebsiteId;
    if (website !== undefined && calls.hostname() === SITE_HOSTS[config.site]) {
        umamiWebsite = website;
        sendUmami(undefined);
        const { dnt, gpc } = calls.privacySignals();
        if (!dnt && !gpc) {
            countVisit();
        }
    }
    removeChannelFromAddress();
}

/**
 * Everything analytics does at boot (section 3), in order.
 * @param config - the site's configuration.
 */
export function startAnalyticsAtBoot(config: SiteConfig): void {
    readChannel();
    startUsageDataIfShared();
    startPageCounts(config);
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
 * Hands an event to PostHog, or keeps it while PostHog loads.
 * @param name - the event name.
 * @param props - the allowlisted properties.
 */
function toPostHog(name: string, props: Record<string, Value>): void {
    if (!wanted) {
        return;
    }
    if (client === undefined) {
        if (buffer.length < BUFFER_MAX) {
            buffer.push([name, props]);
        }
        return;
    }
    try {
        client.capture(name, props);
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
 * Counts an event of section 4.1: to Umami at most once per name per page view, and to PostHog
 * every time while sharing is on.
 * @param name - the event name.
 * @param props - its properties; keys not on the event's allowlist are dropped.
 */
export function count(name: string, props: UsageProps = {}): void {
    const clean = allowedProps(name, props);
    if (clean === null) {
        return;
    }
    if (UMAMI_NAMES.has(name) && !umamiSent.has(name) && umamiWebsite !== null) {
        umamiSent.add(name);
        sendUmami(name, clean);
    }
    toPostHog(name, clean);
    notify(name, clean);
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
    toPostHog(name, clean);
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

/**
 * The attributes Sentry's error replay masks. Sentry takes a list of names, so this is the one
 * denylist: the attributes that can carry reader text, and each `data-*` attribute the app fills
 * with a value from the reader's data.
 */
export const SENTRY_MASKED_ATTRIBUTES: readonly string[] = [
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
 * The super properties merged into every PostHog event (section 4.2).
 * @returns them.
 */
function superProperties(): Record<string, Value> {
    const params = channel?.params ?? {};
    const useCase = readSurveyState().use_case;
    return {
        site: siteConfig().site,
        ...(params.ref === undefined ? {} : { channel_ref: params.ref }),
        ...(params.utm_source === undefined ? {} : { utm_source: params.utm_source }),
        ...(params.utm_medium === undefined ? {} : { utm_medium: params.utm_medium }),
        ...(params.utm_campaign === undefined ? {} : { utm_campaign: params.utm_campaign }),
        ...(visit === undefined ? {} : { visit }),
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
 * PostHog's `before_send` (section 6): drops what may not be sent and cuts what may.
 * @param event - the event PostHog is about to send.
 * @returns the event to send, or null to drop it.
 */
export function cleanPostHogEvent(event: CaptureResult | null): CaptureResult | null {
    if (!wanted || event === null) {
        return null;
    }
    const name = event.event;
    const ownKeys = EVENT_KEYS[name];
    if (ownKeys === undefined && !DOLLAR_EVENTS.has(name)) {
        return null;
    }
    const raw = (event.properties ?? {}) as Record<string, unknown>;
    if (CLICK_EVENTS.has(name) && onCanvas(raw)) {
        return null;
    }
    const merged: Record<string, unknown> = { ...raw, ...superProperties() };
    delete merged.$set;
    delete merged.$set_once;
    delete merged.title;
    delete merged.$title;
    // A recording is left whole: walking every batch costs CPU on each flush, and cutting its
    // stylesheet and font URLs breaks replay styling. The address-bar strip protects its URLs.
    const cleaned = name === "$snapshot" ? merged : cleanUrls(raw, merged);
    const { $set: _set, $set_once: _setOnce, ...rest } = event;
    return { ...rest, properties: allowedKeys(name, ownKeys ?? [], cleaned) };
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
            maskCapturedNetworkRequestFn: (request) => ({ ...request, name: cleanUrl(request.name) }),
            ...(plain ? { compress_events: false } : {}),
        },
        disable_surveys: false,
        before_send: cleanPostHogEvent,
        ...(plain ? { disable_compression: true } : {}),
    };
}

/** Sends the events kept while PostHog loaded. */
function flushBuffer(): void {
    for (const [name, props] of buffer.splice(0)) {
        toPostHog(name, props);
    }
}

/**
 * Starts PostHog: the reader said Share. Loads its code on the first start of the page, and only
 * then; a later start opts the same client in again with a fresh id.
 */
export function startPostHog(): void {
    const { analytics } = siteConfig();
    const key = analytics?.posthogKey;
    const host = calls.posthogHost ?? analytics?.posthogHost;
    if (key === undefined || host === undefined) {
        return;
    }
    wanted = true;
    if (client !== undefined) {
        try {
            // reset() first: in posthog-js 1.445 it also clears the stored consent, so opting in
            // after it holds. The id deleted at stop never returns.
            client.reset();
            client.opt_in_capturing();
            client.startSessionRecording();
        } catch {
            // Best effort.
        }
        return;
    }
    importing ??= calls.importPostHog();
    importing.then(
        ({ default: posthog }) => {
            if (!wanted || initialized) {
                return;
            }
            initialized = true;
            posthog.init(key, postHogOptions(host));
            client = posthog;
            posthog.opt_in_capturing();
            flushBuffer();
        },
        () => {
            // The chunk failed to load; a later start tries again.
            importing = undefined;
        },
    );
}

/**
 * Removes PostHog's keys from a storage, keeping its opt-out marker (`__ph_opt_in_out_<token>`).
 * @param storage - localStorage or sessionStorage.
 */
function removePostHogKeys(storage: Storage): void {
    for (const key of Object.keys(storage)) {
        if (key.startsWith("ph_")) {
            storage.removeItem(key);
        }
    }
}

/**
 * Stops PostHog: the reader said No, here or in another tab. Never calls `reset()`, which would
 * post a new id to PostHog's flags endpoint past every guard.
 */
export function stopPostHog(): void {
    wanted = false;
    buffer.length = 0;
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
 * Marks PostHog on with a stand-in client, touching neither the address bar nor site.json. Every
 * `capture` on it passes through `cleanPostHogEvent` first, and the stand-in's own `capture` gets
 * what that returns (nothing when it returns null).
 * @param standIn - the stand-in; members left out do nothing.
 * @returns a function that turns PostHog off again.
 */
export function setPostHogClientForTests(standIn: Partial<PostHogClient>): () => void {
    const noop = (): undefined => undefined;
    const wrapped: PostHogClient = {
        init: noop as unknown as PostHogClient["init"],
        opt_in_capturing: noop,
        opt_out_capturing: noop,
        reset: noop,
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
    umamiWebsite = null;
    umamiDisabled = false;
    umamiSent.clear();
    visit = undefined;
    wanted = false;
    initialized = false;
    client = undefined;
    importing = undefined;
    buffer.length = 0;
    commandAllowlist = new Set();
    listeners.clear();
}
