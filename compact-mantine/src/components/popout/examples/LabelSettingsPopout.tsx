import { Box, Button, Checkbox, Select, Slider, Stack, Text } from "@mantine/core";
import { ChevronRight, ExternalLink } from "lucide-react";
import { type JSX, type RefObject, useState } from "react";

import { StyleNumberInput } from "../../StyleNumberInput";
import { ToggleWithContent } from "../../ToggleWithContent";
import { Popout } from "../Popout";
import { PopoutButton } from "../PopoutButton";

/**
 * Props for the LabelSettingsPopout component.
 */
interface LabelSettingsPopoutProps {
    /**
     * Optional ref to anchor the popout to a specific element (e.g., sidebar).
     * If not provided, the popout will anchor to the trigger button.
     */
    anchorRef?: RefObject<HTMLElement | null>;
}

/**
 * A real-world integration example demonstrating the Popout component.
 *
 * This component provides a comprehensive label settings panel with:
 * - Tabbed interface for organizing settings
 * - General tab: visibility toggle, font size, font family, color options
 * - Advanced tab: positioning, opacity, performance settings, nested child popout
 * - About tab: version information
 *
 * This serves as a reference implementation for how to use the Popout
 * component in a production application, including nested popouts.
 *
 * @param props - Component props
 * @param props.anchorRef - Optional ref to anchor element for positioning
 * @returns The LabelSettingsPopout component
 *
 * @example
 * ```tsx
 * const sidebarRef = useRef<HTMLDivElement>(null);
 *
 * <div ref={sidebarRef}>
 *     <LabelSettingsPopout anchorRef={sidebarRef} />
 * </div>
 * ```
 */
export function LabelSettingsPopout({ anchorRef }: LabelSettingsPopoutProps): JSX.Element {
    // State for label settings
    const [showLabels, setShowLabels] = useState(true);
    const [fontSize, setFontSize] = useState(12);
    const [fontFamily, setFontFamily] = useState("Inter");
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [opacity, setOpacity] = useState(100);
    const [maxLabels, setMaxLabels] = useState(100);

    return (
        <Popout>
            <Popout.Trigger>
                <PopoutButton
                    icon={<ExternalLink size={12} />}
                    aria-label="Open label settings"
                />
            </Popout.Trigger>
            <Popout.Panel
                width={300}
                anchorRef={anchorRef}
                placement="left"
                alignment="start"
                gap={-1}
                header={{
                    variant: "tabs",
                    tabs: [
                        {
                            id: "general",
                            label: "General",
                            content: (
                                <Popout.Content>
                                    <Stack gap="sm">
                                        <ToggleWithContent
                                            label="Show labels"
                                            checked={showLabels}
                                            onChange={setShowLabels}
                                        >
                                            <StyleNumberInput
                                                label="Font size"
                                                defaultValue={12}
                                                value={fontSize}
                                                onChange={(val) => setFontSize(val ?? 12)}
                                                min={8}
                                                max={24}
                                                step={1}
                                                suffix="px"
                                            />
                                            <Select
                                                label="Font family"
                                                value={fontFamily}
                                                onChange={(val) => setFontFamily(val ?? "Inter")}
                                                data={["Inter", "Arial", "Roboto", "Helvetica", "System UI"]}
                                            />
                                            <Box>
                                                <Checkbox
                                                    label="Bold"
                                                    checked={bold}
                                                    onChange={(e) => setBold(e.currentTarget.checked)}
                                                />
                                                <Checkbox
                                                    label="Italic"
                                                    checked={italic}
                                                    onChange={(e) => setItalic(e.currentTarget.checked)}
                                                    mt={4}
                                                />
                                            </Box>
                                        </ToggleWithContent>

                                        {/* Nested child popout for additional settings */}
                                        <Box
                                            mt="sm"
                                            pt="sm"
                                            style={{
                                                borderTop:
                                                    "1px solid var(--mantine-color-default-border)",
                                            }}
                                        >
                                            <Popout>
                                                <Popout.Trigger>
                                                    <Button
                                                        size="compact-sm"
                                                        variant="light"
                                                        fullWidth
                                                        rightSection={<ChevronRight size={14} />}
                                                        aria-label="Open performance settings"
                                                    >
                                                        Performance Settings
                                                    </Button>
                                                </Popout.Trigger>
                                                <Popout.Panel
                                                    width={240}
                                                    header={{
                                                        variant: "title",
                                                        title: "Performance",
                                                    }}
                                                    placement="left"
                                                    gap={-1}
                                                >
                                                    <Popout.Content>
                                                        <Stack gap="sm">
                                                            <Text size="xs" c="dimmed">
                                                                Fine-tune label rendering performance.
                                                            </Text>
                                                            <Checkbox
                                                                label="Use GPU acceleration"
                                                                defaultChecked
                                                            />
                                                            <Checkbox
                                                                label="Cache label textures"
                                                                defaultChecked
                                                            />
                                                            <Checkbox
                                                                label="Batch render updates"
                                                            />
                                                            <StyleNumberInput
                                                                label="Render budget (ms)"
                                                                defaultValue={16}
                                                                min={1}
                                                                max={100}
                                                                step={1}
                                                                suffix="ms"
                                                            />
                                                        </Stack>
                                                    </Popout.Content>
                                                </Popout.Panel>
                                            </Popout>
                                        </Box>
                                    </Stack>
                                </Popout.Content>
                            ),
                        },
                        {
                            id: "advanced",
                            label: "Advanced",
                            content: (
                                <Popout.Content>
                                    <Stack gap="sm">
                                        <Box>
                                            <Text size="sm" fw={500} mb={4}>
                                                Label opacity
                                            </Text>
                                            <Slider
                                                value={opacity}
                                                onChange={setOpacity}
                                                min={0}
                                                max={100}
                                                marks={[
                                                    { value: 0, label: "0%" },
                                                    { value: 50, label: "50%" },
                                                    { value: 100, label: "100%" },
                                                ]}
                                            />
                                        </Box>
                                        <StyleNumberInput
                                            label="Max labels"
                                            defaultValue={100}
                                            value={maxLabels}
                                            onChange={(val) => setMaxLabels(val ?? 100)}
                                            min={0}
                                            max={1000}
                                            step={10}
                                        />
                                        <Checkbox
                                            label="Hide overlapping labels"
                                            defaultChecked
                                        />
                                        <Checkbox
                                            label="Prioritize selected nodes"
                                            defaultChecked
                                        />
                                        <Text size="sm" c="dimmed" mt="xs">
                                            Advanced settings affect rendering performance.
                                        </Text>
                                    </Stack>
                                </Popout.Content>
                            ),
                        },
                        {
                            id: "about",
                            label: "About",
                            content: (
                                <Popout.Content>
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>
                                            Label Settings
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            Configure how labels appear on graph nodes and edges.
                                        </Text>
                                        <Box
                                            mt="md"
                                            p="xs"
                                            style={{
                                                // Use default color for theme-aware background in both light and dark modes
                                                backgroundColor: "var(--mantine-color-default)",
                                                borderRadius: 4,
                                            }}
                                        >
                                            <Text size="sm" c="dimmed">
                                                Version 1.0.0
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                Part of @graphty/compact-mantine
                                            </Text>
                                        </Box>
                                    </Stack>
                                </Popout.Content>
                            ),
                        },
                    ],
                }}
            />
        </Popout>
    );
}
