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
import { type Episode, type Evaluation, hit, type MemberStatus, type Reason } from "../sla/engine.js";
import { SPEC } from "../views/members.js";

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";
export const PAGE_URL = "https://health.graphty.app/#/";
const REPO_URL = "https://github.com/graphty-org/graphty-monorepo";
export const SECRETS = { token: "/graphty-health/pushover/app-token", user: "/graphty-health/pushover/user-key" };
/** At most one page per member in this span unless its alert sets floorMs. */
export const REALERT_MS = 6 * HOUR;
/** A claim older than this was a run that died mid-send: another run may take it. */
const LEASE_MS = 5 * MIN;
const TTL_S = (8 * DAY) / 1000;
/** A claim field holding this was sent; later than any claim time, so the claim condition fails on it. */
const SENT = 8.64e15;
/**
 * The marks' version. A mark of an older version (written before the words and policy changed) counts as no live
 * episode and has its floor cleared, so a member still bad pages once in the current words.
 */
const MARK_V = 2;

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
            const d = c && (await member(ctx, m, forCause(c, m)));
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

/** A fact the page needs is missing (a collector part failed): a gap, like NO DATA, that neither opens nor ends. */
const factsGap = (m: MemberStatus, a: AlertConfig) =>
    Object.keys(a.facts ?? {}).some((k) => m.facts?.[k] === undefined);

/** Judged OK, or bad but no longer meeting the facts its page needs: the episode ends. */
const settled = (m: MemberStatus, a: AlertConfig) => m.state === "OK" || (BAD(m) && !!a.facts && !factsHold(m, a));

/** The member's alert as its cause adjusts it (a GitHub outage blinding the collector pages later and quietly). */
function forCause(c: Paging, m: MemberStatus): Paging {
    const adjust = c.alert.action === "{fix}" ? causeWords(m).alert : undefined;
    return adjust ? { ...c, alert: { ...c.alert, ...adjust } } : c;
}

/** The page's condition: FAILING (or the value past alert.value), the facts, the day of the month, no other cause. */
async function condition(ctx: Ctx, m: MemberStatus, a: AlertConfig): Promise<boolean> {
    if (!BAD(m) || !factsHold(m, a)) {
        return false;
    }
    if (a.action === "{fix}" && !causeWords(m).fix) {
        return false; // a cause with no step only the owner can take is agent work: it never pages
    }
    if (a.value ? !past(m.value, a) : m.state !== "FAILING") {
        return false;
    }
    for (const id of a.notWhileFailing ?? []) {
        if (await paging(ctx, id)) {
            return false;
        }
    }
    if (a.fromDay !== undefined && new Date(ctx.now).getUTCDate() < a.fromDay) {
        // A projection early in the month swings on one day's spend: only real spend past red pages before fromDay.
        const mtd = m.facts?.month_to_date;
        return mtd !== undefined && m.fail !== undefined && hit(mtd, m.fail);
    }
    return true;
}

/**
 * Another member's own page condition holds: FAILING and, when its alert pages on facts, those facts too (the
 * runners member is FAILING in a slowdown as well, which never pages and so must not silence master red). Or its
 * page was sent and its episode has not ended: a GitHub outage that later blinds the collector leaves the runners
 * member in a gap, and the outage has already been reported once.
 */
async function paging(ctx: Ctx, id: string): Promise<boolean> {
    const x = ctx.evaluation.members.find((m) => m.id === id);
    const a = (ctx.config ?? SLAS).members.find((c) => c.id === id)?.alert;
    if (x?.state === "FAILING" && (!a || factsHold(x, a))) {
        return true;
    }
    const mark = await ctx.store.get({ pk: `ALERT#${id}`, sk: "episode" });
    return mark?.open === SENT && !mark.endedAt && mark.v === MARK_V;
}

/** The value past alert.value. */
const past = (v: number | undefined, a: AlertConfig) => v !== undefined && hit(v, a.value!);

