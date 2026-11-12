import { Button, Tooltip } from "@mantine/core";
import type React from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { useUsageAnswer } from "./usageData";
import { useAssistantSendsTo } from "./useAssistantSendsTo";

/**
 * The privacy chip (tier1-design.md section 2.1): "Local only", or "Usage data on, content
 * masked" once the reader has said Share; opens Settings > Privacy. The status bar and the start
 * screen both draw it. Its tooltip says what is sent and where the chip leads. With the assistant
 * experiment on and a provider saved it reads "Sends to {provider}" and opens AI provider.
 * @returns The chip
 */
export function PrivacyChip(): React.JSX.Element {
    const { run } = useWorkspace();
    const on = useUsageAnswer() === "share";
    const usage = on ? "Usage data is sent, content masked" : "Nothing is sent";
    const sendsTo = useAssistantSendsTo();
    const usageWords = on ? "Usage data on, content masked" : "Local only";
    const glyph =
        on || sendsTo !== null ? <GLYPHS.shared size={12} aria-hidden /> : <GLYPHS.private size={12} aria-hidden />;
    const usageNote = on ? ` ${usage}.` : "";
    return (
        <Tooltip
            label={
                sendsTo === null
                    ? `${usage}. Opens Settings > Privacy`
                    : `Your messages and graph details go to ${sendsTo}.${usageNote} Opens AI provider`
            }
        >
            <Button
                variant="subtle"
                size="compact-xs"
                className="ws-privacy-chip"
                leftSection={glyph}
                onClick={() => {
                    run(sendsTo === null ? "settings.privacy" : "settings.assistant");
                }}
            >
                {sendsTo === null ? usageWords : `Sends to ${sendsTo}`}
            </Button>
        </Tooltip>
    );
}
