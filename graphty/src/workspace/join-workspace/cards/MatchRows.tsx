import type { JoinKey, JoinStepEntry } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Select, Text } from "@mantine/core";
import React, { useMemo } from "react";

import { GLYPHS } from "../../glyphs";
import { useJoinWorkspace } from "../context";
import { changeStep } from "./choices";
import { isNewKey, pathName } from "./outcomes";

/** The match target that makes nodes from a column's values instead of matching them. */
const NEW = "\u0000new";

/**
 * A few values, as one line of text.
 * @param values - the values.
 * @returns the text.
 */
function sampleText(values: readonly unknown[]): string {
    return values.map((value) => (Array.isArray(value) ? value.join(";") : String(value))).join(", ");
}

/**
 * One option of a match row's picker: its name over a few of its values.
 * @param props - Component props
 * @param props.name - the option's name.
 * @param props.samples - a few of its values.
 * @param props.count - the rows it would match, when known.
 * @returns the option.
 */
function Option({
    name,
    samples,
    count,
}: Readonly<{ name: string; samples: string; count?: number }>): React.JSX.Element {
    return (
        <div className="jc-option">
            <Text span size="sm">
                {name}
                {count === undefined ? null : (
                    <Badge size="xs" variant="light" color={count > 0 ? "green" : "gray"} ml={4}>
                        {count}
                    </Badge>
                )}
            </Text>
            {samples === "" ? null : (
                <Text span size="xs" c="dimmed" truncate className="jc-option-samples">
                    {samples}
                </Text>
            )}
        </div>
    );
}

/**
 * One match row of a card: `[incoming column] = [graph value]  N of M`. The left picker lists the
 * table's columns with a few of their values (`draft.samples`); the right one the graph's values,
 * each with the rows it would match (`draft.keyMatches`, against the graph the cards above leave).
 * The count beside it is how the reader knows the columns are right.
 * @param props - Component props
 * @param props.step - the card's step.
 * @param props.at - which key of the step the row sets.
 * @param props.label - the row's label: "Match", "From end", "Named".
 * @param props.suggested - the row still holds graphty-element's suggestion: tagged so.
 * @param props.canMakeNodes - the right picker also offers "new from values".
 * @param props.onRemove - drops the row, when it may be dropped.
 * @param props.children - more controls at the row's end.
 * @returns the row.
 */
export function MatchRow({
    step,
    at,
    label,
    suggested,
    canMakeNodes = false,
    onRemove,
    children,
}: Readonly<{
    step: JoinStepEntry;
    at: number;
    label: string;
    suggested: boolean;
    canMakeNodes?: boolean;
    onRemove?: () => void;
    children?: React.ReactNode;
}>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const { choices } = step;
    const key: JoinKey | undefined = choices.keys[at];
    const input = draft.inputs.find((each) => each.key === step.from);
    const columns = input?.columns ?? [];
    const fresh = isNewKey(key);
    const { matches } = useMemo(
        () => ({
            version,
            matches:
                key === undefined
                    ? []
                    : draft.keyMatches(step.from, key.file, {
                          before: step.id,
                          ignoreCase: choices.ignoreCase === true,
                          ignoreSpaces: choices.ignoreSpaces === true,
                      }),
        }),
        [draft, version, step, key, choices],
    );
    const hit = fresh ? undefined : matches.find((each) => each.graph === key?.graph);
    const rows = hit?.rows ?? 0;
    const setKey = (next: JoinKey): void => {
        const keys = [...choices.keys];
        keys[at] = next;
        changeStep(api, step, { keys });
    };
    // A key's own "no match" rule stays with it when its match changes.
    const kept = key?.unknown === undefined || fresh ? {} : { unknown: key.unknown };
    return (
        <div className="jc-match" data-match={at}>
            <Text size="sm" c="dimmed">
                {label}
            </Text>
            <Select
                size="xs"
                aria-label={`${label} column`}
                placeholder="column"
                data={columns.map((column) => ({ value: column, label: column }))}
                value={key?.file ?? null}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                renderOption={({ option }) => (
                    <Option name={option.label} samples={sampleText(draft.samples(step.from, option.value))} />
                )}
                onChange={(value) => {
                    if (value !== null) {
                        setKey(
                            fresh
                                ? { file: value, graph: "id", unknown: "add", kind: value }
                                : { file: value, graph: key?.graph ?? "id", ...kept },
                        );
                    }
                }}
            />
            <Text span size="sm" className="jc-match-eq">
                =
            </Text>
            <Select
                size="xs"
                aria-label={`${label} match`}
                placeholder="match"
                disabled={key === undefined}
                data={[
                    ...matches.map((match) => ({ value: match.graph, label: pathName(match.graph) })),
                    ...(canMakeNodes ? [{ value: NEW, label: "new from values" }] : []),
                ]}
                value={fresh ? NEW : (key?.graph ?? null)}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                renderOption={({ option }) => {
                    const match = matches.find((each) => each.graph === option.value);
                    return (
                        <Option
                            name={option.label}
                            samples={match === undefined ? "" : sampleText(match.samples)}
                            count={match?.rows}
                        />
                    );
                }}
                onChange={(value) => {
                    if (value === null || key === undefined) {
                        return;
                    }
                    setKey(
                        value === NEW
                            ? { file: key.file, graph: "id", unknown: "add", kind: key.file }
                            : { file: key.file, graph: value, ...kept },
                    );
                }}
            />
            <div className="jc-match-tail">
                {key === undefined || fresh ? (
                    <Badge size="sm" variant="light" color="gray" data-count="">
                        {key === undefined ? "-" : "new"}
                    </Badge>
                ) : (
                    <Badge size="sm" variant="light" color={rows > 0 ? "green" : "red"} data-count="">
                        {rows} of {input?.rows ?? 0}
                    </Badge>
                )}
                {hit !== undefined && hit.loose > 0 ? <span className="jr-more">+{hit.loose}</span> : null}
                {suggested ? (
                    <Badge size="xs" variant="outline" color="gray">
                        suggested
                    </Badge>
                ) : null}
                {children}
                {onRemove === undefined ? null : (
                    <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${label}`} onClick={onRemove}>
                        <GLYPHS.close size={12} aria-hidden />
                    </ActionIcon>
                )}
            </div>
        </div>
    );
}
