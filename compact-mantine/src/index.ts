// Theme exports
export { compactColors, compactDarkColors, compactTheme, compactThemeOverride } from "./theme";

// Component exports
export { CompactColorInput } from "./components/CompactColorInput";
export { ControlGroup } from "./components/ControlGroup";
export { ControlSection } from "./components/ControlSection";
export { ControlSubGroup } from "./components/ControlSubGroup";
export { GradientEditor } from "./components/GradientEditor";
export { Popout, PopoutButton, PopoutManager } from "./components/popout";
export { StatRow } from "./components/StatRow";
export { StyleNumberInput } from "./components/StyleNumberInput";
export { StyleSelect } from "./components/StyleSelect";
export { ToggleWithContent } from "./components/ToggleWithContent";

// Hook exports
export { useActualColorScheme } from "./hooks";

// Constant exports
export {
    COMPACT_SIZING,
    DEFAULT_GRADIENT_STOP_COLOR,
    MANTINE_SPACING,
    POPOUT_GAP,
    POPOUT_NESTED_GAP,
    POPOUT_Z_INDEX_BASE,
    SWATCH_COLORS_HEXA,
} from "./constants";

// Utility exports
export {
    createColorStop,
    createDefaultGradientStops,
    isValidHex,
    MAX_ALPHA_HEX,
    MAX_OPACITY_PERCENT,
    opacityToAlphaHex,
    parseAlphaFromHexa,
    parseHexaColor,
    toHexaColor,
} from "./utils";

// Type exports
export type {
    ColorStop,
    CompactColorInputProps,
    ControlGroupProps,
    ControlSectionProps,
    ControlSubGroupProps,
    GradientEditorProps,
    PopoutContentProps,
    PopoutContextValue,
    PopoutHeaderConfig,
    PopoutHeaderProps,
    PopoutManagerContextValue,
    PopoutPanelProps,
    PopoutPosition,
    PopoutTriggerProps,
    StatRowProps,
    StyleNumberInputProps,
    StyleSelectOption,
    StyleSelectProps,
    ToggleWithContentProps,
} from "./types";

// Version
export const VERSION = "0.1.0";
