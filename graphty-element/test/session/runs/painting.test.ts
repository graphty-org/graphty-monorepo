/**
 * @file `runs.painting(runId)`: what the element decided to paint when a run first completed.
 *
 * A run paints itself on its first completion, and the decision was silent: a suggestion a
 * hand-written layer already drives on every element was dropped without a word, so a reader
 * looked at the old colors and never saw the new result. The decision is now data on the run's
 * entry, one outcome per suggestion, with ids and codes only.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import type { SuggestionOutcome } from "../../../src/session/runs";
import { fixtureSession } from "../history/fixture-session";

/** A hand-written layer that colors every node, as the app's New Layer button writes one. */
const EVERYTHING_BLUE = {
    name: "Everything blue",
    selector: { match: "everything" },
    set: { "node.color": "#0000ff" },
} as const;

/**
 * The outcome values of a decision, for a compact comparison.
 * @param suggestions - The outcomes.
 * @returns Their `outcome` fields.
 */
function outcomes(suggestions: readonly SuggestionOutcome[] | undefined): string[] {
    return (suggestions ?? []).map((each) => each.outcome);
}

describe("runs.painting", () => {
    it("is readable once the run is awaited, naming the layers a suggestion added", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg", style: { size: true } });
        const painting = session.runs.painting("deg");

        assert.strictEqual(painting?.state, "decided");
        assert.deepStrictEqual(outcomes(painting?.suggestions), ["added", "added"]);
        const layerIds = painting?.suggestions.flatMap((each) => (each.outcome === "added" ? each.layerIds : []));
        assert.deepStrictEqual(layerIds, [...session.runs.bindings("deg")]);
        session.dispose();
    });

    it("names the hand-written layer that suppressed a suggestion, and the suggestion can be applied anyway", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add(EVERYTHING_BLUE);

        await session.runs.start("degree", {}, { as: "deg" });
        const [only] = session.runs.painting("deg")?.suggestions ?? [];

        assert.strictEqual(only.outcome, "suppressed");
        assert.strictEqual(only.outcome === "suppressed" ? only.byLayerId : undefined, mine.id);
        assert.lengthOf(session.runs.bindings("deg"), 0, "nothing was painted");

        if (only.suggestion.as === "encoding") {
            await session.styles.encode(only.suggestion.spec);
        }
        const ids = session.styles.list().map((each) => each.id);
        assert.strictEqual(ids.at(-1), session.runs.bindings("deg")[0], "an explicit call goes on top");
        session.dispose();
    });

    it("reports the hand-written layer a suggestion was placed beneath", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add({
            name: "n1 red",
            selector: { match: "ids", nodes: ["n1"] },
            set: { "node.color": "#ff0000" },
        });

        await session.runs.start("degree", {}, { as: "deg" });
        const [only] = session.runs.painting("deg")?.suggestions ?? [];

        assert.strictEqual(only.outcome, "added");
        assert.strictEqual(only.outcome === "added" ? only.placedBeneathLayerId : undefined, mine.id);
        session.dispose();
    });

    it("leaves placedBeneathLayerId out when nothing hand-written is above", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg" });
        const [only] = session.runs.painting("deg")?.suggestions ?? [];

        assert.isFalse(only.outcome === "added" && "placedBeneathLayerId" in only);
        session.dispose();
    });

    it("reports a batch member superseded by the sibling that painted, once the batch is awaited", async () => {
        const session = await fixtureSession();

        await session.runs.batch([
            { algorithm: "degree", as: "deg" },
            { algorithm: "pagerank", as: "pr" },
        ]);
        const [superseded] = session.runs.painting("deg")?.suggestions ?? [];

        assert.strictEqual(session.runs.painting("deg")?.state, "decided");
        assert.strictEqual(superseded.outcome === "superseded" ? superseded.byRunId : superseded.outcome, "pr");
        assert.deepStrictEqual(outcomes(session.runs.painting("pr")?.suggestions), ["added"]);
        session.dispose();
    });

    it("reports a batch's suppressed suggestion against the member that would have painted", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add(EVERYTHING_BLUE);

        await session.runs.batch([
            { algorithm: "degree", as: "deg" },
            { algorithm: "pagerank", as: "pr" },
        ]);
        const [only] = session.runs.painting("pr")?.suggestions ?? [];

        assert.strictEqual(only.outcome === "suppressed" ? only.byLayerId : only.outcome, mine.id);
        session.dispose();
    });

    it("says a run started with style: false opted out", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg", style: false });

        assert.deepStrictEqual(session.runs.painting("deg"), { state: "opted-out", suggestions: [] });
        session.dispose();
    });

    it("keeps the first decision across a re-run", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg" });
        const first = session.runs.painting("deg");
        await session.styles.add(EVERYTHING_BLUE);
        await session.runs.start("degree", {}, { as: "deg", seed: 2 });

        assert.strictEqual(session.runs.painting("deg"), first);
        session.dispose();
    });

    it("goes with the run on undo and comes back on redo", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg" });
        const first = session.runs.painting("deg");
        await session.undo();
        assert.notDeepEqual(session.runs.painting("deg"), first);
        await session.redo();

        assert.deepStrictEqual(session.runs.painting("deg"), first);
        session.dispose();
    });

    it("is decided by the time run:changed reports the run's end", async () => {
        const session = await fixtureSession();
        const states: (string | undefined)[] = [];
        session.on("run:changed", (change) => {
            if (change.phase === "end") {
                states.push(session.runs.painting(change.run.id)?.state);
            }
        });

        await session.runs.start("degree", {}, { as: "deg" });

        assert.deepStrictEqual(states, ["decided"]);
        session.dispose();
    });

    it("is undefined for a run the session does not hold", async () => {
        const session = await fixtureSession();

        assert.isUndefined(session.runs.painting("nope"));
        session.dispose();
    });
});

