// Pushover alerts (design/ci/health-dashboard.md, section 13). Only members with an `alert` in config/slas.json page,
// and only for a critical outage or something only the owner can do; agents handle everything else. Each page says
// what is wrong in words, with the value and limit in human units, how long it has lasted, and "What to do".
// One mark per member (ALERT#<member>, sk "episode") holds its episode: it starts at the first bad state and ends
// only when the member is judged OK again (or, for a member paging on facts, once they no longer hold), so a gap of
// NO DATA or a stale source in between neither ends it nor starts another. A member pages at most once per its floor
// (6 h by default), even across episodes: a page inside that floor waits until the floor has passed, and an episode
// that ends before its page was sent sends no "resolved". Each send is claimed with a conditional write first, so a
// retried or overlapping collector run never sends twice; a failed send releases the claim and the next run retries.

import { DAY, HOUR, MIN } from "../model/items.js";
import type { Item, Key, Store } from "../model/store.js";
import { type AlertConfig, type MemberConfig, type SlaConfig, SLAS } from "../sla/config.js";
import { type Episode, type Evaluation, hit, type MemberStatus } from "../sla/engine.js";
import { SPEC } from "../views/members.js";

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
export const PAGE_URL = "https://health.graphty.app/#/";
export const SECRETS = { token: "/graphty-health/pushover/app-token", user: "/graphty-health/pushover/user-key" };
/** At most one page per member in this span unless its alert sets floorMs. */
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
    /** The members' alert settings (config/slas.json by default). */
    config?: SlaConfig;
}

export interface AlertsResult {
    state: "ok" | "not set up" | "error";
    sent: { member: string; kind: "open" | "clear" }[];
    /** Sends Pushover refused or that failed in transit; retried on the next run. */
    failed: number;
    error?: string;
}

type Paging = MemberConfig & { alert: AlertConfig };

interface Ctx extends AlertsInput {
    token: string;
    user: string;
    result: AlertsResult;
}

/** A page due now: the member, its episode and when the episode began. */
export interface Due {
    key: Key;
    e: Episode;
    m: MemberStatus;
    c: Paging;
    start: number;
}

/**
 * Sends the pages the evaluation's episodes are due. Never throws: the collector's run must not fail on an alert.
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
        const paging = new Map(
            (input.config ?? SLAS).members.filter((c): c is Paging => !!c.alert).map((c) => [c.id, c]),
        );
        const due: Due[] = [];
        for (const m of input.evaluation.members) {
            const c = paging.get(m.id);
            const d = c && (await member(ctx, m, c));
            if (d) {
                due.push(d);
            }
        }
        const groups = new Map<string, Due[]>();
        for (const d of due) {
            const g = d.c.alert.group ?? d.c.id;
            groups.set(g, [...(groups.get(g) ?? []), d]);
        }
        for (const group of groups.values()) {
            await sendOpen(ctx, group);
        }
        return result;
    } catch (err) {
        return { ...result, state: "error", error: String((err as Error)?.message ?? err) };
    }
}

const BAD = (m: MemberStatus) => m.state === "WARNING" || m.state === "FAILING";

const factsHold = (m: MemberStatus, a: AlertConfig) =>
    Object.entries(a.facts ?? {}).every(([k, t]) => m.facts?.[k] !== undefined && hit(m.facts[k], t));

/** Judged OK, or bad but no longer meeting the facts its page needs: the episode ends. */
const settled = (m: MemberStatus, a: AlertConfig) => m.state === "OK" || (BAD(m) && !!a.facts && !factsHold(m, a));

/** The page's condition: FAILING (or the value past alert.value), the facts, the day of the month, no other cause. */
function condition(ctx: Ctx, m: MemberStatus, a: AlertConfig): boolean {
    if (!BAD(m) || !factsHold(m, a)) {
        return false;
    }
    if (a.value ? m.value === undefined || !hit(m.value, a.value) : m.state !== "FAILING") {
        return false;
    }
    if (a.notWhileFailing?.some((id) => ctx.evaluation.members.find((x) => x.id === id)?.state === "FAILING")) {
        return false;
    }
    if (a.fromDay !== undefined && new Date(ctx.now).getUTCDate() < a.fromDay) {
        // A projection early in the month swings on one day's spend: only real spend past red pages before fromDay.
        const mtd = m.facts?.month_to_date;
        return mtd !== undefined && m.fail !== undefined && hit(mtd, m.fail);
    }
    return true;
}

