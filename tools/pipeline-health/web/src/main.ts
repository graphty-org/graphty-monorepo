/**
 * The pipeline health page: hash routing, loading from the health API (or the fixtures), a refresh
 * every 60 s, and the banners for fixture data, stale data and an API that did not answer.
 *
 * Data source: `VITE_HEALTH_API_URL` at build time is the API base (https://...; default the live
 * API). The dev server reads it through its own proxy at DEV_API_PATH (vite.config.ts), so a dev server on
 * any host works without a CORS entry. When the URL has `?fixtures` (`?fixtures=gray`, `?fixtures=stale` pick
 * a scenario), the page reads web/fixtures/*.json instead and says so in a FIXTURE DATA banner.
 *
 * When the API does not answer, the page says the pipeline's state is UNKNOWN, names the request and the
 * error, and shows the last data this browser loaded for the view (kept in localStorage), with its age.
 */
import "./style.css";

import {
    apiPath,
    CATEGORY_IDS,
    type CategoryId,
    DEV_API_PATH,
    LIVE_API,
    type OverviewResponse,
    type PageResponse,
    type SectionResponse,
    type SlowRange,
    type StatusResponse,
    type TestHistoryResponse,
} from "./contract";
import { type Here, nav, overviewView, PAGE_TITLE, pageView, setHere, stateWord, testView } from "./render";
import { clock, esc, fmtDur, fmtTime } from "./text";

const API = import.meta.env.DEV
    ? DEV_API_PATH
    : ((import.meta.env.VITE_HEALTH_API_URL as string | undefined) || LIVE_API).replace(/\/$/, "");
/** The API's base URL as the page requests it, and as the error panel describes it. */
const API_URL = import.meta.env.DEV ? `${location.origin}${DEV_API_PATH}` : API;
const API_SHOWN = import.meta.env.DEV ? `${API_URL} (the dev server's proxy to the API)` : API;
/** What to check when the page cannot reach the API. */
const RUNBOOK =
    "https://github.com/graphty-org/graphty-monorepo/blob/master/tools/pipeline-health/README.md#when-the-page-cannot-reach-the-api";
const search = new URLSearchParams(location.search);
/**
 * The bundled fixtures exist only in the dev server and in a build made with VITE_HEALTH_FIXTURES=1, so the
 * published page emits no fixture chunks and ignores `?fixtures`.
 */
const FIXTURES_BUILT = import.meta.env.DEV || import.meta.env.VITE_HEALTH_FIXTURES === "1";
const FIXTURE = FIXTURES_BUILT && search.has("fixtures");
const SCENARIO = search.get("fixtures") ?? "";
/** In fixture mode the clock is the data's time plus this, so the page reads as the mockup does. */
const FIXTURE_OFFSET_MS = (SCENARIO === "stale" ? 20 : 2) * 60_000;
const STALE_MS = 15 * 60_000;
const REFRESH_MS = 60_000;

const FIXTURES = (FIXTURES_BUILT ? import.meta.glob("../fixtures/**/*.json", { import: "default" }) : {}) as Record<
    string,
    () => Promise<unknown>
>;

async function get<T>(path: string, fixture: string): Promise<T> {
    if (FIXTURE) {
        const key = [SCENARIO && `../fixtures/${SCENARIO}/${fixture}.json`, `../fixtures/${fixture}.json`].find(
            (k) => k && FIXTURES[k],
        );
        if (!key) {
            throw new Error(`no fixture for ${fixture}`);
        }
        return (await FIXTURES[key]()) as T;
    }
    let res: Response;
    try {
        res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
    } catch (e) {
        throw new ApiError(path, e instanceof Error ? e.message : String(e), true);
    }
    if (!res.ok) {
        throw new ApiError(path, `answered HTTP ${res.status}`, false);
    }
    return (await res.json()) as T;
}

/** A request to the API that failed: which one, why, and whether no answer came back at all. */
class ApiError extends Error {
    constructor(
        readonly path: string,
        readonly why: string,
        readonly network: boolean,
    ) {
        super(`${path}: ${why}`);
    }
}

/**
 * Records the data's time; in fixture mode the clock follows it, so ages read as the mockup's.
 * @param generated - The data's generated time, an ISO string.
 */
