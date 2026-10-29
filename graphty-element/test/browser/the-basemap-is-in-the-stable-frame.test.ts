/**
 * The map under a location map layout is in the frame `waitForStableFrame()` hands back, however
 * late its pictures arrive (issue #3546).
 *
 * The map is drawn by babylonjs-map, imported on first use, from tiles loaded as images and drawn
 * once their shaders compile. None of that used to be counted by "the picture is final", so the
 * element called a frame final while `basemapStatus.state` was still `loading`: a screenshot taken
 * then had no map.
 *
 * The order is forced, not hoped for: every image the page starts loading is held, and released
 * only once the element calls its picture final or says it is waiting for the map. So the map's
 * pictures always arrive after everything else has finished.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

import { Graph } from "../../src/Graph";

const srcProperty = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");

afterEach(() => {
    if (srcProperty !== undefined) {
        Object.defineProperty(HTMLImageElement.prototype, "src", srcProperty);
    }
});

/**
 * Hold every image load the page starts until `release` runs the held starts.
 * @param held - Where each held load's start is put.
 */
function holdImageLoads(held: (() => void)[]): void {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
        configurable: true,
        get(this: HTMLImageElement) {
            return srcProperty?.get?.call(this) as string;
        },
        set(this: HTMLImageElement, url: string) {
            held.push(() => srcProperty?.set?.call(this, url));
        },
    });
}

test("the map that arrives after everything else is in the stable frame", async () => {
    const held: (() => void)[] = [];
    const container = document.createElement("div");
    container.style.cssText = "width:600px;height:400px;position:relative";
    document.body.appendChild(container);
    const graph = new Graph(container);
    try {
        await graph.init();
        holdImageLoads(held);
        // the element's own account of what it still waits for, which the public wait reports only on a timeout
        const { updateManager } = graph as unknown as { updateManager: { whyFrameIsNotStable(): string } };
        graph.getScene().onAfterRenderObservable.add(() => {
            const waitingForMap = updateManager.whyFrameIsNotStable().includes("map");
            if (held.length > 0 && (graph.isFrameStable || waitingForMap)) {
                for (const start of held.splice(0)) {
                    start();
                }
            }
        });

        await graph.addNodes([
            { id: "lisbon", latitude: 38.72, longitude: -9.14 },
            { id: "tokyo", latitude: 35.68, longitude: 139.69 },
            { id: "lima", latitude: -12.05, longitude: -77.04 },
        ]);
        await graph.setLayout("location-map", { latitude: "latitude", longitude: "longitude" });
        await graph.waitForStableFrame();

        assert.notEqual(graph.basemapStatus.state, "loading", "the map is drawn in the frame called stable");
        assert.equal(graph.basemapStatus.state, "ready");
    } finally {
        graph.dispose();
        container.remove();
    }
});
