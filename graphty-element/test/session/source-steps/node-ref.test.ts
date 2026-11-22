/**
 * @file `data.nodeRef(id)`: the id space and key of a node in the graph, by its id (design
 * design/data/multiple-data-sources-design.md, section 5.2), what a join card opened from a node's
 * inspector fills Field 1 with. The inverse of `data.ref(key)`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import { refused } from "./scenario";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its lines.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, ...data: string[]): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data: data.join("\n") }, name };
}

const PEOPLE = csv("people.csv", "badge,name", "B1,Ann", "B2,Bo");
const BUILDINGS = csv("buildings.csv", "door,building", "D1,North");

describe("source-steps: data.nodeRef", () => {
    it("names each node's space and key, and is the inverse of ref", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge", type: "person" });
        await session.data.add(await session.data.stage(BUILDINGS, { key: "door", type: "building" }));
        const ids = session.data.nodes().map((node) => node.id);
        assert.strictEqual(ids.length, 3);
        const refs = ids.map((id) => session.data.nodeRef(id));
        assert.deepStrictEqual(refs.map((ref) => `${ref?.space ?? ""}:${ref?.key ?? ""}`).sort(), [
            "building:D1",
            "person:B1",
            "person:B2",
        ]);
        for (const ref of refs) {
            assert.deepStrictEqual(session.data.ref(ref?.key ?? "", { space: ref?.space ?? "" }), ref);
        }
        assert.isNull(session.data.nodeRef("nobody"), "an id no node holds");
    });

    it("is refused with the experiment off", async () => {
        const session = createGraphSession();
        await refused(() => Promise.resolve().then(() => session.data.nodeRef("B1")), "E_FEATURE_OFF");
    });
});
