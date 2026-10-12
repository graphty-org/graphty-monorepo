#!/usr/bin/env node
/**
 * Writes `docs/guide/ai-provider-features.md`: which provider offers which tool beyond the
 * assistant's own commands (web search, web pages, in-page code), and which transcribes and speaks,
 * from the catalog's `AI_HOSTED_TOOL_CAPABILITIES`, `AI_VOICE_CAPABILITIES` and
 * `AI_PROVIDER_DESCRIPTORS`; and which speech paths each browser and headset offers, from
 * `BROWSER_VOICE` below.
 *
 * Run it after changing those tables, with the package built: `npm run build`, then
 * `node scripts/generate-ai-feature-matrix.mjs`. `test/documentation/ai-provider-features.test.ts`
 * fails while the committed page differs from what this renders from the source table.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Each tool's column heading, by `AiHostedToolId`. */
const TOOL_NAMES = {
    "web-search": "Web search",
    "web-fetch": "Web pages",
    "in-page-code": "In-page code",
};

/**
 * Which speech paths each browser and headset offers (the harness design, section 5.5). Provider
 * transcription and provider speech need only a microphone and audio playback, so they work in
 * every one; the browser's own paths differ, and so does what a live conversation needs (WebRTC
 * for OpenAI; WebSocket and `AudioWorklet` for Google).
 */
const BROWSER_VOICE = [
    [
        "Chrome (desktop, Android)",
        "yes; audio goes to Google, or stays on the device where Chrome offers on-device recognition for the language",
        "yes",
        "yes",
    ],
    ["Edge (desktop)", "yes; audio goes to Microsoft", "yes", "yes"],
    ["Safari (macOS, iOS)", "yes; on the device", "yes", "yes"],
    ["Firefox", "no", "yes", "yes"],
    [
        "Quest Browser",
        "no (it has the API, but recognition fails; the first press finds out and later presses use the provider)",
        "yes (Quest Browser 5.0 and later)",
        "expected (it has WebRTC, WebSocket and AudioWorklet); not yet checked on the device",
    ],
    [
        "Galaxy XR (Chrome)",
        "expected, as Chrome; not yet checked on the device",
        "yes",
        "expected, as Chrome; not yet checked on the device",
    ],
    ["Vision Pro (Safari)", "yes; on the device", "yes", "expected, as Safari; not yet checked on the device"],
];

/**
 * A Markdown table, its columns padded to line up.
 * @param {readonly string[]} header The heading cells.
 * @param {readonly (readonly string[])[]} rows The rows.
 * @returns {string} The table.
 */
function markdownTable(header, rows) {
    const widths = header.map((cell, i) => Math.max(cell.length, ...rows.map((row) => row[i].length)));
    const line = (cells) => `| ${cells.map((cell, i) => cell.padEnd(widths[i])).join(" | ")} |`;
    return [line(header), line(widths.map((width) => "-".repeat(width))), ...rows.map(line)].join("\n");
}

/**
 * One provider's voice cell: the status, and the model that does it.
 * @param {{ status: string; model?: string; viaChatModel?: boolean }} voice One direction, or live.
 * @returns {string} The cell.
 */
function voiceCell(voice) {
    if (voice.viaChatModel === true) {
        return `\`${voice.status}\`, by the chat model`;
    }

    return voice.model === undefined ? `\`${voice.status}\`` : `\`${voice.status}\`, \`${voice.model}\``;
}

/**
 * The page, from the catalog's tables.
 * @param {Readonly<Record<string, Readonly<Record<string, string>>>>} capabilities `AI_HOSTED_TOOL_CAPABILITIES`.
 * @param {readonly { id: string; plainName: string }[]} providers `AI_PROVIDER_DESCRIPTORS`, in their order.
 * @param {readonly string[]} tools `AI_HOSTED_TOOL_IDS`.
 * @param {Readonly<Record<string, { transcription: { status: string; model?: string; viaChatModel?: boolean }; speech: { status: string; model?: string }; live?: { status: string; model?: string } }>>} voice `AI_VOICE_CAPABILITIES`.
 * @returns {string} The Markdown page.
 */
