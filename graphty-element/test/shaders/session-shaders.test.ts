/**
 * @file `session.shaders` with no canvas: adding, checking, replacing and removing project
 * shaders, the trust gate for shaders that arrive in content, the crash marker and quarantine
 * through a stand-in host, undo, and style documents carrying shaders
 * (design/rendering/shader-styles.md sections 3.5 and 4.6).
 *
 * The host here is a stand-in for the element's engine: it answers `check` with what a test
 * asks for, so these tests say what the session does with an answer, not what a GPU does. The
 * browser tests compile real shaders.
 */

import { createHash } from "node:crypto";

import { assert, describe, it } from "vitest";

import type { ShaderProblem } from "../../src/catalog/shaders";
import type { LayerSpec, StyleDocument } from "../../src/catalog/types";
import { ShaderGuard } from "../../src/managers/ShaderGuard";
import { createGraphSession, type GraphSession } from "../../src/session";
import { type HostShader, type ShaderHost, shadersControllerOf } from "../../src/session/shaders";
import { sha256Hex } from "../../src/utils/sha256";

/** A node look with one parameter. */
const TINT = `/* graphty-shader 1
{
    "id": "user/tint",
    "name": "Tint",
    "role": "look",
    "params": [{ "name": "amount", "type": "number", "default": 0.5, "min": 0, "max": 1 }]
}
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * amount, n.color.a);
}
`;

/** A node effect. */
const RING = `/* graphty-shader 1
{ "id": "user/ring", "name": "Ring", "role": "effect", "reach": 2, "motion": "loop" }
*/
vec4 shade(NodeInput n) {
    float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time)));
    return vec4(vec3(1.0, 0.6, 0.0) * ring, ring);
}
`;

/** A node layer to apply shaders to. */
const MARBLES: LayerSpec = {
    name: "Marbles",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#3366cc" },
};

/** A stand-in host. */
interface FakeHost extends ShaderHost {
    readonly checked: HostShader[];
    /** The frame guard the host draws by, as the element's render loop holds one. */
    readonly guard: ShaderGuard;
    readonly flashing: Set<string>;
    lose(hashes: readonly string[]): void;
}

/**
 * A stand-in for the element's engine.
 * @param options - What it answers.
 * @param options.problem - What `check` answers; null passes.
 * @param options.crashMarked - The hashes its crash marker names.
 * @returns The host.
 */
function fakeHost(options: { problem?: ShaderProblem | null; crashMarked?: readonly string[] } = {}): FakeHost {
    const listeners = new Set<(hashes: readonly string[]) => void>();
    const checked: HostShader[] = [];
    const guard = new ShaderGuard();
    return {
        guard,
        flashing: new Set(),
        renderer: "webgl",
        crashMarked: new Set(options.crashMarked),
        checked,
        check: (shader) => {
            checked.push(shader);
            return Promise.resolve(options.problem ?? null);
        },
        thumbnail: () => Promise.resolve(new Blob([])),
        configure: (settings) => {
            guard.configure(settings);
        },
        get quality() {
            return guard.quality;
        },
        onRender: (listener) => guard.onChange(listener),
        onLost: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        lose: (hashes) => {
            for (const listener of listeners) {
                listener(hashes);
            }
        },
        dispose: () => undefined,
    };
}

/**
 * A session with one node and the Marbles layer.
 * @returns The session and the layer's id.
 */
async function session(): Promise<{ session: GraphSession; layer: string }> {
    const created = createGraphSession();
    await created.data.addNodes([{ id: "a" }, { id: "b" }]);
    const layer = await created.styles.add(MARBLES);
    return { session: created, layer: layer.id };
}

/**
 * The events a session publishes for shaders, as they arrive.
 * @param watched - The session.
 * @returns The lists.
 */
function events(watched: GraphSession): {
    readonly held: (readonly string[])[];
    readonly approved: { id: string; hash: string }[];
    readonly status: { id: string; state: string }[];
} {
    const held: (readonly string[])[] = [];
    const approved: { id: string; hash: string }[] = [];
    const status: { id: string; state: string }[] = [];
    watched.on("shader:held", ({ ids }) => held.push(ids));
    watched.on("shader:approved", (detail) => approved.push(detail));
    watched.on("shader:status", ({ id, state }) => status.push({ id, state }));
    return { held, approved, status };
}

/**
 * A style document carrying one shader and a layer that draws it.
 * @param extra - Members to add to the document, as a file might.
 * @returns The document.
 */
