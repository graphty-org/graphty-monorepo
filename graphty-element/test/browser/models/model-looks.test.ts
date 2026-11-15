/**
 * How a model node looks and loads: a glTF shaped as the ChronographWatch glTF-WEBP sample (WebP
 * pictures, transmission and texture transform required, three 2048 x 2048 pictures) loads from
 * files and from an address and draws opaque; `node.color` reaches each part as `node.modelTint`
 * says; a skinned model is posed by its skeleton; a selected model is marked by a band that hugs
 * its silhouette, with no copy of the model and nothing over it; and `assets.add` reports the bytes
 * of a download and stops it on a signal.
 */

import { assert, describe, it, vi } from "vitest";

import manifest from "../../../../babylonjs-models/test/fixtures/variants/manifest.json";
import { DEFAULT_MODEL_LIMITS } from "../../../src/session/assets/AssetsApi";
import type { ProgressChange } from "../../../src/session/shared";
import { cleanups, countIn, drawModel, filesOf, type Frame, mount, readFrame, stubFetch } from "./helpers";

/** Pixel tests by color. */
const RED = (r: number, g: number, b: number): boolean => r > 120 && g < 60 && b < 60;
const GREEN = (r: number, g: number, b: number): boolean => g > 100 && r < 70 && b < 70;
const BLUE = (r: number, g: number, b: number): boolean => b > 100 && r < 70 && g < 70;
/** The default Selected layer's halo. */
const GOLD = (r: number, g: number, b: number): boolean => r > 200 && g > 170 && b < 90;
const MAGENTA = (r: number, g: number, b: number): boolean => r > 170 && b > 170 && g < 110;

/**
 * Count the pixels of a frame that pass a test.
 * @param frame - The frame.
 * @param match - Which pixels count.
 * @returns How many.
 */
function count(frame: Frame, match: (r: number, g: number, b: number) => boolean): number {
    const { left, right } = countIn(frame, match);
    return left + right;
}

/**
 * Set a model layer's values, and read the frame once it is drawn.
 * @param element - The element.
 * @param layer - The layer.
 * @param set - Its values, the model included.
 * @returns The frame.
 */
async function restyle(
    element: Awaited<ReturnType<typeof mount>>,
    layer: string,
    set: Record<string, unknown>,
): Promise<Frame> {
    await element.session.styles.update(layer, { set });
    return readFrame(element);
}

describe("the ChronographWatch glTF-WEBP shape", () => {
    it("loads from its files, says transmission was drawn without, and draws its WebP picture", async () => {
        const element = await mount();
        const { problems } = await drawModel(element, "gltf-transmission-required", [{ id: "a", x: 0 }]);
        assert.deepInclude(problems, {
            code: "W_MODEL_EXTENSION_IGNORED",
            params: { extension: "KHR_materials_transmission" },
        });
        assert.isAbove(count(await readFrame(element), GREEN), 300, "the green WebP picture is drawn");
    });

    it("loads from an address, fetching its .bin and three WebP pictures beside it", async () => {
        const variant = (manifest as { id: string; files: string[] }[]).find(
            (v) => v.id === "gltf-transmission-required",
        );
        assert.isDefined(variant);
        const base = "https://models.example.com/watch/";
        const files = await filesOf(variant.id);
        const requested = stubFetch(new Map([...files].map(([name, bytes]) => [base + name, bytes])));
        const element = await mount();
        const record = await element.session.assets.add(`${base}cube.gltf`);
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.deepInclude(record.problems, {
            code: "W_MODEL_EXTENSION_IGNORED",
            params: { extension: "KHR_materials_transmission" },
        });
        for (const name of variant.files) {
            assert.include(requested, base + name);
        }
    });
});

