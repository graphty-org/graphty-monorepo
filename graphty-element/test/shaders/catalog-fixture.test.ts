/**
 * @file The element's shader and transition presets, as the catalog lists them
 * (design/rendering/shader-styles.md sections 7 and 8, package I1).
 *
 * Every preset the design ships is listed once, under a unique bare id, with catalog facts the
 * same checker a registered shader meets accepts, a body that passes the static checks and a
 * thumbnail that is a real image. Listing them loads no GLSL: the bodies arrive only through the
 * lazy `bodies.ts`.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { assert, describe, it } from "vitest";

import { checkShaderBody } from "../../src/catalog/shaderGlsl";
import { shaderDescriptors } from "../../src/catalog/shaderRegistry";
import { drawingOf } from "../../src/catalog/shaders";
import { readShaderDescriptor } from "../../src/catalog/shaderText";
import { createGraphSession } from "../../src/session";
import { SHADER_PRESETS } from "../../src/shaders/presets";
import { SHADER_PRESET_BODIES, SHADER_PRESET_LOW_DETAIL } from "../../src/shaders/presets/bodies";
import { TRANSITION_PRESETS } from "../../src/transitions/presets";
import { transitionDescriptors } from "../../src/transitions/registry";

/** The 31 shader presets of design section 7, by id. */
const PLANNED_SHADERS = [
    // 7.1 node surfaces
    "matcap-ink",
    "pearl",
    "cel-shade",
    "halftone",
    "glass-marble",
    "gemstone",
    "disco-ball",
    "lantern",
    "glass",
    "colorblind-patterns",
    "foil-shimmer",
    "hologram",
    "frost",
    "frosted-glass",
    "liquid-metal",
    "anodized-steel",
    // 7.2 node sprites
    "icon-sticker",
    "mandala",
    // 7.3 node effects
    "uncertainty-aura",
    "lock-on-reticle",
    "orbiting-satellites",
    "shockwave",
    "change-flash",
    // 7.4 edges
    "fiber-optic",
    "fiber-packets",
    "comet-tracers",
    "neon-line",
    "edge-change",
    // 7.5 scene
    "nebula",
    "soap-bubble",
    "metaball-hull",
];

/** The 7 transition presets of design section 7.6, by id. */
const PLANNED_TRANSITIONS = [
    "glide",
    "staggered-glide",
    "arc-move",
    "swirl",
    "fade-through",
    "collapse-bloom",
    "particle-morph",
];

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The file signature of a thumbnail's bytes.
 * @param bytes - The image file.
 * @returns "webp", "png", "jpeg", or undefined for anything else.
 */
function imageType(bytes: Uint8Array): string | undefined {
    const ascii = (from: number, to: number): string => String.fromCharCode(...bytes.subarray(from, to));
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
        return "webp";
    }

    if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") {
        return "png";
    }

    return bytes[0] === 0xff && bytes[1] === 0xd8 ? "jpeg" : undefined;
}

/**
 * Load a thumbnail URL the way a page would: a data URL decodes, a file URL reads from disk.
 * @param url - The descriptor's thumbnail.
 * @returns The image's bytes, or undefined when nothing answers.
 */
function loadThumbnail(url: string): Uint8Array | undefined {
    if (url.startsWith("data:")) {
        const comma = url.indexOf(",");
        return comma < 0 ? undefined : Buffer.from(url.slice(comma + 1), "base64");
    }

    if (url.startsWith("file:")) {
        const path = fileURLToPath(url);
        return existsSync(path) ? readFileSync(path) : undefined;
    }

    // In the browser project a module URL is served by the dev server.
    return undefined;
}

/**
 * Every source file `entry` reaches through static imports and re-exports, which is what a page
 * loads when it imports the entry; a dynamic `import()` is not followed, because it loads only
 * when called.
 * @param entry - The entry file, relative to the package root.
 * @returns The absolute paths reached.
 */
function staticImportGraph(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [resolve(PACKAGE_ROOT, entry)];
    while (queue.length > 0) {
        const file = queue.pop();
        if (file === undefined || seen.has(file)) {
            continue;
        }

        seen.add(file);
        const emitted = ts.transpileModule(readFileSync(file, "utf8"), {
            fileName: file,
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true },
        }).outputText;
        const source = ts.createSourceFile(file, emitted, ts.ScriptTarget.ES2022);
        for (const statement of source.statements) {
            const specifier =
                (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
                statement.moduleSpecifier !== undefined &&
                ts.isStringLiteral(statement.moduleSpecifier)
                    ? statement.moduleSpecifier.text
                    : undefined;
            if (specifier?.startsWith(".") !== true) {
                continue;
            }

            const base = resolve(dirname(file), specifier.replace(/\.js$/, ""));
            const next = [`${base}.ts`, resolve(base, "index.ts"), base].find((candidate) => existsSync(candidate));
            if (next !== undefined && next.endsWith(".ts")) {
                queue.push(next);
            }
        }
    }

    return seen;
}

