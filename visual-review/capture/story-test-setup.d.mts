// Types for story-test-setup.mjs (@graphty/visual-review/vitest/setup), for TypeScript setup files.

export function installVisualStoryTest(options: {
    afterEach: unknown;
    beforeEach: unknown;
    vi?: unknown;
    commands: unknown;
}): void;

export function modeGlobals(
    globals: Record<string, unknown> | undefined,
    forced: Record<string, unknown>,
    mode: Record<string, unknown> | null | undefined,
): Record<string, unknown>;

export function shotsDisagreed(result: { status?: string; flaky?: boolean }): boolean;
