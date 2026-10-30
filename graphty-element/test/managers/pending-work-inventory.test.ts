/**
 * @file The inventory of asynchronous work in graphty-element's source, against the record of
 * pending picture work (src/managers/PendingWork.ts, issue #3546).
 *
 * "The picture is final" is only as good as the list of what it waits for. Every new asynchronous
 * source used to escape that list until a flaky test found it: a node's picture download, the
 * location map's module import and tiles. So every asynchronous entry point in `src/` -- a
 * dynamic `import()`, a `fetch`, an image or texture load, a model load, a decoded bitmap, a font,
 * an animation frame callback -- is listed here, per file, with how the record covers it:
 *
 * - `kind`: the work is entered in the record under this kind (a token or a watch), so a frame is
 *   not called final while it runs. The test checks that something in `src/` enters that kind.
 * - no `kind`: the work never changes the canvas (a screenshot's own image, an AI provider, a
 *   probe that returns a fact), and `reason` says so.
 *
 * A new entry point fails this test, naming its file, until it is either entered in the record or
 * explained here. Keep `count` exact: a second fetch in a file whose first is covered is a new
 * source, and has to be looked at.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The asynchronous entry points: a dynamic `import()` of a module (not `typeof import(...)` or
 * `import(...).Type` in a type), `fetch`, an `Image`, an `onload`, a decoded bitmap, an animation frame, a model or
 * texture load, and a font.
 */
