/**
 * Reading a model source into a file set and checking it: every shape a source may take, a URL
 * fetched with the files it names beside it (fetch answered here, never the network), and the
 * refusals a caller can act on.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";
import { afterEach, assert, describe, it, vi } from "vitest";

import {
    checkModelFiles,
    DEFAULT_MODEL_LIMITS,
    fetchModelSet,
    isKnownWebPage,
    isWebPage,
    listModels,
    listParts,
    mainFileOf,
    ModelError,
    readModelFiles,
    webPageParams,
    withSkips,
} from "../src/files/index.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A variant's file.
 * @param id - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
function fixture(id: string, name: string): Uint8Array {
    return new Uint8Array(readFileSync(join(VARIANTS, id, name)));
}

/**
 * A File-like value: a name, a folder path and bytes.
 * @param name - The file name.
 * @param bytes - Its bytes.
 * @param webkitRelativePath - Its path in a picked folder.
 * @returns The value.
 */
function file(name: string, bytes: Uint8Array, webkitRelativePath = "") {
    return {
        name,
        webkitRelativePath,
        size: bytes.length,
        arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
    };
}

/**
 * What a promise rejected with.
 * @param work - The promise.
 * @returns The ModelError.
 */
async function refusal(work: Promise<unknown>): Promise<ModelError> {
    const error = await work.then(
        () => assert.fail("it was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error;
}

/** One answer of the stubbed fetch. */
interface Answer {
    readonly status?: number;
    readonly bytes?: Uint8Array;
    readonly redirectedTo?: string;
    readonly length?: number;
}

/**
 * Answer fetch from a table of URLs; anything else is a 404. Records what was asked.
 * @param answers - URL to answer.
 * @returns The URLs fetched, in order.
 */
function serve(answers: Record<string, Answer>): string[] {
    const asked: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
        asked.push(url);
        const answer = answers[url] ?? { status: 404 };
        const bytes = answer.bytes ?? new Uint8Array(0);
        return Promise.resolve({
            ok: (answer.status ?? 200) < 400,
            status: answer.status ?? 200,
            redirected: answer.redirectedTo !== undefined,
            url: answer.redirectedTo ?? url,
            headers: {
                get: (name: string) => (name === "content-length" ? String(answer.length ?? bytes.length) : null),
            },
            body: null,
            arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
        });
    });
    return asked;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("reading a source", () => {
    it("reads Files from a picked folder without the folder's own name", async () => {
        const read = await readModelFiles(
            [
                file("cube.obj", fixture("obj-mtl-png", "cube.obj"), "kit/cube.obj"),
                file("cube.mtl", fixture("obj-mtl-png", "cube.mtl"), "kit/cube.mtl"),
                file("cube.png", fixture("obj-mtl-png", "cube.png"), "kit/cube.png"),
            ],
            DEFAULT_MODEL_LIMITS,
        );
        assert.sameMembers([...read.given.keys()], ["cube.obj", "cube.mtl", "cube.png"]);
        const checked = await checkModelFiles(read.given, {}, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(checked.format, "obj");
        assert.strictEqual(checked.summary.textures, 1);
    });

    it("reads one File, bytes and an ArrayBuffer, and a map naming its main file", async () => {
        const glb = fixture("glb", "cube.glb");
        assert.deepStrictEqual(
            [...(await readModelFiles(file("a.glb", glb), DEFAULT_MODEL_LIMITS)).given.keys()],
            ["a.glb"],
        );
        assert.deepStrictEqual([...(await readModelFiles(glb, DEFAULT_MODEL_LIMITS)).given.keys()], ["model"]);
        assert.deepStrictEqual(
            [...(await readModelFiles(glb.slice().buffer, DEFAULT_MODEL_LIMITS)).given.keys()],
            ["model"],
        );
        const named = await readModelFiles(
            {
                files: new Map([
                    ["dir/a.glb", glb],
                    ["dir/b.glb", glb],
                ]),
                main: "dir/b.glb",
            },
            DEFAULT_MODEL_LIMITS,
        );
        assert.strictEqual(named.main, "b.glb");
    });

    it("refuses nothing at all, two names that differ only by case, and too many bytes", async () => {
        assert.strictEqual((await refusal(readModelFiles([], DEFAULT_MODEL_LIMITS))).code, "E_MODEL_FORMAT_UNKNOWN");
        const glb = fixture("glb", "cube.glb");
        const twice = await refusal(readModelFiles([file("A.glb", glb), file("a.glb", glb)], DEFAULT_MODEL_LIMITS));
        assert.strictEqual(twice.code, "E_MODEL_AMBIGUOUS");
        const big = await refusal(readModelFiles(glb, { ...DEFAULT_MODEL_LIMITS, maxBytes: 10 }));
        assert.deepStrictEqual(big.fact, {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "bytes", found: glb.length, limit: 10 },
        });
    });
});

describe("checking a set", () => {
    it("checks a picture as an image, and two models as ambiguous until one is named", async () => {
        const png = await checkModelFiles(
            new Map([["cube.png", fixture("gltf-textured", "cube.png")]]),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.strictEqual(png.kind, "image");
        assert.strictEqual(png.format, "png");

        const two = new Map([
            ["a.glb", fixture("glb", "cube.glb")],
            ["b.glb", fixture("glb", "cube.glb")],
        ]);
        assert.strictEqual((await refusal(checkModelFiles(two, {}, DEFAULT_MODEL_LIMITS))).code, "E_MODEL_AMBIGUOUS");
        assert.isUndefined(mainFileOf(two, {}));
        assert.strictEqual(mainFileOf(two, { main: "b.glb" }), "b.glb");
        assert.strictEqual((await checkModelFiles(two, { main: "b.glb" }, DEFAULT_MODEL_LIMITS)).main, "b.glb");
        assert.strictEqual(
            (await refusal(checkModelFiles(two, { main: "c.glb" }, DEFAULT_MODEL_LIMITS))).code,
            "E_MODEL_MISSING_FILE",
        );
    });

    it("lists a model's parts: found, missing, skipped and unused", () => {
        const files = new Map([
            ["cube.obj", fixture("obj-mtl-png", "cube.obj")],
            ["cube.mtl", fixture("obj-mtl-png", "cube.mtl")],
            ["notes.txt", new TextEncoder().encode("hello")],
        ]);
        const parts = listParts(files, {}, DEFAULT_MODEL_LIMITS);
        assert.deepStrictEqual(
            parts?.map((p) => [p.name, p.role, p.state]),
            [
                ["cube.obj", "model", "found"],
                ["cube.mtl", "materials", "found"],
                ["cube.png", "texture", "missing"],
                ["notes.txt", "other", "unused"],
            ],
        );
        const skipped = listParts(files, { skipped: ["cube.png"] }, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(skipped?.find((p) => p.name === "cube.png")?.state, "skipped");
        const drawn = withSkips(files, ["cube.png"], true);
        assert.strictEqual(drawn.size, files.size + 1, "a skipped picture is drawn white");
    });

    it("lists every model of a set with the files each uses", () => {
        const files = new Map([
            ["a/rack.gltf", fixture("gltf-textured", "cube.gltf")],
            ["a/cube.bin", fixture("gltf-textured", "cube.bin")],
            ["a/cube.png", fixture("gltf-textured", "cube.png")],
            ["b/cube.obj", fixture("obj-mtl-png", "cube.obj")],
            ["b/cube.mtl", fixture("obj-mtl-png", "cube.mtl")],
            ["c.glb", fixture("glb", "cube.glb")],
            ["c.stl", fixture("glb", "cube.glb")],
            ["notes.txt", new TextEncoder().encode("hello")],
        ]);
        assert.deepStrictEqual(listModels(files, DEFAULT_MODEL_LIMITS), [
            { main: "a/rack.gltf", format: "gltf", files: ["a/rack.gltf", "a/cube.bin", "a/cube.png"] },
            // The .mtl names cube.png, which only the other folder holds: matched by its base name, as the checks would.
            { main: "b/cube.obj", format: "obj", files: ["b/cube.obj", "b/cube.mtl", "a/cube.png"] },
            { main: "c.glb", format: "glb", files: ["c.glb"] },
        ]);
        const one = new Map([["cube.glb", fixture("glb", "cube.glb")]]);
        assert.deepStrictEqual(
            listModels(one, DEFAULT_MODEL_LIMITS).map((m) => m.main),
            ["cube.glb"],
        );
    });

    it("unpacks a zip and checks what it holds", async () => {
        const zip = zipSync({
            "cube.gltf": fixture("gltf-textured", "cube.gltf"),
            "cube.bin": fixture("gltf-textured", "cube.bin"),
            "cube.png": fixture("gltf-textured", "cube.png"),
        });
        const checked = await checkModelFiles(new Map([["cube.zip", zip]]), {}, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(checked.format, "gltf");
        assert.sameMembers([...checked.files.keys()], ["cube.gltf", "cube.bin", "cube.png"]);
    });
});

describe("fetching a model by URL", () => {
    const BASE = "https://models.example.com/kit/";

    it("fetches a glTF with the buffer and picture beside it", async () => {
        const asked = serve({
            [`${BASE}cube.gltf`]: { bytes: fixture("gltf-textured", "cube.gltf") },
            [`${BASE}cube.bin`]: { bytes: fixture("gltf-textured", "cube.bin") },
            [`${BASE}cube.png`]: { bytes: fixture("gltf-textured", "cube.png") },
        });
        const fetched = await fetchModelSet(new URL(`${BASE}cube.gltf`), DEFAULT_MODEL_LIMITS);
        assert.strictEqual(fetched.main, "cube.gltf");
        assert.sameMembers([...fetched.given.keys()], ["cube.gltf", "cube.bin", "cube.png"]);
        assert.sameMembers(asked, [`${BASE}cube.gltf`, `${BASE}cube.bin`, `${BASE}cube.png`]);
    });

    it("fetches a glTF whose parts are many and large together, as FlightHelmet's and Sponza's are", async () => {
        const json = JSON.parse(new TextDecoder().decode(fixture("gltf-textured", "cube.gltf"))) as Record<
            string,
            unknown
        >;
        // Sponza names 69 pictures beside its .gltf; FlightHelmet's parts come to 46 MB.
        json.images = Array.from({ length: 70 }, (_, i) => ({ uri: `p${String(i)}.png` }));
        json.textures = Array.from({ length: 70 }, (_, i) => ({ source: i }));
        const png = fixture("gltf-textured", "cube.png");
        const large = new Uint8Array(40 * 1024 * 1024);
        large.set(png);
        serve({
            [`${BASE}scene.gltf`]: { bytes: new TextEncoder().encode(JSON.stringify(json)) },
            [`${BASE}cube.bin`]: { bytes: fixture("gltf-textured", "cube.bin") },
            ...Object.fromEntries(
                Array.from({ length: 70 }, (_, i) => [`${BASE}p${String(i)}.png`, { bytes: i === 0 ? large : png }]),
            ),
        });
        const fetched = await fetchModelSet(new URL(`${BASE}scene.gltf`), DEFAULT_MODEL_LIMITS);
        assert.strictEqual(fetched.given.size, 72);
        const checked = await checkModelFiles(fetched.given, { main: fetched.main }, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(checked.summary.textures, 70);
        const fewer = await refusal(
            fetchModelSet(new URL(`${BASE}scene.gltf`), { ...DEFAULT_MODEL_LIMITS, maxFiles: 64 }),
        );
        assert.deepInclude(fewer.fact.params, { what: "count", item: "files", limit: 64 });
    });

    it("fetches what a USD layer above the folder names from that layer's own folder", async () => {
        const text = (body: string) => new TextEncoder().encode(`#usda 1.0\n${body}`);
        const KIT = "https://models.example.com/kit/";
        // The car kit's layout: a car two folders down references the shared wheels, whose
        // variants name their meshes from the wheels' folder and a picture beside it.
        const asked = serve({
            [`${KIT}vehicles/sedan/car.usda`]: {
                bytes: text('def "W" ( references = @../../wheels/wheels.usda@ ) {}\n'),
            },
            [`${KIT}wheels/wheels.usda`]: {
                bytes: text('def "B" ( references = @./black/black.usda@ ) {}\nasset file = @./tex/tire.png@\n'),
            },
            [`${KIT}wheels/black/black.usda`]: { bytes: text('def Mesh "G"\n{\n int[] faceVertexCounts = [3]\n}\n') },
            [`${KIT}wheels/tex/tire.png`]: { bytes: fixture("gltf-textured", "cube.png") },
        });
        const fetched = await fetchModelSet(new URL(`${KIT}vehicles/sedan/car.usda`), DEFAULT_MODEL_LIMITS);
        assert.sameMembers(
            [...fetched.given.keys()],
            ["car.usda", "wheels/wheels.usda", "wheels/black/black.usda", "wheels/tex/tire.png"],
        );
        assert.isEmpty(
            asked.filter((url) => url.includes("/sedan/wheels/")),
            asked.join("\n"),
        );
    });

    it("sets no idle timer for a fetchTimeoutMs of Infinity, which setTimeout would fire at once", async () => {
        serve({
            [`${BASE}cube.gltf`]: { bytes: fixture("gltf-textured", "cube.gltf") },
            [`${BASE}cube.bin`]: { bytes: fixture("gltf-textured", "cube.bin") },
            [`${BASE}cube.png`]: { bytes: fixture("gltf-textured", "cube.png") },
        });
        const timers = vi.spyOn(globalThis, "setTimeout");
        const fetched = await fetchModelSet(new URL(`${BASE}cube.gltf`), {
            ...DEFAULT_MODEL_LIMITS,
            fetchTimeoutMs: Number.POSITIVE_INFINITY,
        });
        assert.strictEqual(fetched.given.size, 3);
        const delays = timers.mock.calls.map((call) => call[1] ?? 0);
        assert.isTrue(
            delays.every((d) => d <= 2_147_483_647),
            `no delay setTimeout turns into 1 ms: ${delays.join(", ")}`,
        );
    });

    it("tries a missing picture in the usual folders, then reports it with the set fetched so far", async () => {
        const asked = serve({
            [`${BASE}cube.gltf`]: { bytes: fixture("gltf-textured", "cube.gltf") },
            [`${BASE}cube.bin`]: { bytes: fixture("gltf-textured", "cube.bin") },
        });
        const error = await refusal(fetchModelSet(new URL(`${BASE}cube.gltf`), DEFAULT_MODEL_LIMITS));
        assert.strictEqual(error.code, "E_MODEL_MISSING_FILE");
        assert.strictEqual(error.fact.params.name, "cube.png");
        assert.include(asked, `${BASE}textures/cube.png`);
        assert.include(error.fact.params.tried as string[], `${BASE}cube.png`);
        assert.sameMembers([...(error.held?.given.keys() ?? [])], ["cube.gltf", "cube.bin"]);
    });

    it("holds a model once only its pictures are left to fetch, and stops fetching them on a signal (#8614)", async () => {
        const answers: Record<string, Uint8Array> = {
            [`${BASE}cube.gltf`]: fixture("gltf-textured", "cube.gltf"),
            [`${BASE}cube.bin`]: fixture("gltf-textured", "cube.bin"),
        };
        const asked: string[] = [];
        const stop = new AbortController();
        // The picture never arrives: the reader stops it while it downloads.
        vi.stubGlobal("fetch", (url: string, init: { signal: AbortSignal }) => {
            asked.push(url);
            const bytes = answers[url];
            if (bytes === undefined) {
                queueMicrotask(() => {
                    stop.abort();
                });
                return new Promise((_, reject) => {
                    init.signal.addEventListener("abort", () => {
                        reject(new Error("stopped"));
                    });
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                redirected: false,
                url,
                headers: { get: (name: string) => (name === "content-length" ? String(bytes.length) : null) },
                body: null,
                arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
            });
        });
        const waiting: { names: string[]; facts: string[] }[] = [];
        const result = refusal(
            fetchModelSet(new URL(`${BASE}cube.gltf`), DEFAULT_MODEL_LIMITS, undefined, undefined, undefined, {
                signal: stop.signal,
                onWaiting: (held, facts) => {
                    waiting.push({ names: [...held.given.keys()], facts: facts.map((f) => String(f.params.name)) });
                },
            }),
        );
        const error = await result;
        assert.deepStrictEqual(waiting, [{ names: ["cube.gltf", "cube.bin"], facts: ["cube.png"] }]);
        assert.strictEqual(error.code, "E_MODEL_MISSING_FILE");
        assert.strictEqual(error.fact.params.name, "cube.png");
        assert.sameMembers([...(error.held?.given.keys() ?? [])], ["cube.gltf", "cube.bin"]);
        assert.strictEqual(
            asked.filter((url) => url.endsWith("cube.png")).length,
            1,
            "no other address is tried after the stop",
        );
    });

    it("stops fetching one picture by its name while the others arrive", async () => {
        const gltf = JSON.parse(new TextDecoder().decode(fixture("gltf-textured", "cube.gltf"))) as {
            images: { uri: string }[];
            textures: { source: number }[];
            materials: { emissiveTexture?: { index: number } }[];
        };
        gltf.images.push({ uri: "glow.png" });
        gltf.textures.push({ source: 1 });
        gltf.materials[0].emissiveTexture = { index: 1 };
        const answers: Record<string, Uint8Array> = {
            [`${BASE}cube.gltf`]: new TextEncoder().encode(JSON.stringify(gltf)),
            [`${BASE}cube.bin`]: fixture("gltf-textured", "cube.bin"),
            [`${BASE}glow.png`]: fixture("gltf-textured", "cube.png"),
        };
        const asked: string[] = [];
        const one = new AbortController();
        // cube.png never arrives: the reader stops that one picture while it downloads.
        vi.stubGlobal("fetch", (url: string, init: { signal: AbortSignal }) => {
            asked.push(url);
            const bytes = answers[url];
            if (bytes === undefined) {
                queueMicrotask(() => {
                    one.abort();
                });
                return new Promise((_, reject) => {
                    init.signal.addEventListener("abort", () => {
                        reject(new Error("stopped"));
                    });
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                redirected: false,
                url,
                headers: { get: (name: string) => (name === "content-length" ? String(bytes.length) : null) },
                body: null,
                arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
            });
        });
        const error = await refusal(
            fetchModelSet(new URL(`${BASE}cube.gltf`), DEFAULT_MODEL_LIMITS, undefined, undefined, undefined, {
                part: (name) => (name === "cube.png" ? one.signal : undefined),
            }),
        );
        assert.strictEqual(error.code, "E_MODEL_MISSING_FILE");
        assert.strictEqual(error.fact.params.name, "cube.png");
        assert.sameMembers([...(error.held?.given.keys() ?? [])], ["cube.gltf", "cube.bin", "glow.png"]);
        assert.strictEqual(asked.filter((url) => url.endsWith("cube.png")).length, 1, "stopped, not tried again");
    });

    it("stops reading a body that does not end with its request when the caller stops", async () => {
        vi.stubGlobal("fetch", () =>
            Promise.resolve({
                ok: true,
                status: 200,
                redirected: false,
                url: `${BASE}cube.glb`,
                headers: { get: () => null },
                // A stream that never ends and ignores the request's signal.
                body: new ReadableStream<Uint8Array>(),
                arrayBuffer: () => new Promise<ArrayBuffer>(() => undefined),
            }),
        );
        const stop = new AbortController();
        const fetching = fetchModelSet(new URL(`${BASE}cube.glb`), DEFAULT_MODEL_LIMITS, stop.signal);
        stop.abort(new Error("stopped"));
        const error = await fetching.then(
            () => undefined,
            (e: unknown) => e,
        );
        assert.strictEqual((error as Error).message, "stopped");
    });

    it("says a web page is not a model, and names the raw file behind a GitHub page without fetching", async () => {
        serve({ [`${BASE}cube.glb`]: { bytes: new TextEncoder().encode("\n  <!DOCTYPE html><html></html>") } });
        assert.strictEqual(
            (await refusal(fetchModelSet(new URL(`${BASE}cube.glb`), DEFAULT_MODEL_LIMITS))).code,
            "E_MODEL_WEB_PAGE",
        );

        const asked = serve({});
        const page = new URL("https://github.com/owner/repo/blob/main/models/cube.glb");
        assert.isTrue(isKnownWebPage(page));
        const error = await refusal(fetchModelSet(page, DEFAULT_MODEL_LIMITS));
        assert.strictEqual(
            error.fact.params.suggested,
            "https://raw.githubusercontent.com/owner/repo/main/models/cube.glb",
        );
        assert.deepStrictEqual(asked, []);
    });

    it("refuses another scheme, credentials, a redirect to a private host, a failed answer and a large one", async () => {
        serve({
            [`${BASE}moved.glb`]: { bytes: fixture("glb", "cube.glb"), redirectedTo: "http://127.0.0.1/cube.glb" },
            [`${BASE}broken.glb`]: { status: 500 },
            [`${BASE}huge.glb`]: { length: 1e12 },
        });
        const code = async (url: string) => (await refusal(fetchModelSet(new URL(url), DEFAULT_MODEL_LIMITS))).fact;
        assert.strictEqual((await code("ftp://models.example.com/cube.glb")).code, "E_MODEL_URL_BLOCKED");
        assert.strictEqual((await code("https://user:pw@models.example.com/cube.glb")).params.credentials, true);
        assert.deepStrictEqual(await code(`${BASE}moved.glb`), {
            code: "E_MODEL_URL_BLOCKED",
            params: { hosts: ["127.0.0.1"], redirected: true },
        });
        assert.deepStrictEqual(await code(`${BASE}broken.glb`), {
            code: "E_MODEL_FETCH",
            params: { url: `${BASE}broken.glb`, status: 500, offline: false },
        });
        assert.strictEqual((await code(`${BASE}huge.glb`)).code, "E_MODEL_TOO_LARGE");
    });

    it("reports bytes as they arrive, and stops only a download that stalls", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        try {
            const bytes = fixture("glb", "cube.glb");
            const third = Math.ceil(bytes.length / 3);
            // The test hands the body over chunk by chunk, moving the fake clock between chunks.
            let asked: (deliver: (value: Uint8Array | undefined) => void) => void = () => undefined;
            const nextRead = () =>
                new Promise<(value: Uint8Array | undefined) => void>((resolve) => {
                    asked = resolve;
                });
            vi.stubGlobal("fetch", (url: string, init: { signal: AbortSignal }) =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    redirected: false,
                    url,
                    headers: { get: (name: string) => (name === "content-length" ? String(bytes.length) : null) },
                    body: {
                        getReader: () => ({
                            read: () =>
                                new Promise<{ done: boolean; value?: Uint8Array }>((resolve, reject) => {
                                    init.signal.addEventListener("abort", () => {
                                        reject(new Error("aborted"));
                                    });
                                    asked((value) => {
                                        resolve(value === undefined ? { done: true } : { done: false, value });
                                    });
                                }),
                            cancel: () => Promise.resolve(),
                        }),
                    },
                    arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
                }),
            );

            const heard: { loaded: number; total: number | null }[] = [];
            let reading = nextRead();
            const fetching = fetchModelSet(
                new URL(`${BASE}slow.glb`),
                DEFAULT_MODEL_LIMITS,
                undefined,
                undefined,
                (p) => {
                    heard.push({ loaded: p.loaded, total: p.total });
                },
            );
            // Three chunks, then the end of the body.
            const chunks = [0, third, third * 2].map((at) => bytes.slice(at, at + third));
            for (const chunk of [...chunks, undefined]) {
                const deliver = await reading;
                reading = nextRead();
                // 20 s between chunks: under the 30 s idle limit each time, over it in all.
                vi.advanceTimersByTime(20_000);
                deliver(chunk);
            }
            const fetched = await fetching;
            assert.strictEqual(fetched.given.get("slow.glb")?.length, bytes.length);
            assert.deepStrictEqual(heard.at(-1), { loaded: bytes.length, total: bytes.length });
            assert.isTrue(heard.every((p, i) => i === 0 || p.loaded >= heard[i - 1].loaded));
            assert.isAbove(heard.length, 3);

            reading = nextRead();
            const stalled = refusal(fetchModelSet(new URL(`${BASE}stalled.glb`), DEFAULT_MODEL_LIMITS));
            await reading;
            vi.advanceTimersByTime(DEFAULT_MODEL_LIMITS.fetchTimeoutMs);
            assert.strictEqual((await stalled).code, "E_MODEL_FETCH");
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("following a redirect", () => {
    const glb = fixture("glb", "cube.glb");
    const FROM = "https://models.example.com/kit/cube.glb";
    const CDN = "https://cdn.example.net/kit/cube.glb";

    it("reads an answer from the same host, and from another host when no gate asks", async () => {
        const asked = serve({ [FROM]: { bytes: glb, redirectedTo: "https://models.example.com/v2/cube.glb" } });
        assert.strictEqual((await fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS)).main, "cube.glb");
        serve({ [FROM]: { bytes: glb, redirectedTo: CDN } });
        assert.strictEqual((await fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS)).main, "cube.glb");
        assert.strictEqual(
            (await fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS, undefined, () => undefined)).main,
            "cube.glb",
            "a gate with nothing to ask reads the answer",
        );
        assert.deepStrictEqual(asked, [FROM]);
    });

    it("fetches the other host's address once the gate allows it, and refuses with the gate's fact", async () => {
        const asked = serve({ [FROM]: { bytes: glb, redirectedTo: CDN }, [CDN]: { bytes: glb } });
        const heard: string[] = [];
        const allow = (from: URL, to: URL) => {
            heard.push(`${from.host} -> ${to.host}`);
            return Promise.resolve(undefined);
        };
        const fetched = await fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS, undefined, allow);
        assert.strictEqual(fetched.given.get("cube.glb")?.length, glb.length);
        assert.deepStrictEqual(asked, [FROM, CDN]);
        assert.deepStrictEqual(heard, ["models.example.com -> cdn.example.net"]);

        const declined = { code: "E_MODEL_URL_BLOCKED", params: { hosts: ["cdn.example.net"], declined: true } };
        const error = await refusal(
            fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS, undefined, () => Promise.resolve(declined)),
        );
        assert.deepStrictEqual(error.fact, declined);
    });

    it("refuses a redirect to another scheme, and a fifth redirect to another host", async () => {
        serve({ [FROM]: { bytes: glb, redirectedTo: "ftp://files.example.com/cube.glb" } });
        assert.deepStrictEqual((await refusal(fetchModelSet(new URL(FROM), DEFAULT_MODEL_LIMITS))).fact, {
            code: "E_MODEL_URL_BLOCKED",
            params: { hosts: ["files.example.com"], scheme: "ftp:", redirected: true },
        });

        const hop = (n: number): string => `https://h${String(n)}.example.com/cube.glb`;
        const asked = serve(
            Object.fromEntries(Array.from({ length: 6 }, (_, n) => [hop(n), { bytes: glb, redirectedTo: hop(n + 1) }])),
        );
        const error = await refusal(
            fetchModelSet(new URL(hop(0)), DEFAULT_MODEL_LIMITS, undefined, () => Promise.resolve(undefined)),
        );
        assert.deepStrictEqual(error.fact, {
            code: "E_MODEL_FETCH",
            params: { url: hop(4), status: "redirect", offline: false },
        });
        assert.deepStrictEqual(asked, [0, 1, 2, 3, 4].map(hop));
    });

    it("returns a fetched zip with no main file, and a fetched picture as its own main file", async () => {
        const zip = zipSync({ "cube.glb": glb });
        serve({
            "https://models.example.com/kit.zip": { bytes: zip },
            "https://models.example.com/cube.png": {
                bytes: fixture("gltf-textured", "cube.png"),
            },
        });
        const zipped = await fetchModelSet(new URL("https://models.example.com/kit.zip"), DEFAULT_MODEL_LIMITS);
        assert.isUndefined(zipped.main);
        assert.deepStrictEqual([...zipped.given.keys()], ["kit.zip"]);
        const picture = await fetchModelSet(new URL("https://models.example.com/cube.png"), DEFAULT_MODEL_LIMITS);
        assert.strictEqual(picture.main, "cube.png");
    });
});

describe("telling a web page from a model", () => {
    const text = (value: string): Uint8Array => new TextEncoder().encode(value);

    it("finds a page after a byte order mark, but not after 1,024 bytes of white space", () => {
        assert.isTrue(isWebPage(new Uint8Array([0xef, 0xbb, 0xbf, ...text("<HTML><body></body></HTML>")])));
        assert.isTrue(isWebPage(text("\t\r\n<head>")));
        assert.isFalse(isWebPage(text(`${" ".repeat(1024)}<html>`)));
        assert.isFalse(isWebPage(text("solid cube\n<html>")));
        assert.isFalse(isWebPage(fixture("gltf-textured", "cube.png")));
    });

    it("knows Sketchfab, Poly Pizza and GitLab pages by their address alone", () => {
        const known = (address: string): boolean => isKnownWebPage(new URL(address));
        assert.isTrue(known("https://www.sketchfab.com/3d-models/robot-1234"));
        assert.isTrue(known("https://poly.pizza/m/abc"));
        assert.isTrue(known("https://www.poly.pizza/m/abc"));
        assert.isTrue(known("https://gitlab.com/group/proj/-/blob/main/a.glb"));
        assert.isFalse(known("https://sketchfab.com/models/robot.glb"));
        assert.isFalse(known("https://poly.pizza/u/someone"));
        assert.isFalse(known("https://github.com/owner/repo/raw/main/a.glb"));
    });

    it("names the raw file behind a GitLab page, and the part that answered with a page", () => {
        assert.deepStrictEqual(
            webPageParams(new URL("https://gitlab.com/group/proj/-/blob/main/m/a.glb?ref=x"), "a.png"),
            {
                url: "https://gitlab.com/group/proj/-/blob/main/m/a.glb",
                host: "gitlab.com",
                part: "a.png",
                suggested: "https://gitlab.com/group/proj/-/raw/main/m/a.glb",
            },
        );
        assert.deepStrictEqual(webPageParams(new URL("https://www.sketchfab.com/3d-models/robot")), {
            url: "https://www.sketchfab.com/3d-models/robot",
            host: "www.sketchfab.com",
        });
    });
});

describe("reading and choosing in unusual sets", () => {
    const glb = fixture("glb", "cube.glb");
    const obj = (): Map<string, Uint8Array> =>
        new Map([
            ["cube.obj", fixture("obj-mtl-png", "cube.obj")],
            ["cube.mtl", fixture("obj-mtl-png", "cube.mtl")],
        ]);

    it("reads an array-like list of Files, refuses an empty path, and keeps a main named inside the folder", async () => {
        const read = await readModelFiles({ length: 1, 0: file("a.glb", glb) }, DEFAULT_MODEL_LIMITS);
        assert.deepStrictEqual([...read.given.keys()], ["a.glb"]);
        const empty = await refusal(readModelFiles({ files: new Map([["", glb]]) }, DEFAULT_MODEL_LIMITS));
        assert.deepStrictEqual(empty.fact.params, { rule: "path", name: "" });
        const inside = await readModelFiles(
            {
                files: new Map([
                    ["pack/a.glb", glb],
                    ["pack/b.glb", glb],
                ]),
                main: "b.glb",
            },
            DEFAULT_MODEL_LIMITS,
        );
        assert.strictEqual(inside.main, "b.glb");
    });

    it("takes the one file of a set as the forced format, and refuses a named main of no format", async () => {
        const unknown = new Map([["scan", new Uint8Array([1, 2, 3, 4])]]);
        assert.strictEqual(mainFileOf(unknown, { format: "stl" }), "scan");
        assert.isUndefined(mainFileOf(unknown, {}));
        const notes = new Map([["notes.txt", new TextEncoder().encode("hello")]]);
        assert.deepStrictEqual(
            (await refusal(checkModelFiles(notes, { main: "notes.txt" }, DEFAULT_MODEL_LIMITS))).fact,
            { code: "E_MODEL_FORMAT_UNKNOWN", params: { fileName: "notes.txt" } },
        );
    });

    it("lists at most 64 candidates for an ambiguous set, and counts the rest", async () => {
        const many = new Map(Array.from({ length: 70 }, (_, i) => [`m${String(i).padStart(2, "0")}.glb`, glb]));
        const { params } = (await refusal(checkModelFiles(many, {}, DEFAULT_MODEL_LIMITS))).fact;
        assert.lengthOf(params.candidates as string[], 64);
        assert.strictEqual(params.more, 6);
    });

    it("lists a picture found elsewhere as substituted, and one found twice as ambiguous", () => {
        const elsewhere = obj().set("maps/cube.png", fixture("obj-mtl-png", "cube.png"));
        const parts = listParts(elsewhere, {}, DEFAULT_MODEL_LIMITS);
        assert.deepInclude(
            parts?.find((p) => p.name === "cube.png"),
            { state: "substituted", file: "maps/cube.png" },
        );
        const twice = obj()
            .set("a/cube.png", fixture("obj-mtl-png", "cube.png"))
            .set("b/cube.png", fixture("obj-mtl-png", "cube.png"));
        const states = (listParts(twice, {}, DEFAULT_MODEL_LIMITS) ?? []).map((p) => [p.name, p.state]);
        assert.deepInclude(states, ["cube.png", "ambiguous"]);
        assert.isUndefined(listParts(new Map([["notes.txt", new Uint8Array(4)]]), {}, DEFAULT_MODEL_LIMITS));
    });

    it("lists a glTF that does not parse as a model of its own file, with no parts", () => {
        const broken = new Map([
            ["bad.gltf", new TextEncoder().encode("{ not json")],
            ["cube.bin", new Uint8Array(8)],
        ]);
        assert.deepStrictEqual(listModels(broken, DEFAULT_MODEL_LIMITS), [
            { main: "bad.gltf", format: "gltf", files: ["bad.gltf"] },
        ]);
        assert.deepStrictEqual(
            listParts(broken, {}, DEFAULT_MODEL_LIMITS)?.map((p) => [p.name, p.state]),
            [
                ["bad.gltf", "found"],
                ["cube.bin", "unused"],
            ],
        );
    });
});
