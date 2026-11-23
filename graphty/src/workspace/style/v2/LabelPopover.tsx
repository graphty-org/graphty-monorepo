/**
 * A label's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.6
 * and 7.3): Main, always shown, then each sub-group the label style sets or the reader added from
 * the "+" on Main's legend, under a legend whose minus takes every field of it off the style.
 * Adding Callout writes its pointer on; in a group holding two looks (Label shadow, Background's
 * gradient) a look's line switches that look on when set (`needs` in labelRubric.ts). A
 * field the layer sets that no line names is drawn in Main, so no set value is hidden. A caption's
 * Position sub-group ends in its distance from its end, a channel of its own.
 */

import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React from "react";

import { LabelFieldLine, type LabelLineContext } from "./LabelFieldLine";
import {
    flatOf,
    LABEL_COVERED,
    LABEL_RUBRIC,
    type LabelField,
    type LabelGroup,
    labelGroupFields,
    type LabelLineSpec,
} from "./labelRubric";
import { RubricLine } from "./RubricLine";
import { AdvancedLine, PopoverShell } from "./ThingPopover";
import { setOn } from "./things";

/** The sub-group a caption's distance from its end sits in (design 7.2). */
const POSITION = "Position";

/**
 * A group with only its pop-over lines, or only its Advanced dialog's (design "Input rules"); there a line under a
 * switch is called by its whole name, as the switch is not above it.
 * @param group - the group.
 * @param advanced - which lines.
 * @returns the group, or undefined when it has none of them.
 */
function partOf(group: LabelGroup, advanced: boolean): LabelGroup | undefined {
    const lines = group.lines
        .filter((line) => (line.advanced === true) === advanced)
        .map((line): LabelLineSpec =>
            advanced ? { ...line, name: line.fullName ?? line.name, under: undefined } : line,
        );
    return lines.length === 0 ? undefined : { ...group, lines, ...(advanced ? { on: undefined } : {}) };
}

/** The pop-over's groups and the Advanced dialog's, Main's rare lines first there. */
const SHOWN = LABEL_RUBRIC.groups.flatMap((group) => partOf(group, false) ?? []);
const ADVANCED = [{ name: "Main", lines: LABEL_RUBRIC.main }, ...LABEL_RUBRIC.groups].flatMap(
    (group) => partOf(group, true) ?? [],
);

/**
 * Whether the layer sets a field of a sub-group, in the label style or through the field's own channel.
 * @param label - the label.
 * @param group - the sub-group.
 * @returns true when it does.
 */
function groupSet(label: LabelLineContext, group: LabelGroup): boolean {
    const { ctx, kind, style } = label;
    if (group.name === POSITION && kind.distance !== undefined && setOn(ctx, kind.distance)) {
        return true;
    }
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
 * @param props.first - its Kind line, when it has kinds
 * @returns The contents
 */
export function LabelPopover({
    label,
    others,
    first,
}: Readonly<{
    label: LabelLineContext;
    others: readonly ChannelDescriptor[];
    first?: React.ReactNode;
}>): React.JSX.Element {
    const { ctx, kind, style, write, title } = label;
    // Fields the layer sets that no line names (a gradient, a margin): drawn in Main.
    const loose = (Object.keys(style) as LabelField[]).filter(
        (field) => !LABEL_COVERED.has(field) && (style as Record<string, unknown>)[field] !== undefined,
    );
    const onUnset = (group: LabelGroup): void => {
        const drop = group.name === POSITION && kind.distance !== undefined ? [kind.distance] : [];
        write(Object.fromEntries(labelGroupFields(group).map((field) => [field, undefined])), drop);
    };
    const linesOf = (group: LabelGroup): React.ReactNode => [
        ...group.lines.map((line) => (
            <LabelFieldLine key={`${group.name}-${line.field}-${line.name ?? ""}`} label={label} line={line} />
        )),
        // A caption's distance from its end: a number, so it sits with Position in the Advanced dialog.
        ...(group.name === POSITION && kind.distance !== undefined
            ? [<RubricLine key="distance" ctx={ctx} line={{ channel: kind.distance, name: "From end" }} />]
            : []),
    ];
    return (
        <PopoverShell
            ctx={ctx}
            title={title}
            first={first}
            groups={SHOWN}
            isSet={(group) => groupSet(label, group)}
            onAdd={(group) => {
                if (group.on !== undefined) {
                    write({ [group.on]: true });
                }
            }}
            onUnset={onUnset}
            main={[
                // Size and color are the row's own lines (ia-design 2), so Main starts at Show: one home each.
                ...LABEL_RUBRIC.main
                    .filter((line) => line.advanced !== true)
                    .map((line) => (
                        <LabelFieldLine key={`main-${line.field}-${line.name ?? ""}`} label={label} line={line} />
                    )),
                ...loose.map((field) => <LabelFieldLine key={`loose-${field}`} label={label} line={{ field }} />),
            ]}
            others={others}
            linesOf={linesOf}
            advanced={
                <AdvancedLine
                    title={title}
                    groups={ADVANCED}
                    isSet={(group) => groupSet(label, group)}
                    onUnset={onUnset}
                    linesOf={linesOf}
                />
            }
        />
    );
}
