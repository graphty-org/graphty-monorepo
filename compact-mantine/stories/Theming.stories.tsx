import {
    ActionIcon,
    Box,
    Button,
    Checkbox,
    Code,
    DEFAULT_THEME,
    Group,
    MantineProvider,
    NumberInput,
    Select,
    Slider,
    Stack,
    Switch,
    Text,
    TextInput,
    Title,
    createTheme,
    mergeMantineTheme,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { ExternalLink, Palette, Settings, Sliders } from "lucide-react";
import { useRef } from "react";

import {
    CompactColorInput,
    ControlGroup,
    ControlSection,
    Popout,
    PopoutButton,
    PopoutManager,
    StyleNumberInput,
    ToggleWithContent,
    compactTheme,
} from "../src";

/**
 * The compact-mantine theme provides a dense, professional UI ideal for
 * design tools, control panels, and data-heavy applications.
 *
 * These stories demonstrate how to customize and use the theme.
 */
const meta: Meta = {
    title: "Theming",
    decorators: [
        (Story) => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;

type Story = StoryObj;

/**
 * ## Changing the Primary Color
 *
 * Override the primary color while keeping compact sizing.
 */
export const ChangePrimaryColor: Story = {
    render: () => {
        // compactTheme is a full theme (merged with DEFAULT_THEME), so we can use it
        // directly with mergeMantineTheme - no need to pass DEFAULT_THEME.colors
        const tealTheme = mergeMantineTheme(
            compactTheme,
            createTheme({ primaryColor: "teal" }),
        );
        const grapeTheme = mergeMantineTheme(
            compactTheme,
            createTheme({ primaryColor: "grape" }),
        );
        const orangeTheme = mergeMantineTheme(
            compactTheme,
            createTheme({ primaryColor: "orange" }),
        );

        return (
            <Stack gap="xl">
                <Box>
                    <Title order={5} mb="xs">
                        How to change the primary color:
                    </Title>
                    <Code block>
                        {`import { mergeMantineTheme, createTheme, MantineProvider } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

// compactTheme is a full theme, so you can use it directly with mergeMantineTheme
const myTheme = mergeMantineTheme(
    compactTheme,
    createTheme({ primaryColor: "teal" })
);

// For nested providers on the same page, use cssVariablesSelector to scope CSS variables
<div className="my-theme-container">
  <MantineProvider theme={myTheme} cssVariablesSelector=".my-theme-container">
    <App />
  </MantineProvider>
</div>`}
                    </Code>
                </Box>

                <Group gap="xl">
                    {/* Each MantineProvider uses cssVariablesSelector to scope CSS vars to its container */}
                    <Box className="teal-theme-container">
                        <MantineProvider theme={tealTheme} cssVariablesSelector=".teal-theme-container">
                            <Stack gap="xs">
                                <Text size="xs" fw={500}>
                                    Teal
                                </Text>
                                <Button>Primary Button</Button>
                                <Checkbox label="Checkbox" defaultChecked />
                                <Switch label="Switch" defaultChecked />
                            </Stack>
                        </MantineProvider>
                    </Box>

                    <Box className="grape-theme-container">
                        <MantineProvider theme={grapeTheme} cssVariablesSelector=".grape-theme-container">
                            <Stack gap="xs">
                                <Text size="xs" fw={500}>
                                    Grape
                                </Text>
                                <Button>Primary Button</Button>
                                <Checkbox label="Checkbox" defaultChecked />
                                <Switch label="Switch" defaultChecked />
                            </Stack>
                        </MantineProvider>
                    </Box>

                    <Box className="orange-theme-container">
                        <MantineProvider theme={orangeTheme} cssVariablesSelector=".orange-theme-container">
                            <Stack gap="xs">
                                <Text size="xs" fw={500}>
                                    Orange
                                </Text>
                                <Button>Primary Button</Button>
                                <Checkbox label="Checkbox" defaultChecked />
                                <Switch label="Switch" defaultChecked />
                            </Stack>
                        </MantineProvider>
                    </Box>
                </Group>
            </Stack>
        );
    },
};

/**
 * ## Changing Fonts
 *
 * Customize the font family while preserving compact sizing.
 */
export const ChangeFonts: Story = {
    render: () => {
        // compactTheme is a full theme, so we can use it directly with mergeMantineTheme
        const monoTheme = mergeMantineTheme(
            compactTheme,
            createTheme({
                fontFamily: "ui-monospace, monospace",
            }),
        );

        const serifTheme = mergeMantineTheme(
            compactTheme,
            createTheme({
                fontFamily: "Georgia, serif",
            }),
        );

        return (
            <Stack gap="xl">
                <Box>
                    <Title order={5} mb="xs">
                        How to change fonts:
                    </Title>
                    <Code block>
                        {`import { mergeMantineTheme, createTheme } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

// compactTheme is a full theme, so you can use it directly with mergeMantineTheme
const myTheme = mergeMantineTheme(
    compactTheme,
    createTheme({
        fontFamily: "Inter, sans-serif",
        headings: { fontFamily: "Montserrat, sans-serif" }
    })
);`}
                    </Code>
                </Box>

                <Group gap="xl" align="flex-start">
                    <Stack gap="xs">
                        <Text size="xs" fw={500}>
                            Default (System)
                        </Text>
                        <TextInput label="Username" placeholder="Enter username" w={180} />
                        <Button>Submit</Button>
                    </Stack>

                    <MantineProvider theme={monoTheme}>
                        <Stack gap="xs">
                            <Text size="xs" fw={500}>
                                Monospace
                            </Text>
                            <TextInput label="Username" placeholder="Enter username" w={180} />
                            <Button>Submit</Button>
                        </Stack>
                    </MantineProvider>

                    <MantineProvider theme={serifTheme}>
                        <Stack gap="xs">
                            <Text size="xs" fw={500}>
                                Serif
                            </Text>
                            <TextInput label="Username" placeholder="Enter username" w={180} />
                            <Button>Submit</Button>
                        </Stack>
                    </MantineProvider>
                </Group>
            </Stack>
        );
    },
};

/**
 * ## Adjusting Border Radius
 *
 * Make components more rounded or more square.
 */
export const ChangeBorderRadius: Story = {
    render: () => {
        // compactTheme is a full theme, so we can use it directly with mergeMantineTheme
        const roundedTheme = mergeMantineTheme(
            compactTheme,
            createTheme({
                radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
                defaultRadius: "md",
            }),
        );

        const sharpTheme = mergeMantineTheme(
            compactTheme,
            createTheme({
                radius: { xs: "0px", sm: "0px", md: "2px", lg: "2px", xl: "4px" },
                defaultRadius: "sm",
            }),
        );

        return (
            <Stack gap="xl">
                <Box>
                    <Title order={5} mb="xs">
                        How to change border radius:
                    </Title>
                    <Code block>
                        {`import { mergeMantineTheme, createTheme, MantineProvider } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

// compactTheme is a full theme, so you can use it directly with mergeMantineTheme
const myTheme = mergeMantineTheme(
    compactTheme,
    createTheme({
        radius: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
        defaultRadius: "md"
    })
);

// For nested providers on the same page, use cssVariablesSelector to scope CSS variables
<div className="my-theme-container">
  <MantineProvider theme={myTheme} cssVariablesSelector=".my-theme-container">
    <App />
  </MantineProvider>
</div>`}
                    </Code>
                </Box>

                <Group gap="xl" align="flex-start">
                    <Stack gap="xs">
                        <Text size="xs" fw={500}>
                            Default
                        </Text>
                        <TextInput placeholder="Input" w={140} />
                        <Button>Button</Button>
                        <Select data={["Option A", "Option B"]} placeholder="Select" w={140} />
                    </Stack>

                    <Box className="rounded-theme-container">
                        <MantineProvider theme={roundedTheme} cssVariablesSelector=".rounded-theme-container">
                            <Stack gap="xs">
                                <Text size="xs" fw={500}>
                                    Rounded
                                </Text>
                                <TextInput placeholder="Input" w={140} />
                                <Button>Button</Button>
                                <Select data={["Option A", "Option B"]} placeholder="Select" w={140} />
                            </Stack>
                        </MantineProvider>
                    </Box>

                    <Box className="sharp-theme-container">
                        <MantineProvider theme={sharpTheme} cssVariablesSelector=".sharp-theme-container">
                            <Stack gap="xs">
                                <Text size="xs" fw={500}>
                                    Sharp
                                </Text>
                                <TextInput placeholder="Input" w={140} />
                                <Button>Button</Button>
                                <Select data={["Option A", "Option B"]} placeholder="Select" w={140} />
                            </Stack>
                        </MantineProvider>
                    </Box>
                </Group>
            </Stack>
        );
    },
};

/**
 * ## Sidebar with Control Groups
 *
 * The typical usage pattern: a sidebar with organized settings using ControlGroup and ControlSection.
 */
export const SidebarPattern: Story = {
    render: function SidebarPatternRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", height: 500 }}>
                {/* Main content */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Canvas / Main Content</Text>
                </Box>

                {/* Right sidebar */}
                <Popout.Anchor>
                    <Box
                        ref={sidebarRef}
                        style={{
                            width: 260,
                            backgroundColor: "var(--mantine-color-body)",
                            borderLeft: "1px solid var(--mantine-color-default-border)",
                            overflowY: "auto",
                        }}
                    >
                        <ControlSection label="Node Settings">
                            <ControlGroup label="Appearance">
                                <Stack gap="xs" p="xs">
                                    <CompactColorInput
                                        label="Fill Color"
                                        defaultColor="#4A90D9"
                                        showOpacity
                                    />
                                    <CompactColorInput
                                        label="Border Color"
                                        defaultColor="#2D5A87"
                                        showOpacity={false}
                                    />
                                    <StyleNumberInput
                                        label="Border Width"
                                        defaultValue={1}
                                        min={0}
                                        max={10}
                                        suffix="px"
                                    />
                                </Stack>
                            </ControlGroup>

                            <Popout>
                                <ControlGroup
                                    label="Labels"
                                    actions={
                                        <Popout.Trigger>
                                            <PopoutButton
                                                icon={<ExternalLink size={12} />}
                                                aria-label="Open label settings"
                                            />
                                        </Popout.Trigger>
                                    }
                                >
                                    <Stack gap="xs" p="xs">
                                        <ToggleWithContent label="Show Labels" defaultChecked>
                                            <StyleNumberInput
                                                label="Font Size"
                                                defaultValue={12}
                                                min={8}
                                                max={24}
                                                suffix="px"
                                            />
                                        </ToggleWithContent>
                                    </Stack>
                                </ControlGroup>
                                <Popout.Panel
                                    width={280}
                                    header={{ variant: "title", title: "Label Settings" }}
                                    placement="left"
                                >
                                    <Popout.Content>
                                        <Stack gap="sm">
                                            <CompactColorInput
                                                label="Text Color"
                                                defaultColor="#FFFFFF"
                                            />
                                            <CompactColorInput
                                                label="Background"
                                                defaultColor="#000000"
                                            />
                                            <Checkbox label="Bold text" />
                                            <Checkbox label="Show on hover only" />
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>

                            <ControlGroup label="Size">
                                <Stack gap="xs" p="xs">
                                    <StyleNumberInput
                                        label="Width"
                                        defaultValue={100}
                                        min={10}
                                        max={500}
                                        suffix="px"
                                    />
                                    <StyleNumberInput
                                        label="Height"
                                        defaultValue={100}
                                        min={10}
                                        max={500}
                                        suffix="px"
                                    />
                                </Stack>
                            </ControlGroup>
                        </ControlSection>
                    </Box>
                </Popout.Anchor>
            </Box>
        );
    },
};

/**
 * ## Popout Panels
 *
 * Popout panels float over the UI for detailed settings without leaving context.
 */
export const PopoutPanelPattern: Story = {
    render: function PopoutPanelPatternRender() {
        const containerRef = useRef<HTMLDivElement>(null);

        return (
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Popouts provide floating panels for detailed settings. Click the buttons below to
                    see different popout configurations.
                </Text>

                <Popout.Anchor>
                    <Box
                        ref={containerRef}
                        p="md"
                        style={{
                            backgroundColor: "var(--mantine-color-body)",
                            border: "1px solid var(--mantine-color-default-border)",
                            borderRadius: 8,
                            width: 300,
                        }}
                    >
                        <Stack gap="sm">
                            {/* Settings popout */}
                            <Popout>
                                <Group justify="space-between">
                                    <Text size="sm">General Settings</Text>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Settings size={14} />}
                                            aria-label="Open general settings"
                                        />
                                    </Popout.Trigger>
                                </Group>
                                <Popout.Panel
                                    width={260}
                                    header={{ variant: "title", title: "General Settings" }}
                                    placement="right"
                                >
                                    <Popout.Content>
                                        <Stack gap="sm">
                                            <TextInput label="Project Name" defaultValue="My Project" />
                                            <NumberInput label="Max Items" defaultValue={100} />
                                            <Switch label="Auto-save" defaultChecked />
                                            <Switch label="Show tooltips" defaultChecked />
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>

                            {/* Appearance popout */}
                            <Popout>
                                <Group justify="space-between">
                                    <Text size="sm">Appearance</Text>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Palette size={14} />}
                                            aria-label="Open appearance settings"
                                        />
                                    </Popout.Trigger>
                                </Group>
                                <Popout.Panel
                                    width={260}
                                    header={{ variant: "title", title: "Appearance" }}
                                    placement="right"
                                >
                                    <Popout.Content>
                                        <Stack gap="sm">
                                            <CompactColorInput
                                                label="Background"
                                                defaultColor="#1A1B1E"
                                            />
                                            <CompactColorInput
                                                label="Accent Color"
                                                defaultColor="#228BE6"
                                            />
                                            <Box>
                                                <Text size="xs" c="dimmed" mb={4}>
                                                    Opacity
                                                </Text>
                                                <Slider defaultValue={100} min={0} max={100} />
                                            </Box>
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>

                            {/* Advanced popout */}
                            <Popout>
                                <Group justify="space-between">
                                    <Text size="sm">Advanced</Text>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Sliders size={14} />}
                                            aria-label="Open advanced settings"
                                        />
                                    </Popout.Trigger>
                                </Group>
                                <Popout.Panel
                                    width={260}
                                    header={{ variant: "title", title: "Advanced Settings" }}
                                    placement="right"
                                >
                                    <Popout.Content>
                                        <Stack gap="sm">
                                            <Select
                                                label="Render Mode"
                                                data={["WebGL", "Canvas", "SVG"]}
                                                defaultValue="WebGL"
                                            />
                                            <NumberInput
                                                label="FPS Limit"
                                                defaultValue={60}
                                                min={30}
                                                max={144}
                                            />
                                            <Checkbox label="Debug mode" />
                                            <Checkbox label="Performance overlay" />
                                        </Stack>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Stack>
                    </Box>
                </Popout.Anchor>
            </Stack>
        );
    },
};

