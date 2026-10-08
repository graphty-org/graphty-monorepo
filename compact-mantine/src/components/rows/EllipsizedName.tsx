import { Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

/** A control inside the row, which keeps its own tooltip. */
const CONTROL = "button, a, input, select, textarea, [role], [tabindex]";

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
 * the row that holds it (the name, its count or value, anywhere but a control of its own) opens
 * the themed tooltip with the whole string; a name drawn whole has none, so a tooltip never
 * repeats what is already on the screen. The element's text stays the whole string, so the
 * accessible name never loses what the drawing cut.
 * @param props - Component props
 * @param props.name - The whole string
 * @param props.className - The class that draws and ellipsizes it
 * @param props.id - An id, for a row that names itself by this string
 * @param props.testId - A test id
 * @returns The name
 */
export function EllipsizedName({ name, className, id, testId }: EllipsizedNameProps): React.JSX.Element {
    const ref = useRef<HTMLSpanElement>(null);
    const [row, setRow] = useState<HTMLElement | null>(null);
    const [cut, setCut] = useState(false);
    useEffect(() => {
        const span = ref.current;
        const area = span?.parentElement ?? null;
        setRow(area);
        if (span === null || area === null) {
            return undefined;
        }
        // pointerover fires on every element the pointer enters, before the tooltip's own
        // mouseenter, so the measure is current when the tooltip decides to open.
        const measure = (event: PointerEvent): void => {
            const control = (event.target as Element).closest(CONTROL);
            const onControl = control !== null && control !== area && area.contains(control);
            setCut(!onControl && span.scrollWidth > span.clientWidth);
        };
        area.addEventListener("pointerover", measure);
        return () => {
            area.removeEventListener("pointerover", measure);
        };
    }, []);
    return (
        <>
            <span className={className} id={id} data-testid={testId} ref={ref}>
                {name}
            </span>
            {row !== null && <Tooltip label={name} target={row} disabled={!cut} />}
        </>
    );
}
