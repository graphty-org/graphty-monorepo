import type { Plugin } from "vite";

/**
 * Stubs the Anthropic SDK's Node-only agent toolset with an empty module, for every build that
 * compiles graphty-element's source.
 * @returns The plugin.
 */
export declare function stubAnthropicNodeToolset(): Plugin;
