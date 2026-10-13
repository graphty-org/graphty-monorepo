/**
 * @file A remembering assistant on a real model: a follow-up that says "those" reaches the nodes
 * the message before it picked, because with `history: "memory"` the model is shown that message.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { styleOf } from "../tasks/kit";

/** Five hubs joined to each other, each with three leaves of its own: degree 7 against degree 1. */
const HUBS = ["h1", "h2", "h3", "h4", "h5"];
const LEAVES = HUBS.flatMap((hub) => [1, 2, 3].map((leaf) => `${hub}-leaf${String(leaf)}`));
const NODES = [...HUBS, ...LEAVES].map((id) => ({ id, label: id }));
const EDGES = [
    ...HUBS.flatMap((a, i) => HUBS.slice(i + 1).map((b) => ({ source: a, target: b }))),
    ...LEAVES.map((leaf) => ({ source: leaf.split("-")[0], target: leaf })),
];

/**
 * Whether a resolved color is red: its red part well above the other two.
 * @param value - The color as the session resolves it (a hex string, or channels with or without one).
 * @returns Whether it is red.
 */
function isRed(value: unknown): boolean {
    const color = value as { r?: number; g?: number; b?: number; hex?: string } | string | undefined;
    const hex = typeof color === "string" ? color : color?.hex;
    let [r, g, b] = [color && typeof color === "object" ? color.r : undefined, 0, 0];
    if (typeof hex === "string" && /^#[0-9a-f]{6}/i.test(hex)) {
        [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
    } else if (typeof color === "object" && typeof color.r === "number") {
        [r, g, b] = [color.r, color.g ?? 0, color.b ?? 0];
    } else if (hex?.toLowerCase() === "red") {
        return true;
    }

    return r !== undefined && r > 0 && r > 2 * g && r > 2 * b;
}

/**
 * A node's size as the session paints it; 1, the default, when nothing set one.
 * @param session - The session.
 * @param id - The node.
 * @returns The size.
 */
function sizeOf(session: GraphSession, id: string): number {
    const size = styleOf(session, id, "node.size");
    return typeof size === "number" ? size : 1;
}

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

describe.skipIf(skipIfNoApiKey())("a remembered conversation on a real model", () => {
    it("makes the five nodes it colored bigger when asked about 'those'", async () => {
        const session = await assistantSession({ nodes: NODES, edges: EDGES });
        harness = await LlmRegressionTestHarness.create({ session, history: "memory" });

        await harness.testPrompt("color the five highest-degree nodes red");
        const red = [...HUBS, ...LEAVES].filter((id) => isRed(styleOf(session, id, "node.color")));
        assert.deepStrictEqual(red, HUBS, "the first message colors exactly the five hubs red");

        await harness.testPrompt("now make those bigger");
        for (const hub of HUBS) {
            assert.isTrue(isRed(styleOf(session, hub, "node.color")), `${hub} is still red`);
            assert.isAbove(sizeOf(session, hub), 1, `${hub} is bigger`);
        }

        for (const leaf of LEAVES) {
            assert.isFalse(isRed(styleOf(session, leaf, "node.color")), `${leaf} is not red`);
            assert.strictEqual(sizeOf(session, leaf), 1, `${leaf} kept its size`);
        }
    });
});
