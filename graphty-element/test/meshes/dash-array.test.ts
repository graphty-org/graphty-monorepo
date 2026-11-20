/**
 * A line's own dash array (`line.dashArray`): dashes and gaps of several lengths, in widths, drawn by the joined line's
 * shader in place of a dashed, dotted or dash-dot line's own elements (vis.js [12, 3, 3, 3]).
 */
import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";

const line = (type: string, dashArray?: string): EdgeStyleConfig =>
    ({
        line: { width: 1.5, color: "#000000", type, ...(dashArray === undefined ? {} : { dashArray }) },
    }) as EdgeStyleConfig;

describe("a line's own dash array", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.getEngine().dispose();
    });

    test("reads widths separated by spaces or commas, an odd count repeated, at most 8", () => {
        assert.deepEqual(EdgeMesh.dashArrayOf(line("dash-dot", "9 1, 3 1")), [9, 1, 3, 1]);
        assert.deepEqual(EdgeMesh.dashArrayOf(line("dash", "2 1 1")), [2, 1, 1, 2, 1, 1]);
        assert.deepEqual(EdgeMesh.dashArrayOf(line("dot", "1 2 3 4 5 6 7 8 9 10")), [1, 2, 3, 4, 5, 6, 7, 8]);
    });

    test("changes nothing unset, unreadable, all zero or on another line type", () => {
        assert.isNull(EdgeMesh.dashArrayOf(line("dash-dot")));
        assert.isNull(EdgeMesh.dashArrayOf(line("dash", "a b")));
        assert.isNull(EdgeMesh.dashArrayOf(line("dash", "0 0")));
        assert.isNull(EdgeMesh.dashArrayOf(line("dash", "3 -1")));
        assert.isNull(EdgeMesh.dashArrayOf(line("solid", "3 1")));
        assert.isNull(EdgeMesh.dashArrayOf(line("star", "3 1")));
        assert.isTrue(EdgeMesh.drawsAsPattern(line("dash-dot")));
    });

    test("draws a dash-dot line with one as a joined line of those dashes, repeating every period", () => {
        const style = line("dash-dot", "9 1 3 1");
        assert.isFalse(EdgeMesh.drawsAsPattern(style));
        const spy = vi.spyOn(CustomLineRenderer, "createJoinedLineMesh");
        EdgeMesh.lineBatch(new MeshCache(), { styleId: "vis", width: 1.5, color: "#000000" }, style, scene);
        const pattern = spy.mock.calls[0]?.[0].pattern;
        assert.exists(pattern);
        const width = 1.5 / 40;
        assert.strictEqual(pattern.kind, "dash");
        assert.closeTo(pattern.elementLength + (pattern.gap ?? 0), 14 * width, 1e-9);
        assert.deepEqual(
            pattern.dashes?.map((d) => d / width),
            [9, 1, 3, 1].map((d) => (d * width) / width),
        );
    });
});
