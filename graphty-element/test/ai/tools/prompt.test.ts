/**
 * @file The facts block a message is sent with: a typed message's is exactly today's, and a spoken
 * one names, in order, the nodes the reader pointed at while talking and the nodes selected then.
 */

import { assert, describe, it } from "vitest";

import { FACT_IDS_CAP, factsBlock } from "../../../src/ai/tools/prompt";
import { assistantSession } from "../../helpers/assistant";

describe("the facts block", () => {
    it("is unchanged for a typed message", async () => {
        const session = await assistantSession();
        await session.selection.apply({ ids: ["a", "c"] });
        // Golden: the block before pointing existed.
        assert.strictEqual(
            factsBlock(session, "standard"),
            'Graph: 5 nodes, 5 edges, directed, 3d, layout force.\nNode ids: "a", "b", "c", "d", "e".\nAttributes: data.id (node string), data.label (node string), data.type (node category), data.team (node category), data.load (node number), data.weight (edge number).\nSelected: 2.',
        );
        assert.strictEqual(
            factsBlock(session, "small"),
            'Graph: 5 nodes, 5 edges, directed, 3d, layout force.\nNode ids: "a", "b", "c", "d", "e".\nAttributes: data.id (node string), data.label (node string), data.type (node category), data.team (node category), data.load (node number), data.weight (edge number).',
        );
    });

    it("lists what was pointed at, in order, and what was selected, by id", async () => {
        const session = await assistantSession();
        await session.selection.apply({ ids: ["a", "c"] });
        const typed = factsBlock(session, "standard");
        const spoken = factsBlock(session, "standard", { pointed: ["e", "b", "d"], selected: ["d"] });
        const lines = spoken.split("\n");
        assert.include(lines, 'Pointed at, in order: "e", "b", "d".');
        assert.include(lines, 'Selected: "d".');
        // The ids replace the count; nothing else changes.
        assert.notInclude(lines, "Selected: 2.");
        assert.deepStrictEqual(
            lines.filter((line) => !line.startsWith("Pointed at") && !line.startsWith("Selected")),
            typed.split("\n").filter((line) => !line.startsWith("Selected")),
        );
    });

    it("the small profile gets the lines too, and an empty record adds none", async () => {
        const session = await assistantSession();
        const small = factsBlock(session, "small", { pointed: [3], selected: [] });
        assert.include(small.split("\n"), "Pointed at, in order: 3.");
        assert.notInclude(small, "Selected");
        assert.strictEqual(factsBlock(session, "small", { pointed: [], selected: [] }), factsBlock(session, "small"));
    });

    it("lists at most the profile's cap: the latest pointed at, the first selected", async () => {
        const session = await assistantSession();
        const many = Array.from({ length: 30 }, (_, index) => `n${String(index)}`);
        for (const profile of ["standard", "small"] as const) {
            const cap = FACT_IDS_CAP[profile];
            const lines = factsBlock(session, profile, { pointed: many, selected: many }).split("\n");
            const pointed = lines.find((line) => line.startsWith("Pointed at"));
            const selected = lines.find((line) => line.startsWith("Selected"));
            const latest = many.slice(-cap).map((id) => JSON.stringify(id));
            assert.strictEqual(pointed, `Pointed at, in order: ${latest.join(", ")} (${String(30 - cap)} more).`);
            const first = many.slice(0, cap).map((id) => JSON.stringify(id));
            assert.strictEqual(selected, `Selected: ${first.join(", ")} (${String(30 - cap)} more).`);
        }
    });
});
