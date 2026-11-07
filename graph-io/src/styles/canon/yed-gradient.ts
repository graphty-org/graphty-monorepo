/**
 * How yEd paints a node's two-color gradient (`color` into `color2`), shared by the readers of its GraphML and GML.
 * Measured on yEd 3.25.1's own SVG export (yed-graphml-specimen-node-fills-borders, graphml-synthetic-nodes,
 * graphml-scala-collection-mutable, gml-synthetic-coverage): a flowchart or other generic node, and a diamond, run
 * from their box's top-left corner to its bottom-right one; every other shape node runs left to right.
 */

/** How a yEd node runs its gradient: corner to corner, or left to right. */
type YedGradientRun = "corner" | "across";

/**
 * The `fillGradientAngle` yEd's gradient on a node translates into. graphty-element paints its ramp across a square and
 * stretches the square over the node's box, so the screen direction its color changes along is
 * atan2(sin(angle) / height, cos(angle) / width). yEd's corner-to-corner ramp changes color along the box's diagonal,
 * atan2(height, width) on the screen, which is the stretched ramp at atan2(height^2, width^2).
 * ponytail: yEd's left-to-right ramp starts a third of the way across and mirrors back over the left third
 * (`spreadMethod="reflect"`); this runs it from the left side, as the oracle comparison reads it. A three-stop ramp
 * needs the comparison to read a gradient's spread across its node first.
 * @param run - how the node runs its gradient
 * @param width - the node's width
 * @param height - the node's height
 * @returns the angle, in degrees
 */
export function yedGradientAngle(run: YedGradientRun, width: number, height: number): number {
    if (run === "across") {
        return 0;
    }
    if (!(width > 0 && height > 0)) {
        return 45;
    }
    return Math.round(((Math.atan2(height * height, width * width) * 180) / Math.PI) * 1000) / 1000;
}
