import { Text } from "@mantine/core";
import React from "react";

import { formatKey } from "../keys/keys";

/**
 * A control's key, in the dim text the rest of the app shows one in.
 * @param props - Component props
 * @param props.combo - the key
 * @returns the key
 */
export function KeyWords({ combo }: Readonly<{ combo: string }>): React.JSX.Element {
    return (
        <Text size="xs" c="dimmed" span>
            {formatKey(combo)}
        </Text>
    );
}
