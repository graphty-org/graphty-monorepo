import { createTheme } from "@mantine/core";

import { compactColors } from "./colors";
import {
    buttonComponentExtensions,
    controlComponentExtensions,
    displayComponentExtensions,
    feedbackComponentExtensions,
    inputComponentExtensions,
    navigationComponentExtensions,
    overlayComponentExtensions,
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
    components: {
        ...inputComponentExtensions,
        ...buttonComponentExtensions,
        ...controlComponentExtensions,
        ...displayComponentExtensions,
        ...feedbackComponentExtensions,
        ...navigationComponentExtensions,
        ...overlayComponentExtensions,
    },
});

export { compactColors, compactDarkColors } from "./colors";
