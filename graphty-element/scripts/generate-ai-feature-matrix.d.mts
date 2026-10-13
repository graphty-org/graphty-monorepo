/** One direction of a provider's voice, as `AI_VOICE_CAPABILITIES` lists it. */
interface VoiceDirection {
    readonly status: string;
    readonly model?: string;
    readonly viaChatModel?: boolean;
}

/**
 * The provider features page, from the catalog's tables.
 * @param capabilities - `AI_HOSTED_TOOL_CAPABILITIES`.
 * @param providers - `AI_PROVIDER_DESCRIPTORS`, in their order.
 * @param tools - `AI_HOSTED_TOOL_IDS`.
 * @param voice - `AI_VOICE_CAPABILITIES`.
 * @returns The Markdown page.
 */
export function renderAiFeatureMatrix(
    capabilities: Readonly<Record<string, Readonly<Record<string, string>>>>,
    providers: readonly { readonly id: string; readonly plainName: string }[],
    tools: readonly string[],
    voice: Readonly<Record<string, { readonly transcription: VoiceDirection; readonly speech: VoiceDirection }>>,
): string;
