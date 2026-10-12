/**
 * The provider-by-tool page, from the catalog's tables.
 * @param capabilities - `AI_HOSTED_TOOL_CAPABILITIES`.
 * @param providers - `AI_PROVIDER_DESCRIPTORS`, in their order.
 * @param tools - `AI_HOSTED_TOOL_IDS`.
 * @returns The Markdown page.
 */
export function renderAiFeatureMatrix(
    capabilities: Readonly<Record<string, Readonly<Record<string, string>>>>,
    providers: readonly { readonly id: string; readonly plainName: string }[],
    tools: readonly string[],
): string;
