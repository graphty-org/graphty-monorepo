/**
 * @file The node-effect presets in the style stack, under their own bare ids
 * (design/rendering/shader-styles.md sections 2.2 and 7.3, package P4): on one node the aura and
 * the satellites take separate per-node bindings, an effect added by one layer stacks with
 * another's, and a parameter a preset does not declare is refused.
 */

import { assert, describe, it } from "vitest";

import { drawingOf } from "../../../src/catalog/shaders";
import type { LayerSpec } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { drawnUses } from "../../../src/session/styles/channels";

/**
 * A session of six nodes with an uncertainty and a degree each.
 * @returns The session.
 */
async function sessionOf(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: 6 }, (_, at) => ({ id: `n${String(at)}`, uncertainty: at / 5, degree: 1 + at })),
    );
    return session;
}

/**
 * The merged parameters of one effect on one node.
 * @param session - The session.
 * @param node - The node.
 * @param effect - The effect id.
 * @returns Its parameters, or undefined.
 */
function effectParams(session: GraphSession, node: string, effect: string): Record<string, unknown> | undefined {
    return session.styles.explain({ node }).merged["node.shaders"]?.find((use) => use.shader === effect)?.params;
}

/**
 * The ids of the effects drawn on a node, in drawing order.
 * @param session - The session.
 * @param node - The node.
 * @returns The ids.
 */
function drawnIds(session: GraphSession, node: string): readonly string[] {
    return drawnUses(session.styles.explain({ node }).merged["node.shaders"]).stacked.map(({ use }) => use.shader);
}

const everything = (name: string, rest: Omit<LayerSpec, "name" | "target" | "selector">): LayerSpec => ({
    name,
    target: "node",
    selector: { match: "everything" },
    ...rest,
});

describe("the node-effect presets in the style stack", () => {
    it("lists all five in the catalog under their bare ids", () => {
        const ids = createGraphSession()
            .catalog.shaders()
            .filter((descriptor) => drawingOf(descriptor) === "node-square")
            .map((descriptor) => descriptor.id);
        assert.includeMembers(ids, [
            "uncertainty-aura",
            "lock-on-reticle",
            "orbiting-satellites",
            "shockwave",
            "change-flash",
        ]);
    });

    it("on one node, the aura and the satellites take separate bindings", async () => {
        const session = await sessionOf();
        await session.styles.add(
            everything("Aura and moons", {
                set: { "node.shaders": [{ shader: "uncertainty-aura" }, { shader: "orbiting-satellites" }] },
                encode: {
                    "node.shaders.uncertainty-aura.intensity": { by: "data.uncertainty" },
                    "node.shaders.orbiting-satellites.moons": { by: "data.degree" },
                },
            }),
        );
        await session.styles.settled();

        const first = {
            aura: effectParams(session, "n0", "uncertainty-aura"),
            moons: effectParams(session, "n0", "orbiting-satellites"),
        };
        const last = {
            aura: effectParams(session, "n5", "uncertainty-aura"),
            moons: effectParams(session, "n5", "orbiting-satellites"),
        };
        // Each binding maps its own column onto its own parameter's range, and lands in its own
        // effect's set: neither parameter appears in the other effect.
        assert.deepEqual(first.aura, { intensity: 0 });
        assert.deepEqual(last.aura, { intensity: 2 });
        assert.deepEqual(first.moons, { moons: 1 });
        assert.deepEqual(last.moons, { moons: 12 });
        assert.deepEqual(drawnIds(session, "n3"), ["uncertainty-aura", "orbiting-satellites"]);
        session.dispose();
    });

    it("stacks a reticle from one layer with a shockwave from another, and a higher off removes one", async () => {
        const session = await sessionOf();
        await session.styles.add(everything("Reticle", { set: { "node.shaders": [{ shader: "lock-on-reticle" }] } }));
        await session.styles.add(everything("Shockwave", { set: { "node.shaders": [{ shader: "shockwave" }] } }));
        await session.styles.settled();
        const drawn = (): readonly string[] => drawnIds(session, "n0");
        assert.deepEqual(drawn(), ["lock-on-reticle", "shockwave"]);

        await session.styles.add(
            everything("No reticle", { set: { "node.shaders": [{ shader: "lock-on-reticle", off: true }] } }),
        );
        await session.styles.settled();
        assert.deepEqual(drawn(), ["shockwave"]);
        session.dispose();
    });

    it("refuses a parameter the preset does not declare, listing the ones it does", async () => {
        const session = await sessionOf();
        let refused: { code: string; candidates?: readonly string[] } | undefined;
        try {
            await session.styles.add(
                everything("Moons by data", {
                    set: { "node.shaders": [{ shader: "orbiting-satellites" }] },
                    encode: { "node.shaders.orbiting-satellites.speed": { by: "data.degree" } },
                }),
            );
        } catch (error) {
            assert.isTrue(isGraphtyError(error), String(error));
            [refused] = (isGraphtyError(error) ? error.details.errors : []) as (typeof refused)[];
        }

        assert.strictEqual(refused?.code, "E_UNKNOWN_SHADER_PARAM");
        assert.deepEqual(refused?.candidates, ["moons"]);
        session.dispose();
    });
});
