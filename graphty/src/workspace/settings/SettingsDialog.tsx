import { ModalFooter, PageList, SegmentedControl } from "@graphty/compact-mantine";
import type { AccelerationStatus } from "@graphty/graphty-element/session";
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
import React, { useEffect, useRef, useState } from "react";

import { siteFileStyles } from "../../siteConfig";
import { AI_PROVIDER_SECTION, AiProviderPage, type PageCommit } from "../assistant-door/AssistantPlace";
import { assistantOn } from "../assistant-door/commands";
import { providerDisclosure } from "../assistant-door/provider";
import { fileStylesOn } from "../features";
import { useAccelerationStatus } from "../frame/useAccelerationStatus";
import { answerUsageData, useUsageAnswer } from "../privacy/usageData";
import { UsageDataText } from "../privacy/UsageDataText";
import { useAssistantSendsTo } from "../privacy/useAssistantSendsTo";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { setNumberFormat, useNumberFormats } from "./numberFormat";
import {
    ACCELERATION,
    fileStylesChoice,
    NUMBER_FORMAT,
    readPreference,
    SINGLE_KEY_SHORTCUTS,
    writeFileStylesChoice,
    writePreference,
} from "./preferences";

const SECTIONS = [
    { id: "general", name: "General" },
    { id: "privacy", name: "Privacy" },
    { id: "accessibility", name: "Accessibility and input" },
    { id: "performance", name: "Performance" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"] | typeof AI_PROVIDER_SECTION.id;

/**
 * General: Theme (the app's chrome only), Number format and Import styles from files.
 * @returns The section
 */
function General(): React.JSX.Element {
    const { colorScheme, setColorScheme } = useMantineColorScheme();
    const numberFormat = useNumberFormats().choice;
    const [importStyles, setImportStyles] = useState(() => fileStylesChoice() === "file");
    // The switch belongs to the element's file styles experiment; the stored preference is kept. The
    // start screen has no session yet, so there the site's feature list decides, as the element will.
    const { session } = useWorkspace();
    const styled = session ? fileStylesOn(session) : siteFileStyles();
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
                    }}
                    data={[
                        { value: "system", label: "System" },
                        { value: "period", label: "1,234.5" },
                        { value: "comma", label: "1.234,5" },
                        { value: "space", label: "1 234,5" },
                    ]}
                />
            </Input.Wrapper>
            {styled ? (
                <Switch
                    label="Import styles from files"
                    description="When a file gives its nodes and edges colors, sizes or shapes, draw them as style layers."
                    checked={importStyles}
                    onChange={(event) => {
                        const next = event.currentTarget.checked;
                        setImportStyles(next);
                        writeFileStylesChoice(next);
                    }}
                />
            ) : null}
        </Stack>
    );
}

/**
 * Privacy: the usage data switch with the owner's words, and where the reader's data goes. With
 * the assistant experiment on and a provider saved, the provider is named and no line says otherwise.
 * @returns The section
 */
