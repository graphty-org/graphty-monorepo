/**
 * The parameter checks a load runs against the descriptor before any request, and the root
 * functions that wrap the default registry.
 */

import { describe, expect, it } from "vitest";

import {
    defineSource,
    expandFromSource,
    GraphBuilder,
    importFromSource,
    listFromSource,
    loadFromSource,
    probeSource,
    registerSource,
    replayFetch,
    validateSource,
} from "../../src/index.js";
import { rejection } from "./helpers.js";

const checked = defineSource({
    id: "checked",
    descriptor: {
        plainName: "Checked",
        params: [
            { name: "flag", plainName: "Flag", type: "boolean" },
            {
                name: "pick",
                plainName: "Pick",
                type: "enum",
                values: [
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                ],
            },
            { name: "link", plainName: "Link", type: "url" },
            { name: "ratio", plainName: "Ratio", type: "number", min: 0, max: 1 },
            { name: "named", plainName: "Named", type: "string", required: true, default: "x" },
        ],
        features: ["expand", "probe", "list", "validate"],
    },
    records: (params: Record<string, unknown>) => Promise.resolve({ nodes: [{ id: String(params.named) }] }),
    expand: (request, sink, ctx) => {
        sink.addNode(request.ids[0]);
        return Promise.resolve(ctx.finish());
    },
    probe: () => Promise.resolve({ ok: true as const }),
    list: () => Promise.resolve({ items: [], next: null }),
    validate: () => Promise.resolve({ status: "unverifiable" as const, validators: {} }),
});

describe("parameter checks", () => {
    it.each([
        [{ flag: "yes" }, "flag", "type"],
        [{ pick: "c" }, "pick", "enum"],
        [{ link: "not a url" }, "link", "type"],
        [{ link: "https://u:p@example.com/" }, "link", "credentials-in-url"],
        [{ ratio: 2 }, "ratio", "range"],
        [{ ratio: "half" }, "ratio", "type"],
    ])("refuses %j", async (params, name, reason) => {
        const fetch = replayFetch([]);
        const err = await rejection(loadFromSource(checked, params, { fetch }));
        expect(err.issue?.params).toEqual({ name, reason });
        expect(fetch.calls).toHaveLength(0);
    });

    it("accepts valid values and fills a required param's default", async () => {
        const { snapshot } = await loadFromSource(checked, {
            flag: true,
            pick: "b",
            link: "https://example.com/x",
            ratio: 0.5,
        });
        expect([...snapshot.ids]).toEqual(["x"]);
    });

    it("refuses params that are not an object, and an endpoint that is not a URL", async () => {
        expect((await rejection(loadFromSource(checked, null as never))).issue?.params).toEqual({
            name: "params",
            reason: "type",
        });
        expect((await rejection(loadFromSource(checked, {}, { endpoint: "nope" }))).issue?.params).toEqual({
            name: "endpoint",
            reason: "type",
        });
        expect(
            (await rejection(loadFromSource(checked, {}, { endpoint: "https://u:p@example.com" }))).issue?.params,
        ).toEqual({
            name: "endpoint",
            reason: "credentials-in-url",
        });
    });
});

describe("the root functions", () => {
    it("reach the default registry", async () => {
        registerSource({ ...checked, id: "checked-root" });
        expect((await probeSource("checked-root", {})).ok).toBe(true);
        expect((await listFromSource("checked-root", { params: {} })).items).toEqual([]);
        expect((await validateSource("checked-root", {}, {})).status).toBe("unverifiable");
        expect((await expandFromSource("checked-root", { params: {}, ids: ["s"] })).snapshot.nodeCount).toBe(1);
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        expect((await importFromSource("checked-root", {}, builder)).counts.nodes).toBe(1);
    });
});
