/**
 * The AI framework and provider SDK packages that graphty-element keeps behind its engine seam
 * (graphty-element/src/ai/engine/, design/ai/tanstack-ai-harness-design.md section 7). No public
 * type may name one, no shipped declaration may import one, and only the adapter folder
 * src/ai/engine/tanstack/ may import TanStack or a vendor SDK, so a framework can be swapped
 * without a consumer noticing.
 *
 * The checks that read this list: tools/api-report.mjs (the API reports),
 * tools/check-published-deps.mjs (the packed tarball), graphty-element's ESLint boundary rules
 * (graphty-element/eslint-rules/ai-engine-boundary.mjs), its lazy-chunk test
 * (test/packaging/ai-lazy-chunks.test.ts) and its pin test (test/packaging/ai-pins.test.ts).
 */

/** The packages, by family: what each is allowed to do differs. */
export const FRAMEWORK_FAMILIES = Object.freeze({
    /** The Vercel AI SDK 5, which the assistant runs on until milestone 2 removes it. */
    "ai-sdk": { exact: ["ai"], prefixes: ["@ai-sdk/"] },
    /** TanStack AI and the AG-UI protocol types it streams: the adapter folder only. */
    tanstack: { exact: [], prefixes: ["@tanstack/", "@ag-ui/"] },
    /** The provider SDKs TanStack AI's adapters drive: the adapter folder only. */
    vendor: { exact: ["openai", "@google/genai"], prefixes: ["@anthropic-ai/"] },
    /** WebLLM, the in-browser engine: WebLlmProvider and its tests only. */
    webllm: { exact: [], prefixes: ["@mlc-ai/"] },
});

/** Every family's packages together: the exact names and the scope prefixes. */
export const FRAMEWORK_PACKAGES = Object.freeze({
    exact: Object.values(FRAMEWORK_FAMILIES).flatMap((f) => f.exact),
    prefixes: Object.values(FRAMEWORK_FAMILIES).flatMap((f) => f.prefixes),
});

/**
 * The package an import specifier names.
 * @param specifier - an import specifier
 * @returns the package name ("@scope/name" or "name")
 */
export function packageName(specifier) {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * The family of the package an import specifier names.
 * @param specifier - an import specifier
 * @returns the family, or undefined for a package that is not a framework
 */
export function frameworkFamily(specifier) {
    const name = packageName(specifier);
    return Object.entries(FRAMEWORK_FAMILIES).find(
        ([, f]) => f.exact.includes(name) || f.prefixes.some((p) => name.startsWith(p)),
    )?.[0];
}

/**
 * A regular expression source matching an import specifier of any of the given families, for a
 * rule that takes a pattern (ESLint's).
 * @param families - family names
 * @returns the source, anchored at the start
 */
export function frameworkSpecifierSource(families) {
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const alternatives = families.flatMap((name) => [
        ...FRAMEWORK_FAMILIES[name].exact.map((e) => `${escape(e)}(?:\\/|$)`),
        ...FRAMEWORK_FAMILIES[name].prefixes.map(escape),
    ]);
    return `^(?:${alternatives.join("|")})`;
}
