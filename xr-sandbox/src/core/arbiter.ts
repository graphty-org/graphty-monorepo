// The input arbiter (design section 5): gives each press on a channel to exactly one technique,
// by what the hand is on (the context) and a fixed priority, with a short arena for presses that
// mean different things by how they move. Pure: no Babylon, no DOM, so the input map can be
// unit-tested.

/** An input channel. A press on one is owned by at most one technique from start to end. */
export type Channel =
    "select" | "squeeze" | "stick" | "button" | "micro" | "poke" | "pose" | "motion" | "two-hand" | "voice";

/** What the hand is on at the start edge. */
export type Context = "ui" | "tool" | "node" | "edge" | "graph" | "space";

/** Which hand. */
export type Hand = "left" | "right";

/** A candidate's answer for a press in the arena. */
export type Decision = "take" | "wait" | "pass";

/** How a press has gone so far, for `decide`. */
export interface Gesture {
    durationMs: number;
    /** Distance the hand moved since the press started, in meters. */
    movedM: number;
}

/** One input a technique wants. */
export interface Claim {
    channel: Channel;
    contexts: readonly Context[] | "any";
    priority: number;
    /** A button ("a", "b", "x", "y"), a stick direction or a pose name, when the channel has several. */
    detail?: string;
    /** Which hand the claim is for; "any" by default. */
    hand?: "dominant" | "off" | "any";
    /** Called each frame of the arena; without it, the claim takes the press at its start. */
    decide?: (g: Gesture) => Decision;
    /** One line for the input map tab ("take after 3 cm"). */
    note?: string;
}

/** A claim with the technique that owns it. */
export interface OwnedClaim {
    owner: string;
    claim: Claim;
}

/** The start edge of a press. */
export interface PressStart {
    id: number;
    hand: Hand;
    channel: Channel;
    detail?: string;
    context: Context;
    /** The node under the hand (stabilized, design section 5.2), or -1. */
    target: number;
    time: number;
}

/** A won press, as reported to the framework. */
export interface Win {
    press: PressStart;
    owner: string;
    claim: Claim;
    /** Candidates that lost. */
    losers: string[];
    /** How it was decided. */
    how: "start" | "take" | "window" | "tap" | "two-hand";
}

/** What the arbiter tells the framework. */
interface ArbiterEvents {
    win(w: Win): void;
    /** A press owned by `owner` ended normally. */
    end(press: PressStart, owner: string): void;
    /** A press owned by `owner` was cancelled (blur, input removed, technique switched off). */
    cancel(press: PressStart, owner: string, reason: string): void;
    /** A press nobody claimed or that every candidate passed. */
    drop?(press: PressStart, reason: string): void;
}

interface Arena {
    press: PressStart;
    waiting: OwnedClaim[];
    all: string[];
    moved: number;
}

/** The arbiter. */
export interface Arbiter {
    start(p: PressStart): void;
    /** Report how far each live press has moved, then decide arenas whose time is up. */
    tick(time: number, movedById: (id: number) => number): void;
    end(id: number, time: number): void;
    cancel(id: number, reason: string): void;
    /** Cancel every press `owner` holds (it was switched off). */
    cancelOwner(owner: string, reason: string): void;
    /** Who owns press `id`, if anyone. */
    ownerOf(id: number): string | null;
    /** The candidates a press here would have, best first (for hover hints). */
    candidates(hand: Hand, channel: Channel, context: Context, detail?: string): OwnedClaim[];
}

/** The framework's own tap claim (design section 5.8): a release inside the arena selects. */
export const TAP_CLAIM: Claim = {
    channel: "select",
    contexts: ["node", "graph", "space"],
    priority: 0,
    decide: () => "wait",
    note: "a tap selects; on empty space it clears",
};

/** The arena window, in ms. The node menu's 300 ms hold always decides before it ends. */
const ARENA_MS = 350;

