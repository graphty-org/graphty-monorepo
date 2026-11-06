/**
 * Detection at import: a timed column says so on the draft and nothing more. The reader designates
 * it; the element never does on the strength of a suggestion.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type DraftColumn, type GraphSession, type LoadDraft } from "../../../session";

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

/** A JSON file: the format sets its tables' roles. */
const JSON_FILE = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { source: "a", target: "b", sent: "2026-01-01" },
        { source: "b", target: "c", sent: "2026-01-03" },
    ],
});

/** A GraphML file: the format sets its tables' roles. */
const GRAPHML_FILE = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="sent" for="edge" attr.name="sent" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="a"/><node id="b"/>
    <edge source="a" target="b"><data key="sent">2026-01-01</data></edge>
  </graph>
</graphml>`;

/**
 * Six dates, then one more value past the sample.
 * @param last - The value.
 * @returns The column's values.
 */
function afterSample(last: string | number): readonly (string | number)[] {
    return [...Array.from({ length: 6 }, (_, at) => `2026-01-0${String(at + 1)}`), last];
}

/**
 * Asserts that a draft's one finding spans what a designation of its column reads.
 * @param session - The session the draft loads into.
 * @param draft - The draft.
 */
async function assertSpanMatchesDesignation(session: GraphSession, draft: LoadDraft): Promise<void> {
    const [{ params }] = draft.findings;
    await draft.load({ mapping: { tables: { [params.table]: { time: params.column } } } });
    await session.time.ready;
    const extent = session.time.extent();
    assert.isNotNull(extent);
    assert.equal(params.from, extent.from);
    // An extent ends just past its last instant.
    assert.equal(params.to, extent.to - 1);
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

    it("reads a bare number past the sample as a designation does: a stray among dates", async () => {
        const session = createGraphSession({ features: [...ON] });
        const data = edges("sent", afterSample(0));
        const draft = await session.data.prepare({ type: "csv", config: { data } });
        assert.equal(draft.findings[0].params.from, Date.UTC(2026, 0, 1));
        await assertSpanMatchesDesignation(session, draft);
    });

    it("reads loose text past the sample in UTC on every machine", async () => {
        vi.stubEnv("TZ", "America/Los_Angeles");
        try {
            const session = createGraphSession({ features: [...ON] });
            const data = edges("sent", afterSample("Jan 31 2026"));
            const draft = await session.data.prepare({ type: "csv", config: { data } });
            assert.equal(draft.findings[0].params.to, Date.UTC(2026, 0, 31));
            await assertSpanMatchesDesignation(session, draft);
        } finally {
            vi.unstubAllEnvs();
        }
    });

    it("reads loose text past the sample in the configured parse zone", async () => {
        const session = createGraphSession({ features: [...ON] });
        await session.config.set({ data: { knownFields: { edgeTimeParseZone: "Asia/Tokyo" } } });
        const data = edges("sent", afterSample("Jan 31 2026"));
        const draft = await session.data.prepare({ type: "csv", config: { data } });
        assert.equal(draft.findings[0].params.to, Date.UTC(2026, 0, 30, 15));
        await assertSpanMatchesDesignation(session, draft);
    });

    it("reads numbers in the configured unit, as a designation does", async () => {
        for (const [unit, values] of [
            ["s", [1_700_000_000_000, 1_700_000_100_000]],
            ["ms", [1_700_000_000, 1_700_000_100]],
        ] as const) {
            const session = createGraphSession({ features: [...ON] });
            await session.config.set({ data: { knownFields: { edgeTimeUnit: unit } } });
            const data = edges("created", values);
            const draft = await session.data.prepare({ type: "csv", config: { data } });
            await assertSpanMatchesDesignation(session, draft);
        }
    });

    it("says nothing of numbers the configured unit reads as plain steps", async () => {
        const session = createGraphSession({ features: [...ON] });
        await session.config.set({ data: { knownFields: { edgeTimeUnit: "ordinal" } } });
        const data = edges("created", [1_700_000_000_000, 1_700_000_100_000]);
        const draft = await session.data.prepare({ type: "csv", config: { data } });
        assert.isEmpty(draft.findings);
    });

    it("suggests a time column over guessing it as the weight", async () => {
        const data = edges("created", [1_700_000_100_000, 1_700_000_000_000]);
        const session = createGraphSession({ features: [...ON] });
        const draft = await session.data.prepare({ type: "csv", config: { data } }, { guess: "values" });
        assert.isUndefined(column(draft, "created").suggested);
        assert.equal(column(draft, "created").looksLike, "time");
        assert.equal(draft.findings[0].params.from, 1_700_000_000_000);
    });

    it("still guesses the weight from values with the timeline off", async () => {
        const data = edges("created", [1_700_000_100_000, 1_700_000_000_000]);
        const session = createGraphSession({ features: [] });
        const draft = await session.data.prepare({ type: "csv", config: { data } }, { guess: "values" });
        assert.equal(column(draft, "created").suggested, "weight");
    });

    it("lists what it reports among the candidates after the load", async () => {
        for (const [name, values] of [
            ["created", [1995, 2001]],
            ["start", ["1995", "2001"]],
            ["sent", ["2026-01-02", "2026-01-03"]],
        ] as const) {
            const session = createGraphSession({ features: [...ON] });
            const draft = await session.data.prepare({ type: "csv", config: { data: edges(name, values) } });
            assert.equal(draft.findings[0].params.column, name);
            await draft.load();
            assert.include(
                session.time.candidates().map((each) => each.column),
                name,
            );
        }
    });

    it("drops numbers the whole column reads as plain steps, though the sample reads as years", async () => {
        const draft = await prepare(edges("start", [1200, 1450, 2000, 2100, 2500, 3000, 50_000]));
        assert.isUndefined(column(draft, "start").looksLike);
        assert.isEmpty(draft.findings);
    });

    it("designates a column of a file whose format sets its roles", async () => {
        for (const [type, data] of [
            ["json", JSON_FILE],
            ["graphml", GRAPHML_FILE],
        ] as const) {
            const session = createGraphSession({ features: [...ON] });
            const draft = await session.data.prepare({ type, config: { data } });
            const edgeTable = draft.tables.find((table) => table.id === "edges");
            assert.isTrue(edgeTable?.fixed, type);
            assert.equal(draft.findings[0].params.table, "edges", type);
            await assertSpanMatchesDesignation(session, draft);
            assert.deepEqual(session.time.field, { edges: { start: "sent" } }, type);
        }
    });

    it("takes only time and its unit on a table the format sets", async () => {
        const session = createGraphSession({ features: [...ON] });
        const draft = await session.data.prepare({ type: "json", config: { data: JSON_FILE } });
        const refused = await draft
            .load({ mapping: { tables: { edges: { weight: "sent" } } } })
            .catch((e: unknown) => e);
        assert.equal((refused as { code?: string }).code, "E_BAD_COMMAND");
    });

    it("refuses a time choice on a table the format sets with the timeline off", async () => {
        const session = createGraphSession({ features: [] });
        const draft = await session.data.prepare({ type: "json", config: { data: JSON_FILE } });
        const refused = await draft.load({ mapping: { tables: { edges: { time: "sent" } } } }).catch((e: unknown) => e);
        assert.equal((refused as { code?: string }).code, "E_BAD_COMMAND");
    });

    it("is silent with the timeline off", async () => {
        const draft = await prepare(edges("sent", ["2026-01-02", "2026-01-03"]), []);
        assert.notProperty(column(draft, "sent"), "looksLike");
        assert.deepEqual(draft.findings, []);
    });
});
