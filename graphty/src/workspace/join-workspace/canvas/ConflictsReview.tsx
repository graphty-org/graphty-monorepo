import { Popout, PopoutManager } from "@graphty/compact-mantine";
import type { JoinChoices, JoinReduce, JoinReport, JoinStepEntry } from "@graphty/graphty-element/session";
import { Button, Select, Text } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { formatNumber } from "../../inspector/words";
import { ariaKey } from "../../keys/keys";
import { useJoinWorkspace } from "../context";

/** A clashing column's rule: one of `clash`'s three, or a `fuse` reduction. */
type Rule = "both" | "keep" | "overwrite" | JoinReduce;

/** Each rule's words, in menu order. */
const RULES: readonly { readonly value: Rule; readonly label: string }[] = [
    { value: "both", label: "Keep both" },
    { value: "keep", label: "Keep graph value" },
    { value: "overwrite", label: "Take incoming" },
    { value: "list", label: "Keep all as list" },
    { value: "mean", label: "Average" },
    { value: "sum", label: "Sum" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
];

/** The other counts the review lists, each shown only when not zero. */
const OTHER: readonly { readonly count: keyof JoinReport; readonly label: string }[] = [
    { count: "repeatedKeys", label: "Repeated keys" },
    { count: "fanOut", label: "One key to many nodes" },
    { count: "unmapped", label: "Unmapped keys" },
    { count: "valuesOverCap", label: "Hub values" },
];

/**
 * A column's rule as the step's choices hold it.
 * @param choices - the step's join.
 * @param column - the column.
 * @returns the rule.
 */
function ruleOf(choices: JoinChoices, column: string): Rule {
    return choices.fuse?.[column] ?? choices.clash?.[column] ?? "both";
}

/**
 * The step's choices with a column's rule set.
 * @param choices - the step's join.
 * @param column - the column.
 * @param rule - the rule.
 * @returns the choices.
 */
function withRule(choices: JoinChoices, column: string, rule: Rule): JoinChoices {
    const { [column]: _clash, ...clash } = choices.clash ?? {};
    const { [column]: _fuse, ...fuse } = choices.fuse ?? {};
    if (rule === "both" || rule === "keep" || rule === "overwrite") {
        return { ...choices, clash: { ...clash, [column]: rule }, fuse };
    }
    return { ...choices, clash, fuse: { ...fuse, [column]: rule } };
}

/**
 * A value as the review shows it.
 * @param value - the value.
 * @returns its text.
 */
function shown(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map(shown).join(";");
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return value === null || value === undefined ? "-" : JSON.stringify(value);
}

/**
 * The Conflicts button and its review: per clashing column, how many elements clash, one example
 * and the column's fusion rule; then the repeated keys, fan-out, unmapped keys and hub values.
 * Shown only when there is something to review.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.report - its counts.
 * @param props.open - whether the review is open.
 * @param props.onOpen - opens or closes it.
 * @param props.shortcut - its key, as shown.
 * @returns the button, or null.
 */
export function ConflictsButton({
    step,
    report,
    open,
    onOpen,
    shortcut,
}: Readonly<{
    step: JoinStepEntry;
    report: JoinReport;
    open: boolean;
    onOpen: (open: boolean) => void;
    shortcut: string;
}>): React.JSX.Element | null {
    const api = useJoinWorkspace();
    const others = OTHER.filter((each) => (report[each.count] as number) > 0);
    const count = report.clashes.length + others.length;
    if (count === 0) {
        return null;
    }
    return (
        <PopoutManager>
            <Popout opened={open} onOpenChange={onOpen}>
                <Popout.Trigger>
                    <Button
                        size="compact-xs"
                        variant="default"
                        aria-keyshortcuts={ariaKey(shortcut)}
                        aria-expanded={open}
                        leftSection={<GLYPHS.warning size={14} aria-hidden />}
                        rightSection={
                            <Text span size="sm" c="dimmed" className="sel-key">
                                {shortcut}
                            </Text>
                        }
                    >
                        Conflicts&nbsp;<b>{count}</b>
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={460}
                    placement="top"
                    alignment="end"
                    header={{ variant: "title", title: "Conflicts" }}
                    closeLabel="Close Conflicts"
                >
                    <Popout.Content>
                        {report.clashes.length === 0 ? null : (
                            <>
                                <Text size="sm" fw={600} c="dimmed" className="jwc-conf-head">
                                    Clashes
                                </Text>
                                {report.clashes.map(({ column }) => {
                                    const page = api.draft.clashes(step.id, column, { limit: 1 });
                                    const sample = page.items[0];
                                    return (
                                        <div key={column} className="jwc-conf-row">
                                            <Text span size="sm" fw={600} truncate>
                                                {column}
                                            </Text>
                                            <Text span size="sm" c="dimmed" className="jwc-conf-num">
                                                {formatNumber(page.total)}
                                            </Text>
                                            <Text span size="sm" c="dimmed" truncate>
                                                {sample === undefined
                                                    ? ""
                                                    : `${shown(sample.graph)} / ${shown(sample.incoming)}`}
                                            </Text>
                                            <Select
                                                size="xs"
                                                aria-label={`${column} rule`}
                                                data={RULES.map((rule) => ({ value: rule.value, label: rule.label }))}
                                                value={ruleOf(step.choices, column)}
                                                allowDeselect={false}
                                                comboboxProps={{ withinPortal: false }}
                                                onChange={(value) => {
                                                    if (value !== null) {
                                                        api.edit((draft) => {
                                                            draft.change(step.id, {
                                                                from: step.from,
                                                                choices: withRule(step.choices, column, value as Rule),
                                                            });
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        {others.map((each) => (
                            <div key={each.count} className="jwc-conf-row jwc-conf-other">
                                <Text span size="sm" fw={600}>
                                    {each.label}
                                </Text>
                                <Text span size="sm" c="dimmed" className="jwc-conf-num">
                                    {formatNumber(report[each.count] as number)}
                                </Text>
                            </div>
                        ))}
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </PopoutManager>
    );
}
