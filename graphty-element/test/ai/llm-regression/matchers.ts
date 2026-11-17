/**
 * @file Whether a real model named the algorithm, layout or camera view a prompt asked for. Each
 * name goes through the element's own resolution (the one the tools apply) and must then equal the
 * registered id exactly: "graphty:edge-betweenness" is not "betweenness".
 */

import { algorithmKeyOf, BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import { layoutIdForEngine } from "../../../src/catalog/layouts";
import { KNOWN_CAMERA_IDS, KNOWN_LAYOUT_IDS } from "../../../src/catalog/types";

/**
 * Whether the model's algorithm name is the built-in algorithm expected.
 * @param actual - The name as the model wrote it ("PageRank", "graphty:degree", a legacy key).
 * @param expected - A built-in algorithm key.
 * @returns Whether it resolves to that key.
 */
export function isAlgorithm(actual: unknown, expected: string): boolean {
    return typeof actual === "string" && algorithmKeyOf(actual, BUILT_IN_ALGORITHMS)?.key === expected;
}

/**
 * Whether the model's layout name, or engine name ("d3", "ngraph"), is the layout expected.
 * @param actual - The name as the model wrote it.
 * @param expected - A built-in layout id.
 * @returns Whether it resolves to that id.
 */
export function isLayout(actual: unknown, expected: string): boolean {
    if (typeof actual !== "string") {
        return false;
    }

    const lower = actual.trim().toLowerCase().replaceAll("_", "-");
    const id = (KNOWN_LAYOUT_IDS as readonly string[]).includes(lower) ? lower : layoutIdForEngine(lower);
    // "force-2d" is the force layout on its 2D engine.
    return (id === "force-2d" ? "force" : id) === expected;
}

/**
 * Whether the model's camera view is the one expected.
 * @param actual - The view as the model wrote it.
 * @param expected - A built-in camera view id.
 * @returns Whether it is that id, ignoring case.
 */
export function isCameraView(actual: unknown, expected: string): boolean {
    const id = KNOWN_CAMERA_IDS.find(
        (each) => typeof actual === "string" && each.toLowerCase() === actual.trim().toLowerCase(),
    );
    return id === expected;
}
