import { Popout } from "@graphty/compact-mantine";
import type { JoinKey, JoinStepEntry } from "@graphty/graphty-element/session";
import { Badge, Button, Text, UnstyledButton } from "@mantine/core";
import React, { useMemo, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useJoinWorkspace } from "../context";
import { changeStep, withKey } from "./choices";
import { inputName, pathName } from "./ops";

/** Which key pair of a step the matcher sets: a values key (0), or an edge's source or target. */
export type MatchEnd = 0 | 1;

/**
 * A few values, as one line of text.
 * @param values - the values.
 * @returns the text.
 */
function sampleText(values: readonly unknown[]): string {
    return values.map((value) => (Array.isArray(value) ? value.join(";") : String(value))).join(", ");
}

/**
 * A card's match row: the key pair as "column = graph value", and on a press the column matcher --
 * the input's columns with a few of their values on the left, the graph's values on the right,
 * each with the rows it would match for the column picked (graphty-element's
 * `draft.keyMatches`). A press on the left picks a column, one on the right sets the pair.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.end - the key pair it sets.
 * @param props.label - the row's accessible name.
 * @param props.zero - the step matches nothing: drawn as a warning.
 * @returns the row's button and its matcher.
 */
export function MatchButton({
    step,
    end,
    label,
    zero,
}: Readonly<{ step: JoinStepEntry; end: MatchEnd; label: string; zero: boolean }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const [open, setOpen] = useState(false);
    const key: JoinKey | undefined = step.choices.keys[end];
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                <Button
                    size="compact-xs"
                    variant="default"
                    className="jr-match"
                    data-zero={zero ? "" : undefined}
                    aria-label={label}
                    rightSection={<GLYPHS.expand size={12} aria-hidden />}
                    onClick={() => {
                        api.select(step.id);
                    }}
                >
                    {key === undefined ? "-" : `${key.file} = ${pathName(key.graph)}`}
                </Button>
            </Popout.Trigger>
            <Popout.Panel
                width={520}
                placement="right"
                header={{ variant: "title", title: `${inputName(api.draft.inputs, step.from)} ${label}` }}
                closeLabel={`Close ${label}`}
            >
                <Popout.Content>{open ? <MatcherPanel step={step} end={end} /> : null}</Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * The matcher's two columns.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.end - the key pair it sets.
 * @returns the panel.
 */
function MatcherPanel({ step, end }: Readonly<{ step: JoinStepEntry; end: MatchEnd }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const { choices } = step;
    const key = choices.keys[end];
    const [left, setLeft] = useState<string | undefined>(key?.file);
    const input = draft.inputs.find((each) => each.key === step.from);
    const columns = input?.columns ?? [];
    const { matches } = useMemo(
        () => ({
            version,
            matches:
                left === undefined
                    ? []
                    : draft.keyMatches(step.from, left, {
                          before: step.id,
                          target: choices.shape === "edge-values" ? "edge" : "node",
                          ignoreCase: choices.ignoreCase === true,
                          ignoreSpaces: choices.ignoreSpaces === true,
                      }),
        }),
        [draft, version, step, left, choices],
    );
    const most = Math.max(0, ...matches.map((each) => each.rows));
    return (
        <div className="jr-mx">
            <div className="jr-mx-sides">
                <div className="jr-mx-side" role="group" aria-label="Table columns">
                    {columns.map((column) => (
                        <UnstyledButton
                            key={column}
                            className="jr-mc"
                            aria-pressed={left === column}
                            data-on={key?.file === column ? "" : undefined}
                            onClick={() => {
                                setLeft(column);
                            }}
                        >
                            <Text span size="sm" fw={600} className="jr-mc-name">
                                {column}
                            </Text>
                            <Text span size="xs" c="dimmed" truncate className="jr-mc-samples">
                                {sampleText(draft.samples(step.from, column))}
                            </Text>
                        </UnstyledButton>
                    ))}
                </div>
                <div className="jr-mx-side" role="group" aria-label="Graph values">
                    {matches.map((match) => (
                        <UnstyledButton
                            key={match.graph}
                            className="jr-mc"
                            aria-label={`${pathName(match.graph)}, ${String(match.rows)} rows`}
                            data-on={key?.file === left && key?.graph === match.graph ? "" : undefined}
                            data-best={match.rows > 0 && match.rows === most ? "" : undefined}
                            onClick={() => {
                                if (left !== undefined) {
                                    changeStep(api, step, {
                                        keys: withKey(choices.keys, end, { file: left, graph: match.graph }),
                                    });
                                }
                            }}
                        >
                            <Text span size="sm" fw={600} className="jr-mc-name">
                                {pathName(match.graph)}
                            </Text>
                            <Text span size="xs" c="dimmed" truncate className="jr-mc-samples">
                                {sampleText(match.samples)}
                            </Text>
                            <Badge size="sm" variant="light" color={match.rows > 0 ? "green" : "gray"}>
                                {match.rows}
                                {match.loose > 0 ? ` +${String(match.loose)}` : ""}
                            </Badge>
                        </UnstyledButton>
                    ))}
                </div>
            </div>
        </div>
    );
}
