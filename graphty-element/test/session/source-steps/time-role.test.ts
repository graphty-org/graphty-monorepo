/**
 * @file The time role under the source-steps experiment (design 3.9): the timeline reads
 * `graphty.time` while any built source has a time role, so two sources timed by different columns
 * time every edge. Ported from the reference model's per-source time roles.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { refused } from "./scenario";

const T = "s,t,when\na,b,2024-01-01T00:00:00Z\nb,c,2024-02-01T00:00:00Z\n";
const U = "s,t,at\nc,d,2024-03-01T00:00:00Z\nd,a,2024-04-01T00:00:00Z\n";

/**
 * Load an edge file under the experiment.
 * @param session - The session.
 * @param data - The CSV.
 * @param name - Its name.
 * @param time - The column the mapping gives the time role, or undefined for none.
 * @param mode - `"merge"` to add it beside what is loaded.
 */
async function load(
    session: GraphSession,
    data: string,
    name: string,
    time: string | undefined,
    mode?: "merge",
): Promise<void> {
    await session.data.import(
        { type: "csv", config: { data }, name },
        {
            edges: { from: { column: "s" }, to: { column: "t" } },
            ...(time === undefined ? {} : { mapping: { rowsAre: "edges", source: "s", target: "t", time } }),
            ...(mode === undefined ? {} : { mode }),
        },
    );
}

describe("source-steps: time roles", () => {
    it("two sources timed by different columns: time.field names graphty.time and every edge is timed", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await load(session, T, "t.csv", "when");
        await load(session, U, "u.csv", "at", "merge");
        assert.strictEqual(session.data.valueCounts("graphty.time", { kind: "edge" }).missing, 0);
        assert.strictEqual(session.time.field?.edges?.start, "graphty.time");
        await session.time.ready;
        const extent = session.time.extent();
        assert.strictEqual(extent?.edges.timed, 4);
        assert.strictEqual(extent?.edges.untimed, 0);
        session.dispose();
    });

    it("roles given per source with setRole time every edge too", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await load(session, T, "t.csv", undefined);
        await load(session, U, "u.csv", undefined, "merge");
        const [one, two] = session.data.sources().map((s) => s.key);
        await session.data.setRole({ kind: "edge", name: "when" }, "time", { source: one });
        await session.data.setRole({ kind: "edge", name: "at" }, "time", { source: two });
        assert.strictEqual(session.time.field?.edges?.start, "graphty.time");
        await session.time.ready;
        assert.strictEqual(session.time.extent()?.edges.timed, 4);
        session.dispose();
    });

    it("time.setField naming no source is refused while several timed sources could take the role", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await load(session, T, "t.csv", "when");
        await load(session, U.replace("at", "when"), "u.csv", "when", "merge");
        const details = await refused(() => session.time.setField({ edges: { start: "when" } }), "E_ROLE_TARGET_AMBIGUOUS");
        assert.sameMembers(
            details.sources as string[],
            session.data.sources().map((s) => s.key),
        );
        assert.strictEqual(session.time.field?.edges?.start, "graphty.time");
        session.dispose();
    });

    it("time.setField on one source gives it the time role, so every edge is timed", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await load(session, T, "t.csv", undefined);
        const steps = session.history.steps.length;
        await session.time.setField({ edges: { start: "when" } });
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        assert.strictEqual(session.data.valueCounts("graphty.time", { kind: "edge" }).missing, 0);
        assert.strictEqual(session.time.field?.edges?.start, "graphty.time");
        session.dispose();
    });
});