describe("the shader presets", () => {
    const ids = SHADER_PRESETS.map((preset) => preset.id);

    it("lists each preset once, under an id the design ships", () => {
        assert.strictEqual(new Set(ids).size, ids.length, "a preset id is listed twice");
        assert.deepEqual(
            ids.filter((id) => !PLANNED_SHADERS.includes(id)),
            [],
        );
    });

    it("lists all 31 presets, the same list the catalog shows", () => {
        assert.sameMembers(ids, PLANNED_SHADERS);
        assert.deepEqual(
            createGraphSession()
                .catalog.shaders()
                .map((descriptor) => descriptor.id),
            ids,
        );
    });

    it("has a body for exactly the listed presets", () => {
        assert.sameMembers(Object.keys(SHADER_PRESET_BODIES), ids);
    });

    // The registry hands every heavy node look a low-detail loader, so the two lists must agree.
    it("has a small-size program for exactly the heavy node looks", () => {
        const heavy = SHADER_PRESETS.filter((preset) => preset.cost === "heavy" && drawingOf(preset) === "node-paint");
        assert.sameMembers(
            heavy.map((preset) => preset.id),
            Object.keys(SHADER_PRESET_LOW_DETAIL),
        );
    });

    it("lists the presets first in the catalog", () => {
        assert.deepEqual(
            shaderDescriptors()
                .slice(0, ids.length)
                .map((descriptor) => descriptor.id),
            ids,
        );
    });

    it.each(SHADER_PRESETS.map((preset) => [preset.id, preset] as const))(
        "%s: catalog facts the shader checker accepts, a body that passes and a thumbnail that loads",
        async (id, preset) => {
            assert.strictEqual(preset.origin, "element");
            assert.isTrue(Object.isFrozen(preset), "a preset descriptor is frozen");

            const { origin: _origin, cost: _cost, reads: _reads, webgpu: _webgpu, thumbnail, ...facts } = preset;
            const read = readShaderDescriptor({ ...facts }, "plainName", false);
            assert.isFalse(Array.isArray(read), JSON.stringify(read));

            assert.isAtMost(preset.params.filter((param) => param.primary === true).length, 1, "more than one primary");
            assert.isAtMost(preset.params.filter((param) => param.varies === true).length, 4, "more than 4 varying");

            const body = await SHADER_PRESET_BODIES[id]();
            const checked = checkShaderBody(body, drawingOf(preset));
            assert.deepEqual(checked.problems, []);
            if (Object.hasOwn(SHADER_PRESET_LOW_DETAIL, id)) {
                assert.deepEqual(checkShaderBody(await SHADER_PRESET_LOW_DETAIL[id](), drawingOf(preset)).problems, []);
            }

            assert.isString(thumbnail, "a preset ships a thumbnail");
            const bytes = loadThumbnail(thumbnail ?? "");
            assert.isDefined(bytes, `the thumbnail ${String(thumbnail).slice(0, 80)} does not load`);
            assert.isDefined(imageType(bytes ?? new Uint8Array()), "the thumbnail is not a webp, png or jpeg");
        },
    );

    // `./session` is where `catalog.shaders()` is read; `./catalog` carries the shader types and the
    // text checker. Neither may reach a body, the GLSL runtime or a shader file.
    it.each(["catalog.ts", "session.ts"])("%s loads no GLSL", (entry) => {
        const reached = [...staticImportGraph(entry)].map((file) => file.replace(PACKAGE_ROOT, ""));
        if (entry === "session.ts") {
            assert.include(reached, "src/shaders/presets/index.ts", "the walk found the preset list");
        }

        assert.deepEqual(
            reached.filter(
                (file) =>
                    file.endsWith("/body.ts") ||
                    file.endsWith("presets/bodies.ts") ||
                    /\.(fx|glsl)$/.test(file) ||
                    file.startsWith("src/shaders/runtime/"),
            ),
            [],
        );
    });
});

describe("the transition presets", () => {
    const ids = TRANSITION_PRESETS.map((preset) => preset.descriptor.id);

    it("lists each preset once, under an id the design ships", () => {
        assert.strictEqual(new Set(ids).size, ids.length, "a preset id is listed twice");
        assert.deepEqual(
            ids.filter((id) => !PLANNED_TRANSITIONS.includes(id)),
            [],
        );
    });

    it("lists all 7 presets, the same list the catalog shows", () => {
        assert.sameMembers(ids, PLANNED_TRANSITIONS);
        assert.deepEqual(
            transitionDescriptors().map((descriptor) => descriptor.id),
            ids,
        );
        assert.deepEqual(
            createGraphSession()
                .catalog.transitions()
                .map((descriptor) => descriptor.id),
            ids,
        );
    });
});
