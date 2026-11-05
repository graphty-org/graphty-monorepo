/**
 * @file The shader lists in the style stack: what `styles.add` refuses, how the uses resolve
 * across layers by place, what a drawn shader covers, a group outline use, the pinned state,
 * binding a parameter per element and the `"index"` scale
 * (design/rendering/shader-styles.md sections 2 and 3.2, package E1).
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { ShaderUse } from "../../../src/catalog/shaders";
import type { LayerSpec, ShaderParamAddress } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { drawnUses } from "../../../src/session/styles/channels";
import { createStylesApi } from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createLayerRepaint } from "../../../src/session/styles/repaint";
import { clearTestShaders, registerTestShaders } from "../../shaders/register-test-shaders";

beforeAll(registerTestShaders);
afterAll(clearTestShaders);

/**
 * A session holding some nodes.
 * @param count - How many.
 * @returns The session.
 */
async function sessionOf(count = 6): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: count }, (_, at) => ({
            id: `n${String(at)}`,
            community: at % 3,
            uncertainty: at / count,
        })),
    );

    return session;
}

/**
 * Add a layer that must be refused, and return the refusal's first problem.
 * @param session - The session.
 * @param spec - The layer.
 * @returns The code and the candidates.
 */
async function refused(
    session: GraphSession,
    spec: LayerSpec,
): Promise<{ code: string; candidates?: readonly string[]; fact?: unknown }> {
    let found: { code: string; candidates?: readonly string[]; fact?: unknown } | undefined;
    try {
        await session.styles.add(spec);
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        [found] = (isGraphtyError(error) ? error.details.errors : []) as {
            code: string;
            candidates?: readonly string[];
            fact?: unknown;
        }[];
    }

    assert.isDefined(found, `"${spec.name}" was accepted`);

    return found;
}

/**
 * A layer over every node.
 * @param name - Its name.
 * @param set - What it writes.
 * @returns The layer.
 */
function everything(name: string, set: LayerSpec["set"]): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set };
}

