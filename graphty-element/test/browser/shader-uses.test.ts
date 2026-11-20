/**
 * @file Every catalog shader, used in its declared place, draws in the views its `views` names and nothing in the
 * others.
 *
 * `views` is what an application dims a shader by in the other view, so it must hold both ways. A node, edge or
 * group shader is written as a use on `node.shaders` or `edge.shaders`; a background shader is the graph's
 * background. A parameter bound to a clock (an event shader's ring age or flash time: shockwave, change-flash,
 * edge-change) is held at the middle of its play, which is what the shader draws just after its event fired, so
 * the frame is still. The instrument: test/helpers/channel-paints.ts.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { shaderDescriptors } from "../../src/catalog/shaderRegistry";
import { isClockBinding, type ShaderDescriptor, type ShaderParams } from "../../src/catalog/shaders";
import type { Graph } from "../../src/Graph";
import { NodeShaderDrawing } from "../../src/meshes/NodeShaderDrawing";
import type { GraphSession } from "../../src/session";
import { shadersControllerOf } from "../../src/session/shaders";
import { mountProbeGraph, PIXEL_CHANGE, pixelsChanged, readScene } from "../helpers/channel-paints";
import { drawnFrames } from "../helpers/drawn-frames";

/**
 * Every clock-bound parameter held at the middle of its play.
 * @param descriptor - The shader.
 * @returns The parameters.
 */
function heldParams(descriptor: ShaderDescriptor): ShaderParams {
    return Object.fromEntries(
        descriptor.params.flatMap((param) =>
            isClockBinding(param.default)
                ? [[param.name, (param.default.domain[0] + param.default.domain[1]) / 2]]
                : [],
        ),
    );
}

/**
 * How many pixels a use changes on the probe graph, place by place (a same-area change moves no histogram bucket). A heavy surface's body loads after the use lands, so where it
 * should draw the frame is read once the shader draws a node. A shader that reads a clock straight in its body
 * (change-flash's `sinceChanged`) draws only while its event plays: the event is fired, and frames are read as
 * they are drawn until one differs from the rest.
 * @param graph - The graph.
 * @param session - The session.
 * @param descriptor - The shader.
 * @param params - Its parameters.
 * @param claims - Whether it should draw in this view.
 * @returns The pixels that changed colour, place by place.
 */
async function useChanges(
    graph: Graph,
    session: GraphSession,
    descriptor: ShaderDescriptor,
    params: ShaderParams,
    claims: boolean,
): Promise<number> {
    const target = descriptor.target === "edge" ? "edge" : "node";
    const scene = graph.getScene();
    // large enough that a heavy surface draws its full program, not its few-pixel one
    const base = await session.styles.add({
        name: "shader probe size",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 3 },
    });
    const rest = await readScene(graph);
    const use = await session.styles.add({
        name: `use ${descriptor.id}`,
        target,
        selector: { match: "everything" },
        set: {
            [`${target}.shaders`]: [
                {
                    shader: descriptor.id,
                    ...(descriptor.place === undefined ? {} : { place: descriptor.place }),
                    params,
                },
            ],
        },
    } as never);
    const drawsNode = (): boolean =>
        [...(NodeShaderDrawing.peek(scene)?.stats().slots.values() ?? [])].some((count) => count > 0);
    for (let frame = 0; claims && target === "node" && !drawsNode() && frame < 600; frame++) {
        await drawnFrames(scene, 1);
    }

    let after = await readScene(graph);
    if (claims && descriptor.reads.includes("times")) {
        const dm = graph.getDataManager();
        if (target === "node") {
            await session.data.updateNodes([{ id: "alpha", values: { changed: 1 } }]);
        } else {
            const edge = [...dm.edges.values()][0];
            await session.data.updateEdges([{ id: edge.id, values: { changed: 1 } }]);
        }

        for (let frame = 0; frame < 120 && pixelsChanged(rest, after) <= PIXEL_CHANGE; frame++) {
            await drawnFrames(scene, 1);
            after = await readScene(graph, false);
        }
    }

    await session.styles.remove(use.id);
    await session.styles.remove(base.id);
    return pixelsChanged(rest, after);
}

const SHADERS = [...shaderDescriptors()].sort((one, other) => one.id.localeCompare(other.id));

it("lists the catalog's shaders", () => {
    assert.isAbove(SHADERS.length, 20);
});

for (const view of ["2d", "3d"] as const) {
    describe(`every catalog shader in ${view}`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            ({ container, graph, session } = await mountProbeGraph(view));
            // About whether each shader draws, not the frame guard: on a software GPU one long frame turns a heavy
            // shader off mid-test. frame-guard.test.ts keeps the guard on.
            shadersControllerOf(session)?.configure({ guard: false });
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        for (const descriptor of SHADERS) {
            const claims = descriptor.views?.includes(view) ?? true;
            it(`${claims ? "draws" : "draws nothing"}: ${descriptor.id} (${descriptor.target}, ${String(descriptor.place)})`, async () => {
                const params = heldParams(descriptor);
                let changed: number;
                if (descriptor.target === "background") {
                    graph.setBackground({
                        backgroundType: "color",
                        color: "#202020",
                        shader: { id: descriptor.id, params },
                    });
                    const after = await readScene(graph);
                    graph.setBackground({ backgroundType: "color", color: "#202020" });
                    const plain = await readScene(graph);
                    changed = pixelsChanged(after, plain);
                } else {
                    changed = await useChanges(graph, session, descriptor, params, claims);
                }

                // The picture, not the scene's structure: a use builds its drawing in every view, and draws nothing in
                // one its `views` leave out.
                const painted = changed > PIXEL_CHANGE;
                assert.strictEqual(
                    painted,
                    claims,
                    `${descriptor.id} names ${String(descriptor.views ?? "both views")}; in ${view} it ` +
                        `${painted ? "changed" : "did not change"} the picture (${String(changed)} pixels changed).`,
                );
            });
        }
    });
}
