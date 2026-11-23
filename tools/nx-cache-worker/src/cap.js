// A hard daily cap (UTC day) on what the Worker does, cheap enough not to be a cost of its own. Each isolate
// counts in memory and adds its counts to one Durable Object (DailyCount) every FLUSH_EVERY requests or FLUSH_MS,
// getting the day's totals back; a new isolate (or a new day) asks for the totals before its first request. A
// request is refused when the totals it last heard plus its own unsent counts would pass a cap, so the cap can be
// overshot by at most FLUSH_EVERY requests per running isolate. The caps are the wrangler.toml vars CAP_<NAME>; a name with no var is not capped (and
// test/index.test.mjs fails when a counted name has no var).
// Unsent counts from the last minute before 00:00 UTC are dropped with the day: at most FLUSH_EVERY per isolate.

export const FLUSH_EVERY = 50;
export const FLUSH_MS = 60_000;

const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * One isolate's counter.
 * @returns `{ charge }`: `charge(env, counts, now)` adds `counts` (name to amount) and answers the name of the
 *     first cap they would pass, or undefined when the request may go ahead
 */
export function dailyCap() {
    let day;
    let totals = {};
    let pending = {};
    let unsent = 0;
    let lastFlush = 0;

    async function flush(env, now) {
        lastFlush = now;
        if (!env.DAILY_COUNT) return;
        const sentDay = day;
        const sending = pending;
        pending = {};
        unsent = 0;
        try {
            const stub = env.DAILY_COUNT.get(env.DAILY_COUNT.idFromName("caps"));
            const res = await stub.fetch("https://daily-count/add", {
                method: "POST",
                body: JSON.stringify({ day: sentDay, counts: sending }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const dayTotals = await res.json();
            // A reply that lands after 00:00 UTC is the old day's: the new day keeps its own.
            if (day === sentDay) totals = dayTotals;
        } catch (error) {
            // Fail open on the counter, never on the cap: keep the counts and send them with the next flush.
            console.error(`daily cap: could not add counts: ${error.message}`);
            for (const [name, n] of Object.entries(sending)) pending[name] = (pending[name] ?? 0) + n;
        }
    }

    return {
        async charge(env, counts, now = Date.now()) {
            if (utcDay(now) !== day) {
                day = utcDay(now);
                totals = {};
                pending = {};
                unsent = 0;
                lastFlush = 0;
            }
            if (!lastFlush) await flush(env, now);
            for (const [name, n] of Object.entries(counts)) {
                const cap = env[`CAP_${name}`];
                if (cap !== undefined && (totals[name] ?? 0) + (pending[name] ?? 0) + n > Number(cap)) return name;
            }
            for (const [name, n] of Object.entries(counts)) pending[name] = (pending[name] ?? 0) + n;
            unsent++;
            if (unsent >= FLUSH_EVERY || now - lastFlush >= FLUSH_MS) await flush(env, now);
            return undefined;
        },
    };
}

/** The Durable Object that holds the day's totals: one storage key per UTC day, `{ name: count }`. */
export class DailyCount {
    /**
     * Opens the counter.
     * @param state the Durable Object's state, whose storage holds the totals
     */
    constructor(state) {
        this.storage = state.storage;
    }

    /**
     * Adds `{ day, counts }` to that day's totals.
     * @param request a POST whose JSON body is `{ day, counts }`
     * @returns the day's new totals
     */
    async fetch(request) {
        const { day, counts } = await request.json();
        const totals = (await this.storage.get(day)) ?? {};
        for (const [name, n] of Object.entries(counts)) totals[name] = (totals[name] ?? 0) + Number(n);
        await this.storage.put(day, totals);
        return Response.json(totals);
    }
}
