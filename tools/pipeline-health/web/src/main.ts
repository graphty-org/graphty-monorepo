/**
 * The pipeline health page: hash routing, loading from the health API (or the fixtures), a refresh
 * every 60 s, and the banners for fixture data, stale data and an API that did not answer.
 *
 * Data source: `VITE_HEALTH_API_URL` at build time is the API base (https://...; default the live
 * API). When the URL has `?fixtures` (`?fixtures=gray`, `?fixtures=stale` pick a scenario), the page
 * reads web/fixtures/*.json instead and says so in a FIXTURE DATA banner.
 */
import "./style.css";

import {
    CATEGORY_IDS,
    apiPath,
    type CategoryId,
    type OverviewResponse,
    type PageResponse,
    type SectionResponse,
    type SlowRange,
    type StatusResponse,
    type TestHistoryResponse,
} from "./contract";
import { type Here, nav, overviewView, PAGE_TITLE, pageView, setHere, stateWord, testView } from "./render";
import { clock, esc, fmtDur, fmtTime } from "./text";

const DEFAULT_API = "https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com";
const API = ((import.meta.env.VITE_HEALTH_API_URL as string | undefined) || DEFAULT_API).replace(/\/$/, "");
const search = new URLSearchParams(location.search);
const FIXTURE = search.has("fixtures");
const SCENARIO = search.get("fixtures") ?? "";
/** In fixture mode the clock is the data's time plus this, so the page reads as the mockup does. */
const FIXTURE_OFFSET_MS = (SCENARIO === "stale" ? 20 : 2) * 60_000;
const STALE_MS = 15 * 60_000;
const REFRESH_MS = 60_000;

const FIXTURES = import.meta.glob("../fixtures/**/*.json", { import: "default" }) as Record<
    string,
    () => Promise<unknown>
>;

