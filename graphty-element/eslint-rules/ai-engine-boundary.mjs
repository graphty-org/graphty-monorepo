/**
 * The AI engine boundary, as ESLint blocks: graphty-element talks to a model only through its
 * engine seam (src/ai/engine/), so no file but the adapter folder imports an AI framework or a
 * provider SDK, and only src/ai/engine/load.ts loads the adapter
 * (design/ai/tanstack-ai-harness-design.md, section 7, rules 4 and 5).
 *
 * - Framework and vendor packages (tools/ai-framework-packages.mjs): static imports, `import()`,
 *   `import("x").T` types and `vi.mock`/`vi.doMock` of them are refused everywhere but
 *   src/ai/engine/tanstack/ and test/ai/engine/tanstack/.
 * - Inside the adapter, TanStack is imported by name only: `chat`, `generateTranscription`,
 *   `generateSpeech`, the adapter factories, and message and event types (the `EventType` enum
 *   among them). Middleware, agents,
 *   persistence and every other TanStack package are refused, so the loop, policies and plans stay
 *   graphty code.
 * - The adapter folder is imported only by load.ts, and under src/ai/ every `import()` names a
 *   literal module, so nothing loads a framework by a computed name.
 * - The AI SDK 5 (`ai`, `@ai-sdk/*`) is refused everywhere: the TanStack engine replaced it, and its
 *   peers stay declared, unused, until the next major. WebLlmProvider and its tests may import
 *   WebLLM, the in-browser engine.
 *
 * ESLint keeps only the last setting of a rule for a file, so every block here carries the whole
 * rule: the root's restricted imports (zod) and the package's restricted syntax (layers) too.
 * eslint-rules/ai-engine-boundary.test.mjs plants each violation and checks it is refused.
 */

import { frameworkSpecifierSource } from "../../tools/ai-framework-packages.mjs";

const FAMILIES = ["ai-sdk", "tanstack", "vendor", "webllm"];

/** WebLLM, the in-browser engine, is loaded by WebLlmProvider; these files are it and its tests. */
export const WEBLLM_FILES = [
    "src/ai/providers/WebLlmProvider.ts",
    "test/ai/providers/WebLlmProvider*.test.ts",
    "test/ai/providers/loadWebLlmProvider.test.ts",
    "test/browser/ai/enable-webllm.test.ts",
];

/** The adapter folder, and its tests. */
export const ADAPTER_FILES = ["src/ai/engine/tanstack/**/*.ts"];
export const ADAPTER_TEST_FILES = ["test/ai/engine/tanstack/**/*.ts"];
/** The one module that loads the adapter. */
export const LOADER_FILE = "src/ai/engine/load.ts";

/** A relative import of a folder named tanstack: the adapter. */
const ADAPTER_SPECIFIER = String.raw`^\.{1,2}\/(?:.*\/)?tanstack(?:\/|$)`;

const FRAMEWORK_MESSAGE =
    "AI framework and provider packages are imported only in src/ai/engine/tanstack/ (and its tests); " +
    "everything else talks to a model through AiEngine (src/ai/engine/types.ts).";
const ADAPTER_MESSAGE = "The AI adapter folder is loaded only by src/ai/engine/load.ts, with import().";

const ESCAPED_SLASH = String.raw`\/`;

/**
 * An esquery regular expression literal from a regular expression source.
 * @param source - The source.
 * @returns The literal, `/` escaped.
 */
const literal = (source) => `/${source.replaceAll(/(?<!\\)\//g, ESCAPED_SLASH)}/`;

/**
 * The two rules for one group of files.
 * @param options - What the group may do.
 * @param options.allow - The framework families it may import.
 * @param options.loader - Whether it may import the adapter folder.
 * @param options.anyImport - Whether `import()` may name a computed module (false under src/ai/).
 * @param options.named - Whether TanStack is restricted to its named imports (the adapter).
 * @param base - The inherited settings.
 * @param base.importPatterns - The root's restricted-import patterns.
 * @param base.syntax - The package's restricted-syntax entries.
 * @returns The rules.
 */
