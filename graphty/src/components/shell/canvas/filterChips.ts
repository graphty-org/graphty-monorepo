/**
 * The filter status strip's chips and its collapse rule, apart from the strip that draws
 * them so the component file exports components only.
 */

/**
 * One active filter chip.
 */
export interface FilterStatusChip {
    /** Stable id, unique within the strip. */
    readonly id: string;
    /** The chip's text, e.g. "indoorOutdoor = outdoor". */
    readonly label: string;
    /** The chip's full text when the label is shortened. */
    readonly title?: string;
    /** Opens the filter in Explore. */
    readonly onClick?: () => void;
}

/**
 * Applies the collapse rule: more than two chips become one chip that opens Explore.
 * The collapsed chip carries the count, in the spec's own form ("3 filters").
 * @param chips - the active chips.
 * @param onOpenExplore - what the collapsed chip does.
 * @returns the chips the strip should actually draw.
 */
export function collapseFilterChips(
    chips: readonly FilterStatusChip[],
    onOpenExplore?: () => void,
): readonly FilterStatusChip[] {
    if (chips.length <= 2) {
        return chips;
    }

    return [
        {
            id: "collapsed",
            label: `${String(chips.length)} filters`,
            title: chips.map((chip) => chip.label).join(", "),
            onClick: onOpenExplore,
        },
    ];
}
