/**
 * Detection at import: a timed column says so on the draft and nothing more. The reader designates
 * it; the element never does on the strength of a suggestion.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type DraftColumn, type LoadDraft } from "../../../session";

const ON = ["timeline"] as const;

/**
 * Prepares a CSV file.
 * @param data - The file's text.
 * @param features - The features the session runs with.
 * @returns The draft.
 */
async function prepare(data: string, features: readonly string[] = ON): Promise<LoadDraft> {
    const session = createGraphSession({ features: [...features] });
    return session.data.prepare({ type: "csv", config: { data } });
}

/**
 * One column of a draft's only table.
 * @param draft - The draft.
 * @param name - The column.
 * @returns The column.
 */
function column(draft: LoadDraft, name: string): DraftColumn {
    const found = draft.tables[0].columns.find((each) => each.name === name);
    assert.isDefined(found, name);
    return found;
}

/**
 * An edge file with one more column.
 * @param name - The column's name.
 * @param values - Its values, one per edge.
 * @returns The file's text.
 */
function edges(name: string, values: readonly (string | number)[]): string {
    const rows = values.map((value, at) => `n${String(at)},n${String(at + 1)},${String(value)}`);
    return [`source,target,${name}`, ...rows].join("\n");
}

describe("a draft's time suggestion", () => {
    it("suggests ISO text and reports its span", async () => {
        const draft = await prepare(edges("sent", ["2026-01-02", "2026-01-01T12:00:00Z", "2026-01-04"]));
        assert.equal(column(draft, "sent").looksLike, "time");
        assert.deepEqual(draft.findings, [
            {
                code: "time.found",
                params: { table: "rows", column: "sent", from: Date.UTC(2026, 0, 1, 12), to: Date.UTC(2026, 0, 4) },
            },
        ]);
    });

    it("suggests ISO text under any name: the values decide", async () => {
        const draft = await prepare(edges("mail", ["2026-01-02", "2026-01-03"]));
        assert.equal(column(draft, "mail").looksLike, "time");
    });

    it("leaves version numbers alone, under any name", async () => {
        for (const name of ["version", "release_date"]) {
            const draft = await prepare(edges(name, ["1.10", "1.9", "2.0"]));
            assert.isUndefined(column(draft, name).looksLike, name);
            assert.isEmpty(draft.findings, name);
        }
    });

    it("leaves a column alone when one sampled value is no strict date", async () => {
        const draft = await prepare(edges("sent", ["2026-01-02", "next Tuesday", "2026-01-04"]));
        assert.isUndefined(column(draft, "sent").looksLike);
    });

    it("never suggests numbers without a time name", async () => {
        const draft = await prepare(edges("weight", [1_700_000_000_000, 1_700_000_100_000]));
        assert.isUndefined(column(draft, "weight").looksLike);
        assert.isEmpty(draft.findings);
    });

    it("never suggests a name that only holds a time word", async () => {
        const draft = await prepare(edges("friend", [1500, 1600]));
        assert.isUndefined(column(draft, "friend").looksLike);
    });

    it("never suggests a time name from the name alone", async () => {
        const draft = await prepare(edges("start", [1, 2, 3]));
        assert.isUndefined(column(draft, "start").looksLike);
    });

    it("suggests a numeric epoch with a time name, with its span", async () => {
        const draft = await prepare(edges("created", [1_700_000_100_000, 1_700_000_000_000]));
        assert.equal(column(draft, "created").looksLike, "time");
        const [found] = draft.findings;
        assert.equal(found.params.from, 1_700_000_000_000);
        assert.equal(found.params.to, 1_700_000_100_000);
    });

    it("reads epoch seconds and years as a designation would", async () => {
        const seconds = await prepare(edges("createdAt", [1_700_000_000, 1_700_000_100]));
        assert.equal(seconds.findings[0].params.to, 1_700_000_100_000);
        const years = await prepare(edges("year", [1995, 2001]));
        assert.equal(years.findings[0].params.from, Date.UTC(1995, 0, 1));
        assert.equal(years.findings[0].params.to, Date.UTC(2001, 0, 1));
    });

    it("spans every row, past the sample", async () => {
        const days = Array.from({ length: 20 }, (_, at) => `2026-01-${String(at + 1).padStart(2, "0")}`);
        const draft = await prepare(edges("sent", days));
        assert.equal(draft.findings[0].params.to, Date.UTC(2026, 0, 20));
    });

    it("says nothing of a column that already has a role", async () => {
        const draft = await prepare("source,target,label\n2026-01-01,2026-01-02,x\n2026-01-02,2026-01-03,y\n");
        assert.equal(column(draft, "source").suggested, "source");
        assert.isUndefined(column(draft, "source").looksLike);
        assert.isEmpty(draft.findings);
    });

    it("designates nothing on a load with no choice", async () => {
        const session = createGraphSession({ features: [...ON] });
        const draft = await session.data.prepare({
            type: "csv",
            config: { data: edges("sent", ["2026-01-02", "2026-01-03"]) },
        });
        assert.isUndefined(column(draft, "sent").suggested);
        assert.isNull(draft.mapping.tables.rows.time ?? null);
        await draft.load();
        assert.isNull(session.time.field);
    });

    it("is silent with the timeline off", async () => {
        const draft = await prepare(edges("sent", ["2026-01-02", "2026-01-03"]), []);
        assert.notProperty(column(draft, "sent"), "looksLike");
        assert.deepEqual(draft.findings, []);
    });
});
