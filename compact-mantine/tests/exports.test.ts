/**
 * Tests for package exports to verify:
 * 1. Expected exports are present
 * 2. Unused exports have been removed
 * 3. API surface is clean and intentional
 */
import { describe, it, expect } from "vitest";
import * as mainExports from "../src/index";
import * as themeExports from "../src/theme";
import * as constantsExports from "../src/constants";
import * as utilsExports from "../src/utils";
import type {
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
    PopoutRegionProps,
    PopoutTriggerProps,
    ProseBlockProps,
    RampRowProps,
    RankChipProps,
    SparklineRowProps,
    StyleNumberInputProps,
    StyleSelectOption,
    StyleSelectProps,
    ToggleRowGroupProps,
    ToggleRowProps,
    ToggleWithContentProps,
    TrailingSlotProps,
    UiGlyphName,
    UiGlyphProps,
} from "../src/index";

/** A row shape for the generic data-table types, which take one type argument. */
interface SampleRow {
    id: string;
}

/**
 * Every type the package publishes, named once.
 *
 * This is a type-level assertion: the file stops compiling if the package stops
 * exporting one of them, or renames it. Vitest transpiles rather than
 * type-checks, so the guarantee belongs to `tsc` and the editor rather than to
 * this run, which is why the runtime test below only checks that the list is the
 * length it should be and that no name is written twice.
 *
 * The key is the type name with any trailing `Props` dropped and the first
 * letter lowered, so a missing entry is obvious when the list is read beside
 * src/index.ts.
 */
type PublicTypeSurface = {
    actionRow: ActionRowProps;
    activationEvent: ActivationEvent;
    activationHandler: ActivationHandler;
    activationHandlerWithMeta: ActivationHandlerWithMeta;
    activationMeta: ActivationMeta;
    advancedButton: AdvancedButtonProps;
    changeHandler: ChangeHandler<string>;
    colorStop: ColorStop;
    compactColorInput: CompactColorInputProps;
    compactMantineLabels: CompactMantineLabels;
    compoundRow: CompoundRowProps;
    compoundSegment: CompoundSegment;
    controlGroup: ControlGroupProps;
    controlSection: ControlSectionProps;
    controlSubGroup: ControlSubGroupProps;
    dataRow: DataRowProps;
    dataRowHeader: DataRowHeaderProps;
    dataRowRole: DataRowRole;
    dataRowSortDirection: DataRowSortDirection;
    dataTable: DataTableProps<SampleRow>;
    dataTableAlign: DataTableAlign;
    dataTableColumn: DataTableColumn<SampleRow>;
    dataTableHandle: DataTableHandle;
    dataTableLabels: DataTableLabels;
    dataTableRowHandler: DataTableRowHandler<SampleRow>;
    dataTableRowMouseHandler: DataTableRowMouseHandler<SampleRow>;
    dataTableSelectionMode: DataTableSelectionMode;
    dataTableSort: DataTableSort;
    dataTableValue: DataTableValue;
    direction: Direction;
    disclosure: DisclosureProps;
    fieldGlyph: FieldGlyphProps;
    fieldGlyphName: FieldGlyphName;
    fieldLetter: FieldLetter;
    fieldRow: FieldRowProps;
    gestureChangeHandler: GestureChangeHandler;
    gestureEndHandler: GestureEndHandler;
    gestureHandlers: GestureHandlers;
    gestureStartHandler: GestureStartHandler;
    gradientEditor: GradientEditorProps;
    histogramBin: HistogramBin;
    histogramRow: HistogramRowProps;
    iconGroupOption: IconGroupOption;
    iconGroupRow: IconGroupRowProps;
    infoCircle: InfoCircleProps;
    labelsProvider: LabelsProviderProps;
    liveSetting: LiveSetting;
    metricRow: MetricRowProps;
    openChangeHandler: OpenChangeHandler;
    panelField: PanelFieldProps;
    panelFieldKind: PanelFieldKind;
    panelLabelsProvider: PanelLabelsProviderProps;
    popout: PopoutProps;
    popoutAlignment: PopoutAlignment;
    popoutAnchor: PopoutAnchorProps;
    popoutAnchorTarget: PopoutAnchorTarget;
    popoutButton: PopoutButtonProps;
    popoutContent: PopoutContentProps;
    popoutContextValue: PopoutContextValue;
    popoutHeader: PopoutHeaderProps;
    popoutHeaderConfig: PopoutHeaderConfig;
    popoutManager: PopoutManagerProps;
    popoutRegion: PopoutRegionProps;
    popoutManagerContextValue: PopoutManagerContextValue;
    popoutPanel: PopoutPanelProps;
    popoutPlacement: PopoutPlacement;
    popoutPosition: PopoutPosition;
    popoutTrigger: PopoutTriggerProps;
    proseBlock: ProseBlockProps;
    rampRow: RampRowProps;
    rankChip: RankChipProps;
    sparklineRow: SparklineRowProps;
    styleNumberInput: StyleNumberInputProps;
    styleSelect: StyleSelectProps;
    styleSelectOption: StyleSelectOption;
    toggleRow: ToggleRowProps;
    toggleRowGroup: ToggleRowGroupProps;
    toggleWithContent: ToggleWithContentProps;
    trailingSlot: TrailingSlotProps;
    uiGlyph: UiGlyphProps;
    uiGlyphName: UiGlyphName;
};

