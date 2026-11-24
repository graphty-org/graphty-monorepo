/**
 * @file `session.shaders` through its public members alone, with no canvas: the refusals of `add`
 * with `apply`, taken ids and renaming, content held until approved, the members that name an id
 * nothing holds, status and availability, thumbnails with no canvas, `source` of a project shader,
 * and the project's shader limit.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { disposedAfterEach } from "../helpers/disposed-after-each";

const owned = disposedAfterEach();

/**
 * Shader text with a header.
 * @param id - Its id.
 * @param body - Its body.
 * @param header - More header keys.
 * @returns The text.
 */
function shaderText(id: string, body: string, header: Record<string, unknown> = {}): string {
    return `/* graphty-shader 1\n${JSON.stringify({ id, ...header })}\n*/\n${body}`;
}

const NODE = "vec4 shade(NodeInput n) {\n    return vec4(n.color.rgb * amount, n.color.a);\n}\n";
const TINT = shaderText("user/tint", NODE, {
    name: "Tint",
    place: "paint",
    params: [{ name: "amount", type: "number", default: 0.5, min: 0, max: 1 }],
});
const BACKGROUND = shaderText("user/sky", "vec4 shade(BackgroundInput b) {\n    return vec4(0.1, 0.2, 0.4, 1.0);\n}\n");

/**
 * A session with a node layer and an edge layer.
 * @returns The session and the layers' ids.
 */
async function withLayers(): Promise<{ session: GraphSession; nodes: string; edges: string }> {
    const session = owned(createGraphSession());
    const nodes = await session.styles.add({
        name: "Nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#3366cc" },
    });
    const edges = await session.styles.add({
        name: "Edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#999999" },
    });
    return { session, nodes: nodes.id, edges: edges.id };
}

/**
 * The code of the `GraphtyError` a promise rejects with.
 * @param promise - The promise.
 * @returns The code.
 */
async function rejection(promise: Promise<unknown>): Promise<string> {
    const error: unknown = await promise.then(
        () => assert.fail("expected a rejection"),
        (reason: unknown) => reason,
    );
    assert.isTrue(isGraphtyError(error), String(error));
    return (error as { code: string }).code;
}

describe("add with apply", () => {
    it("writes the shader to the layer in one undoable step", async () => {
        const { session, nodes } = await withLayers();
        const added = await session.shaders.add(TINT, { apply: { layer: nodes } });
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.deepStrictEqual(session.styles.get(nodes)?.set?.["node.shaders"], [{ shader: "user/tint" }]);
        assert.deepStrictEqual(
            session.shaders.list().map((shader) => [shader.id, shader.usedBy]),
            [["user/tint", 1]],
        );
        await session.undo();
        assert.deepStrictEqual(session.shaders.list(), []);
        assert.isUndefined(session.styles.get(nodes)?.set?.["node.shaders"]);
    });

    it("refuses a layer of the other target, a layer nothing holds, and a background on any layer", async () => {
        const { session, edges, nodes } = await withLayers();
        const other = await session.shaders.add(TINT, { apply: { layer: edges } });
        assert.deepStrictEqual(other, {
            ok: false,
            problems: [{ code: "shader.apply-target", params: { layer: edges, target: "edge" } }],
        });
        // Wrapped, so the test holds whether the refusal throws at once or rejects.
        assert.strictEqual(
            await rejection((async () => session.shaders.add(TINT, { apply: { layer: "nope" } }))()),
            "E_UNKNOWN_LAYER",
        );
        assert.strictEqual(
            await rejection((async () => session.shaders.add(BACKGROUND, { apply: { layer: nodes } }))()),
            "E_SHADER_KIND",
        );
        assert.deepStrictEqual(session.shaders.list(), []);
    });

    it("takes a preset's own text as that preset: checked and applied with sameAs, refused on the other target", async () => {
        const { session, nodes, edges } = await withLayers();
        const text = await session.shaders.source("pearl", { params: {} });
        const checked = await session.shaders.check(text);
        assert.isTrue(checked.ok, JSON.stringify(checked));
        assert.strictEqual(checked.ok && checked.sameAs?.id, "pearl");
        assert.isFalse(checked.ok && "picture" in checked, "no canvas, no picture");

        assert.deepStrictEqual(await session.shaders.check(text, { apply: { layer: edges } }), {
            ok: false,
            problems: [{ code: "shader.apply-target", params: { layer: edges, target: "edge" } }],
        });
        assert.deepStrictEqual(await session.shaders.add(text, { apply: { layer: edges } }), {
            ok: false,
            problems: [{ code: "shader.apply-target", params: { layer: edges, target: "edge" } }],
        });

        const added = await session.shaders.add(text, { apply: { layer: nodes } });
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.strictEqual(added.ok && added.sameAs?.id, "pearl");
        const uses = session.styles.get(nodes)?.set?.["node.shaders"] as { shader: string }[];
        assert.deepStrictEqual(
            uses.map((use) => use.shader),
            [await session.shaders.fromCatalog("pearl")],
        );
    });

    it("adds a preset's text with an edited body as a new shader in the user namespace", async () => {
        const session = owned(createGraphSession());
        const text = await session.shaders.source("pearl");
        const edited = text.replace(/return /, "return 0.5 * ");
        const added = await session.shaders.add(edited);
        assert.isTrue(added.ok, JSON.stringify(added));
        assert.isUndefined(added.ok && added.sameAs);
        assert.strictEqual(added.ok && added.descriptor.id, "user/pearl");
    });
});