function Privacy(): React.JSX.Element {
    const on = useUsageAnswer() === "share";
    const sendsTo = useAssistantSendsTo();
    const usageOff = sendsTo === null ? "Usage data: off. Nothing is sent." : "Usage data: off.";
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
                <UsageDataText headline={false} assistantSends={sendsTo !== null} />
            </Stack>
            <Stack gap={4}>
                <Text size="sm" fw={600}>
                    Where your data goes
                </Text>
                <Text size="xs">
                    {sendsTo === null
                        ? "Files you open: read on this computer, never uploaded."
                        : "Files you open: read on this computer. Only what the assistant reads from them is sent."}
                </Text>
                {sendsTo === null ? null : <Text size="xs">Assistant: {providerDisclosure(sendsTo)}</Text>}
                <Text size="xs">Your project: saved where you save it.</Text>
                <Text size="xs">
                    {on ? "Usage data: sent with content masked, only while Share usage data is on." : usageOff}
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
 * The words for where acceleration stands, from the document graphty-element publishes.
 * @param status - the element's acceleration status, or null before it has come up.
 * @returns one line for the reader.
 */
function accelerationLine(status: AccelerationStatus | null): string {
    if (status === null || status.state === "probing") {
        return "Now: looking for a GPU...";
    }
    if (status.state === "active" || status.state === "idle") {
        const hardware = [status.vendor, status.architecture].filter((part) => part !== undefined).join(" ");
        return hardware === "" ? "Now: on" : `Now: on (${hardware})`;
    }
    if (status.state === "off") {
        return "Now: off";
    }
    return `Now: off. ${status.reason ?? "No GPU is available."}`;
}

/**
 * Performance: the GPU acceleration policy, written on the element and kept in this browser,
 * and where acceleration stands now, as the element reports it.
 * @returns The section
 */
function Performance(): React.JSX.Element {
    const { element } = useWorkspace();
    const [policy, setPolicy] = useState(() => readPreference(ACCELERATION));
    const status = useAccelerationStatus();
    return (
        <Input.Wrapper
            label="GPU acceleration"
            description="Automatic uses the GPU when this browser has one and the CPU otherwise. Required refuses to run without one."
        >
            <SegmentedControl
                value={policy}
                onChange={(value) => {
                    const next = ACCELERATION.values.find((v) => v === value) ?? ACCELERATION.fallback;
                    setPolicy(next);
                    writePreference(ACCELERATION, next);
                    if (element !== null) {
                        element.acceleration = next;
                    }
                }}
                data={[
                    { value: "auto", label: "Automatic" },
                    { value: "off", label: "Off" },
                    { value: "required", label: "Required" },
                ]}
            />
            <Text size="xs" mt={6}>
                {accelerationLine(status)}
            </Text>
        </Input.Wrapper>
    );
}

/**
 * Settings (tier1-design.md section 2.12): one dialog, a section list down the left, closed with
 * X or Esc. Open while the workspace dialog is "settings" (General) or "settings:<section>".
 * @returns The dialog
 */
export function SettingsDialog(): React.JSX.Element {
    const { store, element } = useWorkspace();
    const dialog = useWorkspaceState((state) => state.dialog);
    const opened = dialog === "settings" || (dialog?.startsWith("settings:") ?? false);
    const asked = dialog?.split(":")[1];
    const sections = assistantOn(element) === true ? [...SECTIONS, AI_PROVIDER_SECTION] : SECTIONS;
    const section: SectionId = sections.find((s) => s.id === asked)?.id ?? "general";
    const close = (): void => {
        store.set({ dialog: null });
    };
    // Done commits what the open page holds, as its own Save does; X and Esc cancel.
    const commit: PageCommit = useRef(null);
    const done = async (): Promise<void> => {
        const taken = section === AI_PROVIDER_SECTION.id && (await commit.current?.()) === true;
        if (!taken) {
            close();
        }
    };
    // Mantine's modal sees Escape before anything inside it: a pop-out on a page closes alone.
    const [popoutOpen, setPopoutOpen] = useState(false);
    // Saving a provider sends focus to the composer, not back to what opened Settings.
    const [toComposer, setToComposer] = useState(false);
    useEffect(() => {
        if (opened) {
            setToComposer(false);
        }
    }, [opened]);

    // The single-key choice is the reader's, kept in this browser; the key map reads it from
    // the workspace state, which starts with it on.
    useEffect(() => {
        if (readPreference(SINGLE_KEY_SHORTCUTS) === "off") {
            store.set({ singleKeyShortcuts: false });
        }
    }, [store]);

    // Opened from the start page (no project open), it takes the page's look: start.css.
    const onStart = useWorkspaceState((state) => state.project === null);
    const title = sections.find((s) => s.id === section)?.name ?? "";
    return (
        <Modal
            opened={opened}
            onClose={close}
            closeOnEscape={!popoutOpen}
            title="Settings"
            size="lg"
            returnFocus={!toComposer}
            withOverlay={onStart ? true : undefined}
            overlayProps={onStart ? { color: "#0a0c12", backgroundOpacity: 0.45 } : undefined}
            radius={onStart ? 16 : undefined}
            classNames={onStart ? { content: "ws-land-settings" } : undefined}
        >
            <div className="ws-dialog-columns">
                <PageList
                    label="Settings sections"
                    items={sections}
                    current={section}
                    onCurrentChange={(id) => {
                        store.set({ dialog: `settings:${id}` });
                    }}
                />
                <section className="ws-dialog-page" aria-label={title}>
                    <Title order={2} size="sm" mb="sm">
                        {title}
                    </Title>
                    {section === "general" ? <General /> : null}
                    {section === "privacy" ? <Privacy /> : null}
                    {section === "accessibility" ? <Accessibility /> : null}
                    {section === "performance" ? <Performance /> : null}
                    {section === AI_PROVIDER_SECTION.id ? (
                        <AiProviderPage
                            onSaved={() => {
                                setToComposer(true);
                            }}
                            commit={commit}
                            onPopoutOpen={setPopoutOpen}
                        />
                    ) : null}
                </section>
            </div>
            <ModalFooter>
                <Button
                    className={onStart ? "ws-land-settings-done" : undefined}
                    onClick={() => {
                        void done();
                    }}
                >
                    Done
                </Button>
            </ModalFooter>
        </Modal>
    );
}
