import type { GraphSession, SourceStepRow } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Kbd, Stack, Text, Tooltip } from "@mantine/core";
import React from "react";

import { sourceName } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import { DELETE_KEY } from "./keys";
import { openEditStep, openRemove } from "./steps";
import { missingWords, OP_WORDS, STEP_WORDS, stepCountWords, stepWords } from "./words";

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
            <Group gap={6} wrap="nowrap">
                <Text size="xs" c="dimmed" w={16}>
                    {row.index + 1}
                </Text>
                <Text size="xs" fw={600}>
                    {OP_WORDS[row.op]}
                </Text>
                <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
                    {name}
                </Text>
                {off ? (
                    <Text size="xs" c="dimmed" aria-label={`${label} ${STEP_WORDS.off.toLowerCase()}`}>
                        {[STEP_WORDS.off, ...row.missing.map((issue) => missingWords(issue))].join(", ")}
                    </Text>
                ) : (
                    <Text size="xs" aria-label={`${label} counts`}>
                        {stepCountWords(row)}
                    </Text>
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