describe("model colors", () => {
    it("draws a model whose file gives it no material in the node's color, with no tint asked (tree.obj)", async () => {
        const element = await mount();
        const { problems } = await drawModel(element, "obj-alone", [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.notInclude(
            problems.map((fact) => fact.code),
            "W_MODEL_COLOR_IGNORED",
        );
        assert.isAbove(count(await readFrame(element), RED), 500, "the plain model is drawn red");
    });

    it("keeps a picture under its own colors and 'untextured', darkens it on top, and paints over it under 'replace'", async () => {
        const element = await mount();
        const { layer, asset } = await drawModel(element, "gltf-textured", [{ id: "a", x: 0 }], {
            "node.color": "#ff0000",
        });
        const set = (tint: unknown): Record<string, unknown> => ({
            "node.model": asset,
            "node.color": "#ff0000",
            "node.modelTint": tint,
        });
        const own = count(await readFrame(element), GREEN);
        assert.isAbove(own, 300, "its green picture is drawn");

        const onTop = await restyle(element, layer, set(true));
        assert.isBelow(count(onTop, GREEN), own / 10, "red on top of green leaves no green");

        const untextured = await restyle(element, layer, set("untextured"));
        assert.isAbove(count(untextured, GREEN), own * 0.8, "a part with a picture keeps it");
        assert.strictEqual(count(untextured, RED), 0);

        const replaced = await restyle(element, layer, set("replace"));
        assert.isAbove(count(replaced, RED), own * 0.8, "one flat node color");
        assert.strictEqual(count(replaced, GREEN), 0);
    });

    it("paints a material color with no picture under 'untextured' (OBJ with an MTL)", async () => {
        const element = await mount();
        const { layer, asset } = await drawModel(element, "obj-mtl", [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const own = await readFrame(element);
        assert.isAbove(count(own, BLUE), 300, "its own blue Kd");
        assert.strictEqual(count(own, RED), 0);

        const untextured = await restyle(element, layer, {
            "node.model": asset,
            "node.color": "#ff0000",
            "node.modelTint": "untextured",
        });
        assert.isAbove(count(untextured, RED), 300, "the node's red");
        assert.strictEqual(count(untextured, BLUE), 0);
    });

    it("multiplies the node color into vertex colors on top, and drops them under 'replace'", async () => {
        const element = await mount();
        const { layer, asset } = await drawModel(element, "ply-ascii-colors", [{ id: "a", x: 0 }], {
            "node.color": "#00ff00",
        });
        const own = count(await readFrame(element), RED);
        assert.isAbove(own, 300, "its own red vertex colors");
        const set = (tint: unknown): Record<string, unknown> => ({
            "node.model": asset,
            "node.color": "#00ff00",
            "node.modelTint": tint,
        });

        const onTop = await restyle(element, layer, set(true));
        assert.isBelow(count(onTop, RED), own / 10, "green on top of red leaves no red");

        const replaced = await restyle(element, layer, set("replace"));
        assert.isAbove(count(replaced, GREEN), own * 0.8, "one flat green");
        assert.strictEqual(count(replaced, RED), 0);
    });
});

describe("model orientation", () => {
    it("stands a skinned model up by its skeleton, as BrainStem's root joint does", async () => {
        const element = await mount();
        await drawModel(element, "gltf-skinned-z-up", [{ id: "a", x: 0 }]);
        const extent = element.graph.getNodeMesh("a")?.getBoundingInfo().boundingBox.extendSize;
        assert.isDefined(extent);
        assert.isAbove(extent.y, extent.z * 2, "taller than deep: the Z-up file is turned Y up");
        assert.isAbove(extent.y, extent.x * 2, "taller than wide");
    });
});

/**
 * An OBJ shaped as an L, in two materials: a blue bar along the bottom and a green post up its
 * left end, so its outline is not convex and it is drawn as two parts.
 * @returns Its files.
 */
function lShape(): Map<string, Uint8Array> {
    const lines = ["mtllib l.mtl"];
    let at = 1;
    const box = (name: string, material: string, [x0, y0, x1, y1]: readonly number[]): void => {
        lines.push(`o ${name}`, `usemtl ${material}`);
        for (const z of [0, 1]) {
            for (const [x, y] of [
                [x0, y0],
                [x1, y0],
                [x1, y1],
                [x0, y1],
            ]) {
                lines.push(`v ${String(x)} ${String(y)} ${String(z)}`);
            }
        }
        // Six faces, each as two triangles, wound outward.
        for (const [a, b, c, d] of [
            [0, 3, 2, 1],
            [4, 5, 6, 7],
            [0, 1, 5, 4],
            [2, 3, 7, 6],
            [1, 2, 6, 5],
            [3, 0, 4, 7],
        ]) {
            lines.push(
                `f ${String(at + a)} ${String(at + b)} ${String(at + c)}`,
                `f ${String(at + a)} ${String(at + c)} ${String(at + d)}`,
            );
        }
        at += 8;
    };
    box("bar", "blue", [0, 0, 4, 1]);
    box("post", "green", [0, 1, 1, 4]);
    const mtl = ["newmtl blue", "Kd 0 0 1", "newmtl green", "Kd 0 0.7 0"].join("\n");
    const encoder = new TextEncoder();
    return new Map([
        ["l.obj", encoder.encode(lines.join("\n"))],
        ["l.mtl", encoder.encode(mtl)],
    ]);
}

/**
 * How far each pixel is from the nearest pixel of a mask, counting a diagonal step as one.
 * @param frame - The frame, for its size.
 * @param mask - The mask, one flag a pixel.
 * @returns The distances, one a pixel.
 */
function distanceTo(frame: Frame, mask: readonly boolean[]): Float32Array {
    const { width, height } = frame;
    const far = width + height;
    const d = new Float32Array(width * height).map((_, i) => (mask[i] ? 0 : far));
    const relax = (i: number, j: number): void => {
        if (d[j] + 1 < d[i]) {
            d[i] = d[j] + 1;
        }
    };
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (x > 0) {
                relax(i, i - 1);
            }
            if (y > 0) {
                relax(i, i - width);
                if (x > 0) {
                    relax(i, i - width - 1);
                }
                if (x < width - 1) {
                    relax(i, i - width + 1);
                }
            }
        }
    }
    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const i = y * width + x;
            if (x < width - 1) {
                relax(i, i + 1);
            }
            if (y < height - 1) {
                relax(i, i + width);
                if (x < width - 1) {
                    relax(i, i + width + 1);
                }
                if (x > 0) {
                    relax(i, i + width - 1);
                }
            }
        }
    }
    return d;
}

