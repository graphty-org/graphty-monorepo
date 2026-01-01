import { Badge, Group, Loader, Text, Tooltip } from "@mantine/core";
import { AlertCircle, CheckCircle, Circle, Cpu, Sparkles, Zap } from "lucide-react";

import type { AiStage, AiStatus } from "../../types/ai";

interface AiStatusIndicatorProps {
    /** Current AI status */
    status: AiStatus | null;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Whether to show detailed status text */
    showText?: boolean;
}

/** Stage to icon mapping */
const STAGE_ICONS: Record<AiStage, React.ReactNode> = {
    idle: <Circle size={14} />,
    processing: <Loader size={14} />,
    executingTool: <Zap size={14} />,
    streaming: <Sparkles size={14} />,
    complete: <CheckCircle size={14} />,
    error: <AlertCircle size={14} />,
};

/** Stage to color mapping */
const STAGE_COLORS: Record<AiStage, string> = {
    idle: "gray",
    processing: "blue",
    executingTool: "orange",
    streaming: "violet",
    complete: "green",
    error: "red",
};

/** Stage to label mapping */
const STAGE_LABELS: Record<AiStage, string> = {
    idle: "Ready",
    processing: "Processing",
    executingTool: "Executing",
    streaming: "Generating",
    complete: "Complete",
    error: "Error",
};

/**
 * Displays the current AI processing status with an icon and optional text.
 * @param root0 - Component props
 * @param root0.status - Current AI status
 * @param root0.size - Size variant for the indicator
 * @param root0.showText - Whether to show detailed status text
 * @returns The AI status indicator component
 */
export function AiStatusIndicator({
    status,
    size = "md",
    showText = false,
}: AiStatusIndicatorProps): React.JSX.Element {
    const stage = status?.stage ?? "idle";
    const icon = STAGE_ICONS[stage];
    const color = STAGE_COLORS[stage];
    const label = STAGE_LABELS[stage];

    // Build detailed status text
    let detailText = label;
    if (status?.message) {
        detailText = status.message;
    } else if (stage === "executingTool" && status?.toolCalls?.length) {
        const currentTool = status.toolCalls.find((t) => t.status === "executing");
        if (currentTool) {
            detailText = `Running: ${currentTool.name}`;
        }
    } else if (stage === "streaming" && status?.streamedText) {
        detailText = status.streamedText.slice(0, 50) + (status.streamedText.length > 50 ? "..." : "");
    } else if (stage === "error" && status?.error) {
        detailText = status.error.message;
    }

    const sizeMap = { sm: "xs", md: "sm", lg: "md" } as const;
    const iconSizeMap = { sm: 12, md: 14, lg: 16 } as const;
    const badgeSize = sizeMap[size];
    const iconSize = iconSizeMap[size];

    if (!showText) {
        return (
            <Tooltip label={detailText}>
                <Badge
                    color={color}
                    variant="light"
                    size={badgeSize}
                    leftSection={stage === "processing" ? <Loader size={iconSize} /> : <Cpu size={iconSize} />}
                >
                    {label}
                </Badge>
            </Tooltip>
        );
    }

    return (
        <Group gap="xs">
            <Badge color={color} variant="light" size={badgeSize} leftSection={icon}>
                {label}
            </Badge>
            {detailText !== label && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                    {detailText}
                </Text>
            )}
        </Group>
    );
}
