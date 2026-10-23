/**
 * A third party's source, written with only what `./extend` exports, loads through
 * `DataSource.fromSource`, and a failure is a `GraphtyError` with the source's code.
 */

import { assert, describe, it } from "vitest";

import { DataSource, defineSource, type GraphtyError, registerSource, replayFetch } from "../../extend";

const API = "https://people.example.com";

// the 15-line source of the guide, from ./extend alone
const people = defineSource({
    id: "people-extend",
    async records(params: { team: string }, ctx) {
        const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
            `/api/people?team=${encodeURIComponent(params.team)}`,
        );
        return {
            nodes: rows.map((r) => ({ id: r.id, name: r.name })),
            edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
        };
    },
});

/**
 * Every node and edge a reader yields.
 * @param reader - the reader
 * @returns the records
 */
async function drain(
    reader: DataSource,
): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of reader.getData()) {
        nodes.push(...(chunk.nodes as unknown as Record<string, unknown>[]));
        edges.push(...(chunk.edges as unknown as Record<string, unknown>[]));
    }
    return { nodes, edges };
}

describe("DataSource.fromSource", () => {
    const fetch = replayFetch([
        {
            url: `${API}/api/people?team=core`,
            body: [
                { id: "ana", name: "Ana", knows: ["bo"] },
                { id: "bo", name: "Bo", knows: [] },
            ],
        },
        { url: `${API}/api/people?team=secret`, status: 401 },
    ]);

    it("loads a custom source with its params and the load options in one config", async () => {
        const People = DataSource.fromSource(people);
        assert.strictEqual(People.type, "people-extend");
        const { nodes, edges } = await drain(new People({ team: "core", endpoint: API, fetch }));
        assert.deepEqual(
            nodes.map((n) => [n.id, n.name]),
            [
                ["ana", "Ana"],
                ["bo", "Bo"],
            ],
        );
        assert.strictEqual(edges.length, 1);
    });

    it("loads a registered source by id", async () => {
        registerSource({ ...people, id: "people-by-id" });
        const ById = DataSource.fromSource("people-by-id");
        const { nodes } = await drain(new ById({ team: "core", endpoint: API, fetch }));
        assert.strictEqual(nodes.length, 2);
    });

    it("fails with a GraphtyError carrying the source's code and params", async () => {
        const People = DataSource.fromSource(people);
        const error: unknown = await drain(new People({ team: "secret", endpoint: API, fetch })).then(
            () => null,
            (e: unknown) => e,
        );
        assert.strictEqual((error as GraphtyError).code, "E_SOURCE_AUTH");
        assert.deepInclude((error as GraphtyError).details, { origin: API, status: 401 });
    });
});
