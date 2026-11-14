import type { JoinKey, JoinKeyMatch, JoinStepEntry } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Select, Text } from "@mantine/core";
import React, { useMemo } from "react";

import { GLYPHS } from "../../glyphs";
import { useJoinWorkspace } from "../context";
import { changeStep } from "./choices";
import { cardTitle, inputName, isNewKey, pathName } from "./outcomes";

/** The match target that makes nodes from a column's values instead of matching them. */
const NEW = "\u0000new";

/** Between a match target's source and its graph value, in a picker's option value. */
const SEP = "\u0001";

/**
 * A few values, as one line of text.
 * @param values - the values.
 * @returns the text.
 */
function sampleText(values: readonly unknown[]): string {
    return values.map((value) => (Array.isArray(value) ? value.join(";") : String(value))).join(", ");
}

/**
 * One option of a match row's picker, on one line: its name, the rows it would match, then a few
 * of its values.
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
        <span className="jc-option">
            <Text span size="sm" className="jc-option-name">
                {name}
            </Text>
            {count === undefined ? null : (
                <Badge size="xs" variant="light" color={count > 0 ? "green" : "gray"}>
                    {count}
                </Badge>
            )}
            {samples === "" ? null : (
                <Text span size="xs" c="dimmed" truncate className="jc-option-samples">
                    {samples}
                </Text>
            )}
        </span>
    );
}

/** What a match row can match: one load's or one step's nodes, or every node. */
interface Target {
    /** The load or step, as `JoinKey.onto`; undefined for every node. */
    readonly onto?: string;
    /** The group's name in the picker. */
    readonly name: string;
}

/**
 * One match row of a card: `[incoming column] = [source . graph value]  N of M`. The left picker
 * lists the table's columns with a few of their values (`draft.samples`); the right one each
 * load's values, and each earlier card's new nodes, grouped by where they came from (the key's
 * `onto`), each with the rows it would match (`draft.keyMatches`, against the graph the cards
 * above leave). The count beside it is how the reader knows the columns are right.
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
    // Where a key can match: each load the graph holds, each card above that added nodes, or any.
    const { groups } = useMemo(() => {
        const position = draft.steps.findIndex((each) => each.id === step.id);
        const targets: Target[] = [
            ...draft.inputs
                .filter((each) => !each.held && each.key !== step.from)
                .map((each) => ({ onto: each.key, name: inputName(draft.inputs, each.key) })),
            ...draft.steps
                .slice(0, Math.max(0, position))
                .flatMap((each, index) =>
                    (draft.outcome(each.id).report?.newNodes ?? 0) > 0
                        ? [{ onto: each.id, name: `${String(index + 1)} ${cardTitle(each, draft.inputs)}` }]
                        : [],
                ),
            { name: "any" },
        ];
        return {
            version,
            groups:
                key === undefined
                    ? []
                    : targets.map((target) => ({
                          target,
                          matches: draft.keyMatches(step.from, key.file, {
                              before: step.id,
                              ignoreCase: choices.ignoreCase === true,
                              ignoreSpaces: choices.ignoreSpaces === true,
                              ...(target.onto === undefined ? {} : { onto: target.onto }),
                          }),
                      })),
        };
    }, [draft, version, step, key, choices]);
    const valueOf = (onto: string | undefined, graph: string): string => `${onto ?? ""}${SEP}${graph}`;
    const byValue = new Map<string, JoinKeyMatch>(
        groups.flatMap(({ target, matches }) => matches.map((match) => [valueOf(target.onto, match.graph), match])),
    );
    const hit = fresh || key === undefined ? undefined : byValue.get(valueOf(key.onto, key.graph));
    const rows = hit?.rows ?? 0;
    const created = draft.outcome(step.id).report?.byKey?.[at]?.created;
    let picked: string | null = null;
    if (fresh) {
        picked = NEW;
    } else if (key !== undefined) {
        picked = valueOf(key.onto, key.graph);
    }
    const setKey = (next: JoinKey): void => {
        const keys = [...choices.keys];
        keys[at] = next;
        changeStep(api, step, { keys });
    };
    // A key's own "no match" rule and source stay with it when its column changes.
    const kept = {
        ...(key?.unknown === undefined || fresh ? {} : { unknown: key.unknown }),
        ...(key?.onto === undefined || fresh ? {} : { onto: key.onto }),
    };
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
                    ...groups.map(({ target, matches }) => ({
                        group: target.name,
                        items: matches.map((match) => ({
                            value: valueOf(target.onto, match.graph),
                            label:
                                target.onto === undefined
                                    ? pathName(match.graph)
                                    : `${target.name}.${pathName(match.graph)}`,
                        })),
                    })),
                    ...(canMakeNodes ? [{ group: "new", items: [{ value: NEW, label: "new from values" }] }] : []),
                ]}
                value={picked}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                renderOption={({ option }) => {
                    const match = byValue.get(option.value);
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
                    if (value === NEW) {
                        setKey({ file: key.file, graph: "id", unknown: "add", kind: key.file });
                        return;
                    }
                    const [onto, graph] = value.split(SEP);
                    setKey({
                        file: key.file,
                        graph,
                        ...(key.unknown === undefined || fresh ? {} : { unknown: key.unknown }),
                        ...(onto === "" ? {} : { onto }),
                    });
                }}
            />
            <div className="jc-match-tail">
                {key === undefined || fresh ? (
                    <Badge size="sm" variant="light" color="gray" data-count="">
                        {key === undefined ? "-" : `${String(created ?? 0)} new`}
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
