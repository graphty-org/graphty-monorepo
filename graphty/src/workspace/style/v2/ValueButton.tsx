/**
 * Style panel v2's value button: a row's main control drawn as what it holds (a list's first item, the shader
 * drawn in the shapes' place, a text's source, a list's swatches), opening where it is edited. One component,
 * so every such control looks and is named alike.
 */

import { Button } from "@mantine/core";
import React from "react";

/**
 * The button: see the file header.
 * @param props - Component props
 * @param props.label - its accessible name; the words it shows follow it after a comma
 * @param props.words - what it shows, if words
 * @param props.swatches - what it shows, if colors: a CSS background
 * @param props.opens - what it opens, for assistive technology ("dialog")
 * @param props.expanded - whether what it opens is open
 * @param props.left - a glyph before the words
 * @param props.right - a glyph after the words
 * @param props.onClick - opens it
 * @param props.rest - what a picker it opens adds to its trigger (its ref, its handlers)
 * @returns The button
 */
export function ValueButton({
    label,
    words,
    swatches,
    opens,
    expanded,
    left,
    right,
    onClick,
    ...rest
}: Readonly<{
    label: string;
    words?: string;
    swatches?: string;
    opens?: "dialog";
    expanded?: boolean;
    left?: React.ReactNode;
    right?: React.ReactNode;
    onClick?: () => void;
    ref?: React.Ref<HTMLButtonElement>;
}>): React.JSX.Element {
    return (
        <Button
            {...rest}
            variant="default"
            size="compact-xs"
            fullWidth
            justify={right === undefined ? "flex-start" : "space-between"}
            aria-label={words === undefined || words === "" ? label : `${label}, ${words}`}
            aria-haspopup={opens}
            aria-expanded={opens === undefined ? undefined : expanded === true}
            className={swatches === undefined ? "ws-value-listbox" : "ws-gradient-button"}
            style={swatches === undefined ? undefined : { background: swatches }}
            leftSection={left}
            rightSection={right}
            styles={{ label: { overflow: "hidden", textOverflow: "ellipsis" } }}
            onClick={onClick}
        >
            {words}
        </Button>
    );
}
