import { StyleNumberInput } from "@graphty/compact-mantine";
import { Select, Stack } from "@mantine/core";
import { type JSX, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { LAYOUT_SEED, methodChoices, methodName, takesSeed } from "./methods";

/**
 * The graph's Layout group (tier1-design.md 2.7 and 5.T11): Method, from the element's layout
 * catalog with its size rating and the element's recommendation, and Seed for a layout that takes
 * one. Changing either lays the graph out again at once, as one undoable step of the element's.
 * Shown by the Layout popover and the graph's inspector.
 * @returns The group, or nothing before the element has come up
 */
export function LayoutGroup(): JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    // The method the element last refused, and the layout that was drawing when it did: the line
    // under Method stays until the layout changes.
    const [refused, setRefused] = useState<{ method: string; drawing: string } | null>(null);
    if (session === null) {
        return null;
    }
    const { id, engine, options } = session.layout;
    const seedOption = session.catalog
        .layouts()
        .find((d) => d.id === id)
        ?.options.find((o) => o.name === "seed");
    // The element refuses a layout it cannot build and changes nothing; the reader is told so,
    // under Method, naming the method they picked.
    const refuse =
        (method: string) =>
        (): void => {
            setRefused({ method, drawing: id });
        };
    const error =
        refused !== null && refused.drawing === id
            ? `${methodName(session, refused.method)} could not lay out this graph, so the drawing is unchanged`
            : undefined;

    return (
        <Stack gap={8} aria-label="Layout" role="group">
            <Select
                label="Method"
                value={id}
                data={methodChoices(session)}
                allowDeselect={false}
                error={error}
                // The list stays inside the Layout popover, so picking from it is not a click
                // outside that closes the popover first (Mantine's rule for a Select in a Popover).
                comboboxProps={{ withinPortal: false }}
                onChange={(value) => {
                    if (value !== null && value !== id) {
                        // The app's seed goes with every layout that takes one, so a method drawn
                        // twice draws the same way.
                        const seeded = takesSeed(session, value) ? { options: { seed: LAYOUT_SEED } } : undefined;
                        session.layout.set(value, seeded).catch(refuse(value));
                    }
                }}
            />
            {seedOption === undefined ? null : (
                <StyleNumberInput
                    label="Seed"
                    value={typeof options.seed === "number" ? options.seed : undefined}
                    // Only a project saved before the app seeded its layouts has none: the field offers
                    // the app's seed, which every layout's schema accepts.
                    defaultValue={typeof seedOption.default === "number" ? seedOption.default : LAYOUT_SEED}
                    step={1}
                    decimalScale={0}
                    onChange={(seed) => {
                        session.layout.set(id, { engine, options: { ...options, seed } }).catch(refuse(id));
                    }}
                />
            )}
        </Stack>
    );
}
