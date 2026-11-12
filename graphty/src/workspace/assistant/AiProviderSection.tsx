import "./assistant.css";

import { Popout, PopoutManager } from "@graphty/compact-mantine";
import {
    AI_PROVIDER_DESCRIPTORS,
    type AiProviderDescriptor,
    type AiProviderId,
    checkApiKeyShape,
} from "@graphty/graphty-element/catalog";
import {
    ActionIcon,
    Alert,
    Anchor,
    Button,
    Checkbox,
    Group,
    Input,
    PasswordInput,
    Select,
    Stack,
    Text,
} from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import type { PageCommit } from "../assistant-door/AssistantPlace";
import { goToComposer } from "../assistant-door/commands";
import {
    type AssistantChoice,
    type EffortLevel,
    effortLevels,
    effortOf,
    providerDescriptor,
    useAssistantChoice,
    writeAssistantChoice,
} from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { link, linked, unlink } from "./connection";
import { PROVIDER_PAGES } from "./providerPages";
import { effortRows, endWords, keyHelpWords, keyShapeWords, providerWords, WORDS } from "./words";

/** What a reader can pick: the test stand-in and the in-browser model, not drawn until it works, stay out. */
const PROVIDERS = AI_PROVIDER_DESCRIPTORS.filter((entry) => !entry.testOnly && entry.id !== "webllm");
/** Where the Provider field starts. */
const FIRST_PROVIDER: AiProviderId = "google";
/**
 * The app's own pick where it differs from the element's default model: GPT-5.4 mini answered the
 * assistant's walk right where GPT-4o did not, and as fast. Claude Haiku 5.5 colored just the
 * largest community where Haiku 4.5 colored them all in two walks of three. The older models stay
 * in the list.
 */
const APP_MODELS: Partial<Record<AiProviderId, string>> = { openai: "gpt-5.4-mini", anthropic: "claude-haiku-5-5" };

/**
 * The model the Model field starts at for a provider.
 * @param provider - the provider.
 * @returns the model id.
 */
function startingModel(provider: AiProviderDescriptor): string {
    return APP_MODELS[provider.id] ?? provider.defaultModel;
}

/**
 * The models a provider offers that can use the assistant's tools.
 * @param provider - the provider.
 * @returns the select's rows.
 */
function modelRows(provider: AiProviderDescriptor): readonly { value: string; label: string }[] {
    return provider.models
        .filter((model) => model.supportsTools)
        .map((model) => ({ value: model.id, label: model.plainName }));
}

/**
 * The key field's (?) button: a click popover with the steps to make a key and the key page's link.
 * A click, not a hover, so touch and the keyboard open it; Escape closes it.
 * @param props - Component props
 * @param props.id - the provider's id
 * @param props.provider - the provider's name
 * @param props.page - its key page
 * @param props.onOpenChange - called as it opens or closes
 * @returns The button, or nothing for a provider with no help
 */
function KeyHelp({
    id,
    provider,
    page,
    onOpenChange,
}: Readonly<{
    id: string;
    provider: string;
    page: string;
    onOpenChange?: (open: boolean) => void;
}>): React.JSX.Element | null {
    const help = keyHelpWords(id, provider);
    // Gone while open (another provider picked), it no longer holds Esc for itself.
    useEffect(
        () => () => {
            onOpenChange?.(false);
        },
        [onOpenChange],
    );
    if (help === null) {
        return null;
    }
    return (
        // Its own floating layer, as each pop-out place in the app has.
        <PopoutManager>
            <Popout onOpenChange={onOpenChange}>
                <Popout.Trigger>
                    <ActionIcon variant="subtle" color="gray" size="xs" aria-label={help.name}>
                        <GLYPHS.unknown size={12} aria-hidden />
                    </ActionIcon>
                </Popout.Trigger>
                <Popout.Panel
                    width={260}
                    placement="bottom"
                    alignment="start"
                    header={{ variant: "title", title: help.name }}
                    closeLabel={WORDS["assistant.close"]}
                >
                    <Popout.Content>
                        <Stack gap={6}>
                            <ol className="ws-assistant-key-steps">
                                {help.steps.map((step) => (
                                    <li key={step}>
                                        <Text size="xs">{step}</Text>
                                    </li>
                                ))}
                            </ol>
                            <Text size="xs" c="dimmed">
                                {help.note}
                            </Text>
                            <Anchor href={page} target="_blank" rel="noreferrer" size="xs">
                                {WORDS["assistant.key-help.open"]}
                            </Anchor>
                        </Stack>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </PopoutManager>
    );
}

