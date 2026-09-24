/**
 * @file A waiver that records a DEFECT carries a date, and this test is what happens when the
 * date passes.
 *
 * WHY THIS EXISTS. `src/catalog/unreachable.ts` lets something out of a gate by writing down a
 * reason, and it holds two sorts of sentence. One says "we decided not to draw this": a label's
 * world position belongs to the renderer, a node icon is published as a compile error rather than
 * a silent no-op. The other says "this is broken and we wrote it down". Until September 2026 both
 * were the same shape -- a subject and a sentence -- and a gate cannot tell them apart, so the
 * moment a defect was written down it was green for ever. That is not hypothetical: every repaint
 * defect this package has had went quiet in exactly that way, and four of them were found again
 * only because somebody re-read the waiver list by hand.
 *
 * WHAT THIS MAKES IMPOSSIBLE. Not waiving a defect. A gate nobody can get past is a gate people
 * route around, and the waiver lists are how a defect reaches a consumer as a written sentence
 * rather than as a layer that silently does nothing. What it makes impossible is waiving one and
 * never looking again: a defect waiver names an owner and a day, and the day after that day this
 * test is red -- naming the subject, the reason, the date, the owner and the two things a person
 * may do about it, which are fix the defect and delete the waiver, or decide it still stands and
 * say so with a new date.
 *
 * IT REFUSES A DATE THAT IS NOT A DATE, and a date so far out that it is a way back to silence.
 * An expiry more than {@link WAIVER_HORIZON_DAYS} days ahead fails here as loudly as an expired
 * one, so "2099-01-01" buys nothing that reading the reason would not.
 *
 * NO BROWSER, NO RENDERER. Both lists are plain data behind the Node-safe `./catalog` entry
 * point, so this runs in the `default` vitest project -- the pre-push gate and the
 * `graphty-element-default` CI shard, rather than a lane somebody has to remember to run.
 */

import { assert, describe, it } from "vitest";

import {
    type DefectWaiver,
    UNPAINTED_CHANNELS,
    UNREACHABLE_STYLE_FIELDS,
    type Waiver,
    WAIVER_EXPIRY_UNSET,
    WAIVER_HORIZON_DAYS,
    WAIVER_OWNER_UNASSIGNED,
} from "../../src/catalog/unreachable";

/** One defect waiver, and the thing it is about, in the words a failure prints. */
interface WaivedDefect {
    /** Which list it is in, so a reader knows which part of the file to open. */
    readonly list: string;
    /** What it is about: a channel name, or a target and a dotted style path. */
    readonly subject: string;
    /** The waiver itself. */
    readonly waiver: DefectWaiver;
}

/** The one format an expiry may be written in. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A day, in milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** How many subjects a failure lists before it counts the rest. */
const SUBJECTS_SHOWN = 6;

/**
 * The defect waivers in one list, labelled with what each is about.
 * @param list - The name of the list, as a reader would grep for it.
 * @param entries - Every waiver in that list, of either kind.
 * @param subjectOf - How to say what one entry is about.
 * @returns One record per defect waiver; the decisions are dropped.
 */
function defectsIn<T extends Waiver>(
    list: string,
    entries: readonly T[],
    subjectOf: (entry: T) => string,
): WaivedDefect[] {
    return entries
        .filter((entry): entry is T & DefectWaiver => entry.kind === "defect")
        .map((entry) => ({ list, subject: subjectOf(entry), waiver: entry }));
}

/** Every defect waiver the package carries, from both lists. */
const DEFECTS: readonly WaivedDefect[] = [
    ...defectsIn("UNPAINTED_CHANNELS", UNPAINTED_CHANNELS, (entry) => entry.channel),
    ...defectsIn(
        "UNREACHABLE_STYLE_FIELDS",
        UNREACHABLE_STYLE_FIELDS,
        (entry) => `${entry.target} style ${entry.path}`,
    ),
];

/**
 * Today, written the way an expiry is written.
 * @returns The local date as `YYYY-MM-DD`.
 */
