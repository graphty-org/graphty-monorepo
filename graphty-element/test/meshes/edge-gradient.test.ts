/**
 * The colors an edge painted in a gradient is drawn in, piece by piece (`gradientPieceColors`):
 * along the line from its source end for a linear gradient, out from its middle for a radial one,
 * the colors at their stops when there is one stop per color, and nothing for "none" or fewer
 * than two colors.
 */
import { assert, describe, it } from "vitest";

import { gradientPieceColors } from "../../src/meshes/edgeGradient";

describe("an edge's gradient pieces", () => {
    it("runs a linear gradient from the source end to the target end", () => {
        const pieces = gradientPieceColors({ colors: "#ff0000 #0000ff" }, 4);
        assert.deepEqual(pieces, ["#df0020", "#9f0060", "#60009f", "#2000df"]);
    });

    it("reads any CSS color, a space inside its parentheses kept", () => {
        assert.deepEqual(gradientPieceColors({ colors: "rgb(255, 0, 0) red" }, 2), ["#ff0000", "#ff0000"]);
    });

    it("places the colors at their stops when there is one stop per color, and evenly otherwise", () => {
        // cyan up to 0.8 of the way, then into magenta: three of the four piece middles are before 0.8
        const stopped = gradientPieceColors({ colors: "#00ffff #ff00ff", stops: "0 0.8" }, 4);
        assert.deepEqual(stopped?.slice(0, 1), ["#28d7ff"]);
        assert.strictEqual(stopped?.[3], "#ff00ff");
        const uneven = gradientPieceColors({ colors: "#00ffff #ff00ff", stops: "0.8" }, 4);
        assert.deepEqual(uneven, gradientPieceColors({ colors: "#00ffff #ff00ff" }, 4));
    });

    it("runs a radial gradient out from the middle to both ends", () => {
        const pieces = gradientPieceColors({ colors: "#ff0000 #0000ff", kind: "radial" }, 4) ?? [];
        // the two middle pieces are nearest the middle, so nearest the first color, and the ends mirror
        assert.deepEqual(pieces, [pieces[3], pieces[2], pieces[1], pieces[0]]);
        assert.strictEqual(pieces[1], "#bf0040");
        assert.strictEqual(pieces[0], "#4000bf");
    });

    it("draws no gradient for kind none, fewer than two colors or none at all", () => {
        assert.isNull(gradientPieceColors({ colors: "#ff0000 #0000ff", kind: "none" }));
        assert.isNull(gradientPieceColors({ colors: "#ff0000" }));
        assert.isNull(gradientPieceColors({ colors: "#ff0000 notacolor" }));
        assert.isNull(gradientPieceColors(undefined));
    });
});
