/**
 * A file's picture annotation is in the frame `waitForStableFrame` hands back, however late the
 * picture arrives (issue #3383).
 *
 * The annotation is painted onto its texture from the image's `load` event. Nothing used to say
 * that a picture was still on its way, so the element called the frame before it final: a
 * screenshot or an export taken then had no picture, and with on-demand rendering nothing drew
 * the picture until the reader moved the camera.
 *
 * The order is forced, not hoped for: every image the page starts loading is held, and released
 * only once the element calls its picture final, or says it is waiting for the picture. So the
 * picture always arrives after everything else has finished.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

import type { Graphty } from "../../index.js";

const TYPE = "org.cytoscape.view.presentation.annotations.";

const RealImage = window.Image;
const srcProperty = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");

let mounted: Graphty | null = null;

afterEach(() => {
    window.Image = RealImage;
    mounted?.remove();
    mounted = null;
});

/**
 * Make every `new Image()` hold its load until `release` is called.
 * @param held - Where each held load's start is put.
 */
function holdImageLoads(held: (() => void)[]): void {
    function HeldImage(): HTMLImageElement {
        const image = new RealImage();
        Object.defineProperty(image, "src", {
            configurable: true,
            get: () => srcProperty?.get?.call(image) as string,
            set: (url: string) => {
                held.push(() => srcProperty?.set?.call(image, url));
            },
        });
        return image;
    }

    window.Image = HeldImage as unknown as typeof Image;
}

/**
 * A solid blue picture, as a URL the page can load.
 * @returns The URL.
 */
async function bluePicture(): Promise<string> {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    assert.isNotNull(ctx);
    if (ctx === null) {
        return "";
    }

    ctx.fillStyle = "#0000ff";
    ctx.fillRect(0, 0, 32, 32);
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
    });
    assert.isNotNull(blob);
    return blob === null ? "" : URL.createObjectURL(blob);
}

/**
 * Two nodes with a picture behind them, in Cytoscape's coordinates.
 * @param url - The picture.
 * @returns The file.
 */
function xgmml(url: string): string {
    const picture = `type=${TYPE}ImageAnnotation|uuid=pic|canvas=background|zoom=1|x=50|y=50|width=300|height=100|URL=${url}|opacity=1.0|edgeThickness=0`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<graph id="1" label="pictured" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">
  <att name="__Annotations" type="list"><att type="string" value="${picture}"/></att>
  <node id="a" label="a"><graphics x="100" y="100" w="20" h="20" fill="#888888" type="ELLIPSE"/></node>
  <node id="b" label="b"><graphics x="300" y="100" w="20" h="20" fill="#888888" type="ELLIPSE"/></node>
</graph>`;
}

/**
 * How many pixels of the last frame drawn are the picture's blue.
 * @param element - The element.
 * @returns The count.
 */
async function bluePixels(element: Graphty): Promise<number> {
    const { engine } = element.graph;
    // the drawing buffer is preserved, so this is the frame last drawn, not a new one
    const pixels = (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as Uint8Array;
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at] < 60 && pixels[at + 1] < 60 && pixels[at + 2] > 200) {
            count++;
        }
    }

    return count;
}

test("a picture that arrives after everything else is in the stable frame, drawn on demand", async () => {
    const held: (() => void)[] = [];
    holdImageLoads(held);
    const url = await bluePicture();

    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:800px;height:600px";
    element.viewMode = "2d";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await element.setRenderSettings({ onDemand: true });

    // Let the picture load only once the rest of the picture is final.
    const { graph } = element;
    // the element's own account of what it still waits for, which the public wait reports only on a timeout
    const { updateManager } = graph as unknown as { updateManager: { whyFrameIsNotStable(): string } };
    graph.scene.onAfterRenderObservable.add(() => {
        const waitingForPicture = updateManager.whyFrameIsNotStable().includes("picture");
        if (held.length > 0 && (graph.isFrameStable || waitingForPicture)) {
            for (const start of held.splice(0)) {
                start();
            }
        }
    });

    await element.session.data.import(
        { type: "xgmml", config: { data: xgmml(url) } },
        { styles: "file", layout: "recommended" },
    );
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    assert.isAbove(await bluePixels(element), 1000, "the picture is in the frame called stable");
});
