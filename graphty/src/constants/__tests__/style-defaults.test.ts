import {describe, expect, it} from "vitest";

import {
    DEFAULT_COLOR,
    DEFAULT_SHAPE,
    EDGE_ARROW_DEFAULTS,
    EDGE_LINE_DEFAULTS,
    NODE_COLOR_DEFAULTS,
    NODE_DEFAULTS,
    NODE_EFFECT_DEFAULTS,
    STYLE_DEFAULTS,
    TEXT_DEFAULTS,
    TEXT_EFFECT_DEFAULTS,
} from "../style-defaults";

describe("style-defaults", () => {
    describe("NODE_DEFAULTS", () => {
        it("should have consistent node shape defaults with DEFAULT_SHAPE", () => {
            expect(NODE_DEFAULTS.shapeType).toBe(DEFAULT_SHAPE.type);
        });

        it("should have a valid size", () => {
            expect(NODE_DEFAULTS.size).toBe(1.0);
        });
    });

    describe("NODE_COLOR_DEFAULTS", () => {
        it("should have consistent color defaults with DEFAULT_COLOR", () => {
            expect(NODE_COLOR_DEFAULTS.color).toBe(DEFAULT_COLOR.color);
        });

        it("should have a valid opacity", () => {
            expect(NODE_COLOR_DEFAULTS.opacity).toBe(100);
        });

        it("should have solid as default color mode", () => {
            expect(NODE_COLOR_DEFAULTS.colorMode).toBe("solid");
        });
    });

    describe("NODE_EFFECT_DEFAULTS", () => {
        it("should have glow defaults", () => {
            expect(NODE_EFFECT_DEFAULTS.glowColor).toBe("#FFFFFF");
            expect(NODE_EFFECT_DEFAULTS.glowStrength).toBe(0.5);
        });

        it("should have outline defaults", () => {
            expect(NODE_EFFECT_DEFAULTS.outlineColor).toBe("#000000");
            expect(NODE_EFFECT_DEFAULTS.outlineWidth).toBe(1);
        });

        it("should have wireframe and flatShaded disabled by default", () => {
            expect(NODE_EFFECT_DEFAULTS.wireframe).toBe(false);
            expect(NODE_EFFECT_DEFAULTS.flatShaded).toBe(false);
        });
    });

    describe("EDGE_LINE_DEFAULTS", () => {
        it("should have solid line type by default", () => {
            expect(EDGE_LINE_DEFAULTS.lineType).toBe("solid");
        });

        it("should have valid width and opacity", () => {
            expect(EDGE_LINE_DEFAULTS.width).toBe(1);
            expect(EDGE_LINE_DEFAULTS.opacity).toBe(100);
        });
    });

    describe("EDGE_ARROW_DEFAULTS", () => {
        it("should have none as default arrow type", () => {
            expect(EDGE_ARROW_DEFAULTS.type).toBe("none");
        });

        it("should have valid size", () => {
            expect(EDGE_ARROW_DEFAULTS.size).toBe(1);
        });
    });

    describe("TEXT_DEFAULTS", () => {
        it("should have Arial as default font", () => {
            expect(TEXT_DEFAULTS.fontFamily).toBe("Arial");
        });

        it("should have valid font size and weight", () => {
            expect(TEXT_DEFAULTS.fontSize).toBe(12);
            expect(TEXT_DEFAULTS.fontWeight).toBe(400);
        });

        it("should have above as default position", () => {
            expect(TEXT_DEFAULTS.position).toBe("above");
        });
    });

    describe("TEXT_EFFECT_DEFAULTS", () => {
        it("should have outline defaults", () => {
            expect(TEXT_EFFECT_DEFAULTS.outlineColor).toBe("#000000");
            expect(TEXT_EFFECT_DEFAULTS.outlineWidth).toBe(0);
        });

        it("should have shadow defaults", () => {
            expect(TEXT_EFFECT_DEFAULTS.shadowColor).toBe("#000000");
            expect(TEXT_EFFECT_DEFAULTS.shadowBlur).toBe(0);
        });
    });

    describe("STYLE_DEFAULTS aggregate", () => {
        it("should contain all category defaults", () => {
            expect(STYLE_DEFAULTS.node).toBe(NODE_DEFAULTS);
            expect(STYLE_DEFAULTS.nodeColor).toBe(NODE_COLOR_DEFAULTS);
            expect(STYLE_DEFAULTS.nodeEffect).toBe(NODE_EFFECT_DEFAULTS);
            expect(STYLE_DEFAULTS.edgeLine).toBe(EDGE_LINE_DEFAULTS);
            expect(STYLE_DEFAULTS.edgeArrow).toBe(EDGE_ARROW_DEFAULTS);
            expect(STYLE_DEFAULTS.text).toBe(TEXT_DEFAULTS);
            expect(STYLE_DEFAULTS.textEffect).toBe(TEXT_EFFECT_DEFAULTS);
        });
    });

    describe("DEFAULT_SHAPE", () => {
        it("should have icosphere as default type", () => {
            expect(DEFAULT_SHAPE.type).toBe("icosphere");
        });

        it("should have size 1", () => {
            expect(DEFAULT_SHAPE.size).toBe(1);
        });
    });

    describe("DEFAULT_COLOR", () => {
        it("should be solid mode", () => {
            expect(DEFAULT_COLOR.mode).toBe("solid");
        });

        it("should have indigo color", () => {
            expect(DEFAULT_COLOR.color).toBe("#6366F1");
        });
    });
});
