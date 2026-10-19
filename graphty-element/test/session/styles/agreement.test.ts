import { assert, describe, it } from "vitest";

import type { Channel, LayerSpec, NodeId, Scope } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { ResolvedScope } from "../../../src/session/runs";
import { prepareBinding, type PreparedBinding } from "../../../src/session/styles/encoding";
import {
    type ChannelAgreement,
    type ChannelShare,
    type CompiledLayer,
    createStylesApi,
    type SessionStylesApi,
} from "../../../src/session/styles/index";
import { createScaleRegistry } from "../../../src/session/styles/scales";
import { edgeBetween, makeSession } from "../helpers";

const SCALES = createScaleRegistry();

/**
 * The bindings one layer paints from: every layer here writes fixed values only.
 * @param entry - The compiled layer.
 * @returns Its prepared bindings.
 */
function prepared(entry: CompiledLayer): readonly PreparedBinding[] {
    return Object.entries(entry.layer.set ?? {}).map(([name, value]) =>
        prepareBinding({ channel: name as Channel, binding: { value }, scales: SCALES }),
    );
}

/**
 * A stack over `count` nodes `n0..`, whose scopes are a node-id list or the whole graph.
 * @param count - How many nodes the graph holds.
 * @returns The stack.
 */
function stylesOver(count: number): SessionStylesApi {
    const all = Array.from({ length: count }, (_, index) => `n${String(index)}`);
    const resolved = (nodes: readonly NodeId[]): ResolvedScope => ({
        nodes: new Set(nodes),
        edges: new Set(),
        nodeCount: nodes.length,
        edgeCount: 0,
        digest: "",
        spec: "graph",
        resolvedAt: "",
    });

    return createStylesApi({
        elements: {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            nodeIdOf: (index) => `n${String(index)}`,
            edgeIdOf: (index) => `e${String(index)}`,
        },
        encoding: prepared,
        nodeIndex: (id) => {
            const at = Number(String(id).slice(1));

            return Number.isInteger(at) && at >= 0 && at < count ? at : undefined;
        },
        resolveScope: (spec: Scope) => {
            if (typeof spec === "object" && "nodes" in spec) {
                return resolved(spec.nodes);
            }

            return resolved(spec === "graph" ? all : []);
        },
    });
}

/**
 * A layer painting fixed values on some nodes.
 * @param name - Its name.
 * @param nodes - The nodes it paints.
 * @param set - What it paints them.
 * @returns The specification.
 */
function on(name: string, nodes: readonly NodeId[], set: LayerSpec["set"]): LayerSpec {
    return { name, target: "node", selector: { match: "ids", nodes }, set };
}

/**
 * One channel's entry.
 * @param entries - The agreement's channels.
 * @param channel - The channel.
 * @returns Its entry, or undefined when nothing painted it.
 */
function find(entries: readonly ChannelAgreement[], channel: Channel): ChannelAgreement | undefined {
    return entries.find((entry) => entry.channel === channel);
}

