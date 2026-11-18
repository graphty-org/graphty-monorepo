import { FieldRow, ModalFooter, PanelField } from "@graphty/compact-mantine";
import type { GraphSession, ScoreTerm } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Modal, Stack } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { runName } from "../runWords";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/** The name a new score starts with, numbered past the columns it would collide with. */
const NAME = "Score";

/**
 * The results a score can combine: every run whose primary field holds a number per element of
 * the kind, named as the app names the run.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @returns the drop-down's options, by path.
 */
function metricOptions(session: GraphSession, kind: "node" | "edge"): { value: string; label: string }[] {
    return session.data
        .resultColumns(kind)
        .filter((column) => column.type === "number" || column.type === "integer")
        .map((column) => {
            const run = session.runs.get(column.run);
            return { value: column.path, label: run === undefined ? column.path : runName(session, run) };
        });
}

/**
 * A name no column of the kind has yet: Score, else Score 2, Score 3 and on.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @returns the name.
 */
function freeName(session: GraphSession, kind: "node" | "edge"): string {
    const taken = new Set(
        session.data
            .attributes()
            .filter((each) => each.kind === kind)
            .map((each) => each.name),
    );
    let at = 1;
    while (taken.has(at === 1 ? NAME : `${NAME} ${String(at)}`)) {
        at++;
    }
    return at === 1 ? NAME : `${NAME} ${String(at)}`;
}

/**
 * The Custom score dialog: a name and one row per metric (the result, its weight), combined by
 * graphty-element's `session.data.deriveScore` into a computed column a style or a filter reads
 * like any other. Open while the workspace dialog is "score", on the terms `scoreOn` holds (a
 * result's Combine into a score... puts its own metric first).
 * @returns The dialog
 */
export function ScoreDialog(): React.JSX.Element | null {
    const { store, session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "score");
    const scoreOn = useWorkspaceState((state) => state.scoreOn);
    const kind = scoreOn?.kind ?? "node";
    const [name, setName] = useState(NAME);
    const [terms, setTerms] = useState<readonly ScoreTerm[]>([]);

    useEffect(() => {
        if (opened && session !== null) {
            setName(freeName(session, kind));
            setTerms(scoreOn?.terms ?? []);
        }
    }, [opened, scoreOn, session, kind]);

    if (session === null) {
        return null;
    }

    const options = opened ? metricOptions(session, kind) : [];
    const close = (): void => {
        store.set({ dialog: null, scoreOn: null });
    };
    const setTerm = (at: number, term: ScoreTerm): void => {
        setTerms((all) => all.map((each, index) => (index === at ? term : each)));
    };
    const create = (): void => {
        session.data.deriveScore(name.trim(), terms, { kind }).then(close, () => {
            store.set({ notice: { message: `Could not create ${name.trim()}` } });
        });
    };
    const unused = options.find((option) => !terms.some((term) => term.path === option.value));

    return (
        <Modal opened={opened} onClose={close} title="Custom score" size="sm">
            <Stack gap={0} data-score-dialog="">
                <FieldRow>
                    <PanelField
                        label="Name"
                        value={name}
                        onChange={(next) => {
                            setName(String(next));
                        }}
                    />
                </FieldRow>
                {terms.map((term, at) => (
                    <FieldRow
                        key={`${term.path}:${String(at)}`}
                        groupLabel={`Metric ${String(at + 1)}`}
                        trailing={
                            terms.length > 1 ? (
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={`Remove metric ${String(at + 1)}`}
                                    onClick={() => {
                                        setTerms((all) => all.filter((_, index) => index !== at));
                                    }}
                                >
                                    <GLYPHS.remove size={14} aria-hidden />
                                </ActionIcon>
                            ) : undefined
                        }
                    >
                        <PanelField
                            label={`Metric ${String(at + 1)}`}
                            kind="select"
                            data={options}
                            value={term.path}
                            onChange={(path) => {
                                setTerm(at, { ...term, path: String(path) });
                            }}
                        />
                        <PanelField
                            label={`Weight ${String(at + 1)}`}
                            kind="number"
                            value={term.weight ?? 1}
                            onChange={(weight) => {
                                setTerm(at, { ...term, weight: typeof weight === "number" ? weight : 1 });
                            }}
                        />
                    </FieldRow>
                ))}
                <Button
                    variant="subtle"
                    size="xs"
                    justify="flex-start"
                    leftSection={<GLYPHS.add size={14} aria-hidden />}
                    disabled={unused === undefined}
                    onClick={() => {
                        if (unused !== undefined) {
                            setTerms((all) => [...all, { path: unused.value, weight: 1 }]);
                        }
                    }}
                >
                    Add metric
                </Button>
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default" onClick={close}>
                    Cancel
                </Button>
                <Button disabled={name.trim() === "" || terms.length === 0} onClick={create}>
                    Create
                </Button>
            </ModalFooter>
        </Modal>
    );
}