/**
 * The example at the top of `docs/guide/run-painting.md`, run as written: its import and the
 * line that finds the element are left out, and `element` is a stand-in whose `run` forwards to
 * `session.runs.start`, as the element's does.
 * @param session - The session the stand-in element holds.
 * @returns What the example logged.
 */
async function runGuideExample(session: Awaited<ReturnType<typeof fixtureSession>>): Promise<unknown[][]> {
    const guide = readFileSync(join(__dirname, "../../../docs/guide/run-painting.md"), "utf8");
    const block = /```ts\n([\s\S]*?)```/.exec(guide)?.[1] ?? "";
    const body = block
        .split("\n")
        .filter((line) => !line.startsWith("import ") && !line.startsWith("const element = "))
        .join("\n");
    const logged: unknown[][] = [];
    const element = { session, run: (algorithm: string) => session.runs.start(algorithm) };
    const log = {
        log: (...args: unknown[]): void => {
            logged.push(args);
        },
    };
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
        ...args: string[]
    ) => (...values: unknown[]) => Promise<void>;

    assert.isAtMost(block.trim().split("\n").length, 17, "the canonical example stays about 15 lines");
    await new AsyncFunction("element", "console", body)(element, log);

    return logged;
}

describe("the run-painting guide's example", () => {
    it("logs the channels a run painted", async () => {
        const session = await fixtureSession();

        assert.deepStrictEqual(await runGuideExample(session), [["added", ["node.color"]]]);
        session.dispose();
    });

    it("logs the layer that hid a suggestion, then paints it anyway on top", async () => {
        const session = await fixtureSession();
        await session.styles.add(EVERYTHING_BLUE);

        assert.deepStrictEqual(await runGuideExample(session), [["hidden by layer", "Everything blue"]]);
        assert.strictEqual(session.styles.list().at(-1)?.source.by, "run", "the run's layer is now on top");
        session.dispose();
    });
});
