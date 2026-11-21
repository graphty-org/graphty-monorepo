/**
 * @file A draft's step order and its Remove of a source the steps do not build: an edited act can
 * go back to its step's place, and a source a file saved without the experiment brought in is
 * refused with a code, so `data.removeSource` takes it out instead of a commit that leaves its
 * nodes behind.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import { refused } from "./scenario";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns What `import` takes.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

describe("draft.moveStep", () => {
    it("puts an edited act back at its step's place, ahead of the steps after it", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("entries.csv", "badge,door\nb1,d1\nb2,d2"), { key: "badge", type: "badge" });
        const entries = session.data.sources({ staged: true })[0]?.key ?? "";
        const people = await session.data.stage(csv("people.csv", "badge,name\nb1,Ann\nb2,Bo"), {
            key: "badge",
            type: "person",
        });
        await session.data.add(people);
        const d0 = session.data.draft();
        d0.connect({ from: { source: entries, field: "badge" }, into: { source: people, field: "badge" } });
        await d0.commit();
        const hr = await session.data.stage(csv("hr.csv", "badge,dept\nb1,IT"), { key: "badge", type: "person" });
        await session.data.add(hr, { overlap: "merge" });
        const before = session.data.steps().map((row) => `${row.op} ${row.source}`);
        assert.lengthOf(before, 4);
        assert.strictEqual(session.data.steps()[2]?.op, "join.edges");

        const d = session.data.draft();
        d.removeStep(2);
        d.connect({
            from: { source: entries, field: "badge" },
            into: { source: people, field: "badge" },
            direction: "from-into",
        });
        d.moveStep(d.steps().length - 1, 2);
        await d.commit();
        const after = session.data.steps();
        assert.deepStrictEqual(
            after.map((row) => `${row.op} ${row.source}`),
            before,
            "the edited step keeps place 3 and the steps after it keep theirs",
        );
        assert.strictEqual(after[2]?.act?.direction, "from-into");
        session.dispose();
    });

    it("refuses a place no step has, and a step read before the step that adds its source", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("a.csv", "id\np1"), { key: "id", type: "person" });
        const b = await session.data.stage(csv("b.csv", "id\np2"), { key: "id", type: "thing" });
        await session.data.add(b);
        const a = session.data.sources({ staged: true }).find((s) => s.key !== b)?.key ?? "";
        const d = session.data.draft();
        d.connect({ from: { source: b, field: "id" }, into: { source: a, field: "id" } });
        await refused(() => {
            d.moveStep(9, 0);
            return Promise.resolve();
        }, "E_BAD_COMMAND");
        await refused(() => {
            d.moveStep(0, 9);
            return Promise.resolve();
        }, "E_BAD_COMMAND");
        await refused(() => {
            d.moveStep(2, 0);
            return Promise.resolve();
        }, "E_BAD_COMMAND");
        assert.lengthOf(d.steps(), 3, "a refused move changes nothing");
        d.dispose();
        session.dispose();
    });
});

describe("draft.removeSource on a source the steps do not build", () => {
    it("is refused with not-in-steps, and data.removeSource takes it out", async () => {
        const off = createGraphSession({ features: [] });
        await off.data.import({ type: "csv", config: { data: "source,target\na,b\nb,c" } });
        const { text } = await off.project.save();
        off.dispose();

        const session = createGraphSession({ features: ["source-steps"] });
        await session.project.open(text);
        const [source] = session.data.sources();
        assert.isDefined(source);
        const key = source?.key ?? "";
        assert.lengthOf(session.data.steps(), 0);
        assert.isAbove(session.data.count().nodes, 0);

        const d = session.data.draft();
        const details = await refused(() => {
            d.removeSource(key);
            return Promise.resolve();
        }, "E_BAD_COMMAND");
        assert.strictEqual(details.reason, "not-in-steps");
        d.dispose();

        await session.data.removeSource(key);
        assert.strictEqual(session.data.count().nodes, 0, "its nodes go with it");
        assert.lengthOf(session.data.sources(), 0);
        session.dispose();
    });
});
