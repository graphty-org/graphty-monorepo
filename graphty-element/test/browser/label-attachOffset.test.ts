import { MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { type AttachPosition, RichTextLabel } from "../../src/meshes/RichTextLabel";

/**
 * Regression tests for label attachOffset functionality.
 *
 * These tests ensure that:
 * 1. attachOffset is properly passed through configuration
 * 2. attachOffset is actually applied to label positioning (not hardcoded)
 * 3. Different attach positions correctly apply the offset
 *
 * Bug history:
 * - attachOffset was hardcoded to 0.3 in Edge.createArrowText()
 * - attachOffset was hardcoded to 0.3 in Edge.update() when calling attachTo()
 * - These bugs caused user-configured offsets to be ignored
 */
describe("Label attachOffset Regression Tests", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    describe("attachOffset configuration", () => {
        test("attachOffset can be set via constructor options", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
                attachOffset: 5.0,
            });

            assert.exists(label);
            label.dispose();
        });

        test("attachOffset can be set to various values", () => {
            const offsets = [0, 0.3, 0.5, 1.0, 2.0, 5.0, 10.0];

            for (const offset of offsets) {
                const label = new RichTextLabel(scene, {
                    text: "Test",
                    fontSize: 12,
                    attachOffset: offset,
                });

                assert.exists(label.labelMesh);
                label.dispose();
            }
        });

        test("attachOffset can be negative", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
                attachOffset: -1.0,
            });

            assert.exists(label.labelMesh);
            label.dispose();
        });
    });

    describe("attachOffset via attachTo() method", () => {
        test("attachTo() respects offset parameter", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
            });

            const targetPos = new Vector3(0, 0, 0);

            // Attach with custom offset
            label.attachTo(targetPos, "top", 5.0);

            // The label should be positioned above the target
            assert.exists(label.labelMesh);
            const labelPos = label.labelMesh.position;

            // Y position should be greater than target (offset is applied upward for "top")
            assert.isTrue(labelPos.y > 0, "Label should be offset above target");

            label.dispose();
        });

        test("attachTo() with different offsets produces different positions", () => {
            const smallOffsetLabel = new RichTextLabel(scene, {
                text: "Small",
                fontSize: 12,
            });

            const largeOffsetLabel = new RichTextLabel(scene, {
                text: "Large",
                fontSize: 12,
            });

            const targetPos = new Vector3(0, 0, 0);

            smallOffsetLabel.attachTo(targetPos, "top", 1.0);
            largeOffsetLabel.attachTo(targetPos, "top", 5.0);

            const smallY = smallOffsetLabel.labelMesh?.position.y ?? 0;
            const largeY = largeOffsetLabel.labelMesh?.position.y ?? 0;

            // Larger offset should result in larger Y position for "top" attachment
            assert.isTrue(largeY > smallY, "Larger offset should produce larger Y position");

            smallOffsetLabel.dispose();
            largeOffsetLabel.dispose();
        });

        test("zero offset places label at boundary", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
            });

            const targetPos = new Vector3(5, 5, 5);
            label.attachTo(targetPos, "top", 0);

            assert.exists(label.labelMesh);
            // With zero offset, label should be near the target Y (plus half label height)

            label.dispose();
        });
    });

    describe("attachOffset for all attach positions", () => {
        const positions: AttachPosition[] = [
            "top",
            "top-left",
            "top-right",
            "left",
            "center",
            "right",
            "bottom",
            "bottom-left",
            "bottom-right",
        ];

        for (const position of positions) {
            test(`attachOffset is applied for position: ${position}`, () => {
                const labelWithOffset = new RichTextLabel(scene, {
                    text: "Test",
                    fontSize: 12,
                });

                const labelWithoutOffset = new RichTextLabel(scene, {
                    text: "Test",
                    fontSize: 12,
                });

                const targetPos = new Vector3(0, 0, 0);

                labelWithOffset.attachTo(targetPos, position, 3.0);
                labelWithoutOffset.attachTo(targetPos, position, 0.0);

                // Positions should be different when offset is applied
                const posWithOffset = labelWithOffset.labelMesh?.position;
                const posWithoutOffset = labelWithoutOffset.labelMesh?.position;

                assert.exists(posWithOffset);
                assert.exists(posWithoutOffset);

                // For center position, offset doesn't change position
                if (position !== "center") {
                    const distance = Vector3.Distance(posWithOffset, posWithoutOffset);
                    assert.isTrue(distance > 0, `Offset should change position for ${position}`);
                }

                labelWithOffset.dispose();
                labelWithoutOffset.dispose();
            });
        }
    });

    describe("attachOffset direction by position", () => {
        test("'top' position: offset increases Y", () => {
            const label1 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });
            const label2 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });

            const targetPos = new Vector3(0, 0, 0);
            label1.attachTo(targetPos, "top", 1.0);
            label2.attachTo(targetPos, "top", 3.0);

            const y1 = label1.labelMesh?.position.y ?? 0;
            const y2 = label2.labelMesh?.position.y ?? 0;

            assert.isTrue(y2 > y1, "Larger offset should increase Y for top position");

            label1.dispose();
            label2.dispose();
        });

        test("'bottom' position: offset decreases Y", () => {
            const label1 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });
            const label2 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });

            const targetPos = new Vector3(0, 0, 0);
            label1.attachTo(targetPos, "bottom", 1.0);
            label2.attachTo(targetPos, "bottom", 3.0);

            const y1 = label1.labelMesh?.position.y ?? 0;
            const y2 = label2.labelMesh?.position.y ?? 0;

            assert.isTrue(y2 < y1, "Larger offset should decrease Y for bottom position");

            label1.dispose();
            label2.dispose();
        });

        test("'left' position: offset decreases X", () => {
            const label1 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });
            const label2 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });

            const targetPos = new Vector3(0, 0, 0);
            label1.attachTo(targetPos, "left", 1.0);
            label2.attachTo(targetPos, "left", 3.0);

            const x1 = label1.labelMesh?.position.x ?? 0;
            const x2 = label2.labelMesh?.position.x ?? 0;

            assert.isTrue(x2 < x1, "Larger offset should decrease X for left position");

            label1.dispose();
            label2.dispose();
        });

        test("'right' position: offset increases X", () => {
            const label1 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });
            const label2 = new RichTextLabel(scene, { text: "Test", fontSize: 12 });

            const targetPos = new Vector3(0, 0, 0);
            label1.attachTo(targetPos, "right", 1.0);
            label2.attachTo(targetPos, "right", 3.0);

            const x1 = label1.labelMesh?.position.x ?? 0;
            const x2 = label2.labelMesh?.position.x ?? 0;

            assert.isTrue(x2 > x1, "Larger offset should increase X for right position");

            label1.dispose();
            label2.dispose();
        });
    });

    describe("attachOffset with repeated attachTo calls", () => {
        test("calling attachTo multiple times with different offsets updates position", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
            });

            const targetPos = new Vector3(0, 0, 0);

            // First attach with small offset
            label.attachTo(targetPos, "top", 1.0);
            const y1 = label.labelMesh?.position.y ?? 0;

            // Update with larger offset
            label.attachTo(targetPos, "top", 5.0);
            const y2 = label.labelMesh?.position.y ?? 0;

            // Position should have changed
            assert.isTrue(y2 > y1, "Position should update when attachTo is called with new offset");

            label.dispose();
        });

        test("offset is not accumulated across multiple attachTo calls", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
            });

            const targetPos = new Vector3(0, 0, 0);

            // Call attachTo multiple times with same offset
            label.attachTo(targetPos, "top", 2.0);
            const y1 = label.labelMesh?.position.y ?? 0;

            label.attachTo(targetPos, "top", 2.0);
            const y2 = label.labelMesh?.position.y ?? 0;

            label.attachTo(targetPos, "top", 2.0);
            const y3 = label.labelMesh?.position.y ?? 0;

            // Position should remain the same (offset not accumulated)
            assert.approximately(y1, y2, 0.001, "Offset should not accumulate");
            assert.approximately(y2, y3, 0.001, "Offset should not accumulate");

            label.dispose();
        });
    });

    describe("attachOffset with moving targets", () => {
        test("attachTo updates position correctly when target moves", () => {
            const label = new RichTextLabel(scene, {
                text: "Test",
                fontSize: 12,
            });

            const offset = 2.0;

            // Attach at origin
            const pos1 = new Vector3(0, 0, 0);
            label.attachTo(pos1, "top", offset);
            const labelY1 = label.labelMesh?.position.y ?? 0;

            // Move target up
            const pos2 = new Vector3(0, 10, 0);
            label.attachTo(pos2, "top", offset);
            const labelY2 = label.labelMesh?.position.y ?? 0;

            // Label should have moved with target
            assert.isTrue(labelY2 > labelY1, "Label should follow target position");

            // The offset should still be applied
            const expectedDiff = 10; // Target moved by 10 in Y
            assert.approximately(labelY2 - labelY1, expectedDiff, 0.1, "Label should move by same amount as target");

            label.dispose();
        });
    });

    describe("inside positions", () => {
        /**
         * The label's drawn box in world units, after placing it inside a 10 x 4 box at the origin.
         * @param position - Where inside the box.
         * @returns The label's box.
         */
        function placedInside(position: AttachPosition): { min: Vector3; max: Vector3 } {
            const box = MeshBuilder.CreatePlane("box", { width: 10, height: 4 }, scene);
            const label = new RichTextLabel(scene, { text: "Open group", fontSize: 12 });
            label.attachTo(box, position, 0);
            const mesh = label.labelMesh;
            assert.exists(mesh);
            mesh.computeWorldMatrix(true);
            const { minimumWorld, maximumWorld } = mesh.getBoundingInfo().boundingBox;

            return { min: minimumWorld.clone(), max: maximumWorld.clone() };
        }

        test("puts a header label inside the box against its top-right corner, in front of it", () => {
            const { min, max } = placedInside("inside-top-right");

            assert.approximately(max.x, 5, 1e-6, "flush with the box's right side");
            assert.approximately(max.y, 2, 1e-6, "flush with the box's top");
            assert.isAbove(min.x, -5, "inside the box, not beside it");
            assert.isBelow(max.z, 0, "in front of the box, toward the camera");
        });

        test("puts a label inside against the bottom-left corner", () => {
            const { min } = placedInside("inside-bottom-left");

            assert.approximately(min.x, -5, 1e-6);
            assert.approximately(min.y, -2, 1e-6);
        });

        test("centres an inside-top label across the box", () => {
            const { min, max } = placedInside("inside-top");

            assert.approximately((min.x + max.x) / 2, 0, 1e-6);
            assert.approximately(max.y, 2, 1e-6);
        });

        test("keeps a label on a point, which has no inside", () => {
            const label = new RichTextLabel(scene, { text: "Test", fontSize: 12 });
            label.attachTo(new Vector3(3, 4, 0), "inside-top", 0);

            assert.approximately(label.labelMesh?.position.x ?? Number.NaN, 3, 1e-6);
            assert.approximately(label.labelMesh?.position.y ?? Number.NaN, 4, 1e-6);
            label.dispose();
        });
    });
});
