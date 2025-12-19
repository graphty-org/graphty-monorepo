import {ActionIcon, ColorPicker, ColorSwatch, Group, Popover, Stack, Text, TextInput} from "@mantine/core";
import {X} from "lucide-react";
import React, {useEffect, useState} from "react";

export interface StyleColorInputProps {
    /** Label for the input */
    label: string;
    /** Current value - undefined means using default */
    value: string | undefined;
    /** Default value to show when value is undefined */
    defaultValue: string;
    /** Called when value changes */
    onChange: (value: string | undefined) => void;
}

/**
 * A color input that distinguishes between default and explicit values.
 *
 * Features:
 * - Shows muted styling when using default value (value is undefined)
 * - Shows normal styling when an explicit value is set
 * - Shows a reset button (×) only when an explicit value is set
 * - Clicking reset calls onChange(undefined) to revert to default
 */
export function StyleColorInput({
    label,
    value,
    defaultValue,
    onChange,
}: StyleColorInputProps): React.JSX.Element {
    const isDefault = value === undefined;
    const displayValue = value ?? defaultValue;

    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [localHex, setLocalHex] = useState(displayValue.replace("#", "").toUpperCase());

    // Sync local state when prop changes
    useEffect(() => {
        setLocalHex((value ?? defaultValue).replace("#", "").toUpperCase());
    }, [value, defaultValue]);

    const handleColorPickerChange = (hexColor: string): void => {
        const hex = hexColor.slice(0, 7).toUpperCase();
        onChange(hex);
    };

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setLocalHex(e.currentTarget.value.toUpperCase());
    };

    const handleHexInputBlur = (): void => {
        let hex = localHex.toUpperCase();
        if (hex && !hex.startsWith("#")) {
            hex = `#${hex}`;
        }

        // Only commit if valid hex and different from current value
        if (/^#[0-9A-F]{6}$/i.test(hex) && hex !== displayValue) {
            onChange(hex);
        } else {
            // Reset to current value if invalid
            setLocalHex(displayValue.replace("#", "").toUpperCase());
        }
    };

    const handleReset = (): void => {
        onChange(undefined);
    };

    return (
        <Stack gap={0}>
            {label && (
                <Text size="xs" c="dimmed" mb={1} lh={1.2}>{label}</Text>
            )}
            <Group gap={4} wrap="nowrap">
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
                                aria-label="Color swatch"
                            >
                                <ColorSwatch
                                    color={displayValue}
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
                                format="hex"
                                value={displayValue}
                                onChange={handleColorPickerChange}
                                swatches={[
                                    "#5B8FF9",
                                    "#FF6B6B",
                                    "#61D095",
                                    "#F7B731",
                                    "#9B59B6",
                                    "#FFFFFF",
                                    "#CCCCCC",
                                    "#000000",
                                ]}
                            />
                        </Popover.Dropdown>
                    </Popover>

                    {/* Hex input */}
                    <TextInput
                        size="compact"
                        value={localHex}
                        onChange={handleHexInputChange}
                        onBlur={handleHexInputBlur}
                        aria-label="Color hex value"
                        data-is-default={isDefault ? "true" : "false"}
                        w={72}
                        styles={{
                            input: {
                                borderRadius: "0 4px 4px 0",
                                fontFamily: "monospace",
                                textTransform: "uppercase",
                                ... (isDefault ? {
                                    fontStyle: "italic",
                                    color: "var(--mantine-color-dimmed)",
                                } : {}),
                            },
                        }}
                    />
                </Group>

                {!isDefault && (
                    <ActionIcon
                        variant="subtle"
                        size="xs"
                        c="dimmed"
                        aria-label={`Reset ${label} to default`}
                        onClick={handleReset}
                    >
                        <X size={12} />
                    </ActionIcon>
                )}
            </Group>
        </Stack>
    );
}
