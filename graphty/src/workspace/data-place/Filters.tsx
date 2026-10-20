/**
 * The Data place's Filters section (spec section 3.4): the condition cards, one per filter step,
 * ANDed. Each card shows its own "X of Y" and a Select / Hide switch. The steps are
 * graphty-element's (`visibility.steps` / `setSteps`); the app holds only a card that is not
 * finished yet.
 */

import { ControlSection, SegmentedControl } from "@graphty/compact-mantine";
import type { FilterStep, GraphSession } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React, { useState } from "react";

import { useSessionVersion } from "../inspector/hooks";
import { useWorkspace } from "../state/WorkspaceContext";
import { type Card, type CardField, cardFields, cardOf, leafOf, newCard } from "../style/cards";
import { AddCardMenu, ConditionCard } from "../style/WhichPicker";
import { type Mode, modeOf, newId, selectRule, writeSteps } from "./filterSteps";

/** A card on the list: a written step's, or one still unfinished. */
interface Row {
    readonly card: Card;
    readonly step?: FilterStep;
}

/**
 * The Filters section.
 * @returns the section, or nothing before the element has come up.
 */
export function FiltersSection(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    if (session === null) {
        return null;
    }
    return <Filters session={session} />;
}

/**
 * The cards over the session's steps.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns the section
 */
function Filters({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [drafts, setDrafts] = useState<readonly Card[]>([]);
    const fields: CardField[] = [...cardFields(session, "node"), ...cardFields(session, "edge")];
    const { steps } = session.visibility;
    const rows: Row[] = [
        ...steps.map((step, at) => ({ step, card: { ...cardOf(step.rule, fields, at), key: step.id } })),
        ...drafts.map((card) => ({ card })),
    ];
    const write = (next: readonly FilterStep[]): void => {
        void writeSteps(session, store, next);
    };
    const select = (step: FilterStep): void => {
        selectRule(session, step.rule).catch(() => {
            store.set({ notice: { message: "Selection not changed" } });
        });
    };

    const change = (row: Row, card: Card): void => {
        const leaf = leafOf(card);
        if (row.step === undefined) {
            // A new card becomes a step once it makes a rule; it starts in Hide.
            setDrafts((now) => now.map((d) => (d.key === card.key ? card : d)));
            if (leaf !== null) {
                setDrafts((now) => now.filter((d) => d.key !== card.key));
                write([...steps, { id: newId(steps), on: true, rule: leaf }]);
            }
            return;
        }
        const { step } = row;
        if (leaf === null) {
            return;
        }
        const next = { ...step, rule: leaf };
        write(steps.map((s) => (s.id === step.id ? next : s)));
        if (modeOf(step) === "select") {
            select(next);
        }
    };
    const setMode = (step: FilterStep, mode: Mode): void => {
        write(steps.map((s) => (s.id === step.id ? { ...s, on: mode === "hide" } : s)));
        if (mode === "select") {
            select(step);
        }
    };
    const remove = (row: Row): void => {
        if (row.step === undefined) {
            setDrafts((now) => now.filter((d) => d.key !== row.card.key));
            return;
        }
        const { id } = row.step;
        write(steps.filter((s) => s.id !== id));
    };

    const plus = (
        <AddCardMenu
            fields={fields}
            taken={new Set(drafts.map((d) => d.key))}
            label="Add filter"
            onAdd={(field) => {
                setDrafts((now) => [...now, newCard(field)]);
            }}
        />
    );
    return (
        <ControlSection label="Filters" actions={plus} empty={rows.length === 0}>
            {rows.length === 0 ? null : (
                <Stack gap={8} data-testid="filters">
                    {rows.map((row) => (
                        <ConditionCard
                            key={row.card.key}
                            session={session}
                            card={row.card}
                            onChange={(card) => {
                                change(row, card);
                            }}
                            onRemove={() => {
                                remove(row);
                            }}
                            extra={
                                row.step === undefined ? null : (
                                    <SegmentedControl
                                        size="xs"
                                        aria-label="Mode"
                                        value={modeOf(row.step)}
                                        data={[
                                            { value: "select", label: "Select" },
                                            { value: "hide", label: "Hide" },
                                        ]}
                                        onChange={(value) => {
                                            if (row.step !== undefined) {
                                                setMode(row.step, value === "select" ? "select" : "hide");
                                            }
                                        }}
                                    />
                                )
                            }
                        />
                    ))}
                </Stack>
            )}
        </ControlSection>
    );
}
