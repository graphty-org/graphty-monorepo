/**
 * A dotted line with a program's own dot length and gap (graph-io's ToolDefaults.dashes: Graphviz "1,5" at width
 * 1.5, Pajek "5" at width 6) repeats as the program's does, every dot length plus gap. A dot at least one width long
 * is drawn round and one width across; a shorter one as a square-ended dash its own length.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";

describe("a dotted line's own period", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.getEngine().dispose();
    });

    const patternFor = (
        styleId: string,
        dashLength: number | undefined,
        dashGap: number,
    ): { kind: string; elementLength: number; gap?: number | undefined } => {
        const spy = vi.spyOn(CustomLineRenderer, "createJoinedLineMesh");
        EdgeMesh.lineBatch(
            new MeshCache(),
            { styleId, width: 1.5, color: "#000000" },
            {
                line: {
                    width: 1.5,
                    color: "#000000",
                    type: "dot",
                    dashGap,
                    ...(dashLength === undefined ? {} : { dashLength }),
                },
            },
            scene,
        );
        const pattern = spy.mock.calls[0]?.[0].pattern;
        assert.exists(pattern);
        return pattern;
    };

    test("Graphviz's dotted 1,5 at width 1.5 repeats every 6, its dot a dash 1 long, shorter than the line is wide", () => {
        const width = 1.5 / 40;
        const { kind, elementLength, gap } = patternFor("gv", 1 / 1.5, 5 / 1.5);
        assert.strictEqual(kind, "dash");
        assert.closeTo(elementLength, width / 1.5, 1e-9);
        assert.closeTo(elementLength + (gap ?? 0), (6 / 1.5) * width, 1e-9);
    });

    test("Pajek's dotted 5 at width 3 repeats every 10, its dot one width round", () => {
        const width = 1.5 / 40;
        const { kind, elementLength, gap } = patternFor("pajek", 5 / 3, 5 / 3);
        assert.strictEqual(kind, "dot");
        assert.closeTo(elementLength, width, 1e-9);
        assert.closeTo(elementLength + (gap ?? 0), (10 / 3) * width, 1e-9);
    });

    test("Cytoscape.js's dotted 1,1 at width 3 draws dashes a third of a width long, a third apart", () => {
        const width = 1.5 / 40;
        const { kind, elementLength, gap } = patternFor("cyjs", 1 / 3, 1 / 3);
        assert.strictEqual(kind, "dash");
        assert.closeTo(elementLength, width / 3, 1e-9);
        assert.closeTo(gap ?? 0, width / 3, 1e-9);
    });

    test("a dot with no length of its own is one width long, its gap as given", () => {
        const width = 1.5 / 40;
        const { elementLength, gap } = patternFor("plain", undefined, 2);
        assert.closeTo(elementLength, width, 1e-9);
        assert.closeTo(gap ?? 0, 2 * width, 1e-9);
    });
});
