/**
 * A label's words and its box drawn translucent, and a label moved by an offset and by a shift
 * of its own size, as a program that places labels freely (Cytoscape's label anchors) draws them.
 */

import { MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { readLabel } from "../fidelity/drawn-scene";
import { drawOps, resetRecordedCanvases } from "./recording-canvas";

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

    test("the outline's and the border's opacities are drawn as their colors' alpha", () => {
        const label = RichTextLabel.createLabel(scene, {
            text: "hi",
            textOutline: true,
            textOutlineColor: "#ff8000",
            textOutlineOpacity: 0.4,
            borderWidth: 2,
            borderColor: "#336699",
            borderOpacity: 0.5,
        });
        const { options } = label as unknown as {
            options: { textOutlineColor: string; borders: { color: string }[] };
        };

        assert.strictEqual(options.textOutlineColor.toLowerCase(), "#ff800066");
        assert.strictEqual(options.borders[0].color.toLowerCase(), "#33669980");
    });

    test("a box padding is the whole room between the words and the border", () => {
        const sized = (extra: object): { width: number; height: number; textW: number; textH: number } => {
            const label = RichTextLabel.createLabel(scene, { text: "hi", borderWidth: 2, ...extra });
            const inner = label as unknown as {
                actualDimensions: { width: number; height: number };
                textSize: { width: number; height: number };
            };
            return { ...inner.actualDimensions, textW: inner.textSize.width, textH: inner.textSize.height };
        };
        const tight = sized({ boxPadding: 0, backgroundPadding: 6, marginTop: 9 });
        assert.closeTo(tight.width, tight.textW + 4, 1e-6);
        assert.closeTo(tight.height, tight.textH + 4, 1e-6);
        const padded = sized({ boxPadding: 3 });
        assert.closeTo(padded.height, padded.textH + 4 + 6, 1e-6);
        // unset, the margins (5 a side by default) decide
        const plain = sized({});
        assert.closeTo(plain.height, plain.textH + 4 + 10, 1e-6);
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

    test("a shift of its words pins the words' own edge, not the margins round them (Pajek's text-anchor start)", () => {
        const placed = (extra: object): { left: number; right: number; top: number; bottom: number } => {
            const label = RichTextLabel.createLabel(scene, {
                text: "hi",
                attachTo: new Vector3(0, 0, 0),
                attachPosition: "center",
                attachOffset: 0,
                ...extra,
            });
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            const box = mesh.getBoundingInfo().boundingBox;
            const [w, h] = [box.maximum.x - box.minimum.x, box.maximum.y - box.minimum.y];
            const words = label.textBounds;
            const [x0, y1] = [mesh.position.x - w / 2, mesh.position.y + h / 2];
            // y is up in the scene, the words' fractions run down the plane
            return {
                left: x0 + words.left * w,
                right: x0 + words.right * w,
                top: y1 - words.top * h,
                bottom: y1 - words.bottom * h,
            };
        };
        const right = placed({ shiftX: 0.5, shiftY: 0.5, shiftOf: "words" });
        assert.closeTo(right.left, 0, 1e-6);
        assert.closeTo(right.top, 0, 1e-6);
        const left = placed({ shiftX: -0.5, shiftY: -0.5, shiftOf: "words" });
        assert.closeTo(left.right, 0, 1e-6);
        assert.closeTo(left.bottom, 0, 1e-6);
        // unset, the box (margins and all) is what moves: the words start a margin further on
        const boxed = placed({ shiftX: 0.5 });
        assert.isAbove(boxed.left, 1e-3);
    });

    test("a label placed by its words puts their font box, not the margins round them, against its target", () => {
        const placed = (
            position: string,
            extra: object,
        ): { left: number; right: number; top: number; bottom: number } => {
            const label = RichTextLabel.createLabel(scene, {
                text: "hi",
                attachTo: new Vector3(0, 0, 0),
                attachPosition: position as "top",
                attachOffset: 0,
                ...extra,
            });
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            const box = mesh.getBoundingInfo().boundingBox;
            const [w, h] = [box.maximum.x - box.minimum.x, box.maximum.y - box.minimum.y];
            const words = label.wordsBounds;
            const [x0, y1] = [mesh.position.x - w / 2, mesh.position.y + h / 2];
            return {
                left: x0 + words.left * w,
                right: x0 + words.right * w,
                top: y1 - words.top * h,
                bottom: y1 - words.bottom * h,
            };
        };
        assert.closeTo(placed("top", { gapOf: "words" }).bottom, 0, 1e-6);
        assert.closeTo(placed("bottom", { gapOf: "words" }).top, 0, 1e-6);
        assert.closeTo(placed("left", { gapOf: "words" }).right, 0, 1e-6);
        assert.closeTo(placed("right", { gapOf: "words" }).left, 0, 1e-6);
        // unset, the box (margins and all) is what is placed: the words stand a margin and their leading off
        assert.isAbove(placed("top", {}).bottom, 1e-3);
    });

    describe("a label's box against its target", () => {
        /**
         * A label on a target two units wide and one tall, and where its plane stands.
         * @param extra - The label's options.
         * @param scaling - The target's stretch across (a group's over its members).
         * @returns Its plane's edges from the target's middle, its size, and its words' left edge on the plane.
         */
        const placed = (
            extra: object,
            scaling = 1,
        ): { left: number; right: number; top: number; width: number; label: RichTextLabel } => {
            const target = MeshBuilder.CreatePlane("target", { width: 2, height: 1 }, scene);
            target.scaling.x = scaling;
            const label = RichTextLabel.createLabel(scene, {
                text: "words",
                attachTo: target,
                attachOffset: 0,
                ...extra,
            });
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            const box = mesh.getBoundingInfo().boundingBox;
            const [w, h] = [box.maximum.x - box.minimum.x, box.maximum.y - box.minimum.y];
            return {
                left: mesh.position.x - w / 2,
                right: mesh.position.x + w / 2,
                top: mesh.position.y + h / 2,
                width: w,
                label,
            };
        };
        const large = { size: 3 };

        test("unset, a label wider than its target is centered on it", () => {
            const left = placed({ ...large, attachPosition: "inside-left" });
            assert.isAbove(left.width, 2);
            assert.closeTo(left.left, -left.right, 1e-6);
        });

        test("held at a side, a label wider than its target stays against that side", () => {
            const left = placed({ ...large, attachPosition: "inside-left", box: "words-at-side" });
            assert.closeTo(left.left, -1, 1e-6);
            assert.isAbove(left.right, 1);
            const right = placed({ ...large, attachPosition: "inside-right", box: "words-at-side" });
            assert.closeTo(right.right, 1, 1e-6);
            assert.isBelow(right.left, -1);
            const top = placed({ ...large, attachPosition: "inside-top", box: "words-at-side" });
            assert.closeTo(top.top, 0.5, 1e-6);
        });

        test("held at a side, a label that fits stands where an unset one does", () => {
            const fits = { size: 0.1, attachPosition: "inside-left" };
            assert.closeTo(placed({ ...fits, box: "words-at-side" }).left, placed(fits).left, 1e-9);
        });

        test("as wide as its target, a label's box is a band from side to side", () => {
            const band = placed({ size: 0.1, attachPosition: "inside-top", box: "target-width" });
            assert.closeTo(band.left, -1, 1e-6);
            assert.closeTo(band.right, 1, 1e-6);
            assert.closeTo(band.top, 0.5, 1e-6);
        });

        test("a band reaches across a stretched target, and its letters keep their size", () => {
            const plain = placed({ size: 0.1, attachPosition: "inside-top" }).label;
            const band = placed({ size: 0.1, attachPosition: "inside-top", box: "target-width" }, 3);
            assert.closeTo(band.width, 6, 1e-6);
            const { textSize } = plain as unknown as { textSize: { width: number } };
            const words = band.label.textBounds;
            const plane = (band.label as unknown as { actualDimensions: { width: number } }).actualDimensions;
            assert.closeTo((words.right - words.left) * plane.width, textSize.width, 1e-6);
        });

        test("a band's words line up in it by the label's text alignment", () => {
            const at = (textAlign: string): number =>
                placed({ size: 0.1, attachPosition: "inside-top", box: "target-width", textAlign }).label.textBounds
                    .left;
            assert.isBelow(at("left"), at("center"));
            assert.isBelow(at("center"), at("right"));
        });

        test("a band follows its target when it changes width", () => {
            const target = MeshBuilder.CreatePlane("target", { width: 2, height: 1 }, scene);
            const label = RichTextLabel.createLabel(scene, {
                text: "words",
                size: 0.1,
                attachTo: target,
                attachPosition: "inside-top",
                attachOffset: 0,
                box: "target-width",
            });
            target.scaling.x = 2;
            label.reattach();
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            const box = mesh.getBoundingInfo().boundingBox;
            assert.closeTo(box.maximum.x - box.minimum.x, 4, 1e-6);
        });

        test("words wider than the target keep the box round them", () => {
            const band = placed({ ...large, attachPosition: "inside-left", box: "target-width" });
            assert.isAbove(band.width, 2);
            assert.closeTo(band.left, -1, 1e-6);
        });
    });

    test("a turned label's shift turns with it, so it turns about the point the shift pins", () => {
        const at = (extra: object): Vector3 => {
            const mesh = RichTextLabel.createLabel(scene, {
                text: "hi",
                attachTo: new Vector3(0, 0, 0),
                attachPosition: "center",
                attachOffset: 0,
                ...extra,
            }).labelMesh;
            assert.isNotNull(mesh);
            return mesh.position.clone();
        };
        const plain = at({ rotation: 30 });
        const width = 2 * (at({ shiftX: 0.5 }).x - at({}).x);
        // pinned by its left middle and turned 30 degrees clockwise: its middle is half its width along the turned
        // axis, so below the pin on screen (y is up in the scene)
        const turned = at({ shiftX: 0.5, rotation: 30 });
        const turn = Math.PI / 6;
        assert.closeTo(turned.x - plain.x, (width / 2) * Math.cos(turn), width * 0.01);
        assert.closeTo(turned.y - plain.y, -(width / 2) * Math.sin(turn), width * 0.01);
    });

    test("a border round a box with no background is a ring, its middle left undrawn (Gephi's label box)", () => {
        // the rectangles in the path the border's fill was given: two (the box and its hole) for a ring
        const rects = (extra: object): number => {
            resetRecordedCanvases();
            RichTextLabel.createLabel(scene, { text: "hi", borderWidth: 2, borderColor: "#ff0000", ...extra });
            const ops = drawOps();
            const fill = ops.findIndex((o) => o.op === "fill" && String(o.state.fillStyle).startsWith("#ff0000"));
            assert.isAtLeast(fill, 0, "the border is drawn");
            const start = ops
                .slice(0, fill)
                .map((o) => o.op)
                .lastIndexOf("beginPath");
            return ops.slice(start, fill).filter((o) => o.op === "moveTo").length;
        };
        assert.strictEqual(rects({}), 2);
        assert.strictEqual(rects({ backgroundColor: "#ffffff", backgroundOpacity: 0.5 }), 2);
        // an opaque background covers the middle: the border is drawn solid under it, as before
        assert.strictEqual(rects({ backgroundColor: "#ffffff" }), 1);
    });
});

describe("the fidelity harness's reading of a band", () => {
    test("reads a band's words where they are drawn, so words on the wrong side stay wrong", () => {
        const scene = new Scene(new NullEngine());
        const target = MeshBuilder.CreatePlane("target", { width: 20, height: 1 }, scene);
        const read = (textAlign: "left" | "right"): { x0: number; x1: number } => {
            const label = RichTextLabel.createLabel(scene, {
                text: "words",
                size: 0.5,
                attachTo: target,
                attachPosition: "inside-top",
                attachOffset: 0,
                box: "target-width",
                textAlign,
            });
            const box = { x0: 0, y0: 0, x1: 0, y1: 0 };
            const drawn = readLabel(label, { box: () => box, point: ({ x, y }: Vector3) => ({ x, y }) } as never);
            assert.isNotNull(drawn?.textBox);
            return drawn?.textBox as { x0: number; x1: number };
        };
        const [left, right] = [read("left"), read("right")];
        assert.isBelow(left.x0, -9);
        assert.isAbove(right.x1, 9);
        assert.isBelow(left.x1, right.x0);
        scene.dispose();
    });
});
