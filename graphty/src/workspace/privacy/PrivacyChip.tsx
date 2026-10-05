import { Button } from "@mantine/core";
import { Lock, Share2 } from "lucide-react";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useUsageAnswer } from "./usageData";

/**
 * The privacy chip (tier1-design.md section 2.1): "Local only", or "Usage data on, content
 * masked" once the reader has said Share; opens Settings > Privacy. The header and the start
 * screen both draw it.
 * @returns The chip
 */
export function PrivacyChip(): React.JSX.Element {
    const { run } = useWorkspace();
    const on = useUsageAnswer() === "share";
    return (
        <Button
            variant="subtle"
            size="compact-xs"
            className="ws-privacy-chip"
            leftSection={on ? <Share2 size={12} aria-hidden /> : <Lock size={12} aria-hidden />}
            onClick={() => {
                run("settings.privacy");
            }}
        >
            {on ? "Usage data on, content masked" : "Local only"}
        </Button>
    );
}