function documentWithTint(extra: Record<string, unknown> = {}): StyleDocument {
    return {
        version: 1,
        layers: [{ ...MARBLES, name: "Tinted", set: { "node.shader": "user/tint" } }],
        shaders: [{ id: "user/tint", text: TINT }],
        ...extra,
    };
}

describe("session.shaders", () => {
    it("hashes text with the standard SHA-256", () => {
        for (const text of ["", "abc", TINT, "x".repeat(1000)]) {
            assert.strictEqual(sha256Hex(text), createHash("sha256").update(text).digest("hex"));
        }
    });

    it("adds the reader's shader, approves its hash and lists it in the catalog", async () => {
        const { session: s } = await session();
        const seen = events(s);
        const added = await s.shaders.add(TINT);
        assert.isTrue(added.ok);
        const [listed] = s.shaders.list();
        assert.strictEqual(listed.id, "user/tint");
        assert.strictEqual(listed.hash, sha256Hex(TINT));
        // No canvas: only the static checks ran.
        assert.strictEqual(listed.state, "not-checked");
        assert.deepEqual(seen.approved, [{ id: "user/tint", hash: sha256Hex(TINT) }]);
        assert.isTrue(s.catalog.shaders().some((descriptor) => descriptor.id === "user/tint"));
        assert.strictEqual(s.catalog.shaders().find((d) => d.id === "user/tint")?.origin, "pasted");
    });

    it("writes nothing for text that fails the static checks, and says where", async () => {
        const { session: s } = await session();
        const broken = TINT.replace("return vec4", "while (true) {}\n    return vec4");
        const added = await s.shaders.add(broken);
        assert.isFalse(added.ok);
        if (!added.ok) {
            assert.strictEqual(added.problems[0].code, "shader.loop-unbounded");
            assert.strictEqual(added.problems[0].params.line, 10);
        }

        assert.lengthOf(s.shaders.list(), 0);
    });

    it("refuses a taken id, or renames it when asked", async () => {
        const { session: s } = await session();
        await s.shaders.add(TINT);
        const other = TINT.replace("* amount", "* amount * 0.5");
        const refused = await s.shaders.add(other);
        assert.isFalse(refused.ok);
        if (!refused.ok) {
            assert.deepEqual(refused.problems[0], {
                code: "shader.id-taken",
                params: { id: "user/tint", free: "user/tint-2" },
            });
        }

        const renamed = await s.shaders.add(other, { onTaken: "rename" });
        assert.isTrue(renamed.ok && renamed.descriptor.id === "user/tint-2");
        assert.deepEqual(
            s.shaders.list().map((shader) => shader.id),
            ["user/tint", "user/tint-2"],
        );
        // The renamed text reads back alone, under its new id.
        assert.include(await s.shaders.source("user/tint-2"), '"id": "user/tint-2"');
    });

    it("says a preset's copied text is that preset, with no parameter that differs", async () => {
        const { session: s } = await session();
        const text = await s.shaders.source("uncertainty-aura");
        const checked = await s.shaders.check(text);
        assert.isTrue(checked.ok);
        assert.deepEqual(checked.ok ? checked.sameAs : undefined, { id: "uncertainty-aura", params: {} });
        const edited = await s.shaders.check(text.replace("return", "return 0.5 *"));
        assert.isUndefined(edited.ok ? edited.sameAs : "refused");
    });

    it("undoes an add with apply, the shader and the layer write together, in one step", async () => {
        const { session: s, layer } = await session();
        const steps = s.history.steps.length;
        const added = await s.shaders.add(TINT, { apply: { layer } });
        assert.isTrue(added.ok);
        assert.strictEqual(s.styles.get(layer)?.set?.["node.shader"], "user/tint");
        assert.strictEqual(s.history.steps.length, steps + 1);
        assert.deepEqual(s.history.steps.at(-1)?.fact, { code: "shader.add", params: { id: "user/tint", layer } });

        await s.undo();
        assert.lengthOf(s.shaders.list(), 0);
        assert.isUndefined(s.styles.get(layer)?.set?.["node.shader"]);
        assert.strictEqual(s.styles.get(layer)?.set?.["node.color"], "#3366cc");

        await s.redo();
        assert.lengthOf(s.shaders.list(), 1);
        assert.strictEqual(s.styles.get(layer)?.set?.["node.shader"], "user/tint");
    });

    it("applies an effect as an added effect, keeping the layer's others", async () => {
        const { session: s, layer } = await session();
        await s.shaders.add(RING, { apply: { layer } });
        assert.deepEqual({ ...(s.styles.get(layer)?.set?.["node.effects"] as object) }, { "user/ring": true });
    });

    it("replaces and removes as undoable steps", async () => {
        const { session: s } = await session();
        await s.shaders.add(TINT);
        const replaced = await s.shaders.replace("user/tint", TINT.replace("0.5", "0.25"));
        assert.isTrue(replaced.ok);
        assert.include(await s.shaders.source("user/tint"), '"default": 0.25');
        await s.shaders.remove("user/tint");
        assert.lengthOf(s.shaders.list(), 0);
        await s.undo();
        assert.include(await s.shaders.source("user/tint"), '"default": 0.25');
        await s.undo();
        assert.include(await s.shaders.source("user/tint"), '"default": 0.5');
    });

    it("holds content until approve, and fires held and approved", async () => {
        const { session: s } = await session();
        const seen = events(s);
        await s.shaders.add(TINT, { source: "content" });
        assert.strictEqual(s.shaders.status("user/tint").state, "held");
        assert.deepEqual(s.shaders.status("user/tint").problem, { code: "shader.held", params: { id: "user/tint" } });
        assert.deepEqual(seen.held, [["user/tint"]]);
        assert.isFalse(s.shaders.availability("user/tint").ok);

        const approved = await s.shaders.approve("user/tint");
        assert.isTrue(approved.ok);
        assert.strictEqual(s.shaders.status("user/tint").state, "not-checked");
        assert.deepEqual(seen.approved, [{ id: "user/tint", hash: sha256Hex(TINT) }]);
    });

    it("opens a style document's shader held, with the layer naming it, and reports it", async () => {
        const { session: s } = await session();
        const report = await s.styles.applyTemplate(documentWithTint());
        assert.deepEqual(report.shaders, [{ code: "shader.held", params: { ids: ["user/tint"] } }]);
        assert.strictEqual(s.shaders.status("user/tint").state, "held");
        assert.isTrue(s.styles.list().some((layer) => layer.set?.["node.shader"] === "user/tint"));
    });

    it("holds a document's shader even when the document asks to run it", async () => {
        const { session: s } = await session();
        await s.styles.applyTemplate(documentWithTint({ shaderSettings: { untrusted: "run" } }));
        assert.strictEqual(s.shaders.status("user/tint").state, "held");
    });

    it("runs or refuses a document's shaders when the call says so", async () => {
        const ran = await session();
        await ran.session.styles.applyTemplate(documentWithTint(), { shaders: "run" });
        assert.notStrictEqual(ran.session.shaders.status("user/tint").state, "held");

        const refused = await session();
        await refused.session.styles.applyTemplate(documentWithTint(), { shaders: "refuse" });
        assert.lengthOf(refused.session.shaders.list(), 0);
    });

    it("trusts the hashes the application remembered, except one a crash marked", async () => {
        const trusted = await session();
        shadersControllerOf(trusted.session)?.configure({ trustedHashes: [sha256Hex(TINT)] });
        await trusted.session.styles.applyTemplate(documentWithTint());
        assert.strictEqual(trusted.session.shaders.status("user/tint").state, "not-checked");

        const crashed = await session();
        const controller = shadersControllerOf(crashed.session);
        controller?.configure({ trustedHashes: [sha256Hex(TINT)] });
        controller?.attach(fakeHost({ crashMarked: [sha256Hex(TINT)] }));
        await crashed.session.styles.applyTemplate(documentWithTint());
        assert.strictEqual(crashed.session.shaders.status("user/tint").state, "held");
    });

    it("compiles on the host before it writes, and writes nothing when the host refuses", async () => {
        const { session: s } = await session();
        const problem: ShaderProblem = { code: "shader.compile", params: { line: 11, column: 1, message: "x" } };
        shadersControllerOf(s)?.attach(fakeHost({ problem }));
        const added = await s.shaders.add(TINT);
        assert.deepEqual(added, { ok: false, problems: [problem] });
        assert.lengthOf(s.shaders.list(), 0);
    });

    it("is ready once the host passes it, and turns off when the GPU is lost while it drew", async () => {
        const { session: s } = await session();
        const host = fakeHost();
        shadersControllerOf(s)?.attach(host);
        await s.shaders.add(TINT);
        assert.strictEqual(s.shaders.status("user/tint").state, "ready");
        // Body line 10 of the text, for a driver's line to map back to.
        assert.strictEqual(host.checked[0].bodyLine, 9);

        host.lose([]);
        assert.notStrictEqual(s.shaders.status("user/tint").state, "off");
        host.lose([sha256Hex(TINT)]);
        assert.deepEqual(s.shaders.status("user/tint"), {
            state: "off",
            problem: { code: "shader.quarantined", params: { id: "user/tint" } },
        });
    });

    it("saves the project's shaders in its style document, and reads them back", async () => {
        const { session: s, layer } = await session();
        await s.shaders.add(TINT, { apply: { layer } });
        const document = s.styles.toDocument();
        assert.deepEqual(document.shaders, [{ id: "user/tint", text: TINT }]);

        const fresh = await session();
        await fresh.session.styles.applyTemplate(document, { shaders: "run" });
        assert.deepEqual(
            fresh.session.shaders.list().map((shader) => [shader.id, shader.hash]),
            [["user/tint", sha256Hex(TINT)]],
        );
    });

    it("writes no shaders member when the project holds none", async () => {
        const { session: s } = await session();
        assert.notProperty(s.styles.toDocument(), "shaders");
    });

    it("refuses a thumbnail with no canvas", async () => {
        const { session: s } = await session();
        await s.shaders.add(TINT);
        try {
            await s.shaders.thumbnail("user/tint");
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_UNSUPPORTED");
        }
    });

    it("counts the layers naming a shader", async () => {
        const { session: s, layer } = await session();
        await s.shaders.add(TINT, { apply: { layer } });
        assert.strictEqual(s.shaders.list()[0].usedBy, 1);
    });

    it("reports a moving shader still under reduced motion, and why", async () => {
        const { session: s } = await session();
        const host = fakeHost();
        shadersControllerOf(s)?.attach(host);
        await s.shaders.add(RING);
        await s.shaders.add(TINT);
        assert.strictEqual(s.shaders.status("user/ring").state, "ready");

        // The platform asks for reduced motion and the reader left motion on "system".
        host.guard.setSystemStill(true);
        assert.deepEqual(s.shaders.status("user/ring"), {
            state: "still",
            problem: { code: "shader.still", params: { reason: "system" } },
        });
        // A shader that never moves is unaffected.
        assert.strictEqual(s.shaders.status("user/tint").state, "ready");
        // A still shader still draws.
        assert.isNotNull(await shadersControllerOf(s)?.drawable("user/ring"));

        shadersControllerOf(s)?.configure({ motion: "on" });
        assert.strictEqual(s.shaders.status("user/ring").state, "ready");
        shadersControllerOf(s)?.configure({ motion: "off" });
        assert.deepEqual(s.shaders.status("user/ring").problem, {
            code: "shader.still",
            params: { reason: "setting" },
        });
    });

    it("turns pasted shaders off when the guard does, publishes the change, and back on", async () => {
        const { session: s } = await session();
        const host = fakeHost();
        const controller = shadersControllerOf(s);
        controller?.attach(host);
        await s.shaders.add(TINT);
        const changes: string[] = [];
        s.on("render:quality", ({ code, to }) => changes.push(`${code}:${to.pasted}`));
        host.guard.lend({
            claimed: () => true,
            pastedOnScreen: () => true,
            movingPasted: () => [],
            freeze: () => undefined,
        });
        host.guard.frame({ intervalMs: 300, gpuBehind: true });

        assert.deepEqual(changes, ["guard.long-frame:off"]);
        assert.deepEqual(s.shaders.status("user/tint"), {
            state: "off",
            problem: { code: "shader.guard-off", params: { level: "high" } },
        });
        assert.isNull(await controller?.drawable("user/tint"));
        assert.strictEqual(controller?.renderQuality.pasted, "off");

        // Changing the settings starts the guard again.
        controller?.configure({ quality: "high" });
        assert.strictEqual(s.shaders.status("user/tint").state, "ready");
    });

    it("reports a shader frozen for flashing as still", async () => {
        const { session: s } = await session();
        const host = fakeHost();
        shadersControllerOf(s)?.attach(host);
        await s.shaders.add(RING);
        host.flashing.add(sha256Hex(RING));
        host.guard.announce();
        assert.deepEqual(s.shaders.status("user/ring"), {
            state: "still",
            problem: { code: "shader.flashing", params: { id: "user/ring" } },
        });
    });

    it("checks as add does: compiles on the canvas and reports every problem, not the first", async () => {
        const { session: s } = await session();
        await s.shaders.add(TINT);
        const problem: ShaderProblem = { code: "shader.compile", params: { line: 11, column: 1, message: "x" } };
        shadersControllerOf(s)?.attach(fakeHost({ problem }));
        const other = TINT.replace("* amount", "* amount * 0.5");
        const checked = await s.shaders.check(other);
        assert.deepEqual(checked.ok ? [] : checked.problems.map((each) => each.code), [
            "shader.id-taken",
            "shader.compile",
        ]);
        // What check passes, add passes; what it refuses, add refuses.
        const renamed = await s.shaders.check(other, { onTaken: "rename" });
        assert.deepEqual(renamed, { ok: false, problems: [problem] });
        assert.deepEqual(await s.shaders.add(other, { onTaken: "rename" }), renamed);
        // Asked not to compile, it stops after the static checks.
        assert.isTrue((await s.shaders.check(other, { onTaken: "rename", compile: false })).ok);
    });

    it("names a missing or wrong entry function, not a missing header", async () => {
        const { session: s } = await session();
        const codes = async (text: string, role?: "look"): Promise<string[]> => {
            const checked = await s.shaders.check(text, role === undefined ? {} : { place: { target: "node", role } });
            return checked.ok ? [] : checked.problems.map((each) => each.code);
        };
        assert.deepEqual(await codes("vec3 shade(NodeInput n) { return n.color.rgb; }\n"), ["shader.entry-signature"]);
        assert.deepEqual(await codes("vec4 shade(Node n) { return n.color; }\n"), ["shader.entry-signature"]);
        assert.deepEqual(await codes("vec4 paint(NodeInput n) { return n.color; }\n"), ["shader.entry-missing"]);
        assert.deepEqual(await codes("vec3 shade(NodeInput n) { return n.color.rgb; }\n", "look"), [
            "shader.entry-signature",
        ]);
        // A node body with no header is a node look: its entry says the target, and no place asked
        // for an effect.
        assert.deepEqual(await codes("vec4 shade(NodeInput n) { return n.color; }\n"), []);
    });

    it("answers a shader applied to a layer of the other target with a problem, writing nothing", async () => {
        const { session: s } = await session();
        const edges = await s.styles.add({
            name: "Lines",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#888888" },
        });
        const steps = s.history.steps.length;
        const added = await s.shaders.add(TINT, { apply: { layer: edges.id } });
        assert.deepEqual(added, {
            ok: false,
            problems: [{ code: "shader.apply-target", params: { layer: edges.id, target: "edge" } }],
        });
        assert.lengthOf(s.shaders.list(), 0);
        assert.strictEqual(s.history.steps.length, steps);
        assert.isFalse((await s.shaders.check(TINT, { apply: { layer: edges.id } })).ok);
    });

    it("copies the reader's values as the defaults, keeping a preset's id; a duplicate gets a user id", async () => {
        const { session: s, layer } = await session();
        const text = await s.shaders.source("uncertainty-aura", { params: { tint: 0.9, visible: false } });
        assert.include(text, '"id": "uncertainty-aura"');
        assert.include(text, '"default": 0.9');
        const checked = await s.shaders.check(text);
        assert.deepEqual(checked.ok ? checked.sameAs : checked.problems, {
            id: "uncertainty-aura",
            params: { tint: 0.9 },
        });

        // Pasted back, it is the preset with those values: nothing is added to the project.
        const added = await s.shaders.add(text, { apply: { layer } });
        assert.isTrue(added.ok && added.descriptor.id === "uncertainty-aura");
        assert.lengthOf(s.shaders.list(), 0);
        assert.deepEqual(JSON.parse(JSON.stringify(s.styles.get(layer)?.set?.["node.effects"])), {
            "uncertainty-aura": { tint: 0.9 },
        });

        const duplicate = await s.shaders.source("uncertainty-aura", { duplicate: true });
        assert.include(duplicate, '"id": "user/uncertainty-aura"');
        // A project shader's copy carries the values too.
        await s.shaders.add(TINT);
        assert.include(await s.shaders.source("user/tint", { params: { amount: 0.2 } }), '"default": 0.2');
        assert.strictEqual(await s.shaders.source("user/tint"), TINT);
    });

    it("says a background that tints by groups has nothing to tint by when no layer draws a boundary", async () => {
        const { session: s, layer } = await session();
        assert.deepEqual(s.shaders.status("nebula").problem, { code: "shader.no-data", params: { input: "members" } });
        await s.styles.update(layer, { boundary: { shader: "metaball-hull" } });
        assert.isUndefined(s.shaders.status("nebula").problem);
    });

    it("answers the quality the settings ask for with no host", async () => {
        const { session: s } = await session();
        const controller = shadersControllerOf(s);
        controller?.configure({ quality: "low", motion: "off" });
        assert.deepEqual({ ...controller?.renderQuality }, { level: "low", motion: "still", pasted: "on" });
    });
});