async function member(ctx: Ctx, m: MemberStatus, c: Paging): Promise<Due | undefined> {
    // Any other state (NO DATA, a stale source past its limit, partial, not set up) is a gap: it neither opens nor
    // ends one.
    if ((m.state !== "OK" && !BAD(m)) || (BAD(m) && factsGap(m, c.alert))) {
        return undefined;
    }
    const key = { pk: `ALERT#${m.id}`, sk: "episode" };
    let mark = await ctx.store.get(key);
    const live = mark !== undefined && !mark.endedAt && mark.v === MARK_V;
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
        const fresh = {
            start: e.start,
            endedAt: 0,
            open: 0,
            clear: 0,
            redSince: 0,
            okSince: 0,
            peak: 0,
            cause: null,
            v: MARK_V,
            ttl: ttl(ctx),
        };
        const old = mark !== undefined && mark.v !== MARK_V;
        const set = old ? { ...fresh, lastOpenAt: 0 } : fresh; // an older version's floor is cleared, live or ended
        mark =
            (await ctx.store.update(key, { set }, { field: "endedAt", op: ">", value: 0, orNotExists: true })) ??
            (old
                ? await ctx.store.update(key, { set }, { field: "v", op: "<", value: MARK_V, orNotExists: true })
                : undefined) ??
            (await ctx.store.get(key));
    } else if (mark?.okSince) {
        await ctx.store.update(key, { set: { okSince: 0, ttl: ttl(ctx) } }); // a relapse before "resolved" was due
    }
    if (!mark) {
        return undefined;
    }
    // The mark keeps the episode's peak and cause: a member the engine measures without history (the collector, the
    // sources) has neither left once it is OK, and the "resolved" must still say how long and which feed.
    const peak = Math.max(Number(mark.peak ?? 0), m.value ?? 0);
    const cause = m.cause && JSON.stringify(m.cause) !== JSON.stringify(mark.cause) ? { cause: m.cause } : {};
    if (peak > Number(mark.peak ?? 0) || cause.cause) {
        await ctx.store.update(key, { set: { peak, ...cause, ttl: ttl(ctx) } });
    }
    if (mark.open === SENT) {
        // A reminder (alert.repeatMs) re-arms once that span has passed since it was sent; the condition on
        // lastOpenAt lets only one of two overlapping runs re-arm it.
        const r = c.alert.repeatMs;
        const again =
            !!r &&
            (await ctx.store.update(
                key,
                { set: { open: 0, ttl: ttl(ctx) } },
                { field: "lastOpenAt", op: "<=", value: ctx.now - r },
            ));
        if (!again) {
            return undefined;
        }
    }
    if (!(await due(ctx, key, m, c.alert, mark.redSince as number | undefined))) {
        return undefined;
    }
    if (c.alert.daytime && !daytime(ctx.now)) {
        return undefined; // a cost page waits for the morning; the next daytime run sends it
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
        const peak = Math.max(e.peak ?? 0, Number(mark.peak ?? 0));
        const cause = m.cause ?? (mark.cause as Reason | null | undefined) ?? undefined;
        const d: Due = {
            key,
            e: { ...e, ...(peak > 0 ? { peak } : {}) },
            m: { ...m, ...(cause ? { cause } : {}) },
            c,
            start: Math.min(e.start, (mark.start as number | undefined) ?? e.start),
        };
        const until = okSince || ctx.now;
        if (!(await once(ctx, key, "clear", [d], resolvedMessage(ctx, d, until)))) {
            return; // not sent: the episode stays open and the next run retries
        }
    }
    await ctx.store.update(key, { set: { endedAt: ctx.now, ttl: ttl(ctx) } });
}

/** Due once the condition has held for alert.afterMs without a break. */
async function due(ctx: Ctx, key: Key, m: MemberStatus, a: AlertConfig, redSince = 0): Promise<boolean> {
    const red = await condition(ctx, m, a);
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

const PT_HOUR = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hourCycle: "h23",
});
/** 9:00 to 21:00 in the owner's time zone. */
export const daytime = (t: number) => {
    const h = Number(PT_HOUR.format(t));
    return h >= 9 && h < 21;
};

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
        case "usd": {
            const c = Math.round(n * 100) / 100; // cents first, so 9.999 is $10 and not "$10.00"
            return `$${c >= 10 || Number.isInteger(c) ? Math.round(c) : c.toFixed(2)}`;
        }
        case "pct":
            return `${Math.round(n)}%`;
        case undefined:
            return String(Number(n.toPrecision(3)));
        default:
            return spec.unit in TIME ? duration(n * TIME[spec.unit]) : String(Number(n.toPrecision(3)));
    }
}