function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${String(now.getFullYear())}-${month}-${day}`;
}

/**
 * Whether a string is a day that exists, written as `YYYY-MM-DD`.
 * @param value - The candidate.
 * @returns True when it parses and reads back as the same day, so 2026-02-31 is refused.
 */
function isRealDate(value: string): boolean {
    if (!ISO_DATE.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/**
 * How many days lie between today and a date.
 * @param date - A day, as `YYYY-MM-DD`.
 * @returns The whole days ahead, negative once the date has passed.
 */
function daysAhead(date: string): number {
    return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / DAY_MS);
}

/**
 * Report a set of waivers, saying each shared sentence once.
 *
 * One block spread can write the same waiver onto dozens of fields at once, and dozens of copies
 * of one paragraph is how a failure message stops being read. So identical waivers are gathered and
 * their subjects counted.
 * @param waived - The defect waivers to report.
 * @returns One paragraph per distinct waiver, ready to put in an assertion message.
 */
function report(waived: readonly WaivedDefect[]): string {
    const groups = new Map<string, WaivedDefect[]>();

    for (const entry of waived) {
        const key = `${entry.list} ${entry.waiver.owner} ${entry.waiver.expires} ${entry.waiver.reason}`;

        groups.set(key, [...(groups.get(key) ?? []), entry]);
    }

    return [...groups.values()]
        .map((group) => {
            const { list, waiver } = group[0];
            const subjects = group.map((entry) => entry.subject);
            const shown = subjects.slice(0, SUBJECTS_SHOWN).join(", ");
            const rest =
                subjects.length > SUBJECTS_SHOWN ? ` and ${String(subjects.length - SUBJECTS_SHOWN)} more` : "";
            const unowned = waiver.owner === WAIVER_OWNER_UNASSIGNED ? " -- still nobody's" : "";

            return (
                `\n  ${list}: ${shown}${rest}\n` +
                `    expires ${waiver.expires}, owner: ${waiver.owner}${unowned}\n` +
                `    reason: ${waiver.reason}`
            );
        })
        .join("\n");
}

describe("a waiver that records a defect", () => {
    it("names who decides what happens to it", () => {
        const nameless = DEFECTS.filter((entry) => entry.waiver.owner.trim().length === 0);

        assert.deepEqual(
            nameless.map((entry) => `${entry.list}: ${entry.subject}`).sort(),
            [],
            `These defect waivers in src/catalog/unreachable.ts have no owner. A defect waiver ` +
                `is a gate held open until somebody acts, so it says who: a person, not a team ` +
                `and not a package. While no real name has been chosen, write ` +
                `WAIVER_OWNER_UNASSIGNED, which says out loud that nobody has agreed to it yet.`,
        );
    });

    it("expires on a day that exists", () => {
        const unreal = DEFECTS.filter((entry) => !isRealDate(entry.waiver.expires));

        assert.deepEqual(
            unreal.map((entry) => `${entry.list}: ${entry.subject} (expires ${entry.waiver.expires})`).sort(),
            [],
            `These defect waivers in src/catalog/unreachable.ts carry an expiry that is not a ` +
                `day. Write it as YYYY-MM-DD -- 2026-12-21, not "Q4", not "next release", not ` +
                `2026-02-31. The date is the whole mechanism: an expiry nothing can compare is a ` +
                `waiver that never runs out, which is the state this file was in before the two ` +
                `kinds of waiver were split apart.`,
        );
    });

    it("has not run out", () => {
        const expired = DEFECTS.filter(
            (entry) => isRealDate(entry.waiver.expires) && daysAhead(entry.waiver.expires) < 0,
        );

        assert.deepEqual(
            expired.map((entry) => `${entry.list}: ${entry.subject}`).sort(),
            [],
            `These defect waivers in src/catalog/unreachable.ts have expired, so the gates they ` +
                `hold open are red until a person acts on each one. Today is ${today()}.${report(expired)}` +
                `\n\nTwo ways to make this green, and only two. FIX the defect the reason ` +
                `describes and delete the waiver in the same change: the gate it was holding ` +
                `open -- test/browser/channel-paints.test.ts for a channel, ` +
                `test/contracts/config-reachability.test.ts for a style field -- then proves the ` +
                `fix, and fails if the waiver outlives it. Or DECIDE it still has to wait: read ` +
                `the reason, put a person's name in the owner, and set the expiry to the day you ` +
                `will next look, with the reason saying what it is waiting on. What is not ` +
                `available is moving the date without reading the reason -- a defect that is ` +
                `waived, forgotten and renewed on sight is the silence this test exists to break.`,
        );
    });

    it("is not parked so far out that it is silent again", () => {
        const parked = DEFECTS.filter(
            (entry) => isRealDate(entry.waiver.expires) && daysAhead(entry.waiver.expires) > WAIVER_HORIZON_DAYS,
        );

        assert.deepEqual(
            parked.map((entry) => `${entry.list}: ${entry.subject} (expires ${entry.waiver.expires})`).sort(),
            [],
            `These defect waivers in src/catalog/unreachable.ts expire more than ` +
                `${String(WAIVER_HORIZON_DAYS)} days after today (${today()}), which is the same ` +
                `as not expiring at all: nobody is still here to be reminded, and the defect goes ` +
                `quiet in the way that cost this package four repaint bugs. Set a date inside ` +
                `the horizon. If the defect genuinely waits on something a year away, say THAT ` +
                `in the reason and set the date to the day the wait is worth re-reading.${report(parked)}`,
        );
    });

    it("keeps its own placeholders usable", () => {
        assert.isTrue(
            isRealDate(WAIVER_EXPIRY_UNSET),
            `WAIVER_EXPIRY_UNSET is the expiry a waiver carries until the owner sets a real one, ` +
                `so it has to be a day: write it as YYYY-MM-DD.`,
        );
        assert.isAbove(
            WAIVER_OWNER_UNASSIGNED.trim().length,
            0,
            `WAIVER_OWNER_UNASSIGNED is what a defect waiver says instead of a name. Empty, it ` +
                `reads as an owner nobody noticed was missing.`,
        );
        assert.isAbove(
            WAIVER_HORIZON_DAYS,
            0,
            `WAIVER_HORIZON_DAYS is how far ahead a defect may be parked. Zero or less refuses ` +
                `every waiver, including the ones being written today.`,
        );
    });
});
