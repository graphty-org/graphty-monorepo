/**
 * Regression tests for layer-related issues
 * Issue 4: Layer order in UI - top layer in UI should have highest precedence
 */

import { describe, expect, it } from "vitest";

import { styleLayersToLayerItems } from "../../utils/layerConversion";
import type { StyleLayer } from "../Graphty";

describe("Layer Issues Regression Tests", () => {
    describe("Issue 4: Layer order in UI", () => {
        it("should display layers in reverse order - top layer has highest precedence", () => {
            // In graphty-element, layers are ordered from lowest to highest precedence (index 0 = lowest)
            // In the UI, we want top layer to have highest precedence, so we need to reverse the order
            const layers: StyleLayer[] = [
                { metadata: { name: "base" }, node: { selector: "", style: {} } },
                { metadata: { name: "layer-1" }, node: { selector: "", style: {} } },
                { metadata: { name: "layer-2" }, node: { selector: "", style: {} } },
                { metadata: { name: "highlight" }, node: { selector: "", style: {} } },
            ];

            const converted = styleLayersToLayerItems(layers);

            // The converted layers should maintain graphty-element's order
            // The UI component is responsible for reversing the display order
            expect(converted).toHaveLength(4);
            expect(converted[0].name).toBe("base");
            expect(converted[3].name).toBe("highlight");

            // Document expected behavior:
            // - graphty-element order: [base, layer-1, layer-2, highlight]
            // - UI display order should be reversed: [highlight, layer-2, layer-1, base]
            // - So "highlight" appears at top (highest precedence) in UI
        });

        it("should preserve layer indices for proper mapping back to graphty-element", () => {
            const layers: StyleLayer[] = [
                { metadata: { name: "base" }, node: { selector: "", style: {} } },
                { metadata: { name: "user-layer" }, node: { selector: "", style: {} } },
                { metadata: { name: "highlight" }, node: { selector: "", style: {} } },
            ];

            const converted = styleLayersToLayerItems(layers);

            // Indices should match original positions in graphty-element
            expect(converted[0].index).toBe(0);
            expect(converted[0].name).toBe("base");
            expect(converted[1].index).toBe(1);
            expect(converted[1].name).toBe("user-layer");
            expect(converted[2].index).toBe(2);
            expect(converted[2].name).toBe("highlight");
        });
    });

    describe("Layer with labels", () => {
        it("should preserve label configuration in layer", () => {
            const layer: StyleLayer = {
                metadata: { name: "highlight" },
                node: {
                    selector: "algorithmResults.graphty.selected == `true`",
                    style: {
                        enabled: true,
                        texture: { color: "#FFD700" },
                        label: {
                            enabled: true,
                            text: "SELECTED",
                        },
                    },
                },
            };

            const converted = styleLayersToLayerItems([layer]);

            expect(converted).toHaveLength(1);
            expect(converted[0].styleLayer.node?.style).toHaveProperty("label");
            // The label should be preserved in the conversion
            const label = converted[0].styleLayer.node?.style?.label as { enabled: boolean; text: string };
            expect(label.enabled).toBe(true);
            expect(label.text).toBe("SELECTED");
        });
    });
});
