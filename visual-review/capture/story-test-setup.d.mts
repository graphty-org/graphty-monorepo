// Types for story-test-setup.mjs (@graphty/visual-review/vitest/setup), for TypeScript setup files.

export function installVisualStoryTest(options: {
    afterEach: unknown;
    beforeEach: unknown;
    vi?: unknown;
    commands: unknown;
}): void;

export function modeGlobals(
    storyGlobals?: Record<string, unknown>,
    mode?: Record<string, unknown>,
    project?: {
        globalTypes?: Record<string, { defaultValue?: unknown }>;
        initialGlobals?: Record<string, unknown>;
    },
): Record<string, unknown>;