async function get<T>(path: string, fixture: string): Promise<T> {
    if (FIXTURE) {
        const key = [SCENARIO && `../fixtures/${SCENARIO}/${fixture}.json`, `../fixtures/${fixture}.json`].find(
            (k) => k && FIXTURES[k],
        );
        if (!key) throw new Error(`no fixture for ${fixture}`);
        return (await FIXTURES[key]()) as T;
    }
    const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${path} answered ${res.status}`);
    return (await res.json()) as T;
}

/** Records the data's time; in fixture mode the clock follows it, so ages read as the mockup's. */
function stamp(generated: string): void {
    clock.generated = generated;
    if (FIXTURE) clock.now = () => Date.parse(generated) + FIXTURE_OFFSET_MS;
}

// ---------------------------------------------------------------- routing

function parse(hash: string): Here {
    const [rawPath, qs] = hash.replace(/^#/, "").split("?");
    const q = new URLSearchParams(qs ?? "");
    const segs = (rawPath || "/").split("/").filter(Boolean);
    let here: Omit<Here, "range" | "q">;
    if (segs[0] === "ci" && segs[1] === "runners") here = { page: "runners", section: segs[2] };
    else if (segs[0] === "ci" && segs[1] === "local-runs") here = { page: "local-runs" };
    else if (segs[0] === "flaky" && segs[1] === "test") here = { page: "test" };
    else if ((CATEGORY_IDS as readonly string[]).includes(segs[0] ?? ""))
        here = { page: segs[0] as CategoryId, section: segs[1] };
    else here = { page: "overview" };
    const r = q.get("range") ?? "";
    let range: Here["range"];
    if (here.page === "costs") range = r === "7d" ? "7d" : "28d";
    else if (here.page === "test") range = r === "28d" ? "28d" : "7d";
    else range = r === "6h" || r === "24h" ? r : "1h";
    return { ...here, range, q };
}

// ---------------------------------------------------------------- loading

interface Loaded {
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
        return { status: o, html: overviewView(o), generated: o.generated, title: "Pipeline health" };
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
        return { status, html: testView(hist), generated: hist.generated, title: hist.test ?? hist.file };
    }
    const page = h.page;
    const [status, p] = await Promise.all([
        statusP,
        get<PageResponse>(apiPath({ kind: "page", page, range: h.range }), `${page}.${h.range}`),
    ]);
    stamp(p.generated);
    // The slow sections' own choices fetch their section at that window.
    const swaps: Promise<void>[] = [];
    const swap = (id: string, section: string, range: SlowRange, runKind?: string) => {
        const name = runKind ? `${page}.${section}.${runKind}.${range}` : `${page}.${section}.${range}`;
        swaps.push(
            get<SectionResponse>(
                apiPath({ kind: "section", page: page as PageResponse["page"], section, range, runKind }),
                name,
            ).then((r) => {
                p.sections = p.sections.map((s) => (s.id === id ? r.section : s));
            }),
        );
    };
    if (page === "ci") {
        const range = slowParam(h.q, "shards");
        const kind = h.q.get("kind") === "pr-bins" ? "pr-bins" : null;
        if (range || kind) swap("shards", "shards", range ?? "7d", kind ?? "full");
    }
    if (page === "flaky") {
        const range = slowParam(h.q, "hot");
        if (range) swap("hotspots", "hotspots", range);
    }
    await Promise.all(swaps);
    const cat = status.categories.find((c) => c.id === page);
    return {
        status,
        html: pageView(p),
        generated: p.generated,
        title: `${cat ? `${stateWord(cat.state)} ` : ""}${PAGE_TITLE[page]}`,
    };
}

// ---------------------------------------------------------------- drawing

const app = document.getElementById("app") as HTMLElement;
let last: Loaded | null = null;

function banners(error: string | null): string {
    const out: string[] = [];
    if (FIXTURE) {
        const scenario = SCENARIO ? " (scenario " + esc(SCENARIO) + ")" : "";
        out.push(
            `<div class="banner fixture" role="note"><b>FIXTURE DATA</b> Sample numbers from web/fixtures${scenario}, not the live pipeline. Remove ?fixtures from the URL for live data.</div>`,
        );
    }
    if (error)
        out.push(
            `<div class="banner stale" role="alert"><b>The health API did not answer</b> (${esc(error)}).${last ? ` Showing the data from ${fmtTime(last.generated)} UTC.` : ""}</div>`,
        );
    if (last) {
        const age = clock.now() - Date.parse(last.generated);
        if (age > STALE_MS)
            out.push(
                `<div class="banner stale" role="alert"><b>The data is ${fmtDur(age / 1000)} old.</b> The collector has not updated it since ${fmtTime(last.generated)} UTC, so every state below may be out of date.</div>`,
            );
    }
    return out.join("");
}

function draw(error: string | null, fresh: boolean): void {
    const open = new Set(
        [...app.querySelectorAll<HTMLDetailsElement>("details[data-key]")]
            .filter((d) => d.open)
            .map((d) => d.dataset.key),
    );
    app.innerHTML = `<div class="app">${nav(last?.status ?? null, FIXTURE)}<main>${banners(error)}${last?.html ?? ""}</main></div>`;
    for (const d of app.querySelectorAll<HTMLDetailsElement>("details[data-key]")) {
        if (open.has(d.dataset.key)) d.open = true;
        else if (fresh && d.dataset.key && /^tree\/0(\/0)?$/.test(d.dataset.key)) d.open = true;
        else if (fresh && d.dataset.key?.startsWith("shard-") && d === app.querySelector("details.sd")) d.open = true;
    }
    if (last) document.title = `${last.title} - Pipeline health`;
}

let current: Here = parse(location.hash);
let seq = 0;
let drawn = false;

async function show(navigated: boolean): Promise<void> {
    const mine = ++seq;
    setHere(current);
    try {
        const loaded = await load(current);
        if (mine !== seq) return;
        last = loaded;
        const y = window.scrollY;
        draw(null, navigated || !drawn);
        drawn = true;
        if (navigated) {
            const target = current.section ? document.getElementById(`s-${current.section}`) : null;
            if (target) target.scrollIntoView();
            else window.scrollTo(0, 0);
            (target ?? app.querySelector<HTMLElement>("h1"))?.focus({ preventScroll: true });
        } else window.scrollTo(0, y);
    } catch (e) {
        if (mine !== seq) return;
        draw(e instanceof Error ? e.message : String(e), false);
    }
}

window.addEventListener("hashchange", () => {
    current = parse(location.hash);
    void show(true);
});
setInterval(() => void show(false), REFRESH_MS);
void show(false).then(() => {
    if (current.section) document.getElementById(`s-${current.section}`)?.scrollIntoView();
});
