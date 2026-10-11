/**
 * @file Helpers on a real model: with a read-only `counter` (query) and a `stylist` (style), "find
 * the nodes with degree 3 or more, then color them red" is handed to at least one helper and ends
 * with exactly those nodes red and an answer in text.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import type { AiEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";

/** Degrees: a 4, b 3, c 2, e 2, d 1, f 1, g 1. */
const GRAPH = {
    nodes: ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, label: id })),
    edges: [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "a", target: "e" },
        { source: "b", target: "c" },
        { source: "b", target: "f" },
        { source: "e", target: "g" },
    ],
};

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

/**
 * Whether a resolved color is red: its red part well above the other two.
 * @param value - The color as the session resolves it (a hex string, or channels).
 * @returns Whether it is red.
 */
function isRed(value: unknown): boolean {
    const color = value as { r?: number; g?: number; b?: number; hex?: string } | string | undefined;
    const hex = typeof color === "string" ? color : color?.hex;
    if (typeof hex === "string" && /^#[0-9a-f]{6}/i.test(hex)) {
        const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
        return r > 2 * g && r > 2 * b;
    }

    if (typeof color === "object" && typeof color.r === "number") {
        return color.r > 2 * (color.g ?? 0) && color.r > 2 * (color.b ?? 0);
    }

    return hex?.toLowerCase() === "red";
}

/**
 * The nodes the session paints red.
 * @param session - The session.
 * @returns Their ids.
 */
function redNodes(session: GraphSession): string[] {
    return GRAPH.nodes
        .map((node) => node.id)
        .filter((id) => isRed(session.styles.explain({ node: id }).merged["node.color" as never]));
}

describe.skipIf(skipIfNoApiKey())("helpers on a real model", () => {
    it("a counter and a stylist color exactly the nodes of degree 3 or more red", async () => {
        const session = await assistantSession(GRAPH);
        const events: AiEvent[] = [];
        harness = await LlmRegressionTestHarness.create({
            session,
            agents: [
                {
                    name: "counter",
                    purpose: "Reads and counts nodes and edges; never changes anything.",
                    commands: ["query"],
                },
                { name: "stylist", purpose: "Colors and sizes nodes.", commands: ["style"] },
            ],
            onEvent: (event) => events.push(event),
        });

        const result = await harness.testPrompt("find the nodes with degree 3 or more, then color them red");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result.toolCalls));
        assert.isNotEmpty(result.llmText ?? "", "the model answers in text");
        assert.isAtLeast(
            events.filter((event) => event.type === "ai-agent-start").length,
            1,
            "a helper was handed a task",
        );
        assert.deepStrictEqual(redNodes(session), ["a", "b"]);
    });
});
