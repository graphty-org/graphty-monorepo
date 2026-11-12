/**
 * @file A project's shaders are its own: uses, encode keys and the background resolve against
 * the project only, a write naming a catalog shader copies its text into the project in the same
 * undoable step, and whether a shader is a copy of a preset and whether it is trusted are decided
 * by its content hash, never by its id (design/architecture/self-contained-save-files.md,
 * sections 1.2, 1.3, 1.5 and 1.6). No canvas: the static checks only.
 */

import { assert, describe, it, vi } from "vitest";

import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { clearRegisteredShadersForTesting, registerShader } from "../../src/catalog/shaderRegistry";
import type { LayerSpec, StyleDocument } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { shaderIdsIn } from "../../src/session/commands/shaderCopies";
import { shaderContentHash } from "../../src/session/shaders";

/** A node look with one parameter, under a namespaced id. */
const TINT = `/* graphty-shader 1
{
    "id": "user/tint",
    "name": "Tint",
    "place": "paint",
    "params": [{ "name": "amount", "type": "number", "default": 0.5, "min": 0, "max": 1, "varies": true }]
}
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * amount, n.color.a);
}
`;

/** A node layer. */
const MARBLES: LayerSpec = {
    name: "Marbles",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#3366cc" },
};

/**
 * A session with one node and one layer.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    const created = createGraphSession();
    await created.data.addNodes([{ id: "a" }]);
    return created;
}

/**
 * A style document carrying one shader under an id, with a layer naming it.
 * @param id - The id in the document.
 * @param text - The text it carries.
 * @returns The document.
 */
function documentNaming(id: string, text: string): StyleDocument {
    return {
        version: 1,
        layers: [{ ...MARBLES, name: "Shaded", set: { "node.shaders": [{ shader: id }] } }],
        shaders: [{ id, text }],
    };
}

/**
 * A text with its header's id replaced.
 * @param text - The text.
 * @param id - The new id.
 * @returns The text.
 */
function withId(text: string, id: string): string {
    return text.replace(/("id"\s*:\s*)"[^"]*"/, `$1"${id}"`);
}

