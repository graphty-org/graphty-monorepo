/**
 * A label's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.6
 * and 7.3): Main, always shown, then each sub-group the label style sets or the reader added from
 * the "+" on Main's legend, under a legend whose minus takes every field of it off the style.
 * Adding a sub-group that switches on (Pointer, Text shadow, Box shadow) writes its on field. A
 * field the layer sets that no line names is drawn in Main, so no set value is hidden.
 */

import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React from "react";

import { LabelFieldLine, type LabelLineContext } from "./LabelFieldLine";
import { flatOf, LABEL_COVERED, LABEL_RUBRIC, type LabelField, type LabelGroup, labelGroupFields } from "./labelRubric";
import { PopoverShell } from "./ThingPopover";
import { setOn } from "./things";

/**
 * Whether the layer sets a field of a sub-group, in the label style or through the field's own channel.
 * @param label - the label.
 * @param group - the sub-group.
 * @returns true when it does.
 */
function groupSet(label: LabelLineContext, group: LabelGroup): boolean {
    const { ctx, kind, style } = label;
    return labelGroupFields(group).some((field) => {
        const flat = flatOf(ctx.side, kind.style, field);
        return (style as Record<string, unknown>)[field] !== undefined || (flat !== undefined && setOn(ctx, flat));
    });
}

/**
 * The pop-over's contents: see the file header.
 * @param props - Component props
 * @param props.label - the label
 * @param props.others - set channels of the thing no line draws, drawn as today's fields
 * @returns The contents
 */
export function LabelPopover({
    label,
    others,
}: Readonly<{ label: LabelLineContext; others: readonly ChannelDescriptor[] }>): React.JSX.Element {
    const { ctx, style, write, title } = label;
    // Fields the layer sets that no line names (a gradient, a margin): drawn in Main.
    const loose = (Object.keys(style) as LabelField[]).filter(
        (field) => !LABEL_COVERED.has(field) && (style as Record<string, unknown>)[field] !== undefined,
    );
    return (
        <PopoverShell
            ctx={ctx}
            title={title}
            groups={LABEL_RUBRIC.groups}
            isSet={(group) => groupSet(label, group)}
            onAdd={(group) => {
                if (group.on !== undefined) {
                    write({ [group.on]: true });
                }
            }}
            onUnset={(group) => {
                write(Object.fromEntries(labelGroupFields(group).map((field) => [field, undefined])));
            }}
            main={[
                ...LABEL_RUBRIC.main.map((line) => (
                    <LabelFieldLine key={`main-${line.field}-${line.name ?? ""}`} label={label} line={line} />
                )),
                ...loose.map((field) => <LabelFieldLine key={`loose-${field}`} label={label} line={{ field }} />),
            ]}
            others={others}
            linesOf={(group) =>
                group.lines.map((line) => (
                    <LabelFieldLine key={`${group.name}-${line.field}-${line.name ?? ""}`} label={label} line={line} />
                ))
            }
        />
    );
}
