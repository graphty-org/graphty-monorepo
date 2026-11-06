import {
    AI_PROVIDER_DESCRIPTORS,
    type AiProviderDescriptor,
    type AiProviderId,
    checkApiKeyShape,
} from "@graphty/graphty-element/catalog";
import { Anchor, Button, Checkbox, Group, PasswordInput, Select, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import type { PageCommit } from "../assistant-door/AssistantPlace";
import { goToComposer } from "../assistant-door/commands";
import {
    type AssistantChoice,
    providerDescriptor,
    useAssistantChoice,
    writeAssistantChoice,
} from "../assistant-door/provider";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { link, linked, unlink } from "./connection";
import { endWords, KEY_PAGES, keyShapeWords, providerWords, WORDS } from "./words";

/** What a reader can pick: the test stand-in and the in-browser model, not drawn until it works, stay out. */
const PROVIDERS = AI_PROVIDER_DESCRIPTORS.filter((entry) => !entry.testOnly && entry.id !== "webllm");
/** Where the Provider field starts. */
const FIRST_PROVIDER: AiProviderId = "google";

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
 * Settings' AI provider section (design 4.2): the capability's one home. The element keeps the key.
 * @param props - Component props
 * @param props.onSaved - called as Save closes Settings
 * @param props.commit - set to what Settings' Done runs: Save, when the page holds something unsaved
 * @returns The section
 */
export default function AiProviderSection({
    onSaved,
    commit,
}: Readonly<{ onSaved: () => void; commit?: PageCommit }>): React.JSX.Element {
    const { store, element } = useWorkspace();
    const links = useWorkspaceState((state) => state.assistantLinks);
    const saved = useAssistantChoice();
    const [provider, setProvider] = useState<AiProviderId>(
        PROVIDERS.find((entry) => entry.id === saved?.provider)?.id ?? FIRST_PROVIDER,
    );
    const descriptor = providerDescriptor(provider);
    const [model, setModel] = useState(
        saved?.provider === provider ? saved.model : providerDescriptor(FIRST_PROVIDER).defaultModel,
    );
    const [key, setKey] = useState("");
    const [remember, setRemember] = useState(saved?.remember ?? false);
    const [problem, setProblem] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const keyField = useRef<HTMLInputElement>(null);
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
    const keyPage = KEY_PAGES[provider];
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
        const choice: AssistantChoice = { provider, model, remember };
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
        (saved !== null && (saved.provider !== provider || saved.model !== model || saved.remember !== remember));
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
                        setModel(next.defaultModel);
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
                    }
                }}
            />
            <Stack gap={4}>
                <PasswordInput
                    ref={keyField}
                    visibilityToggleButtonProps={{ tabIndex: 0 }}
                    label={WORDS["assistant.provider.key"]}
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
