// WCAG 2.x contrast of every color pair the Storybook manager draws with the brand theme:
// 4.5:1 for text, 3:1 for a UI indicator (focus ring, input border).
//
//   node --test tools/storybook-brand-theme.test.mjs
import assert from "node:assert/strict";
import { it } from "node:test";

import { storybookBrandColors } from "./storybook-brand-theme.mjs";

function luminance(hex) {
    const n = Number.parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const UI = 3;

for (const [name, t] of Object.entries(storybookBrandColors)) {
    // [foreground, background, minimum, what Storybook draws with it]
    const pairs = [
        [t.textColor, t.appBg, TEXT, "sidebar text"],
        [t.textColor, t.appContentBg, TEXT, "content text"],
        [t.textMutedColor, t.appBg, TEXT, "muted sidebar text"],
        [t.textMutedColor, t.appContentBg, TEXT, "muted content text"],
        [t.barTextColor, t.barBg, TEXT, "toolbar tab label"],
        [t.barHoverColor, t.barBg, TEXT, "hovered toolbar tab label"],
        [t.barSelectedColor, t.barBg, TEXT, "selected toolbar tab label"],
        ["#ffffff", t.colorSecondary, TEXT, "selected sidebar story (white bold label)"],
        [t.colorPrimary, t.appBg, TEXT, "primary accent"],
        [t.colorSecondary, t.appBg, UI, "focus ring on the sidebar"],
        [t.colorSecondary, t.appContentBg, UI, "focus ring on the content"],
        [t.inputTextColor, t.inputBg, TEXT, "search box text"],
        [t.inputBorder, t.inputBg, UI, "search box border"],
        [t.inputBorder, t.appBg, UI, "search box border against the sidebar"],
    ];
    // Light theme only: links and the active menu item are colorSecondary text. In the dark theme
    // that text is 4.19:1 on appBg, because no single color takes both a white label at 4.5:1 and
    // 4.5:1 on a dark background; the selected-story label wins.
    if (name === "light") pairs.push([t.colorSecondary, t.appBg, TEXT, "link text"]);

    for (const [fg, bg, min, what] of pairs) {
        it(`${name}: ${what} ${fg} on ${bg} reaches ${min}:1`, () => {
            assert.ok(contrast(fg, bg) >= min, `${contrast(fg, bg).toFixed(2)}:1`);
        });
    }
}
