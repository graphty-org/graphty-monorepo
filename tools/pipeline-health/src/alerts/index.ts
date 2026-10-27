// Pushover alerts (design/ci/health-dashboard.md, section 13): one notification when an episode turns red and one
// when it ends. Master alerts at once; any other category only after its member has been FAILING for 30 minutes.
// One mark per member (ALERT#<member>, sk "episode") holds its episode: it starts at the first red and ends only
// when the member is judged OK again, so a gap of NO DATA or a stale source in between neither ends it nor starts
// another. A member alerts "open" at most once per REALERT_MS, even across episodes: an open inside that floor waits
// until the floor has passed, and an episode that ends before its open was sent never sends "clear". Each send is claimed with a conditional write first, so a retried or
// overlapping collector run never sends twice; a failed send releases the claim and the next run retries.

import { DAY, HOUR, MIN } from "../model/items.js";
import type { Item, Key, Store } from "../model/store.js";
import type { Threshold } from "../sla/config.js";
import type { Episode, Evaluation, MemberStatus } from "../sla/engine.js";

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
export const PAGE_URL = "https://health.graphty.app/#/";
export const SECRETS = { token: "/graphty-health/pushover/app-token", user: "/graphty-health/pushover/user-key" };
/** How long a non-Master member must stay FAILING before it alerts. */
export const RED_FOR_MS = 30 * MIN;
/** At most one "open" alert per member in this span, even when an episode truly ends and another starts. */
export const REALERT_MS = 6 * HOUR;
/** A claim older than this was a run that died mid-send: another run may take it. */
const LEASE_MS = 5 * MIN;
const TTL_S = (8 * DAY) / 1000;
/** A claim field holding this was sent; later than any claim time, so the claim condition fails on it. */
const SENT = 8.64e15;

export interface AlertsInput {
    evaluation: Evaluation;
    store: Store;
    now: number;
    /** An SSM SecureString by name; undefined when the parameter does not exist. */
    getSecret: (name: string) => Promise<string | undefined>;
    fetch: typeof globalThis.fetch;
    log?: (line: string) => void;
}

export interface AlertsResult {
    state: "ok" | "not set up" | "error";
    sent: { member: string; kind: "open" | "clear" }[];
    /** Sends Pushover refused or that failed in transit; retried on the next run. */
    failed: number;
    error?: string;
}

interface Ctx extends AlertsInput {
    token: string;
    user: string;
    result: AlertsResult;
}

/**
 * Sends the alerts the evaluation's episodes are due. Never throws: the collector's run must not fail on an alert.
 * @param input - the evaluation, the table, the time and the injected SSM getter and fetch
 * @returns what was sent, or why nothing could be
 */
export async function sendAlerts(input: AlertsInput): Promise<AlertsResult> {
    const result: AlertsResult = { state: "ok", sent: [], failed: 0 };
    try {
        const [token, user] = await Promise.all([input.getSecret(SECRETS.token), input.getSecret(SECRETS.user)]);
        if (!token || !user) {
            return { ...result, state: "not set up" };
        }
        const ctx: Ctx = { ...input, token, user, result };
        for (const m of input.evaluation.members) {
            await member(ctx, m);
        }
        return result;
    } catch (err) {
        return { ...result, state: "error", error: String((err as Error)?.message ?? err) };
    }
}

const BAD = (m: MemberStatus) => m.state === "WARNING" || m.state === "FAILING";

async function member(ctx: Ctx, m: MemberStatus): Promise<void> {
    // Any other state (NO DATA, a stale source past its limit, partial) is a gap: it neither opens nor ends one.
    if (m.state !== "OK" && !BAD(m)) {
        return;
    }
    const key = { pk: `ALERT#${m.id}`, sk: "episode" };
    let mark = await ctx.store.get(key);
    const live = mark !== undefined && !mark.endedAt;
    if (m.state === "OK") {
        if (live) {
            await end(ctx, key, mark as Item, m);
        }
        return;
    }
    const e = ctx.evaluation.episodes.find((x) => x.member === m.id && x.endedAt === undefined);
    if (!e) {
        return;
    }
    if (!live) {
        // A new episode; of two overlapping runs only one resets the mark. lastOpenAt is kept for the floor.
        const fresh = { start: e.start, endedAt: 0, open: 0, clear: 0, redSince: 0, ttl: ttl(ctx) };
        mark =
            (await ctx.store.update(key, { set: fresh }, { field: "endedAt", op: ">", value: 0, orNotExists: true })) ??
            (await ctx.store.get(key));
    }
    if (!mark || mark.open === SENT) {
        return;
    }
    if (!(await due(ctx, key, e, m, mark.redSince as number | undefined))) {
        return;
    }
    // Inside the floor the open waits; a later run sends it once the floor has passed, if the episode is still on.
    if (ctx.now - ((mark.lastOpenAt as number | undefined) ?? 0) >= REALERT_MS) {
        await once(ctx, key, "open", e, m);
    }
}