async function member(ctx: Ctx, m: MemberStatus, c: Paging): Promise<Due | undefined> {
    // Any other state (NO DATA, a stale source past its limit, partial, not set up) is a gap: it neither opens nor
    // ends one.
    if (m.state !== "OK" && !BAD(m)) {
        return undefined;
    }
    const key = { pk: `ALERT#${m.id}`, sk: "episode" };
    let mark = await ctx.store.get(key);
    const live = mark !== undefined && !mark.endedAt;
    if (settled(m, c.alert)) {
        if (live) {
            await end(ctx, key, mark as Item, m, c);
        }
        return undefined;
    }
    const e = ctx.evaluation.episodes.find((x) => x.member === m.id && x.endedAt === undefined);
    if (!e) {
        return undefined;
    }
    if (!live) {
        // A new episode; of two overlapping runs only one resets the mark. lastOpenAt is kept for the floor.
        const fresh = { start: e.start, endedAt: 0, open: 0, clear: 0, redSince: 0, okSince: 0, ttl: ttl(ctx) };
        mark =
            (await ctx.store.update(key, { set: fresh }, { field: "endedAt", op: ">", value: 0, orNotExists: true })) ??
            (await ctx.store.get(key));
    } else if (mark?.okSince) {
        await ctx.store.update(key, { set: { okSince: 0, ttl: ttl(ctx) } }); // a relapse before "resolved" was due
    }
    if (!mark || mark.open === SENT) {
        return undefined;
    }
    if (!(await due(ctx, key, m, c.alert, mark.redSince as number | undefined))) {
        return undefined;
    }
    // Inside the floor the page waits; a later run sends it once the floor has passed, if the episode is still on.
    if (ctx.now - ((mark.lastOpenAt as number | undefined) ?? 0) < (c.alert.floorMs ?? REALERT_MS)) {
        return undefined;
    }
    return { key, e, m, c, start: Math.min(e.start, (mark.start as number | undefined) ?? e.start) };
}

/**
 * The member is settled: the episode ends, with a quiet "resolved" only when its page was sent and the member says
 * so, once it has stayed settled for resolved.clearAfterMs (a flapping recovery sends neither "resolved" nor a page).
 */
async function end(ctx: Ctx, key: Key, mark: Item, m: MemberStatus, c: Paging): Promise<void> {
    const r = c.alert.resolved;
    if (r && mark.open === SENT && mark.clear !== SENT) {
        const okSince = (mark.okSince as number | undefined) || 0;
        if (!okSince && r.clearAfterMs > 0) {
            await ctx.store.update(key, { set: { okSince: ctx.now, ttl: ttl(ctx) } });
            return;
        }
        if (ctx.now - (okSince || ctx.now) < r.clearAfterMs) {
            return;
        }
        const ended = ctx.evaluation.episodes.filter((x) => x.member === m.id && x.endedAt !== undefined);
        const e = ended.reduce<Episode | undefined>((a, b) => (a && a.start > b.start ? a : b), undefined) ?? {
            member: m.id,
            category: m.category,
            worst: "FAILING",
            start: mark.start as number,
        };
        const d: Due = { key, e, m, c, start: Math.min(e.start, (mark.start as number | undefined) ?? e.start) };
        const until = okSince || ctx.now;
        if (!(await once(ctx, key, "clear", [d], resolvedMessage(ctx, d, until)))) {
            return; // not sent: the episode stays open and the next run retries
        }
    }
    await ctx.store.update(key, { set: { endedAt: ctx.now, ttl: ttl(ctx) } });
}

/** Due once the condition has held for alert.afterMs without a break. */
async function due(ctx: Ctx, key: Key, m: MemberStatus, a: AlertConfig, redSince = 0): Promise<boolean> {
    const red = condition(ctx, m, a);
    if (red !== redSince > 0) {
        await ctx.store.update(key, { set: { redSince: red ? ctx.now : 0, ttl: ttl(ctx) } });
    }
    return red && (a.afterMs <= 0 || (redSince > 0 && ctx.now - redSince >= a.afterMs));
}

/** One message for the group's members whose page this run could claim. */
async function sendOpen(ctx: Ctx, group: Due[]): Promise<void> {
    const claimed: Due[] = [];
    for (const d of group) {
        if (await claim(ctx, d.key, "open")) {
            claimed.push(d);
        }
    }
    if (claimed.length) {
        await deliver(ctx, "open", claimed, openMessage(ctx, claimed));
    }
}

/** Claims, sends and marks one notification; true once it is sent (by this run or another). */
async function once(ctx: Ctx, key: Key, kind: "open" | "clear", ds: Due[], msg: Message): Promise<boolean> {
    if (!(await claim(ctx, key, kind))) {
        return (await ctx.store.get(key))?.[kind] === SENT; // another run holds or sent it
    }
    return deliver(ctx, kind, ds, msg);
}

async function claim(ctx: Ctx, key: Key, kind: "open" | "clear"): Promise<boolean> {
    const claimed = await ctx.store.update(
        key,
        { set: { [kind]: ctx.now, ttl: ttl(ctx) } },
        { field: kind, op: "<", value: ctx.now - LEASE_MS, orNotExists: true },
    );
    return !!claimed;
}

