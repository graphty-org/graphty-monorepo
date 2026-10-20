/**
 * @file The shader channels in the style stack: what `styles.add` refuses, how parameter and
 * effect maps merge across layers, what a drawn shader covers, the boundary layer member, the
 * pinned state, binding a parameter per element and the `"index"` scale
 * (design/rendering/shader-styles.md sections 2 and 3.2, package E1).
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LayerSpec, ShaderParamAddress } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { drawnEffects } from "../../../src/session/styles/channels";
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
): Promise<{ code: string; candidates?: readonly string[] }> {
    let found: { code: string; candidates?: readonly string[] } | undefined;
    try {
        await session.styles.add(spec);
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        [found] = (isGraphtyError(error) ? error.details.errors : []) as {
            code: string;
            candidates?: readonly string[];
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

describe("styles.add refuses a shader the catalog does not draw", () => {
    it("refuses a misspelled shader id, listing the ids of the kinds the channel takes", async () => {
        const session = await sessionOf();
        const problem = await refused(session, everything("Marbles", { "node.shader": "acme/marbel" }));
        assert.strictEqual(problem.code, "E_UNKNOWN_SHADER");
        assert.includeMembers([...(problem.candidates ?? [])], ["acme/marble", "acme/lantern", "acme/sticker"]);
        assert.notInclude(problem.candidates ?? [], "acme/aura", "an effect is not a surface");
        session.dispose();
    });

    it("refuses a shader of the wrong kind", async () => {
        const session = await sessionOf();
        const problem = await refused(session, everything("Aura", { "node.shader": "acme/aura" }));
        assert.strictEqual(problem.code, "E_SHADER_KIND");
        const effect = await refused(session, everything("Marble effect", { "node.effects": { "acme/marble": true } }));
        assert.strictEqual(effect.code, "E_SHADER_KIND");
        session.dispose();
    });

    it("refuses a parameter the shader does not declare, listing the declared ones", async () => {
        const session = await sessionOf();
        const problem = await refused(
            session,
            everything("Marbles", {
                "node.shader": "acme/marble",
                "node.shaderParams": { "acme/marble": { twirl: 2 } },
            }),
        );
        assert.strictEqual(problem.code, "E_UNKNOWN_SHADER_PARAM");
        assert.deepEqual(problem.candidates, ["twist", "spin", "glassTint"]);
        const range = await refused(
            session,
            everything("Fast", { "node.shaderParams": { "acme/marble": { twist: 99 } } }),
        );
        assert.strictEqual(range.code, "E_OPTION_RANGE");
        session.dispose();
    });

    it("refuses __proto__ as a parameter key, and never lets it reach a prototype", async () => {
        const session = await sessionOf();
        const params = JSON.parse('{ "acme/marble": { "__proto__": { "polluted": true } } }') as Record<string, never>;
        const problem = await refused(session, everything("Proto", { "node.shaderParams": params }));
        assert.strictEqual(problem.code, "E_BAD_LAYER");
        const effects = JSON.parse('{ "__proto__": true }') as Record<string, never>;
        const verdict = session.styles.validate(everything("Proto", { "node.effects": effects }));
        assert.deepEqual(
            verdict.errors.map((error) => [error.code, error.path]),
            [["E_BAD_LAYER", "set.node.effects.__proto__"]],
        );
        assert.isUndefined((Object.prototype as Record<string, unknown>).polluted);
        session.dispose();
    });

    it('accepts "none", which covers a shader beneath and draws the plain shape', async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Marbles", { "node.shader": "acme/marble" }));
        await session.styles.add(everything("Plain", { "node.shader": "none" }));
        assert.strictEqual(session.styles.explain({ node: "n0" }).merged["node.shader"], "none");
        session.dispose();
    });

    it("does not refuse a loaded document's unknown shader: it is counted as drawing nothing", async () => {
        const session = await sessionOf();
        await session.styles.applyTemplate({
            version: 1,
            layers: [everything("Pasted", { "node.shader": "user/never-registered" })],
        });
        const [layer] = session.styles.list().filter((entry) => entry.name === "Pasted");
        assert.deepInclude(session.styles.counts(layer.id).undrawn, {
            code: "shader.unknown",
            params: { channel: "node.shader", shader: "user/never-registered", count: 6 },
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

describe("parameters belong to their shader", () => {
    it("never hands a lower layer's parameter to a different shader a higher layer switches to", async () => {
        const session = await sessionOf();
        const lanterns = await session.styles.add(
            everything("Lanterns", {
                "node.shader": "acme/lantern",
                "node.shaderParams": { "acme/lantern": { speed: 3 } },
            }),
        );
        const marbles = await session.styles.add(
            everything("Marbles", {
                "node.shader": "acme/marble",
                "node.shaderParams": { "acme/marble": { twist: 4 } },
            }),
        );
        const { merged } = session.styles.explain({ node: "n0" });
        const shader = merged["node.shader"] as string;
        const sets = merged["node.shaderParams"] ?? {};

        assert.strictEqual(shader, "acme/marble");
        assert.deepEqual(
            { ...sets[shader] },
            { twist: 4 },
            "only the drawn shader's set applies, and it holds no speed",
        );
        assert.deepEqual({ ...sets["acme/lantern"] }, { speed: 3 }, "the lantern's set stays under its own id");
        assert.isNull(Object.getPrototypeOf(sets), "merged maps have no prototype");
        assert.deepInclude(session.styles.counts(lanterns.id).undrawn, {
            code: "shader.param-unused",
            params: { shader: "acme/lantern", param: "speed", count: 6 },
        });
        assert.deepEqual(session.styles.counts(marbles.id).undrawn, []);
        session.dispose();
    });

    it("merges two layers' sets for one shader per parameter, the higher winning", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Base", { "node.shaderParams": { "acme/marble": { twist: 1, spin: 1 } } }));
        await session.styles.add(everything("Top", { "node.shaderParams": { "acme/marble": { spin: 2 } } }));
        assert.deepEqual(
            { ...session.styles.explain({ node: "n1" }).merged["node.shaderParams"]?.["acme/marble"] },
            {
                twist: 1,
                spin: 2,
            },
        );
        session.dispose();
    });
});

describe("effects stack", () => {
    it("draws two layers' effects, and a higher false removes one", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Aura", { "node.effects": { "acme/aura": { intensity: 2 } } }));
        await session.styles.add(everything("Ring", { "node.effects": { "acme/ring": true } }));
        const both = drawnEffects(session.styles.explain({ node: "n0" }).merged["node.effects"]);
        assert.deepEqual(
            both.drawn.map(([id, params]) => [id, { ...params }]),
            [
                ["acme/aura", { intensity: 2 }],
                ["acme/ring", {}],
            ],
        );

        await session.styles.add(everything("No aura", { "node.effects": { "acme/aura": false } }));
        const one = drawnEffects(session.styles.explain({ node: "n0" }).merged["node.effects"]);
        assert.deepEqual(
            one.drawn.map(([id]) => id),
            ["acme/ring"],
        );
        session.dispose();
    });

    it("reports a fifth effect as past the cap, keeping the four written highest", async () => {
        const session = await sessionOf();
        const layers = [];
        for (const name of ["aura", "ring", "orbit", "spark", "flash"]) {
            layers.push(await session.styles.add(everything(name, { "node.effects": { [`acme/${name}`]: true } })));
        }

        const { drawn, left } = drawnEffects(session.styles.explain({ node: "n2" }).merged["node.effects"]);
        assert.strictEqual(left, 1);
        assert.deepEqual(
            drawn.map(([id]) => id),
            ["acme/ring", "acme/orbit", "acme/spark", "acme/flash"],
        );
        assert.deepInclude(session.styles.counts(layers[0].id).undrawn, {
            code: "shader.effect-cap",
            params: { left: 1, limit: 4, count: 6 },
        });
        const { painted, covers } = session.styles.counts(layers[0].id);
        assert.strictEqual(painted["node.effects"], 6, "an effect beneath is not painted over by one above");
        assert.isUndefined(covers["node.effects"]);
        session.dispose();
    });

    it("keeps an entry hidden by its eye, drawing nothing for it", async () => {
        const session = await sessionOf();
        await session.styles.add(
            everything("Aura", { "node.effects": { "acme/aura": { intensity: 1, visible: false } } }),
        );
        const { drawn, left } = drawnEffects(session.styles.explain({ node: "n0" }).merged["node.effects"]);
        assert.deepEqual([drawn.length, left], [0, 0]);
        session.dispose();
    });
});

describe("what a drawn shader covers", () => {
    it("puts a sprite's layer on the shape rows it is drawn in place of, and not on the size", async () => {
        const session = await sessionOf();
        const shapes = await session.styles.add(everything("Boxes", { "node.shape": "box", "node.size": 2 }));
        const stickers = await session.styles.add({
            name: "Stickers",
            target: "node",
            selector: { match: "rule", where: { kind: "range", attribute: "data.uncertainty", min: 0, max: 0.4 } },
            set: { "node.shader": "acme/sticker" },
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
        assert.strictEqual(agreement.channels[0].covered, 3);
        session.dispose();
    });

    it("puts a sprite that does not read color on the color rows, and a surface that does on none", async () => {
        const session = await sessionOf();
        const fill = await session.styles.add(everything("Fill", { "node.color": "#ff0000" }));
        const marbles = await session.styles.add(everything("Marbles", { "node.shader": "acme/marble" }));
        assert.isUndefined(session.styles.counts(fill.id).covers["node.color"]);

        await session.styles.remove(marbles.id);
        const mandalas = await session.styles.add(everything("Mandalas", { "node.shader": "acme/mandala" }));
        assert.deepEqual(session.styles.counts(fill.id).covers["node.color"], {
            layers: [{ layerId: mandalas.id, count: 6 }],
            more: 0,
        });
        session.dispose();
    });
});

describe("the boundary layer member", () => {
    it("is accepted on a node layer, kept, and refused when its shader is not a boundary", async () => {
        const session = await sessionOf();
        const layer = await session.styles.add({
            name: "Communities",
            selector: { match: "everything" },
            boundary: { shader: "acme/hull", params: { outline: 3 }, groupBy: "data.community" },
        });
        assert.strictEqual(layer.target, "node");
        assert.deepEqual(layer.boundary, { shader: "acme/hull", params: { outline: 3 }, groupBy: "data.community" });
        assert.deepEqual(session.styles.toDocument().layers.at(-1)?.boundary, layer.boundary);

        const wrong = await refused(session, {
            name: "Wrong",
            selector: { match: "everything" },
            boundary: { shader: "acme/aura" },
        });
        assert.strictEqual(wrong.code, "E_SHADER_KIND");
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
        const address: ShaderParamAddress = "node.shaderParams.acme/marble.spin";
        await session.styles.add({
            name: "Spin by uncertainty",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "acme/marble" },
            encode: { [address]: { by: "data.uncertainty" } },
        });
        await session.styles.settled();
        const spins = ["n0", "n3"].map(
            (id) => session.styles.explain({ node: id }).merged["node.shaderParams"]?.["acme/marble"]?.spin,
        );
        assert.deepEqual(spins, [0, 2]);
        session.dispose();
    });

    it("refuses a parameter that does not vary", async () => {
        const session = await sessionOf();
        const problem = await refused(session, {
            name: "Twist by data",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.shaderParams.acme/marble.twist": { by: "data.uncertainty" } },
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
            set: { "node.shader": "acme/sticker" },
            encode: { "node.shaderParams.acme/sticker.icon": { by: "data.team", scale: "index" } },
        });
        await session.styles.settled();
        const icon = (id: string): unknown =>
            session.styles.explain({ node: id }).merged["node.shaderParams"]?.["acme/sticker"]?.icon;
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
            set: { "node.shader": "acme/marble" },
            encode: { "node.shaderParams.acme/marble.spin": { by: "data.activity" } },
        });
        await engine.repaintAll(styles.compiled(), { signal: new AbortController().signal, report: () => undefined });

        const keys = new Set(rows.map((_, index) => engine.meshKeyOf("node", index)));
        assert.strictEqual(keys.size, 1, "every node is drawn from one source mesh");
        assert.deepEqual(engine.meshStyleOf("node", [...keys][0]), {});
        const spin = (index: number): unknown =>
            (engine.styleOf("node", index)["node.shaderParams"] as Record<string, Record<string, unknown>>)[
                "acme/marble"
            ].spin;
        assert.strictEqual(spin(0), 0);
        assert.strictEqual(spin(9_999), 2);
    });
});