describe("styles.add refuses a use the catalog does not draw", () => {
    it("refuses a misspelled shader id, listing the ids the list takes", async () => {
        const session = await sessionOf();
        const problem = await refused(session, everything("Marbles", { "node.shaders": [{ shader: "acme/marbel" }] }));
        assert.strictEqual(problem.code, "E_UNKNOWN_SHADER");
        assert.includeMembers([...(problem.candidates ?? [])], ["acme/marble", "acme/aura", "acme/hull"]);
        assert.notInclude(problem.candidates ?? [], "acme/fiber", "an edge shader is not a node shader");
        session.dispose();
    });

    it("refuses an edge shader on a node list, with shader.target-mismatch", async () => {
        const session = await sessionOf();
        const problem = await refused(session, everything("Fiber", { "node.shaders": [{ shader: "acme/fiber" }] }));
        assert.strictEqual(problem.code, "E_SHADER_KIND");
        assert.deepEqual(problem.fact, { code: "shader.target-mismatch", params: { expected: "node", found: "edge" } });
        session.dispose();
    });

    it("refuses a use at a place its shader does not allow, with shader.place-unsupported", async () => {
        const session = await sessionOf();
        const problem = await refused(
            session,
            everything("Marble around", { "node.shaders": [{ shader: "acme/marble", place: "around" }] }),
        );
        assert.strictEqual(problem.code, "E_SHADER_KIND");
        assert.deepEqual(problem.fact, {
            code: "shader.place-unsupported",
            params: { shader: "acme/marble", place: "around", allowed: ["paint"] },
        });
        // A square-drawn shader may move among the four square-drawn places.
        await session.styles.add(
            everything("Aura behind", { "node.shaders": [{ shader: "acme/aura", place: "behind" }] }),
        );
        session.dispose();
    });

    it("refuses a parameter the shader does not declare, listing the declared ones", async () => {
        const session = await sessionOf();
        const problem = await refused(
            session,
            everything("Marbles", { "node.shaders": [{ shader: "acme/marble", params: { twirl: 2 } }] }),
        );
        assert.strictEqual(problem.code, "E_UNKNOWN_SHADER_PARAM");
        assert.deepEqual(problem.candidates, ["twist", "spin", "glassTint"]);
        const range = await refused(
            session,
            everything("Fast", { "node.shaders": [{ shader: "acme/marble", params: { twist: 99 } }] }),
        );
        assert.strictEqual(range.code, "E_OPTION_RANGE");
        session.dispose();
    });

    it("refuses __proto__ as a parameter key, and never lets it reach a prototype", async () => {
        const session = await sessionOf();
        const params = JSON.parse('{ "__proto__": { "polluted": true } }') as Record<string, never>;
        const problem = await refused(
            session,
            everything("Proto", { "node.shaders": [{ shader: "acme/marble", params }] }),
        );
        assert.strictEqual(problem.code, "E_BAD_LAYER");
        assert.isUndefined((Object.prototype as Record<string, unknown>).polluted);
        session.dispose();
    });

    it("refuses a list entry that is not a use, and groupBy away from the place group", async () => {
        const session = await sessionOf();
        const verdict = session.styles.validate(
            everything("Odd", {
                "node.shaders": [
                    { shader: "acme/aura", colour: 1 } as never,
                    { shader: "acme/aura", groupBy: "data.community" },
                ],
            }),
        );
        assert.deepEqual(
            verdict.errors.map((error) => [error.code, error.path]),
            [
                ["E_BAD_LAYER", "set.node.shaders.0"],
                ["E_BAD_LAYER", "set.node.shaders.1.groupBy"],
            ],
        );
        session.dispose();
    });

    it("accepts an empty list, which adds nothing to what lies beneath", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Marbles", { "node.shaders": [{ shader: "acme/marble" }] }));
        await session.styles.add(everything("Nothing", { "node.shaders": [] }));
        const merged = session.styles.explain({ node: "n0" }).merged["node.shaders"];
        assert.deepEqual(
            merged?.map((use) => use.shader),
            ["acme/marble"],
        );
        session.dispose();
    });

    it("does not refuse a loaded document's unknown shader: it is counted as drawing nothing", async () => {
        const session = await sessionOf();
        await session.styles.applyTemplate({
            version: 1,
            layers: [everything("Pasted", { "node.shaders": [{ shader: "user/never-registered" }] })],
        });
        const [layer] = session.styles.list().filter((entry) => entry.name === "Pasted");
        assert.deepInclude(session.styles.counts(layer.id).undrawn, {
            code: "shader.unknown",
            params: { channel: "node.shaders", shader: "user/never-registered", count: 6 },
        });
        session.dispose();
    });
});

describe("a style document's shader list", () => {
    it("carries at most 64 shaders, each a namespaced id and its text", async () => {
        const session = await sessionOf();
        const apply = async (shaders: unknown): Promise<string | undefined> => {
            try {
                await session.styles.applyTemplate({ version: 1, layers: [], shaders } as never);
            } catch (error) {
                return isGraphtyError(error) ? String(error.details.code) : String(error);
            }

            return undefined;
        };

        assert.isUndefined(await apply([{ id: "user/ring", text: "vec4 shade(NodeInput n) { return n.color; }" }]));
        assert.strictEqual(await apply([{ id: "ring", text: "" }]), "shader.id-invalid");
        assert.strictEqual(
            await apply(Array.from({ length: 65 }, (_, at) => ({ id: `user/s${String(at)}`, text: "" }))),
            "shader.too-many",
        );
        assert.strictEqual(await apply([{ id: "user/big", text: "x".repeat(262_145) }]), "shader.too-large");
        session.dispose();
    });
});

/**
 * The uses one node draws, resolved, as shader ids.
 * @param session - The session.
 * @param node - The node.
 * @returns The ids, in order.
 */
function resolvedIds(session: GraphSession, node = "n0"): readonly string[] {
    return (session.styles.explain({ node }).merged["node.shaders"] ?? []).map((use) => use.shader);
}

/**
 * One parameter of the first use of a shader on a node.
 * @param session - The session.
 * @param node - The node.
 * @param shader - The shader.
 * @param param - The parameter.
 * @returns Its value.
 */
