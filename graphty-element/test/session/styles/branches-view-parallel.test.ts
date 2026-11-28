/**
 * @file A draft view (`styles.showDraft`) draws an edge a join adds beside an edge the graph already holds between the
 * same two nodes (#10209): the added edge is marked new and drawn curved, so it fans out of the straight edge it
 * would otherwise lie on top of.
 */

import { assert, describe, it } from "vitest";

import type { EdgeId } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

describe("showDraft: an added edge parallel to an existing one", () => {
    it("marks the joined A-B edge new and curves it apart from the existing straight A-B edge", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,name", "A,Ann", "B,Bo"), { key: "badge", type: "person" });
        const people = session.data.sources()[0]?.key ?? "";
        const links = await session.data.stage(csv("links.csv", "row,from,to", "r1,A,B"), { key: "row" });
        const first = session.data.draft();
        first.connect({
            from: { source: links, field: "from" },
            into: { source: people },
            to: { field: "to", into: { source: people } },
        });
        await first.commit();
        const held = session.data.edges().map((edge) => edge.id);
        const ends = (edge: { source: unknown; target: unknown }): string =>
            [String(edge.source), String(edge.target)].sort().join("-");

        const more = await session.data.stage(csv("more.csv", "row,from,to", "m1,A,B"), { key: "row" });
        const d = session.data.draft();
        d.connect({
            from: { source: more, field: "from" },
            into: { source: people },
            to: { field: "to", into: { source: people } },
            edgeType: "again",
        });
        await d.display(true);
        session.styles.showDraft({ merged: "#7048E8", new: "#E8590C" });
        await session.styles.settled();

        const look = (id: EdgeId): Readonly<Record<string, unknown>> => session.styles.explain({ edge: id }).merged;
        const added = session.data.edges().filter((edge) => !held.includes(edge.id));
        assert.isAbove(held.length, 0, "the graph holds an edge before the join");
        assert.isAbove(added.length, 0, "the join adds an edge");
        assert.strictEqual(added.length, d.preview().edges.added, "every added edge is drawn");
        assert.deepStrictEqual(
            session.data.edges().map(ends),
            ["A-B", "A-B"],
            "the joined edge runs beside the held one",
        );
        for (const edge of added) {
            assert.strictEqual(look(edge.id)["edge.style"], "dash", "an added edge is dashed");
            assert.strictEqual(look(edge.id)["edge.curvature"], true, "an added edge is curved, so it fans out");
        }
        for (const id of held) {
            assert.notStrictEqual(look(id)["edge.curvature"], true, "a held edge keeps the line between its nodes");
        }
        d.dispose();
        session.dispose();
    });
});
