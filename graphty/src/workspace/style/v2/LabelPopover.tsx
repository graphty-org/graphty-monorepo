/**
 * A label's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.6 and 7.3, and "Input
 * rules"): its Kind or Look first, then Show, Font, Style and Location, and the "..." in its header listing its sixteen
 * groups under four headings, each opening its own pop-over beside it. The Background group starts with a Solid,
 * Linear or Radial tab strip. A line another field rules out appears once it applies. A field the layer sets that no
 * line names is drawn with the main lines, so no set value is hidden. A caption's Position group ends in its distance
 * from its end, a channel of its own.
 */

import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React from "react";

import { labelRuledOut } from "./drawn";
import { LabelFieldLine, type LabelLineContext } from "./LabelFieldLine";
import {
    BACKGROUND,
    BACKGROUND_TABS,
    flatOf,
    LABEL_COVERED,
    LABEL_RUBRIC,
    type LabelField,
    type LabelGroup,
    labelGroupFields,
    labelLineFields,
    type LabelLineSpec,
} from "./labelRubric";
import { RubricLine, SegmentsLine } from "./RubricLine";
import { PopoverShell } from "./ThingPopover";
import { setOn } from "./things";

/** The group a caption's distance from its end sits in (design 7.2). */
const POSITION = "Position";

/** The Background lines each tab shows (any line the layer sets shows too). */
const BACKGROUND_LINES: Readonly<Record<(typeof BACKGROUND_TABS)[number]["value"], readonly LabelField[]>> = {
    solid: ["background", "backgroundOpacity", "backgroundShape", "cornerRadius"],
    linear: ["gradientColors", "gradientDirection", "backgroundShape", "cornerRadius"],
    radial: ["gradientColors", "backgroundShape", "cornerRadius"],
};

/**
 * Whether the layer sets a field of a group, in the label style or through the field's own channel.
 * @param label - the label.
 * @param group - the group.
 * @returns true when it does.
 */
function groupSet(label: LabelLineContext, group: LabelGroup): boolean {
    const { ctx, kind } = label;
    if (group.name === POSITION && kind.distance !== undefined && setOn(ctx, kind.distance)) {
        return true;
    }
    return labelGroupFields(group).some((field) => fieldSet(label, field));
}

/**
 * Whether the layer sets a field, in the label style or through its own channel.
 * @param label - the label.
 * @param field - the field.
 * @returns true when it does.
 */
function fieldSet(label: LabelLineContext, field: LabelField): boolean {
    const flat = flatOf(label.ctx.side, label.kind.style, field);
    return (
        (label.style as Record<string, unknown>)[field] !== undefined || (flat !== undefined && setOn(label.ctx, flat))
    );
}

/**
 * The Background tab shown: Solid unless the style draws a gradient, then its kind.
 * @param label - the label.
 * @returns the tab.
 */
function backgroundTab(label: LabelLineContext): (typeof BACKGROUND_TABS)[number]["value"] {
    const { style } = label;
    if (style.gradient !== true) {
        return "solid";
    }
    return style.gradientType === "radial" ? "radial" : "linear";
}

/**
 * The pop-over's contents: see the file header.
 * @param props - Component props
 * @param props.label - the label
 * @param props.others - set channels of the thing no line draws, drawn as today's fields
 * @param props.first - its Kind or Look line, when it has kinds
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
    // Fields the layer sets that no line names (a margin of a file): drawn with the main lines.
    const loose = (Object.keys(style) as LabelField[]).filter(
        (field) => !LABEL_COVERED.has(field) && (style as Record<string, unknown>)[field] !== undefined,
    );
    const set = (line: LabelLineSpec): boolean => labelLineFields(line).some((field) => fieldSet(label, field));
    // A line another field rules out appears once it applies (design "Input rules", "Tabs").
    const shown = (line: LabelLineSpec, beside: readonly LabelLineSpec[] = []): boolean =>
        !labelRuledOut(
            ctx,
            kind.style,
            style,
            line.field,
            labelLineFields(line),
            beside.flatMap((each) => labelLineFields(each)),
        ) || set(line);
    const onUnset = (group: LabelGroup): void => {
        const drop = group.name === POSITION && kind.distance !== undefined ? [kind.distance] : [];
        write(Object.fromEntries(labelGroupFields(group).map((field) => [field, undefined])), drop);
    };
    const lineOf = (key: string, line: LabelLineSpec): React.JSX.Element => (
        <LabelFieldLine key={`${key}-${line.field}-${line.name ?? ""}`} label={label} line={line} />
    );
    const background = (group: LabelGroup): React.ReactNode => {
        const tab = backgroundTab(label);
        return [
            <div key="strip" data-strip="">
                <SegmentsLine
                    label={`${title} background`}
                    options={BACKGROUND_TABS}
                    value={tab}
                    onPick={(next) => {
                        write(
                            next === "solid"
                                ? { gradient: undefined, gradientType: undefined }
                                : { gradient: true, gradientType: next },
                        );
                    }}
                />
            </div>,
            ...group.lines
                .filter((line) => BACKGROUND_LINES[tab].includes(line.field) || set(line))
                .map((line) => lineOf(group.name, line)),
        ];
    };
    const linesOf = (group: LabelGroup): React.ReactNode =>
        group.name === BACKGROUND
            ? background(group)
            : [
                  ...group.lines.filter((line) => shown(line, group.lines)).map((line) => lineOf(group.name, line)),
                  // A caption's distance from its end: a number, so it sits with Position.
                  ...(group.name === POSITION && kind.distance !== undefined
                      ? [<RubricLine key="distance" ctx={ctx} line={{ channel: kind.distance, name: "From end" }} />]
                      : []),
              ];
    return (
        <PopoverShell
            ctx={ctx}
            first={first}
            groups={LABEL_RUBRIC.groups}
            isSet={(group) => groupSet(label, group)}
            onUnset={onUnset}
            main={[
                // Size and color are the row's own lines (ia-design 2), so the main lines start at Show: one home each.
                ...LABEL_RUBRIC.main.map((line) => lineOf("main", line)),
                ...loose.map((field) => <LabelFieldLine key={`loose-${field}`} label={label} line={{ field }} />),
            ]}
            others={others}
            linesOf={linesOf}
        />
    );
}
