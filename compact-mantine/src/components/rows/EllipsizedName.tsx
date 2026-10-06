import { Tooltip } from "@mantine/core";
import React, { useState } from "react";

/** Props for EllipsizedName. */
interface EllipsizedNameProps {
    /** The whole string, drawn and, while it is cut short, the tooltip. */
    name: string;
    /** The class that draws it, and ellipsizes it. */
    className: string;
    /** An id, for a row that names itself by this string. */
    id?: string;
    /** A test id. */
    testId?: string;
}

/**
 * A name that ellipsizes when its row is too narrow. While it is cut short, a pointer resting on
 * it opens the themed tooltip with the whole string; a name drawn whole has none, so a tooltip
 * never repeats what is already on the screen. The element's text stays the whole string, so the
 * accessible name never loses what the drawing cut.
 * @param props - Component props
 * @param props.name - The whole string
 * @param props.className - The class that draws and ellipsizes it
 * @param props.id - An id, for a row that names itself by this string
 * @param props.testId - A test id
 * @returns The name
 */
export function EllipsizedName({ name, className, id, testId }: EllipsizedNameProps): React.JSX.Element {
    const [cut, setCut] = useState(false);
    return (
        <Tooltip label={name} disabled={!cut}>
            <span
                className={className}
                id={id}
                data-testid={testId}
                onPointerEnter={(event) => {
                    setCut(event.currentTarget.scrollWidth > event.currentTarget.clientWidth);
                }}
            >
                {name}
            </span>
        </Tooltip>
    );
}
