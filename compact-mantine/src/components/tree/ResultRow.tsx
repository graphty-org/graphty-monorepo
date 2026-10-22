import React, { forwardRef } from "react";

import { UiGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { EllipsizedName } from "../rows/EllipsizedName";

/**
 * Props for the ResultRow component.
 */
export interface ResultRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
    /** The result's name. */
    name: string;
    /** The search text: its first case-insensitive occurrence in the name is drawn at 600. */
    match?: string;
    /** The second line: where the result lives (a page, a parent path). */
    path?: React.ReactNode;
    /** The 16 x 16 type glyph. */
    icon?: React.ReactNode;
    /** The current result (blue fill; `aria-selected`). */
    current?: boolean;
    /**
     * For a list the reader picks several results from, one at a time: whether this result is
     * already picked. A picked row shows a check at its end and is `aria-selected` too; only the
     * current row is filled blue.
     */
    picked?: boolean;
    /** `"component"`: both lines and the glyph in the component (purple) color. */
    tone?: "default" | "component";
    /**
     * How many lines the name and the path each take before they end in "...": 1 (the default)
     * or 2, for results whose words are read whole rather than scanned, such as a sentence.
     */
    lines?: 1 | 2;
}

/**
 * The name with the matched substring wrapped for the 600 weight.
 * @param name - the name
 * @param match - the search text
 * @returns the name's nodes
 */
function highlight(name: string, match: string | undefined): React.ReactNode {
    const at = match ? name.toLocaleLowerCase().indexOf(match.toLocaleLowerCase()) : -1;
    if (!match || at < 0) {
        return name;
    }
    return (
        <>
            {name.slice(0, at)}
            <span className="cm-result-match">{name.slice(at, at + match.length)}</span>
            {name.slice(at + match.length)}
        </>
    );
}

/**
 * A find result (design/figma-spec.md 10.4): 240 x 52 with a path line, 34 without, padding
 * 8 8 8 16, a 16px glyph, the name at 11/16 with the match at 600 and the path at 10/16 in the
 * secondary color. The current result is blue; hover is gray. A long name or path ends in "..."
 * and shows whole in a tooltip on hover; with `lines={2}` each first wraps to a second line.
 *
 * It is an `option`: put the rows in an element with `role="listbox"` and drive them from the
 * search field with `aria-activedescendant` (give each row an `id`), so focus stays in the
 * field. Pressing a row does not take focus from the field.
 * @param props - Component props
 * @returns The row
 */
export const ResultRow = forwardRef<HTMLDivElement, ResultRowProps>(function ResultRow(
    { name, match, path, icon, current = false, picked, tone = "default", lines = 1, onMouseDown, ...rest },
    ref,
) {
    useCompactStyles();
    return (
        <div // NOSONAR(S6819): an option of a listbox driven by aria-activedescendant with rich rows; a native option holds text only
            ref={ref}
            role="option"
            aria-selected={current || picked === true}
            data-active={current ? "" : undefined}
            data-tone={tone === "component" ? "component" : undefined}
            data-lines={lines === 2 ? "2" : undefined}
            className="cm-result-row"
            // An option of a listbox driven by aria-activedescendant: never a tab stop.
            tabIndex={-1}
            onMouseDown={(event) => {
                // Keep focus in the search field that drives the list.
                event.preventDefault();
                onMouseDown?.(event);
            }}
            {...rest}
        >
            <span className="cm-result-icon" aria-hidden="true">
                {icon}
            </span>
            <span className="cm-result-text">
                {/* A name or path cut short ends in "..."; resting on the row shows both whole. */}
                <EllipsizedName name={highlight(name, match)} className="cm-result-name" detail={path} />
                {path !== undefined && path !== null && (
                    <span className="cm-result-path" data-row-detail="">
                        {path}
                    </span>
                )}
            </span>
            {picked === true && (
                <span className="cm-result-picked" aria-hidden="true">
                    <UiGlyph name="check" size={16} />
                </span>
            )}
        </div>
    );
});
