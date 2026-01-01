import { ActionIcon, Indicator, Tooltip } from "@mantine/core";
import { Sparkles } from "lucide-react";
import React from "react";

interface AiActionButtonProps {
    /** Whether at least one AI provider is configured */
    isConfigured: boolean;
    /** Whether AI is currently processing a command */
    isProcessing: boolean;
    /** Whether the AI system is ready (loaded) */
    isReady: boolean;
    /** Click handler - opens settings if unconfigured, chat if configured */
    onClick: () => void;
    /** Optional additional class name */
    className?: string;
}

/**
 * AI Action Button (Sparkle Icon).
 *
 * Visual states:
 * - Unconfigured: Outline sparkle icon
 * - Configured: Filled sparkle icon with violet color
 * - Processing: Pulsing animation with indicator dot
 * - Not ready: Disabled state
 * @param root0 - Component props
 * @param root0.isConfigured - Whether at least one AI provider is configured
 * @param root0.isProcessing - Whether AI is currently processing a command
 * @param root0.isReady - Whether the AI system is ready (loaded)
 * @param root0.onClick - Click handler - opens settings if unconfigured, chat if configured
 * @param root0.className - Optional additional class name
 * @returns The AI action button component
 */
export function AiActionButton({
    isConfigured,
    isProcessing,
    isReady,
    onClick,
    className,
}: AiActionButtonProps): React.JSX.Element {
    const getTooltipLabel = (): string => {
        if (!isReady) {
            return "Loading AI...";
        }

        if (!isConfigured) {
            return "Configure AI";
        }

        if (isProcessing) {
            return "AI is processing...";
        }

        return "Open AI Assistant";
    };
    const tooltipLabel = getTooltipLabel();

    const button = (
        <ActionIcon
            variant={isConfigured ? "filled" : "subtle"}
            color={isConfigured ? "violet" : "gray"}
            aria-label={tooltipLabel}
            onClick={onClick}
            disabled={!isReady}
            className={className}
            style={{
                animation: isProcessing ? "pulse 1.5s ease-in-out infinite" : undefined,
            }}
        >
            <Sparkles size={18} />
        </ActionIcon>
    );

    // Wrap with indicator when processing
    if (isProcessing) {
        return (
            <Tooltip label={tooltipLabel} position="bottom" withArrow>
                <Indicator color="violet" size={8} processing position="top-end" offset={2}>
                    {button}
                </Indicator>
            </Tooltip>
        );
    }

    return (
        <Tooltip label={tooltipLabel} position="bottom" withArrow>
            {button}
        </Tooltip>
    );
}
