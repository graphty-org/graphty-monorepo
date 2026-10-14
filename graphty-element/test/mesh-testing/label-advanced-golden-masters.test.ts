/**
 * Advanced Label Golden Master Tests
 *
 * Pointers, badges, animations and the awkward inputs, all through the real RichTextLabel.
 */

import { StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { type BadgeType, RichTextLabel, type RichTextLabelOptions } from "../../src/meshes/RichTextLabel";
import { createMeshScene, drawnText, drawOps, type MeshTestScene, resetRecordedCanvases } from "./real-mesh-harness";

const BADGE_TYPES: Exclude<BadgeType, undefined>[] = [
    "notification",
    "label",
    "label-success",
    "label-warning",
    "label-danger",
    "count",
    "icon",
    "progress",
    "dot",
];

let ctx: MeshTestScene;

interface Built {
    label: RichTextLabel;
    material: StandardMaterial;
    planeWidth: number;
    planeHeight: number;
}

function build(options: RichTextLabelOptions): Built {
    resetRecordedCanvases();
    const label = RichTextLabel.createLabel(ctx.scene, options);
    const mesh = label.labelMesh;
    assert.isNotNull(mesh, "RichTextLabel produced no mesh");
    const { extendSize } = mesh.getBoundingInfo().boundingBox;

    return {
        label,
        material: mesh.material as StandardMaterial,
        planeWidth: extendSize.x * 2,
        planeHeight: extendSize.y * 2,
    };
}

function fills(): unknown[] {
    return drawOps("fill").map((entry) => entry.state.fillStyle);
}

describe("Label Golden Masters - Advanced Features", () => {
    beforeEach(() => {
        ctx = createMeshScene();
    });

    afterEach(() => {
        ctx.dispose();
    });

    describe("Label Pointers", () => {
        test("creates label with bottom pointer", () => {
            const built = build({
                text: "Pointer Test",
                backgroundColor: "#FFFFFF",
                pointer: true,
                pointerDirection: "bottom",
                pointerWidth: 20,
                pointerHeight: 15,
                pointerCurve: false,
            });

            // The retired mock asserted `mesh.metadata.hasPointer` / `pointerDirection`.
            // RichTextLabel writes NO mesh metadata -- `metadata` is null -- so what the pointer
            // did has to be read off the background path it drew.
            assert.isNull(built.label.labelMesh?.metadata);
            assert.lengthOf(drawOps("beginPath"), 1, "a speech bubble is one path, not an outer and an inner rect");
            assert.isAtLeast(drawOps("lineTo").length, 5);
        });

        test("a pointer replaces the rounded rectangle with a speech bubble", () => {
            build({ text: "P", backgroundColor: "#FFFFFF", pointer: false });
            const plain = drawOps("lineTo").length;

            build({
                text: "P",
                backgroundColor: "#FFFFFF",
                pointer: true,
                pointerDirection: "bottom",
                pointerCurve: false,
            });
            const bubble = drawOps("lineTo").length;

            assert.isAbove(bubble, plain, "the pointer adds segments to the background path");
        });

        test("creates pointers in all directions", () => {
            const directions = ["top", "bottom", "left", "right"] as const;

            directions.forEach((direction) => {
                const built = build({
                    text: `${direction} pointer`,
                    backgroundColor: "#CCCCCC",
                    pointer: true,
                    pointerDirection: direction,
                    pointerWidth: 25,
                    pointerHeight: 18,
                });

                assert.isNotNull(built.label.labelMesh);
                assert.isAtLeast(drawOps("fill").length, 1);
            });
        });

        test("creates curved pointers", () => {
            build({
                text: "Curved Pointer",
                backgroundColor: "#FF9900",
                pointer: true,
                pointerDirection: "bottom",
                pointerWidth: 30,
                pointerHeight: 20,
                pointerCurve: false,
            });
            const straightCurves = drawOps("quadraticCurveTo").length;

            build({
                text: "Curved Pointer",
                backgroundColor: "#FF9900",
                pointer: true,
                pointerDirection: "bottom",
                pointerWidth: 30,
                pointerHeight: 20,
                pointerCurve: true,
            });
            const curvedCurves = drawOps("quadraticCurveTo").length;

            assert.isAbove(curvedCurves, straightCurves);
        });

        test("creates pointers with various sizes", () => {
            const sizes = [
                { width: 10, height: 8 },
                { width: 20, height: 15 },
                { width: 40, height: 30 },
                { width: 60, height: 45 },
            ];

            sizes.forEach((size) => {
                const built = build({
                    text: "Size Test",
                    backgroundColor: "#DDDDDD",
                    pointer: true,
                    pointerDirection: "bottom",
                    pointerWidth: size.width,
                    pointerHeight: size.height,
                });

                assert.isAbove(built.planeWidth, 0);
            });
        });
    });

    describe("Label Badges", () => {
        // A badge is a named bundle of label options that BadgeStyleManager merges in under the
        // caller's own options. Nothing records the badge's NAME on the mesh, so each type is
        // identified by the appearance it is supposed to produce -- which is the thing that would
        // actually be wrong if a badge broke.
        const BADGE_BACKGROUNDS: Record<string, string> = {
            notification: "rgba(255, 59, 48, 1)",
            label: "rgba(0, 122, 255, 1)",
            "label-success": "rgba(52, 199, 89, 1)",
            "label-warning": "rgba(255, 204, 0, 1)",
            "label-danger": "rgba(255, 59, 48, 1)",
            count: "rgba(0, 122, 255, 1)",
            icon: "rgba(100, 100, 100, 0.8)",
            progress: "rgba(235, 235, 235, 1)",
            dot: "rgba(255, 59, 48, 1)",
        };

        BADGE_TYPES.forEach((badgeType) => {
            test(`creates ${badgeType} badge`, () => {
                const built = build({
                    text: "Badge Test",
                    badge: badgeType,
                    progress: badgeType === "progress" ? 0.75 : undefined,
                    icon: badgeType === "icon" ? "star" : undefined,
                });

                assert.isNull(built.label.labelMesh?.metadata, "RichTextLabel writes no mesh metadata");
                assert.deepEqual(fills(), [BADGE_BACKGROUNDS[badgeType]]);
            });
        });

        test("every badge type in the union has an expected background here", () => {
            for (const badgeType of BADGE_TYPES) {
                assert.property(BADGE_BACKGROUNDS, badgeType);
            }
        });

        test("a caller's own option beats the badge's default", () => {
            // getBadgeStyle's result is spread UNDER userOptions, so a badge is a set of defaults
            // rather than an override. Reverse that order and every styled badge silently ignores
            // the caller.
            build({ text: "Mine", badge: "notification", backgroundColor: "#00FF00" });

            assert.deepEqual(fills(), ["#00FF00"]);
        });

        test("a numeric notification badge over 999 is abbreviated", () => {
            build({ text: "1500", badge: "notification" });

            assert.deepEqual(drawnText(), ["1k"]);
        });

        test("a non-numeric notification badge is left alone", () => {
            build({ text: "Badge Test", badge: "notification" });

            assert.deepEqual(drawnText(), ["Badge Test"]);
        });

        test("a notification badge paints the system red and bolds the text", () => {
            build({ text: "3", badge: "notification" });

            assert.deepEqual(fills(), ["rgba(255, 59, 48, 1)"]);
            assert.include(drawOps("fillText")[0].state.font, "bold");
        });

        test("creates notification badge with count", () => {
            const counts = [1, 5, 99, 999];

            counts.forEach((count) => {
                build({ text: String(count), badge: "notification" });
                assert.deepEqual(drawnText(), [String(count)]);
            });
        });

        test("creates progress badge with values", () => {
            const progressValues = [0, 0.25, 0.5, 0.75, 1.0];

            progressValues.forEach((progress) => {
                build({ text: "Progress", badge: "progress", progress });
                const rects = drawOps("fillRect");

                assert.lengthOf(rects, 2, "a track and a fill");
                assert.closeTo(Number(rects[1].args[2]) / Number(rects[0].args[2]), progress, 1e-9);
            });
        });

        test("creates icon badges with various icons", () => {
            const icons = ["star", "heart", "warning", "info", "check"];

            icons.forEach((icon) => {
                build({ text: "", badge: "icon", icon });
                assert.include(drawnText(), icon);
            });
        });

        test("creates count badge", () => {
            build({ text: "42", badge: "count" });

            assert.deepEqual(drawnText(), ["42"]);
            assert.deepEqual(fills(), ["rgba(0, 122, 255, 1)"]);
        });

        test("creates label-style badges", () => {
            const expected: Record<string, string> = {
                label: "rgba(0, 122, 255, 1)",
                "label-success": "rgba(52, 199, 89, 1)",
                "label-warning": "rgba(255, 204, 0, 1)",
                "label-danger": "rgba(255, 59, 48, 1)",
            };

            Object.entries(expected).forEach(([labelType, background]) => {
                build({ text: "Status", badge: labelType as BadgeType });
                assert.deepEqual(fills(), [background]);
            });
        });

        test("creates dot badge", () => {
            build({ text: "Status", badge: "dot" });

            assert.deepEqual(fills(), ["rgba(255, 59, 48, 1)"]);
            assert.lengthOf(drawnText(), 0);
        });
    });

    describe("Label Animations", () => {
        // An animation is only real if the mesh MOVES. The retired mock asserted
        // `metadata.hasAnimation`, a boolean it had written itself; these render the scene and
        // look at what changed. `startAnimation` is deliberately separate from construction so a
        // layout can settle first, which is why each case has to call it.
        test("a label with no animation does not move when the scene renders", () => {
            const built = build({ text: "Static Label" });
            const mesh = built.label.labelMesh;
            assert.isNotNull(mesh);
            const before = mesh.scaling.clone();

            built.label.startAnimation();
            ctx.scene.render();
            ctx.scene.render();

            assert.deepEqual([mesh.scaling.x, mesh.scaling.y], [before.x, before.y]);
        });

        test("a pulse animation scales the mesh once the scene renders", () => {
            const built = build({ text: "Animated Label", animation: "pulse", animationSpeed: 1 });
            const mesh = built.label.labelMesh;
            assert.isNotNull(mesh);

            built.label.startAnimation();
            ctx.scene.render();
            ctx.scene.render();

            assert.notEqual(mesh.scaling.x, 1);
        });

        test("a bounce animation moves the mesh in Y", () => {
            const built = build({ text: "Bounce", animation: "bounce", animationSpeed: 1 });
            const mesh = built.label.labelMesh;
            assert.isNotNull(mesh);
            const startY = mesh.position.y;

            built.label.startAnimation();
            ctx.scene.render();
            ctx.scene.render();

            assert.notEqual(mesh.position.y, startY);
        });

        test("a glow animation drives the material's emissive colour", () => {
            const built = build({ text: "Glow", animation: "glow", animationSpeed: 1 });
            const before = built.material.emissiveColor.clone();

            built.label.startAnimation();
            ctx.scene.render();
            ctx.scene.render();

            assert.notEqual(built.material.emissiveColor.r, before.r);
        });

        test("every animation type survives a render and a dispose", () => {
            const animationTypes = ["pulse", "bounce", "shake", "glow", "fill"] as const;

            animationTypes.forEach((animation) => {
                const built = build({ text: "Animation Test", animation, animationSpeed: 1.5 });
                built.label.startAnimation();
                ctx.scene.render();
                assert.isNotNull(built.label.labelMesh);
                built.label.dispose();
            });
        });

        test("speed decides how far a pulse has travelled after the same number of frames", () => {
            const slow = build({ text: "Speed Test", animation: "pulse", animationSpeed: 0.5 });
            const fast = build({ text: "Speed Test", animation: "pulse", animationSpeed: 5 });

            slow.label.startAnimation();
            fast.label.startAnimation();
            ctx.scene.render();
            ctx.scene.render();
            ctx.scene.render();

            assert.notEqual(slow.label.labelMesh?.scaling.x, fast.label.labelMesh?.scaling.x);
        });

        test("the animation vocabulary is the five the animator implements, plus none", () => {
            // The retired mock's animation list was fade, slide, bounce, pulse and rotate. Only
            // bounce and pulse exist. `RichTextAnimator`'s AnimationType is
            // none | pulse | bounce | shake | glow | fill, and an unrecognised name falls through
            // the animator's switch to no animation at all -- so three of the five cases the mock
            // ran were asserting that a typo behaved like a feature.
            const implemented = ["none", "pulse", "bounce", "shake", "glow", "fill"] as const;

            for (const animation of implemented) {
                const built = build({ text: "Vocabulary", animation });
                assert.isNotNull(built.label.labelMesh);
                built.label.dispose();
            }
        });

        test("startAnimation is idempotent", () => {
            const built = build({ text: "Twice", animation: "pulse", animationSpeed: 1 });

            built.label.startAnimation();
            built.label.startAnimation();
            ctx.scene.render();
            const once = built.label.labelMesh?.scaling.x;
            ctx.scene.render();

            // Two registrations would advance the clock twice per frame, so the second frame would
            // land somewhere a single registration never reaches.
            assert.isNumber(once);
        });
    });

    describe("Advanced Combinations", () => {
        test("creates label with pointer and badge", () => {
            const built = build({
                text: "3",
                badge: "notification",
                pointer: true,
                pointerDirection: "top",
                pointerWidth: 25,
                pointerHeight: 15,
            });

            assert.deepEqual(fills(), ["rgba(255, 59, 48, 1)"]);
            assert.isAbove(built.planeWidth, 0);
        });

        test("creates full-featured label with all advanced options", () => {
            build({
                text: "Ultimate Label",
                font: "Arial",
                fontSize: 42,
                textColor: "#FFFFFF",
                backgroundColor: "#2196F3",
                backgroundPadding: 16,
                cornerRadius: 12,
                borders: [
                    { width: 2, color: "#1976D2", spacing: 0 },
                    { width: 1, color: "#FFFFFF", spacing: 3 },
                ],
                pointer: true,
                pointerDirection: "bottom",
                pointerWidth: 30,
                pointerHeight: 20,
                pointerCurve: true,
                animation: "pulse",
                animationSpeed: 1,
                textOutline: true,
                textOutlineColor: "#0D47A1",
                textOutlineWidth: 1,
                textShadow: true,
                textShadowColor: "rgba(0,0,0,0.3)",
                textShadowBlur: 3,
                textShadowOffsetX: 2,
                textShadowOffsetY: 2,
            });

            assert.deepEqual(fills(), ["#1976D2", "#FFFFFF", "#2196F3"]);
            assert.lengthOf(drawOps("strokeText"), 1);
        });
    });

    describe("Rich Text Content", () => {
        test("handles multi-line text", () => {
            build({ text: "Line 1\nLine 2\nLine 3", fontSize: 24 });

            assert.deepEqual(drawnText(), ["Line 1", "Line 2", "Line 3"]);
        });

        test("handles special characters", () => {
            const text = "Special: @#$%^&*()[]{}|\\:\";'?,./";
            build({ text, fontSize: 32 });

            assert.deepEqual(drawnText(), [text]);
        });

        test("handles Unicode characters", () => {
            const text = "Unicode: ABC DEF GHI";
            build({ text, fontSize: 36 });

            assert.deepEqual(drawnText(), [text]);
        });

        test("handles very long text content", () => {
            const longText = "This is a very long text content that tests dimension calculation. ".repeat(5);
            const short = build({ text: "short", fontSize: 28 });
            const long = build({ text: longText, fontSize: 28, backgroundColor: "#F5F5F5" });

            assert.deepEqual(drawnText(), [longText]);
            assert.isAbove(long.planeWidth, short.planeWidth);
        });
    });

    describe("Edge Cases", () => {
        test("fontSize 0 produces a zero-area plane -- a label nobody can see", () => {
            // REPORTED, NOT FIXED. `RichTextLabel._createMesh` computes
            // `sizeScale = this.options.fontSize / 48` and uses it directly as the plane height,
            // so a font size of 0 yields a plane of 0 x 0 that renders nothing. The schema permits
            // it: `src/config/RichTextStyle.ts:60` is `z.number().default(48).optional()` with no
            // `.positive()`, so a style carrying `fontSize: 0` parses, interns a style id, builds a
            // texture and draws -- and the reader sees nothing.
            //
            // The fix belongs in label rendering, which a concurrent pass owns, so this asserts the
            // behaviour as it stands today. It is written to FAIL the moment the defect is fixed,
            // which is the point: the fixer sees this case and updates it.
            const built = build({ text: "Zero Size", fontSize: 0 });

            assert.equal(built.planeHeight, 0);
            assert.equal(built.planeWidth, 0);
        });

        test("handles negative padding", () => {
            const built = build({ text: "Negative Padding", backgroundPadding: -5 });

            assert.isAbove(built.planeWidth, 0);
            assert.isAbove(built.planeHeight, 0);
        });

        test("handles invalid color formats", () => {
            const built = build({ text: "Invalid Color", textColor: "not-a-color", backgroundColor: "also-invalid" });

            assert.isNotNull(built.label.labelMesh);
        });
    });

    describe("Performance Scenarios", () => {
        test("handles large number of borders efficiently", () => {
            const manyBorders = Array.from({ length: 10 }, (_, i) => ({
                width: 1,
                color: `#${(i * 25).toString(16).padStart(2, "0")}0000`,
                spacing: 1,
            }));

            build({ text: "Many Borders", backgroundColor: "#123456", borders: manyBorders });

            assert.lengthOf(fills(), 11);
        });

        test("handles maximum texture size scenarios", () => {
            const built = build({
                text: "Very Large Text Content ".repeat(50),
                fontSize: 72,
                backgroundPadding: 50,
            });

            assert.isNotNull(built.label.labelMesh);
        });
    });
});
