/**
 * The Data place's Runs (the `selection-workspace` experiment, issue #5805): every run the session
 * holds, wherever it was started -- Analyze or a selection's card -- as graphty-element lists it.
 * Each row says, with chips and no sentence, which selections read the run (`runs.readers`) and how
 * many style layers draw it (`runs.bindings`), offers Show for a run that draws nothing yet, and
 * removes it; a run that layers draw or selections read asks first, naming them, and the
 * selections then wait for Run (design: algo-options cardruns.md, rules 3 to 5).
 */

import { ControlSection, Popout, PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, Run, RunReader } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { selectionWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { runName } from "../runWords";
import { useWorkspace } from "../state/WorkspaceContext";

/**
 * What a selection that reads a run goes by: its layer's name, or "Filter".
 * @param session - the element's session.
 * @param reader - the selection.
 * @returns the name.
 */
function readerName(session: GraphSession, reader: RunReader): string {
    return reader.kind === "layer" ? (session.styles.get(reader.id)?.name ?? reader.id) : "Filter";
}

/**
 * A chip naming a selection that reads the run.
 * @param props - Component props
 * @param props.name - the selection's name
 * @returns the chip
 */
function SelectionChip({ name }: Readonly<{ name: string }>): React.JSX.Element {
    return (
        <Badge size="sm" variant="light" color="gray" leftSection={<GLYPHS.selection size={10} aria-hidden />}>
            {name}
        </Badge>
    );
}

/**
 * One run's row.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.run - the run
 * @returns the row
 */
function RunRow({ session, run }: Readonly<{ session: GraphSession; run: Run }>): React.JSX.Element {
    const [asking, setAsking] = useState(false);
    const name = runName(session, run);
    const readers = session.runs.readers(run.id);
    const layers = session.runs.bindings(run.id);
    const remove = (): void => {
        setAsking(false);
        session.runs.remove(run.id);
    };
    return (
        <li className="dp-run" data-run={run.id}>
            <Group gap={6} wrap="nowrap" className="dp-run-head">
                <GLYPHS.analyze size={14} aria-hidden />
                <Text size="sm" truncate className="dp-run-name">
                    {name}
                </Text>
                <PopoutManager>
                    <Popout
                        opened={asking}
                        onOpenChange={(next) => {
                            // A run nothing draws or reads goes at once; anything else asks first.
                            if (next && readers.length === 0 && layers.length === 0) {
                                remove();
                                return;
                            }
                            setAsking(next);
                        }}
                    >
                        <Popout.Trigger>
                            <Tooltip label="Remove run">
                                <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${name}`} data-remove-run="">
                                    <GLYPHS.close size={12} aria-hidden />
                                </ActionIcon>
                            </Tooltip>
                        </Popout.Trigger>
                        <Popout.Panel
                            width={240}
                            placement="right"
                            alignment="start"
                            header={{ variant: "title", title: `Remove ${name}` }}
                            closeLabel={`Close Remove ${name}`}
                        >
                            <Popout.Content>
                                <Stack gap={6} data-confirm-remove="">
                                    {layers.map((id) => (
                                        <Group key={id} gap={6} wrap="nowrap" data-goes="">
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color="gray"
                                                leftSection={<GLYPHS.layer size={10} aria-hidden />}
                                            >
                                                {session.styles.get(id)?.name ?? id}
                                            </Badge>
                                            <GLYPHS.delete size={12} aria-label="removed" />
                                        </Group>
                                    ))}
                                    {readers.map((reader) => (
                                        <Group key={`${reader.kind}:${reader.id}`} gap={6} wrap="nowrap" data-waits="">
                                            <SelectionChip name={readerName(session, reader)} />
                                            <GLYPHS.waiting size={12} aria-label="waits for Run" />
                                        </Group>
                                    ))}
                                    <Group justify="flex-end">
                                        <Button size="compact-sm" color="red" onClick={remove}>
                                            Remove
                                        </Button>
                                    </Group>
                                </Stack>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </PopoutManager>
            </Group>
            <Group gap={4} wrap="wrap" className="dp-run-facts">
                {readers.map((reader) => (
                    <SelectionChip key={`${reader.kind}:${reader.id}`} name={readerName(session, reader)} />
                ))}
                {layers.length > 0 ? (
                    <Tooltip label="Style layers">
                        <Badge
                            size="sm"
                            variant="light"
                            color="gray"
                            leftSection={<GLYPHS.layer size={10} aria-hidden />}
                            aria-label={`${String(layers.length)} style layers`}
                        >
                            {layers.length}
                        </Badge>
                    </Tooltip>
                ) : (
                    run.status === "succeeded" && (
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            data-show-run=""
                            onClick={() => {
                                // The same run, painted as it is: its suggested layers, in one step.
                                session.runs.paint(run.id).then(undefined, () => undefined);
                            }}
                        >
                            Show
                        </Button>
                    )
                )}
            </Group>
        </li>
    );
}

/**
 * The Runs section, drawn only while the `selection-workspace` experiment is on.
 * @returns the section, or nothing.
 */
export function RunsSection(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    if (session === null || !selectionWorkspaceOn(session)) {
        return null;
    }
    const runs = session.runs.list().filter((run) => run.status !== "removed");
    return (
        <ControlSection label="Runs" empty={runs.length === 0}>
            {runs.length === 0 ? null : (
                <Stack component="ul" role="list" aria-label="Runs" gap={6} className="dp-runs">
                    {runs.map((run) => (
                        <RunRow key={run.id} session={session} run={run} />
                    ))}
                </Stack>
            )}
        </ControlSection>
    );
}
