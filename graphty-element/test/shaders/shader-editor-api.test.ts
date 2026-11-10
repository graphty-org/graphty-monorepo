/**
 * @file What an editor builds on (design/rendering/shader-studio/editor.md section 7): a shader
 * text split into the header as written and its body, written back, and the row functions over a
 * header. Every test here runs without a canvas.
 */

import { assert, describe, it } from "vitest";

import {
    minSizeApplies,
    PLACES_BY_TARGET,
    SHADER_MIN_SIZE_RANGE,
    SHADER_PARAM_TYPES,
    SHADER_REACH_RANGE,
    shaderIdForName,
    shaderParamShape,
    shaderPlaceUsesReach,
    type ShaderProblem,
    type ShaderTarget,
    type ShaderTextDraft,
} from "../../src/catalog/shaders";
import { shaderTemplate } from "../../src/catalog/shaderTemplate";
import {
    bindShaderParamClock,
    changeShaderParamType,
    formatShaderDraft,
    formatShaderText,
    parseShaderText,
    removeShaderParam,
    renameShaderParam,
    retypeShaderParam,
    shaderParamClock,
    shaderParamPlainName,
    splitShaderText,
} from "../../src/catalog/shaderText";
import { createGraphSession } from "../../src/session";

/** A body that draws. */
const BODY = "vec4 shade(NodeInput n) {\n    return vec4(n.color.rgb, n.color.a);\n}\n";

/**
 * A text with the header given.
 * @param header - The header's keys.
 * @param body - The body.
 * @returns The text.
 */
function headed(header: unknown, body = BODY): string {
    return `/* graphty-shader 1\n${JSON.stringify(header, null, 4)}\n*/\n${body}`;
}

/** A header that writes every key a header and a parameter may carry. */
const EVERY_KEY = {
    id: "user/every-key",
    name: "Every key",
    place: "around",
    places: ["around", "behind"],
    minSize: 16,
    categories: ["Glass"],
    preview: { params: { speed: 2 }, time: 1 },
    cost: "light",
    thumbnail: "https://example.com/picture.png",
    motion: { loop: { speedParam: "speed" } },
    reach: 2,
    reachParam: "width",
    blend: "add",
    form: "sphere",
    bloom: true,
    requires: ["webgl2"],
    reads: ["color"],
    webgpu: "translate",
    params: [
        {
            name: "speed",
            type: "number",
            default: 1,
            min: 0,
            max: 4,
            step: 0.5,
            plainName: "How fast",
            description: "Seconds per turn",
            varies: true,
            primary: true,
        },
        { name: "width", type: "number", default: 2 },
        { name: "look", type: "enum", default: "dots", values: [{ value: "dots", label: "Dots" }] },
        {
            name: "icon",
            type: "integer",
            default: 1,
            choices: [{ value: 1, plainName: "Star", glyph: { path: "M0 0", outline: true } }],
        },
    ],
};

/**
 * Assert a text parses, and parses the same after a split and a format.
 * @param text - The text.
 * @param label - What it is.
 */
function assertRoundTrips(text: string, label: string): void {
    const before = parseShaderText(text);
    assert.isTrue(before.ok, `${label}: ${JSON.stringify(before)}`);
    const { draft, body } = splitShaderText(text);
    assert.isDefined(draft, label);
    assert.deepEqual(parseShaderText(formatShaderDraft(draft ?? {}, body)), before, label);
}

