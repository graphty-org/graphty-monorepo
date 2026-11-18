/**
 * Safari (WebKit) evaluates every override-expression again when the compute pipeline is created, with the
 * evaluator in Source/WebGPU/WGSL/WGSL.cpp (`evaluate`), and that evaluator resolves a call only through the
 * builtin overload table. `bitcast` is not in that table (WebKit type-checks it inline, TypeCheck.cpp
 * `TypeChecker::bitcast`), so a statement-level expression whose value depends only on overrides and constants --
 * or an override's initializer -- that contains a `bitcast` fails `createComputePipeline` with "Failed to evaluate
 * override value", even though the module compiled. Dawn (Chromium) evaluates it fine, so no Chromium lane sees it.
 * Issue #8215: `select(1u, bitcast<u32>(1.0), SCALED)` in bc-finalize broke GPU betweenness on every Safari.
 *
 * The guard is textual and conservative: in every composed kernel (each override-matrix case, with and without
 * subgroups), no statement that names an override contains a `bitcast`. A bitcast of a constant is written as its
 * hex literal instead (the f32 1.0 is 0x3f800000u). See also ComposedModule.constants in src/kernel/wgsl.ts.
 */

import { composeWgsl } from "../../src/kernel/wgsl.js";
import { kernelSpec } from "../../src/kernels.js";
import { CAPS_LAVAPIPE, CAPS_SPEC_DEFAULT } from "../helpers/caps-tables.js";
import { OVERRIDE_MATRIX } from "../helpers/override-matrix.js";

/** The composed texts of every matrix case on both subgroup settings, one per distinct text. */
function composedTexts(): Map<string, string> {
    const texts = new Map<string, string>();
    for (const c of OVERRIDE_MATRIX) {
        for (const caps of [CAPS_SPEC_DEFAULT, CAPS_LAVAPIPE]) {
            const { code } = composeWgsl(kernelSpec(c.id, c.overrides, c.snippets), caps);
            texts.set(code, c.id);
        }
    }
    return texts;
}

/**
 * The statements of a WGSL text that name an override and call bitcast.
 * @param code - a composed module
 * @returns the offending statements, trimmed
 */
function overrideBitcasts(code: string): string[] {
    const stripped = code.replace(/\/\/[^\n]*/g, "");
    const names = [...stripped.matchAll(/\boverride\s+(\w+)/g)].map((m) => m[1]);
    if (names.length === 0) {
        return [];
    }
    const named = new RegExp(`\\b(${names.join("|")})\\b`);
    return stripped
        .split(/[;{}]/)
        .map((s) => s.trim())
        .filter((s) => /\bbitcast\s*</.test(s) && named.test(s));
}

describe("override-expressions Safari can evaluate (issue #8215)", () => {
    it("flags a bitcast beside an override, and an override initializer with a bitcast", () => {
        expect(overrideBitcasts("override S: bool = false;\nfn f() { x = select(1u, bitcast<u32>(1.0), S); }")).toEqual(
            ["x = select(1u, bitcast<u32>(1.0), S)"],
        );
        expect(overrideBitcasts("override A: u32 = bitcast<u32>(1.0);")).toHaveLength(1);
        expect(overrideBitcasts("override S: bool = false;\nfn f() { x = select(1u, 0x3f800000u, S); }")).toEqual([]);
    });

    it("no composed kernel puts a bitcast in a statement that names an override", () => {
        const offenders: string[] = [];
        for (const [code, id] of composedTexts()) {
            for (const statement of overrideBitcasts(code)) {
                offenders.push(`${id}: ${statement}`);
            }
        }
        expect(offenders).toEqual([]);
    });
});
