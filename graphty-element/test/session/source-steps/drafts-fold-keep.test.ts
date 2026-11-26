/**
 * @file Merging the graph's own nodes into a waiting source's under No match: Keep. A node whose value
 * names no node 1 stays as it was, with its own id, whether or not its value repeats; and a card's count
 * of new nodes (`preview.made`) is the nodes the commit adds, as `preview.marks` says.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

// E4 names P8 once and E5, E6 name P9 twice: neither is a person.
const ENTRIES = csv("entries.csv", "entry,person", "E1,P1", "E2,P1", "E3,P2", "E4,P8", "E5,P9", "E6,P9");
const PEOPLE = csv("people.csv", "person,name", "P1,Ann", "P2,Bo", "P3,Cy");

async function folded(): Promise<{
    session: ReturnType<typeof createGraphSession>;
    d: ReturnType<ReturnType<typeof createGraphSession>["data"]["draft"]>;
}> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(ENTRIES, { key: "entry", type: "entry" });
    const people = await session.data.stage(PEOPLE, { key: "person", type: "person" });
    const d = session.data.draft();
    d.merge({ from: { source: session.data.sources()[0]?.key ?? "", field: "person" }, into: { source: people } });
    return { session, d };
}

describe("source-steps drafts: merging the graph's nodes into a waiting source, No match: Keep", () => {
    it("keeps each unmatched node with its own id, a repeated value or not", async () => {
        const { session, d } = await folded();
        assert.strictEqual(d.steps().at(-1)?.act?.unmatchedFrom ?? "keep", "keep");
        await d.commit();
        const ids = [...session.data.nodes()].map((n) => String(n.id)).sort();
        assert.deepStrictEqual(ids, ["E4", "E5", "E6", "P1", "P2", "P3"]);
        session.dispose();
    });

    it("counts as new nodes only what the commit adds", async () => {
        const { session, d } = await folded();
        const preview = d.preview();
        const steps = d
            .steps()
            .filter((row) => row.op !== "join.add" || row.joined === true)
            .map((row) => row.index);
        assert.strictEqual(preview.marks.nodes.new, 3, "the three people");
        assert.strictEqual(preview.made(steps).nodes.new, preview.marks.nodes.new);
        d.dispose();
        session.dispose();
    });
});