describe("splitShaderText", () => {
    it("gives the header as written, the exact body and the line the body starts on", () => {
        const parts = splitShaderText(headed({ id: "user/a", name: "A", zeta: 1, place: "paint" }));
        assert.isTrue(parts.headed);
        assert.deepEqual(Object.keys(parts.draft ?? {}), ["id", "name", "zeta", "place"]);
        assert.strictEqual(parts.body, BODY);
        assert.strictEqual(parts.bodyLine, 9);
    });

    it("reads a text with no header as all body, under a placeholder that parses like it", () => {
        const parts = splitShaderText(BODY);
        assert.isFalse(parts.headed);
        assert.strictEqual(parts.body, BODY);
        assert.strictEqual(parts.bodyLine, 1);
        assert.deepEqual(parts.problems, []);
        assert.deepEqual(parseShaderText(formatShaderDraft(parts.draft ?? {}, parts.body)), parseShaderText(BODY));
    });

    it("has no draft for a header that is not a JSON object, or whose params are not a list of objects", () => {
        for (const text of [
            "/* graphty-shader 1\n{ not json\n*/\nvec4 x;",
            headed([1, 2]),
            headed({ id: "user/a", params: "many" }),
            headed({ id: "user/a", params: [1] }),
        ]) {
            const parts = splitShaderText(text);
            assert.isTrue(parts.headed, text);
            assert.isUndefined(parts.draft, text);
            assert.strictEqual(parts.problems[0].code, "shader.header-json", text);
        }
    });

    it("keeps wrong values in the draft, reporting them beside it", () => {
        const param = { name: "a", type: "number", default: 3, min: 5, max: 1 };
        const parts = splitShaderText(headed({ id: "user/a", params: [param] }));
        assert.deepEqual(parts.draft?.params, [param]);
        assert.deepEqual(parts.problems, [
            { code: "shader.param-invalid", params: { param: "a", field: "max" } },
        ] satisfies ShaderProblem[]);
    });

    it("reads a bare id and any characters without a problem, which parseShaderText refuses", () => {
        const text = headed({ id: "glass", name: "Gl\u00e4s" });
        const parts = splitShaderText(text);
        assert.strictEqual(parts.draft?.id, "glass");
        assert.deepEqual(parts.problems, []);
        assert.isFalse(parseShaderText(text).ok);
    });

    it("names a row with an empty name by its index, so two can be told apart", () => {
        const row = { name: "", type: "number", default: 1 };
        const { problems } = splitShaderText(headed({ id: "user/a", params: [row, row] }));
        assert.deepEqual(
            problems.map((problem) => problem.params.param),
            ["#0", "#1"],
        );
    });
});

describe("formatShaderDraft", () => {
    it("writes the keys in their order and adds nothing", () => {
        const draft: ShaderTextDraft = {
            name: "A",
            id: "user/a",
            params: [{ type: "number", name: "b", default: "" }],
        };
        const { draft: back } = splitShaderText(formatShaderDraft(draft, BODY));
        assert.deepEqual(Object.keys(back ?? {}), ["name", "id", "params"]);
        assert.deepEqual(back, draft);
        assert.notProperty(back?.params?.[0] ?? {}, "plainName");
    });

    it("keeps a name holding the end of a comment inside the header, both writers", () => {
        const name = "a */ b";
        const draft = formatShaderDraft({ id: "user/a", name }, BODY);
        const parsed = parseShaderText(draft);
        assert.isTrue(parsed.ok && parsed.registration.descriptor.plainName === name, JSON.stringify(parsed));
        assert.isTrue(parsed.ok);
        const written = parsed.ok ? formatShaderText(parsed.registration) : "";
        const again = parseShaderText(written);
        assert.isTrue(again.ok && again.registration.descriptor.plainName === name, JSON.stringify(again));
    });
});

describe("a split then a format parses equal to the original", () => {
    it("for every preset's copy", async () => {
        const session = createGraphSession();
        const presets = session.catalog.shaders().filter((shader) => shader.origin === "element");
        assert.isAbove(presets.length, 0);
        for (const { id } of presets) {
            assertRoundTrips(await session.shaders.source(id, { duplicate: true }), id);
        }
    });

    it("for every starter", () => {
        for (const [target, places] of Object.entries(PLACES_BY_TARGET)) {
            for (const place of places.length === 0 ? [undefined] : places) {
                const where = { target: target as ShaderTarget, ...(place === undefined ? {} : { place }) };
                assertRoundTrips(shaderTemplate(where), `${target} ${String(place)}`);
            }
        }
    });

    it("for a header writing every key", () => {
        assertRoundTrips(headed(EVERY_KEY), "every key");
    });
});

