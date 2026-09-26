import { compactThemeOverride } from "@graphty/compact-mantine";

/**
 * The one theme the application mounts, and the one its tests mount: `@graphty/compact-mantine`'s
 * Figma theme, unchanged.
 *
 * The app adds nothing to it. The neutral dark greys, the brand palette, every Mantine component
 * this app renders (NativeSelect and ColorInput included) and the stylesheet the theme injects
 * all come from the library, so a fix to any of them lands in the library for every consumer.
 * If the app ever needs a theme value the library does not have, the value goes into the
 * library, not into a local override here.
 */
export const theme = compactThemeOverride;
