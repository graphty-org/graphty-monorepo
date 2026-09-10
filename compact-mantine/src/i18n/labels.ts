// Every string the library produces, in one place. Section 2.1 of the hardening
// contract: ship English defaults, let a consumer override every string, and do
// not force an i18n framework on anyone. React Aria's
// useLocalizedStringFormatter is the reference; this is a smaller version of it.
//
// Rules for adding an entry:
//   - a plain string when the text is fixed;
//   - a function when the text interpolates, taking already-formatted strings
//     rather than raw numbers, because the locale-aware formatting lives in
//     ./formatters and the label layer only assembles words;
//   - a doc comment naming the component and the element it appears on, because
//     that is the context a translator needs and cannot get from the key.
//
// Developer diagnostics are deliberately absent. The seven components that
// report a mistake -- ControlSection, ActionRow, CompoundRow, FieldRow,
// IconGroupRow, ProseBlock and ToggleRowGroup -- all go through useDevWarning
// in src/utils/dev-warning.ts, which is gated on NODE_ENV. Those messages are
// never seen by an end user, and staying in one language is what makes them
// findable in the source from a pasted console line.

/**
 * Every user-visible or assistive-technology-visible string this library
 * produces.
 *
 * Pass a partial object to `LabelsProvider` to replace any of them; anything you
 * leave out keeps its English default. Entries that interpolate are functions,
 * so a translation can put the pieces in whatever order its language needs
 * rather than being forced into the English word order.
 * @example
 * ```tsx
 * <LabelsProvider
 *     locale="fr-FR"
 *     labels={{
 *         mixed: "Multiple",
 *         about: (label) => `A propos de ${label}`,
 *     }}
 * >
 *     <Inspector />
 * </LabelsProvider>
 * ```
 */
export interface CompactMantineLabels {
    // PanelField

    /**
     * Shown in a field's value position when the current multi-selection
     * disagrees, in place of a value.
     */
    mixed: string;
    /**
     * What a screen reader says about a field whose value comes from a data
     * attribute rather than being typed in once. Never drawn on the field,
     * which shows the state as a filled glyph.
     */
    fieldBound: string;
    /**
     * What a screen reader says about a field whose value has been set but has
     * not taken effect yet. Never drawn on the field, which shows the state as
     * a small mark in the corner of its glyph slot.
     */
    fieldPending: string;

    // RampRow

    /**
     * Accessible name and tooltip of the square-root curve glyph in a ramp row's
     * trailing slot. The word is never drawn on the row.
     */
    scaleSqrt: string;
    /**
     * Accessible name and tooltip of the linear curve glyph in a ramp row's
     * trailing slot. The word is never drawn on the row.
     */
    scaleLinear: string;
    /**
     * Accessible name and tooltip of the logarithmic curve glyph in a ramp row's
     * trailing slot. The word is never drawn on the row.
     */
    scaleLog: string;

    // ProseBlock

    /**
     * Accessible name and tooltip of the chevron on a run record, which opens
     * the full record.
     */
    details: string;
    /**
     * Accessible name and tooltip of the warning glyph beside a line that
     * states how a reading departs from being exact and complete.
     */
    departure: string;

    // MetricRow

    /**
     * Accessible name and tooltip of a metric row's bar, which draws where the
     * value falls in its distribution.
     * @param ordinal - The rank spelled as an ordinal, already formatted for the active locale
     * @returns The bar's accessible name, such as "98th percentile"
     */
    percentile: (ordinal: string) => string;

    // ControlSection

    /**
     * Accessible name of the button that expands a collapsed section.
     * @param label - The section's own name, as shown in its header
     * @returns The button's accessible name
     */
    expandSection: (label: string) => string;
    /**
     * Accessible name of the button that collapses an expanded section.
     * @param label - The section's own name, as shown in its header
     * @returns The button's accessible name
     */
    collapseSection: (label: string) => string;
    /**
     * Accessible name and tooltip of the button in an empty section's header
     * that adds the section's first item.
     * @param label - The section's own name, as shown in its header
     * @returns The button's accessible name
     */
    addToSection: (label: string) => string;
    /**
     * Accessible name of the dot in a section header that marks the section as
     * holding settings changed from their defaults.
     * @param label - The section's own name, as shown in its header
     * @returns The dot's accessible name
     */
    sectionHasConfiguredValues: (label: string) => string;

    // InfoCircle

    /**
     * Accessible name and tooltip of the circled "i" that opens an explanation.
     * @param label - The name of the thing being explained
     * @returns The button's accessible name
     */
    about: (label: string) => string;

    // StyleNumberInput, StyleSelect and CompactColorInput

    /**
     * Accessible name of the button that returns a control to its default value.
     * @param label - The control's own name
     * @returns The button's accessible name
     */
    resetToDefault: (label: string) => string;

    // CompactColorInput

    /** Accessible name of the swatch button that opens the colour picker. */
    colorSwatch: string;
    /** Accessible name of the text box holding the colour's hex value. */
    colorHexValue: string;
    /** Accessible name of the number box holding the colour's opacity percentage. */
    opacity: string;
    /** Title of the colour picker pop-out when the caller supplied no label. */
    colorPanelTitle: string;
    /**
     * Stands in for a missing control name inside a reset button's accessible
     * name, giving "Reset color to default".
     */
    colorGenericName: string;

    // GradientEditor

