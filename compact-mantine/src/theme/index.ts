import { createTheme } from "@mantine/core";

import { mergeExtensions4 } from "../utils";
import { compactColors } from "./colors";
import {
    buttonComponentExtensions,
    controlComponentExtensions,
    displayComponentExtensions,
    inputComponentExtensions,
} from "./components";

/**
 * Mantine theme with "compact" size support for dense UIs.
 *
 * Compact size specifications:
 * - Input height: 24px
 * - Font size: 11px
 * - No borders
 * - Semantic color backgrounds
 * @example
 * ```tsx
 * import { MantineProvider, TextInput } from '@mantine/core';
 * import { compactTheme } from '@graphty/compact-mantine';
 *
 * function App() {
 *     return (
 *         <MantineProvider theme={compactTheme}>
 *             <TextInput size="compact" label="Name" />
 *         </MantineProvider>
 *     );
 * }
 * ```
 */
export const compactTheme = createTheme({
    colors: compactColors,
    // mergeExtensions4 provides compile-time detection of duplicate component keys
    // If any extension object has a component that already exists in a previous one,
    // TypeScript will produce a compile error
    components: mergeExtensions4(
        inputComponentExtensions,
        buttonComponentExtensions,
        controlComponentExtensions,
        displayComponentExtensions,
    ),
});

export { compactColors, compactDarkColors } from "./colors";
