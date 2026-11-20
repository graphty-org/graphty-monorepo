import { Text, type TextProps } from "@mantine/core";
import React from "react";

/** Props for ControlLabel: Mantine Text's look props, and the few element props a label needs. */
type ControlLabelProps = TextProps & {
    readonly children: React.ReactNode;
    readonly id?: string;
    readonly title?: string;
    readonly span?: boolean;
    readonly component?: "div" | "span" | "h3";
    readonly className?: string;
    readonly "aria-hidden"?: boolean;
    readonly "aria-label"?: string;
    readonly [data: `data-${string}`]: string | boolean | undefined;
};

/**
 * The name of a control, or of a group of controls, in the Style sidebar ("Color", "Card contents"): the only
 * words the sidebar draws outside a control (src/workspace/style/approved-controls.json, #8739). Never a count, a
 * caption, a note or a warning: those go in a control's tooltip, a dialog or nowhere.
 * @param props - Mantine Text's props
 * @returns The label
 */
export function ControlLabel(props: Readonly<ControlLabelProps>): React.JSX.Element {
    return <Text {...props} data-control-label="" />;
}
