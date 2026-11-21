/**
 * Giving a node column a location role (`data.setRole` with a location kind) designates one column
 * per kind in `data.knownFields`, keeps the other kinds already designated, and taking the last
 * one away writes `nodeLocationRole: "none"` so the element stops finding a location.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const PLACES = "id,nation,town,label\na,France,Paris,one\nb,Japan,Tokyo,two\nc,Peru,Lima,three\n";

/**
 * A session holding the places as nodes.
 * @returns The session.
 */
async function places(): Promise<GraphSession> {
    const session = createGraphSession({ workingGraph: false });
    const draft = await session.data.prepare({ type: "csv", config: { data: PLACES }, name: "places.csv" });
    await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * The location fields of `data.knownFields`.
 * @param session - The session.
 * @returns The fields.
 */
function location(session: GraphSession): Record<string, unknown> {
    const known = session.config.data.knownFields as Record<string, unknown>;
    return {
        country: known.nodeCountryPath ?? null,
        city: known.nodeCityPath ?? null,
        role: known.nodeLocationRole ?? null,
    };
}

describe("data.setRole with a location kind", () => {
    it("designates one column per kind, keeping a city column the element detected beside it", async () => {
        const session = await places();
        await session.data.setRole({ kind: "node", name: "nation" }, "country");
        // The town column was read as cities before any role was given; it stays listed.
        assert.deepStrictEqual(location(session), { country: "nation", city: "town", role: null });

        await session.data.setRole({ kind: "node", name: "town" }, "city");
        assert.deepStrictEqual(location(session), { country: "nation", city: "town", role: null });
        session.dispose();
    });

    it("moves a kind to the column given it last", async () => {
        const session = await places();
        await session.data.setRole({ kind: "node", name: "nation" }, "city");
        await session.data.setRole({ kind: "node", name: "town" }, "city");
        assert.deepStrictEqual(location(session), { country: null, city: "town", role: null });
        session.dispose();
    });

    it('takes one kind away, keeps the rest, and writes "none" when the last goes', async () => {
        const session = await places();
        await session.data.setRole({ kind: "node", name: "nation" }, "country");
        await session.data.setRole({ kind: "node", name: "town" }, "city");

        await session.data.setRole({ kind: "node", name: "nation" }, null);
        assert.deepStrictEqual(location(session), { country: null, city: "town", role: null });

        await session.data.setRole({ kind: "node", name: "town" }, null);
        assert.deepStrictEqual(location(session), { country: null, city: null, role: "none" });

        await session.undo();
        assert.deepStrictEqual(location(session), { country: null, city: "town", role: null }, "each is one undo step");
        session.dispose();
    });

    it("leaves the location alone when a column that is no location loses its roles", async () => {
        const session = await places();
        await session.data.setRole({ kind: "node", name: "nation" }, "country");
        await session.data.setRole({ kind: "node", name: "label" }, "label");
        const before = location(session);
        await session.data.setRole({ kind: "node", name: "label" }, null);
        assert.deepStrictEqual(location(session), before);
        session.dispose();
    });
});
