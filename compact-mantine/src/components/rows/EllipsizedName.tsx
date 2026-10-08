import { Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/** A control inside the row, which keeps its own tooltip. */
const CONTROL = "button, a, input, select, textarea, [role], [tabindex]";

/** Another cut-short text in the row that anchors its own tooltip, such as a long value. */
const SELF_ANCHORED = "[data-ellipsized]";

/** The row's quiet text (a count, a fill), which the tooltip carries after the name. */
const DETAIL = "[data-row-detail]";

/** Props for EllipsizedName. */
interface EllipsizedNameProps {
    /** The whole string, drawn and, while it is cut short, the tooltip. */
    name: React.ReactNode;
    /** The class that draws it, and ellipsizes it. */
    className: string;
    /** An id, for a row that names itself by this string. */
    id?: string;
    /** A test id. */
    testId?: string;
    /**
     * Anchors the tooltip to the text itself rather than to its row: for a second text in a row,
     * such as a long value, whose tooltip must not take the row from the name's.
     */
    self?: boolean;
    /**
     * The row's quiet text, drawn by the row in an element marked `data-row-detail`. While the
     * name or that text is cut short, the tooltip shows both, so a cut row is read whole.
     */
    detail?: React.ReactNode;
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
 * @param props.self - Anchors the tooltip to the text itself rather than to its row
 * @param props.detail - The row's quiet text, which the tooltip carries after the name
 * @returns The name
 */
export function EllipsizedName({
    name,
    className,
    id,
    testId,
    self = false,
    detail,
}: EllipsizedNameProps): React.JSX.Element {
    const ref = useRef<HTMLSpanElement>(null);
    const [row, setRow] = useState<HTMLElement | null>(null);
    const [cut, setCut] = useState(false);
    const hasDetail = detail !== undefined && detail !== null && detail !== false && detail !== "";
    useEffect(() => {
        const span = ref.current;
        const area = self ? span : (span?.parentElement ?? null);
        setRow(area);
        if (span === null || area === null) {
            return undefined;
        }
        // pointerover fires on every element the pointer enters, before the tooltip's own
        // mouseenter, so the measure is current when the tooltip decides to open.
        const measure = (event: PointerEvent): void => {
            const target = event.target as Element;
            const control = target.closest(CONTROL);
            const onControl = control !== null && control !== area && area.contains(control);
            // A cut value under the pointer shows its own tooltip, so the name's stays shut.
            const other = target.closest(SELF_ANCHORED);
            const onOtherCut = other !== null && other !== span && other.scrollWidth > other.clientWidth;
            // Rendered, tooltip mounted and listening, before this same pointer movement's
            // mouseenter: a plain update waits for a later task, and the enter would be missed.
            const quiet = hasDetail ? area.querySelector(DETAIL) : null;
            const quietCut = quiet !== null && quiet.scrollWidth > quiet.clientWidth;
            flushSync(() => {
                setCut(!onControl && !onOtherCut && (span.scrollWidth > span.clientWidth || quietCut));
            });
        };
        // A press on the row is the reader acting on it: the name's tooltip shuts, so it does not
        // stay over what the press opens (the row's children, a menu) while the pointer rests.
        const shut = (): void => {
            setCut(false);
        };
        area.addEventListener("pointerover", measure);
        area.addEventListener("pointerdown", shut);
        return () => {
            area.removeEventListener("pointerover", measure);
            area.removeEventListener("pointerdown", shut);
        };
    }, [self, hasDetail]);
    return (
        <>
            <span className={className} id={id} data-testid={testId} data-ellipsized={self ? "" : undefined} ref={ref}>
                {name}
            </span>
            {/* No tooltip at all while the text is whole, rather than a disabled one: inside a
                Tooltip.Group only one tooltip is open at a time, and a disabled tooltip still
                opens, unseen, and takes the turn from one in the same row that has something to
                show. */}
            {row !== null && cut && (
                <Tooltip
                    label={
                        hasDetail ? (
                            <>
                                <div>{name}</div>
                                <div>{detail}</div>
                            </>
                        ) : (
                            name
                        )
                    }
                    target={row}
                />
            )}
        </>
    );
}
