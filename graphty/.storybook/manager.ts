import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

import { storybookBrandColors } from "../../tools/storybook-brand-theme.mjs";

// The sidebar logo, from the graphty brand kit (github.com/graphty-org/brand); the files are in
// ./brand, served at the Storybook's root by staticDirs in main.ts, with the favicon. Storybook
// has no light/dark pair for its brand, so the version is picked from the reader's system
// setting when the page loads, the same setting the default theme follows. The logo goes in
// brandTitle as HTML, not brandImage, so it is drawn 24 px tall (the brand's minimum) instead
// of being squeezed into the 150 px Storybook allows a brandImage.
const dark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
const logo = `./graphty-lockup-color-on-${dark ? "dark" : "light"}.svg`;

addons.setConfig({
    theme: create({
        base: dark ? "dark" : "light",
        ...storybookBrandColors[dark ? "dark" : "light"],
        brandTitle: `<img src="${logo}" alt="graphty app" height="24" style="display: block">`,
        brandUrl: "https://graphty.app/",
        brandTarget: "_self",
    }),
});