/**
 * Which pixels of a frame pass a test.
 * @param frame - The frame.
 * @param match - The test.
 * @param half - Only this half of the frame.
 * @returns One flag a pixel.
 */
function maskOf(frame: Frame, match: (r: number, g: number, b: number) => boolean, half: "left" | "right"): boolean[] {
    const { pixels, width } = frame;
    const mask: boolean[] = [];
    for (let at = 0; at < pixels.length; at += 4) {
        const inHalf = (at / 4) % width < width / 2 === (half === "left");
        mask.push(inHalf && match(pixels[at], pixels[at + 1], pixels[at + 2]));
    }
    return mask;
}

describe("marks on model nodes", () => {
    it("marks a selected L-shaped model with a band along its silhouette, nowhere over it and nowhere apart", async () => {
        const element = await mount(600, 300);
        await drawModel(
            element,
            lShape(),
            [
                { id: "a", x: -1 },
                { id: "b", x: 1 },
            ],
            { "node.modelDoubleSided": true },
        );
        element.graph.zoomToFit();
        const before = await readFrame(element);
        assert.strictEqual(count(before, GOLD), 0, "nothing is marked before a selection");
        const blue = maskOf(before, BLUE, "left");
        const green = maskOf(before, GREEN, "left");
        // The model is every pixel that is not the light background, its shaded sides included.
        const model = maskOf(before, (r, g, b) => r < 200 || g < 200 || b < 200, "left");
        assert.isAbove(blue.filter(Boolean).length, 100, "the blue bar is drawn");
        assert.isAbove(green.filter(Boolean).length, 100, "the green post is drawn");

        assert.isTrue(element.graph.selectNode("a"));
        const marked = await readFrame(element);
        const gold = maskOf(marked, GOLD, "left");
        const goldCount = gold.filter(Boolean).length;
        assert.isAbove(goldCount, 100, "the selected node is marked");
        assert.strictEqual(countIn(marked, GOLD).right, 0, "the other node of the same model is not");

        // A band hugs the silhouette: every marked pixel is within the band's width of the model,
        // none lies over the model's inside (no "X" across it), and both parts are ringed.
        const fromModel = distanceTo(marked, model);
        const inside = distanceTo(
            marked,
            model.map((m) => !m),
        );
        const away = gold.filter((g, i) => g && fromModel[i] > 16).length;
        assert.strictEqual(away, 0, "no mark apart from the model: no second, misaligned copy");
        // The band straddles the silhouette's edge by up to its width; nothing reaches deeper.
        const over = gold.filter((g, i) => g && inside[i] > 12).length;
        assert.strictEqual(over, 0, "no mark over the model's inside");
        assert.isAbove(
            inside.filter((d) => d > 12).length,
            1000,
            "the model is deep enough for a mark across it to show",
        );
        const fromBlue = distanceTo(marked, blue);
        const fromGreen = distanceTo(marked, green);
        assert.isAbove(gold.filter((g, i) => g && fromBlue[i] < 6).length, 20, "the blue bar is ringed");
        assert.isAbove(gold.filter((g, i) => g && fromGreen[i] < 6).length, 20, "the green post is ringed");
        // The L's open corner is far from both parts: a ring or box around the whole model would
        // cover it, a silhouette band does not.
        const { width } = marked;
        const xs = model.flatMap((m, i) => (m ? [i % width] : []));
        const ys = model.flatMap((m, i) => (m ? [Math.floor(i / width)] : []));
        const [left, right, bottom, top] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const corner = fromModel.filter((d, i) => {
            const [x, y] = [i % width, Math.floor(i / width)];
            return d > 16 && x >= left && x <= right && y >= bottom && y <= top;
        }).length;
        assert.isAbove(corner, 0, "the fixture leaves room for a misplaced mark to show");
        // Its blue and green are still drawn under the mark: a band, not a copy laid over it.
        assert.isAbove(count(marked, BLUE), blue.filter(Boolean).length * 0.8);

        element.graph.deselectNode();
        assert.strictEqual(count(await readFrame(element), GOLD), 0, "the mark goes with the selection");
    });

    it("glows one node of a model and leaves the other node of the same model unmarked", async () => {
        const element = await mount(600, 300);
        await drawModel(element, "glb", [
            { id: "a", x: -1 },
            { id: "b", x: 1 },
        ]);
        element.graph.zoomToFit();
        assert.strictEqual(count(await readFrame(element), MAGENTA), 0);
        await element.session.styles.add({
            name: "glow a",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.glow": "#ff00ff" },
        });
        const glowing = countIn(await readFrame(element), MAGENTA);
        assert.isAbove(glowing.left, 50, "node a glows");
        assert.strictEqual(glowing.right, 0, "node b, the same model, does not");
    });
});