function stamp(generated: string): void {
    clock.generated = generated;
    if (FIXTURE) {
        clock.now = () => Date.parse(generated) + FIXTURE_OFFSET_MS;
    }
}

// ---------------------------------------------------------------- routing

function pageOf(segs: string[]): Omit<Here, "range" | "q"> {
    if (segs[0] === "ci" && segs[1] === "runners") {
        return { page: "runners", section: segs[2] };
    }
    if (segs[0] === "ci" && segs[1] === "local-runs") {
        return { page: "local-runs" };
    }
    if (segs[0] === "flaky" && segs[1] === "test") {
        return { page: "test" };
    }
    if ((CATEGORY_IDS as readonly string[]).includes(segs[0] ?? "")) {
        return { page: segs[0] as CategoryId, section: segs[1] };
    }
    return { page: "overview" };
}

function rangeOf(page: Here["page"], r: string): Here["range"] {
    if (page === "costs") {
        return r === "7d" ? "7d" : "28d";
    }
    if (page === "test") {
        return r === "28d" ? "28d" : "7d";
    }
    return r === "6h" || r === "24h" ? r : "1h";
}

function parse(hash: string): Here {
    const [rawPath, qs] = hash.replace(/^#/, "").split("?");
    const q = new URLSearchParams(qs ?? "");
    const here = pageOf((rawPath || "/").split("/").filter(Boolean));
    return { ...here, range: rangeOf(here.page, q.get("range") ?? ""), q };
}

// ---------------------------------------------------------------- loading

interface Loaded {
    /** The view's route (location.hash), so data is never drawn under another view. */
    key: string;
    status: StatusResponse;
    html: string;
    generated: string;
    title: string;
}

const slowParam = (q: URLSearchParams, key: string): SlowRange | null => {
    const v = q.get(key);
    return v === "7d" || v === "28d" ? v : null;
};

async function load(h: Here): Promise<Loaded> {
    if (h.page === "overview") {
        const o = await get<OverviewResponse>(
            apiPath({ kind: "page", page: "overview", range: h.range }),
            `overview.${h.range}`,
        );
        stamp(o.generated);
        return { key: "", status: o, html: overviewView(o), generated: o.generated, title: "Pipeline health" };
    }
    const statusP = get<StatusResponse>(apiPath({ kind: "status" }), "status");
    if (h.page === "test") {
        const file = h.q.get("file") ?? "";
        const test = h.q.get("test") ?? undefined;
        const range = h.range as SlowRange;
        const [status, hist] = await Promise.all([
            statusP,
            get<TestHistoryResponse>(apiPath({ kind: "test-history", file, test, range }), "test-history"),
        ]);
        stamp(hist.generated);
        return { key: "", status, html: testView(hist), generated: hist.generated, title: hist.test ?? hist.file };
    }
    const { page } = h;
    const [status, p] = await Promise.all([
        statusP,
        get<PageResponse>(apiPath({ kind: "page", page, range: h.range }), `${page}.${h.range}`),
    ]);
    stamp(p.generated);
    // The slow sections' own choices fetch their section at that window.
    const swaps: Promise<void>[] = [];
    const swap = (id: string, section: string, range: SlowRange, runKind?: string): void => {
        const name = runKind ? `${page}.${section}.${runKind}.${range}` : `${page}.${section}.${range}`;
        swaps.push(
            get<SectionResponse>(apiPath({ kind: "section", page: page, section, range, runKind }), name).then((r) => {
                p.sections = p.sections.map((s) => (s.id === id ? r.section : s));
            }),
        );
    };
    if (page === "ci") {
        const range = slowParam(h.q, "shards");
        const kind = h.q.get("kind") === "pr-bins" ? "pr-bins" : null;
        if (range || kind) {
            swap("shards", "shards", range ?? "7d", kind ?? "full");
        }
    }
    if (page === "flaky") {
        const range = slowParam(h.q, "hot");
        if (range) {
            swap("hotspots", "hotspots", range);
        }
    }
    await Promise.all(swaps);
    // The status and the page are two cached responses that can be a cycle apart: the current page's nav bar
    // and the title take the page's own state, so they never disagree with the body under them.
    const own = { ...status, categories: status.categories.map((c) => (c.id === page ? { ...c, state: p.state } : c)) };
    const cat = own.categories.find((c) => c.id === page);
    return {
        key: "",
        status: own,
        html: pageView(p),
        generated: p.generated,
        title: `${cat ? `${stateWord(cat.state)} ` : ""}${PAGE_TITLE[page]}`,
    };
}

// ---------------------------------------------------------------- drawing

const app = document.getElementById("app") as HTMLElement;
let last: Loaded | null = null;
/** When this browser last loaded a view from the API, this session. */
let lastOk: number | null = null;

const CACHE_PREFIX = "health:last:";
/**
 * Storage can be missing or refuse (private windows, full quota): the page works without it.
 * @param l - The loaded view to remember under its key.
 */
function cacheWrite(l: Loaded): void {
    if (FIXTURE) {
        return;
    }
    try {
        localStorage.setItem(CACHE_PREFIX + l.key, JSON.stringify(l));
    } catch {
        // ponytail: no cache this time; the next good load tries again.
    }
}
function cacheRead(key: string): Loaded | null {
    if (FIXTURE) {
        return null;
    }
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        return raw ? (JSON.parse(raw) as Loaded) : null;
    } catch {
        return null;
    }
}