function rules({ allow = [], loader = false, anyImport = true, named = false }, { importPatterns, syntax }) {
    const banned = frameworkSpecifierSource(FAMILIES.filter((f) => !allow.includes(f)));
    const patterns = [...importPatterns, { regex: banned, message: FRAMEWORK_MESSAGE }];
    const selectors = [
        ...syntax,
        { selector: `ImportExpression[source.value=${literal(banned)}]`, message: FRAMEWORK_MESSAGE },
        { selector: `TSImportType[argument.literal.value=${literal(banned)}]`, message: FRAMEWORK_MESSAGE },
        {
            selector: `CallExpression[callee.object.name="vi"][callee.property.name=/^(?:mock|doMock)$/][arguments.0.value=${literal(banned)}]`,
            message: FRAMEWORK_MESSAGE,
        },
    ];
    if (!loader) {
        patterns.push({ regex: ADAPTER_SPECIFIER, message: ADAPTER_MESSAGE });
        selectors.push({
            selector: `ImportExpression[source.value=${literal(ADAPTER_SPECIFIER)}]`,
            message: ADAPTER_MESSAGE,
        });
    }
    if (!anyImport) {
        selectors.push({
            selector: 'ImportExpression[source.type!="Literal"]',
            message: "Under src/ai/, import() names a literal module, so no framework is loaded by a computed name.",
        });
    }
    if (named) {
        const message =
            "Inside the adapter, TanStack is imported by name: chat, generateTranscription, generateSpeech, the adapter " +
            "factories, and message and event types. Loop, policies, plans, agents and persistence are graphty code.";
        patterns.push(
            {
                regex: String.raw`^@tanstack\/ai$`,
                allowImportNamePattern: String.raw`^(?:chat|generateTranscription|generateSpeech|EventType|[A-Z]\w*(?:Message|Chunk|Event)(?:Type)?)$`,
                message,
            },
            {
                regex: String.raw`^@tanstack\/ai-(?:openai|anthropic|gemini)$`,
                allowImportNamePattern: String.raw`^(?:create[A-Z]\w*|[A-Z]\w*(?:Config|ProviderOptions|Message|Chunk|Event))$`,
                message,
            },
            { regex: String.raw`^@tanstack\/(?!ai$|ai-openai$|ai-anthropic$|ai-gemini$)`, message },
        );
    }
    return {
        "no-restricted-imports": ["error", { patterns }],
        "no-restricted-syntax": ["error", ...selectors],
    };
}

/**
 * The boundary's blocks, for the package's ESLint config.
 * @param rootConfig - The root config, whose restricted-import patterns every block keeps.
 * @param syntax - The package's own restricted-syntax entries, which every block keeps.
 * @returns The blocks, in order: later ones narrow earlier ones.
 */
export function aiEngineBoundary(rootConfig, syntax) {
    const importPatterns = rootConfig.flatMap((block) => {
        const rule = block.rules?.["no-restricted-imports"];
        return Array.isArray(rule) ? (rule[1]?.patterns ?? []) : [];
    });
    const base = { importPatterns, syntax };
    return [
        { name: "ai-engine-boundary/everywhere", files: ["**/*.ts", "**/*.tsx"], rules: rules({}, base) },
        { name: "ai-engine-boundary/src-ai", files: ["src/ai/**/*.ts"], rules: rules({ anyImport: false }, base) },
        {
            name: "ai-engine-boundary/loader",
            files: [LOADER_FILE],
            rules: rules({ loader: true, anyImport: false }, base),
        },
        {
            name: "ai-engine-boundary/webllm",
            files: WEBLLM_FILES,
            rules: rules({ allow: ["webllm"], anyImport: false }, base),
        },
        {
            name: "ai-engine-boundary/adapter",
            files: ADAPTER_FILES,
            rules: rules({ allow: ["tanstack", "vendor"], loader: true, anyImport: false, named: true }, base),
        },
        {
            name: "ai-engine-boundary/adapter-tests",
            files: ADAPTER_TEST_FILES,
            rules: rules({ allow: ["tanstack", "vendor"], loader: true }, base),
        },
    ];
}