/** The member is judged OK: the episode ends, with a "clear" only when its "open" was sent. */
async function end(ctx: Ctx, key: Key, mark: Item, m: MemberStatus): Promise<void> {
    if (mark.open === SENT && mark.clear !== SENT) {
        const ended = ctx.evaluation.episodes.filter((x) => x.member === m.id && x.endedAt !== undefined);
        const e = ended.reduce<Episode | undefined>((a, b) => (a && a.start > b.start ? a : b), undefined) ?? {
            member: m.id,
            category: m.category,
            worst: "FAILING",
            start: mark.start as number,
        };
        if (!(await once(ctx, key, "clear", e, m))) {
            return; // not sent: the episode stays open and the next run retries the clear
        }
    }
    await ctx.store.update(key, { set: { endedAt: ctx.now, ttl: ttl(ctx) } });
}

/** Master at its first red; anything else once its member has been FAILING for RED_FOR_MS without a break. */
async function due(ctx: Ctx, key: Key, e: Episode, m: MemberStatus, redSince = 0): Promise<boolean> {
    if (e.category === "master") {
        return e.worst === "FAILING";
    }
    const red = m.state === "FAILING";
    if (red !== redSince > 0) {
        await ctx.store.update(key, { set: { redSince: red ? ctx.now : 0, ttl: ttl(ctx) } });
    }
    return red && redSince > 0 && ctx.now - redSince >= RED_FOR_MS;
}

/** Claims, sends and marks one notification; true once it is sent (by this run or another). */
async function once(ctx: Ctx, key: Key, kind: "open" | "clear", e: Episode, m: MemberStatus): Promise<boolean> {
    const claimed = await ctx.store.update(
        key,
        { set: { [kind]: ctx.now, ttl: ttl(ctx) } },
        { field: kind, op: "<", value: ctx.now - LEASE_MS, orNotExists: true },
    );
    if (!claimed) {
        return (await ctx.store.get(key))?.[kind] === SENT; // another run holds or sent it
    }
    const ok = await post(ctx, message(ctx, kind, e, m));
    await ctx.store.update(key, {
        set: ok ? { [kind]: SENT, ...(kind === "open" ? { lastOpenAt: ctx.now } : {}) } : { [kind]: 0 },
    });
    if (ok) {
        ctx.result.sent.push({ member: e.member, kind });
    } else {
        ctx.result.failed++;
    }
    return ok;
}

const ttl = (ctx: Ctx) => Math.floor(ctx.now / 1000 + TTL_S);

const fmt = (v: number | undefined) => (v === undefined ? "no value" : String(Number(v.toPrecision(3))));
const fmtThreshold = (t: Threshold | undefined) => (t ? `${t[0]} ${t[1]}` : "none");

/**
 * The notification: the category, the member, its value against the red threshold, and the page.
 * @param ctx - the run
 * @param kind - open or clear
 * @param e - the episode
 * @param m - the member's status now
 * @returns Pushover's title, message, url, url_title and priority
 */
export function message(ctx: Pick<Ctx, "evaluation">, kind: "open" | "clear", e: Episode, m?: MemberStatus) {
    const category = ctx.evaluation.categories.find((c) => c.id === e.category)?.label ?? e.category;
    const page = e.category.replaceAll("_", "-");
    const value = kind === "open" ? (m?.value ?? e.peak) : m?.value;
    return {
        title: `${category} ${kind === "open" ? "FAILING" : "cleared"}`,
        message: `${m?.label ?? e.member}: ${fmt(value)} (red ${fmtThreshold(m?.fail)}, peak ${fmt(e.peak)})`,
        url: `${PAGE_URL}${page}`,
        url_title: `${category} page`,
        priority: kind === "open" ? "1" : "0",
    };
}

async function post(ctx: Ctx, m: Record<string, string>): Promise<boolean> {
    try {
        const body = new URLSearchParams({ token: ctx.token, user: ctx.user, ...m });
        const res = await ctx.fetch(PUSHOVER_URL, { method: "POST", body });
        if (!res.ok) {
            (ctx.log ?? console.warn)(`alerts: Pushover answered ${res.status} for "${m.title}"; retrying next run`);
        }
        return res.ok;
    } catch (err) {
        (ctx.log ?? console.warn)(`alerts: Pushover send failed for "${m.title}": ${(err as Error)?.message}`);
        return false;
    }
}
