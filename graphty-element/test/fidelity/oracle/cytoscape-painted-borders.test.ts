/**
 * @file How the oracle comparison reads Cytoscape desktop's patterned node borders, which its SVG export draws as the
 * stroke's own outline, filled: the path data below is copied from its export of the specimen sheet
 * `graph-io/test/fidelity/oracles/cx-specimen-node-fills-borders.svg` (border width 4, coordinates rounded to two
 * places). A sine-wave border is a crest and a trough a piece, each drawn straight where it starts round the node; a
 * contiguous-arrow border a chain of chevrons reaching two widths either side of the ring; a zigzag one Java2D's stroke
 * of a closed zigzag, its inner corners drawn through the corner's own point.
 */
import { assert, describe, it } from "vitest";

import { outlinePaintedAsFill, type Pt } from "./primitives";

const SINE_BORDER =
    "M 616.50 733.51 L 612.50 733.31 Q 602.26 737.80 612.00 743.29 Q 629.73 749.19 611.50 753.28 L 615.49 " +
    "753.48 Q 629.73 749.19 616 743.5 Q 602.26 737.80 616.50 733.51 M 614.42 755.24 L 613.04 751.48 Q " +
    "604.91 743.81 603.65 754.92 Q 605.14 773.54 594.26 758.36 L 595.64 762.11 Q 605.14 773.54 605.03 " +
    "758.68 Q 604.91 743.81 614.42 755.24 M 593.57 760.73 L 596.65 758.19 Q 601.18 747.97 590.29 750.47 Q " +
    "573.22 758.07 583.93 742.76 L 580.84 745.30 Q 573.22 758.07 587.20 753.02 Q 601.18 747.97 593.57 " +
    "760.73 M 580.54 742.05 L 583.62 744.60 Q 594.52 747.11 589.99 736.89 Q 579.28 721.57 596.35 729.17 L " +
    "593.26 726.63 Q 579.28 721.57 586.90 734.34 Q 594.52 747.11 580.54 742.05 M 594.89 725.68 L 593.89 " +
    "729.55 Q 596.24 740.48 603.58 732.04 Q 612.90 715.85 613.26 734.53 L 614.26 730.66 Q 612.90 715.85 " +
    "604.57 728.17 Q 596.24 740.48 594.89 725.68 M 615.47 733.03 L 611.47 733.23 Q 601.74 738.73 611.98 " +
    "743.22 Q 630.21 747.31 612.48 753.21 L 616.48 753.01 Q 630.21 747.31 615.97 743.02 Q 601.74 738.73 " +
    "615.47 733.03";
const ZIGZAG_BORDER =
    "M 990.56 741.92 L 990.56 741.92 L 999.37 748.80 L 1004.99 753.18 L 997.91 752.36 L 976.74 749.91 L " +
    "976.97 747.92 L 978.90 748.43 L 973.26 769.80 L 970.25 781.19 L 969.33 769.45 L 967.65 748.05 L " +
    "969.65 747.89 L 969.87 749.88 L 948.73 752.31 L 937.45 753.61 L 947.61 748.54 L 967.24 738.73 L " +
    "968.13 740.52 L 966.36 741.46 L 956.78 723.39 L 948.54 707.86 L 960.06 721.15 L 972.94 736.00 L " +
    "971.42 737.31 L 970.10 735.81 L 986.91 721.04 L 995.18 713.78 L 990.00 723.48 L 980.32 741.61 L " +
    "978.56 740.67 L 979.06 738.74 L 989.84 741.56 L 990.23 741.66 L 990.56 741.92 M 988.10 745.07 L " +
    "989.33 743.5 L 988.82 745.43 L 978.05 742.61 L 975.60 741.97 L 976.79 739.73 L 986.47 721.60 L " +
    "988.23 722.54 L 989.55 724.04 L 972.74 738.81 L 971.23 740.14 L 969.91 738.62 L 957.04 723.77 L " +
    "958.55 722.46 L 960.32 721.52 L 969.90 739.59 L 970.86 741.40 L 969.02 742.31 L 949.40 752.11 L " +
    "948.51 750.33 L 948.28 748.34 L 969.42 745.91 L 971.48 745.67 L 971.64 747.74 L 973.32 769.14 L " +
    "971.32 769.29 L 969.39 768.78 L 975.03 747.41 L 975.48 745.74 L 977.20 745.94 L 998.37 748.39 L " +
    "998.14 750.38 L 996.91 751.95 L 988.10 745.07 z";
