/**
 * A label's words and its box drawn translucent, and a label moved by an offset and by a shift
 * of its own size, as a program that places labels freely (Cytoscape's label anchors) draws them.
 */

import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

describe("RichTextLabel opacity and offsets", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    test("the words' and the box's opacities are drawn as their colors' alpha", () => {
        const label = RichTextLabel.createLabel(scene, {
            text: "hi",
            textColor: "#112233",
            textOpacity: 0.25,
            backgroundColor: "#ffff66",
            backgroundOpacity: 0.5,
        });
        const { options } = label as unknown as { options: { textColor: string; backgroundColor: string } };

        assert.strictEqual(options.textColor.toLowerCase(), "#11223340");
        assert.strictEqual(options.backgroundColor.toLowerCase(), "#ffff6680");
    });

    test("an offset moves the label right and down, a shift by fractions of its own size", () => {
        const at = (extra: object): Vector3 => {
            const label = RichTextLabel.createLabel(scene, {
                text: "hi",
                attachTo: new Vector3(0, 0, 0),
                attachPosition: "center",
                attachOffset: 0,
                ...extra,
            });
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            return mesh.position.clone();
        };
        const plain = at({});
        const offset = at({ offsetX: 2, offsetY: 3 });
        assert.closeTo(offset.x - plain.x, 2, 1e-9);
        assert.closeTo(offset.y - plain.y, -3, 1e-9);

        const label = RichTextLabel.createLabel(scene, { text: "hi" }).labelMesh;
        assert.isNotNull(label);
        const box = label.getBoundingInfo().boundingBox;
        const [width, height] = [box.maximum.x - box.minimum.x, box.maximum.y - box.minimum.y];
        const shifted = at({ shiftX: -0.5, shiftY: 0.5 });
        assert.closeTo(shifted.x - plain.x, -width / 2, width * 0.05);
        assert.closeTo(shifted.y - plain.y, -height / 2, height * 0.05);
    });
});
