import { createCompactTheme } from "@graphty/compact-mantine";

/**
 * The one theme the application mounts, and the one its tests mount: `@graphty/compact-mantine`'s
 * Figma theme with its WCAG 2.2 AA option on.
 *
 * The AA option changes color tokens only -- nothing moves or resizes. The app needs it because
 * Figma's own colors miss AA in places the shell draws everywhere: a filled button's white label
 * on Figma's dark primary blue measures 3.53:1, under the 4.5:1 WCAG 1.4.3 asks of text.
 *
 * The app adds nothing else. The neutral dark greys, the brand palette, every Mantine component
 * this app renders (NativeSelect included) and the stylesheet the theme injects
 * all come from the library, so a fix to any of them lands in the library for every consumer.
 * If the app ever needs a theme value the library does not have, the value goes into the
 * library, not into a local override here.
 */
export const theme = createCompactTheme({ highContrast: true });