describe("a project's shaders are its own", () => {
    it("hashes content with the header's id left out", () => {
        assert.strictEqual(shaderContentHash(TINT), shaderContentHash(withId(TINT, "user/other")));
        assert.notStrictEqual(shaderContentHash(TINT), shaderContentHash(TINT.replace("0.5", "0.25")));
    });

    it("copies a preset a layer write names into the project, in the write's own undoable step", async () => {
        const s = await session();
        const steps = s.history.steps.length;
        const layer = await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl" }] } });
        assert.strictEqual(s.history.steps.length, steps + 1);

        const [copy] = s.shaders.list();
        assert.strictEqual(copy.id, "pearl");
        // Trusted by its content hash, which is on the shipped list.
        assert.strictEqual(copy.state, "not-checked");
        assert.strictEqual(s.shaders.describe("pearl")?.copyOf, "pearl");
        // One catalog entry per id: the project's copy replaces the preset's.
        const listed = s.catalog.shaders().filter((entry) => entry.id === "pearl");
        assert.deepEqual(
            listed.map((entry) => [entry.origin, entry.copyOf]),
            [["pasted", "pearl"]],
        );
        const saved = s.styles.toDocument().shaders ?? [];
        assert.deepEqual(
            saved.map((entry) => entry.id),
            ["pearl"],
        );
        assert.include(saved[0].text, "graphty-shader 1");
        assert.strictEqual(saved[0].text, await s.shaders.source("pearl"));

        await s.undo();
        assert.lengthOf(s.shaders.list(), 0);
        assert.isUndefined(s.styles.get(layer.id));
    });

    it("finds every id a write names: uses (off too), encode keys and the background's look", () => {
        const named = shaderIdsIn({
            spec: {
                set: { "node.shaders": [{ shader: "pearl", off: true }], "edge.shaders": [{ shader: "user/flow" }] },
                encode: { "node.shaders.user/tint.amount": { run: "degree" } },
                userData: { "node.shaders": [{ shader: "ignored" }] },
            },
            values: { background: { shader: { id: "nebula" } } },
        });
        assert.deepEqual([...named].sort(), ["nebula", "pearl", "user/flow", "user/tint"]);
    });

    it("copies a preset an off use names, and one a background names", async () => {
        const s = await session();
        await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl", off: true }] } });
        assert.isTrue(s.shaders.list().some((entry) => entry.id === "pearl"));

        const background = s.catalog
            .shaders()
            .find((entry) => entry.origin === "element" && entry.target === "background");
        assert.isDefined(background);
        const id = await s.shaders.fromCatalog(background?.id ?? "");
        await s.config.set({ background: { backgroundType: "color", shader: { id } } });
        assert.isTrue(s.shaders.list().some((entry) => entry.id === id));
    });

    it("opens a file saved before files carried shaders with the presets it named by id", async () => {
        const saved = await session();
        await saved.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl" }] } });
        const file = JSON.parse((await saved.project.save()).text) as unknown;
        // Take the carried text out, as an old file that named a built-in by id would be.
        const strip = (value: unknown): void => {
            if (typeof value === "object" && value !== null) {
                const record = value as Record<string, unknown>;
                if (Array.isArray(record.shaders) && record.shaders.some((entry) => typeof entry === "object")) {
                    delete record.shaders;
                }

                Object.values(record).forEach(strip);
            }
        };
        strip(file);

        const opened = createGraphSession();
        const report = await opened.project.open(JSON.stringify(file));
        // The id meant the catalog's shader when the file was saved: its text is copied in, trusted.
        const [layer] = opened.styles.list().filter((each) => each.name === "Marbles");
        assert.deepEqual(
            report.problems.filter((problem) => problem.code === "shader.unknown"),
            [],
        );
        assert.deepEqual(layer.set, { "node.shaders": [{ shader: "pearl" }] });
        assert.deepEqual(
            opened.shaders.list().map((entry) => [entry.id, entry.state]),
            [["pearl", "not-checked"]],
        );
        // Saved again, the file carries it.
        assert.deepEqual(
            opened.styles.toDocument().shaders?.map((entry) => entry.id),
            ["pearl"],
        );
    });

    it("trusts a preset's text under any id, and says which preset it is a copy of", async () => {
        const s = await session();
        const pearl = await s.shaders.source("pearl");
        const report = await s.styles.applyTemplate(documentNaming("shiny", withId(pearl, "shiny")));
        assert.deepEqual(report.shaders, []);
        assert.strictEqual(s.shaders.status("shiny").state, "not-checked");
        assert.strictEqual(s.shaders.describe("shiny")?.copyOf, "pearl");
        // A gallery pick of the preset reuses the project's copy, whatever its id.
        assert.strictEqual(await s.shaders.fromCatalog("pearl"), "shiny");
    });

    it("holds foreign text under pearl, never calls it a copy, and gives a gallery pick a fresh id", async () => {
        const s = await session();
        const report = await s.styles.applyTemplate(documentNaming("pearl", withId(TINT, "pearl")));
        assert.deepEqual(report.shaders, [{ code: "shader.held", params: { ids: ["pearl"] } }]);
        assert.strictEqual(s.shaders.status("pearl").state, "held");
        assert.isUndefined(s.shaders.describe("pearl")?.copyOf);

        const picked = await s.shaders.fromCatalog("pearl");
        assert.notStrictEqual(picked, "pearl");
        assert.strictEqual(s.shaders.describe(picked)?.copyOf, "pearl");
        assert.strictEqual(s.shaders.status(picked).state, "not-checked");
    });

    it("with refuse, runs only trusted text and keeps the rest held, so a save carries it", async () => {
        const s = await session();
        const pearl = await s.shaders.source("pearl");
        await s.styles.applyTemplate(
            {
                version: 1,
                layers: [{ ...MARBLES, set: { "node.shaders": [{ shader: "shiny" }] } }],
                shaders: [
                    { id: "shiny", text: withId(pearl, "shiny") },
                    { id: "user/tint", text: TINT },
                ],
            },
            { shaders: "refuse" },
        );
        assert.deepEqual(
            s.shaders.list().map((entry) => [entry.id, entry.state === "held"]),
            [
                ["shiny", false],
                ["user/tint", true],
            ],
        );
    });

    it("with refuse, a save still carries the refused shader, so reopening keeps its use", async () => {
        const s = await session();
        await s.styles.applyTemplate(documentNaming("user/ring", withId(TINT, "user/ring")), { shaders: "refuse" });
        const saved = s.styles.toDocument();
        assert.deepEqual(
            saved.shaders?.map((entry) => entry.id),
            ["user/ring"],
        );
        assert.isEmpty(saved.problems ?? []);

        const t = await session();
        await t.styles.applyTemplate(saved);
        const [layer] = t.styles.list().filter((each) => each.name === "Shaded");
        assert.deepEqual(layer.set?.["node.shaders"], [{ shader: "user/ring" }]);
        s.dispose();
        t.dispose();
    });

    it("removes a preset copy when its last use goes, in the same undoable step", async () => {
        const s = await session();
        const pearl = await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl" }] } });
        await s.styles.add({ ...MARBLES, name: "Glass", set: { "node.shaders": [{ shader: "glass-marble" }] } });
        await s.styles.remove(pearl.id);
        assert.deepEqual(
            s.shaders.list().map((entry) => entry.id),
            ["glass-marble"],
        );

        await s.undo();
        assert.sameMembers(
            s.shaders.list().map((entry) => entry.id),
            ["pearl", "glass-marble"],
        );
        s.dispose();
    });

    it("refuses a preset copy that would take the project past 64 shaders", async () => {
        const s = await session();
        for (let at = 0; at < 64; at++) {
            const text = withId(TINT, `user/t${at}`).replace("0.5", `0.${String(at).padStart(2, "0")}1`);
            await s.shaders.add(text, { source: "content" });
        }

        assert.lengthOf(s.shaders.list(), 64);
        const refused = await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "gemstone" }] } }).then(
            () => undefined,
            (error: unknown) => error as { code?: string; details?: { code?: string } },
        );
        assert.strictEqual(refused?.code, "E_BAD_COMMAND");
        assert.strictEqual(refused?.details?.code, "shader.too-many");
        assert.lengthOf(s.shaders.list(), 64);
        s.dispose();
    });

    it("refuses to copy a registered shader that brings its own WGSL, with a code", async () => {
        registerShader({
            descriptor: { id: "acme/gpu", plainName: "Gpu", params: [], webgpu: "native" },
            glsl: "vec4 shade(NodeInput n) { return n.color; }",
            wgsl: "fn main() {}",
        });
        try {
            const s = await session();
            const refused = await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "acme/gpu" }] } }).then(
                () => undefined,
                (error: unknown) => error as { code?: string; details?: { code?: string } },
            );
            assert.strictEqual(refused?.code, "E_BAD_COMMAND");
            assert.strictEqual(refused?.details?.code, "shader.not-copyable");
            s.dispose();
        } finally {
            clearRegisteredShadersForTesting();
        }
    });

    it("holds a revoked hash with shader.revoked, even after approve", async () => {
        const revoked = shaderContentHash(TINT);
        vi.resetModules();
        vi.doMock("../../src/catalog/revoked-shader-hashes.json", () => ({ default: [revoked] }));
        try {
            const fresh = await import("../../src/session");
            const s = fresh.createGraphSession();
            await s.data.addNodes([{ id: "a" }]);
            await s.styles.applyTemplate(documentNaming("user/tint", TINT));
            await s.shaders.approve("user/tint");
            assert.deepEqual(s.shaders.status("user/tint"), {
                state: "held",
                problem: { code: "shader.revoked", params: { id: "user/tint" } },
            });
        } finally {
            vi.doUnmock("../../src/catalog/revoked-shader-hashes.json");
            vi.resetModules();
        }
    });
});

