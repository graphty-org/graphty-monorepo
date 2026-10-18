/**
 * What every package's storybook test project checks about each story beyond its play function
 * (design/storybook/strategy.md, section 4.4): the console errors and uncaught errors it caused,
 * and the accessibility violations @storybook/addon-a11y reported for it.
 *
 * A console error fails nothing yet: in "report" mode each unexpected one is printed as a warning
 * naming the story, so the list of known messages can be settled before "fail" mode turns them
 * into failures. A story that fails on purpose lists what it prints in
 * `parameters.expectedConsoleErrors` (strings matched as substrings, or regular expressions); a
 * message every story of a package prints goes in that package's known list instead.
 *
 * Each story's result is also written to <package>/.storybook-reports/<story id>.json, where
 * tools/check-storybooks.mjs counts the accessibility violations against the package's budget.
 *
 * Browser code, imported by each package's .storybook/vitest.setup.ts (or compact-mantine's own
 * runner). It imports nothing, so it never pulls in a second copy of vitest: the caller passes
 * vitest's hooks and its file-writing command.
 */

/** Where the reports go, relative to the package (the vitest project's root). */
export const REPORTS_DIR = ".storybook-reports";

/**
 * Starts recording console.error calls, uncaught errors and unhandled rejections.
 * @returns stop() restores console.error and returns what was recorded
 */
export function watchConsole() {
    const seen = [];
    const original = console.error;
    console.error = (...args) => {
        seen.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
        original.apply(console, args);
    };
    const onError = (event) => seen.push(String(event.error?.message ?? event.message));
    const onRejection = (event) => seen.push(String(event.reason?.message ?? event.reason));
    globalThis.addEventListener?.("error", onError);
    globalThis.addEventListener?.("unhandledrejection", onRejection);
    return {
        stop() {
            console.error = original;
            globalThis.removeEventListener?.("error", onError);
            globalThis.removeEventListener?.("unhandledrejection", onRejection);
            return seen;
        },
    };
}

/**
 * The messages neither the story nor the package expects.
 * @param messages what was recorded
 * @param expected the story's parameters.expectedConsoleErrors
 * @param known the package's known messages
 * @returns the unexpected messages
 */
export function unexpectedErrors(messages, expected, known = []) {
    const patterns = [...(Array.isArray(expected) ? expected : []), ...known];
    const matches = (message, p) => (p instanceof RegExp ? p.test(message) : message.includes(String(p)));
    return messages.filter((m) => !patterns.some((p) => matches(m, p)));
}

/**
 * How many accessibility violations a story's reports hold (@storybook/addon-a11y's "a11y" report).
 * @param reports the test's meta.reports, as @storybook/addon-vitest records them
 * @returns the number of violations
 */
export function a11yViolationCount(reports) {
    if (!Array.isArray(reports)) return 0;
    return reports
        .filter((r) => r?.type === "a11y")
        .reduce((sum, r) => sum + (Array.isArray(r.result?.violations) ? r.result.violations.length : 0), 0);
}

/**
 * Records one story's console and accessibility result: prints it, writes its report, and in
 * "fail" mode throws on an unexpected console error.
 * @param story the story and what it did
 * @param story.id the story id
 * @param story.messages what watchConsole() recorded
 * @param story.expected its parameters.expectedConsoleErrors
 * @param story.reports its addon reports
 * @param options how to record it
 * @param [options.known] the package's known messages
 * @param [options.mode] "report" prints an unexpected console error, "fail" throws on it
 * @param [options.writeFile] writes a file relative to the package
 */
export async function recordStory({ id, messages, expected, reports }, { known = [], mode = "report", writeFile }) {
    const consoleErrors = unexpectedErrors(messages, expected, known);
    const report = { id, consoleErrors, a11yViolations: a11yViolationCount(reports) };
    if (writeFile) {
        await writeFile(`${REPORTS_DIR}/${id}.json`, `${JSON.stringify(report)}\n`);
    }
    if (consoleErrors.length === 0) return;
    const text = `${id}: ${consoleErrors.length} unexpected console error(s): ${consoleErrors.join(" | ")}`;
    if (mode === "fail") {
        throw new Error(`${text}. A story that fails on purpose lists them in parameters.expectedConsoleErrors.`);
    }
    console.warn(`[story console check, report only] ${text}`);
}

/**
 * Installs the check around every story of a @storybook/addon-vitest project.
 * @param hooks vitest's hooks
 * @param hooks.beforeEach vitest's beforeEach
 * @param hooks.afterEach vitest's afterEach
 * @param options the options of recordStory
 */
export function installStoryChecks({ beforeEach, afterEach }, options) {
    let watcher;
    beforeEach(() => {
        watcher = watchConsole();
    });
    afterEach(async (ctx) => {
        const messages = watcher?.stop() ?? [];
        watcher = undefined;
        const id = ctx.task?.meta?.storyId;
        if (typeof id !== "string") return; // not a story
        await recordStory(
            { id, messages, expected: ctx.story?.parameters?.expectedConsoleErrors, reports: ctx.task.meta.reports },
            options,
        );
    });
}
