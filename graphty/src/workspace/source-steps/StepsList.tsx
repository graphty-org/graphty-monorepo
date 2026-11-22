import type { GraphSession, SourceStepRow } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Kbd, Stack, Text, Tooltip } from "@mantine/core";
import React from "react";

import { sourceName } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import { spaceLabel } from "./join";
import { DELETE_KEY } from "./keys";
import { openEditStep, openRemove } from "./steps";
import { actWords, missingWords, OP_WORDS, STEP_WORDS, stepCountShortWords, stepCountWords, stepWords } from "./words";

/**
 * One Steps row: its number, source, kind and counts, Off with what it misses, Edit on a join step
 * and Delete (Del, also on the row).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the step
 * @param props.name - its source's name
 * @returns the row
 */
function StepRow({
    session,
    row,
    name,
}: Readonly<{ session: GraphSession; row: SourceStepRow; name: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const label = stepWords(row.index);
    const remove = (): void => {
        void openRemove(store, session, { step: row.index });
    };
    const off = row.off || row.held;
    return (
        <div // eslint-disable-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions -- a <li> would bring list styling the compact rows do not use; Del pressed on any of the row's buttons deletes it, as its Delete button shows
            role="listitem"
            aria-label={label}
            className="ss-step"
            data-step={row.index}
            onKeyDown={(event) => {
                if (event.key === DELETE_KEY) {
                    event.preventDefault();
                    remove();
                }
            }}
        >
            <Group gap={4} wrap="nowrap">
                <Text size="xs" c="dimmed" w={16}>
                    {row.index + 1}
                </Text>
                <Text size="xs" fw={600}>
                    {OP_WORDS[row.op]}
                </Text>
                {/* The source as a one-letter badge, its name on hover, so the row has room for what it joined. */}
                <Tooltip label={name}>
                    <Badge
                        size="xs"
                        variant="light"
                        radius="sm"
                        px={4}
                        style={{ flex: "none" }}
                        aria-label={`${label} source ${name}`}
                    >
                        {name.charAt(0).toUpperCase()}
                    </Badge>
                </Tooltip>
                {row.act === null ? (
                    <span style={{ flex: 1 }} />
                ) : (
                    // What the step joined tells two joins from one source apart: it wraps, never cut off.
                    <Text
                        size="xs"
                        style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
                        aria-label={`${label} joins`}
                    >
                        {actWords(row.act, spaceLabel(session, row.act.into.space))}
                    </Text>
                )}
                {off ? (
                    <Text size="xs" c="dimmed" aria-label={`${label} ${STEP_WORDS.off.toLowerCase()}`}>
                        {[STEP_WORDS.off, ...row.missing.map((issue) => missingWords(issue))].join(", ")}
                    </Text>
                ) : (
                    <Tooltip label={stepCountWords(row)}>
                        <Text size="xs" style={{ flex: "none" }} aria-label={`${label} counts`}>
                            {stepCountShortWords(row)}
                        </Text>
                    </Tooltip>
                )}
                {row.act === null ? null : (
                    <Tooltip label={STEP_WORDS.edit}>
                        <ActionIcon
                            variant="subtle"
                            size="xs"
                            aria-label={`${STEP_WORDS.edit} ${label}`}
                            onClick={() => {
                                void openEditStep(store, session, row.index);
                            }}
                        >
                            <GLYPHS.rename size={12} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
                <Button
                    size="compact-xs"
                    variant="subtle"
                    aria-label={`${STEP_WORDS.delete} ${label}`}
                    aria-keyshortcuts={ariaKey(DELETE_KEY)}
                    onClick={remove}
                >
                    <Kbd size="xs">{formatKey(DELETE_KEY)}</Kbd>
                </Button>
            </Group>
        </div>
    );
}

/**
 * The Steps list (design 7.13, the source-steps experiment): every committed step in build order,
 * from `data.steps()`. While a source card is open it folds to its count.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.folded - a card is open
 * @returns the list, or nothing before the first step
 */
export function StepsList({
    session,
    folded,
}: Readonly<{ session: GraphSession; folded: boolean }>): React.JSX.Element | null {
    const rows = session.data.steps();
    if (rows.length === 0) {
        return null;
    }
    const sources = session.data.sources({ staged: true });
    const nameOf = (key: string): string => {
        const source = sources.find((each) => each.key === key);
        return source === undefined ? key : sourceName(source);
    };
    return (
        <Stack gap={2} className="ss-steps">
            <Group gap={6}>
                <Text size="xs" fw={600}>
                    {STEP_WORDS.steps}
                </Text>
                <Text size="xs" c="dimmed">
                    {rows.length}
                </Text>
            </Group>
            {folded ? null : (
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a <ul>/<li> would bring list styling the compact rows do not use; the role gives the same semantics
                    role="list"
                    aria-label={STEP_WORDS.steps}
                >
                    {rows.map((row) => (
                        <StepRow key={row.index} session={session} row={row} name={nameOf(row.source)} />
                    ))}
                </div>
            )}
        </Stack>
    );
}
