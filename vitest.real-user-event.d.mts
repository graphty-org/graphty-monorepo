// Types for vitest.real-user-event.mjs, for TypeScript setup files.

/** `storybook/test`'s exports with `userEvent` driving real input, unless the page is a capture. */
export declare function withRealUserEvent<T>(storybookTest: T, real: unknown): T;
