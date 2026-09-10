// One place to look up any type name in @graphty/compact-mantine.
//
// Almost every entry here is a re-export. A prop description is documentation of
// the component that reads it and drifts the moment it is kept somewhere else,
// so each interface is declared beside its component and only named again here.
// `ColorStop` is the exception: it is a data shape rather than a component's
// props, and is shared by `GradientEditor` and the color-stop helpers, so it has
// no single component to live beside.
//
// This file is one of the entry points the shared ESLint config exempts from
// no-deprecated, because a superseded name has to be re-exported from an entry
// point to stay reachable at all.

/**
 * One stop of a gradient: a colour, and where along the ramp it sits.
 *
 * Build these with `createColorStop` rather than writing the object by hand, so
 * that the identifier is unique. The identifier is what React keys the stop by
 * while it is being dragged, so two stops sharing one make the editor lose track
 * of which is being moved.
 */
export interface ColorStop {
    /** A unique identifier, stable for as long as the stop exists. */
    id: string;
    /** Where the stop sits along the ramp, from 0 at the start to 1 at the end. */
    offset: number;
    /** The stop's colour, as a hex string such as `#6366f1`. */
    color: string;
}

// Event handler shapes, shared by every component in the package.
export type {
    ActivationEvent,
    ActivationHandler,
    ActivationHandlerWithMeta,
    ActivationMeta,
    ChangeHandler,
    DisclosureProps,
    GestureChangeHandler,
    GestureEndHandler,
    GestureHandlers,
    GestureStartHandler,
    OpenChangeHandler,
} from "./events";

// The pop-out family: the panel, its parts, its placement vocabulary and the
// context values its hooks hand back.
export type { PopoutAnchorProps, PopoutButtonProps, PopoutManagerProps } from "../components/popout";
export type {
    PopoutAlignment,
    PopoutAnchorTarget,
    PopoutContentProps,
    PopoutContextValue,
    PopoutHeaderConfig,
    PopoutHeaderProps,
    PopoutManagerContextValue,
    PopoutPanelProps,
    PopoutPlacement,
    PopoutPosition,
    PopoutProps,
    PopoutTriggerProps,
} from "./popout";

// Panel components: the controls a property panel is assembled from.
export type { CompactColorInputProps } from "../components/CompactColorInput";
export type { ControlGroupProps } from "../components/ControlGroup";
export type { ControlSectionProps } from "../components/ControlSection";
export type { ControlSubGroupProps } from "../components/ControlSubGroup";
export type { GradientEditorProps } from "../components/GradientEditor";
export type { InfoCircleProps } from "../components/InfoCircle";
export type { StatRowProps } from "../components/StatRow";
export type { StyleNumberInputProps } from "../components/StyleNumberInput";
export type { StyleSelectOption, StyleSelectProps } from "../components/StyleSelect";
export type { ToggleWithContentProps } from "../components/ToggleWithContent";

// The data table: its columns, its values and the strings it produces.
export type {
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
} from "../components/DataTable";

// Panel rows, and the two atoms every row is built from.
export type {
    ActionRowProps,
    CompoundRowProps,
    CompoundSegment,
    DataRowHeaderProps,
    DataRowProps,
    DoorButtonProps,
    FieldRowProps,
    HistogramBin,
    HistogramRowProps,
    IconGroupOption,
    IconGroupRowProps,
    MetricRowProps,
    PanelFieldProps,
    ProseBlockProps,
    RampRowProps,
    RankChipProps,
    SparklineRowProps,
    ToggleRowGroupProps,
    ToggleRowProps,
    TrailingSlotProps,
} from "../components/rows";
// Named from the modules themselves, because the rows barrel does not re-export
// these four and a consumer cannot annotate a variable without them.
export type { DataRowRole, DataRowSortDirection } from "../components/rows/DataRow";
export type { PanelFieldKind } from "../components/rows/PanelField";
export type { AdvancedButtonProps } from "../components/rows/TrailingSlot";

// Providers, translation and text direction.
export type { PanelLabelsProviderProps } from "../context/PanelLabelsContext";
export type { CompactMantineLabels, LabelsProviderProps } from "../i18n";
export type { LiveSetting } from "../utils/live-region";
export type { Direction } from "../utils/rtl";

// Icons.
export type { FieldGlyphName, FieldGlyphProps, FieldLetter, UiGlyphName, UiGlyphProps } from "../icons";
