// The package entry point: everything @graphty/compact-mantine publishes.
//
// package.json declares one export condition ("."), so this file is the whole
// public surface. A name that is not here cannot be reached by a consumer, and
// tests/exports.test.ts fails when a component is added and never listed.

// Theme exports: the theme object, its factory (with the WCAG AA option), the palettes, and the
// stylesheet the theme injects (exported for SSR and shadow roots).
export {
    compactBrandColors,
    compactColors,
    compactDarkColors,
    compactGlobalCss,
    compactGraphtyColors,
    compactTheme,
    compactThemeOverride,
    createCompactTheme,
    ensureCompactStyles,
} from "./theme";

// Component exports
export { CompactColorInput } from "./components/CompactColorInput";
export { ControlGroup } from "./components/ControlGroup";
export { ControlSection } from "./components/ControlSection";
export { DataTable } from "./components/DataTable";
export { EntityChip } from "./components/EntityChip";
export { GradientEditor } from "./components/GradientEditor";
export { InfoCircle } from "./components/InfoCircle";
export {
    Popout,
    PopoutButton,
    PopoutManager,
    PopoutRegion,
    usePopoutManager,
    usePopoutRegion,
} from "./components/popout";
export { RampEditor } from "./components/RampEditor";
export { ScrollArea, type ScrollAreaProps } from "./components/ScrollArea";
export { SegmentedControl } from "./components/SegmentedControl";
export { RangeSlider, Slider } from "./components/Slider";
export { ToggleWithContent } from "./components/ToggleWithContent";

// Buttons: the toggle icon button and the split button (design/figma-spec.md 4.4, 4.5).
export { SplitButton, ToggleIconButton } from "./components/buttons";

// Inputs: the search field, the combo input and the variable pill (6.2, 6.3, 6.6), the file source
// with its drop hook and file picker, focus put on a field by program with its ring drawn, and the
// scrub gesture a number field's handle uses, for a property row whose label scrubs its value, and
// the check column of a themed list's option, for an option drawn with more than its label.
export { ComboInput, FileSource, pickFiles, SearchInput, useFileDrop, VariablePill } from "./components/inputs";
export { focusWithRing, ListboxCheck } from "./components/inputs/listbox";
export { type ScrubCallbacks, useScrub } from "./components/inputs/useScrub";
export { LISTBOX_CLASS_NAMES } from "./theme/components/inputs";

// Overlays: the context menu, the checkable menu row and a row's second line, the modal footer,
// the toast, the tooltip's shortcut label (8.1-8.6), and the tooltip for a menu's button.
export {
    ContextMenu,
    MenuCheckItem,
    MenuItemDescription,
    MenuShortcut,
    ModalFooter,
    TargetTooltip,
    Toast,
    ToastProvider,
    TooltipShortcut,
    useToast,
} from "./components/overlays";

// Selection: the 3 x 3 alignment matrix (5.7).
export { ALIGNMENT_MATRIX_VALUES, AlignmentMatrix } from "./components/selection/AlignmentMatrix";

// Chrome: the panel resize handle (9.9).
export { ResizeHandle } from "./components/chrome/ResizeHandle";

// Color: the color picker panel (7.3).
export { ColorPickerPanel } from "./components/color/ColorPickerPanel";

// Tree and lists: the layer tree, the page list, inline rename and the find result row (10).
export {
    InlineRename,
    moveTreeItem,
    PageList,
    PageRow,
    renameTreeItem,
    ResultRow,
    Tree,
    TreeItem,
} from "./components/tree";

// Editor shell exports: the floating toolbar and its tools, the contextual bar, the navigation
// rail, the help button, the keyboard shortcuts sheet and the quick actions palette.
export {
    HelpButton,
    NavRail,
    QuickActions,
    RailButton,
    SecondaryToolbar,
    ShortcutSheet,
    StatusBar,
    Toolbar,
    ToolButton,
    ToolGroup,
} from "./components/shell";

// Panel row exports: the row types a property panel is assembled from, plus the
// two atoms they are built out of.
export {
    ActionRow,
    AdvancedButton,
    CompoundRow,
    DataRow,
    DataRowHeader,
    EllipsizedName,
    FieldRow,
    HistogramRow,
    MetricRow,
    PanelField,
    ProseBlock,
    RampRow,
    RankChip,
    ResetButton,
    SparklineRow,
    ToggleRow,
    ToggleRowGroup,
    TrailingSlot,
} from "./components/rows";

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
export { colorWord, isLightColor, mixHex, normalizeHexa } from "./utils/color-utils";
export { isRtl } from "./utils/rtl";

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
    CompactAccent,
    CompactColorInputProps,
    CompactMantineLabels,
    CompactThemeOptions,
    CompoundRowProps,
    CompoundSegment,
    ControlGroupProps,
    ControlSectionProps,
    DataRowHeaderProps,
    DataRowProps,
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
    EntityChipProps,
    EntityKind,
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
    HistogramBrushProps,
    HistogramOverlay,
    HistogramRowProps,
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
    PopoutRegionProps,
    PopoutTriggerProps,
    ProseBlockProps,
    RampEditorBin,
    RampEditorHandle,
    RampEditorLabels,
    RampEditorPalette,
    RampEditorProps,
    RampRowProps,
    RankChipProps,
    ResetButtonProps,
    SparklineRowProps,
    ToggleRowGroupProps,
    ToggleRowProps,
    ToggleWithContentProps,
    TrailingSlotProps,
    UiGlyphName,
    UiGlyphProps,
} from "./types";
export type {
    ComboInputItem,
    ComboInputOption,
    ComboInputProps,
    ComboInputSeparator,
    FileDropState,
    FileSourceProps,
    FileSourceVariant,
    PickFilesOptions,
    SearchInputProps,
    UseFileDropOptions,
    VariablePillProps,
} from "./types";
export type {
    ContextMenuProps,
    MenuCheckItemProps,
    ModalFooterProps,
    TargetTooltipProps,
    ToastAction,
    ToastApi,
    ToastOptions,
    ToastProps,
    ToastProviderProps,
    TooltipShortcutProps,
} from "./types";
export type {
    AlignmentMatrixProps,
    AlignmentMatrixValue,
    ColorPickerFormat,
    ColorPickerPaintType,
    ColorPickerPanelLabels,
    ColorPickerPanelProps,
    FlatTreeRow,
    GradientEditorLabels,
    InlineRenameProps,
    PageListItem,
    PageListProps,
    PageRowProps,
    ResizeHandleBounds,
    ResizeHandleEdge,
    ResizeHandleProps,
    ResultRowProps,
    SplitButtonProps,
    ToggleIconButtonProps,
    TreeItemProps,
    TreeMove,
    TreeNodeData,
    TreeProps,
    TreeRowActions,
    TreeRowTint,
} from "./types";
export type {
    HelpButtonProps,
    NavRailProps,
    QuickAction,
    QuickActionsProps,
    RailButtonProps,
    SecondaryToolbarButtonProps,
    SecondaryToolbarProps,
    ShortcutEntry,
    ShortcutGroup,
    ShortcutSheetProps,
    ShortcutSheetTab,
    StatusBarProps,
    ToolbarProps,
    ToolButtonProps,
    ToolGroupProps,
    ToolItem,
} from "./types";
