import "./settings.css";

import { ModalFooter, PageList, SegmentedControl } from "@graphty/compact-mantine";
import {
    Button,
    Input,
    type MantineColorScheme,
    Modal,
    Stack,
    Switch,
    Text,
    Title,
    useMantineColorScheme,
} from "@mantine/core";
import React, { useEffect, useState } from "react";

import { answerUsageData, useUsageAnswer } from "../privacy/usageData";
import { UsageDataText } from "../privacy/UsageDataText";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { NUMBER_FORMAT, readPreference, SINGLE_KEY_SHORTCUTS, writePreference } from "./preferences";

const SECTIONS = [
    { id: "general", name: "General" },
    { id: "privacy", name: "Privacy" },
    { id: "accessibility", name: "Accessibility and input" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * General: Theme (the app's chrome only) and Number format.
 * @returns The section
 */
function General(): React.JSX.Element {
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const [numberFormat, setNumberFormat] = useState(() => readPreference(NUMBER_FORMAT));
    return (
        <Stack gap="md">
            <Input.Wrapper label="Theme" description="The app's panels and menus.">
                <SegmentedControl
                    value={colorScheme}
                    onChange={(value) => {
                        setColorScheme(value as MantineColorScheme);
                    }}
                    data={[
                        { value: "auto", label: "System" },
                        { value: "light", label: "Light" },
                        { value: "dark", label: "Dark" },
                    ]}
                />
            </Input.Wrapper>
            <Input.Wrapper
                label="Number format"
                description="Used in the table, the inspector and legends. Exports keep plain numbers."
            >
                <SegmentedControl
                    value={numberFormat}
                    onChange={(value) => {
                        const next = NUMBER_FORMAT.values.find((v) => v === value) ?? NUMBER_FORMAT.fallback;
                        setNumberFormat(next);
                        writePreference(NUMBER_FORMAT, next);
                    }}
                    data={[
                        { value: "system", label: "System" },
                        { value: "period", label: "1,234.5" },
                        { value: "comma", label: "1.234,5" },
                        { value: "space", label: "1 234,5" },
                    ]}
                />
            </Input.Wrapper>
        </Stack>
    );
}

/**
 * Privacy: the usage data switch with the owner's words, and where the reader's data goes.
 * @returns The section
 */
function Privacy(): React.JSX.Element {
    const on = useUsageAnswer() === "share";
    return (
        <Stack gap="md">
            <Stack gap={6}>
                <Switch
                    label="Share usage data"
                    checked={on}
                    onChange={(event) => {
                        answerUsageData(event.currentTarget.checked ? "share" : "declined");
                    }}
                />
                <UsageDataText headline={false} />
            </Stack>
            <Stack gap={4}>
                <Text size="sm" fw={600}>
                    Where your data goes
                </Text>
                <Text size="xs">Files you open: read on this computer, never uploaded.</Text>
                <Text size="xs">Your project: saved where you save it.</Text>
                <Text size="xs">
                    {on
                        ? "Usage data: sent with content masked, only while Share usage data is on."
                        : "Usage data: off. Nothing is sent."}
                </Text>
            </Stack>
        </Stack>
    );
}

/**
 * Accessibility and input: Single-key shortcuts. Reduced motion is not drawn until
 * graphty-element honors it.
 * @returns The section
 */
function Accessibility(): React.JSX.Element {
    const { store } = useWorkspace();
    const singleKey = useWorkspaceState((state) => state.singleKeyShortcuts);
    return (
        <Switch
            label="Single-key shortcuts"
            description="Off, a shortcut that is one key with no Ctrl or Cmd does nothing, so speech input cannot set one off by accident."
            checked={singleKey}
            onChange={(event) => {
                const next = event.currentTarget.checked;
                store.set({ singleKeyShortcuts: next });
                writePreference(SINGLE_KEY_SHORTCUTS, next ? "on" : "off");
            }}
        />
    );
}

/**
 * Settings (tier1-design.md section 2.12): one dialog, a section list down the left, closed with
 * X or Esc. Open while the workspace dialog is "settings" (General) or "settings:<section>".
 * @returns The dialog
 */
export function SettingsDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const dialog = useWorkspaceState((state) => state.dialog);
    const opened = dialog === "settings" || (dialog?.startsWith("settings:") ?? false);
    const asked = dialog?.split(":")[1];
    const section: SectionId = SECTIONS.find((s) => s.id === asked)?.id ?? "general";
    const close = (): void => {
        store.set({ dialog: null });
    };

    // The single-key choice is the reader's, kept in this browser; the key map reads it from
    // the workspace state, which starts with it on.
    useEffect(() => {
        if (readPreference(SINGLE_KEY_SHORTCUTS) === "off") {
            store.set({ singleKeyShortcuts: false });
        }
    }, [store]);

    const title = SECTIONS.find((s) => s.id === section)?.name ?? "";
    return (
        <Modal opened={opened} onClose={close} title="Settings" size="xl">
            <div className="ws-settings">
                <PageList
                    label="Settings sections"
                    items={SECTIONS}
                    current={section}
                    onCurrentChange={(id) => {
                        store.set({ dialog: `settings:${id}` });
                    }}
                />
                <section className="ws-settings-body" aria-label={title}>
                    <Title order={2} size="sm" mb="sm">
                        {title}
                    </Title>
                    {section === "general" ? <General /> : null}
                    {section === "privacy" ? <Privacy /> : null}
                    {section === "accessibility" ? <Accessibility /> : null}
                </section>
            </div>
            <ModalFooter>
                <Button onClick={close}>Done</Button>
            </ModalFooter>
        </Modal>
    );
}