/**
 * ## Control Group Patterns
 *
 * ControlGroup and ControlSection organize settings into collapsible, labeled sections.
 */
export const ControlGroupPatterns: Story = {
    render: () => (
        <Box
            w={280}
            style={{
                backgroundColor: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: 8,
            }}
        >
            <ControlSection label="Transform">
                <ControlGroup label="Position">
                    <Group gap="xs" p="xs">
                        <StyleNumberInput label="X" defaultValue={0} suffix="px" />
                        <StyleNumberInput label="Y" defaultValue={0} suffix="px" />
                    </Group>
                </ControlGroup>

                <ControlGroup label="Scale">
                    <Group gap="xs" p="xs">
                        <StyleNumberInput label="Width" defaultValue={100} suffix="%" />
                        <StyleNumberInput label="Height" defaultValue={100} suffix="%" />
                    </Group>
                </ControlGroup>

                <ControlGroup label="Rotation">
                    <Box p="xs">
                        <StyleNumberInput label="Angle" defaultValue={0} suffix="°" />
                    </Box>
                </ControlGroup>
            </ControlSection>

            <ControlSection label="Effects">
                <ControlGroup label="Shadow">
                    <Stack gap="xs" p="xs">
                        <ToggleWithContent label="Enable Shadow" defaultChecked={false}>
                            <CompactColorInput label="Color" defaultColor="#000000" />
                            <Group gap="xs">
                                <StyleNumberInput label="X" defaultValue={2} suffix="px" />
                                <StyleNumberInput label="Y" defaultValue={2} suffix="px" />
                            </Group>
                            <StyleNumberInput label="Blur" defaultValue={4} suffix="px" />
                        </ToggleWithContent>
                    </Stack>
                </ControlGroup>

                <ControlGroup label="Blur">
                    <Box p="xs">
                        <StyleNumberInput label="Amount" defaultValue={0} min={0} max={100} suffix="px" />
                    </Box>
                </ControlGroup>
            </ControlSection>
        </Box>
    ),
};