/**
 * Settings' AI provider section (design 4.2): the capability's one home. The element keeps the key.
 * @param props - Component props
 * @param props.onSaved - called as Save closes Settings
 * @param props.commit - set to what Settings' Done runs: Save, when the page holds something unsaved
 * @param props.onPopoutOpen - called as the key help opens or closes
 * @returns The section
 */
export default function AiProviderSection({
    onSaved,
    commit,
    onPopoutOpen,
}: Readonly<{ onSaved: () => void; commit?: PageCommit; onPopoutOpen?: (open: boolean) => void }>): React.JSX.Element {
    const { store, element } = useWorkspace();
    const links = useWorkspaceState((state) => state.assistantLinks);
    const saved = useAssistantChoice();
    const [provider, setProvider] = useState<AiProviderId>(
        PROVIDERS.find((entry) => entry.id === saved?.provider)?.id ?? FIRST_PROVIDER,
    );
    const descriptor = providerDescriptor(provider);
    const [model, setModel] = useState(
        saved?.provider === provider ? saved.model : startingModel(providerDescriptor(FIRST_PROVIDER)),
    );
    const [effort, setEffort] = useState<EffortLevel | undefined>(
        saved?.provider === provider && saved.model === model ? saved.effort : undefined,
    );
    const levels = effortLevels({ provider, model });
    const shownEffort = effortOf({ provider, model, effort });
    const [key, setKey] = useState("");
    const [remember, setRemember] = useState(saved?.remember ?? false);
    const [problem, setProblem] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const keyField = useRef<HTMLInputElement>(null);
    const keyFieldId = useId();
    // A run that ended out of credit on this provider warns here too, until the next run or a new key clears it.
    const ended = useWorkspaceState((state) => state.assistantEnded);
    const saveButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (element !== null && saved !== null) {
            void linked(element, store, saved).catch(() => undefined);
        }
    }, [element, store, saved]);
    useEffect(() => {
        setKeySaved(element?.getApiKeyManager()?.hasKey(provider) === true);
    }, [element, provider, links, saved]);
    const words = providerWords(descriptor.plainName);
    const keyPage = PROVIDER_PAGES[provider]?.key;
    const outOfCredit =
        ended?.code === "AI_PROVIDER_ERROR" && (ended.params.provider ?? saved?.provider) === provider
            ? endWords(ended.code, ended.params, provider, false)
            : null;
    const checkKey = (typed: string): string | null =>
        keyShapeWords(checkApiKeyShape(provider, typed), descriptor.plainName);

    const save = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        const typed = key.trim();
        const needsKey = descriptor.requiresKey && (typed !== "" || !keySaved);
        const line = needsKey ? checkKey(typed) : null;
        setProblem(line);
        if (line !== null) {
            keyField.current?.focus();
            return;
        }
        const choice: AssistantChoice = {
            provider,
            model,
            remember,
            ...(shownEffort === undefined ? {} : { effort: shownEffort }),
            ...(saved?.sendSpoken === undefined ? {} : { sendSpoken: saved.sendSpoken }),
        };
        try {
            await link(element, store, choice, typed === "" ? undefined : typed);
            writeAssistantChoice(choice);
        } catch {
            setProblem(endWords("AI_CONFIG_INVALID", {}, provider, false)?.line ?? null);
            keyField.current?.focus();
            return;
        }
        onSaved();
        store.set({ dialog: null, assistantEnded: null });
        goToComposer(store);
    };

    const unsaved =
        key.trim() !== "" ||
        (saved !== null &&
            (saved.provider !== provider ||
                saved.model !== model ||
                saved.remember !== remember ||
                effortOf(saved) !== shownEffort));
    useEffect(() => {
        if (commit === undefined) {
            return undefined;
        }
        commit.current = unsaved
            ? async () => {
                  await save();
                  return true;
              }
            : null;
        return () => {
            commit.current = null;
        };
    });

    const forget = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        unlink(element);
        await element.forgetAiKeys();
        writeAssistantChoice(null);
        store.set({ assistantEnded: null });
        setKey("");
        setKeySaved(false);
    };

    const deleteAll = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        await element.clearAiHistory();
        store.set({ assistantEnded: null });
        setConfirming(false);
    };

    return (
        <Stack gap="sm">
            <Select
                label={WORDS["assistant.provider.provider"]}
                size="xs"
                allowDeselect={false}
                value={provider}
                data={PROVIDERS.map((entry) => ({ value: entry.id, label: entry.plainName }))}
                onChange={(picked) => {
                    const next = PROVIDERS.find((entry) => entry.id === picked);
                    if (next !== undefined) {
                        setProvider(next.id);
                        setModel(startingModel(next));
                        setEffort(undefined);
                        setKey("");
                        setProblem(null);
                    }
                }}
            />
            <Select
                label={WORDS["assistant.provider.model"]}
                size="xs"
                allowDeselect={false}
                value={model}
                data={modelRows(descriptor)}
                onChange={(picked) => {
                    if (picked !== null) {
                        setModel(picked);
                        setEffort(undefined);
                    }
                }}
            />
            {levels.length > 0 ? (
                <Select
                    label={WORDS["assistant.provider.effort"]}
                    description={WORDS["assistant.effort.tooltip"]}
                    size="xs"
                    allowDeselect={false}
                    value={shownEffort ?? null}
                    data={effortRows(levels)}
                    onChange={(picked) => {
                        const next = levels.find((level) => level === picked);
                        if (next !== undefined) {
                            setEffort(next);
                        }
                    }}
                />
            ) : null}
            {outOfCredit?.billing === undefined ? null : (
                <Alert color="yellow" role="note" p="xs" icon={<GLYPHS.warning size={14} aria-hidden />}>
                    <Stack gap={4} align="flex-start">
                        <Text size="xs">{outOfCredit.line}</Text>
                        <Anchor href={outOfCredit.billing} target="_blank" rel="noreferrer" size="xs">
                            {WORDS["assistant.add-credit"]}
                        </Anchor>
                    </Stack>
                </Alert>
            )}
            <Stack gap={4}>
                {/* The label sits beside the (?) button, not around it, so the field's name stays "API key". */}
                <Group gap={2} wrap="nowrap">
                    <Input.Label htmlFor={keyFieldId} size="xs">
                        {WORDS["assistant.provider.key"]}
                    </Input.Label>
                    {keyPage === undefined || !descriptor.requiresKey ? null : (
                        <KeyHelp
                            id={provider}
                            provider={descriptor.plainName}
                            page={keyPage}
                            onOpenChange={onPopoutOpen}
                        />
                    )}
                </Group>
                <PasswordInput
                    ref={keyField}
                    id={keyFieldId}
                    visibilityToggleButtonProps={{ tabIndex: 0 }}
                    size="xs"
                    autoComplete="off"
                    placeholder={keySaved ? WORDS["assistant.provider.key-saved"] : undefined}
                    value={key}
                    error={problem}
                    onChange={(event) => {
                        setKey(event.currentTarget.value);
                        setProblem(null);
                    }}
                    onBlur={(event) => {
                        // Save checks the key itself: a line drawn on the way to Save moves Save from under the press.
                        if (key.trim() !== "" && event.relatedTarget !== saveButton.current) {
                            setProblem(checkKey(key.trim()));
                        }
                    }}
                />
                {keyPage === undefined ? null : (
                    <Anchor href={keyPage} target="_blank" rel="noreferrer" size="xs">
                        {words.link}
                    </Anchor>
                )}
            </Stack>
            <Checkbox
                label={WORDS["assistant.provider.remember"]}
                description={WORDS["assistant.provider.remember-note"]}
                checked={remember}
                onChange={(event) => {
                    setRemember(event.currentTarget.checked);
                }}
            />
            <Stack gap={4}>
                <Text size="xs">{words.disclosure}</Text>
                <Text size="xs">{WORDS["assistant.provider.history-note"]}</Text>
            </Stack>
            {confirming ? (
                <Group gap={6}>
                    <Text size="xs">{WORDS["assistant.provider.delete-all-confirm"]}</Text>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            void deleteAll();
                        }}
                    >
                        {WORDS["assistant.provider.delete-all-yes"]}
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            setConfirming(false);
                        }}
                    >
                        {WORDS["assistant.provider.delete-all-no"]}
                    </Button>
                </Group>
            ) : (
                <Group gap={6}>
                    <Button
                        ref={saveButton}
                        size="xs"
                        onClick={() => {
                            void save();
                        }}
                    >
                        {WORDS["assistant.provider.save"]}
                    </Button>
                    {keySaved ? (
                        <Button
                            size="xs"
                            variant="default"
                            onClick={() => {
                                void forget();
                            }}
                        >
                            {WORDS["assistant.provider.forget"]}
                        </Button>
                    ) : null}
                    <Button
                        size="xs"
                        variant="default"
                        onClick={() => {
                            setConfirming(true);
                        }}
                    >
                        {WORDS["assistant.provider.delete-all"]}
                    </Button>
                </Group>
            )}
        </Stack>
    );
}