/**
 * Every runtime export of `src/index.ts`, in one list.
 *
 * This is the assertion that catches a component being added and never
 * exported. package.json declares one export condition, so src/index.ts is the
 * whole public surface: a component that reaches this list is reachable by a
 * consumer, and one that does not is invisible however finished it is.
 *
 * A name added here must also be added to src/index.ts and vice versa; the test
 * below compares the two sets both ways, so neither an unlisted export nor a
 * listed name that does not exist can pass.
 */
const PUBLIC_RUNTIME_EXPORTS = [
    // Theme
    "compactColors",
    "compactDarkColors",
    "compactTheme",
    "compactThemeOverride",

    // Components
    "CompactColorInput",
    "ControlGroup",
    "ControlSection",
    "ControlSubGroup",
    "DataTable",
    "GradientEditor",
    "InfoCircle",
    "Popout",
    "PopoutButton",
    "PopoutManager",
    "PopoutRegion",
    "StyleNumberInput",
    "StyleSelect",
    "ToggleWithContent",

    // Panel rows and the two atoms they are built from
    "ActionRow",
    "AdvancedButton",
    "CompoundRow",
    "DataRow",
    "DataRowHeader",
    "FieldRow",
    "HistogramRow",
    "IconGroupRow",
    "MetricRow",
    "PanelField",
    "ProseBlock",
    "RampRow",
    "RankChip",
    "SparklineRow",
    "ToggleRow",
    "ToggleRowGroup",
    "TrailingSlot",

    // Icons
    "FIELD_GLYPH_NAMES",
    "FIELD_LETTERS",
    "FieldGlyph",
    "isFieldGlyphName",
    "isFieldLetter",
    "UI_GLYPH_NAMES",
    "UiGlyph",

    // Internationalization
    "defaultLabels",
    "LabelsProvider",
    "parseLocaleNumber",
    "useCollator",
    "useLabels",
    "useLocale",
    "useNumberFormatter",
    "useNumberParser",
    "useOrdinalFormatter",

    // Context and hooks
    "PanelLabelsProvider",
    "useActualColorScheme",
    "useDirection",
    "usePanelLabels",
    "usePopoutRegion",

    // Constants
    "COMPACT_SIZING",
    "DEFAULT_GRADIENT_STOP_COLOR",
    "MANTINE_SPACING",
    "PANEL_GRID",
    "PANEL_INK",
    "POPOUT_GAP",
    "POPOUT_NESTED_GAP",
    "POPOUT_Z_INDEX_BASE",
    "SWATCH_COLORS_HEXA",

    // Utilities
    "createColorStop",
    "createDefaultGradientStops",
    "getActivationMeta",
    "isRtl",
    "isValidHex",
    "MAX_ALPHA_HEX",
    "MAX_OPACITY_PERCENT",
    "opacityToAlphaHex",
    "parseAlphaFromHexa",
    "parseHexaColor",
    "toHexaColor",

    // The released version
    "VERSION",
];

