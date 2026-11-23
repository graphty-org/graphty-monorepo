/**
 * A text column whose values are nearly all plain dates measures time, read from the values and
 * never from the column's name; bare numbers never do.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { GraphSession } from "../../../src/session/types";

/**
 * A session over nodes carrying the given columns, one value each per node.
 * @param columns - Column name to its values.
 * @returns The session.
 */
async function nodesWith(columns: Record<string, readonly unknown[]>): Promise<GraphSession> {
    const session = createGraphSession();
    const count = Math.max(...Object.values(columns).map((values) => values.length));
    await session.data.addNodes(
        Array.from({ length: count }, (_, i) => ({
            id: `n${String(i)}`,
            ...Object.fromEntries(Object.entries(columns).map(([name, values]) => [name, values[i]])),
        })),
    );

    return session;
}

/**
 * A node column's measurement.
 * @param session - The session.
 * @param name - The column.
 * @returns The measurement.
 */
function measurementOf(session: GraphSession, name: string): string | undefined {
    return session.data.attributes().find((each) => each.kind === "node" && each.name === name)?.measurement;
}

const ISO_DAYS = Array.from({ length: 20 }, (_, i) =>
    new Date(Date.UTC(2025, 0, 1 + i * 9)).toISOString().slice(0, 10),
);

describe("time is detected from the values", () => {
    it("marks an oddly named column of ISO dates and date-times as time", async () => {
        const session = await nodesWith({
            zq7: ISO_DAYS,
            stamp: ISO_DAYS.map((day) => `${day}T09:30:00Z`),
            months: ISO_DAYS.map((day) => day.slice(0, 7)),
            spoken: ISO_DAYS.map((day) =>
                new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" }),
            ),
        });
        for (const name of ["zq7", "stamp", "months", "spoken"]) {
            assert.strictEqual(measurementOf(session, name), "time", name);
        }

        // Detection does not designate the timeline.
        assert.isNull(session.time.field);
        session.dispose();
    });

    it("leaves a column named date that holds no dates, bare years and versions as they were", async () => {
        const session = await nodesWith({
            date: ISO_DAYS.map((_, i) => ["red", "green", "blue"][i % 3]),
            year: ISO_DAYS.map((_, i) => 1995 + i),
            yearText: ISO_DAYS.map((_, i) => String(1995 + i)),
            version: ISO_DAYS.map((_, i) => `1.${String(i)}`),
        });
        assert.strictEqual(measurementOf(session, "date"), "categorical");
        assert.strictEqual(measurementOf(session, "year"), "quantitative");
        assert.notStrictEqual(measurementOf(session, "yearText"), "time");
        assert.notStrictEqual(measurementOf(session, "version"), "time");
        session.dispose();
    });

    it("needs nearly every value to be a date: one stray value in twenty is fine, a quarter is not", async () => {
        const one = ISO_DAYS.map((day, i) => (i === 3 ? "unknown" : day));
        const quarter = ISO_DAYS.map((day, i) => (i % 4 === 0 ? "unknown" : day));
        const session = await nodesWith({ one, quarter });
        assert.strictEqual(measurementOf(session, "one"), "time");
        assert.notStrictEqual(measurementOf(session, "quarter"), "time");
        session.dispose();
    });

    it("lists a detected column first among the time candidates", async () => {
        const session = await nodesWith({ label: ISO_DAYS.map((_, i) => `n${String(i)}`), when: ISO_DAYS });
        assert.strictEqual(session.time.candidates()[0]?.column, "when");
        session.dispose();
    });
});