describe("the facts an editor reads", () => {
    it("makes an id from a name", () => {
        assert.strictEqual(shaderIdForName("My paint"), "user/my-paint");
        assert.strictEqual(shaderIdForName("  -- !! "), "user/shader");
        assert.strictEqual(shaderIdForName(""), "user/shader");
        const long = shaderIdForName(`${"a".repeat(34)} bcd`);
        assert.isAtMost(long.length, 40);
        assert.notMatch(long, /-$/);
        assert.isTrue(parseShaderText(headed({ id: long })).ok, long);
    });

    it("gives every type a default the type accepts, an enum none", () => {
        for (const type of SHADER_PARAM_TYPES) {
            const shape = shaderParamShape(type);
            if (type === "enum") {
                assert.isUndefined(shape.default);
                continue;
            }

            const text = headed({ id: "user/a", params: [{ name: "a", type, default: shape.default }] });
            assert.isTrue(parseShaderText(text).ok, type);
        }
    });

    it("names the fields of a type, and only a number's range", () => {
        assert.sameMembers([...shaderParamShape("number").fields], ["min", "max", "step", "varies"]);
        assert.sameMembers([...shaderParamShape("boolean").fields], []);
        assert.sameMembers([...shaderParamShape("enum").fields], ["values"]);
        assert.sameMembers([...shaderParamShape("color").fields], ["varies"]);
    });

    it("keeps the limits the header check holds to", () => {
        const reach = (value: number): boolean =>
            parseShaderText(headed({ id: "user/a", place: "around", reach: value })).ok;
        assert.isTrue(reach(SHADER_REACH_RANGE.max));
        assert.isFalse(reach(SHADER_REACH_RANGE.max + 1));
        const minSize = (value: number): boolean =>
            parseShaderText(headed({ id: "user/a", place: "around", minSize: value })).ok;
        assert.isTrue(minSize(SHADER_MIN_SIZE_RANGE.max));
        assert.isFalse(minSize(SHADER_MIN_SIZE_RANGE.max + 1));
    });

    it("says where reach and minimum size apply", () => {
        assert.isTrue(shaderPlaceUsesReach("along"));
        assert.isFalse(shaderPlaceUsesReach("paint"));
        assert.isTrue(minSizeApplies(["around"]));
        assert.isFalse(minSizeApplies(["over"]));
    });

    it("derives a display name", () => {
        assert.strictEqual(shaderParamPlainName("glowRadius"), "Glow radius");
    });
});

describe("changeShaderParamType", () => {
    const number = {
        name: "a",
        plainName: "A!",
        type: "number",
        default: 3,
        min: 0.5,
        max: 9,
        step: 0.5,
        varies: true,
    };

    it("sets a valid default and clears what no longer applies, keeping the rest", () => {
        assert.deepEqual(changeShaderParamType(number, "color"), {
            name: "a",
            plainName: "A!",
            type: "color",
            default: "#ffffff",
            varies: true,
        });
        assert.deepEqual(changeShaderParamType(number, "boolean"), {
            name: "a",
            plainName: "A!",
            type: "boolean",
            default: false,
        });
    });

    it("seeds an enum from the caller's labels, the first the default", () => {
        const changed = changeShaderParamType(number, "enum", ["One", "Two"]);
        assert.deepEqual(changed.values, [
            { value: "One", label: "One" },
            { value: "Two", label: "Two" },
        ]);
        assert.strictEqual(changed.default, "One");
        assert.isTrue(parseShaderText(headed({ id: "user/a", params: [changed] })).ok);
    });

    it("keeps a whole default in range going to an integer, dropping a fractional limit", () => {
        const changed = changeShaderParamType(number, "integer");
        assert.notProperty(changed, "min");
        assert.strictEqual(changed.max, 9);
        assert.strictEqual(changed.default, 3);
    });

    it("moves a default that cannot stay into the row's range", () => {
        const changed = changeShaderParamType({ name: "a", type: "color", default: "#000000", min: 4 }, "number");
        assert.notProperty(changeShaderParamType({ name: "a", type: "number", min: 4 }, "color"), "min");
        assert.strictEqual(changed.min, 4);
        assert.isTrue(parseShaderText(headed({ id: "user/a", params: [changed] })).ok, JSON.stringify(changed));
    });

    it("drops a clock binding, which the new type cannot hold as a number", () => {
        const bound = { name: "a", type: "number", default: { by: "since.matched", domain: [0, 1] } };
        assert.strictEqual(changeShaderParamType(bound, "integer").default, 1);
    });

    it("leaves a row of that type alone", () => {
        assert.strictEqual(changeShaderParamType(number, "number"), number);
    });
});