/**
 * A saved project as JSON, with its style member to hand.
 * @param s - The session.
 * @returns The file and its style member.
 */
async function savedFile(
    s: GraphSession,
): Promise<{ file: { members: Record<string, unknown>[] }; style: Record<string, unknown> }> {
    const file = JSON.parse((await s.project.save()).text) as { members: Record<string, unknown>[] };
    const style = file.members.find((member) => member.kind === "graphty-style") ?? {};
    return { file, style };
}

/**
 * The background preset the catalog lists first.
 * @param s - The session.
 * @returns Its id.
 */
function backgroundPreset(s: GraphSession): string {
    const found = s.catalog.shaders().find((entry) => entry.origin === "element" && entry.target === "background");
    assert.isDefined(found);
    return found?.id ?? "";
}

describe("every saved place carries the shader it names", () => {
    it("carries the shader of an off use, an encode key and the background, and reports nothing", async () => {
        const s = await session();
        await s.styles.add({
            ...MARBLES,
            set: { "node.shaders": [{ shader: "pearl", off: true }] },
        });
        await s.styles.applyTemplate({ version: 1, layers: [], shaders: [{ id: "user/tint", text: TINT }] });
        await s.styles.add({
            ...MARBLES,
            name: "Tinted",
            set: { "node.shaders": [{ shader: "user/tint" }] },
            encode: { "node.shaders.user/tint.amount": { by: "data.weight", scale: "linear", range: [0, 1] } },
        });
        const background = await s.shaders.fromCatalog(backgroundPreset(s));
        await s.config.set({ background: { backgroundType: "color", shader: { id: background } } });

        const document = s.styles.toDocument();
        assert.isUndefined(document.problems);
        assert.sameMembers(
            (document.shaders ?? []).map((entry) => entry.id),
            ["pearl", "user/tint", background],
        );
        const saved = await s.project.save();
        assert.deepEqual(saved.report.leftOut, []);
        assert.notInclude(saved.text, '"problems"');
    });

    it("reports a shader a layer names but the project does not hold as shader.not-saved", async () => {
        const s = await session();
        await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl" }] } });
        await s.shaders.remove("pearl");
        assert.deepEqual(s.styles.toDocument().problems, [{ code: "shader.not-saved", params: { id: "pearl" } }]);
        const saved = await s.project.save();
        assert.deepEqual(saved.report.leftOut, [{ code: "shader.not-saved", params: { id: "pearl" } }]);
    });

    it("reports the background's shader as not saved when the style member is left out", async () => {
        const s = await session();
        const background = await s.shaders.fromCatalog(backgroundPreset(s));
        await s.config.set({ background: { backgroundType: "color", shader: { id: background } } });
        const saved = await s.project.save({ leaveOut: ["graphty-style"] });
        assert.deepEqual(saved.report.leftOut, [{ code: "shader.not-saved", params: { id: background } }]);
    });

    it("opens the shaders before the settings, so a background shader resolves", async () => {
        const s = await session();
        const background = await s.shaders.fromCatalog(backgroundPreset(s));
        await s.config.set({ background: { backgroundType: "color", shader: { id: background } } });
        const opened = createGraphSession();
        const report = await opened.project.open((await s.project.save()).text);
        assert.deepEqual(report.problems, []);
        assert.strictEqual(opened.config.background.shader?.id, background);
    });

    it("keeps a background preset an older file named without carrying it", async () => {
        const s = await session();
        const background = await s.shaders.fromCatalog(backgroundPreset(s));
        await s.config.set({ background: { backgroundType: "color", color: "#102030", shader: { id: background } } });
        const { file, style } = await savedFile(s);
        delete style.shaders;
        const opened = createGraphSession();
        const report = await opened.project.open(JSON.stringify(file));
        assert.deepEqual(report.problems, []);
        assert.strictEqual(opened.config.background.shader?.id, background);
        assert.strictEqual(opened.config.background.color, "#102030");
    });

    it("sets a background preset on a fresh session without a gallery pick first", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }]);
        await s.config.set({ background: { backgroundType: "color", shader: { id: "nebula" } } });
        assert.deepEqual(
            s.shaders.list().map((entry) => entry.id),
            ["nebula"],
        );
    });

    it("drops a use an applied document neither carries nor the project holds, copying nothing", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }]);
        const report = await s.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "x",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "pearl" }] },
                },
            ],
        });
        assert.deepEqual(
            report.shaders?.map((fact) => [fact.code, fact.params.shader]),
            [["shader.unknown", "pearl"]],
        );
        assert.lengthOf(s.shaders.list(), 0);
    });

    it("binds a preset's parameter by encode on a fresh session", async () => {
        const s = createGraphSession();
        await s.data.addNodes([
            { id: "a", u: 0 },
            { id: "b", u: 1 },
        ]);
        const proposal = s.styles.proposeEncoding({
            column: { kind: "node", name: "u" },
            channel: "node.shaders.uncertainty-aura.intensity",
        });
        assert.isTrue(proposal.ok);
    });

    it("drops only the uses of a carried text that does not read", async () => {
        const s = await session();
        await s.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "pearl" }] } });
        await s.styles.applyTemplate({ version: 1, layers: [], shaders: [{ id: "user/tint", text: TINT }] });
        await s.styles.add({ ...MARBLES, name: "Tinted", set: { "node.shaders": [{ shader: "user/tint" }] } });
        const { file, style } = await savedFile(s);
        const shaders = style.shaders as { id: string; text: string }[];
        // A header this build cannot read, as one a later build dropped a key from would be.
        const tint = shaders.find((entry) => entry.id === "user/tint");
        assert.isDefined(tint);
        if (tint !== undefined) {
            tint.text = TINT.replace('"name": "Tint",', '"name": "Tint",,');
        }

        const opened = createGraphSession();
        const report = await opened.project.open(JSON.stringify(file));
        const unknown = report.problems.filter((problem) => problem.code === "shader.unknown");
        assert.deepEqual(
            unknown.map((problem) => problem.params.shader),
            ["user/tint"],
        );
        assert.deepEqual(
            opened.styles
                .list()
                .filter((layer) => layer.name !== "Node defaults" && layer.name !== "Edge defaults")
                .map((layer) => [layer.name, layer.set?.["node.shaders"]]),
            [
                ["Marbles", [{ shader: "pearl" }]],
                ["Tinted", []],
            ],
        );
        assert.deepEqual(
            opened.shaders.list().map((entry) => entry.id),
            ["pearl"],
        );
    });

    it("carries up to 1 MiB of shader text, and refuses more", async () => {
        const s = await session();
        const big = (size: number): StyleDocument => ({
            version: 1,
            layers: [],
            shaders: [0, 1, 2, 3].map((at) => ({ id: `user/big-${String(at)}`, text: "x".repeat(size / 4) })),
        });
        await s.styles.applyTemplate(big(1_000_000));
        try {
            await s.styles.applyTemplate(big(1_100_000));
            assert.fail("more than 1 MiB of shader text was accepted");
        } catch (error) {
            assert.strictEqual((error as { details?: { code?: string } }).details?.code, "shader.too-large");
        }
    });

    it("keeps a recovered autosave entry whose open dropped shader uses, and writes the work to a new one", async () => {
        const store = memoryAutosaveStore();
        const before = await session();
        const writer = new Autosaver({ key: "test.shaders", session: before, store });
        await before.styles.applyTemplate({ version: 1, layers: [], shaders: [{ id: "user/tint", text: TINT }] });
        await before.styles.add({ ...MARBLES, set: { "node.shaders": [{ shader: "user/tint" }] } });
        await writer.flush();
        const id = writer.status.entry ?? "";
        writer.stop();

        // Take the carried text out of the entry: a pasted shader no catalog has is lost.
        const entry = await store.read(id);
        assert.isDefined(entry);
        const rest = JSON.parse(String(entry?.parts.rest)) as { style: Record<string, unknown> };
        delete rest.style.shaders;
        await store.commit([
            {
                id,
                expectedGen: entry?.meta.gen ?? 0,
                meta: entry?.meta ?? ({} as never),
                parts: { rest: JSON.stringify(rest) },
            },
        ]);
        const kept = structuredClone(await store.read(id));

        const page = createGraphSession();
        const reader = new Autosaver({ key: "test.shaders", session: page, store });
        const restored = await reader.recover();
        assert.isTrue(restored?.report.problems.some((problem) => problem.code === "shader.unknown"));
        await reader.flush();
        assert.notStrictEqual(reader.status.entry, id);
        assert.deepEqual((await store.read(id))?.parts, kept?.parts);

        // Saving the project is the reader's word that the dropped uses may go.
        await page.project.save();
        await page.styles.add({ ...MARBLES, name: "After the save" });
        await page.project.save();
        await reader.flush();
        assert.isUndefined(await store.read(id));
        reader.stop();
    });
});