async function deliver(ctx: Ctx, kind: "open" | "clear", ds: Due[], msg: Message): Promise<boolean> {
    const ok = await post(ctx, msg);
    for (const d of ds) {
        await ctx.store.update(d.key, {
            set: ok ? { [kind]: SENT, ...(kind === "open" ? { lastOpenAt: ctx.now } : {}) } : { [kind]: 0 },
        });
        if (ok) {
            ctx.result.sent.push({ member: d.m.id, kind });
        }
    }
    if (!ok) {
        ctx.result.failed++;
    }
    return ok;
}

const ttl = (ctx: Pick<Ctx, "now">) => Math.floor(ctx.now / 1000 + TTL_S);

// ---------------------------------------------------------------------------------------------------------------
// The words. Values come in the engine's units (ms, fractions, dollars); the views' SPEC says what each member's
// unit is, so a page shows the same number the dashboard does, in hours and minutes rather than milliseconds.

export interface Message {
    title: string;
    message: string;
    url: string;
    url_title: string;
    priority: string;
}

/**
 * A span as a person says it: "45 min", "3 h 6 min", "2 d 4 h".
 * @param ms - the span
 */
export function duration(ms: number): string {
    const min = Math.round(Math.max(0, ms) / MIN);
    if (min < 1) {
        return "under 1 min";
    }
    if (min < 60) {
        return `${min} min`;
    }
    if (min < 48 * 60) {
        const h = Math.floor(min / 60);
        return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
    }
    const h = Math.round(min / 60);
    return h % 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h / 24} d`;
}

const TIME: Record<string, number> = { ms: 1, s: 1000, min: MIN, h: HOUR, d: DAY };

/**
 * One of a member's values in its dashboard unit, written out.
 * @param id - the member
 * @param v - the engine's value
 */
export function human(id: string, v: number | undefined): string {
    if (v === undefined || !Number.isFinite(v)) {
        return "no value";
    }
    const spec = SPEC[id];
    const n = v * (spec?.k ?? 1);
    switch (spec?.unit) {
        case "usd":
            return `$${n >= 100 || Number.isInteger(n) ? Math.round(n) : n.toFixed(2)}`;
        case "pct":
            return `${Math.round(n)}%`;
        case undefined:
            return String(Number(n.toPrecision(3)));
        default:
            return spec.unit in TIME ? duration(n * TIME[spec.unit]) : String(Number(n.toPrecision(3)));
    }
}

function fill(template: string, d: Due, now: number): string {
    const { m, e, start } = d;
    const p = m.cause?.params ?? {};
    const vars: Record<string, string> = {
        value: human(m.id, m.value),
        limit: human(m.id, m.fail?.[1]),
        target: human(m.id, m.ok?.[1]),
        peak: human(m.id, e.peak ?? m.value),
        for: duration(now - start),
        source: String(p.label ?? p.source ?? "a"),
        error: String(p.error ?? "none recorded"),
        since: duration(m.facts?.credential_error_ms ?? now - start),
    };
    return template
        .replace(/\{ms:([\w.]+)\}/g, (_, k: string) => duration(m.facts?.[k] ?? 0))
        .replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);
}

function link(ctx: Pick<Ctx, "evaluation">, category: string) {
    const label = ctx.evaluation.categories.find((c) => c.id === category)?.label ?? category;
    return { url: `${PAGE_URL}${category.replaceAll("_", "-")}`, url_title: `Open the ${label} page` };
}

/**
 * The page for one member, or one for a group due together (the costs).
 * @param ctx - the run
 * @param ds - the members due, one or more of one group
 */
export function openMessage(ctx: Pick<Ctx, "evaluation" | "now">, ds: Due[]): Message {
    const text = (d: Due) => fill(d.c.alert.text, d, ctx.now);
    const action = (d: Due) => fill(d.c.alert.action, d, ctx.now);
    const one = ds.length === 1;
    return {
        title: one
            ? fill(ds[0].c.alert.title, ds[0], ctx.now)
            : `Over budget: ${ds.map((d) => `${d.c.label} ${human(d.m.id, d.m.value)}`).join(", ")}`,
        message: one
            ? `${text(ds[0])}\nWhat to do: ${action(ds[0])}`
            : `${ds.map(text).join("\n")}\nWhat to do:\n${ds.map((d) => `- ${d.c.label}: ${action(d)}`).join("\n")}`,
        ...link(ctx, ds[0].m.category),
        priority: String(Math.max(...ds.map((d) => d.c.alert.priority))),
    };
}

/**
 * The quiet "resolved" after a page.
 * @param ctx - the run
 * @param d - the member, its last episode and when it began
 * @param until - when it was first judged settled
 */
export function resolvedMessage(ctx: Pick<Ctx, "evaluation" | "now">, d: Due, until = ctx.now): Message {
    const r = d.c.alert.resolved;
    return {
        title: fill(r?.title ?? `${d.c.label}: resolved`, d, until),
        message: `${fill(r?.text ?? "", d, until)}\nNothing to do.`.trim(),
        ...link(ctx, d.m.category),
        priority: "-1",
    };
}

async function post(ctx: Ctx, m: Message): Promise<boolean> {
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
