import type { CodedFact, ModelChange } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    chipLine,
    countChip,
    middleCut,
    modelChip,
    modelProblemLines,
    partChip,
    roleWord,
    waitingParts,
} from "../modelWords";

/**
 * A coded fact as the element reports it.
 * @param code - the code.
 * @param params - its params.
 * @returns the fact.
 */
const fact = (code: string, params: CodedFact["params"] = {}): CodedFact => ({ code, params });

/**
 * A model's state as the element reports it.
 * @param state - where it stands.
 * @param problems - its problems.
 * @returns the change.
 */
const change = (state: ModelChange["state"], problems: readonly CodedFact[]): ModelChange => ({
    ref: "a.glb",
    layerIds: [],
    state,
    problems,
});

describe("the words for a model's problems", () => {
    it("says each problem as a chip and a tooltip", () => {
        const cases: [CodedFact, string, string][] = [
            [fact("E_MODEL_MISSING_FILE", { name: "a.bin" }), "1 missing", "a.bin"],
            [fact("E_MODEL_PART_AMBIGUOUS", { name: "b.png" }), "1 missing", "b.png"],
            [fact("E_MODEL_AMBIGUOUS", { candidates: ["x.glb", "y.glb"], more: 3 }), "5 models", "x.glb, y.glb"],
            [fact("E_MODEL_AMBIGUOUS", {}), "0 models", ""],
            [fact("E_MODEL_FORMAT_UNSUPPORTED", { assetKind: "image" }), "Picture", "this file is a picture"],
            [fact("E_MODEL_FORMAT_UNSUPPORTED", { format: "fbx" }), "FBX not read", "Export as GLB"],
            [fact("E_MODEL_WEB_PAGE", { host: "example.com" }), "Web page", "example.com"],
            [
                fact("E_MODEL_FETCH", { url: "https://example.com/a.glb", status: 404 }),
                "Not reached",
                "example.com 404",
            ],
            [fact("E_MODEL_FETCH", { hosts: ["a.org", "b.org"] }), "Not reached", "a.org, b.org no answer"],
            [fact("E_MODEL_URL_BLOCKED", { url: "not a url" }), "Blocked", "not a url"],
            [
                fact("E_MODEL_TOO_LARGE", { found: 4200000, what: "triangles", limit: 1000000 }),
                "Too large",
                "4,200,000 triangles over 1,000,000",
            ],
            [fact("E_MODEL_TOO_LARGE", { found: "big", what: "widgets", limit: 2 }), "Too large", "big widgets over 2"],
            [fact("E_MODEL_STRUCTURE", { rule: "delayLoad" }), "Not loaded", "meshes kept in other files"],
            [fact("E_MODEL_STRUCTURE", { rule: "other" }), "Not loaded", "file damaged"],
            [fact("E_MODEL_FORMAT_UNKNOWN", { fileName: "a.txt" }), "Not loaded", "a.txt not a 3D model"],
            [fact("E_MODEL_EXTERNAL_URL"), "Not loaded", "parts on another site; export as GLB"],
            [fact("E_MODEL_DECODER_UNAVAILABLE", { reason: "other" }), "Not loaded", "compression not read"],
            [fact("E_MODEL_PARSE", { format: "obj" }), "Not loaded", "OBJ file damaged"],
            [fact("E_MODEL_ZIP"), "Not loaded", ".zip not opened"],
            [fact("E_MODEL_NAME_TAKEN", { id: "sha-123" }), "Not loaded", "name taken"],
            [fact("E_MODEL_UNKNOWN_ASSET"), "Not loaded", "model not in this project"],
            [fact("E_MODEL_DIGEST_MISMATCH"), "Not loaded", "model in this file damaged"],
            [fact("E_MODEL_PART_REQUIRED", { name: "c.bin" }), "Needed", "c.bin"],
            [fact("W_MODEL_UP_GUESSED"), "Guessed", "up axis guessed from the file"],
            [fact("W_MODEL_HAS_ANIMATIONS"), "Animated", "set Animation to play a clip"],
            [fact("W_MODEL_EXTENSION_IGNORED", { extension: "KHR_x" }), "Drawn opaque", "KHR_x not drawn"],
            [fact("W_MODEL_ANIMATION_UNKNOWN", { name: "Run" }), "No such clip", "Run not in the file"],
            [fact("W_MODEL_ANIMATION_REDUCED", { fps: 30 }), "Animation reduced", "30 frames a second"],
            [fact("W_MODEL_ANIMATION_PARTIAL"), "Partly animated", "shape keys do not move"],
            [fact("W_MODEL_COLOR_IGNORED"), "Color unused", "node color not drawn on the model"],
            [fact("W_MODEL_HEAVY", { nodes: 2000 }), "Heavy", "2,000 nodes"],
            [fact("W_MODEL_BUDGET", { triangles: 50000 }), "Heavy", "50,000 triangles"],
            [fact("W_MODEL_TRANSPARENT"), "See-through", "may overlap wrongly"],
            [fact("W_MODEL_TEXTURES_REDUCED"), "Pictures reduced", "drawn smaller"],
            [fact("W_MODEL_NOT_EMBEDDED"), "Not saved", "named by address only"],
            [fact("W_MODEL_CHANGED", { url: "https://a.org/m.glb" }), "Changed", "https://a.org/m.glb"],
            [
                fact("W_MODEL_PART_SUBSTITUTED", { used: "t/a.png", name: "a.png" }),
                "Substituted",
                "used t/a.png for a.png",
            ],
            [fact("W_MODEL_PART_SKIPPED", { name: "d.png" }), "Without 1", "d.png"],
            [fact("W_MODEL_PART_UNUSED", { fileName: "e.txt" }), "Not needed", "e.txt"],
            [
                fact("W_MODEL_NOT_KEPT_BY_URL", { url: "https://a.org/m.gltf" }),
                "Saved files",
                "https://a.org/m.gltf parts from several places",
            ],
            [fact("E_MODEL_SOMETHING_NEW"), "Not loaded", "E_MODEL_SOMETHING_NEW"],
        ];
        for (const [each, word, tip] of cases) {
            assert.deepEqual(modelChip(each), { word, tip }, each.code);
        }
    });

    it("says a problem in one line", () => {
        assert.equal(chipLine(fact("E_MODEL_URL_BLOCKED", { host: "x.org" })), "Blocked: x.org");
    });

    it("counts several parts as one chip", () => {
        assert.isUndefined(countChip([]));
        assert.deepEqual(
            countChip([fact("W_MODEL_PART_SKIPPED", { name: "a" }), fact("W_MODEL_PART_SKIPPED", { name: "b" })]),
            {
                word: "Without 2",
                tip: "a, b",
            },
        );
        assert.deepEqual(
            countChip([fact("E_MODEL_MISSING_FILE", { name: "a" }), fact("E_MODEL_PART_AMBIGUOUS", { name: "b" })]),
            { word: "2 missing", tip: "a, b" },
        );
        assert.deepEqual(countChip([fact("E_MODEL_AMBIGUOUS", { candidates: ["x", "y"] })]), {
            word: "2 models",
            tip: "x, y",
        });
    });

    it("lists the parts only a refused model waits for", () => {
        const missing = fact("E_MODEL_MISSING_FILE", { name: "a.bin" });
        assert.deepEqual(waitingParts(undefined), []);
        assert.deepEqual(waitingParts(change("drawn", [missing])), []);
        assert.deepEqual(waitingParts(change("rejected", [missing, fact("E_MODEL_ZIP")])), [missing]);
    });

    it("lines the Model settings tooltip with skipped parts, a refusal and unused parts", () => {
        assert.deepEqual(modelProblemLines(undefined), []);
        assert.deepEqual(
            modelProblemLines(
                change("drawn", [
                    fact("W_MODEL_PART_SKIPPED", { name: "a.png" }),
                    fact("W_MODEL_PART_UNUSED", { fileName: "b.txt" }),
                    fact("W_MODEL_PART_SUBSTITUTED", { used: "x", name: "y" }),
                ]),
            ),
            ["Without 1: a.png", "Not needed: b.txt"],
        );
        assert.deepEqual(modelProblemLines(change("rejected", [fact("E_MODEL_ZIP")])), ["Not loaded: .zip not opened"]);
        // A model waiting for parts: the Parts button says them, so no refusal line.
        assert.deepEqual(
            modelProblemLines(
                change("rejected", [fact("E_MODEL_MISSING_FILE", { name: "a.bin" }), fact("E_MODEL_ZIP")]),
            ),
            [],
        );
    });

    it("names a part's role in one word", () => {
        const roles: [unknown, string][] = [
            ["model", "Model"],
            ["other", "Not used"],
            ["geometry", "Mesh"],
            ["materials", "Materials"],
            ["texture", "Texture"],
            ["sound", "Part"],
            [undefined, "Part"],
        ];
        for (const [role, word] of roles) {
            assert.equal(roleWord(role as Parameters<typeof roleWord>[0]), word);
        }
    });

    it("chips a part only when it is not as named", () => {
        const part = (state: string, name: string, file?: string): Parameters<typeof partChip>[0] =>
            ({ name, role: "texture", state, file }) as Parameters<typeof partChip>[0];
        assert.deepEqual(partChip(part("missing", "tex/a.png")), {
            word: "Missing",
            tip: "a.png is not among the files",
        });
        assert.deepEqual(partChip(part("ambiguous", "a.png")), {
            word: "Which file?",
            tip: "more than one file could be a.png",
        });
        assert.isUndefined(partChip(part("substituted", "tex/a.png", "other/a.png")));
        assert.deepEqual(partChip(part("substituted", "tex/a.png", "other/b.png")), {
            word: "Substituted",
            tip: "used other/b.png for tex/a.png",
        });
        assert.deepEqual(partChip(part("substituted", "a.png")), { word: "Substituted", tip: "used  for a.png" });
        assert.deepEqual(partChip(part("skipped", "a/b.png")), { word: "Skipped", tip: "drawn without b.png" });
        assert.isUndefined(partChip(part("found", "a.png")));
    });

    it("cuts a long path in its middle", () => {
        assert.equal(middleCut("short.png"), "short.png");
        const cut = middleCut("Textures/very/deep/folder/colormap.png");
        assert.equal(cut.length, 24);
        assert.equal(cut, "Textures.../colormap.png");
    });
});
