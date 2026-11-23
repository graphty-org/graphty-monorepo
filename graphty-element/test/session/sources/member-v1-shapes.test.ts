/**
 * @file The `graphty-sources` member read from the sparse shapes older files hold: version 1
 * records and items missing the members an earlier release left out, legacy fields of the wrong
 * type, and version 2 entries holding a part of another kind (design/documents/sources.md). Each
 * test opens a file, then reads what the session lists and what a save writes back.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";

type Problem = { code: string; params: Record<string, unknown> };
type Doc = { members: Record<string, unknown>[] };

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A project file holding two nodes, the data member's legacy fields, a session member (so it is a
 * project, not a plain document) and a sources member.
 * @param data - more members of the data member (`sources`, `provenance`)
 * @param sources - the sources member
 * @returns the file's text
 */
function file(data: Record<string, unknown>, sources: Record<string, unknown>): string {
    return JSON.stringify({
        kind: "graphty-document",
        version: 1,
        generator: { name: "graphty-element", version: "3.29.3" },
        requires: ["graphty-data", "graphty-session"],
        members: [
            {
                kind: "graphty-data",
                version: 1,
                format: "json",
                dialect: "node-link",
                graph: {
                    nodes: [{ id: "a", "_source.loads": ["r1"] }, { id: "b" }],
                    links: [{ source: "a", target: "b" }],
                },
                ...data,
            },
            { kind: "graphty-session", version: 1, config: {} },
            { kind: "graphty-sources", ...sources },
        ],
    });
}

/**
 * Open a file in a fresh session.
 * @param text - the file
 * @returns the session and what the open reported
 */
async function open(text: string): Promise<{ session: GraphSession; problems: readonly Problem[] }> {
    const session = createGraphSession();
    sessions.push(session);
    const report = await session.project.open(text);
    return { session, problems: report.problems };
}

/**
 * The entries a save of the session writes, by id.
 * @param session - the session
 * @returns the entries
 */
async function savedEntries(session: GraphSession): Promise<Map<unknown, Record<string, unknown>>> {
    const doc = JSON.parse((await session.project.save()).text) as Doc;
    const member = doc.members.find((each) => each.kind === "graphty-sources");
    assert.isDefined(member, "the save writes a sources member");
    const loads = member.loads as Record<string, unknown>[];
    return new Map(loads.map((entry) => [entry.id, entry]));
}