/**
 * ## Inline Settings Row
 *
 * Compact inline layouts for quick settings adjustments.
 */
export const InlineSettingsPattern: Story = {
    render: () => (
        <Stack gap="md" w={400}>
            <Text size="sm" c="dimmed">
                Inline patterns for compact property editors:
            </Text>

            <Box
                p="sm"
                style={{
                    backgroundColor: "var(--mantine-color-body)",
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: 8,
                }}
            >
                <Stack gap="sm">
                    {/* Color with opacity */}
                    <Group justify="space-between" align="center">
                        <Text size="xs">Fill</Text>
                        <CompactColorInput defaultColor="#4A90D9" showOpacity />
                    </Group>

                    {/* Toggle with inline value */}
                    <Group justify="space-between" align="center">
                        <Text size="xs">Visible</Text>
                        <Switch defaultChecked />
                    </Group>

                    {/* Number input with label */}
                    <Group justify="space-between" align="center">
                        <Text size="xs">Opacity</Text>
                        <NumberInput defaultValue={100} min={0} max={100} w={80} suffix="%" />
                    </Group>

                    {/* Select inline */}
                    <Group justify="space-between" align="center">
                        <Text size="xs">Blend Mode</Text>
                        <Select
                            data={["Normal", "Multiply", "Screen", "Overlay"]}
                            defaultValue="Normal"
                            w={120}
                        />
                    </Group>

                    {/* Action buttons */}
                    <Group justify="flex-end" gap="xs" mt="xs">
                        <Button variant="subtle" size="compact-xs">
                            Reset
                        </Button>
                        <Button size="compact-xs">Apply</Button>
                    </Group>
                </Stack>
            </Box>
        </Stack>
    ),
};