    /** Heading above the list of stops in the gradient editor. */
    colorStops: string;
    /** Accessible name of the button that adds a stop to a gradient. */
    addColorStop: string;
    /**
     * Accessible name of the slider that sets where one stop sits along a
     * gradient.
     * @param position - The stop's position in the list, counting from one, already formatted for the active locale
     * @returns The slider's accessible name
     */
    colorStopPosition: (position: string) => string;
    /**
     * Accessible name of the button that removes one stop from a gradient.
     * @param position - The stop's position in the list, counting from one, already formatted for the active locale
     * @returns The button's accessible name
     */
    removeColorStop: (position: string) => string;
    /** Heading above the gradient editor's direction slider. */
    direction: string;
    /** Accessible name of the gradient editor's direction slider. */
    gradientDirection: string;

    // Shared numeric readings

    /**
     * An angle, as read out beside a slider and on its tick marks.
     * @param value - The angle, already formatted for the active locale
     * @returns The angle followed by the degree sign, such as "90 deg"
     */
    degrees: (value: string) => string;
    /**
     * A percentage, as read out beside a slider.
     * @param value - The percentage, already formatted for the active locale
     * @returns The percentage with its unit, such as "50%"
     */
    percent: (value: string) => string;

    // DataTable

    /**
     * Accessible name of the whole table when the caller supplies neither a
     * `label` nor a `labelledBy`.
     */
    dataTable: string;
    /** Accessible name of the search box above a data table. */
    search: string;
    /** Prompt shown inside a data table's empty search box. */
    searchPlaceholder: string;
    /** Accessible name of the button that empties a data table's search box. */
    clearSearch: string;
    /** Shown in place of the rows when a data table has no data at all. */
    noRows: string;
    /** Shown in place of the rows when a search matches nothing. */
    noMatchingRows: string;
    /**
     * Announced when the number of rows on show changes, such as after a
     * search.
     * @param shown - How many rows are on show, already formatted for the active locale
     * @param total - How many rows there are in all, already formatted for the active locale
     * @returns The announcement, such as "12 of 400 rows"
     */
    rowsShown: (shown: string, total: string) => string;
    /**
     * Announced when a data table's selection changes.
     * @param count - How many rows are selected, already formatted for the active locale
     * @returns The announcement, such as "3 selected"
     */
    rowsSelected: (count: string) => string;
    /**
     * How a cell holding true is written, when its column supplies no drawing
     * of its own.
     */
    yes: string;
    /**
     * How a cell holding false is written, when its column supplies no drawing
     * of its own.
     */
    no: string;

    // Popout

    /** Accessible name of the button that closes a pop-out panel. */
    closePanel: string;
    /** Accessible name of a tabbed pop-out panel when its first tab has no label. */
    settings: string;

    // Ordinals

    /**
     * Spells a whole number as an ordinal, given its plural category.
     *
     * This is the entry that makes ordinals work outside English. The category
     * comes from `Intl.PluralRules` for the active locale, so a translation
     * chooses a spelling per category rather than reproducing English's
     * "st/nd/rd/th": French wants "1er" for `one` and "2e" for everything else,
     * and a language with no ordinal marker at all returns the number unchanged.
     * @param value - The number, already formatted for the active locale
     * @param rule - The number's ordinal plural category in the active locale
     * @returns The number spelled as an ordinal
     */
    ordinal: (value: string, rule: Intl.LDMLPluralRule) => string;
}

/**
 * The English strings this library ships with.
 *
 * `useLabels` returns these when there is no `LabelsProvider` above, so a
 * consumer who does not care about translation is unaffected. Spread them to
 * build a full set of your own, or pass only the entries you want to change to
 * `LabelsProvider`.
 */
export const defaultLabels: CompactMantineLabels = {
    mixed: "Mixed",
    fieldBound: "Bound to a data attribute",
    fieldPending: "Set but not yet applied",

    scaleSqrt: "Square root scale",
    scaleLinear: "Linear scale",
    scaleLog: "Logarithmic scale",

    details: "Details",
    departure: "Departure",

    percentile: (ordinal: string): string => `${ordinal} percentile`,

    expandSection: (label: string): string => `Expand ${label}`,
    collapseSection: (label: string): string => `Collapse ${label}`,
    addToSection: (label: string): string => `Add ${label}`,
    sectionHasConfiguredValues: (label: string): string => `${label} has configured values`,

    about: (label: string): string => `About ${label}`,

    resetToDefault: (label: string): string => `Reset ${label} to default`,

    colorSwatch: "Color swatch",
    colorHexValue: "Color hex value",
    opacity: "Opacity",
    colorPanelTitle: "Color",
    colorGenericName: "color",

    colorStops: "Color Stops",
    addColorStop: "Add color stop",
    colorStopPosition: (position: string): string => `Stop ${position} position`,
    removeColorStop: (position: string): string => `Remove color stop ${position}`,
    direction: "Direction",
    gradientDirection: "Gradient direction",

    degrees: (value: string): string => `${value}\u00b0`,
    percent: (value: string): string => `${value}%`,

    dataTable: "Data table",
    search: "Search",
    searchPlaceholder: "Search",
    clearSearch: "Clear search",
    noRows: "No rows",
    noMatchingRows: "No rows match the search",
    rowsShown: (shown: string, total: string): string => `${shown} of ${total} rows`,
    rowsSelected: (count: string): string => `${count} selected`,
    yes: "Yes",
    no: "No",

    closePanel: "Close panel",
    settings: "Settings",

    // Intl.PluralRules already sorts out English's exceptions: 11, 12 and 13
    // come back as "other" and take "th", while 21, 22 and 23 come back as
    // "one", "two" and "few".
    ordinal: (value: string, rule: Intl.LDMLPluralRule): string => {
        switch (rule) {
            case "one":
                return `${value}st`;
            case "two":
                return `${value}nd`;
            case "few":
                return `${value}rd`;
            default:
                return `${value}th`;
        }
    },
};