function paramOf(session: GraphSession, node: string, shader: string, param: string): unknown {
    return session.styles.explain({ node }).merged["node.shaders"]?.find((use) => use.shader === shader)?.params?.[
        param
    ];
}

describe("resolving the shader lists by place", () => {
    it("lets the last paint or replace win, each covering the other beneath", async () => {
        const session = await sessionOf();
        await session.styles.add(
            everything("Lanterns", { "node.shaders": [{ shader: "acme/lantern", params: { speed: 3 } }] }),
        );
        await session.styles.add(
            everything("Marbles", { "node.shaders": [{ shader: "acme/marble", params: { twist: 4 } }] }),
        );
        assert.deepEqual(resolvedIds(session), ["acme/marble"]);
        const [marble] = session.styles.explain({ node: "n0" }).merged["node.shaders"] ?? [];
        assert.deepEqual({ ...marble.params }, { twist: 4 }, "parameters belong to their use");

        await session.styles.add(everything("Stickers", { "node.shaders": [{ shader: "acme/sticker" }] }));
        assert.deepEqual(resolvedIds(session), ["acme/sticker"], "a replace covers the paint beneath");
        await session.styles.add(everything("Lanterns again", { "node.shaders": [{ shader: "acme/lantern" }] }));
        assert.deepEqual(resolvedIds(session), ["acme/lantern"], "a paint covers the replace beneath");
        session.dispose();
    });

    it("stacks every other place in layer then list order, and draws the same shader twice", async () => {
        const session = await sessionOf();
        await session.styles.add(
            everything("Rings", {
                "node.shaders": [
                    { shader: "acme/ring", params: { intensity: 0.5 } },
                    { shader: "acme/ring", params: { intensity: 2 } },
                ],
            }),
        );
        await session.styles.add(everything("Aura", { "node.shaders": [{ shader: "acme/aura", place: "behind" }] }));
        const { stacked } = drawnUses(session.styles.explain({ node: "n0" }).merged["node.shaders"]);
        assert.deepEqual(
            stacked.map(({ use, place }) => [use.shader, place, use.params?.intensity]),
            [
                ["acme/ring", "around", 0.5],
                ["acme/ring", "around", 2],
                ["acme/aura", "behind", undefined],
            ],
        );
        session.dispose();
    });

    it("removes a lower layer's use with off, wherever it was put", async () => {
        const session = await sessionOf();
        await session.styles.add(
            everything("Aura", {
                "node.shaders": [{ shader: "acme/aura", params: { intensity: 2 } }, { shader: "acme/ring" }],
            }),
        );
        await session.styles.add(
            everything("Aura behind", { "node.shaders": [{ shader: "acme/aura", place: "behind" }] }),
        );
        await session.styles.add({
            name: "No aura on the first community",
            target: "node",
            selector: { match: "rule", where: { kind: "range", attribute: "data.community", min: 0, max: 0 } },
            set: { "node.shaders": [{ shader: "acme/aura", off: true }] },
        });
        assert.deepEqual(resolvedIds(session, "n0"), ["acme/ring"]);
        assert.deepEqual(resolvedIds(session, "n1"), ["acme/aura", "acme/ring", "acme/aura"]);
        session.dispose();
    });

    it("reports a fifth stacking use as past the cap, keeping the four written highest", async () => {
        const session = await sessionOf();
        const layers = [];
        for (const name of ["aura", "ring", "orbit", "spark", "flash"]) {
            layers.push(await session.styles.add(everything(name, { "node.shaders": [{ shader: `acme/${name}` }] })));
        }

        const { stacked, left } = drawnUses(session.styles.explain({ node: "n2" }).merged["node.shaders"]);
        assert.strictEqual(left, 1);
        assert.deepEqual(
            stacked.map(({ use }) => use.shader),
            ["acme/ring", "acme/orbit", "acme/spark", "acme/flash"],
        );
        assert.deepInclude(session.styles.counts(layers[0].id).undrawn, {
            code: "shader.stack-cap",
            params: { left: 1, limit: 4, count: 6 },
        });
        const { painted, covers } = session.styles.counts(layers[0].id);
        assert.strictEqual(painted["node.shaders"], 6, "a use beneath is not painted over by one above");
        assert.isUndefined(covers["node.shaders"]);
        session.dispose();
    });
});

