import { StyleNumberInput } from "@graphty/compact-mantine";
import { Select, Stack } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { methodChoices } from "./methods";

/**
 * The graph's Layout group (tier1-design.md 2.7 and 5.T11): Method, from the element's layout
 * catalog with its size rating and the element's recommendation, and Seed for a layout that takes
 * one. Changing either lays the graph out again at once, as one undoable step of the element's.
 * Shown by the Layout popover and the graph's inspector.
 * @returns The group, or nothing before the element has come up
 */
export function LayoutGroup(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    if (session === null) {
        return null;
    }
    const { id, engine, options } = session.layout;
    const seedOption = session.catalog
        .layouts()
        .find((d) => d.id === id)
        ?.options.find((o) => o.name === "seed");
    // The element refuses a layout it cannot build and changes nothing; the reader is told so.
    const fail = (): void => {
        store.set({ notice: { message: "The layout could not be changed" } });
    };

    return (
        <Stack gap={8} aria-label="Layout" role="group">
            <Select
                label="Method"
                value={id}
                data={methodChoices(session)}
                allowDeselect={false}
                // The list stays inside the Layout popover, so picking from it is not a click
                // outside that closes the popover first (Mantine's rule for a Select in a Popover).
                comboboxProps={{ withinPortal: false }}
                onChange={(value) => {
                    if (value !== null && value !== id) {
                        session.layout.set(value).catch(fail);
                    }
                }}
            />
            {seedOption === undefined ? null : (
                <StyleNumberInput
                    label="Seed"
                    value={typeof options.seed === "number" ? options.seed : undefined}
                    defaultValue={typeof seedOption.default === "number" ? seedOption.default : 0}
                    step={1}
                    decimalScale={0}
                    onChange={(seed) => {
                        session.layout.set(id, { engine, options: { ...options, seed } }).catch(fail);
                    }}
                />
            )}
        </Stack>
    );
}