describe("ids", () => {
    it("refuses a taken id with the next free one, and renames to it when asked", async () => {
        const session = owned(createGraphSession());
        assert.isTrue((await session.shaders.add(TINT)).ok);
        const edited = TINT.replace("amount, n.color.a", "amount * 0.5, n.color.a");
        assert.deepStrictEqual(await session.shaders.add(edited), {
            ok: false,
            problems: [{ code: "shader.id-taken", params: { id: "user/tint", free: "user/tint-2" } }],
        });
        const renamed = await session.shaders.add(edited, { onTaken: "rename" });
        assert.isTrue(renamed.ok);
        assert.strictEqual(renamed.ok && renamed.descriptor.id, "user/tint-2");
        assert.deepStrictEqual(
            session.shaders.list().map((shader) => shader.id),
            ["user/tint", "user/tint-2"],
        );
    });

    it("rejects replace, remove, approve and thumbnail of an id nothing holds", async () => {
        const session = owned(createGraphSession());
        assert.strictEqual(await rejection(session.shaders.replace("user/none", TINT)), "E_UNKNOWN_SHADER");
        assert.strictEqual(await rejection(session.shaders.remove("user/none")), "E_UNKNOWN_SHADER");
        assert.strictEqual(await rejection(session.shaders.approve("user/none")), "E_UNKNOWN_SHADER");
        assert.strictEqual(await rejection(session.shaders.thumbnail("user/none")), "E_UNKNOWN_SHADER");
        assert.strictEqual(await rejection(session.shaders.fromCatalog("user/none")), "E_UNKNOWN_SHADER");
        assert.strictEqual(await rejection(session.shaders.source("user/none")), "E_UNKNOWN_SHADER");
        assert.isUndefined(session.shaders.describe("user/none"));
        assert.deepStrictEqual(session.shaders.status("user/none"), {
            state: "failed",
            problem: { code: "shader.unknown", params: { id: "user/none" } },
        });
        assert.deepStrictEqual(session.shaders.availability("user/none"), {
            ok: false,
            problem: { code: "shader.unknown", params: { id: "user/none" } },
        });
    });

    it("refuses a shader past the project's limit", async () => {
        const session = owned(createGraphSession());
        for (let index = 0; index < 64; index++) {
            const body = `vec4 shade(NodeInput n) {\n    return vec4(n.color.rgb * ${String(index)}.0, n.color.a);\n}\n`;
            const added = await session.shaders.add(shaderText(`user/s${String(index)}`, body));
            assert.isTrue(added.ok, `shader ${String(index)}`);
        }

        const over = await session.shaders.check(TINT);
        assert.deepStrictEqual(over, {
            ok: false,
            problems: [{ code: "shader.too-many", params: { count: 64, limit: 64 } }],
        });
    });
});