/** A failed load: the error, and what the status route said when asked on its own. */
interface Failure {
    error: ApiError | Error;
    status: string;
}

function errorWhy(e: Error): string {
    return e instanceof ApiError ? e.why : e.message;
}

function failureBanner(f: Failure): string {
    const e = f.error;
    const req = e instanceof ApiError ? `GET ${esc(API_URL)}${esc(e.path)}` : "loading the view";
    const why =
        e instanceof ApiError && e.network
            ? ` failed with no answer (${esc(e.why)}). A browser reports a request blocked by CORS (this page's origin, ${esc(location.origin)}, is not one the API allows) the same way as a network failure or an API that is down.`
            : ` failed: ${esc(errorWhy(e))}.`;
    const shown = last
        ? ` Below is the data from ${fmtTime(last.generated)} UTC (${fmtDur((clock.now() - Date.parse(last.generated)) / 1000)} old) that this browser loaded last; every state in it may be out of date.`
        : "";
    return (
        `<div class="banner stale" role="alert"><b>Cannot reach the health API.</b> ${req}${why}${shown} ` +
        `<button type="button" class="retry" data-retry>Retry</button> <a href="${RUNBOOK}">What to check</a></div>`
    );
}

/**
 * With no data at all: the pipeline's state is unknown, and the facts to find out why.
 * @param f - The failure that left the page with no data.
 * @returns The panel's HTML.
 */
function unknownPanel(f: Failure): string {
    const e = f.error;
    const row = (k: string, v: string): string => `<dt>${k}</dt><dd>${v}</dd>`;
    return (
        `<header class="ph"><div class="phrow"><h1 tabindex="-1">Pipeline status: UNKNOWN</h1></div></header>` +
        `<p class="pstate"><span class="sw none">UNKNOWN</span><span>This page cannot reach its data, so it says nothing about the pipeline: the pipeline may be healthy or not. The facts below say where the request failed.</span></p>` +
        `<dl class="diag">${row("page origin", esc(location.origin))}${row("health API", esc(API_SHOWN))}${row(
            "failed request",
            e instanceof ApiError ? esc(e.path) : "--",
        )}${row("error", esc(e instanceof ApiError ? e.why : e.message))}${row(
            "/v1/status on its own",
            esc(f.status),
        )}${row(
            "last good load in this browser",
            lastOk
                ? `${fmtTime(new Date(lastOk).toISOString())} UTC`
                : "none this session, and none stored for this view",
        )}</dl>`
    );
}

