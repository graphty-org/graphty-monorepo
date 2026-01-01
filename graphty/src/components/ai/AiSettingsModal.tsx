import { Alert, Button, Checkbox, Group, Modal, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { AlertTriangle, CheckCircle, Download, Key, Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCreateProvider, type ProviderType } from "../../types/ai";
import { standardModalStyles } from "../../utils/modal-styles";

interface ProviderConfig {
    type: ProviderType;
    name: string;
    placeholder: string;
    requiresKey: boolean;
}

const PROVIDERS: ProviderConfig[] = [
    { type: "openai", name: "OpenAI", placeholder: "sk-...", requiresKey: true },
    { type: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", requiresKey: true },
    { type: "google", name: "Google", placeholder: "AI...", requiresKey: true },
    { type: "webllm", name: "Local (WebLLM)", placeholder: "", requiresKey: false },
];

// WebLLM model options with sizes
interface WebLLMModel {
    id: string;
    name: string;
    size: string;
    description: string;
}

const WEBLLM_MODELS: WebLLMModel[] = [
    {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        name: "Llama 3.2 1B",
        size: "~700 MB",
        description: "Smallest, fastest",
    },
    { id: "Llama-3.2-3B-Instruct-q4f32_1-MLC", name: "Llama 3.2 3B", size: "~1.8 GB", description: "Good balance" },
    {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
        name: "Phi 3.5 Mini",
        size: "~2 GB",
        description: "Microsoft's compact model",
    },
    { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 2B", size: "~1.4 GB", description: "Google's efficient model" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B", size: "~1 GB", description: "Alibaba's model" },
];

interface AiSettingsModalProps {
    opened: boolean;
    onClose: () => void;
    /** Get the current API key for a provider */
    getKey: (provider: ProviderType) => string | undefined;
    /** Set the API key for a provider */
    setKey: (provider: ProviderType, key: string) => void;
    /** Remove the API key for a provider */
    removeKey: (provider: ProviderType) => void;
    /** Check if a provider has a key configured */
    hasKey: (provider: ProviderType) => boolean;
    /** List of configured providers */
    configuredProviders: ProviderType[];
    /** Current default provider */
    defaultProvider: ProviderType | null;
    /** Set the default provider */
    onDefaultProviderChange: (provider: ProviderType | null) => void;
    /** Whether persistence is enabled */
    isPersistenceEnabled: boolean;
    /** Enable persistence with an optional encryption key */
    onEnablePersistence: (encryptionKey?: string) => void;
    /** Disable persistence */
    onDisablePersistence: (clearStorage?: boolean) => void;
}

type TestStatus = "idle" | "testing" | "success" | "error";

interface ProviderState {
    key: string;
    testStatus: TestStatus;
    testMessage: string;
}

/**
 * Modal for configuring AI provider settings and API keys.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Close the modal
 * @param root0.getKey - Get the current API key for a provider
 * @param root0.setKey - Set the API key for a provider
 * @param root0.removeKey - Remove the API key for a provider
 * @param root0.hasKey - Check if a provider has a key configured
 * @param root0.configuredProviders - List of configured providers
 * @param root0.defaultProvider - Current default provider
 * @param root0.onDefaultProviderChange - Set the default provider
 * @param root0.isPersistenceEnabled - Whether persistence is enabled
 * @param root0.onEnablePersistence - Enable persistence with an optional encryption key
 * @param root0.onDisablePersistence - Disable persistence
 * @returns The AI settings modal component
 */
export function AiSettingsModal({
    opened,
    onClose,
    getKey,
    setKey,
    removeKey,
    hasKey,
    configuredProviders,
    defaultProvider,
    onDefaultProviderChange,
    isPersistenceEnabled,
    onEnablePersistence,
    onDisablePersistence,
}: AiSettingsModalProps): React.JSX.Element {
    // Local state for each provider's key input
    // Using Partial to make explicit that values might not exist
    const [providerStates, setProviderStates] = useState<Partial<Record<string, ProviderState>>>({});
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>("openai");
    const [persistenceEnabled, setPersistenceEnabled] = useState(isPersistenceEnabled);
    const [encryptionKey, setEncryptionKey] = useState("");
    const [webllmModel, setWebllmModel] = useState<string>(WEBLLM_MODELS[0].id);

    // Check if current provider requires API key (for showing persistence options)
    const currentProviderConfig = PROVIDERS.find((p) => p.type === selectedProvider);
    const showPersistenceOptions = currentProviderConfig?.requiresKey ?? false;

    // Initialize provider states from stored keys when modal opens
    useEffect(() => {
        if (opened) {
            const states: Record<string, ProviderState> = {};
            for (const provider of PROVIDERS) {
                const storedKey = getKey(provider.type);
                states[provider.type] = {
                    key: storedKey ?? "",
                    testStatus: storedKey ? "success" : "idle",
                    testMessage: storedKey ? "Key configured" : "",
                };
            }
            setProviderStates(states);
            setPersistenceEnabled(isPersistenceEnabled);
        }
    }, [opened, getKey, isPersistenceEnabled]);

    const updateProviderState = useCallback((provider: ProviderType, updates: Partial<ProviderState>) => {
        setProviderStates((prev) => {
            const currentState = prev[provider] ?? { key: "", testStatus: "idle" as const, testMessage: "" };
            return {
                ...prev,
                [provider]: { ...currentState, ...updates },
            };
        });
    }, []);

    // Cache the createProvider function once loaded
    const createProviderRef = useRef<Awaited<ReturnType<typeof getCreateProvider>> | null>(null);

    const handleTestConnection = useCallback(
        async (provider: ProviderType) => {
            const state = providerStates[provider];
            if (!state?.key && provider !== "webllm") {
                return;
            }

            updateProviderState(provider, { testStatus: "testing", testMessage: "Testing connection..." });

            try {
                // Load createProvider if not already loaded
                createProviderRef.current ??= await getCreateProvider();

                const createProvider = createProviderRef.current;

                // Create a provider instance and validate
                const providerInstance = createProvider({
                    provider,
                    apiKey: state?.key,
                });

                const isValid = await providerInstance.validateApiKey();

                if (isValid) {
                    updateProviderState(provider, { testStatus: "success", testMessage: "Connection successful" });
                } else {
                    updateProviderState(provider, { testStatus: "error", testMessage: "Invalid API key" });
                }
            } catch (err) {
                // If the graphty-element AI module fails to load, fall back to format validation
                console.warn("[AiSettingsModal] Provider validation failed, falling back to format check:", err);

                const { key } = state ?? { key: "" };
                let isValid = false;
                let errorMessage = "Invalid API key format";

                switch (provider) {
                    case "openai":
                        isValid = key.startsWith("sk-") && key.length > 20;
                        if (!isValid) {
                            errorMessage = "OpenAI keys should start with 'sk-'";
                        }

                        break;
                    case "anthropic":
                        isValid = key.startsWith("sk-ant-") && key.length > 20;
                        if (!isValid) {
                            errorMessage = "Anthropic keys should start with 'sk-ant-'";
                        }

                        break;
                    case "google":
                        isValid = key.length > 10;
                        if (!isValid) {
                            errorMessage = "Google API key appears too short";
                        }

                        break;
                    case "webllm":
                        isValid = true; // No key required
                        break;
                    default:
                        isValid = key.length > 0;
                }

                if (isValid) {
                    updateProviderState(provider, {
                        testStatus: "success",
                        testMessage: "Key format valid (could not verify with API)",
                    });
                } else {
                    updateProviderState(provider, { testStatus: "error", testMessage: errorMessage });
                }
            }
        },
        [providerStates, updateProviderState],
    );

    const handleSave = useCallback(() => {
        // Handle persistence changes
        if (persistenceEnabled && !isPersistenceEnabled) {
            // Enable persistence - password is optional (uses default if empty)
            onEnablePersistence(encryptionKey || undefined);
        } else if (!persistenceEnabled && isPersistenceEnabled) {
            onDisablePersistence(false);
        }

        // Save all provider keys
        for (const provider of PROVIDERS) {
            const state = providerStates[provider.type];
            if (state) {
                if (state.key) {
                    setKey(provider.type, state.key);
                } else if (hasKey(provider.type)) {
                    removeKey(provider.type);
                }
            }
        }

        onClose();
    }, [
        persistenceEnabled,
        isPersistenceEnabled,
        encryptionKey,
        onEnablePersistence,
        onDisablePersistence,
        providerStates,
        setKey,
        hasKey,
        removeKey,
        onClose,
    ]);

    const handleClearKey = useCallback(
        (provider: ProviderType) => {
            updateProviderState(provider, { key: "", testStatus: "idle", testMessage: "" });
        },
        [updateProviderState],
    );

    const renderProviderTab = (provider: ProviderConfig): React.JSX.Element => {
        const state = providerStates[provider.type] ?? { key: "", testStatus: "idle", testMessage: "" };

        return (
            <Stack gap="md">
                {provider.requiresKey ? (
                    <>
                        <PasswordInput
                            label="API Key"
                            placeholder={provider.placeholder}
                            value={state.key}
                            onChange={(e) => {
                                updateProviderState(provider.type, {
                                    key: e.currentTarget.value,
                                    testStatus: "idle",
                                    testMessage: "",
                                });
                            }}
                            leftSection={<Key size={16} />}
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                        />

                        <Group gap="sm">
                            <Button
                                variant="light"
                                onClick={() => void handleTestConnection(provider.type)}
                                disabled={!state.key || state.testStatus === "testing"}
                                leftSection={
                                    state.testStatus === "testing" ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : null
                                }
                            >
                                Test Connection
                            </Button>
                            {state.key && (
                                <Button
                                    variant="subtle"
                                    color="red"
                                    onClick={() => {
                                        handleClearKey(provider.type);
                                    }}
                                    leftSection={<Trash2 size={14} />}
                                >
                                    Clear
                                </Button>
                            )}
                        </Group>

                        {state.testStatus === "success" && (
                            <Alert icon={<CheckCircle size={16} />} color="green" variant="light">
                                {state.testMessage}
                            </Alert>
                        )}

                        {state.testStatus === "error" && (
                            <Alert icon={<AlertTriangle size={16} />} color="red" variant="light">
                                {state.testMessage}
                            </Alert>
                        )}
                    </>
                ) : (
                    <Stack gap="md">
                        <Alert icon={<CheckCircle size={16} />} color="blue" variant="light">
                            {provider.name} runs locally in your browser using WebGPU. No API key required.
                        </Alert>

                        <Select
                            label="Model"
                            description="Choose a model to download and run locally"
                            data={WEBLLM_MODELS.map((m) => ({
                                value: m.id,
                                label: `${m.name} (${m.size})`,
                            }))}
                            value={webllmModel}
                            onChange={(v) => {
                                if (v) {
                                    setWebllmModel(v);
                                }
                            }}
                        />

                        {webllmModel && (
                            <Alert icon={<Download size={16} />} color="yellow" variant="light">
                                <Text size="sm" fw={500}>
                                    Download Required
                                </Text>
                                <Text size="xs" c="dimmed">
                                    The selected model (
                                    {WEBLLM_MODELS.find((m) => m.id === webllmModel)?.size ?? "unknown size"}) will be
                                    downloaded to your browser cache when first used. This may take several minutes
                                    depending on your connection speed.
                                </Text>
                            </Alert>
                        )}
                    </Stack>
                )}
            </Stack>
        );
    };

    const defaultProviderOptions = configuredProviders
        .filter((p) => Boolean(providerStates[p]?.key) || hasKey(p))
        .map((p) => {
            const config = PROVIDERS.find((pc) => pc.type === p);
            return { value: p, label: config?.name ?? p };
        });

    // Also include providers with keys in local state
    for (const provider of PROVIDERS) {
        const state = providerStates[provider.type];
        if (state?.key && !defaultProviderOptions.some((o) => o.value === provider.type)) {
            defaultProviderOptions.push({ value: provider.type, label: provider.name });
        }
    }

    // Get the current provider config
    const activeProvider = PROVIDERS.find((p) => p.type === selectedProvider);

    return (
        <Modal opened={opened} onClose={onClose} title="AI Settings" size="lg" centered styles={standardModalStyles}>
            <Stack gap="lg">
                {/* Provider selection dropdown */}
                <Select
                    label="AI Provider"
                    description="Select the AI service to configure"
                    data={PROVIDERS.map((provider) => ({
                        value: provider.type,
                        label: provider.name,
                    }))}
                    value={selectedProvider}
                    onChange={(v) => {
                        if (v) {
                            setSelectedProvider(v as ProviderType);
                        }
                    }}
                    rightSection={
                        hasKey(selectedProvider) || providerStates[selectedProvider]?.key ? (
                            <CheckCircle size={14} color="var(--mantine-color-green-6)" />
                        ) : null
                    }
                />

                {/* Provider-specific settings */}
                {activeProvider && renderProviderTab(activeProvider)}

                {/* Default provider selection - only show if multiple providers configured */}
                {defaultProviderOptions.length > 1 && (
                    <Select
                        label="Default Provider"
                        description="Used when opening the AI assistant"
                        data={defaultProviderOptions}
                        value={defaultProvider}
                        onChange={(v) => {
                            onDefaultProviderChange(v as ProviderType | null);
                        }}
                        clearable
                    />
                )}

                {/* Persistence options - only show for providers that require API keys */}
                {showPersistenceOptions && (
                    <Stack gap="xs">
                        <Checkbox
                            label="Remember API keys"
                            description="Store encrypted keys in browser storage"
                            checked={persistenceEnabled}
                            onChange={(e) => {
                                setPersistenceEnabled(e.currentTarget.checked);
                            }}
                        />

                        {persistenceEnabled && !isPersistenceEnabled && (
                            <>
                                <Alert icon={<ShieldAlert size={16} />} color="yellow" variant="light">
                                    <Text size="sm" fw={500}>
                                        Security Notice
                                    </Text>
                                    <Text size="xs">
                                        Browser storage is convenient but not fully secure. API keys could be accessed
                                        by browser extensions, XSS attacks, or anyone with access to this device. For
                                        sensitive keys, consider re-entering them each session instead.
                                    </Text>
                                </Alert>

                                <TextInput
                                    label="Encryption Password (Optional)"
                                    description="Leave empty for convenience, or enter a custom password. A custom password provides slightly more protection but must be re-entered each browser session."
                                    placeholder="Optional custom password"
                                    type="password"
                                    value={encryptionKey}
                                    onChange={(e) => {
                                        setEncryptionKey(e.currentTarget.value);
                                    }}
                                />
                            </>
                        )}

                        {persistenceEnabled && isPersistenceEnabled && (
                            <Text size="sm" c="dimmed">
                                Keys are encrypted and stored in your browser.
                            </Text>
                        )}
                    </Stack>
                )}

                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} leftSection={<Save size={14} />}>
                        Save
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
