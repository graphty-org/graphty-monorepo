import { FieldRow, PanelField, PanelLabelsProvider } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Select, Stack } from "@mantine/core";
import React, { useState } from "react";

import { OptionsForm } from "../options/OptionsForm";
import { enumWords } from "../style/words";
import { TRANSITION_WORDS as WORDS } from "./words";

/** The Select's value for no transition: positions jump in one frame. */
const NONE = "none";

/**
 * The layout form's Transition row (shader-styles design, section 6.5): how nodes travel to the
 * next layout, from the element's catalog of transitions, None first, and under it the chosen
 * transition's duration and parameters, in the form like every other layout setting. A pick writes the graph's `layoutTransition` at once (one undo
 * step); the next layout applied moves that way.
 * @param props - Component props
 * @param props.session - The element's session
 * @returns The row
 */
export function TransitionRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    // Read again after each write: the setting is the element's.
    const [now, setNow] = useState(() => session.config.layoutTransition);
    const transitions = session.catalog.transitions();
    const descriptor = transitions.find((each) => each.id === now?.transition);
    const write = (next: typeof now): void => {
        setNow(next);
        void session.config.set({ layoutTransition: next });
    };
    return (
        <Stack gap={8}>
            <Select
                size="xs"
                label={WORDS.transition}
                data={[
                    { value: NONE, label: WORDS.none },
                    ...transitions.map((each) => ({ value: each.id, label: each.plainName })),
                ]}
                value={now?.transition ?? NONE}
                allowDeselect={false}
                // The list stays inside the layout popover, so picking from it is not an outside click.
                comboboxProps={{ withinPortal: false }}
                onChange={(picked) => {
                    const id = picked ?? NONE;
                    write(
                        id === NONE
                            ? undefined
                            : { transition: id, ...(now?.seconds === undefined ? {} : { seconds: now.seconds }) },
                    );
                }}
            />
            {now === undefined ? null : (
                <PanelLabelsProvider showLabels>
                    <FieldRow>
                        <PanelField
                            label={WORDS.seconds}
                            kind="number"
                            value={now.seconds ?? null}
                            placeholder={WORDS.defaultSeconds}
                            min={0}
                            max={30}
                            step={0.1}
                            decimalScale={1}
                            onChange={(next) => {
                                write({ ...now, seconds: Number(next) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
            )}
            {now === undefined || descriptor === undefined || descriptor.params.length === 0 ? null : (
                <OptionsForm
                    session={session}
                    options={descriptor.params}
                    values={now.params ?? {}}
                    words={(option) => ({ label: option.plainName, choice: enumWords })}
                    onChange={(name, value) => {
                        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                            write({ ...now, params: { ...now.params, [name]: value } });
                        }
                    }}
                />
            )}
        </Stack>
    );
}