const ENTRY =
    /(?<!typeof\s*)(?<![.\w])import\(\s*["'`][^"'`]*["'`]\s*\)(?!\s*\.(?!then\b))|new Image\(|createImageBitmap\(|\bfetch\(|\.onload\b|requestAnimationFrame\(|ImportMeshAsync|LoadAssetContainerAsync|SceneLoader\.|new Texture\(|new FontFace\(|document\.fonts/g;

/** How a file's asynchronous work is covered. */
interface Covered {
    /** How many entry points the file has. */
    count: number;
    /** The kind the work is entered under in the record, or absent when it never draws. */
    kind?: string;
    /** Why this is the right answer. */
    reason: string;
}

const INVENTORY: Record<string, Covered> = {
    "src/Graph.ts": {
        count: 11,
        kind: "load",
        reason:
            "format detection and a URL's download run inside a load that holds a place in the load line; " +
            "the rest (screenshot capability, video capture and estimation, AI, the XR camera) draw nothing " +
            "of the graph's picture, or run during an immersive session, when the picture is never final",
    },
    "src/graphty-element.ts": {
        count: 2,
        reason: "the element's first render waits two animation frames; it waits, it draws nothing itself",
    },
    "src/session/data.ts": {
        count: 11,
        kind: "load",
        reason:
            "a load's module import and read hold a place in the load line until its step dispatches; " +
            "test, list, preview and check read a source and draw nothing",
    },
    "src/data/DataSource.ts": { count: 2, kind: "load", reason: "a data source's download, inside a load" },
    "src/data/source-bytes.ts": { count: 1, kind: "load", reason: "a source's download, inside a load" },
    "src/session/assets/unzip.ts": { count: 1, kind: "load", reason: "unzipping a file being loaded" },
    "src/session/assets/AssetsApi.ts": {
        count: 3,
        kind: "model",
        reason:
            "an asset read for a model or a picture; the model and picture caches hold the frame until it is on " +
            "its nodes (the intake and samples modules draw nothing)",
    },
    "src/models/loadModel.ts": { count: 2, kind: "model", reason: "a model's loader chunk and text formats" },
    "src/models/chunk.ts": { count: 2, kind: "model", reason: "a model's asset container load" },
    "src/models/TextureCache.ts": { count: 1, kind: "picture", reason: "a node's picture decoded into a texture" },
    "src/meshes/AnnotationMeshes.ts": {
        count: 3,
        kind: "picture",
        reason: "a file's picture annotation, painted onto its texture when the image arrives",
    },
    "src/meshes/EdgeMesh.ts": {
        count: 1,
        kind: "shader",
        reason: "a line pattern texture; a mesh whose texture is loading is not ready, which holds the frame",
    },
    "src/meshes/NodeDecorationMesh.ts": {
        count: 1,
        kind: "shader",
        reason: "a decoration's texture; a mesh whose texture is loading is not ready, which holds the frame",
    },
    "src/managers/BasemapManager.ts": {
        count: 3,
        kind: "basemap",
        reason: "the map's module import, and the frames it asks for until every shown tile is drawn",
    },
    "src/layout/LocationMapLayoutEngine.ts": {
        count: 1,
        kind: "layout",
        reason: "the placement module, loaded inside the layout's run; the layout is unsettled until it answers",
    },
    "src/layout/locationMap/gazetteer.ts": {
        count: 1,
        kind: "layout",
        reason: "place names read inside the location map layout's run",
    },
    "src/layout/GraphvizLayoutEngine.ts": {
        count: 2,
        kind: "layout",
        reason: "Graphviz and graph-io's DOT reader, loaded inside the layout's run",
    },
    "src/layout/FixedLayoutEngine.ts": {
        count: 1,
        kind: "layout",
        reason: "Graphviz edge routing, loaded inside the layout's run",
    },
    "src/layout/graphviz/availability.ts": {
        count: 1,
        reason: "a probe that returns whether Graphviz can run; it draws nothing",
    },
    "src/session/time/TimeApi.ts": {
        count: 3,
        kind: "style",
        reason:
            "timeline playback started by the reader, like a drag; each step it writes is repainted, and a " +
            "repaint holds the frame",
    },
    "src/managers/InputManager.ts": {
        count: 1,
        reason: "an input recording read for playback; the input it replays moves the camera like a reader",
    },
    "src/Styles.ts": {
        count: 1,
        reason: "Styles.fromUrl builds a style object for its caller, who hands it to the graph; it draws nothing",
    },
    "src/screenshot/ScreenshotCapture.ts": {
        count: 5,
        reason: "a screenshot's own images, composed after the frame was drawn; they never reach the canvas",
    },
    "src/screenshot/drawLegend.ts": {
        count: 1,
        reason: "the legend drawn into a screenshot, never onto the canvas",
    },
    "src/ai/commands/CaptureCommands.ts": {
        count: 1,
        reason: "a capture read back for the AI; it never reaches the canvas",
    },
    "src/ai/providers/index.ts": { count: 2, reason: "an AI provider's module; it draws nothing" },
    "src/ai/providers/WebLlmProvider.ts": {
        count: 3,
        reason: "the in-browser model's module and the AI SDK it converts tools with; it draws nothing",
    },
    "src/ai/providers/VercelAiProvider.ts": {
        count: 4,
        reason: "the AI SDK and its three provider packages, optional peers; they draw nothing",
    },
    "src/ai/keys/encryptStorage.ts": {
        count: 1,
        reason: "encrypt-storage, the optional peer that persists API keys; it draws nothing",
    },
    "src/layout/graphviz/loader.ts": {
        count: 1,
        reason: "the Graphviz package, loaded inside the layout Worker; the layout's own run is what draws",
    },
    "src/shaders/chunk.ts": { count: 1, kind: "shader", reason: "the shader runtime, loaded the first time one draws" },
    "src/meshes/NodeShaderDrawing.ts": {
        count: 3,
        kind: "shader",
        reason: "the node shader renderer modules, loaded inside the token a resolving node shader holds",
    },
    "src/meshes/EdgeShaderDrawing.ts": {
        count: 1,
        kind: "shader",
        reason: "the edge shader renderer module, loaded inside the token a resolving edge shader holds",
    },
    "src/managers/RenderManager.ts": {
        count: 3,
        kind: "shader",
        reason: "the background, group outline and bloom passes a shader names, each loaded under a token",
    },
    "src/catalog/shaderRegistry.ts": {
        count: 2,
        kind: "shader",
        reason:
            "a built-in shader's text, read by the session when a shader resolves for drawing, inside the token " +
            "the resolving drawing holds; read for editing it draws nothing",
    },
    "src/shaders/presets/bodies.ts": {
        count: 35,
        kind: "shader",
        reason: "each built-in shader's text, loaded through shaderRegistry; see that row",
    },
    "src/session/shaders.ts": {
        count: 1,
        reason: "a shader's thumbnail for a picker, fetched for the application; never drawn on the canvas",
    },
    "src/xr/XRSessionManager.ts": {
        count: 2,
        reason: "an immersive session's module; while one runs the picture moves with the head and is never final",
    },
};

/**
 * Every TypeScript source file under a directory.
 * @param dir - The directory.
 * @returns The paths.
 */
function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            return sources(path);
        }

        return name.endsWith(".ts") && !name.endsWith(".d.ts") ? [path] : [];
    });
}

/**
 * A file's source with its comments blanked, so prose that names `fetch(` is not counted.
 * @param text - The source.
 * @returns The code.
 */
function code(text: string): string {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

const files = sources(join(ROOT, "src"));
const found = new Map<string, number>();
let entered = "";
for (const path of files) {
    const text = readFileSync(path, "utf8");
    const count = code(text).match(ENTRY)?.length ?? 0;
    if (count > 0) {
        found.set(relative(ROOT, path).replaceAll("\\", "/"), count);
    }

    entered += text;
}

/** Every kind something in `src/` enters in the record, as a token or a watch. */
const KINDS = new Set([...entered.matchAll(/\.(?:watch|begin|track)\(\s*"([\w-]+)"/g)].map((m) => m[1]));

describe("every asynchronous source is in the record of pending picture work", () => {
    it("finds the entry points it looks for", () => {
        // A scanner that matched nothing would pass everything.
        assert.isAtLeast(found.size, 20);
        assert.include([...KINDS], "layout");
        assert.include([...KINDS], "basemap");
    });

    it("lists every file with an asynchronous entry point, with its exact count", () => {
        const problems: string[] = [];
        for (const [file, count] of found) {
            const listed = INVENTORY[file] as Covered | undefined;
            if (listed === undefined) {
                problems.push(
                    `${file}: ${String(count)} asynchronous entry point(s) not in the inventory. Enter the work in ` +
                        "UpdateManager.pending (begin/track/watch) if it changes the canvas, then list the file here " +
                        "with its kind; or list it with the reason it never draws.",
                );
            } else if (listed.count !== count) {
                problems.push(
                    `${file}: ${String(count)} asynchronous entry point(s), the inventory says ${String(listed.count)}. ` +
                        "Look at the new one: is it covered by the same kind, or does it need its own?",
                );
            }
        }

        for (const file of Object.keys(INVENTORY)) {
            if (!found.has(file)) {
                problems.push(`${file}: listed, but has no asynchronous entry point any more; remove its row`);
            }
        }

        assert.deepEqual(problems, []);
    });

    it("names only kinds the record has, and a reason for each", () => {
        for (const [file, listed] of Object.entries(INVENTORY)) {
            assert.isAtLeast(listed.reason.length, 20, `${file}: say why`);
            if (listed.kind !== undefined) {
                assert.isTrue(KINDS.has(listed.kind), `${file}: nothing in src/ enters the kind "${listed.kind}"`);
            }
        }
    });
});