function banners(failure: Failure | null): string {
    const out: string[] = [];
    if (FIXTURE) {
        const scenario = SCENARIO ? ` (scenario ${esc(SCENARIO)})` : "";
        out.push(
            `<div class="banner fixture" role="note"><b>FIXTURE DATA</b> Sample numbers from web/fixtures${scenario}, not the live pipeline. Remove ?fixtures from the URL for live data.</div>`,
        );
    }
    if (failure) {
        out.push(failureBanner(failure));
    }
    if (last && !failure) {
        const age = clock.now() - Date.parse(last.generated);
        if (age > STALE_MS) {
            out.push(
                `<div class="banner stale" role="alert"><b>The data is ${fmtDur(age / 1000)} old.</b> The collector has not updated it since ${fmtTime(last.generated)} UTC, so every state below may be out of date.</div>`,
            );
        }
    }
    return out.join("");
}

function draw(failure: Failure | null, fresh: boolean): void {
    const open = new Set(
        [...app.querySelectorAll<HTMLDetailsElement>("details[data-key]")]
            .filter((d) => d.open)
            .map((d) => d.dataset.key),
    );
    const body = last?.html ?? (failure ? unknownPanel(failure) : "");
    app.innerHTML = `<div class="app">${nav(last?.status ?? null, FIXTURE)}<main>${banners(failure)}${body}</main></div>`;
    for (const d of app.querySelectorAll<HTMLDetailsElement>("details[data-key]")) {
        const firstTree = !!d.dataset.key && /^tree\/0(\/0)?$/.test(d.dataset.key);
        const firstShard = !!d.dataset.key?.startsWith("shard-") && d === app.querySelector("details.sd");
        if (open.has(d.dataset.key) || (fresh && (firstTree || firstShard))) {
            d.open = true;
        }
    }
    if (last) {
        document.title = `${last.title} - Pipeline health`;
    }
}

/**
 * Scrolls to the section a link named and marks its heading, so a section near the bottom of a short page, which
 * cannot scroll to the top, is still found.
 * @param target - The section heading to scroll to and mark.
 */
function mark(target: HTMLElement): void {
    target.scrollIntoView();
    target.classList.add("hit");
}

let current: Here = parse(location.hash);
let seq = 0;
let drawn = false;

/** After a navigation: scroll to and focus the section the route names, else the top and the page heading. */
function focusRoute(): void {
    const target = current.section ? document.getElementById(`s-${current.section}`) : null;
    if (target) {
        mark(target);
    } else {
        window.scrollTo(0, 0);
    }
    (target ?? app.querySelector<HTMLElement>("h1"))?.focus({ preventScroll: true });
}

/**
 * Whether the status route answers, asked on its own, so the reader can tell "nothing answers" from "this view
 * fails".
 * @param error - the error the view's load failed with
 * @returns "answered", or "failed: " and why
 */
async function statusAnswer(error: Error): Promise<string> {
    if (error instanceof ApiError && error.path === apiPath({ kind: "status" })) {
        return `failed: ${error.why}`;
    }
    return get<StatusResponse>(apiPath({ kind: "status" }), "status").then(
        () => "answered",
        (s: unknown) => `failed: ${s instanceof ApiError ? s.why : String(s)}`,
    );
}

async function show(navigated: boolean): Promise<void> {
    const mine = ++seq;
    setHere(current);
    try {
        const loaded = { ...(await load(current)), key: location.hash };
        if (mine !== seq) {
            return;
        }
        last = loaded;
        lastOk = Date.now();
        cacheWrite(loaded);
        const y = window.scrollY;
        draw(null, navigated || !drawn);
        drawn = true;
        if (navigated) {
            focusRoute();
        } else {
            window.scrollTo(0, y);
        }
    } catch (e) {
        if (mine !== seq) {
            return;
        }
        const error = e instanceof Error ? e : new Error(String(e));
        const status = await statusAnswer(error);
        if (mine !== seq) {
            return;
        }
        // Data from another view is never drawn under this one; this view's stored copy is, with its age.
        if (last?.key !== location.hash) {
            last = cacheRead(location.hash);
        }
        draw({ error, status }, false);
    }
}

app.addEventListener("click", (ev) => {
    if ((ev.target as HTMLElement).closest("[data-retry]")) {
        void show(false);
    }
});

window.addEventListener("hashchange", () => {
    current = parse(location.hash);
    void show(true);
});
setInterval(() => void show(false), REFRESH_MS);
void show(false).then(() => {
    const target = current.section ? document.getElementById(`s-${current.section}`) : null;
    if (target) {
        mark(target);
    }
});
