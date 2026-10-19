/**
 * Stock Mantine components that compact-mantine replaces, as `no-restricted-imports` path entries.
 *
 * Wherever compact-mantine has its own component for a job a stock Mantine component also does,
 * add the pair here. compact-mantine's lint (the root eslint.config.js) and the graphty app's
 * lint both read this list, so a new entry fails an import of the stock component in both.
 * The theme leaves each stock component unstyled, and the README's "Use these instead of
 * Mantine's" table names the replacement for consumers, whose lint this does not reach.
 * @type {{ name: string, importNames: string[], message: string }[]}
 */
export const MANTINE_REPLACEMENTS = [
    {
        name: "@mantine/core",
        importNames: ["ColorInput", "ColorPicker"],
        message: "Use CompactColorInput from @graphty/compact-mantine.",
    },
];