/** A zigzag round a small node (xgmml-syn-bypass's B61, width 2 drawn at 0.83): its inner outline pokes past the outer. */
const SMALL_ZIGZAG_BORDER =
    "M 125.3 719.09 L 125.3 719.09 L 130.3 709.09 L 131.19 707.3 L 132.09 709.09 L 142.09 729.09 L 141.19 " +
    "729.54 L 140.3 729.09 L 150.3 709.09 L 152.16 709.8 L 146.06 732.13 L 145.1 731.87 L 145.24 730.88 L " +
    "167.38 734.04 L 169.36 734.33 L 167.94 735.74 L 152.13 751.55 L 151.42 750.84 L 151.56 749.85 L 173.7 " +
    "753.02 L 173.56 754.01 L 173.24 754.95 L 154.26 748.48 L 154.58 747.54 L 155.48 747.98 L 145.48 767.98 L " +
    "142.75 773.45 L 143.59 767.4 L 146.01 750.18 L 147 750.32 L 146.85 751.31 L 124.72 748.14 L 122.74 " +
    "747.86 L 124.15 746.45 L 139.96 730.64 L 140.67 731.34 L 140.53 732.33 L 118.39 729.17 L 116.55 728.91 L " +
    "117.79 727.52 L 125.45 718.87 L 126.19 719.54 L 125.3 719.09 M 127.09 719.98 L 127.03 720.1 L 126.94 " +
    "720.2 L 119.28 728.84 L 118.54 728.18 L 118.68 727.19 L 140.81 730.35 L 142.79 730.64 L 141.38 732.05 L " +
    "125.57 747.86 L 124.86 747.15 L 125 746.16 L 147.14 749.33 L 148.12 749.47 L 147.99 750.46 L 145.57 " +
    "767.68 L 144.58 767.54 L 143.69 767.09 L 153.69 747.09 L 154.08 746.31 L 154.91 746.59 L 173.88 753.06 L " +
    "173.42 755 L 151.28 751.83 L 149.3 751.55 L 150.72 750.14 L 166.53 734.33 L 167.23 735.03 L 167.09 " +
    "736.02 L 144.96 732.86 L 143.84 732.7 L 144.13 731.61 L 150.23 709.27 L 151.19 709.54 L 152.09 709.98 L " +
    "142.09 729.98 L 141.19 731.77 L 140.3 729.98 L 130.3 709.98 L 131.19 709.54 L 132.09 709.98 L 127.09 " +
    "719.98 z";
const ARROW_BORDER =
    "M 365.41 532.40 L 365.16 537.40 L 359.42 532.10 L 359.32 534.10 L 365.06 539.39 L 364.81 544.39 L " +
    "368.80 544.59 L 369.05 539.59 L 375.30 534.90 L 375.40 532.91 L 369.15 537.60 L 369.41 532.60 L " +
    "365.41 532.40 M 365.05 543.48 L 361.87 547.33 L 360.42 539.66 L 359.15 541.20 L 360.60 548.88 L " +
    "357.41 552.73 L 360.50 555.28 L 363.68 551.42 L 371.49 551.38 L 372.77 549.84 L 364.96 549.88 L " +
    "368.14 546.02 L 365.05 543.48 M 358.12 552.14 L 353.12 552.39 L 357.81 546.15 L 355.82 546.25 L " +
    "351.12 552.49 L 346.13 552.74 L 346.33 556.74 L 351.33 556.49 L 356.62 562.23 L 358.62 562.13 L " +
    "353.32 556.39 L 358.32 556.13 L 358.12 552.14 M 346.99 553.15 L 343.13 549.97 L 350.81 548.52 L " +
    "349.26 547.25 L 341.59 548.70 L 337.73 545.52 L 335.19 548.60 L 339.04 551.78 L 339.08 559.59 L " +
    "340.62 560.87 L 340.59 553.06 L 344.44 556.24 L 346.99 553.15 M 338.16 546.35 L 337.41 541.41 L " +
    "344.09 545.45 L 343.79 543.47 L 337.11 539.43 L 336.35 534.49 L 332.40 535.09 L 333.15 540.04 L " +
    "327.97 545.89 L 328.28 547.86 L 333.45 542.01 L 334.21 546.96 L 338.16 546.35 M 335.74 535.24 L " +
    "338.92 531.38 L 340.36 539.06 L 341.64 537.52 L 340.19 529.84 L 343.37 525.98 L 340.29 523.44 L " +
    "337.11 527.30 L 329.30 527.33 L 328.02 528.88 L 335.83 528.84 L 332.65 532.69 L 335.74 535.24 M " +
    "342.46 526.28 L 347.30 525.03 L 343.95 532.09 L 345.89 531.59 L 349.24 524.54 L 354.08 523.29 L " +
    "353.09 519.42 L 348.24 520.66 L 341.91 516.10 L 339.97 516.59 L 346.31 521.16 L 341.46 522.41 L " +
    "342.46 526.28 M 353.16 523.38 L 357.43 525.98 L 350.05 528.51 L 351.76 529.55 L 359.14 527.02 L " +
    "363.42 529.61 L 365.49 526.19 L 361.22 523.60 L 360.06 515.87 L 358.35 514.84 L 359.51 522.56 L " +
    "355.24 519.96 L 353.16 523.38 M 363.04 528.76 L 364.29 533.61 L 357.23 530.26 L 357.73 532.20 L " +
    "364.79 535.54 L 366.03 540.39 L 369.91 539.39 L 368.66 534.55 L 373.23 528.21 L 372.73 526.27 L " +
    "368.16 532.61 L 366.92 527.77 L 363.04 528.76";