/**
 * What a cause means and the one step that fixes it: {feed}, {problem}, {fix} and {off}. An empty fix is a cause
 * only agents can fix, which never pages; `alert` adjusts the member's alert for this cause.
 */
interface CauseWords {
    feed: string;
    /** What the dashboard cannot read while the cause lasts. */
    frozen: string;
    problem: string;
    fix: string;
    off: string;
    alert?: Partial<AlertConfig>;
}

/**
 * The sources whose credential only the owner can make: what refused, and where to make a new one. Every other
 * source's credential error is agent work and never pages: the billing feed reads Cost Explorer through the
 * collector's own AWS role (and the $10 Budget's deny-all stops the collector itself, which release.yml's dead-man
 * check reports), and the screenshot captures feed's results store token is one an agent can make and store.
 */
const CREDENTIALS: Record<string, Omit<CauseWords, "off"> & { off?: string }> = {
    "cloudflare-token": {
        feed: "Cloudflare token",
        frozen: "Cloudflare costs and usage",
        problem: "Cloudflare token rejected",
        fix: "Make a new read-only Cloudflare token at https://dash.cloudflare.com/profile/api-tokens (Account Analytics: Read, Billing: Read) and give it to any Claude session to store.",
    },
    "sentry-token": {
        feed: "Sentry token",
        frozen: "Sentry usage",
        problem: "Sentry token rejected",
        fix: "Make a new Sentry token with org:read at https://sentry.io/settings/account/api/auth-tokens/ and give it to any Claude session to store.",
    },
};

/**
 * The cause of a source or collector page in words, from its source and error.
 * @param m - the member
 */
export function causeWords(m: MemberStatus): CauseWords {
    const p = m.cause?.params ?? {};
    const error = String(p.error ?? "");
    if (m.id === "data.collector") {
        // First: "installation token: HTTP 502" is GitHub failing, not the key. A rate limit or a timeout falls
        // through to "bug in its code": the collector is blind either way, so it pages, and an agent fixes it.
        if (/\bHTTP 5\d\d\b|ECONN|fetch failed|socket/i.test(error)) {
            return {
                feed: "Collector",
                frozen: "GitHub",
                problem: "GitHub API down",
                fix: "Nothing to do but wait: GitHub's API is failing (https://www.githubstatus.com/), so CI is likely stalled too. The dashboard catches up by itself when GitHub recovers.",
                off: "",
                // An outage nobody can act on: one quiet page once it has lasted 2 h, never a loud one, and none
                // while the CI page already reports the same GitHub outage.
                alert: { afterMs: 2 * HOUR, priority: 0, notWhileFailing: ["ci.runners_not_assigned"] },
            };
        }
        // The key itself: a 401 anywhere, or a 404 from the token endpoint (the App was uninstalled). A 403 or 429
        // there is a rate limit, agent work.
        if (/installation token: HTTP 404|\b401\b|bad credentials|private key|jwt/i.test(error)) {
            return {
                feed: "Collector",
                frozen: "GitHub",
                problem: "GitHub App key refused",
                fix: "Make a new private key for the graphty-pipeline-health App at https://github.com/organizations/graphty-org/settings/apps/graphty-pipeline-health and give the .pem file to any Claude session to store. If the App was uninstalled, reinstall it there.",
                off: "",
            };
        }
        return {
            feed: "Collector",
            frozen: "GitHub",
            problem: "bug in its code",
            fix: "Ask any Claude session to fix the health dashboard; it is not watching anything until then.",
            off: "",
        };
    }
    const known = CREDENTIALS[String(p.source ?? "")];
    const label = String(p.label ?? p.source ?? "A dashboard feed");
    return {
        feed: known?.feed ?? label,
        frozen: known?.frozen ?? "its numbers",
        problem: known?.problem ?? "its credential was refused",
        fix: known?.fix ?? "",
        off: known?.off ?? "",
    };
}