describe("model load progress", () => {
    it("reports the bytes of a download as they arrive, then ends succeeded", async () => {
        const [bytes] = (await filesOf("glb")).values();
        const url = "https://models.example.com/progress/cube.glb";
        const spy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
            assert.strictEqual(input instanceof Request ? input.url : String(input), url);
            // Three chunks, so progress is heard between them.
            const third = Math.ceil(bytes.length / 3);
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (let at = 0; at < bytes.length; at += third) {
                        controller.enqueue(bytes.slice(at, at + third));
                    }
                    controller.close();
                },
            });
            return Promise.resolve(
                new Response(body, { status: 200, headers: { "content-length": String(bytes.length) } }),
            );
        });
        cleanups.push(() => {
            spy.mockRestore();
        });
        const element = await mount();
        const heard: ProgressChange[] = [];
        const record = await element.session.assets.add(url, {
            onProgress: (change) => {
                heard.push(change);
            },
        });
        assert.strictEqual(record.state, "accepted");
        const progress = heard.filter((change) => change.phase === "progress");
        assert.isAbove(progress.length, 2);
        for (const change of progress) {
            assert.strictEqual(change.task, "asset");
            assert.strictEqual(change.unit, "bytes");
            assert.strictEqual(change.asset?.stage, "downloading");
            assert.strictEqual(change.total, bytes.length);
        }
        const completed = progress.map((change) => change.completed);
        assert.deepEqual(
            completed,
            [...completed].sort((a, b) => a - b),
            "the bytes received only grow",
        );
        assert.strictEqual(progress.at(-1)?.completed, bytes.length);
        assert.strictEqual(progress.at(-1)?.fraction, 1);
        assert.deepInclude(heard.at(-1), { phase: "end", outcome: "succeeded" });
    });

    it("keeps a download that stays slower than the idle limit in total but never stalls that long", async () => {
        const [bytes] = (await filesOf("glb")).values();
        const url = "https://models.example.com/progress/slow.glb";
        let send: (chunk: Uint8Array | null) => void = () => undefined;
        let opened: () => void = () => undefined;
        const fetched = new Promise<void>((resolve) => {
            opened = resolve;
        });
        const spy = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    // A real fetch fails its body when its signal aborts: the idle limit's abort.
                    init?.signal?.addEventListener("abort", () => {
                        controller.error(new DOMException("stopped", "AbortError"));
                    });
                    opened();
                    send = (chunk) => {
                        if (chunk === null) {
                            controller.close();
                        } else {
                            controller.enqueue(chunk);
                        }
                    };
                },
            });
            return Promise.resolve(
                new Response(body, { status: 200, headers: { "content-length": String(bytes.length) } }),
            );
        });
        cleanups.push(() => {
            spy.mockRestore();
        });
        const element = await mount();
        const idle = DEFAULT_MODEL_LIMITS.fetchTimeoutMs;
        // The product's own idle timer, stepped on a fake clock: no wall-clock wait.
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        cleanups.push(() => {
            vi.useRealTimers();
        });
        const received: number[] = [];
        let heard: () => void = () => undefined;
        const adding = element.session.assets.add(url, {
            onProgress: (change) => {
                if (change.phase === "progress") {
                    received.push(change.completed);
                    heard();
                }
            },
        });
        // Settles once the element has heard this many bytes, so the next step starts after it.
        const heardUpTo = (bytesSoFar: number): Promise<void> =>
            new Promise((resolve) => {
                heard = () => {
                    if ((received.at(-1) ?? 0) >= bytesSoFar) {
                        resolve();
                    }
                };
            });
        await fetched;
        // Four chunks, each after most of the idle limit: more than twice the limit in all.
        const quarter = Math.ceil(bytes.length / 4);
        for (let at = 0; at < bytes.length; at += quarter) {
            const chunk = bytes.slice(at, at + quarter);
            const arrived = heardUpTo(at + chunk.length);
            vi.advanceTimersByTime(idle * 0.6);
            send(chunk);
            await arrived;
        }
        send(null);
        const record = await adding;
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        assert.strictEqual(received.at(-1), bytes.length);
    });

    it("stops a download when its only caller's signal aborts, and fetches it again on the next add", async () => {
        const [bytes] = (await filesOf("glb")).values();
        const url = "https://models.example.com/progress/stalled.glb";
        let requests = 0;
        const spy = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
            requests++;
            const first = requests === 1;
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(bytes.slice(0, 8));
                    if (!first) {
                        controller.enqueue(bytes.slice(8));
                        controller.close();
                        return;
                    }
                    // The first answer sends 8 bytes and then nothing, until the download is stopped.
                    init?.signal?.addEventListener("abort", () => {
                        controller.error(new DOMException("stopped", "AbortError"));
                    });
                },
            });
            return Promise.resolve(new Response(body, { status: 200 }));
        });
        cleanups.push(() => {
            spy.mockRestore();
        });
        const element = await mount();
        const stop = new AbortController();
        const heard: ProgressChange[] = [];
        let begun: () => void = () => undefined;
        const started = new Promise<void>((resolve) => {
            begun = resolve;
        });
        const adding = element.session.assets.add(url, {
            signal: stop.signal,
            onProgress: (change) => {
                heard.push(change);
                if (change.phase === "progress" && change.completed === 8) {
                    begun();
                }
            },
        });
        await started;
        stop.abort();
        const error = await adding.catch((e: unknown) => e);
        assert.instanceOf(error, Error);
        assert.deepInclude(heard.at(-1), { phase: "end", outcome: "cancelled" });

        const again = await element.session.assets.add(url);
        assert.strictEqual(again.state, "accepted", JSON.stringify(again.problems));
        assert.strictEqual(requests, 2, "the stopped download was fetched again");
    });
});