/**
 * A path's subpaths, each sampled every quarter unit along it as the SVG reader samples a path.
 * @param d - path data of M, L and Q commands
 * @returns the subpaths
 */
function sampled(d: string): Pt[][] {
    const tokens = d.match(/[MLQz]|-?[\d.]+/g) ?? [];
    const drawn: Pt[][] = [];
    let current: Pt[] = [];
    let command = "";
    for (let i = 0; i < tokens.length;) {
        if (/[MLQz]/.test(tokens[i])) {
            command = tokens[i++];
            if (command === "M" && current.length > 0) {
                drawn.push(current);
                current = [];
            }
            continue;
        }
        const n = (k: number): number => Number(tokens[i + k]);
        if (command === "Q") {
            const p0 = current[current.length - 1];
            for (let k = 1; k <= 64; k++) {
                const s = k / 64;
                const [a, b, c] = [(1 - s) ** 2, 2 * s * (1 - s), s * s];
                current.push([a * p0[0] + b * n(0) + c * n(2), a * p0[1] + b * n(1) + c * n(3)]);
            }
            i += 4;
        } else {
            current.push([n(0), n(1)]);
            i += 2;
        }
    }
    drawn.push(current);
    return drawn.map((q) => {
        const closed = [...q, q[0]];
        const even: Pt[] = [];
        let [walked, next] = [0, 0];
        for (let k = 1; k < closed.length; k++) {
            const [a, b] = [closed[k - 1], closed[k]];
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            for (; next <= walked + length; next += 0.25) {
                const t = length > 0 ? (next - walked) / length : 0;
                even.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
            walked += length;
        }
        return even;
    });
}

describe("Cytoscape desktop's patterned node borders, painted as fills", () => {
    it("reads a sine wave drawn a period at a time as a sine wave, as thin as its band", () => {
        const read = outlinePaintedAsFill(sampled(SINE_BORDER));
        assert.strictEqual(read?.dashClass, "sinewave");
        assert.closeTo(read?.width ?? 0, 1.33, 0.1);
    });

    it("reads a zigzag stroked with Java2D's inner joins as a zigzag of the stroke's width", () => {
        const read = outlinePaintedAsFill(sampled(ZIGZAG_BORDER));
        assert.strictEqual(read?.dashClass, "zigzag");
        assert.closeTo(read?.width ?? 0, 4, 0.1);
    });

    it("reads a zigzag round a small node as a zigzag, though its inner outline's turns poke past the outer one", () => {
        const read = outlinePaintedAsFill(sampled(SMALL_ZIGZAG_BORDER));
        assert.strictEqual(read?.dashClass, "zigzag");
        assert.closeTo(read?.width ?? 0, 2, 0.2);
    });

    it("reads a chain of chevrons round the node as arrows", () => {
        assert.strictEqual(outlinePaintedAsFill(sampled(ARROW_BORDER))?.dashClass, "arrows");
    });
});