/**
 * Whether a claim applies to a press.
 * @param c - the claim
 * @param hand - the pressing hand
 * @param channel - the press's channel
 * @param context - what the hand is on
 * @param detail - the button, stick direction or pose, if any
 * @param dominant - the dominant hand
 * @returns true when the claim is a candidate
 */
function matches(
    c: Claim,
    hand: Hand,
    channel: Channel,
    context: Context,
    detail: string | undefined,
    dominant: Hand,
): boolean {
    if (c.channel !== channel || (c.detail !== undefined && c.detail !== detail)) {
        return false;
    }
    if (c.hand === "dominant" && hand !== dominant) {
        return false;
    }
    if (c.hand === "off" && hand === dominant) {
        return false;
    }
    return c.contexts === "any" || c.contexts.includes(context);
}

/**
 * Create an arbiter over the claims of the enabled techniques.
 * @param claims - the live claims (read on every press, so enabling a technique takes effect at once)
 * @param events - where wins, ends and cancels go
 * @param dominant - the dominant hand, read on every press
 * @returns the arbiter
 */
export function createArbiter(
    claims: () => readonly OwnedClaim[],
    events: ArbiterEvents,
    dominant: () => Hand = () => "right",
): Arbiter {
    const owned = new Map<number, { press: PressStart; owner: string; claim: Claim }>();
    const arenas = new Map<number, Arena>();

    const candidates = (hand: Hand, channel: Channel, context: Context, detail?: string): OwnedClaim[] =>
        context === "ui"
            ? []
            : claims()
                  .filter((o) => matches(o.claim, hand, channel, context, detail, dominant()))
                  .sort((a, b) => b.claim.priority - a.claim.priority);

    const award = (press: PressStart, winner: OwnedClaim, all: string[], how: Win["how"]): void => {
        arenas.delete(press.id);
        owned.set(press.id, { press, owner: winner.owner, claim: winner.claim });
        events.win({
            press,
            owner: winner.owner,
            claim: winner.claim,
            losers: all.filter((o) => o !== winner.owner),
            how,
        });
    };

    const decideArena = (a: Arena, time: number): void => {
        const g: Gesture = { durationMs: time - a.press.time, movedM: a.moved };
        for (const c of Array.from(a.waiting)) {
            const d = c.claim.decide ? c.claim.decide(g) : "take";
            if (d === "take") {
                award(a.press, c, a.all, g.durationMs === 0 && !c.claim.decide ? "start" : "take");
                return;
            }
            if (d === "pass") {
                a.waiting.splice(a.waiting.indexOf(c), 1);
            }
        }
        if (a.waiting.length === 0) {
            arenas.delete(a.press.id);
            events.drop?.(a.press, "every candidate passed");
        } else if (g.durationMs >= ARENA_MS) {
            award(a.press, a.waiting[0], a.all, "window");
        }
    };

    return {
        candidates,
        start(p) {
            if (p.channel === "select" || p.channel === "squeeze") {
                // Two hands (section 5.5): the other hand's press is held by a technique that claims two-hand.
                for (const o of owned.values()) {
                    if (o.press.hand === p.hand) {
                        continue;
                    }
                    const two = claims().find((c) => c.owner === o.owner && c.claim.channel === "two-hand");
                    if (two) {
                        owned.set(p.id, { press: p, owner: o.owner, claim: two.claim });
                        events.win({ press: p, owner: o.owner, claim: two.claim, losers: [], how: "two-hand" });
                        return;
                    }
                }
            }
            const list = candidates(p.hand, p.channel, p.context, p.detail);
            if (list.length === 0) {
                events.drop?.(p, p.context === "ui" ? "ui" : "no candidate");
                return;
            }
            const arena: Arena = { press: p, waiting: list, all: list.map((c) => c.owner), moved: 0 };
            arenas.set(p.id, arena);
            decideArena(arena, p.time);
        },
        tick(time, movedById) {
            for (const a of Array.from(arenas.values())) {
                a.moved = movedById(a.press.id);
                decideArena(a, time);
            }
        },
        end(id) {
            const o = owned.get(id);
            if (o) {
                owned.delete(id);
                events.end(o.press, o.owner);
                return;
            }
            const a = arenas.get(id);
            if (!a) {
                return;
            }
            arenas.delete(id);
            // A release inside the window is a tap: it goes to the framework's tap claim, else it is dropped.
            const tap = a.waiting.find((c) => c.claim === TAP_CLAIM);
            if (tap) {
                owned.set(id, { press: a.press, owner: tap.owner, claim: tap.claim });
                events.win({
                    press: a.press,
                    owner: tap.owner,
                    claim: tap.claim,
                    losers: a.all.filter((x) => x !== tap.owner),
                    how: "tap",
                });
                owned.delete(id);
                events.end(a.press, tap.owner);
            } else {
                events.drop?.(a.press, "released in the arena");
            }
        },
        cancel(id, reason) {
            arenas.delete(id);
            const o = owned.get(id);
            if (o) {
                owned.delete(id);
                events.cancel(o.press, o.owner, reason);
            }
        },
        cancelOwner(owner, reason) {
            for (const [id, o] of Array.from(owned)) {
                if (o.owner === owner) {
                    owned.delete(id);
                    events.cancel(o.press, owner, reason);
                }
            }
            for (const a of arenas.values()) {
                a.waiting = a.waiting.filter((c) => c.owner !== owner);
            }
        },
        ownerOf: (id) => owned.get(id)?.owner ?? null,
    };
}

