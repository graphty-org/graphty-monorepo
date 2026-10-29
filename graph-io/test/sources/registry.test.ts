/**
 * The source registry: the six built-ins listed without loading code, lazy loading on first use,
 * unknown ids, and the optional methods.
 */

import { describe, expect, it } from "vitest";

import {
    createRegistry,
    defineSource,
    GraphBuilder,
    type LazySource,
    listSources,
    loadFromSource,
} from "../../src/index.js";
import { rejection } from "./helpers.js";

const BUILTIN = ["ndex", "cypher", "neo4j", "neptune", "rest", "openalex", "sparql"];

describe("the default registry", () => {
    it("lists seven built-in sources with descriptors and loads none of them", () => {
        const formats = createRegistry();
        const listed = formats.listSources();
        expect(listed.map((s) => s.id)).toEqual(BUILTIN);
        expect(listed.every((s) => !s.loaded && s.descriptor.plainName.length > 0)).toBe(true);
        expect(listSources().map((s) => s.id)).toEqual(expect.arrayContaining(BUILTIN));
    });

    it("loads a built-in source's code on first use only", async () => {
        const formats = createRegistry();
        const ndex = await formats.source("ndex");
        expect(ndex.id).toBe("ndex");
        expect(formats.listSources().find((s) => s.id === "ndex")?.loaded).toBe(true);
        expect(formats.listSources().find((s) => s.id === "neo4j")?.loaded).toBe(false);
    });

    it("answers E_SOURCE_UNKNOWN with the known ids", async () => {
        const err = await rejection(loadFromSource("nope", {}));
        expect(err.issue?.code).toBe("E_SOURCE_UNKNOWN");
        expect(err.issue?.params).toMatchObject({ id: "nope", known: expect.arrayContaining(BUILTIN) as unknown });
    });
});

describe("lazy sources", () => {
    it("load once, on first use, and are checked against their declared features", async () => {
        let loads = 0;
        const lazy: LazySource = {
            id: "later",
            descriptor: { plainName: "Later", params: [] },
            load: () => {
                loads++;
                return Promise.resolve(
                    defineSource({ id: "later", records: () => Promise.resolve({ nodes: [{ id: 1 }] }) }),
                );
            },
        };
        const formats = createRegistry();
        formats.registerSource(lazy);
        expect(loads).toBe(0);
        await Promise.all([formats.loadFromSource("later", {}), formats.loadFromSource("later", {})]);
        expect(loads).toBe(1);

        const liar: LazySource = {
            ...lazy,
            id: "liar",
            descriptor: { plainName: "L", params: [], features: ["expand"] },
            load: () => Promise.resolve(defineSource({ id: "liar", records: () => Promise.resolve({}) })),
        };
        formats.registerSource(liar);
        const err = await rejection(formats.loadFromSource("liar", {}));
        expect(err.issue?.params).toEqual({ id: "liar", reason: "features" });

        const wrong: LazySource = {
            ...lazy,
            id: "wrong",
            load: () => Promise.resolve(defineSource({ id: "other", records: () => Promise.resolve({}) })),
        };
        formats.registerSource(wrong);
        expect((await rejection(formats.loadFromSource("wrong", {}))).issue?.params).toEqual({
            id: "wrong",
            reason: "lazy",
        });
    });
});

describe("optional methods", () => {
    const full = defineSource({
        id: "full",
        descriptor: {
            plainName: "Full",
            params: [{ name: "q", plainName: "Q", type: "string", required: true }],
            features: ["expand", "probe", "list", "validate"],
        },
        records: () => Promise.resolve({}),
        async expand(request, sink, ctx) {
            for (const id of request.ids) {
                sink.addEdge(id, `${String(id)}-n`);
            }
            ctx.report.counts.edges += request.ids.length;
            return Promise.resolve(ctx.finish({ next: { page: 2 } }));
        },
        probe: () => Promise.resolve({ ok: true as const, counts: { nodes: 3 } }),
        list: (query) => Promise.resolve({ items: [{ params: { q: query.search ?? "" }, name: "n" }], next: null }),
        validate: (_params, seen) =>
            Promise.resolve({ status: "current" as const, via: "etag" as const, validators: seen }),
    });

    it("expand gives a snapshot of only what was fetched, with the cursor", async () => {
        const formats = createRegistry();
        const { snapshot, report, format } = await formats.expandFromSource(full, {
            params: { q: "x" },
            ids: ["a", "b"],
        });
        expect([snapshot.nodeCount, snapshot.edgeCount, format]).toEqual([4, 2, "source:full"]);
        expect(report.source?.next).toEqual({ page: 2, "~v": 1 });
    });

    it("probe, list and validate delegate through a context", async () => {
        const formats = createRegistry();
        expect(await formats.probeSource(full, { q: "x" })).toEqual({ ok: true, counts: { nodes: 3 } });
        // a search does not need the required params
        expect((await formats.listFromSource(full, { params: {}, search: "s" })).items[0].params).toEqual({ q: "s" });
        expect((await formats.validateSource(full, { q: "x" }, { etag: "e" })).validators).toEqual({ etag: "e" });
        expect((await rejection(formats.probeSource(full, {}))).issue?.params).toEqual({
            name: "q",
            reason: "required",
        });
    });

    it("a source without a method answers E_SOURCE_UNSUPPORTED", async () => {
        const bare = defineSource({ id: "bare", records: () => Promise.resolve({}) });
        const formats = createRegistry();
        for (const call of [
            formats.expandFromSource(bare, { params: {}, ids: [1] }),
            formats.probeSource(bare, {}),
            formats.listFromSource(bare, { params: {} }),
            formats.validateSource(bare, {}, {}),
        ]) {
            const err = await rejection(call);
            expect(err.issue?.code).toBe("E_SOURCE_UNSUPPORTED");
        }
    });

    it("importFromSource writes into the caller's sink", async () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        const people = defineSource({
            id: "people",
            records: () => Promise.resolve({ edges: [{ source: "a", target: "b" }] }),
        });
        const report = await createRegistry().importFromSource(people, {}, builder);
        expect(report.counts.edges).toBe(1);
        expect(builder.freeze().edgeCount).toBe(1);
    });
});