describe("styles.agreement, how several elements look in one read", () => {
    it("agrees where one layer decides every element, and splits where two layers overlap", async () => {
        const styles = stylesOver(4);
        const red = await styles.add(on("Red", ["n0", "n1", "n2"], { "node.color": "#ff0000" }));
        const blue = await styles.add(on("Blue", ["n2", "n3"], { "node.color": "#0000ff" }));

        const agreed = find(styles.agreement({ nodes: ["n0", "n1"] }).channels, "node.color");
        assert.deepInclude(agreed, { state: "agree", layerId: red.id, unpainted: 0 });

        const mixed = find(styles.agreement({ nodes: ["n0", "n1", "n2", "n3"] }).channels, "node.color");
        assert.strictEqual(mixed?.state, "mixed");
        assert.deepStrictEqual(
            mixed?.state === "mixed" ? mixed.breakdown.map((share) => [share.layerId, share.count]) : [],
            [
                [red.id, 2],
                [blue.id, 2],
            ],
        );
    });

    it("calls one value from two layers mixed, because the deciding layer differs", async () => {
        const styles = stylesOver(2);
        const below = await styles.add(on("Below", ["n0", "n1"], { "node.size": 3 }));
        const above = await styles.add(on("Above", ["n1"], { "node.size": 3 }));

        const size = find(styles.agreement({ nodes: ["n0", "n1"] }).channels, "node.size");

        assert.strictEqual(size?.state, "mixed");
        assert.sameDeepMembers(size?.state === "mixed" ? [...size.breakdown] : [], [
            { value: 3, layerId: below.id, count: 1 },
            { value: 3, layerId: above.id, count: 1 },
        ]);
    });

    it("counts an element no layer painted as unpainted, outside the comparison", async () => {
        const styles = stylesOver(3);
        const red = await styles.add(on("Red", ["n0"], { "node.color": "#ff0000" }));

        const colour = find(styles.agreement({ nodes: ["n0", "n1", "n2"] }).channels, "node.color");

        assert.deepInclude(colour, { state: "agree", layerId: red.id, unpainted: 2 });
    });

    it("answers only the channel asked about, and refuses one that does not exist", async () => {
        const styles = stylesOver(2);
        await styles.add(on("Both", ["n0", "n1"], { "node.color": "#ff0000", "node.size": 4 }));

        const only = styles.agreement({ nodes: ["n0", "n1"] }, "node.size").channels;
        assert.deepStrictEqual(
            only.map((entry) => entry.channel),
            ["node.size"],
        );

        try {
            styles.agreement("graph", "node.nonesuch" as Channel);
            assert.fail("an unknown channel was accepted");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNKNOWN_CHANNEL");
        }
    });

    it("has nothing to say about an empty scope", async () => {
        const styles = stylesOver(2);
        await styles.add(on("Red", ["n0", "n1"], { "node.color": "#ff0000" }));

        assert.deepStrictEqual(styles.agreement({ nodes: [] }).channels, []);
    });

    it("says about every element what explain says about it, on a random stack", async () => {
        // A seeded generator, so a failure reproduces.
        let seed = 810;
        const random = (): number => {
            seed = (seed * 1103515245 + 12345) % 2147483648;

            return seed / 2147483648;
        };
        const count = 300;
        const styles = stylesOver(count);
        const ids = Array.from({ length: count }, (_, index) => `n${String(index)}`);
        const pick = <T>(from: readonly T[]): T => from[Math.floor(random() * from.length)];

        for (let layer = 0; layer < 6; layer++) {
            const set: Record<string, unknown> = {};
            if (random() < 0.7) {
                set["node.color"] = pick(["#ff0000", "#00ff00", "#0000ff"]);
            }
            if (random() < 0.7 || Object.keys(set).length === 0) {
                set["node.size"] = pick([1, 2]);
            }
            const nodes = ids.filter(() => random() < 0.3);
            await styles.add(on(`Layer ${String(layer)}`, nodes, set));
        }

        const scope = ids.filter(() => random() < 0.5);
        const expected = new Map<Channel, { shares: ChannelShare[]; unpainted: number }>();
        for (const id of scope) {
            const why = styles.explain({ node: id });
            for (const channel of ["node.color", "node.size"] as const) {
                const tally = expected.get(channel) ?? { shares: [], unpainted: 0 };
                expected.set(channel, tally);
                const won = why.channels.find((entry) => entry.channel === channel);
                if (won === undefined) {
                    tally.unpainted++;
                    continue;
                }
                const value = why.merged[channel];
                const index = tally.shares.findIndex(
                    (share) => share.layerId === won.layerId && JSON.stringify(share.value) === JSON.stringify(value),
                );
                const existing = tally.shares[index];
                tally.shares[index === -1 ? tally.shares.length : index] = {
                    value,
                    layerId: won.layerId,
                    count: (existing?.count ?? 0) + 1,
                };
            }
        }

        const actual = styles.agreement({ nodes: scope }).channels;
        for (const [channel, { shares, unpainted }] of expected) {
            const entry = find(actual, channel);
            assert.strictEqual(entry?.unpainted, unpainted, channel);
            const got: ChannelShare[] =
                entry?.state === "mixed"
                    ? [...entry.breakdown]
                    : [{ value: entry?.value, layerId: entry?.layerId ?? "", count: scope.length - unpainted }];
            assert.sameDeepMembers(got, shares, channel);
            assert.strictEqual(entry?.state, shares.length === 1 ? "agree" : "mixed", channel);
        }
    });

    it("reads a scope through the session, edges included", async () => {
        const harness = makeSession({});
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const { styles } = harness.session;
        const layer = await styles.add(on("Mine", ["a", "b"], { "node.size": 7 }));
        const ab = edgeBetween(harness, "a", "b");
        await styles.add({
            name: "Edge",
            target: "edge",
            selector: { match: "ids", edges: [ab] },
            set: {
                "edge.width": 5,
            },
        });

        const size = find(styles.agreement({ nodes: ["a", "b"] }, "node.size").channels, "node.size");
        assert.deepInclude(size, { state: "agree", value: 7, layerId: layer.id, unpainted: 0 });

        const width = find(styles.agreement("graph", "edge.width").channels, "edge.width");
        assert.strictEqual(width?.state, "mixed", "the base layer decides the other edge");
        assert.strictEqual(width?.unpainted, 0);
        harness.session.dispose();
    });
});
