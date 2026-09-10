// The package entry point: everything @graphty/compact-mantine publishes.
//
// package.json declares one export condition ("."), so this file is the whole
// public surface. A name that is not here cannot be reached by a consumer, and
// tests/exports.test.ts fails when a component is added and never listed.
//
// This file is one of the entry points the shared ESLint config exempts from
// no-deprecated. A superseded name has to be re-exported from an entry point to
// stay reachable, and the rule fires on the re-export itself; the @deprecated
// tag stays on the declaration, so every ordinary call site is still flagged.

// Theme exports
export { compactColors, compactDarkColors, compactTheme, compactThemeOverride } from "./theme";

// Component exports
export { CompactColorInput } from "./components/CompactColorInput";
export { ControlGroup } from "./components/ControlGroup";
export { ControlSection } from "./components/ControlSection";
export { ControlSubGroup } from "./components/ControlSubGroup";
export { DataTable } from "./components/DataTable";
export { GradientEditor } from "./components/GradientEditor";
export { InfoCircle } from "./components/InfoCircle";
export { Popout, PopoutButton, PopoutManager } from "./components/popout";
export { StyleNumberInput } from "./components/StyleNumberInput";
export { StyleSelect } from "./components/StyleSelect";
export { ToggleWithContent } from "./components/ToggleWithContent";

// Panel row exports: the row types a property panel is assembled from, plus the
// two atoms they are built out of.
export {
    ActionRow,
    CompoundRow,
    DataRow,
    DataRowHeader,
    FieldRow,
    HistogramRow,
    IconGroupRow,
    MetricRow,
    PanelField,
    ProseBlock,
    RampRow,
    RankChip,
    SparklineRow,
    ToggleRow,
    ToggleRowGroup,
    TrailingSlot,
} from "./components/rows";
// Named from its own module, because the rows barrel still publishes only the
// superseded `DoorButton` spelling of it.
export { AdvancedButton } from "./components/rows/TrailingSlot";

// Icon exports: the closed glyph register, plus the guards that read it
export {
    FIELD_GLYPH_NAMES,
    FIELD_LETTERS,
    FieldGlyph,
    isFieldGlyphName,
    isFieldLetter,
    UI_GLYPH_NAMES,
    UiGlyph,
} from "./icons";

// Internationalization exports: the English string set every component draws
// from, the provider that replaces any of it, and the locale-aware formatters
// and parser the components use to turn numbers into text and back.
export {
    defaultLabels,
    LabelsProvider,
    parseLocaleNumber,
    useCollator,
    useLabels,
    useLocale,
    useNumberFormatter,
    useNumberParser,
    useOrdinalFormatter,
} from "./i18n";

// Context exports: the `showLabels` preference, which decides whether a panel
// writes a word beside each control or relies on its glyph alone.
export { PanelLabelsProvider, usePanelLabels } from "./context/PanelLabelsContext";

// Hook exports
export { useActualColorScheme } from "./hooks";
export { useDirection } from "./utils/rtl";

// Constant exports
export {
    COMPACT_SIZING,
    DEFAULT_GRADIENT_STOP_COLOR,
    MANTINE_SPACING,
    PANEL_GRID,
    PANEL_INK,
    POPOUT_GAP,
    POPOUT_NESTED_GAP,
    POPOUT_Z_INDEX_BASE,
    SWATCH_COLORS_HEXA,
} from "./constants";

// Utility exports
export { getActivationMeta } from "./types/events";
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
export { isRtl } from "./utils/rtl";

// Superseded names, kept working so that upgrading breaks nothing. Each one's
// own declaration carries the @deprecated tag and a one-line pointer to its
// replacement, so a consumer sees the warning in their editor and in the
// published type definitions:
//   DoorButton -> AdvancedButton, the same component under a plain name
//   StatRow    -> DataRow, which draws the same pair and can also be selected
export { DoorButton } from "./components/rows";
export { StatRow } from "./components/StatRow";

// Type exports
export type {
    ActionRowProps,
    ActivationEvent,
    ActivationHandler,
    ActivationHandlerWithMeta,
    ActivationMeta,
    AdvancedButtonProps,
    ChangeHandler,
    ColorStop,
    CompactColorInputProps,
    CompactMantineLabels,
    CompoundRowProps,
    CompoundSegment,
    ControlGroupProps,
    ControlSectionProps,
    ControlSubGroupProps,
    DataRowHeaderProps,
    DataRowProps,
    DataRowRole,
    DataRowSortDirection,
    DataTableAlign,
    DataTableColumn,
    DataTableHandle,
    DataTableLabels,
    DataTableProps,
    DataTableRowHandler,
    DataTableRowMouseHandler,
    DataTableSelectionMode,
    DataTableSort,
    DataTableValue,
    Direction,
    DisclosureProps,
    DoorButtonProps,
    FieldGlyphName,
    FieldGlyphProps,
    FieldLetter,
    FieldRowProps,
    GestureChangeHandler,
    GestureEndHandler,
    GestureHandlers,
    GestureStartHandler,
    GradientEditorProps,
    HistogramBin,
    HistogramRowProps,
    IconGroupOption,
    IconGroupRowProps,
    InfoCircleProps,
    LabelsProviderProps,
    LiveSetting,
    MetricRowProps,
    OpenChangeHandler,
    PanelFieldKind,
    PanelFieldProps,
    PanelLabelsProviderProps,
    PopoutAlignment,
    PopoutAnchorProps,
    PopoutAnchorTarget,
    PopoutButtonProps,
    PopoutContentProps,
    PopoutContextValue,
    PopoutHeaderConfig,
    PopoutHeaderProps,
    PopoutManagerContextValue,
    PopoutManagerProps,
    PopoutPanelProps,
    PopoutPlacement,
    PopoutPosition,
    PopoutProps,
    PopoutTriggerProps,
    ProseBlockProps,
    RampRowProps,
    RankChipProps,
    SparklineRowProps,
    StatRowProps,
    StyleNumberInputProps,
    StyleSelectOption,
    StyleSelectProps,
    ToggleRowGroupProps,
    ToggleRowProps,
    ToggleWithContentProps,
    TrailingSlotProps,
    UiGlyphName,
    UiGlyphProps,
} from "./types";

// Keep in step with the version field of package.json; a test asserts the two
// are equal, because this constant had drifted four minor versions behind.
/** The released version of this package. */
export const VERSION = "0.5.1";
