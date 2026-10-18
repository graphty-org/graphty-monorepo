/** Where the story reports go, relative to the package. */
export declare const REPORTS_DIR: string;

/** What recordStory and installStoryChecks take. */
export interface StoryCheckOptions {
    /** Messages every story of the package prints, as substrings or patterns. */
    known?: readonly (string | RegExp)[];
    /** "report" prints an unexpected console error; "fail" throws on it. */
    mode?: "report" | "fail";
    /** Writes a file relative to the package (vitest's `commands.writeFile`). */
    writeFile?: (path: string, text: string) => Promise<void>;
}

/** Starts recording console.error calls, uncaught errors and unhandled rejections. */
export declare function watchConsole(): { stop(): string[] };

/** The messages neither the story's expectedConsoleErrors nor the package's known list matches. */
export declare function unexpectedErrors(
    messages: readonly string[],
    expected: unknown,
    known?: readonly (string | RegExp)[],
): string[];

/** How many accessibility violations a story's addon reports hold. */
export declare function a11yViolationCount(reports: unknown): number;

/** Records one story's console and accessibility result. */
export declare function recordStory(
    story: { id: string; messages: readonly string[]; expected: unknown; reports: unknown },
    options: StoryCheckOptions,
): Promise<void>;

/** Installs the check around every story of a @storybook/addon-vitest project. */
export declare function installStoryChecks(
    hooks: {
        beforeEach: (fn: () => void) => void;
        afterEach: (fn: (ctx: unknown) => Promise<void>) => void;
    },
    options: StoryCheckOptions,
): void;