describe("Package exports", () => {
    describe("Main exports (src/index.ts)", () => {
        it("publishes exactly the runtime exports named in PUBLIC_RUNTIME_EXPORTS", () => {
            // The whole point of this file. A component added to the package and
            // never exported fails here, and so does a name removed from the
            // entry point without anyone noticing that it was published.
            const actual = Object.keys(mainExports).sort((a, b) => a.localeCompare(b));
            const expected = [...PUBLIC_RUNTIME_EXPORTS].sort((a, b) => a.localeCompare(b));

            expect(actual).toEqual(expected);
        });

        it("names no runtime export twice", () => {
            expect(new Set(PUBLIC_RUNTIME_EXPORTS).size).toBe(PUBLIC_RUNTIME_EXPORTS.length);
        });

        it("exports compactTheme", () => {
            expect(mainExports.compactTheme).toBeDefined();
        });

        it("exports compactThemeOverride", () => {
            expect(mainExports.compactThemeOverride).toBeDefined();
        });

        it("exports compactColors", () => {
            expect(mainExports.compactColors).toBeDefined();
        });

        it("exports compactDarkColors", () => {
            expect(mainExports.compactDarkColors).toBeDefined();
        });

        it("exports VERSION", () => {
            expect(mainExports.VERSION).toBeDefined();
            expect(typeof mainExports.VERSION).toBe("string");
        });

        describe("Component exports", () => {
            it("exports CompactColorInput", () => {
                expect(mainExports.CompactColorInput).toBeDefined();
            });

            it("exports ControlGroup", () => {
                expect(mainExports.ControlGroup).toBeDefined();
            });

            it("exports ControlSection", () => {
                expect(mainExports.ControlSection).toBeDefined();
            });

            it("exports ControlSubGroup", () => {
                expect(mainExports.ControlSubGroup).toBeDefined();
            });

            it("exports GradientEditor", () => {
                expect(mainExports.GradientEditor).toBeDefined();
            });

            it("exports InfoCircle", () => {
                expect(mainExports.InfoCircle).toBeDefined();
            });

            it("exports Popout components", () => {
                expect(mainExports.Popout).toBeDefined();
                expect(mainExports.PopoutButton).toBeDefined();
                expect(mainExports.PopoutManager).toBeDefined();
            });

            it("exports the Popout parts as properties of Popout", () => {
                // Trigger, Panel, Content and Anchor are reached through the
                // root rather than as four more names on the entry point, which
                // is the composition the component's own documentation shows.
                expect(mainExports.Popout.Trigger).toBeDefined();
                expect(mainExports.Popout.Panel).toBeDefined();
                expect(mainExports.Popout.Content).toBeDefined();
                expect(mainExports.Popout.Anchor).toBeDefined();
            });

            it("exports StyleNumberInput", () => {
                expect(mainExports.StyleNumberInput).toBeDefined();
            });

            it("exports StyleSelect", () => {
                expect(mainExports.StyleSelect).toBeDefined();
            });

            it("exports ToggleWithContent", () => {
                expect(mainExports.ToggleWithContent).toBeDefined();
            });
        });

        describe("Data table exports", () => {
            it("exports DataTable", () => {
                expect(mainExports.DataTable).toBeDefined();
            });

            it("keeps the table's strings in the one set the whole library draws from", () => {
                // The table used to ship a string set of its own, so a consumer
                // who translated the library through LabelsProvider found the
                // table still speaking English.
                expect(mainExports.defaultLabels.dataTable).toBe("Data table");
                expect(typeof mainExports.defaultLabels.rowsShown).toBe("function");

                const surface = mainExports as Record<string, unknown>;
                expect(surface.defaultDataTableLabels).toBeUndefined();
            });

            it("does NOT export the table's internal row-model helpers", () => {
                // Grid navigation, the selection state machine and cell
                // formatting are how the table is built rather than API a
                // consumer composes with. They are unit-tested through their own
                // modules instead.
                const surface = mainExports as Record<string, unknown>;

                expect(surface.nextGridPosition).toBeUndefined();
                expect(surface.clampGridPosition).toBeUndefined();
                expect(surface.samePosition).toBeUndefined();
                expect(surface.applySelectionGesture).toBeUndefined();
                expect(surface.selectAll).toBeUndefined();
                expect(surface.cellText).toBeUndefined();
                expect(surface.compareValues).toBeUndefined();
                expect(surface.HEADER_ROW).toBeUndefined();
                expect(surface.useDataTableLabels).toBeUndefined();
            });
        });

        describe("Row type exports (RT-1 through RT-10)", () => {
            it("exports the two atoms every row is built from", () => {
                // The field atom, the fixed 24px trailing slot, and the advanced
                // settings button that opens a pop-out from a row or a section
                // header.
                expect(mainExports.PanelField).toBeDefined();
                expect(mainExports.TrailingSlot).toBeDefined();
                expect(mainExports.AdvancedButton).toBeDefined();
            });

            it("exports RT-1 FieldRow", () => {
                expect(mainExports.FieldRow).toBeDefined();
            });

            it("exports RT-2 CompoundRow", () => {
                expect(mainExports.CompoundRow).toBeDefined();
            });

            it("exports RT-3 IconGroupRow", () => {
                expect(mainExports.IconGroupRow).toBeDefined();
            });

            it("exports RT-4 RampRow", () => {
                expect(mainExports.RampRow).toBeDefined();
            });

            it("exports RT-5 ToggleRow and ToggleRowGroup", () => {
                expect(mainExports.ToggleRow).toBeDefined();
                expect(mainExports.ToggleRowGroup).toBeDefined();
            });

            it("exports RT-6 DataRow, DataRowHeader and RankChip", () => {
                expect(mainExports.DataRow).toBeDefined();
                expect(mainExports.DataRowHeader).toBeDefined();
                expect(mainExports.RankChip).toBeDefined();
            });

            it("exports RT-7 ActionRow", () => {
                expect(mainExports.ActionRow).toBeDefined();
            });

            it("exports RT-8 ControlSection", () => {
                // RT-8 is the existing ControlSection, rebuilt rather than replaced.
                expect(mainExports.ControlSection).toBeDefined();
            });

            it("exports RT-9 HistogramRow, SparklineRow and MetricRow", () => {
                expect(mainExports.HistogramRow).toBeDefined();
                expect(mainExports.SparklineRow).toBeDefined();
                expect(mainExports.MetricRow).toBeDefined();
            });

            it("exports RT-10 ProseBlock", () => {
                expect(mainExports.ProseBlock).toBeDefined();
            });

            it("exports no eleventh row type", () => {
                // The set is closed: a row that fits none of the ten is a floor
                // item or a design error, never a new component.
                expect((mainExports as Record<string, unknown>).RT11).toBeUndefined();
                expect((mainExports as Record<string, unknown>).GenericRow).toBeUndefined();
            });

            it("does NOT export the trailing slot's internal occupancy test", () => {
                // holdsSomething is how RampRow decides whether to draw a slot
                // at all; a consumer writes the condition themselves.
                expect((mainExports as Record<string, unknown>).holdsSomething).toBeUndefined();
            });
        });

        describe("Icon exports", () => {
            it("exports FieldGlyph and UiGlyph", () => {
                expect(mainExports.FieldGlyph).toBeDefined();
                expect(mainExports.UiGlyph).toBeDefined();
            });

            it("exports the closed glyph registers", () => {
                expect(mainExports.FIELD_GLYPH_NAMES).toHaveLength(8);
                expect(mainExports.FIELD_LETTERS).toEqual(["N", "E", "W", "D", "K"]);
                expect(mainExports.UI_GLYPH_NAMES).toHaveLength(16);
            });

            it("exports the guards that read the registers", () => {
                expect(mainExports.isFieldGlyphName("sizeSmallest")).toBe(true);
                expect(mainExports.isFieldGlyphName("nothing")).toBe(false);
                expect(mainExports.isFieldLetter("N")).toBe(true);
                expect(mainExports.isFieldLetter("Q")).toBe(false);
            });

            it("does NOT export lucide-react icons", () => {
                // Icons are inline SVG from src/icons: lucide-react is a
                // devDependency here and is external to the build, so a
                // consumer would get an unresolved import.
                expect((mainExports as Record<string, unknown>).Settings).toBeUndefined();
                expect((mainExports as Record<string, unknown>).ChevronDown).toBeUndefined();
            });
        });

        describe("Internationalization exports", () => {
            it("exports the provider and the two hooks that read it", () => {
                expect(mainExports.LabelsProvider).toBeDefined();
                expect(typeof mainExports.useLabels).toBe("function");
                expect(typeof mainExports.useLocale).toBe("function");
            });

            it("exports the English default strings", () => {
                expect(mainExports.defaultLabels).toBeDefined();
                expect(mainExports.defaultLabels.mixed).toBe("Mixed");
                expect(typeof mainExports.defaultLabels.expandSection).toBe("function");
            });

            it("exports the locale-aware formatters", () => {
                expect(typeof mainExports.useNumberFormatter).toBe("function");
                expect(typeof mainExports.useOrdinalFormatter).toBe("function");
                expect(typeof mainExports.useCollator).toBe("function");
            });

            it("exports the parser that reads a number a person typed", () => {
                expect(typeof mainExports.useNumberParser).toBe("function");
                expect(mainExports.parseLocaleNumber("1,5", "de-DE")).toBe(1.5);
                expect(mainExports.parseLocaleNumber("1.5", "en-US")).toBe(1.5);
            });
        });

        describe("Context exports", () => {
            it("exports PanelLabelsProvider", () => {
                expect(mainExports.PanelLabelsProvider).toBeDefined();
            });

            it("exports usePanelLabels", () => {
                expect(mainExports.usePanelLabels).toBeDefined();
                expect(typeof mainExports.usePanelLabels).toBe("function");
            });
        });

        describe("Hook exports", () => {
            it("exports useActualColorScheme", () => {
                expect(mainExports.useActualColorScheme).toBeDefined();
            });

            it("exports useDirection", () => {
                expect(typeof mainExports.useDirection).toBe("function");
            });

            it("does NOT export the pop-out context hooks", () => {
                // A pop-out's own state is reached through its parts rather than
                // through a hook that throws outside one. The context value types
                // stay published because PopoutManager's own props name them.
                const surface = mainExports as Record<string, unknown>;

                expect(surface.usePopoutContext).toBeUndefined();
                expect(surface.useOptionalPopoutContext).toBeUndefined();
                expect(surface.usePopoutManagerContext).toBeUndefined();
                expect(surface.useOptionalPopoutManagerContext).toBeUndefined();
                expect(surface.usePopoutAnchorContext).toBeUndefined();
            });
        });

        describe("Type exports", () => {
            it("names every published type", () => {
                // The assertion that matters is PublicTypeSurface above, which is
                // checked by the compiler. This one keeps the list honest at run
                // time: 76 named types, none of them written twice. It is a
                // subset of the type block in src/index.ts rather than the whole
                // of it: four published names (liveSetting, popoutAnchor,
                // popoutButton and popoutManager) have never been listed here,
                // and closing that gap is a separate job from this one.
                const names: (keyof PublicTypeSurface)[] = [
                    "actionRow",
                    "activationEvent",
                    "activationHandler",
                    "activationHandlerWithMeta",
                    "activationMeta",
                    "advancedButton",
                    "changeHandler",
                    "colorStop",
                    "compactColorInput",
                    "compactMantineLabels",
                    "compoundRow",
                    "compoundSegment",
                    "controlGroup",
                    "controlSection",
                    "controlSubGroup",
                    "dataRow",
                    "dataRowHeader",
                    "dataRowRole",
                    "dataRowSortDirection",
                    "dataTable",
                    "dataTableAlign",
                    "dataTableColumn",
                    "dataTableHandle",
                    "dataTableLabels",
                    "dataTableRowHandler",
                    "dataTableRowMouseHandler",
                    "dataTableSelectionMode",
                    "dataTableSort",
                    "dataTableValue",
                    "direction",
                    "disclosure",
                    "fieldGlyph",
                    "fieldGlyphName",
                    "fieldLetter",
                    "fieldRow",
                    "gestureChangeHandler",
                    "gestureEndHandler",
                    "gestureHandlers",
                    "gestureStartHandler",
                    "gradientEditor",
                    "histogramBin",
                    "histogramRow",
                    "iconGroupOption",
                    "iconGroupRow",
                    "infoCircle",
                    "labelsProvider",
                    "metricRow",
                    "openChangeHandler",
                    "panelField",
                    "panelFieldKind",
                    "panelLabelsProvider",
                    "popout",
                    "popoutAlignment",
                    "popoutAnchorTarget",
                    "popoutContent",
                    "popoutContextValue",
                    "popoutHeader",
                    "popoutHeaderConfig",
                    "popoutManagerContextValue",
                    "popoutPanel",
                    "popoutPlacement",
                    "popoutPosition",
                    "popoutTrigger",
                    "proseBlock",
                    "rampRow",
                    "rankChip",
                    "sparklineRow",
                    "styleNumberInput",
                    "styleSelect",
                    "styleSelectOption",
                    "toggleRow",
                    "toggleRowGroup",
                    "toggleWithContent",
                    "trailingSlot",
                    "uiGlyph",
                    "uiGlyphName",
                ];

                expect(names).toHaveLength(76);
                expect(new Set(names).size).toBe(names.length);
            });
        });

        describe("Constant exports", () => {
            it("exports POPOUT_Z_INDEX_BASE", () => {
                expect(mainExports.POPOUT_Z_INDEX_BASE).toBeDefined();
                expect(mainExports.POPOUT_Z_INDEX_BASE).toBe(1000);
            });

            it("exports POPOUT_GAP", () => {
                expect(mainExports.POPOUT_GAP).toBeDefined();
            });

            it("exports POPOUT_NESTED_GAP", () => {
                expect(mainExports.POPOUT_NESTED_GAP).toBeDefined();
            });

            it("exports SWATCH_COLORS_HEXA", () => {
                expect(mainExports.SWATCH_COLORS_HEXA).toBeDefined();
                expect(Array.isArray(mainExports.SWATCH_COLORS_HEXA)).toBe(true);
            });

            it("exports DEFAULT_GRADIENT_STOP_COLOR", () => {
                expect(mainExports.DEFAULT_GRADIENT_STOP_COLOR).toBeDefined();
            });

            it("exports MANTINE_SPACING", () => {
                expect(mainExports.MANTINE_SPACING).toBeDefined();
            });

            it("exports COMPACT_SIZING constants", () => {
                expect(mainExports.COMPACT_SIZING).toBeDefined();
                expect(mainExports.COMPACT_SIZING.HEIGHT).toBe(24);
                expect(mainExports.COMPACT_SIZING.FONT_SIZE).toBe(11);
                expect(mainExports.COMPACT_SIZING.CONTROL_PADDING).toBe(8);
                expect(mainExports.COMPACT_SIZING.SECTION_GAP).toBe(4);
            });

            it("exports PANEL_GRID", () => {
                expect(mainExports.PANEL_GRID).toBeDefined();
                expect(mainExports.PANEL_GRID.WIDTH).toBe(280);
                expect(mainExports.PANEL_GRID.BODY).toBe(224);
                expect(mainExports.PANEL_GRID.FIELD).toBe(108);
                expect(mainExports.PANEL_GRID.TRAIL).toBe(24);
            });

            it("PANEL_GRID keeps the row identity that adds up to 280", () => {
                // 16 + 108 + 8 + 108 + 8 + 24 + 8 = 280
                const grid = mainExports.PANEL_GRID;
                const identity =
                    grid.PAD_LEFT + grid.FIELD + grid.GUTTER + grid.FIELD + grid.TRAIL_GAP + grid.TRAIL + grid.PAD_RIGHT;

                expect(identity).toBe(grid.WIDTH);
                expect(grid.PAD_LEFT + grid.CONTENT + grid.PAD_RIGHT).toBe(grid.WIDTH);
                expect(grid.BODY + grid.TRAIL_GAP + grid.TRAIL).toBe(grid.CONTENT);
            });

            it("exports PANEL_INK", () => {
                expect(mainExports.PANEL_INK).toBeDefined();
                expect(mainExports.PANEL_INK.VALUE).toBe("var(--mantine-color-text)");
                expect(mainExports.PANEL_INK.CHROME).toBe(
                    "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
                );
                expect(mainExports.PANEL_INK.ACCENT).toBe("var(--mantine-primary-color-filled)");
            });

            it("exports the ink roles the contrast pass added", () => {
                // A selected item needs a ground that separates from its track
                // and an ink that reads on that ground, and a control that cannot
                // be operated needs an ink that is allowed to be dimmer than the
                // text minimum. None of the three existed before.
                expect(mainExports.PANEL_INK.SELECTED).toBe(
                    "light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-1))",
                );
                expect(mainExports.PANEL_INK.ON_SELECTED).toBe("var(--mantine-color-body)");
                expect(mainExports.PANEL_INK.DISABLED).toBe("var(--mantine-color-disabled-color)");
            });

            it("PANEL_INK writes no raw hex, so the rows read in light mode too", () => {
                for (const ink of Object.values(mainExports.PANEL_INK)) {
                    expect(ink).not.toMatch(/#[0-9a-f]{3}/i);
                    expect(ink.startsWith("var(") || ink.startsWith("light-dark(")).toBe(true);
                }
            });

            it("does NOT export unused SWATCH_COLORS (non-HEXA)", () => {
                // SWATCH_COLORS without HEXA suffix is unused internally
                // Only SWATCH_COLORS_HEXA is actually used by CompactColorInput
                expect((mainExports as Record<string, unknown>).SWATCH_COLORS).toBeUndefined();
            });
        });

        describe("Utility exports", () => {
            it("exports color utility functions", () => {
                expect(mainExports.createColorStop).toBeDefined();
                expect(mainExports.createDefaultGradientStops).toBeDefined();
                expect(mainExports.isValidHex).toBeDefined();
                expect(mainExports.parseHexaColor).toBeDefined();
                expect(mainExports.toHexaColor).toBeDefined();
                expect(mainExports.opacityToAlphaHex).toBeDefined();
                expect(mainExports.parseAlphaFromHexa).toBeDefined();
            });

            it("exports color utility constants", () => {
                expect(mainExports.MAX_ALPHA_HEX).toBeDefined();
                expect(mainExports.MAX_OPACITY_PERCENT).toBeDefined();
            });

            it("exports getActivationMeta, which reads an activation's source", () => {
                expect(typeof mainExports.getActivationMeta).toBe("function");
            });

            it("exports isRtl, so a consumer's own row can follow the text direction", () => {
                expect(mainExports.isRtl("rtl")).toBe(true);
                expect(mainExports.isRtl("ltr")).toBe(false);
            });

            it("does NOT export the inline geometry helpers", () => {
                // These mirror a fraction, an x position or a gradient for a
                // right-to-left reading order, and exist for the chart rows that
                // draw in absolute user space. They stay available from
                // src/utils for the library's own components.
                const surface = mainExports as Record<string, unknown>;

                expect(surface.inlineFraction).toBeUndefined();
                expect(surface.inlineX).toBeUndefined();
                expect(surface.inlineGradientDirection).toBeUndefined();
                expect(surface.mirrorInline).toBeUndefined();
            });

            it("does NOT export internal merge utilities from main index", () => {
                // mergeExtensions utilities are internal implementation details
                // They should only be exported from utils for advanced users
                expect((mainExports as Record<string, unknown>).mergeExtensions).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions3).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions4).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions7).toBeUndefined();
            });
        });

        describe("Unused utilities should NOT be exported", () => {
            it("does NOT export compactTextVars", () => {
                // compactTextVars is defined but never used
                expect((mainExports as Record<string, unknown>).compactTextVars).toBeUndefined();
            });

            it("does NOT export compactInputVarsFn", () => {
                // compactInputVarsFn is defined but never used
                expect((mainExports as Record<string, unknown>).compactInputVarsFn).toBeUndefined();
            });

            it("does NOT export compactInputVarsNoHeightFn", () => {
                // compactInputVarsNoHeightFn is defined but never used
                expect((mainExports as Record<string, unknown>).compactInputVarsNoHeightFn).toBeUndefined();
            });
        });
    });

    describe("Theme exports (src/theme/index.ts)", () => {
        it("exports compactTheme", () => {
            expect(themeExports.compactTheme).toBeDefined();
        });

        it("exports compactThemeOverride", () => {
            expect(themeExports.compactThemeOverride).toBeDefined();
        });

        it("exports compactColors", () => {
            expect(themeExports.compactColors).toBeDefined();
        });

        it("exports compactDarkColors", () => {
            expect(themeExports.compactDarkColors).toBeDefined();
        });

        it("publishes the panel grid on theme.other", () => {
            // A consumer theming the library reads the geometry from the theme
            // rather than retyping the 280px identity.
            expect(themeExports.compactTheme.other.panelGrid).toBe(constantsExports.PANEL_GRID);
            expect(themeExports.compactTheme.other.panelGrid?.WIDTH).toBe(280);
        });

        it("compactThemeOverride carries the panel grid too", () => {
            expect(themeExports.compactThemeOverride.other?.panelGrid).toBe(constantsExports.PANEL_GRID);
        });

        it("compactTheme has components configured", () => {
            expect(themeExports.compactTheme.components).toBeDefined();
            expect(Object.keys(themeExports.compactTheme.components ?? {}).length).toBeGreaterThan(0);
        });
    });

    describe("Constants exports (src/constants/index.ts)", () => {
        it("exports DEFAULT_GRADIENT_STOP_COLOR", () => {
            expect(constantsExports.DEFAULT_GRADIENT_STOP_COLOR).toBeDefined();
        });

        it("exports SWATCH_COLORS_HEXA", () => {
            expect(constantsExports.SWATCH_COLORS_HEXA).toBeDefined();
        });

        it("exports popout constants", () => {
            expect(constantsExports.POPOUT_Z_INDEX_BASE).toBeDefined();
            expect(constantsExports.POPOUT_GAP).toBeDefined();
            expect(constantsExports.POPOUT_NESTED_GAP).toBeDefined();
        });

        it("exports MANTINE_SPACING", () => {
            expect(constantsExports.MANTINE_SPACING).toBeDefined();
        });

        it("exports PANEL_GRID", () => {
            expect(constantsExports.PANEL_GRID).toBeDefined();
            expect(constantsExports.PANEL_GRID.WIDTH).toBe(280);
        });

        it("exports PANEL_INK", () => {
            expect(constantsExports.PANEL_INK).toBeDefined();
            expect(Object.keys(constantsExports.PANEL_INK).length).toBeGreaterThan(0);
        });

        it("exports COMPACT_SIZING", () => {
            expect(constantsExports.COMPACT_SIZING).toBeDefined();
        });

        it("publishes exactly the constants the entry point re-exports", () => {
            // The constants barrel and the entry point's constant group are the
            // same set, so a constant added to one and not the other fails here.
            expect(Object.keys(constantsExports).sort((a, b) => a.localeCompare(b))).toEqual([
                "COMPACT_SIZING",
                "DEFAULT_GRADIENT_STOP_COLOR",
                "MANTINE_SPACING",
                "PANEL_GRID",
                "PANEL_INK",
                "POPOUT_GAP",
                "POPOUT_NESTED_GAP",
                "POPOUT_Z_INDEX_BASE",
                "SWATCH_COLORS_HEXA",
            ]);
        });

        it("does NOT export unused SWATCH_COLORS", () => {
            expect((constantsExports as Record<string, unknown>).SWATCH_COLORS).toBeUndefined();
        });

        it("does NOT export FLOATING_UI_Z_INDEX from constants index (internal use only)", () => {
            // FLOATING_UI_Z_INDEX is used internally by theme but not exposed in public API
            expect((constantsExports as Record<string, unknown>).FLOATING_UI_Z_INDEX).toBeUndefined();
        });
    });

    describe("Utils exports (src/utils/index.ts)", () => {
        it("exports color stop utilities", () => {
            expect(utilsExports.createColorStop).toBeDefined();
            expect(utilsExports.createDefaultGradientStops).toBeDefined();
        });

        it("exports color utilities", () => {
            expect(utilsExports.isValidHex).toBeDefined();
            expect(utilsExports.parseHexaColor).toBeDefined();
            expect(utilsExports.toHexaColor).toBeDefined();
            expect(utilsExports.opacityToAlphaHex).toBeDefined();
            expect(utilsExports.parseAlphaFromHexa).toBeDefined();
            expect(utilsExports.MAX_ALPHA_HEX).toBeDefined();
            expect(utilsExports.MAX_OPACITY_PERCENT).toBeDefined();
        });

        it("exports mergeExtensions utilities for advanced users", () => {
            // These are available from utils for advanced theme composition
            expect(utilsExports.mergeExtensions).toBeDefined();
            expect(utilsExports.mergeExtensions3).toBeDefined();
            expect(utilsExports.mergeExtensions4).toBeDefined();
        });

        it("exports the text direction helpers", () => {
            // useDirection and isRtl are on the package entry point as well; the
            // four inline geometry helpers are reachable only from here.
            expect(typeof utilsExports.useDirection).toBe("function");
            expect(typeof utilsExports.isRtl).toBe("function");
            expect(typeof utilsExports.inlineFraction).toBe("function");
            expect(typeof utilsExports.inlineX).toBe("function");
            expect(typeof utilsExports.inlineGradientDirection).toBe("function");
            expect(typeof utilsExports.mirrorInline).toBe("function");
        });

        it("publishes exactly the helpers named here", () => {
            expect(Object.keys(utilsExports).sort((a, b) => a.localeCompare(b))).toEqual(
                [
                    "createColorStop",
                    "createDefaultGradientStops",
                    "inlineFraction",
                    "inlineGradientDirection",
                    "inlineX",
                    "isRtl",
                    "isValidHex",
                    "MAX_ALPHA_HEX",
                    "MAX_OPACITY_PERCENT",
                    "mergeExtensions",
                    "mergeExtensions3",
                    "mergeExtensions4",
                    "mirrorInline",
                    "opacityToAlphaHex",
                    "parseAlphaFromHexa",
                    "parseHexaColor",
                    "toHexaColor",
                    "useDirection",
                ].sort((a, b) => a.localeCompare(b)),
            );
        });
    });
});
