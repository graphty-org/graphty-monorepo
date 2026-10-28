/** The Storybook theme colors one theme sets (a subset of Storybook's ThemeVars). */
export interface StorybookBrandColors {
    colorPrimary: string;
    colorSecondary: string;
    appBg: string;
    appContentBg: string;
    appPreviewBg: string;
    appBorderColor: string;
    textColor: string;
    textMutedColor: string;
    barBg: string;
    barTextColor: string;
    barHoverColor: string;
    barSelectedColor: string;
    inputBg: string;
    inputBorder: string;
    inputTextColor: string;
}

/** The graphty brand colors for a Storybook manager theme, by Storybook's `base`. */
export declare const storybookBrandColors: { light: StorybookBrandColors; dark: StorybookBrandColors };