describe("what a drawn shader covers", () => {
    it("puts a replace use's layer on the shape rows it is drawn in place of, and not on the size", async () => {
        const session = await sessionOf();
        const shapes = await session.styles.add(everything("Boxes", { "node.shape": "box", "node.size": 2 }));
        const stickers = await session.styles.add({
            name: "Stickers",
            target: "node",
            selector: { match: "rule", where: { kind: "range", attribute: "data.uncertainty", min: 0, max: 0.4 } },
            set: { "node.shaders": [{ shader: "acme/sticker" }] },
        });

        const { covers, painted } = session.styles.counts(shapes.id);
        assert.deepEqual(covers["node.shape"], { layers: [{ layerId: stickers.id, count: 3 }], more: 0 });
        assert.strictEqual(painted["node.shape"], 3);
        assert.isUndefined(covers["node.size"]);

        const shape = session.styles.explain({ node: "n0" }).channels.find((entry) => entry.channel === "node.shape");
        assert.strictEqual(shape?.coveredBy, stickers.id);
        const unlit = session.styles.explain({ node: "n5" }).channels.find((entry) => entry.channel === "node.shape");
        assert.isUndefined(unlit?.coveredBy, "n5 draws no sticker");

        const agreement = session.styles.agreement("graph", "node.shape");
        assert.strictEqual(agreement.channels[0].covered, 3, "styles.agreement reports replace covering node.shape");
        session.dispose();
    });

    it("covers the shape rows of a shader moved to replace", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Boxes", { "node.shape": "box" }));
        await session.styles.add(
            everything("Aura instead", { "node.shaders": [{ shader: "acme/aura", place: "replace" }] }),
        );
        const agreement = session.styles.agreement("graph", "node.shape");
        assert.strictEqual(agreement.channels[0].covered, 6);
        session.dispose();
    });

    it("lets a shape on a higher layer draw over a replace on a lower one", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Stickers", { "node.shaders": [{ shader: "acme/sticker" }] }));
        await session.styles.add(everything("Boxes", { "node.shape": "box" }));
        const agreement = session.styles.agreement("graph", "node.shape");
        assert.isUndefined(agreement.channels[0].covered, "the shape is drawn");
        session.dispose();
    });

    it("puts a replace that does not read color on the color rows, and a paint that does on none", async () => {
        const session = await sessionOf();
        const fill = await session.styles.add(everything("Fill", { "node.color": "#ff0000" }));
        const marbles = await session.styles.add(
            everything("Marbles", { "node.shaders": [{ shader: "acme/marble" }] }),
        );
        assert.isUndefined(session.styles.counts(fill.id).covers["node.color"]);

        await session.styles.remove(marbles.id);
        const mandalas = await session.styles.add(
            everything("Mandalas", { "node.shaders": [{ shader: "acme/mandala" }] }),
        );
        assert.deepEqual(session.styles.counts(fill.id).covers["node.color"], {
            layers: [{ layerId: mandalas.id, count: 6 }],
            more: 0,
        });
        session.dispose();
    });
});

describe("a group outline use", () => {
    it("is accepted on a node layer with groupBy, kept, and saved", async () => {
        const session = await sessionOf();
        const layer = await session.styles.add({
            name: "Communities",
            set: { "node.shaders": [{ shader: "acme/hull", params: { outline: 3 }, groupBy: "data.community" }] },
            selector: { match: "everything" },
        });
        assert.strictEqual(layer.target, "node");
        assert.deepEqual(session.styles.toDocument().layers.at(-1)?.set?.["node.shaders"], [
            { shader: "acme/hull", params: { outline: 3 }, groupBy: "data.community" },
        ]);
        session.dispose();
    });
});