describe("renameShaderParam and removeShaderParam", () => {
    const header = (): ShaderTextDraft => JSON.parse(JSON.stringify(EVERY_KEY)) as ShaderTextDraft;

    it("carries what else names the row", () => {
        const speed = renameShaderParam(header(), "speed", "tempo");
        assert.strictEqual(speed.params?.[0].name, "tempo");
        assert.deepEqual(speed.motion, { loop: { speedParam: "tempo" } });
        assert.deepEqual(speed.preview, { params: { tempo: 2 }, time: 1 });
        assert.strictEqual(renameShaderParam(header(), "width", "girth").reachParam, "girth");
    });

    it("writes no display name on a row that had none", () => {
        const renamed = renameShaderParam(header(), "width", "girth");
        assert.notProperty(renamed.params?.[1] ?? {}, "plainName");
    });

    it("drops what named a removed row, and the text still parses", () => {
        const text = formatShaderDraft(removeShaderParam(removeShaderParam(header(), "speed"), "width"), BODY);
        const { draft } = splitShaderText(text);
        assert.deepEqual(draft?.motion, { loop: {} });
        assert.deepEqual(draft?.preview, { params: {}, time: 1 });
        assert.notProperty(draft ?? {}, "reachParam");
        assert.isTrue(parseShaderText(text).ok, text);
    });

    it("takes the last of two rows with one name, and leaves references to the row still named so", () => {
        const duplicated: ShaderTextDraft = {
            id: "user/a",
            reachParam: "a",
            params: [
                { name: "a", type: "number", default: 1 },
                { name: "a", type: "number", default: 2 },
            ],
        };
        const renamed = renameShaderParam(duplicated, "a", "b");
        assert.deepEqual(
            renamed.params?.map((row) => [row.name, row.default]),
            [
                ["a", 1],
                ["b", 2],
            ],
        );
        assert.strictEqual(renamed.reachParam, "a");
        assert.deepEqual(
            removeShaderParam(duplicated, "a").params?.map((row) => row.default),
            [1],
        );
    });

    it("answers the same header for a row it does not have", () => {
        const draft = header();
        assert.strictEqual(renameShaderParam(draft, "none", "b"), draft);
        assert.strictEqual(removeShaderParam(draft, "none"), draft);
    });
});

