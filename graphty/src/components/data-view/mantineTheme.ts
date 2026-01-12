/**
 * Custom themes for @redheadphone/react-json-grid that use Mantine CSS variables.
 * Separate light and dark themes are provided for explicit color scheme support.
 */

/** Dark theme using Mantine dark palette CSS variables */
export const mantineJsonGridDarkTheme = {
    bgColor: "var(--mantine-color-dark-7)",
    borderColor: "var(--mantine-color-dark-5)",
    cellBorderColor: "var(--mantine-color-dark-6)",
    keyColor: "var(--mantine-color-gray-1)",
    indexColor: "var(--mantine-color-gray-5)",
    numberColor: "var(--mantine-color-blue-4)",
    booleanColor: "var(--mantine-color-cyan-4)",
    stringColor: "var(--mantine-color-green-4)",
    objectColor: "var(--mantine-color-gray-3)",
    tableHeaderBgColor: "var(--mantine-color-dark-6)",
    tableIconColor: "var(--mantine-color-gray-3)",
    selectHighlightBgColor: "var(--mantine-color-blue-9)",
    searchHighlightBgColor: "var(--mantine-color-yellow-9)",
};

/** Light theme using Mantine light palette CSS variables */
export const mantineJsonGridLightTheme = {
    bgColor: "var(--mantine-color-gray-0)",
    borderColor: "var(--mantine-color-gray-3)",
    cellBorderColor: "var(--mantine-color-gray-2)",
    keyColor: "var(--mantine-color-dark-7)",
    indexColor: "var(--mantine-color-gray-6)",
    numberColor: "var(--mantine-color-blue-7)",
    booleanColor: "var(--mantine-color-cyan-7)",
    stringColor: "var(--mantine-color-green-7)",
    objectColor: "var(--mantine-color-gray-7)",
    tableHeaderBgColor: "var(--mantine-color-gray-1)",
    tableIconColor: "var(--mantine-color-gray-7)",
    selectHighlightBgColor: "var(--mantine-color-blue-1)",
    searchHighlightBgColor: "var(--mantine-color-yellow-3)",
};

