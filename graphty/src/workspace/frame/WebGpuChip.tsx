import { Badge } from "@mantine/core";
import type React from "react";

import { useAccelerationStatus } from "./useAccelerationStatus";

/**
 * The status bar's WebGPU chip: "WebGPU: enabled" while the element runs on a GPU, "WebGPU:
 * disabled" when it does not (switched off, no GPU, or an error). Nothing while it is still looking.
 * @returns The chip, or null
 */
export function WebGpuChip(): React.JSX.Element | null {
    const status = useAccelerationStatus();
    if (status === null || status.state === "probing") {
        return null;
    }
    const on = status.state === "active" || status.state === "idle";
    return (
        <Badge variant="dot" color={on ? "green.8" : "gray.6"} data-testid="webgpu-chip">
            {on ? "WebGPU: enabled" : "WebGPU: disabled"}
        </Badge>
    );
}