describe("editing rows a reader can see only by place", () => {
    const pair = (): ShaderTextDraft => ({
        id: "user/a",
        reachParam: "a",
        preview: { params: { a: 1, b: 2 } },
        params: [
            { name: "a", type: "number", default: 1 },
            { name: "b", type: "color", default: "#000000" },
        ],
    });

    it("renames and removes the row an index names, not the last of its name", () => {
        const twins: ShaderTextDraft = {
            id: "user/a",
            params: [
                { name: "x", type: "number", default: 1 },
                { name: "x", type: "color", default: "#000000" },
            ],
        };
        assert.deepEqual(
            renameShaderParam(twins, "x", "y", 0).params?.map((row) => [row.name, row.type]),
            [
                ["y", "number"],
                ["x", "color"],
            ],
        );
        assert.deepEqual(
            removeShaderParam(twins, "x", 0).params?.map((row) => row.type),
            ["color"],
        );
        assert.strictEqual(renameShaderParam(twins, "x", "y", 5), twins);
    });

    it("a rename onto a name another row has moves no reference, and renaming back loses nothing", () => {
        const onto = renameShaderParam(pair(), "a", "b", 0);
        assert.strictEqual(onto.reachParam, "a");
        assert.deepEqual(onto.preview, { params: { a: 1, b: 2 } });
        const back = renameShaderParam(onto, "b", "a", 0);
        assert.deepEqual(back, pair());
    });

    it("a type change drops a reference the new type cannot serve", () => {
        const looped: ShaderTextDraft = { ...pair(), motion: { loop: { speedParam: "a" } } };
        const integer = retypeShaderParam(looped, 0, "integer");
        assert.strictEqual(integer.reachParam, "a", "an integer still serves reachParam");
        assert.deepEqual(splitShaderText(formatShaderDraft(integer, BODY)).draft?.motion, { loop: {} });
        const toggled = retypeShaderParam(looped, 0, "boolean");
        assert.notProperty(splitShaderText(formatShaderDraft(toggled, BODY)).draft ?? {}, "reachParam");
        assert.strictEqual(toggled.params?.[0]?.default, false);
        assert.strictEqual(retypeShaderParam(looped, 9, "boolean"), looped);
    });

    it("binds a Number or Color default to a clock and takes it off", () => {
        assert.isTrue(shaderParamShape("number").clock && shaderParamShape("color").clock);
        assert.isFalse(shaderParamShape("integer").clock || shaderParamShape("boolean").clock);
        const color = bindShaderParamClock({ name: "tint", type: "color", default: "#ff0000" }, "since.selected");
        assert.deepEqual(color.default, { by: "since.selected", domain: [0, 0.3], range: ["#ff0000", "#ff0000"] });
        assert.deepEqual(shaderParamClock(color), {
            by: "since.selected",
            domain: [0, 0.3],
            range: ["#ff0000", "#ff0000"],
        });
        assert.strictEqual(bindShaderParamClock(color, undefined).default, "#ff0000");
        const number = bindShaderParamClock({ name: "glow", type: "number", default: 2 }, "since.hovered");
        assert.deepEqual(number.default, { by: "since.hovered", domain: [0, 0.3] });
        assert.strictEqual(bindShaderParamClock(number, undefined).default, shaderParamShape("number").default);
        assert.isUndefined(shaderParamClock({ name: "glow", type: "number", default: 2 }));
    });
});

describe("text an editor is handed", () => {
    it("a valid header that escapes a non-ASCII character stays valid through split and format", () => {
        const original = `/* graphty-shader 1\n{ "id": "user/a", "name": "caf\\u00e9" }\n*/\n${BODY}`;
        assert.isTrue(parseShaderText(original).ok);
        const { draft, body, problems } = splitShaderText(original);
        assert.deepEqual(problems, []);
        const written = formatShaderDraft(draft ?? {}, body);
        const parsed = parseShaderText(written);
        assert.isTrue(parsed.ok, JSON.stringify(parsed));
        assert.strictEqual(parsed.ok ? parsed.registration.descriptor.plainName : "", "caf\u00e9");
    });

    it("a value that is not a string splits as a header-missing problem, as parsing reports it", () => {
        const parts = splitShaderText(undefined as unknown as string);
        assert.isFalse(parts.headed);
        assert.isUndefined(parts.draft);
        assert.deepEqual(
            parts.problems.map((problem) => problem.code),
            ["shader.header-missing"],
        );
    });
});
