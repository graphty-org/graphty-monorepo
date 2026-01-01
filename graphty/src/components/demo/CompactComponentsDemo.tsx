import {
    ActionIcon,
    Autocomplete,
    Badge,
    Box,
    Button,
    Checkbox,
    ColorInput,
    ColorPicker,
    ColorSwatch,
    Divider,
    Group,
    MantineSize,
    NativeSelect,
    NumberInput,
    Pill,
    Popover,
    Radio,
    SegmentedControl,
    Select,
    Slider,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core";
import {
    AlignLeft,
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    Hash,
    Link2,
    Minus,
    Move,
    Palette,
    Plus,
    RotateCw,
    Settings,
    Trash,
    Type,
} from "lucide-react";
import React, { useState } from "react";

import { opacityToAlphaHex, parseAlphaFromHexa } from "../../utils/color-utils";

/**
 * Comprehensive demo of all Mantine components with compact size styling.
 * This page showcases the compact design system defined in compact-ui-design.md.
 *
 * Compact size specifications:
 * - Input height: 24px
 * - Font size: 11px
 * - Padding X: 8px
 * @returns The compact components demo page
 */
export function CompactComponentsDemo(): React.JSX.Element {
    const [textValue, setTextValue] = useState("Sample text");
    const [numberValue, setNumberValue] = useState<number | string>(42);
    const [selectValue, setSelectValue] = useState("option1");
    const [segmentValue, setSegmentValue] = useState("option1");
    const [checkboxValue, setCheckboxValue] = useState(true);
    const [switchValue, setSwitchValue] = useState(true);
    const [sliderValue, setSliderValue] = useState(50);
    const [radioValue, setRadioValue] = useState("option1");
    const [colorValue, setColorValue] = useState("#5b8ff9");
    const [textareaValue, setTextareaValue] = useState("Multi-line\ntext content");
    const [autocompleteValue, setAutocompleteValue] = useState("");

    // Figma-style color property state
    const [fillColor, setFillColor] = useState("#5B8FF9");
    const [fillOpacity, setFillOpacity] = useState<number | string>(100);
    const [fillVisible, setFillVisible] = useState(true);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    // Handle color picker change - parses HEXA format and updates both hex and opacity
    const handleColorPickerChange = (hexaColor: string): void => {
        // HEXA format is #RRGGBBAA where AA is alpha (00-FF)
        if (hexaColor.length === 9) {
            // Has alpha channel
            const hex = hexaColor.slice(0, 7);
            const alphaHex = hexaColor.slice(7, 9);
            const alpha = parseAlphaFromHexa(alphaHex);
            setFillColor(hex.toUpperCase());
            setFillOpacity(alpha);
        } else {
            // No alpha, just hex
            setFillColor(hexaColor.toUpperCase());
            setFillOpacity(100);
        }
    };

    // Combine current hex and opacity into HEXA format for ColorPicker
    const getHexaValue = (): string => {
        const opacityNum = typeof fillOpacity === "string" ? parseInt(fillOpacity, 10) : fillOpacity;
        const alphaHex = opacityToAlphaHex(opacityNum);
        return `${fillColor}${alphaHex}`.toUpperCase();
    };

    return (
        <Box style={{ height: "100vh", overflow: "auto", backgroundColor: "var(--mantine-color-body)" }}>
            <Box p="md" style={{ maxWidth: 800, margin: "0 auto" }}>
                <Title order={1} mb="lg">
                    Compact Components Demo
                </Title>
                <Text c="dimmed" mb="xl">
                    All components below use <code>size="compact"</code> (24px height, 11px font). This demonstrates the
                    Figma-style dense UI suitable for properties panels.
                </Text>

                {/* Comparison Section */}
                <Section title="Size Comparison">
                    <Text size="sm" c="dimmed" mb="md">
                        Compare compact size with standard Mantine sizes:
                    </Text>
                    <Stack gap="xs">
                        <Group gap="md" align="flex-end">
                            <Box w={100}>
                                <Text size="xs" c="dimmed">
                                    xs (28px)
                                </Text>
                            </Box>
                            <TextInput size="xs" placeholder="Size xs" style={{ flex: 1 }} />
                        </Group>
                        <Group gap="md" align="flex-end">
                            <Box w={100}>
                                <Text size="xs" c="dimmed">
                                    compact (24px)
                                </Text>
                            </Box>
                            <TextInput size="compact" placeholder="Size compact" style={{ flex: 1 }} />
                        </Group>
                        <Group gap="md" align="flex-end">
                            <Box w={100}>
                                <Text size="xs" c="dimmed">
                                    sm (32px)
                                </Text>
                            </Box>
                            <TextInput size="sm" placeholder="Size sm" style={{ flex: 1 }} />
                        </Group>
                        <Group gap="md" align="flex-end">
                            <Box w={100}>
                                <Text size="xs" c="dimmed">
                                    md (36px)
                                </Text>
                            </Box>
                            <TextInput size="md" placeholder="Size md" style={{ flex: 1 }} />
                        </Group>
                    </Stack>
                </Section>

                {/* Input Components */}
                <Section title="Input Components">
                    <Grid>
                        <GridItem label="TextInput">
                            <TextInput
                                size="compact"
                                value={textValue}
                                onChange={(e) => {
                                    setTextValue(e.currentTarget.value);
                                }}
                                placeholder="Enter text..."
                            />
                        </GridItem>

                        <GridItem label="NumberInput">
                            <NumberInput
                                size="compact"
                                value={numberValue}
                                onChange={setNumberValue}
                                min={0}
                                max={100}
                            />
                        </GridItem>

                        <GridItem label="NumberInput (hideControls)">
                            <NumberInput size="compact" value={numberValue} onChange={setNumberValue} hideControls />
                        </GridItem>

                        <GridItem label="NativeSelect">
                            <NativeSelect
                                size="compact"
                                value={selectValue}
                                onChange={(e) => {
                                    setSelectValue(e.currentTarget.value);
                                }}
                                data={[
                                    { value: "option1", label: "Option 1" },
                                    { value: "option2", label: "Option 2" },
                                    { value: "option3", label: "Option 3" },
                                ]}
                                rightSection={<ChevronDown size={14} />}
                            />
                        </GridItem>

                        <GridItem label="Select (with chevron)">
                            <Select
                                size="compact"
                                value={selectValue}
                                onChange={(val) => {
                                    setSelectValue(val ?? "option1");
                                }}
                                data={[
                                    { value: "option1", label: "Option 1" },
                                    { value: "option2", label: "Option 2" },
                                    { value: "option3", label: "Option 3" },
                                ]}
                                rightSection={<ChevronDown size={14} />}
                                autoComplete="off"
                                // Prevent password managers from showing autofill
                                data-lpignore="true"
                                data-1p-ignore
                                data-form-type="other"
                            />
                        </GridItem>

                        <GridItem label="Autocomplete">
                            <Autocomplete
                                size="compact"
                                value={autocompleteValue}
                                onChange={setAutocompleteValue}
                                placeholder="Type to search..."
                                data={["React", "Vue", "Angular", "Svelte", "Solid"]}
                            />
                        </GridItem>

                        <GridItem label="ColorInput (click swatch to open picker)">
                            <ColorInput
                                size="compact"
                                value={colorValue}
                                onChange={setColorValue}
                                swatches={["#5B8FF9", "#FF6B6B", "#61D095", "#F7B731", "#9B59B6"]}
                            />
                        </GridItem>

                        <GridItem label="Textarea" fullWidth>
                            <Textarea
                                size="compact"
                                value={textareaValue}
                                onChange={(e) => {
                                    setTextareaValue(e.currentTarget.value);
                                }}
                                rows={3}
                            />
                        </GridItem>
                    </Grid>
                </Section>

                {/* Figma-Style Input Components */}
                <Section title="Figma-Style Components">
                    <Text size="sm" c="dimmed" mb="md">
                        These patterns match Figma's properties panel design.
                    </Text>

                    <Grid>
                        <GridItem label="TextInput with left icon (W/H pattern)" fullWidth>
                            <Group gap={8}>
                                <TextInput
                                    size="compact"
                                    value="400"
                                    leftSection={
                                        <Text size="xs" c="dimmed" fw={500}>
                                            W
                                        </Text>
                                    }
                                    leftSectionWidth={24}
                                    leftSectionPointerEvents="none"
                                    style={{ flex: 1 }}
                                    styles={{ input: { paddingLeft: 28 } }}
                                />
                                <TextInput
                                    size="compact"
                                    value="300"
                                    leftSection={
                                        <Text size="xs" c="dimmed" fw={500}>
                                            H
                                        </Text>
                                    }
                                    leftSectionWidth={24}
                                    leftSectionPointerEvents="none"
                                    style={{ flex: 1 }}
                                    styles={{ input: { paddingLeft: 28 } }}
                                />
                                <ActionIcon size="compact" variant="subtle" aria-label="Link dimensions">
                                    <Link2 size={14} />
                                </ActionIcon>
                            </Group>
                        </GridItem>

                        <GridItem label="TextInput with right icon" fullWidth>
                            <Group gap={8}>
                                <TextInput
                                    size="compact"
                                    value="0"
                                    rightSection={<RotateCw size={12} color="var(--mantine-color-dimmed)" />}
                                    rightSectionWidth={24}
                                    style={{ flex: 1 }}
                                />
                                <TextInput
                                    size="compact"
                                    value="100%"
                                    rightSection={<Move size={12} color="var(--mantine-color-dimmed)" />}
                                    rightSectionWidth={24}
                                    style={{ flex: 1 }}
                                />
                            </Group>
                        </GridItem>

                        <GridItem label="NumberInput with suffix" fullWidth>
                            <Group gap={8}>
                                <NumberInput size="compact" value={0} suffix="°" hideControls style={{ flex: 1 }} />
                                <NumberInput size="compact" value={100} suffix="%" hideControls style={{ flex: 1 }} />
                                <NumberInput size="compact" value={12} suffix="px" hideControls style={{ flex: 1 }} />
                            </Group>
                        </GridItem>

                        <GridItem label="Figma Fill Row: [■ hex] [opacity%] [eye] [-]" fullWidth>
                            <Group gap={0}>
                                {/* Color swatch with popover */}
                                <Popover
                                    opened={colorPickerOpen}
                                    onChange={setColorPickerOpen}
                                    position="bottom-start"
                                    shadow="md"
                                >
                                    <Popover.Target>
                                        <ActionIcon
                                            variant="filled"
                                            size={24}
                                            radius={0}
                                            style={{
                                                backgroundColor: "var(--mantine-color-default)",
                                                borderRadius: "4px 0 0 4px",
                                            }}
                                            onClick={() => {
                                                setColorPickerOpen((o) => !o);
                                            }}
                                            aria-label="Open color picker"
                                        >
                                            <ColorSwatch
                                                color={fillColor}
                                                size={14}
                                                radius={2}
                                                style={{
                                                    border: "1px solid var(--mantine-color-default-border)",
                                                }}
                                            />
                                        </ActionIcon>
                                    </Popover.Target>
                                    <Popover.Dropdown p="xs">
                                        <ColorPicker
                                            format="hexa"
                                            value={getHexaValue()}
                                            onChange={handleColorPickerChange}
                                            swatches={[
                                                "#5B8FF9FF",
                                                "#FF6B6BFF",
                                                "#61D095FF",
                                                "#F7B731FF",
                                                "#9B59B6FF",
                                                "#5B8FF980",
                                                "#FF6B6B80",
                                                "#61D09580",
                                                "#F7B73180",
                                                "#9B59B680",
                                            ]}
                                        />
                                    </Popover.Dropdown>
                                </Popover>
                                {/* Hex input */}
                                <TextInput
                                    size="compact"
                                    value={fillColor.replace("#", "").toUpperCase()}
                                    onChange={(e) => {
                                        setFillColor(`#${e.currentTarget.value}`);
                                    }}
                                    w={96}
                                    styles={{
                                        input: {
                                            borderRadius: 0,
                                            fontFamily: "monospace",
                                            textTransform: "uppercase",
                                        },
                                    }}
                                />
                                {/* Separator */}
                                <Box
                                    style={{
                                        width: 1,
                                        height: 24,
                                        backgroundColor: "var(--mantine-color-default-border)",
                                    }}
                                />
                                {/* Opacity input */}
                                <NumberInput
                                    size="compact"
                                    value={fillOpacity}
                                    onChange={setFillOpacity}
                                    min={0}
                                    max={100}
                                    hideControls
                                    suffix="%"
                                    w={56}
                                    styles={{
                                        input: {
                                            borderRadius: "0 4px 4px 0",
                                            textAlign: "right",
                                        },
                                    }}
                                />
                                {/* Action buttons */}
                                <Group gap={4} ml={8}>
                                    <ActionIcon
                                        size="compact"
                                        variant="subtle"
                                        onClick={() => {
                                            setFillVisible(!fillVisible);
                                        }}
                                        aria-label={fillVisible ? "Hide fill" : "Show fill"}
                                    >
                                        {fillVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </ActionIcon>
                                    <ActionIcon size="compact" variant="subtle" color="red" aria-label="Remove fill">
                                        <Minus size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                        </GridItem>

                        <GridItem label="Multiple fills (like Figma)" fullWidth>
                            <Stack gap={4}>
                                {/* Selected fill */}
                                <Box
                                    p={4}
                                    style={{
                                        backgroundColor: "var(--mantine-primary-color-filled)",
                                        borderRadius: 4,
                                        marginLeft: -4,
                                        marginRight: -4,
                                    }}
                                >
                                    <Group gap={0}>
                                        <TextInput
                                            size="compact"
                                            value="5B8FF9"
                                            w={110}
                                            leftSection={
                                                <ColorSwatch
                                                    color="#5B8FF9"
                                                    size={14}
                                                    radius={2}
                                                    style={{ cursor: "pointer" }}
                                                />
                                            }
                                            leftSectionWidth={24}
                                            leftSectionPointerEvents="none"
                                            styles={{
                                                input: {
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    fontFamily: "monospace",
                                                    color: "var(--mantine-primary-color-contrast)",
                                                    textTransform: "uppercase",
                                                    paddingLeft: 32,
                                                },
                                            }}
                                        />
                                        <Box
                                            style={{
                                                width: 1,
                                                height: 16,
                                                backgroundColor: "var(--mantine-primary-color-light)",
                                            }}
                                        />
                                        <NumberInput
                                            size="compact"
                                            value={100}
                                            suffix="%"
                                            hideControls
                                            w={56}
                                            styles={{
                                                input: {
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    color: "var(--mantine-primary-color-contrast)",
                                                    textAlign: "right",
                                                },
                                            }}
                                        />
                                        <Group gap={4} ml="auto">
                                            <ActionIcon
                                                size="compact"
                                                variant="subtle"
                                                style={{ color: "var(--mantine-primary-color-contrast)" }}
                                                aria-label="Toggle visibility"
                                            >
                                                <Eye size={14} />
                                            </ActionIcon>
                                            <ActionIcon
                                                size="compact"
                                                variant="subtle"
                                                style={{ color: "var(--mantine-primary-color-contrast)" }}
                                                aria-label="Remove fill"
                                            >
                                                <Minus size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Box>
                                {/* Unselected fill */}
                                <Group gap={0}>
                                    <TextInput
                                        size="compact"
                                        value="FF6B6B"
                                        w={110}
                                        leftSection={
                                            <ColorSwatch
                                                color="#FF6B6B"
                                                size={14}
                                                radius={2}
                                                style={{ cursor: "pointer" }}
                                            />
                                        }
                                        leftSectionWidth={24}
                                        leftSectionPointerEvents="none"
                                        styles={{
                                            input: {
                                                backgroundColor: "var(--mantine-color-default)",
                                                border: "none",
                                                fontFamily: "monospace",
                                                textTransform: "uppercase",
                                                paddingLeft: 32,
                                            },
                                        }}
                                    />
                                    <Box
                                        style={{
                                            width: 1,
                                            height: 16,
                                            backgroundColor: "var(--mantine-color-default-border)",
                                        }}
                                    />
                                    <NumberInput
                                        size="compact"
                                        value={50}
                                        suffix="%"
                                        hideControls
                                        w={56}
                                        styles={{
                                            input: {
                                                backgroundColor: "var(--mantine-color-default)",
                                                border: "none",
                                                textAlign: "right",
                                            },
                                        }}
                                    />
                                    <Group gap={4} ml="auto">
                                        <ActionIcon size="compact" variant="subtle" aria-label="Toggle visibility">
                                            <Eye size={14} />
                                        </ActionIcon>
                                        <ActionIcon size="compact" variant="subtle" aria-label="Remove fill">
                                            <Minus size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Stack>
                        </GridItem>

                        <GridItem label="Compact ActionIcon toolbar" fullWidth>
                            <Group gap={4}>
                                <ActionIcon size="compact" variant="filled" aria-label="Align left">
                                    <AlignLeft size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="subtle" aria-label="Text formatting">
                                    <Type size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="subtle" aria-label="Color palette">
                                    <Palette size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="subtle" aria-label="Hashtag">
                                    <Hash size={14} />
                                </ActionIcon>
                                <Divider orientation="vertical" />
                                <ActionIcon size="compact" variant="subtle" aria-label="Copy">
                                    <Copy size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="subtle" color="red" aria-label="Delete">
                                    <Trash size={14} />
                                </ActionIcon>
                            </Group>
                        </GridItem>
                    </Grid>
                </Section>

                {/* Control Components */}
                <Section title="Control Components">
                    <Grid>
                        <GridItem label="SegmentedControl" fullWidth>
                            <SegmentedControl
                                size="compact"
                                value={segmentValue}
                                onChange={setSegmentValue}
                                data={[
                                    { value: "option1", label: "Solid" },
                                    { value: "option2", label: "Gradient" },
                                    { value: "option3", label: "Radial" },
                                ]}
                                fullWidth
                            />
                        </GridItem>

                        <GridItem label="Checkbox">
                            <Checkbox
                                size="compact"
                                label="Enable feature"
                                checked={checkboxValue}
                                onChange={(e) => {
                                    setCheckboxValue(e.currentTarget.checked);
                                }}
                            />
                        </GridItem>

                        <GridItem label="Switch">
                            <Switch
                                size="compact"
                                label="Toggle option"
                                checked={switchValue}
                                onChange={(e) => {
                                    setSwitchValue(e.currentTarget.checked);
                                }}
                            />
                        </GridItem>

                        <GridItem label="Radio Group" fullWidth>
                            <Radio.Group value={radioValue} onChange={setRadioValue}>
                                <Group>
                                    <Radio size="compact" value="option1" label="Option 1" />
                                    <Radio size="compact" value="option2" label="Option 2" />
                                    <Radio size="compact" value="option3" label="Option 3" />
                                </Group>
                            </Radio.Group>
                        </GridItem>

                        <GridItem label="Slider" fullWidth>
                            <Slider
                                size="compact"
                                value={sliderValue}
                                onChange={setSliderValue}
                                min={0}
                                max={100}
                                label={(val) => `${val}%`}
                            />
                        </GridItem>

                        <GridItem label="Slider with marks" fullWidth>
                            <Slider
                                size="compact"
                                value={sliderValue}
                                onChange={setSliderValue}
                                min={0}
                                max={100}
                                marks={[
                                    { value: 0, label: "0%" },
                                    { value: 50, label: "50%" },
                                    { value: 100, label: "100%" },
                                ]}
                            />
                        </GridItem>
                    </Grid>
                </Section>

                {/* Button Components */}
                <Section title="Button Components">
                    <Grid>
                        <GridItem label="Button variants">
                            <Group gap="xs">
                                <Button size="compact">Default</Button>
                                <Button size="compact" variant="light">
                                    Light
                                </Button>
                                <Button size="compact" variant="outline">
                                    Outline
                                </Button>
                                <Button size="compact" variant="subtle">
                                    Subtle
                                </Button>
                            </Group>
                        </GridItem>

                        <GridItem label="Button with icon">
                            <Group gap="xs">
                                <Button size="compact" leftSection={<Plus size={12} />}>
                                    Add Item
                                </Button>
                                <Button size="compact" rightSection={<Settings size={12} />}>
                                    Settings
                                </Button>
                            </Group>
                        </GridItem>

                        <GridItem label="ActionIcon variants">
                            <Group gap="xs">
                                <ActionIcon size="compact" variant="filled" aria-label="Add item">
                                    <Plus size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="light" aria-label="Settings">
                                    <Settings size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="subtle" aria-label="Delete">
                                    <Trash size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" variant="outline" aria-label="Expand">
                                    <ChevronDown size={14} />
                                </ActionIcon>
                            </Group>
                        </GridItem>

                        <GridItem label="ActionIcon colors">
                            <Group gap="xs">
                                <ActionIcon size="compact" color="blue" aria-label="Add blue">
                                    <Plus size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" color="green" aria-label="Add green">
                                    <Plus size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" color="red" aria-label="Delete red">
                                    <Trash size={14} />
                                </ActionIcon>
                                <ActionIcon size="compact" color="gray" aria-label="Settings gray">
                                    <Settings size={14} />
                                </ActionIcon>
                            </Group>
                        </GridItem>
                    </Grid>
                </Section>

                {/* Display Components */}
                <Section title="Display Components">
                    <Grid>
                        <GridItem label="Badge variants">
                            <Group gap="xs">
                                <Badge size="compact">Default</Badge>
                                <Badge size="compact" variant="light">
                                    Light
                                </Badge>
                                <Badge size="compact" variant="outline">
                                    Outline
                                </Badge>
                                <Badge size="compact" variant="dot">
                                    Dot
                                </Badge>
                            </Group>
                        </GridItem>

                        <GridItem label="Badge colors">
                            <Group gap="xs">
                                <Badge size="compact" color="blue">
                                    Blue
                                </Badge>
                                <Badge size="compact" color="green">
                                    Green
                                </Badge>
                                <Badge size="compact" color="red">
                                    Red
                                </Badge>
                                <Badge size="compact" color="yellow">
                                    Yellow
                                </Badge>
                                <Badge size="compact" color="gray">
                                    Gray
                                </Badge>
                            </Group>
                        </GridItem>

                        <GridItem label="Pill">
                            <Group gap="xs">
                                <Pill size={"compact" as MantineSize}>Tag 1</Pill>
                                <Pill size={"compact" as MantineSize}>Tag 2</Pill>
                                <Pill size={"compact" as MantineSize} withRemoveButton>
                                    Removable
                                </Pill>
                            </Group>
                        </GridItem>

                        <GridItem label="Pill with remove">
                            <Group gap="xs">
                                <Pill size={"compact" as MantineSize} withRemoveButton>
                                    Node
                                </Pill>
                                <Pill size={"compact" as MantineSize} withRemoveButton>
                                    Edge
                                </Pill>
                                <Pill size={"compact" as MantineSize} withRemoveButton>
                                    Label
                                </Pill>
                            </Group>
                        </GridItem>
                    </Grid>
                </Section>

                {/* Real-world Example */}
                <Section title="Real-world Example: Properties Panel">
                    <Box
                        p="sm"
                        style={{
                            backgroundColor: "var(--mantine-color-default-hover)",
                            borderRadius: "var(--mantine-radius-sm)",
                        }}
                    >
                        <Text size="xs" fw={500} mb="sm">
                            Node Properties
                        </Text>

                        <Stack gap={8}>
                            <Box>
                                <Text size="xs" c="dimmed" mb={2}>
                                    Shape
                                </Text>
                                <Group gap={4} grow>
                                    <NativeSelect
                                        size="compact"
                                        data={[
                                            {
                                                group: "Basic",
                                                items: [
                                                    { value: "sphere", label: "Sphere" },
                                                    { value: "cube", label: "Cube" },
                                                ],
                                            },
                                            {
                                                group: "Advanced",
                                                items: [
                                                    { value: "torus", label: "Torus" },
                                                    { value: "cone", label: "Cone" },
                                                ],
                                            },
                                        ]}
                                        rightSection={<ChevronDown size={14} />}
                                    />
                                    <NumberInput
                                        size="compact"
                                        value={1.0}
                                        min={0.1}
                                        max={10}
                                        step={0.1}
                                        decimalScale={1}
                                        hideControls
                                    />
                                </Group>
                            </Box>

                            <Divider color="dark.5" />

                            <Box>
                                <Text size="xs" c="dimmed" mb={2}>
                                    Color Mode
                                </Text>
                                <SegmentedControl
                                    size="compact"
                                    data={[
                                        { value: "solid", label: "Solid" },
                                        { value: "gradient", label: "Gradient" },
                                        { value: "radial", label: "Radial" },
                                    ]}
                                    fullWidth
                                />
                            </Box>

                            <Box>
                                <Text size="xs" c="dimmed" mb={2}>
                                    Color
                                </Text>
                                <Group gap={8}>
                                    <ColorInput size="compact" value="#5b8ff9" style={{ flex: 1 }} />
                                    <NumberInput
                                        size="compact"
                                        value={100}
                                        min={0}
                                        max={100}
                                        hideControls
                                        suffix="%"
                                        w={60}
                                    />
                                </Group>
                            </Box>

                            <Divider color="dark.5" />

                            <Box>
                                <Text size="xs" c="dimmed" mb={2}>
                                    Visibility
                                </Text>
                                <Group gap="md">
                                    <Checkbox size="compact" label="Visible" defaultChecked />
                                    <Checkbox size="compact" label="Selectable" defaultChecked />
                                </Group>
                            </Box>

                            <Box>
                                <Text size="xs" c="dimmed" mb={2}>
                                    Opacity
                                </Text>
                                <Slider size="compact" value={100} min={0} max={100} label={(val) => `${val}%`} />
                            </Box>

                            <Divider color="dark.5" />

                            <Group gap="xs" justify="flex-end">
                                <Button size="compact" variant="subtle">
                                    Reset
                                </Button>
                                <Button size="compact">Apply</Button>
                            </Group>
                        </Stack>
                    </Box>
                </Section>

                {/* Component Specs */}
                <Section title="Compact Size Specifications">
                    <Box
                        p="sm"
                        style={{
                            backgroundColor: "var(--mantine-color-default)",
                            borderRadius: "var(--mantine-radius-sm)",
                            fontFamily: "monospace",
                            fontSize: "12px",
                        }}
                    >
                        <Text c="dimmed" component="pre" style={{ margin: 0 }}>
                            {`/* Input Components */
--input-size: 24px;
--input-fz: 11px;
--input-padding-x: 8px;

/* SegmentedControl */
--sc-font-size: 10px;
--sc-padding: 4px 8px;

/* Checkbox */
--checkbox-size: 16px;

/* Switch */
--switch-height: 16px;
--switch-width: 28px;
--switch-thumb-size: 12px;

/* Slider */
--slider-size: 4px;
--slider-thumb-size: 12px;

/* Button */
--button-height: 24px;
--button-fz: 11px;
--button-padding-x: 8px;

/* ActionIcon */
--ai-size: 24px;

/* Badge */
--badge-height: 14px;
--badge-fz: 9px;

/* Pill */
--pill-height: 16px;
--pill-fz: 10px;`}
                        </Text>
                    </Box>
                </Section>
            </Box>
        </Box>
    );
}

// Helper Components

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Box mb="xl">
            <Title order={3} size="h4" mb="md">
                {title}
            </Title>
            {children}
        </Box>
    );
}

function Grid({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <Box
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
            }}
        >
            {children}
        </Box>
    );
}

function GridItem({
    label,
    children,
    fullWidth = false,
}: {
    label: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}): React.JSX.Element {
    return (
        <Box style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
            <Text size="xs" c="dimmed" mb={4}>
                {label}
            </Text>
            {children}
        </Box>
    );
}