export function renderAiFeatureMatrix(capabilities, providers, tools, voice) {
    const header = ["Provider", ...tools.map((tool) => `${TOOL_NAMES[tool] ?? tool} (\`${tool}\`)`)];
    const rows = providers.map((provider) => [
        `${provider.plainName} (\`"${provider.id}"\`)`,
        ...tools.map((tool) => `\`${capabilities[provider.id]?.[tool] ?? "unknown"}\``),
    ]);
    const table = markdownTable(header, rows);
    const voiceTable = markdownTable(
        ["Provider", "Transcription (speech in)", "Speech (speech out)", "Live conversation (speech to speech)"],
        providers.map((provider) => [
            `${provider.plainName} (\`"${provider.id}"\`)`,
            voiceCell(voice[provider.id]?.transcription ?? { status: "unknown" }),
            voiceCell(voice[provider.id]?.speech ?? { status: "unknown" }),
            voiceCell(voice[provider.id]?.live ?? { status: "unsupported" }),
        ]),
    );
    const browserTable = markdownTable(
        ["Browser", "Browser recognition (speech in)", "Browser speech (speech out)", "Live conversation"],
        BROWSER_VOICE,
    );

    return `<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT AI_HOSTED_TOOL_CAPABILITIES OR AI_VOICE_CAPABILITIES in graphty-element/src/catalog/ai.ts AND RUN graphty-element/scripts/generate-ai-feature-matrix.mjs -->

# AI Provider Features

Which provider can use which of the [assistant's](./ai-assistant) tools beyond its own commands:
web search, reading web pages, and running code in the page. Switch each on in \`tools\` (see
[Web search, web pages and code](./ai-assistant#web-search-web-pages-and-code)).

${table}

- \`available\`: the assistant offers the tool when you switch it on.
- \`unsupported\`: the provider has no such tool. Switched on, it is left out and reported on
  \`ai-capability-unavailable\`, or with \`required: true\` every command resolves
  \`AI_HOSTED_TOOL_UNSUPPORTED\`.
- \`results-not-returned\`: the provider runs the tool but does not hand its results back, so the
  assistant cannot show sources or keep web content from driving changes; it is left out as above.
- \`unknown\`: the assistant cannot tell; treat it as not available.

The table is \`AI_HOSTED_TOOL_CAPABILITIES\` in \`@graphty/graphty-element/catalog\`. Some models
differ from their provider's row (older or audio models without web search, for instance):
\`aiHostedToolStatus(provider, model, tool)\` reads the table for one model, and
\`getAiCapabilities()\` says what the running assistant can use. In-page code is also unavailable
in \`@graphty/graphty-element/bundle\` and on a page whose content security policy does not allow
\`'wasm-unsafe-eval'\`, which only \`getAiCapabilities()\` can tell.

The mock provider runs no web tools, so a test or story on it cannot show web search; it can run
code.

## Voice

Which provider can hear the reader and speak the answer itself (see
[Voice](./ai-assistant#voice)), and which can hold a
[live conversation](./ai-assistant#live-conversation), speech to speech. A provider without
transcription can still be spoken to through the browser's recognition, or through another
provider's (\`voice.transcription\`); one without speech can answer through the browser's. On a
provider without live, \`mode: "live"\` runs turn by turn and says why.

${voiceTable}

The table is \`AI_VOICE_CAPABILITIES\` in \`@graphty/graphty-element/catalog\`, and
\`aiVoiceStatus(provider, "input" | "output")\` reads it; each live model is the default of
\`voice.liveModel\`. Google's speech model is a preview model.

Which of the browser's own speech paths each browser and headset offers. Provider transcription
and provider speech work in all of them: they need only a microphone and audio playback. A live
conversation needs WebRTC (OpenAI) or WebSocket and \`AudioWorklet\` (Google).

${browserTable}

\`getAiVoiceSupport()\` says which path the running page would take, and where the audio goes;
its \`live\` says whether a live conversation can run there.
`;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
    const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    let catalog;
    try {
        catalog = await import(pathToFileURL(resolve(packageRoot, "dist/catalog.js")).href);
    } catch (cause) {
        throw new Error("Cannot read dist/catalog.js. Run `npm run build` before this script.", { cause });
    }

    const page = renderAiFeatureMatrix(
        catalog.AI_HOSTED_TOOL_CAPABILITIES,
        catalog.AI_PROVIDER_DESCRIPTORS,
        catalog.AI_HOSTED_TOOL_IDS,
        catalog.AI_VOICE_CAPABILITIES,
    );
    writeFileSync(resolve(packageRoot, "docs/guide/ai-provider-features.md"), page);
}
