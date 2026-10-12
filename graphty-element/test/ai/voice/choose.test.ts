/**
 * @file The `"auto"` voice rules of the harness design (section 5.5), one row per case: which
 * path speech in and speech out take, where the audio goes, and the reason when neither can.
 */

import { assert, describe, it } from "vitest";

import { chooseInput, chooseOutput, chooseVoice, type VoiceFacts } from "../../../src/ai/voice/choose";

/** Chrome on a desktop with the microphone allowed and an OpenAI key: every path open. */
const CHROME: VoiceFacts = {
    secureContext: true,
    microphone: true,
    permission: "granted",
    recognition: "untried",
    onDevice: "none",
    synthesis: true,
    synthesisLocal: false,
    transcription: "ready",
    speech: "ready",
    immersive: false,
};

/** A row: the facts that differ from Chrome's, the mode, and the path expected. */
interface Row {
    name: string;
    facts?: Partial<VoiceFacts>;
    mode?: "auto" | "browser" | "provider" | "off";
    expected: { path: string; destination?: string; status?: string; reason?: string };
}

/**
 * Check one row against a rule.
 * @param rule - `chooseInput` or `chooseOutput`.
 * @param row - The row.
 */
function check(rule: typeof chooseInput, row: Row): void {
    const got = rule(row.mode ?? "auto", { ...CHROME, ...row.facts });
    assert.strictEqual(got.path, row.expected.path, row.name);
    if (row.expected.reason === undefined) {
        assert.isUndefined(got.code, row.name);
    } else {
        assert.strictEqual(got.code, "AI_VOICE_UNAVAILABLE", row.name);
        assert.strictEqual(got.params?.reason, row.expected.reason, row.name);
        assert.strictEqual(got.status, "unavailable", row.name);
    }

    if (row.expected.destination !== undefined) {
        assert.strictEqual(got.destination, row.expected.destination, row.name);
    }

    if (row.expected.status !== undefined) {
        assert.strictEqual(got.status, row.expected.status, row.name);
    }
}

describe("speech in", () => {
    const rows: Row[] = [
        {
            name: "Chrome: its recognition, at Google",
            expected: { path: "browser", destination: "browser-vendor", status: "ready" },
        },
        {
            name: "Chrome with processLocally available: on the device first",
            facts: { onDevice: "process-locally", recognition: "works" },
            expected: { path: "browser", destination: "on-device" },
        },
        {
            name: "Safari and visionOS: on the device",
            facts: { onDevice: "always" },
            expected: { path: "browser", destination: "on-device" },
        },
        {
            name: "microphone not asked yet: usable, needs permission",
            facts: { permission: "prompt" },
            expected: { path: "browser", status: "needs-permission" },
        },
        {
            name: "Firefox (no recognition): provider transcription",
            facts: { recognition: "none" },
            expected: { path: "provider", destination: "provider" },
        },
        {
            name: "Quest (constructor present, first start failed): provider transcription",
            facts: { recognition: "fails" },
            expected: { path: "provider", destination: "provider" },
        },
        {
            name: "no recognition, Anthropic without a transcription provider",
            facts: { recognition: "none", transcription: "unsupported" },
            expected: { path: "none", reason: "no-provider-transcription" },
        },
        {
            name: "no recognition, a transcription provider with no key",
            facts: { recognition: "fails", transcription: "no-key" },
            expected: { path: "none", reason: "no-key" },
        },
        {
            name: "an insecure page",
            facts: { secureContext: false, microphone: false },
            expected: { path: "none", reason: "insecure-context" },
        },
        { name: "no microphone", facts: { microphone: false }, expected: { path: "none", reason: "no-microphone" } },
        {
            name: "microphone refused",
            facts: { permission: "denied" },
            expected: { path: "none", reason: "permission-denied" },
        },
        {
            name: "browser asked, recognition failed",
            mode: "browser",
            facts: { recognition: "fails" },
            expected: { path: "none", reason: "no-recognition" },
        },
        { name: "browser asked, recognition works", mode: "browser", expected: { path: "browser" } },
        { name: "provider asked: never the browser", mode: "provider", expected: { path: "provider" } },
        {
            name: "provider asked, provider cannot",
            mode: "provider",
            facts: { transcription: "unsupported" },
            expected: { path: "none", reason: "no-provider-transcription" },
        },
        { name: "off", mode: "off", expected: { path: "none" } },
    ];
    for (const row of rows) {
        it(row.name, () => {
            check(chooseInput, row);
        });
    }
});

describe("speech out", () => {
    const rows: Row[] = [
        { name: "auto on a flat page: off", expected: { path: "none" } },
        {
            name: "auto in XR: the browser's synthesis",
            facts: { immersive: true },
            expected: { path: "browser", destination: "browser-vendor", status: "ready" },
        },
        {
            name: "a local default voice stays on the device",
            facts: { immersive: true, synthesisLocal: true },
            expected: { path: "browser", destination: "on-device" },
        },
        {
            name: "auto in XR without synthesis: provider speech",
            facts: { immersive: true, synthesis: false },
            expected: { path: "provider", destination: "provider" },
        },
        {
            name: "auto in XR, no synthesis, Anthropic",
            facts: { immersive: true, synthesis: false, speech: "unsupported" },
            expected: { path: "none", reason: "no-provider-speech" },
        },
        { name: "browser asked on a flat page", mode: "browser", expected: { path: "browser" } },
        {
            name: "browser asked, no synthesis",
            mode: "browser",
            facts: { synthesis: false },
            expected: { path: "none", reason: "no-synthesis" },
        },
        { name: "provider asked", mode: "provider", expected: { path: "provider" } },
        {
            name: "provider asked, no key",
            mode: "provider",
            facts: { speech: "no-key" },
            expected: { path: "none", reason: "no-key" },
        },
        { name: "off in XR", mode: "off", facts: { immersive: true }, expected: { path: "none" } },
    ];
    for (const row of rows) {
        it(row.name, () => {
            check(chooseOutput, row);
        });
    }
});

describe("both directions", () => {
    it("default to auto", () => {
        const support = chooseVoice({}, { ...CHROME, recognition: "none" });
        assert.strictEqual(support.input.path, "provider");
        assert.strictEqual(support.output.path, "none");
    });
});
