/**
 * The ego network's controls on the filter status strip: how many hops out from the seed
 * nodes the canvas shows, and the way back to the whole graph.
 *
 * The filter itself is graphty-element's `neighborhood` visibility filter; this draws the
 * depth it holds and hands a new one back. It walks no edges of its own.
 */

import { SegmentedControl } from "@graphty/compact-mantine";
import { Button, Group, Text } from "@mantine/core";
import React from "react";

/** The hop depths the control offers. */
const EGO_NETWORK_DEPTHS = [1, 2, 3] as const;

/**
 * Props of the ego network control.
 */
interface EgoNetworkControlProps {
    /** The filter's current depth, in hops. */
    readonly depth: number;
    /** Asks for the filter at another depth. */
    readonly onDepthChange: (depth: number) => void;
    /** Removes the filter. */
    readonly onClear: () => void;
}

/**
 * Draws the ego network's depth choice and its Clear button.
 * @param props - the depth and the two handlers.
 * @returns the control.
 */
export function EgoNetworkControl(props: EgoNetworkControlProps): React.JSX.Element {
    const { depth, onDepthChange, onClear } = props;

    return (
        <Group gap="xs" wrap="nowrap" data-testid="ego-network-control">
            <Text span size="sm">
                Ego network
            </Text>
            <SegmentedControl
                size="xs"
                aria-label="Hops"
                value={String(depth)}
                data={EGO_NETWORK_DEPTHS.map((hops) => ({ value: String(hops), label: `${String(hops)} hop` }))}
                onChange={(value) => {
                    onDepthChange(Number(value));
                }}
            />
            <Button variant="subtle" color="gray" size="compact-xs" onClick={onClear}>
                Clear
            </Button>
        </Group>
    );
}