describe("content", () => {
    it("holds content until approved: status, availability and thumbnail say so", async () => {
        const session = owned(createGraphSession());
        const added = await session.shaders.add(TINT, { source: "content" });
        assert.isTrue(added.ok);
        assert.strictEqual(session.shaders.status("user/tint").state, "held");
        const available = session.shaders.availability("user/tint");
        assert.isFalse(available.ok);
        assert.strictEqual(!available.ok && available.problem.code, "shader.held");
        const tile = await session.shaders.thumbnail("user/tint");
        assert.notInstanceOf(tile, Blob);
        assert.strictEqual((tile as { code: string }).code, "shader.held");

        const approved = await session.shaders.approve("user/tint");
        assert.isTrue(approved.ok, JSON.stringify(approved));
        assert.notStrictEqual(session.shaders.status("user/tint").state, "held");
        assert.deepStrictEqual(session.shaders.availability("user/tint"), { ok: true });
        // With no canvas there is nothing to draw a picture on.
        assert.deepStrictEqual(await session.shaders.thumbnail("user/tint"), {
            code: "shader.no-canvas",
            params: { id: "user/tint" },
        });
    });

    it("checks content without compiling it, and reports the static problems of held text", async () => {
        const session = owned(createGraphSession());
        const checked = await session.shaders.check(TINT, { source: "content" });
        assert.isTrue(checked.ok);
        const broken = await session.shaders.check(TINT.replace("return", "while (true) {} return"), {
            source: "content",
        });
        assert.isFalse(broken.ok);
        assert.strictEqual(!broken.ok && broken.problems[0].code, "shader.loop-unbounded");
    });
});

describe("replace and source", () => {
    it("replaces a project shader's text under its id, refusing text that fails the checks", async () => {
        const session = owned(createGraphSession());
        await session.shaders.add(TINT);
        const bad = await session.shaders.replace("user/tint", "vec4 paint(NodeInput n) { return n.color; }\n");
        assert.isFalse(bad.ok);
        assert.strictEqual(!bad.ok && bad.problems[0].code, "shader.entry-missing");
        const before = session.shaders.list()[0].hash;

        const good = await session.shaders.replace("user/tint", TINT.replace("amount, n.color.a", "amount, 1.0"));
        assert.isTrue(good.ok);
        assert.strictEqual(good.ok && good.descriptor.id, "user/tint");
        assert.notStrictEqual(session.shaders.list()[0].hash, before);
        await session.shaders.remove("user/tint");
        assert.deepStrictEqual(session.shaders.list(), []);
    });

    it("writes a project shader's text with new defaults, as a duplicate, and without derived facts", async () => {
        const session = owned(createGraphSession());
        await session.shaders.add(TINT);
        assert.strictEqual(await session.shaders.source("user/tint"), TINT, "unchanged, the text as added");
        const valued = await session.shaders.source("user/tint", { params: { amount: 0.8, other: 1 } });
        assert.include(valued, '"default": 0.8');
        const omitted = await session.shaders.source("user/tint", { derived: "omit" });
        assert.notInclude(omitted, '"reads"');
        assert.notInclude(omitted, '"cost"');
        const again = await session.shaders.check(valued, { asNew: true, onTaken: "rename" });
        assert.isTrue(again.ok);
        assert.strictEqual(again.ok && again.descriptor.id, "user/tint-2");
    });
});
