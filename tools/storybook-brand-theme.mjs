// The graphty brand colors for a Storybook manager theme, light and dark, from the brand kit
// (github.com/graphty-org/brand, colors/tokens.json and the README's "Color" rules). Every branded
// Storybook's .storybook/manager.ts spreads one of these into `create({ base, ... })`.
//
// Storybook draws the selected sidebar story, solid buttons and badges as white text on
// colorSecondary, in the dark theme too, so colorSecondary is lime 700 (#588300) in both themes:
// the one brand lime that takes a white label (4.51:1). The bright lime #c4f23a goes where the
// dark theme draws lime on its own dark background (the toolbar's selected and hovered tab).
// Lime is never small text on white: light-theme accent text is #588300.
//
// Contrast ratios for every pair: tools/storybook-brand-theme.test.mjs (node --test).

const lime = "#c4f23a";
const olive = "#588300";

export const storybookBrandColors = {
    light: {
        colorPrimary: olive,
        colorSecondary: olive,
        appBg: "#ffffff",
        appContentBg: "#ffffff",
        appPreviewBg: "#ffffff",
        appBorderColor: "#dfe1e7",
        textColor: "#14161f",
        textMutedColor: "#2a3045",
        barBg: "#ffffff",
        barTextColor: "#2a3045",
        barHoverColor: olive,
        barSelectedColor: olive,
        inputBg: "#ffffff",
        inputBorder: "#7a8296",
        inputTextColor: "#14161f",
    },
    dark: {
        colorPrimary: lime,
        colorSecondary: olive,
        appBg: "#111111",
        appContentBg: "#181a21",
        appPreviewBg: "#111111",
        appBorderColor: "#2c3040",
        textColor: "#f2f3f7",
        textMutedColor: "#9aa3b8",
        barBg: "#181a21",
        barTextColor: "#9aa3b8",
        barHoverColor: lime,
        barSelectedColor: lime,
        inputBg: "#111111",
        inputBorder: "#646c80",
        inputTextColor: "#f2f3f7",
    },
};