/** A cause's words as placeholders. */
function words(m: MemberStatus): Record<string, string> {
    const w = causeWords(m);
    return { feed: w.feed, frozen: w.frozen, problem: w.problem, fix: w.fix, off: w.off };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

/** The month's last day, as "Oct 31" (UTC, as the engine's months are). */
function monthEnd(now: number): string {
    const d = new Date(now);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return last.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const monthName = (t: number, month: "long" | "short") =>
    new Date(t).toLocaleString("en-US", { month, timeZone: "UTC" });

/**
 * Which month a budget decision is about: in the month's last week this month is spent, so the choice is next
 * month's budget and a cut starts on its first day; earlier it holds from now on.
 */
function budgetMonth(now: number): { choose: string; pick: string; cutFrom: string } {
    const d = new Date(now);
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    if ((next - now) / DAY > 7) {
        return { choose: "Choose the limit from now on", pick: "new", cutFrom: "today" };
    }
    return {
        choose: `Choose ${monthName(next, "long")}'s limit`,
        pick: monthName(next, "short"),
        cutFrom: `${monthName(next, "short")} 1`,
    };
}

/** The line a member's page is judged against: red, or the OK line when it has no red. */
const line = (m: MemberStatus) => m.fail?.[1] ?? m.ok?.[1];

/** The value at month end at this month's pace so far (UTC days, as the engine's months are). */
function pace(v: number, now: number): number {
    const d = new Date(now);
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return (v * days * DAY) / Math.max(now - start, DAY);
}

function fill(template: string, d: Due, now: number): string {
    const { m, e, start } = d;
    const p = m.cause?.params ?? {};
    const peak = e.peak ?? m.value;
    const vars: Record<string, string> = {
        value: human(m.id, m.value),
        limit: human(m.id, m.fail?.[1]),
        target: human(m.id, m.ok?.[1]),
        // A page names one limit: the red line that triggered it (the budget's line when there is none).
        over: human(m.id, m.value === undefined || !line(m) ? undefined : m.value - line(m)!),
        // The next multiple of 10 above the value, so the suggestion always leaves headroom.
        suggest: human(m.id, m.value === undefined ? undefined : Math.floor(m.value / 10) * 10 + 10),
        mtd: human(m.id, m.facts?.month_to_date),
        month: monthName(now, "long"),
        mon: monthName(now, "short"),
        end: monthEnd(now),
        ...budgetMonth(now),
        peak: human(m.id, peak),
        pace: human(m.id, m.value === undefined ? undefined : pace(m.value, now)),
        for: duration(now - start),
        // How long an age-like member (its value is how long the problem has lasted) was bad, to `now`: the episode
        // starts once the value passes its OK line, so that much is added; never less than the peak seen.
        lasted: duration(Math.max(peak ?? 0, now - start + (m.ok?.[1] ?? 0))),
        // A GitHub error page or a long GraphQL error must not push the step out of Pushover's 1024 characters.
        error: clip(String(p.error ?? "none recorded"), 200),
        since: duration(m.facts?.credential_error_ms ?? now - start),
        ...(/\{(feed|frozen|problem|fix|off)\}/.test(template) ? words(m) : {}),
    };
    return template
        .replaceAll(/\{ms:([\w.]+)\}/g, (_, k: string) => duration(m.facts?.[k] ?? 0))
        .replaceAll(/\{n:([\w.]+)\}/g, (_, k: string) => String(Math.round(m.facts?.[k] ?? 0)))
        .replaceAll(/\{issue:([\w.]+)\}/g, (_, k: string) =>
            m.facts?.[k]
                ? `${REPO_URL}/issues/${m.facts[k]}`
                : `${REPO_URL}/issues?q=is%3Aissue+is%3Aopen+%22Nightly+held%22`,
        )
        .replaceAll(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all)
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n");
}

function link(ctx: Pick<Ctx, "evaluation" | "now">, category: string, d?: Due) {
    const own = d?.c.alert.link;
    if (own) {
        return { url: fill(own.url, d, ctx.now), url_title: own.title };
    }
    const label = ctx.evaluation.categories.find((c) => c.id === category)?.label ?? category;
    return { url: `${PAGE_URL}${category.replaceAll("_", "-")}`, url_title: `Open the ${label} page` };
}

/**
 * The page for one member, or one for a group due together (the costs): each member's line, then one decision that
 * accepts every suggested number at once (alert.short names each), or a cut.
 * @param ctx - the run
 * @param ds - the members due, one or more of one group
 */
export function openMessage(ctx: Pick<Ctx, "evaluation" | "now">, ds: Due[]): Message {
    const f = (t: string, d: Due) => fill(t, d, ctx.now);
    const one = ds.length === 1;
    // The closing step ("Tell any Claude session your choice", a quoted error) is said once per distinct text.
    const then = [...new Set(ds.map((d) => (d.c.alert.then ? f(d.c.alert.then, d) : "")).filter((t) => !!t))];
    const tail = then.length ? `\n${then.join(" ")}` : "";
    const top = Math.max(...ds.map((d) => d.c.alert.priority));
    const short = (d: Due) => d.c.alert.short ?? d.c.label;
    const accept = ds.map((d) => `${short(d)} to ${f("{suggest}", d)}`).join(", ");
    // The lock screen shows the title and the first lines: the title asks for the decision, the body leads with it.
    return {
        title: one ? f(ds[0].c.alert.title, ds[0]) : groupTitle(ds, f),
        message: one
            ? `What to do: ${f(ds[0].c.alert.action, ds[0])}\n${f(ds[0].c.alert.text, ds[0])}${tail}`
            : `What to do: ${f("{choose}", ds[0]).replace("limit", "limits")}: raise ${accept} a month, or keep them and accept the overruns.${cut(ds, f)} Nothing is cut unless you say so; tell any Claude session your choice.\n${ds.map((d) => f(d.c.alert.text, d)).join("\n")}${tail}`,
        ...link(ctx, ds[0].m.category, one ? ds[0] : undefined),
        // Loud only in the day: at night an outage page is held by the owner's quiet hours (as health-dead-man.sh).
        priority: String(top === 1 && !daytime(ctx.now) ? 0 : top),
    };
}

/**
 * A group's title: the total against its limit when it is among them (it already holds the others, so they are named,
 * not added), else every item over; then the decision asked.
 */
function groupTitle(ds: Due[], f: (t: string, d: Due) => string): string {
    const total = ds.find((d) => d.c.id === "cost.spend");
    const rest = ds.filter((d) => d !== total).map((d) => d.c.alert.short ?? d.c.label);
    const names = rest.join(" and ");
    return total
        ? f(`Over budget for {mon}: {value} of {limit}${rest.length ? ` (${names})` : ""}. Pick {pick} limits`, total)
        : f(`${names} over {mon} limits: pick {pick} limits`, ds[0]);
}

/**
 * What cutting LLM test runs (the one paid service the agents can cut at once; the T4 lane runs on every release)
 * back to their budget would and would not fix, for a group the LLM tests are in.
 */
function cut(ds: Due[], f: (t: string, d: Due) => string): string {
    // Whole dollars against each red line, so the sum the page states is one the reader can check.
    const over = (d?: Due) => Math.round((d?.m.value ?? 0) - (d ? (line(d.m) ?? 0) : 0));
    const llm = ds.find((d) => d.c.id === "cost.llm");
    if (!llm) {
        return "";
    }
    const total = ds.find((d) => d.c.id === "cost.spend");
    const left = over(total) - over(llm);
    const fits = total && left <= 0 ? " and brings the total within budget" : "";
    const still = [
        ...ds.filter((d) => d !== llm && d !== total).map((d) => `${d.c.alert.short ?? d.c.label} stays over`),
        ...(total && left > 0 ? [`the total stays about ${human(total.m.id, left)} over`] : []),
    ];
    const but = still.length ? `, but ${still.join(" and ")}` : "";
    return ` Cutting LLM test runs from ${f("{cutFrom}", llm)} to fit their ${f("{limit}", llm)} limit saves about ${f("{over}", llm)}${fits}${but}.`;
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
        // Pushover refuses a title over 250 or a message over 1024 characters.
        const body = new URLSearchParams({
            token: ctx.token,
            user: ctx.user,
            ...m,
            title: clip(m.title, 250),
            message: clip(m.message, 1024),
        });
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