/** A defect in an input map: two claims that cannot both be reached. */
interface InputMapDefect {
    a: string;
    b: string;
    channel: Channel;
    context: Context;
    detail?: string;
    reason: string;
}

const ALL_CONTEXTS: readonly Context[] = ["tool", "node", "edge", "graph", "space"];

/**
 * Find claims that shadow each other (design section 5.3): two at one priority on the same
 * channel, context and detail, or two there of which one has no `decide` (it would always win at
 * start and the other could never be reached).
 * @param claims - the claims of the techniques to check together
 * @returns every defect found
 */
export function inputMapDefects(claims: readonly OwnedClaim[]): InputMapDefect[] {
    const out: InputMapDefect[] = [];
    for (let i = 0; i < claims.length; i++) {
        for (let j = i + 1; j < claims.length; j++) {
            if (meet(claims[i], claims[j])) {
                out.push(...pairDefects(claims[i], claims[j]));
            }
        }
    }
    return out;
}

/**
 * Whether two techniques' claims can see the same press: other owners, one channel and detail, and
 * hands that overlap.
 * @param a - one claim
 * @param b - the other
 * @returns true when they meet
 */
function meet(a: OwnedClaim, b: OwnedClaim): boolean {
    if (a.owner === b.owner || a.claim.channel !== b.claim.channel) {
        return false;
    }
    if ((a.claim.detail ?? "") !== (b.claim.detail ?? "")) {
        return false;
    }
    const ha = a.claim.hand ?? "any";
    const hb = b.claim.hand ?? "any";
    return ha === "any" || hb === "any" || ha === hb;
}

/**
 * The defects of two claims that meet, one per shared context.
 * @param a - one claim
 * @param b - the other
 * @returns the defects
 */
function pairDefects(a: OwnedClaim, b: OwnedClaim): InputMapDefect[] {
    const ctxA = a.claim.contexts === "any" ? ALL_CONTEXTS : a.claim.contexts;
    const ctxB = b.claim.contexts === "any" ? ALL_CONTEXTS : b.claim.contexts;
    let reason: string | null = null;
    if (a.claim.priority === b.claim.priority) {
        reason = "same priority";
    } else if (!a.claim.decide || !b.claim.decide) {
        reason = "a claim without decide shares the channel";
    }
    if (!reason) {
        return [];
    }
    const why = reason;
    return ctxA
        .filter((c) => ctxB.includes(c))
        .map((context) => ({
            a: a.owner,
            b: b.owner,
            channel: a.claim.channel,
            context,
            detail: a.claim.detail,
            reason: why,
        }));
}
