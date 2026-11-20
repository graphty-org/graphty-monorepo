import { Button, Kbd } from "@mantine/core";
import React from "react";

import { ariaKey, formatKey } from "../keys/keys";
import { STAGED_WORDS } from "./words";

/**
 * A source card's Cancel, showing its Esc key.
 * @param props - Component props
 * @param props.onClick - cancels the card
 * @returns the button
 */
export function CancelButton({ onClick }: Readonly<{ onClick: () => void }>): React.JSX.Element {
    return (
        <Button
            size="compact-xs"
            variant="default"
            rightSection={<Kbd size="xs">{formatKey("Escape")}</Kbd>}
            aria-keyshortcuts={ariaKey("Escape")}
            onClick={onClick}
        >
            {STAGED_WORDS.cancel}
        </Button>
    );
}
