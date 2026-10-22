import { Menu, Text } from "@mantine/core";
import React from "react";

import type { AttributeAction } from "./attributeActions";

/**
 * A menu item's label, with a disabled item's reason on its second line (section 4, "Disabled").
 * @param props - Component props
 * @param props.label - The item's label
 * @param props.reason - Why it is disabled, or null
 * @returns The label
 */
export function ItemLabel({ label, reason }: Readonly<{ label: string; reason: string | null }>): React.JSX.Element {
    return (
        <>
            {label}
            {reason === null ? null : (
                <Text size="xs" c="dimmed">
                    {reason}
                </Text>
            )}
        </>
    );
}

/**
 * The verbs as menu items, a disabled one with its reason.
 * @param props - Component props
 * @param props.actions - The verbs
 * @returns The items
 */
export function AttributeMenuItems({ actions }: Readonly<{ actions: readonly AttributeAction[] }>): React.JSX.Element {
    return (
        <>
            {actions.map((action) => (
                <Menu.Item key={action.label} disabled={action.disabledReason !== null} onClick={action.run}>
                    <ItemLabel label={action.label} reason={action.disabledReason} />
                </Menu.Item>
            ))}
        </>
    );
}
