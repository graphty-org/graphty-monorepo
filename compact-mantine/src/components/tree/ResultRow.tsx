import React, { forwardRef } from "react";

import { useCompactStyles } from "../../theme/useCompactStyles";

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
    /** `"component"`: both lines and the glyph in the component (purple) colour. */
    tone?: "default" | "component";
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
 * secondary colour. The current result is blue; hover is grey.
 *
 * It is an `option`: put the rows in an element with `role="listbox"` and drive them from the
 * search field with `aria-activedescendant` (give each row an `id`), so focus stays in the
 * field. Pressing a row does not take focus from the field.
 * @param props - Component props
 * @returns The row
 */
export const ResultRow = forwardRef<HTMLDivElement, ResultRowProps>(function ResultRow(
    { name, match, path, icon, current = false, tone = "default", onMouseDown, ...rest },
    ref,
) {
    useCompactStyles();
    return (
        <div
            ref={ref}
            role="option"
            aria-selected={current}
            data-tone={tone === "component" ? "component" : undefined}
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
                <span className="cm-result-name" title={name}>
                    {highlight(name, match)}
                </span>
                {path !== undefined && path !== null && <span className="cm-result-path">{path}</span>}
            </span>
        </div>
    );
});
