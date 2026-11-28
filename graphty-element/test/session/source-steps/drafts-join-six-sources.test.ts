/**
 * @file What the join workspace's draw costs with six 20,000-row sources (issue #10205): a pick builds the
 * draft once (and the one source added asking once), the first draw of the cards after it builds once at
 * most, and drawing them again builds nothing and reads the steps' conflicts no more. Every draw used to
 * rebuild the graph before the step a card is and read each step's conflicts afresh, which froze the page
 * for seconds per input.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../../src/session";
import { build } from "../../../src/session/sources/steps/build";
import { conflictReport } from "../../../src/session/sources/steps/provenance";
import type { SourceDraft, SourceJoinAct, SourceJoinMatch } from "../../../src/session/types";

vi.mock("../../../src/session/sources/steps/build", async (original) => {
    const real = await original<typeof import("../../../src/session/sources/steps/build")>();
    return { ...real, build: vi.fn(real.build) };
});

vi.mock("../../../src/session/sources/steps/provenance", async (original) => {
    const real = await original<typeof import("../../../src/session/sources/steps/provenance")>();
    return { ...real, conflictReport: vi.fn(real.conflictReport) };
});

const ROWS = 20_000;

/**
 * A CSV of `ROWS` rows.
 * @param header - Its header.
 * @param row - Its row at a place.
 * @returns The text.
 */
const csv = (header: string, row: (i: number) => string): string =>
    [header, ...Array.from({ length: ROWS }, (_, i) => row(i))].join("\n");

/** The six files, each with its key, as the owner's sample files have them. */
const FILES: Readonly<Record<string, readonly [string, string | undefined]>> = {
    people: [csv("person_id,badge,name", (i) => `P${String(i)},B${String(i)},n${String(i)}`), "person_id"],
    buildings: [csv("building,city", (i) => `D${String(i)},c${String(i % 50)}`), "building"],
    entries: [
        csv("entry,person,badge,building,hour", (i) => {
            const p = String((i * 7) % ROWS);
            return `E${String(i)},P${p},B${p},D${String(i % 300)},${String(i % 24)}`;
        }),
        "entry",
    ],
    accounts: [csv("account,name", (i) => `A${String(i)},a${String(i)}`), "account"],
    identifiers: [
        csv("account_id,phone,device", (i) => `A${String(i % (ROWS / 2))},ph${String(i)},dv${String(i % 900)}`),
        undefined,
    ],
    watchlist: [csv("value,risk", (i) => `${i % 2 === 0 ? "dv" : "ph"}${String(i)},r${String(i % 3)}`), "value"],
};

/**
 * Make an act on a draft.
 * @param draft - The draft.
 * @param act - The act.
 */
function make(draft: SourceDraft, act: SourceJoinAct): void {
    if (act.act === "merge") {
        draft.merge(act.options);
    } else if (act.act === "connect") {
        draft.connect(act.options);
    } else {
        assert.fail(`unexpected act ${act.act}`);
    }
}

describe("source-steps drafts: six 20,000-row sources in the join workspace", () => {
    it("a pick builds the draft once, and drawing the cards again builds nothing", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const keys: Record<string, string> = {};
        for (const [name, [data, key]] of Object.entries(FILES)) {
            keys[name] = await session.data.stage(
                { type: "csv", config: { data }, name: `${name}.csv` },
                key === undefined ? {} : { key },
            );
        }
        const draft = session.data.draft({ askOverlap: true });
        draft.add(keys.people);
        const a = { source: keys.entries };
        const b = { source: keys.people };
        const match: SourceJoinMatch = { a: { ...a, field: "person" }, b: { ...b, field: "person_id" } };
        // The card as the reader picks its fields: what its match can make.
        const offered = draft.joinOutcomes({ matches: [match] }).outcomes;
        const [act] = offered[0].acts;
        draft.preview();

        const builds = vi.mocked(build);
        const reports = vi.mocked(conflictReport);
        builds.mockClear();
        make(draft, act);
        // The draft once, and once more for people, the one source added asking its overlap question,
        // worked out again as data.add would add it (drafts-counted-work.test.ts).
        assert.strictEqual(builds.mock.calls.length, 2, "the pick builds the draft once, and people's add once");

        // What the workspace reads to draw the cards: the steps, the preview and each card's counts.
        const step = draft.steps().at(-1);
        assert.isDefined(step);
        const index = step?.index ?? -1;
        const draw = (): void => {
            draft.steps();
            draft.preview().made([index]);
            draft.joinOutcomes({ step: index });
            draft.joinOutcomes({ matches: [match], step: index });
            draft.sideFields(a, { before: index });
            draft.sideFields(b, { before: index });
            draft.joinRows({ a, b, match, before: index, limit: 0 });
            if (step?.act !== null && step?.act !== undefined) {
                draft.matchCounts({ from: step.act.from, into: step.act.into }, { before: index });
            }
            draft.steps();
        };
        builds.mockClear();
        reports.mockClear();
        draw();
        // The graph before the step is the one the card was offered on; only its fan-out count reads that
        // graph with the source the step adds, built once.
        assert.isAtMost(builds.mock.calls.length, 1, "the first draw after the pick builds once at most");
        assert.isAtMost(reports.mock.calls.length, 1, "it reads the steps' conflicts once");
        builds.mockClear();
        for (let again = 0; again < 3; again++) {
            draw();
        }
        assert.strictEqual(builds.mock.calls.length, 0, "drawing again builds nothing");
        assert.isAtMost(reports.mock.calls.length, 1, "nor reads the conflicts again");

        builds.mockClear();
        assert.isTrue(draft.undo());
        draft.steps();
        draft.preview();
        draft.joinOutcomes({ matches: [match] });
        assert.strictEqual(builds.mock.calls.length, 0, "an undo draws the card as it was, building nothing");

        builds.mockClear();
        assert.isTrue(draft.redo());
        draw();
        assert.strictEqual(builds.mock.calls.length, 0, "a redo draws the card as it was, building nothing");

        draft.dispose();
        session.dispose();
    });
});