describe("the pinned state", () => {
    it("selects the pinned nodes and follows a pin and a release", async () => {
        const session = await sessionOf();
        const frost = await session.styles.add({
            name: "Frost",
            target: "node",
            selector: { match: "state", state: "pinned" },
            set: { "node.color": "#00ffff" },
        });
        await session.positions.pin(["n1", "n3"]);
        await session.styles.settled();
        const frosted = (): string[] =>
            ["n0", "n1", "n2", "n3"].filter((id) =>
                session.styles
                    .explain({ node: id })
                    .channels.some((entry) => entry.channel === "node.color" && entry.layerId === frost.id),
            );
        assert.deepEqual(frosted(), ["n1", "n3"]);

        await session.positions.unpin(["n1"]);
        await session.styles.settled();
        assert.deepEqual(frosted(), ["n3"]);
        session.dispose();
    });
});

describe("a parameter bound per element", () => {
    it("maps the data onto the parameter's range, landing in its shader's set", async () => {
        const session = await sessionOf(4);
        const address: ShaderParamAddress = "node.shaders.acme/marble.spin";
        await session.styles.add({
            name: "Spin by uncertainty",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "acme/marble" }] },
            encode: { [address]: { by: "data.uncertainty" } },
        });
        await session.styles.settled();
        const spins = ["n0", "n3"].map((id) => paramOf(session, id, "acme/marble", "spin"));
        assert.deepEqual(spins, [0, 2]);
        session.dispose();
    });

    it("refuses a parameter that does not vary", async () => {
        const session = await sessionOf();
        const problem = await refused(session, {
            name: "Twist by data",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.shaders.acme/marble.twist": { by: "data.uncertainty" } },
        });
        assert.strictEqual(problem.code, "E_UNKNOWN_SHADER_PARAM");
        assert.deepEqual(problem.candidates, ["spin"]);
        session.dispose();
    });

    it('numbers each value in the order first seen with the "index" scale, and keeps the numbers', async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", team: "red" },
            { id: "b", team: "blue" },
            { id: "c", team: "red" },
        ]);
        const layer = await session.styles.add({
            name: "Icons",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "acme/sticker" }] },
            encode: { "node.shaders.acme/sticker.icon": { by: "data.team", scale: "index" } },
        });
        await session.styles.settled();
        const icon = (id: string): unknown => paramOf(session, id, "acme/sticker", "icon");
        assert.deepEqual(["a", "b", "c"].map(icon), [0, 1, 0]);

        // A new value arriving first in element order still takes the next number.
        await session.data.addNodes([{ id: "d", team: "green" }]);
        await session.styles.update(layer.id, { name: "Icons again" });
        await session.styles.settled();
        assert.deepEqual(["a", "b", "c", "d"].map(icon), [0, 1, 0, 2]);
        session.dispose();
    });

    it("keeps one source mesh when a varying parameter is bound on 10,000 nodes", async () => {
        const rows: readonly Readonly<Record<string, unknown>>[] = Array.from({ length: 10_000 }, (_, at) => ({
            "data.activity": at,
        }));
        const elements: SelectorSource = {
            nodeValue: (index, path) => rows[index]?.[path],
            edgeValue: () => undefined,
            nodeIdOf: (index) => `n${String(index)}`,
            edgeIdOf: (index) => `e${String(index)}`,
        };
        const engine = createLayerRepaint({ nodeCount: () => rows.length, edgeCount: () => 0, elements });
        const styles = createStylesApi({ elements, repaint: engine.repaint, encoding: engine.encoding });
        await styles.add({
            name: "Spin by activity",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "acme/marble" }] },
            encode: { "node.shaders.acme/marble.spin": { by: "data.activity" } },
        });
        await engine.repaintAll(styles.compiled(), { signal: new AbortController().signal, report: () => undefined });

        const keys = new Set(rows.map((_, index) => engine.meshKeyOf("node", index)));
        assert.strictEqual(keys.size, 1, "every node is drawn from one source mesh");
        assert.deepEqual(engine.meshStyleOf("node", [...keys][0]), {});
        const spin = (index: number): unknown =>
            (engine.styleOf("node", index)["node.shaders"] as readonly ShaderUse[])[0].params?.spin;
        assert.strictEqual(spin(0), 0);
        assert.strictEqual(spin(9_999), 2);
    });
});
