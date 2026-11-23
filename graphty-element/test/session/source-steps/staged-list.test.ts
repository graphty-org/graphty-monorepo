/**
 * @file A staged source is no part of the graph (design design/data/multiple-data-sources-design.md,
 * section 5.1): `data.sources()` leaves it out while the source-steps experiment is on,
 * `data.staged()` lists it, `sources({ staged: true })` lists both, and a save keeps it. Also each
 * space row says which source's own space it is, so a consumer can name it by that source.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

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
const VISITORS = csv("visitors.csv", "badge,name", "B1,Ann", "V1,Val");

describe("source-steps: staged sources are listed apart", () => {
    it("leaves a staged source out of sources() and lists it in staged()", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge", type: "person" });
        const visitors = await session.data.stage(VISITORS, { key: "badge", type: "person" });

        assert.deepStrictEqual(
            session.data.sources().map((each) => each.name),
            ["people.csv"],
        );
        assert.deepStrictEqual(
            session.data.staged().map((each) => each.key),
            [visitors],
        );
        assert.deepStrictEqual(
            session.data.sources({ staged: true }).map((each) => each.name),
            ["people.csv", "visitors.csv"],
        );
        // Read twice, the same lists: a consumer re-rendering on each read gets stable values.
        assert.strictEqual(session.data.sources(), session.data.sources());
        assert.strictEqual(session.data.staged(), session.data.staged());

        const draft = session.data.draft();
        draft.add(visitors);
        await draft.commit();
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.name),
            ["people.csv", "visitors.csv"],
        );
        assert.deepStrictEqual(session.data.staged(), []);
    });

    it("keeps a staged source through a save and reopen", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge", type: "person" });
        await session.data.stage(VISITORS, { key: "badge", type: "person" });
        const { text } = await session.project.save();

        const reopened = createGraphSession({ features: ["source-steps"] });
        await reopened.project.open(text);
        assert.deepStrictEqual(
            reopened.data.staged().map((each) => each.name),
            ["visitors.csv"],
        );
        assert.deepStrictEqual(
            reopened.data.sources().map((each) => each.name),
            ["people.csv"],
        );
    });

    it("names the source a space belongs to when no space was named", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge" });
        await session.data.stage(VISITORS, { key: "badge", type: "person" });
        const draft = session.data.draft();
        draft.add(session.data.staged()[0]?.key ?? "");
        await draft.commit();

        const [people] = session.data.sources();
        const own = session.data.spaces().find((row) => row.ownedBy !== undefined);
        assert.strictEqual(own?.ownedBy, people?.key);
        const named = session.data.spaces().find((row) => row.space === "person");
        assert.isDefined(named);
        assert.isUndefined(named?.ownedBy);
    });
});
