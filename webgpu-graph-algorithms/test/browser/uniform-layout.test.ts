/**
 * The negative uniform-layout test of spec 5.3 / R-10 on Chromium (G2: "UniformBlock negative test rejected on
 * Chromium"): the WGSL 14.4.5 "Invalid" example (a 4-byte struct-typed member `a: BadInner { x: f32 }` followed by
 * `b: f32` at offset 4; the required gap is roundUp(16, 4) = 16) is rejected by a Chromium WITHOUT
 * `uniform_buffer_standard_layout` and accepted by one WITH it, while UniformBlock's generated text (a flat
 * equivalent) compiles either way -- the reason the generator exists. Twin of test/kernel/uniform-layout.test.ts.
 * MEASURED 2026-09-15 (P2-T1): the installed Playwright 1.63.0 runs Chrome for Testing 153.0.8010.12 (build 1243),
 * which EXPOSES `uniform_buffer_standard_layout`, so the "rejected on Chromium" leg the plan pinned from Chromium 139
 * (Playwright chromium-1181, note 05 section 3.2) cannot be shown here; the test asserts the invariant
 * `accepted === wgslLanguageFeatures.has("uniform_buffer_standard_layout")` and prints the measured facts for G2.
 * MEASURED 2026-09-15 (P2-T1 fix pass, tmp/p2t1/fix/probe-bad.mjs, SwiftShader flag set) across the Playwright
 * headless shells installed on the dev box: Chromium 140 / 143 (builds 1186-1200) list 4 language features without
 * `uniform_buffer_standard_layout` yet ALSO accept the struct, because `--enable-unsafe-webgpu` (Dawn's
 * `allow_unsafe_apis`) relaxes Tint's uniform-layout check before the feature is listed; they reject it with the
 * Tint message "'uniform' storage requires that the number of bytes between the start of the previous member of
 * type struct and the current member be a multiple of 16 bytes" only under `--disable-dawn-features=allow_unsafe_apis`;
 * Chromium 145+ (builds 1208+) list the feature and accept the struct regardless of that toggle. The rejected leg
 * therefore needs BOTH a Chromium <= 143 and that toggle -- an owner decision recorded by P2-T3 (G2), not this file.
 * MEASURED 2026-09-17 (the monorepo landing, PR #11: its Playwright 1.57.0 runs Chromium 143 -- headless shell 1200
 * on Linux / SwiftShader and macOS / Metal, the full build 143.0.0.0 on Windows / WARP): the same four features, the
 * feature unlisted, the struct ACCEPTED, because every BROWSER_FLAGS set carries `--enable-unsafe-webgpu`. The
 * assertion therefore expects acceptance on Chromium < 145 whether or not the feature is listed (144 is unmeasured
 * and sits on that side), requires the feature listed AND accepted on Chromium 145+ (measured 145, 153), and keeps
 * `accepted === listed` on every other engine: WebKit 26.6 (Playwright 1.63, webkit build 2359) lists nothing of the
 * kind and REJECTS the struct ("uniform address space requires ... at least 16 bytes"), the rejected leg of R-10.
 */

import { UniformBlock } from "../../src/kernel/struct-block.js";
import { acquireBrowser, browserGpu, requireBrowserGpu } from "../setup/browser.js";

const BAD_WGSL = `struct BadInner { x: f32 }
struct BadParams { a: BadInner, b: f32, tail: vec4f }
@group(0) @binding(0) var<uniform> P: BadParams;
@group(0) @binding(1) var<storage, read_write> result: array<f32>;
@compute @workgroup_size(1)
fn main() {
    result[0] = P.a.x + P.b + P.tail.w;
}`;

const GOOD = UniformBlock.define("GoodParams", [
    ["v", "vec4f"],
    ["b", "f32"],
    ["tail", "vec4f"],
]);

const GOOD_WGSL = `${GOOD.wgsl}
@group(0) @binding(0) var<uniform> P: GoodParams;
@group(0) @binding(1) var<storage, read_write> result: array<f32>;
@compute @workgroup_size(1)
fn main() {
    result[0] = P.v.x + P.b + P.tail.w;
}`;

/**
 * The Chromium major in navigator.userAgent -- "HeadlessChrome/143.0.7499.4" on Playwright's headless shell,
 * "HeadlessChrome/143.0.0.0" on the full build's reduced UA (the warp set) -- or null on any other engine (WebKit's
 * UA carries no "Chrome/" token: "... Version/26.6 Safari/605.1.15").
 */
function chromiumMajorOf(userAgent: string): number | null {
    const match = /(?:Headless)?Chrome\/(\d+)\./.exec(userAgent);
    return match === null ? null : Number.parseInt(match[1], 10);
}

