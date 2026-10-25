/**
 * What the oracle comparison reads off a label graphty-element drew (`test/fidelity/drawn-scene.ts` `readLabel`): the
 * words' own box inside the plane's margins, their opacity from their color's alpha, the lines they are drawn on and
 * how those are aligned, the outline round the letters and the box drawn behind them with its border.
 */
import { Engine, FreeCamera, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { Projector, readLabel } from "../fidelity/drawn-scene";

let engine: Engine | null = null;

afterEach(() => {
    engine?.dispose();
    engine = null;
});

function sceneOf(): Scene {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    const camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene);
    camera.setTarget(Vector3.Zero());
    return scene;
}

describe("a label as graphty drew it, for the oracle comparison", () => {
    it("reads the words' box, opacity, lines, alignment, outline and background", () => {
        const scene = sceneOf();
        const label = new RichTextLabel(scene, {
            text: "a long line\nshort",
            fontSize: 24,
            textColor: "rgba(255, 0, 0, 0.5)",
            textAlign: "left",
            backgroundColor: "#ffff00",
            backgroundPadding: 4,
            borderWidth: 2,
            borderColor: "#00ff00",
            textOutline: true,
            textOutlineColor: "#0000ff",
            textOutlineWidth: 2,
            billboardMode: 0,
        });
        scene.render();
        const d = readLabel(label, new Projector(scene));
        assert.isNotNull(d);
        if (d === null) {
            return;
        }
        assert.closeTo(d.opacity, 0.5, 0.01);
        assert.strictEqual(d.lineCount, 2);
        assert.strictEqual(d.align, "start");
        assert.strictEqual(d.outline?.color, "#0000ff");
        assert.isAbove(d.outline?.width ?? 0, 0);
        assert.strictEqual(d.background?.color, "#ffff00");
        assert.strictEqual(d.background?.border?.color, "#00ff00");
        // the words sit inside the plane, inset by its margins, padding and border
        const { textBox, box } = d;
        assert.isNotNull(textBox);
        if (textBox === null) {
            return;
        }
        assert.isAbove(textBox.x0, box.x0);
        assert.isAbove(textBox.y0, box.y0);
        assert.isBelow(textBox.x1, box.x1);
        assert.isBelow(textBox.y1, box.y1);
        assert.closeTo((textBox.x0 + textBox.x1) / 2, (box.x0 + box.x1) / 2, 1);
    });

    it("reads no outline and no background on a plain label", () => {
        const scene = sceneOf();
        const label = new RichTextLabel(scene, { text: "plain", fontSize: 24, billboardMode: 0 });
        scene.render();
        const d = readLabel(label, new Projector(scene));
        assert.deepEqual([d?.outline, d?.background, d?.opacity, d?.lineCount, d?.align], [null, null, 1, 1, "middle"]);
    });
});