describe("the sources member: sparse version 1 files", () => {
    it("a bare version 1 record with no data items becomes one replacing entry with the defaults", async () => {
        const { session, problems } = await open(
            file(
                {},
                {
                    version: 1,
                    loads: [{ key: "r1", source: "v1-gone", version: 3, expansions: [{ ids: ["a"], depth: 1 }] }],
                },
            ),
        );
        assert.deepInclude(problems, {
            code: "W_VERSION_UPGRADED",
            params: { kind: "graphty-sources", pointer: "/members/2", found: 1, version: 2 },
        });
        assert.deepEqual(
            session.data.sources().map((each) => [each.key, each.kind, each.counts]),
            [["r1", "server", { nodes: 1, edges: 0 }]],
        );
        assert.deepEqual(session.data.pendingSourceLoads(), [], "a source this release lacks is not offered");

        const entry = (await savedEntries(session)).get("r1");
        assert.isDefined(entry);
        assert.strictEqual(entry.mode, "replace", "the only load replaces");
        assert.notProperty(entry, "total", "a record with no total has none");
        assert.notProperty(entry, "options");
        assert.deepEqual(entry.source, {
            id: "v1-gone",
            sourceVersion: 3,
            endpoint: null,
            params: {},
            pages: 1,
            next: null,
            validators: {},
            expansions: [{ id: "r1/x1", ids: ["a"], depth: 1, next: null, validators: {} }],
        });
    });

    it("a record whose options name no mode and whose credential is null keeps its options and no slot", async () => {
        const { session } = await open(
            file(
                {},
                {
                    version: 1,
                    loads: [
                        { key: "r1", source: "v1-gone", version: 1, expansions: [] },
                        {
                            key: "r2",
                            source: "v1-gone",
                            version: 1,
                            options: { mode: "upsert", limit: 5 },
                            config: { q: "x" },
                            credential: null,
                            loadedAt: "2026-10-19T08:00:00.000Z",
                            total: 9,
                            pages: 2,
                            next: { page: 3 },
                            endpoint: "https://api.example.test/",
                            expansions: [],
                        },
                    ],
                },
            ),
        );
        const saved = await savedEntries(session);
        const second = saved.get("r2");
        assert.isDefined(second);
        assert.strictEqual(second.mode, "merge", "an unknown mode falls back to merging a later load");
        assert.strictEqual(second.loadedAt, "2026-10-19T08:00:00.000Z");
        assert.deepEqual(second.total, { nodes: 9 });
        assert.deepInclude(second.source as object, {
            endpoint: "https://api.example.test/",
            params: { q: "x" },
            pages: 2,
            next: { page: 3 },
        });
        assert.notProperty(second.source, "credentialSlot");
    });

    it("a version 1 member whose loads are not records is skipped, naming its loads", async () => {
        for (const loads of [undefined, [{ key: "r1" }], [{ key: 1, source: "s", expansions: [] }]]) {
            const { session, problems } = await open(file({}, { version: 1, loads }));
            assert.deepInclude(problems, {
                code: "E_BAD_DOCUMENT",
                params: { kind: "graphty-sources", pointer: "/members/2/loads" },
            });
            assert.deepEqual(session.data.sources(), []);
        }
    });

    it("items with no config, no name or no type upgrade to the plainest entry of their kind", async () => {
        const { session } = await open(
            file(
                {
                    sources: [
                        { key: "s1", kind: "server", added: { nodes: 0, edges: 0 } },
                        { key: "s2", kind: "sample", config: { url: "https://x.test/d.json" } },
                        { key: "s3", kind: "sample", name: "karate-club-no-such" },
                        { key: "s4", kind: "file", type: "csv", tables: ["t"] },
                        { key: "s5", kind: "file", config: { url: "https://x.test/plain.csv" } },
                        "not an item",
                    ],
                    provenance: { s1: "not supplied", s2: { nodes: ["a"], edges: "none" } },
                },
                { version: 1, loads: [] },
            ),
        );
        assert.deepEqual(
            session.data.sources().map((each) => [each.key, each.kind]),
            [
                ["s1", "server"],
                ["s2", "sample"],
                ["s3", "sample"],
                ["s4", "file"],
                ["s5", "url"],
            ],
        );
        const saved = await savedEntries(session);
        assert.deepInclude(saved.get("s1")?.source as object, {
            id: "",
            sourceVersion: 1,
            endpoint: null,
            params: {},
        });
        assert.deepEqual(saved.get("s2")?.sample, { dataset: "sample" });
        assert.deepEqual(saved.get("s3")?.sample, { dataset: "karate-club-no-such" });
        assert.deepEqual(saved.get("s4")?.file, {}, "a file with no name or size records neither");
        assert.deepEqual(saved.get("s4")?.tables, ["t"]);
        const url = saved.get("s5")?.url as Record<string, unknown> | undefined;
        assert.strictEqual(url?.address, "https://x.test/plain.csv");
        assert.isFalse(Number.isNaN(Date.parse(String(url?.fetchedAt))), "the URL entry carries a time it was read");
        assert.notProperty(url, "dropped", "a URL with nothing secret drops nothing");
    });

    it("an item with no key upgrades to an entry with no id, so the member is skipped", async () => {
        const { session, problems } = await open(
            file({ sources: [{ kind: "file", name: "a.csv" }] }, { version: 1, loads: [] }),
        );
        assert.isTrue(
            problems.some((each) => each.code === "E_BAD_DOCUMENT" && each.params.kind === "graphty-sources"),
            JSON.stringify(problems),
        );
        assert.deepEqual(session.data.sources(), []);
    });
});

describe("the sources member: version 2 entry parts", () => {
    it("an entry holding a part of another kind cannot run, naming that part", async () => {
        const { problems } = await open(
            file(
                {},
                {
                    version: 2,
                    loads: [
                        {
                            id: "s1",
                            kind: "file",
                            loadedAt: "2026-10-19T08:00:00.000Z",
                            mode: "replace",
                            file: { name: "a.csv" },
                            url: { address: "https://x.test/a.csv" },
                        },
                    ],
                },
            ),
        );
        assert.deepInclude(problems, {
            code: "E_BAD_DOCUMENT",
            params: { kind: "graphty-sources", pointer: "/members/2/loads/0/url" },
        });
    });

    it("an entry with no counts lists zero nodes and edges added", async () => {
        const { session } = await open(
            file(
                {},
                {
                    version: 2,
                    loads: [
                        {
                            id: "s1",
                            kind: "file",
                            loadedAt: "2026-10-19T08:00:00.000Z",
                            mode: "replace",
                            file: { name: "a.csv" },
                        },
                    ],
                },
            ),
        );
        const [load] = session.data.sources();
        assert.strictEqual(load.key, "s1");
        assert.deepEqual(load.added, { nodes: 0, edges: 0 });
    });
});