/**
 * The first Chromium major that lists uniform_buffer_standard_layout (measured 2026-09-15: 145.0.7632.6 / build 1208
 * and 153.0.8010.12 / build 1243 list it; 140 / 143 / builds 1186-1200 do not; 144 unmeasured). Below it, the
 * `--enable-unsafe-webgpu` of every BROWSER_FLAGS set (Dawn's allow_unsafe_apis) makes Tint accept the struct unlisted.
 */
const CHROMIUM_LISTS_UNIFORM_LAYOUT_FROM = 145;

interface CompileOutcome {
    readonly ok: boolean;
    readonly messages: readonly string[];
}

async function compileRaw(device: GPUDevice, code: string, label: string): Promise<CompileOutcome> {
    device.pushErrorScope("validation");
    const module = device.createShaderModule({ label, code });
    const info = await module.getCompilationInfo();
    const messages = info.messages
        .filter((m) => m.type === "error")
        .map((m) => `${m.lineNum}:${m.linePos} ${m.message}`);
    let pipelineError: string | null = null;
    if (messages.length === 0) {
        try {
            await device.createComputePipelineAsync({ label, layout: "auto", compute: { module, entryPoint: "main" } });
        } catch (error) {
            pipelineError = error instanceof Error ? error.message : `non-error thrown (${typeof error})`;
        }
    }
    const scoped = await device.popErrorScope();
    const all = [
        ...messages,
        ...(pipelineError === null ? [] : [pipelineError]),
        ...(scoped === null ? [] : [scoped.message]),
    ];
    return { ok: all.length === 0, messages: all };
}

describe("uniform layout on Chromium: the hand-written misaligned struct follows uniform_buffer_standard_layout, the generated one compiles (spec 5.3, R-10)", () => {
    it("generated offsets are strict", () => {
        expect(GOOD.offsetOf("v")).toBe(0);
        expect(GOOD.offsetOf("b")).toBe(16);
        expect(GOOD.offsetOf("tail")).toBe(32);
        expect(GOOD.byteLength).toBe(48);
    });

    it("the hand-written struct is accepted iff uniform_buffer_standard_layout is exposed (or Chromium < 145 under the unsafe flag); the generated one always compiles", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-uniform-layout" });
        const relaxed = ctx.caps.wgslFeatures.has("uniform_buffer_standard_layout");
        const chromiumMajor = chromiumMajorOf(navigator.userAgent);
        // Chromium < 145 under --enable-unsafe-webgpu (every BROWSER_FLAGS set of vitest.config.ts) accepts the struct
        // without listing the feature; the rejection there needs --disable-dawn-features=allow_unsafe_apis, which no
        // flag set passes (this file cannot read the launch flags, so it encodes the config's invariant)
        const unsafeChromium = chromiumMajor !== null && chromiumMajor < CHROMIUM_LISTS_UNIFORM_LAYOUT_FROM;
        const expectAccepted = relaxed || unsafeChromium;
        const good = await compileRaw(ctx.device, GOOD_WGSL, "browser/uniform-layout/good");
        expect(good.messages).toEqual([]);
        expect(good.ok).toBe(true);
        const bad = await compileRaw(ctx.device, BAD_WGSL, "browser/uniform-layout/bad");
        console.warn(
            `[uniform-layout] runtime=browser gpu=${browserGpu()} chromiumMajor=${chromiumMajor ?? "none"} uniform_buffer_standard_layout=${relaxed} hand-written struct accepted=${bad.ok}${bad.ok ? "" : `: ${bad.messages.join(" | ")}`}`,
        );
        console.warn(
            `[uniform-layout] browser=${navigator.userAgent} wgslLanguageFeatures=${[...ctx.caps.wgslFeatures].sort().join(",")}`,
        );
        if (chromiumMajor !== null && chromiumMajor >= CHROMIUM_LISTS_UNIFORM_LAYOUT_FROM) {
            // 145+ lists the feature (measured 145, 153): a Chromium that stopped listing it is a finding, not a pass
            expect(relaxed, `Chromium ${chromiumMajor} does not list uniform_buffer_standard_layout`).toBe(true);
        }
        // the invariant of spec 5.3 / R-10: a strict-layout runtime rejects the 14.4.5 Invalid struct (with a message),
        // a relaxed one accepts it, and the generated struct compiles on both; Chromium < 145 under the unsafe flag is
        // the measured exception (accepts, lists nothing)
        expect(bad.ok).toBe(expectAccepted);
        if (!expectAccepted) {
            expect(bad.messages.length).toBeGreaterThan(0);
        }
        // the pending-error drain of afterEach must see nothing: every error above was captured by the scope
        await ctx.device.queue.onSubmittedWorkDone();
        expect(ctx.takePendingError()).toBeNull();
    });
});
