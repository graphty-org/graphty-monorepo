/**
 * AI Showcase Story
 * A comprehensive demonstration that brings together all AI interface features:
 * - Multiple LLM providers (Cloud APIs with stored keys, WebLLM for in-browser)
 * - Voice input for natural language commands
 * - LLM responses executing graph commands
 * - Screenshot capture
 * - Error retry functionality
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, type TemplateResult } from "lit";
import { userEvent, waitFor } from "storybook/test";

import type { ExecutionResult } from "../src/ai/AiController";
import type { AiManagerConfig } from "../src/ai/AiManager";
import type { AiStatus } from "../src/ai/AiStatus";
import { registerProviderApiEngine } from "../src/ai/engine/load";
import type { AiEngine } from "../src/ai/engine/types";
import { ApiKeyManager } from "../src/ai/keys/ApiKeyManager";
import type { MockLlmProvider } from "../src/ai/providers/MockLlmProvider";
import type { WebLlmProvider } from "../src/ai/providers/WebLlmProvider";
import { type GraphtyElement } from "../src/graphty-element";
import { scriptedLiveEngine } from "../src/testing/fakeLive";
import { QueuedProvider } from "../test/helpers/queued-provider";
import {
    assertControlsPresent,
    assertGraphLoaded,
    assertLayoutPlaced,
    drawn,
    holds,
    renderedElement,
} from "./assertions";

// Sample network infrastructure graph
const SAMPLE_NODES = [
    { id: "lb", label: "Load Balancer", type: "loadbalancer", tier: "entry" },
    { id: "web1", label: "Web Server 1", type: "server", tier: "frontend" },
    { id: "web2", label: "Web Server 2", type: "server", tier: "frontend" },
    { id: "api1", label: "API Server 1", type: "server", tier: "backend" },
    { id: "api2", label: "API Server 2", type: "server", tier: "backend" },
    { id: "cache", label: "Redis Cache", type: "cache", tier: "data" },
    { id: "db1", label: "Primary DB", type: "database", tier: "data" },
    { id: "db2", label: "Replica DB", type: "database", tier: "data" },
    { id: "queue", label: "Message Queue", type: "queue", tier: "backend" },
    { id: "worker1", label: "Worker 1", type: "worker", tier: "backend" },
    { id: "worker2", label: "Worker 2", type: "worker", tier: "backend" },
    { id: "monitor", label: "Monitoring", type: "monitor", tier: "infra" },
];

const SAMPLE_EDGES = [
    { src: "lb", dst: "web1" },
    { src: "lb", dst: "web2" },
    { src: "web1", dst: "api1" },
    { src: "web1", dst: "api2" },
    { src: "web2", dst: "api1" },
    { src: "web2", dst: "api2" },
    { src: "api1", dst: "cache" },
    { src: "api2", dst: "cache" },
    { src: "api1", dst: "db1" },
    { src: "api2", dst: "db1" },
    { src: "db1", dst: "db2" },
    { src: "api1", dst: "queue" },
    { src: "api2", dst: "queue" },
    { src: "queue", dst: "worker1" },
    { src: "queue", dst: "worker2" },
    { src: "worker1", dst: "db1" },
    { src: "worker2", dst: "db1" },
    { src: "monitor", dst: "lb" },
    { src: "monitor", dst: "db1" },
    { src: "monitor", dst: "cache" },
];

// Key persistence
const keyManager = new ApiKeyManager();
const PERSISTENCE_KEY = "graphty-ai-showcase";

// Check WebGPU availability
async function checkWebGPU(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
        return false;
    }

    try {
        const adapter = await navigator.gpu?.requestAdapter();
        return Boolean(adapter);
    } catch {
        return false;
    }
}

// Available WebLLM models that support tool calling
// Only Hermes models support function calling in WebLLM
const WEBLLM_MODELS = [
    {
        id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
        name: "Hermes 3 Llama 8B (q4f16)",
        size: "~4GB",
        sizeBytes: 4 * 1024 * 1024 * 1024,
    },
    {
        id: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
        name: "Hermes 3 Llama 8B (q4f32)",
        size: "~4GB",
        sizeBytes: 4 * 1024 * 1024 * 1024,
    },
    {
        id: "Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC",
        name: "Hermes 2 Pro Llama 8B (q4f16)",
        size: "~4GB",
        sizeBytes: 4 * 1024 * 1024 * 1024,
    },
    {
        id: "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC",
        name: "Hermes 2 Pro Llama 8B (q4f32)",
        size: "~4GB",
        sizeBytes: 4 * 1024 * 1024 * 1024,
    },
    {
        id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
        name: "Hermes 2 Pro Mistral 7B",
        size: "~3.5GB",
        sizeBytes: 3.5 * 1024 * 1024 * 1024,
    },
];

// Memory warning threshold (warn if model size > 50% of available memory)
const MEMORY_WARNING_THRESHOLD = 0.5;

// Clear WebLLM IndexedDB cache
async function clearWebLlmCache(): Promise<{ cleared: boolean; error?: string }> {
    try {
        const databases = await indexedDB.databases();
        const webllmDbs = databases.filter((db) => db.name?.includes("webllm") ?? db.name?.includes("mlc"));

        for (const db of webllmDbs) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
            }
        }

        return { cleared: true };
    } catch (error) {
        return { cleared: false, error: (error as Error).message };
    }
}

// Get available memory (if supported)
function getAvailableMemory(): { available: number | null; total: number | null } {
    try {
        // Check for memory API (Chrome only)
        if ("memory" in performance) {
            const perfWithMemory = performance as Performance & {
                memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number };
            };
            const { memory } = perfWithMemory;
            if (memory) {
                return {
                    available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
                    total: memory.jsHeapSizeLimit,
                };
            }
        }

        // Try navigator.deviceMemory (gives RAM in GB, approximate)
        if ("deviceMemory" in navigator) {
            const deviceMemoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
            const totalBytes = deviceMemoryGB * 1024 * 1024 * 1024;
            // Assume 50% available as a conservative estimate
            return { available: totalBytes * 0.5, total: totalBytes };
        }

        return { available: null, total: null };
    } catch {
        return { available: null, total: null };
    }
}

// Voice graph interface
interface VoiceGraph {
    getVoiceAdapter: () => { isSupported: boolean };
    startVoiceInput: (options: {
        continuous?: boolean;
        interimResults?: boolean;
        onTranscript?: (text: string, isFinal: boolean) => void;
        onStart?: (started: boolean, error?: string) => void;
    }) => boolean;
    stopVoiceInput: () => void;
    isVoiceActive: () => boolean;
}

// Main setup function
async function setupShowcase(): Promise<void> {
    const element = document.querySelector<GraphtyElement>("graphty-element");

    // UI elements
    const providerSelect = document.getElementById("provider-select") as HTMLSelectElement | null;
    const apiKeyInput = document.getElementById("api-key") as HTMLInputElement | null;
    const rememberKeyCheckbox = document.getElementById("remember-key") as HTMLInputElement | null;
    const webllmModelSelect = document.getElementById("webllm-model") as HTMLSelectElement | null;
    const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement | null;
    const disconnectBtn = document.getElementById("disconnect-btn") as HTMLButtonElement | null;
    const webllmProgress = document.getElementById("webllm-progress");
    const webllmProgressFill = document.getElementById("webllm-progress-fill");
    const connectionStatus = document.getElementById("connection-status");

    const commandInput = document.getElementById("command-input") as HTMLInputElement | null;
    const sendBtn = document.getElementById("send-btn") as HTMLButtonElement | null;
    const voiceBtn = document.getElementById("voice-btn") as HTMLButtonElement | null;
    const voiceTranscript = document.getElementById("voice-transcript");

    const voiceAutoExecute = document.getElementById("voice-auto-execute") as HTMLInputElement | null;

    const statusBadge = document.getElementById("status-badge");
    const responseOutput = document.getElementById("response-output");
    const commandHistory = document.getElementById("command-history");

    const cloudProviderSection = document.getElementById("cloud-provider-section");
    const webllmSection = document.getElementById("webllm-section");
    const webgpuStatus = document.getElementById("webgpu-status");
    const clearCacheBtn = document.getElementById("clear-cache-btn") as HTMLButtonElement | null;
    const memoryWarning = document.getElementById("memory-warning");
    const memoryWarningText = document.getElementById("memory-warning-text");

    if (
        !element ||
        !providerSelect ||
        !connectBtn ||
        !commandInput ||
        !sendBtn ||
        !responseOutput ||
        !commandHistory ||
        !disconnectBtn ||
        !statusBadge
    ) {
        console.error("Required elements not found");
        return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    const graph = element.graph as VoiceGraph & GraphtyElement["graph"];

    // State
    let isConnected = false;
    let isVoiceActive = false;
    let webllmProvider: WebLlmProvider | null = null;

    // Capture references to required elements for use in closures
    // These are guaranteed non-null after the check above
    const ui = {
        providerSelect,
        connectBtn,
        disconnectBtn,
        commandInput,
        sendBtn,
        responseOutput,
        commandHistory,
        statusBadge,
        // Optional elements (may be null)
        apiKeyInput,
        rememberKeyCheckbox,
        webllmModelSelect,
        webllmProgress,
        webllmProgressFill,
        connectionStatus,
        voiceBtn,
        voiceTranscript,
        voiceAutoExecute,
        cloudProviderSection,
        webllmSection,
        webgpuStatus,
        clearCacheBtn,
        memoryWarning,
        memoryWarningText,
    };

    // Check WebGPU for WebLLM option
    const hasWebGPU = await checkWebGPU();
    if (ui.webgpuStatus) {
        ui.webgpuStatus.innerHTML = hasWebGPU
            ? '<span class="status-ok">✓ WebGPU Available</span>'
            : '<span class="status-error">✗ WebGPU Not Available</span>';
    }

    // Clear cache button handler
    if (ui.clearCacheBtn) {
        ui.clearCacheBtn.addEventListener("click", () => {
            void (async () => {
                if (!ui.clearCacheBtn) {
                    return;
                }

                const originalText = ui.clearCacheBtn.textContent;
                ui.clearCacheBtn.textContent = "⏳";
                ui.clearCacheBtn.disabled = true;

                const result = await clearWebLlmCache();

                if (result.cleared) {
                    ui.clearCacheBtn.textContent = "✓";
                    if (ui.connectionStatus) {
                        ui.connectionStatus.textContent = "Cache cleared. Models will be re-downloaded on next load.";
                        ui.connectionStatus.className = "";
                    }
                } else {
                    ui.clearCacheBtn.textContent = "✗";
                    if (ui.connectionStatus) {
                        ui.connectionStatus.textContent = `Failed to clear cache: ${result.error ?? "Unknown error"}`;
                        ui.connectionStatus.className = "status-error";
                    }
                }

                // Reset button after a delay
                setTimeout(() => {
                    if (ui.clearCacheBtn) {
                        ui.clearCacheBtn.textContent = originalText;
                        ui.clearCacheBtn.disabled = false;
                    }
                }, 2000);
            })();
        });
    }

    // Memory warning check when model is selected
    const checkMemoryWarning = (modelId: string): void => {
        const model = WEBLLM_MODELS.find((m) => m.id === modelId);
        if (!model || !ui.memoryWarning || !ui.memoryWarningText) {
            return;
        }

        const memory = getAvailableMemory();
        if (memory.available !== null) {
            const ratio = model.sizeBytes / memory.available;
            if (ratio > MEMORY_WARNING_THRESHOLD) {
                const modelSizeGB = (model.sizeBytes / (1024 * 1024 * 1024)).toFixed(1);
                const availableGB = (memory.available / (1024 * 1024 * 1024)).toFixed(1);
                ui.memoryWarningText.textContent = `Model size (${modelSizeGB}GB) exceeds ${Math.round(MEMORY_WARNING_THRESHOLD * 100)}% of available memory (${availableGB}GB). Loading may cause browser instability.`;
                ui.memoryWarning.style.display = "block";
            } else {
                ui.memoryWarning.style.display = "none";
            }
        } else {
            // Can't detect memory, show generic warning for large models
            if (model.sizeBytes > 3 * 1024 * 1024 * 1024) {
                ui.memoryWarningText.textContent = `Large model (${model.size}). Ensure you have sufficient memory available.`;
                ui.memoryWarning.style.display = "block";
            } else {
                ui.memoryWarning.style.display = "none";
            }
        }
    };

    // Check memory warning when model selection changes
    if (ui.webllmModelSelect) {
        ui.webllmModelSelect.addEventListener("change", () => {
            checkMemoryWarning(ui.webllmModelSelect?.value ?? "");
        });
        // Initial check
        checkMemoryWarning(ui.webllmModelSelect.value);
    }

    // Load persisted keys
    const loadPersistedKey = (): void => {
        try {
            keyManager.enablePersistence({
                encryptionKey: PERSISTENCE_KEY,
                storage: "localStorage",
            });
            const provider = ui.providerSelect.value;
            if (provider !== "webllm" && provider !== "mock") {
                const savedKey = keyManager.getKey(provider as "openai" | "anthropic" | "google");
                if (savedKey && ui.apiKeyInput) {
                    ui.apiKeyInput.value = savedKey;
                    if (ui.rememberKeyCheckbox) {
                        ui.rememberKeyCheckbox.checked = true;
                    }
                }
            }
        } catch {
            keyManager.disablePersistence();
        }
    };

    // Toggle provider sections
    const updateProviderUI = (): void => {
        const provider = ui.providerSelect.value;
        const isCloud = ["openai", "anthropic", "google"].includes(provider);
        const isWebLLM = provider === "webllm";

        if (ui.cloudProviderSection) {
            ui.cloudProviderSection.style.display = isCloud ? "block" : "none";
        }

        if (ui.webllmSection) {
            ui.webllmSection.style.display = isWebLLM ? "block" : "none";
        }

        // Load persisted key for cloud providers
        if (isCloud) {
            loadPersistedKey();
        }
    };

    ui.providerSelect.addEventListener("change", updateProviderUI);
    updateProviderUI();

    // Update status display
    const updateStatus = (status: AiStatus): void => {
        ui.statusBadge.textContent = status.state;
        ui.statusBadge.className = `status-badge ${status.state}`;

        if (status.toolCalls && status.toolCalls.length > 0) {
            const tools = status.toolCalls.map((tc) => tc.name).join(", ");
            ui.statusBadge.textContent += ` (${tools})`;
        }
    };

    // Log command to history
    const logCommand = (input: string, result: string, success: boolean): void => {
        const entry = document.createElement("div");
        entry.className = `history-entry ${success ? "success" : "error"}`;
        entry.innerHTML = `
            <div class="history-input">&gt; ${input}</div>
            <div class="history-result">${result}</div>
        `;
        ui.commandHistory.insertBefore(entry, ui.commandHistory.firstChild);

        while (ui.commandHistory.children.length > 8) {
            ui.commandHistory.removeChild(ui.commandHistory.lastChild as Node);
        }
    };

    // Connect handler
    ui.connectBtn.addEventListener("click", () => {
        void (async () => {
            const provider = ui.providerSelect.value;

            try {
                if (ui.connectionStatus) {
                    ui.connectionStatus.textContent = `Connecting to ${provider}...`;
                    ui.connectionStatus.className = "status-connecting";
                }

                ui.connectBtn.disabled = true;

                if (provider === "webllm") {
                    // Dynamic import WebLlmProvider
                    const { WebLlmProvider } = await import("../src/ai/providers/WebLlmProvider");
                    webllmProvider = new WebLlmProvider();

                    const selectedModel = ui.webllmModelSelect?.value ?? WEBLLM_MODELS[0].id;
                    webllmProvider.configure({ model: selectedModel });

                    // Show progress
                    if (ui.webllmProgress) {
                        ui.webllmProgress.style.display = "block";
                    }

                    let lastProgressText = "";
                    webllmProvider.onProgress((progress, text) => {
                        lastProgressText = text;
                        if (ui.webllmProgressFill) {
                            ui.webllmProgressFill.style.width = `${progress * 100}%`;
                        }

                        if (ui.connectionStatus) {
                            ui.connectionStatus.textContent = text;
                        }
                    });

                    try {
                        await webllmProvider.initialize();
                    } catch (initError) {
                        // Handle specific WebLLM initialization errors
                        const errorMsg = (initError as Error).message;

                        // Check for common WebLLM errors and provide helpful messages
                        let helpfulMessage = errorMsg;
                        let suggestClearCache = false;

                        if (errorMsg.includes("WebGPU") || errorMsg.includes("GPU")) {
                            helpfulMessage =
                                "WebGPU initialization failed. Try refreshing the page or using a different browser.";
                        } else if (errorMsg.includes("memory") || errorMsg.includes("OOM")) {
                            helpfulMessage = "Out of memory. Try a smaller model or close other browser tabs.";
                            suggestClearCache = true;
                        } else if (errorMsg.includes("cache") || errorMsg.includes("IndexedDB")) {
                            helpfulMessage = "Cache error. Try clearing the WebLLM cache.";
                            suggestClearCache = true;
                        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
                            helpfulMessage = "Network error downloading model. Check your connection and try again.";
                        } else if (lastProgressText.includes("Loading model")) {
                            // If error occurred while loading model, cache might be corrupted
                            helpfulMessage = `Error loading model: ${errorMsg}. The cached model may be corrupted.`;
                            suggestClearCache = true;
                        }

                        // Clean up partial initialization
                        webllmProvider = null;

                        // Show error with helpful suggestion
                        if (ui.connectionStatus) {
                            ui.connectionStatus.innerHTML = suggestClearCache
                                ? `✗ ${helpfulMessage} <button id="suggest-clear-cache" style="margin-left: 8px; padding: 4px 8px; cursor: pointer;">Clear Cache</button>`
                                : `✗ ${helpfulMessage}`;
                            ui.connectionStatus.className = "status-error";

                            // Add click handler for suggested clear cache button
                            if (suggestClearCache) {
                                const suggestBtn = document.getElementById("suggest-clear-cache");
                                if (suggestBtn) {
                                    suggestBtn.addEventListener("click", () => {
                                        void clearWebLlmCache().then((result) => {
                                            if (result.cleared && ui.connectionStatus) {
                                                ui.connectionStatus.textContent =
                                                    "Cache cleared. Try connecting again.";
                                                ui.connectionStatus.className = "";
                                            }
                                        });
                                    });
                                }
                            }
                        }

                        if (ui.webllmProgress) {
                            ui.webllmProgress.style.display = "none";
                        }

                        ui.connectBtn.disabled = false;
                        return;
                    }

                    // Enable AI with the initialized provider instance
                    await graph.enableAiControl({
                        provider: "webllm",
                        providerInstance: webllmProvider,
                    });
                } else if (provider === "mock") {
                    await graph.enableAiControl({ provider: "mock" });
                } else {
                    // Cloud provider
                    const apiKey = ui.apiKeyInput?.value.trim();
                    if (!apiKey) {
                        throw new Error("Please enter an API key");
                    }

                    await graph.enableAiControl({
                        provider: provider as "openai" | "anthropic" | "google",
                        apiKey,
                    });

                    // Save key if requested
                    if (ui.rememberKeyCheckbox?.checked && ui.apiKeyInput) {
                        keyManager.enablePersistence({
                            encryptionKey: PERSISTENCE_KEY,
                            storage: "localStorage",
                        });
                        keyManager.setKey(provider as "openai" | "anthropic" | "google", apiKey);
                    }
                }

                // Subscribe to status updates
                graph.onAiStatusChange(updateStatus);

                isConnected = true;
                if (ui.connectionStatus) {
                    ui.connectionStatus.textContent = `✓ Connected to ${provider}`;
                    ui.connectionStatus.className = "status-connected";
                }

                ui.sendBtn.disabled = false;
                if (ui.voiceBtn) {
                    ui.voiceBtn.disabled = false;
                }

                ui.disconnectBtn.disabled = false;

                if (ui.webllmProgress) {
                    ui.webllmProgress.style.display = "none";
                }

                ui.responseOutput.textContent = `Connected! Try natural language commands like:
• "Highlight all database nodes in blue"
• "Switch to circular layout"
• "Show me a top-down view"
• "How many servers are there?"
• "Make the frontend tier larger"`;
            } catch (error) {
                if (ui.connectionStatus) {
                    ui.connectionStatus.textContent = `✗ ${(error as Error).message}`;
                    ui.connectionStatus.className = "status-error";
                }

                if (ui.webllmProgress) {
                    ui.webllmProgress.style.display = "none";
                }
            } finally {
                ui.connectBtn.disabled = false;
            }
        })();
    });

    // Disconnect handler
    ui.disconnectBtn.addEventListener("click", () => {
        graph.disableAiControl();
        isConnected = false;
        webllmProvider = null;

        if (ui.connectionStatus) {
            ui.connectionStatus.textContent = "Disconnected";
            ui.connectionStatus.className = "";
        }

        ui.sendBtn.disabled = true;
        if (ui.voiceBtn) {
            ui.voiceBtn.disabled = true;
        }

        ui.disconnectBtn.disabled = true;
    });

    // Command submission
    const handleSubmit = async (): Promise<void> => {
        if (!isConnected) {
            ui.responseOutput.textContent = "Please connect to a provider first.";
            return;
        }

        const value = ui.commandInput.value.trim();
        if (!value) {
            return;
        }

        ui.responseOutput.textContent = "Processing...";
        ui.sendBtn.disabled = true;

        try {
            const result = await graph.aiCommand(value);

            let output = result.message;
            if (result.data) {
                output += `\n\n${JSON.stringify(result.data, null, 2)}`;
            }

            ui.responseOutput.textContent = output;
            logCommand(value, result.success ? `✓ ${result.message}` : `✗ ${result.message}`, result.success);
        } catch (error) {
            const msg = `Error: ${(error as Error).message}`;
            ui.responseOutput.textContent = msg;
            logCommand(value, msg, false);
        } finally {
            ui.sendBtn.disabled = false;
            ui.commandInput.value = "";
            ui.commandInput.focus();
        }
    };

    ui.sendBtn.addEventListener("click", () => void handleSubmit());
    ui.commandInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            void handleSubmit();
        }
    });

    // Voice input
    if (ui.voiceBtn) {
        const adapter = graph.getVoiceAdapter();
        if (!adapter.isSupported) {
            ui.voiceBtn.disabled = true;
            ui.voiceBtn.title = "Voice input not supported in this browser";
        }

        ui.voiceBtn.addEventListener("click", () => {
            if (!ui.voiceBtn) {
                return;
            }

            if (isVoiceActive) {
                graph.stopVoiceInput();
                ui.voiceBtn.textContent = "🎤";
                ui.voiceBtn.className = "action-btn voice";
                isVoiceActive = false;
                if (ui.voiceTranscript) {
                    ui.voiceTranscript.style.display = "none";
                }
            } else {
                ui.voiceBtn.textContent = "⏳";
                ui.voiceBtn.disabled = true;

                graph.startVoiceInput({
                    continuous: true,
                    interimResults: true,
                    onStart: (started, error) => {
                        if (!ui.voiceBtn) {
                            return;
                        }

                        ui.voiceBtn.disabled = false;
                        if (started) {
                            ui.voiceBtn.textContent = "⏹";
                            ui.voiceBtn.className = "action-btn voice active";
                            isVoiceActive = true;
                            if (ui.voiceTranscript) {
                                ui.voiceTranscript.style.display = "block";
                                ui.voiceTranscript.textContent = "Listening...";
                            }
                        } else {
                            ui.voiceBtn.textContent = "🎤";
                            ui.responseOutput.textContent = `Voice error: ${error ?? "Unknown error"}`;
                        }
                    },
                    onTranscript: (text, isFinal) => {
                        if (ui.voiceTranscript) {
                            ui.voiceTranscript.textContent = text;
                            ui.voiceTranscript.style.fontStyle = isFinal ? "normal" : "italic";
                        }

                        if (isFinal && text.trim()) {
                            const shouldAutoExecute = ui.voiceAutoExecute?.checked ?? true;

                            if (shouldAutoExecute) {
                                // Auto-execute: send command immediately
                                void graph.aiCommand(text, { via: "voice" }).then((result) => {
                                    ui.responseOutput.textContent = result.message;
                                    logCommand(
                                        `🎤 ${text}`,
                                        result.success ? `✓ ${result.message}` : `✗ ${result.message}`,
                                        result.success,
                                    );
                                });
                            } else {
                                // Fill input: populate the text field for review/editing
                                ui.commandInput.value = text;
                                ui.commandInput.focus();
                                ui.responseOutput.textContent = "Voice input captured. Press Send or Enter to execute.";
                            }
                        }
                    },
                });
            }
        });
    }

    // Initial display
    ui.responseOutput.textContent = `Network graph loaded with ${SAMPLE_NODES.length} nodes and ${SAMPLE_EDGES.length} edges.

Select an AI provider and connect to start using natural language commands.

• Cloud Providers (OpenAI, Anthropic, Google) require API keys
• WebLLM runs entirely in your browser (requires WebGPU)
• Mock provider for testing without real LLM`;
}

const meta: Meta = {
    title: "AI Control",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component: `
# AI Showcase - Complete Feature Demo

This showcase demonstrates all AI interface capabilities in one integrated experience.

## Features Demonstrated

### 🔌 Multiple LLM Providers

| Provider | Key Required | Runs In Browser | Best For |
|----------|-------------|-----------------|----------|
| **OpenAI** | Yes | No | High-quality responses |
| **Anthropic** | Yes | No | Complex reasoning |
| **Google** | Yes | No | Multimodal tasks |
| **WebLLM** | No | Yes (WebGPU) | Privacy, offline use |
| **Mock** | No | Yes | Testing |

### 🔐 API Key Management
- Keys can be remembered (encrypted in localStorage)
- Per-provider key storage
- Automatic key loading on provider switch

### 🎤 Voice Input
- Speak commands naturally
- Real-time transcription
- Automatic command execution

### 📸 Screenshot Capture
- Capture current view
- Download as PNG
- Get image metadata

### 🔄 Error Recovery
- Retry failed commands
- Status tracking throughout execution

## Example Commands

### Styling
- "Make all nodes red"
- "Highlight database nodes in blue"
- "Make the frontend tier larger"
- "Clear all styles"

### Layout
- "Switch to circular layout"
- "Use force-directed layout"
- "Arrange in a spiral"

### Camera
- "Show from top"
- "Zoom to fit all nodes"
- "Isometric view"

### Queries
- "How many nodes are there?"
- "Give me a summary"
- "Find all server nodes"

### Dimensions
- "Switch to 2D"
- "Show in 3D"

## Architecture

This demo integrates:
- **AiManager** - Orchestrates AI lifecycle
- **LLM Providers** - Vercel AI SDK (cloud) + WebLLM (browser)
- **CommandRegistry** - Maps LLM tool calls to graph operations
- **VoiceInputAdapter** - Web Speech API integration
- **ApiKeyManager** - Secure key storage
- **ScreenshotCapture** - Babylon.js screenshot system
`,
            },
        },
    },
    render: (): TemplateResult => {
        setTimeout(() => void setupShowcase(), 100);

        return html`
            <style>
                .showcase-layout {
                    display: flex;
                    gap: 16px;
                    padding: 16px;
                    font-family:
                        system-ui,
                        -apple-system,
                        sans-serif;
                    /* The page's own 16px margin plus this box, padding included, is exactly the
                       viewport: content-box sizing added the padding on top and scrolled the page. */
                    box-sizing: border-box;
                    height: calc(100vh - 32px);
                    background: #f5f5f5;
                }
                .graph-container {
                    flex: 2;
                    min-width: 400px;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                graphty-element {
                    width: 100%;
                    height: 100%;
                }
                .control-panel {
                    flex: 1;
                    min-width: 360px;
                    max-width: 420px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    overflow-y: auto;
                }
                .panel-section {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .section-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }
                .section-icon.provider {
                    background: #e3f2fd;
                }
                .section-icon.command {
                    background: #f3e5f5;
                }
                .section-icon.history {
                    background: #e8f5e9;
                }
                .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                }

                /* Provider Selection */
                .provider-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                #provider-select {
                    flex: 1;
                    padding: 10px 12px;
                    font-size: 14px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: white;
                }
                .connect-btn {
                    padding: 10px 16px;
                    font-size: 14px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .connect-btn:hover:not(:disabled) {
                    background: #43a047;
                }
                .connect-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .connect-btn.disconnect {
                    background: #f44336;
                }
                .connect-btn.disconnect:hover:not(:disabled) {
                    background: #e53935;
                }

                /* Cloud Provider */
                #cloud-provider-section,
                #webllm-section {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #eee;
                }
                .key-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                #api-key {
                    flex: 1;
                    padding: 10px 12px;
                    font-size: 14px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }
                .remember-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #666;
                }
                .remember-row input {
                    width: 16px;
                    height: 16px;
                }

                /* WebLLM */
                #webllm-model {
                    width: 100%;
                    padding: 10px 12px;
                    font-size: 14px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: white;
                    margin-bottom: 8px;
                }
                #webgpu-status {
                    font-size: 12px;
                    margin-bottom: 8px;
                }
                .status-ok {
                    color: #2e7d32;
                }
                .status-error {
                    color: #c62828;
                }
                .progress-bar {
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 8px;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #7c4dff, #448aff);
                    transition: width 0.3s;
                }

                /* Connection Status */
                #connection-status {
                    font-size: 13px;
                    padding: 8px;
                    border-radius: 6px;
                    margin-top: 8px;
                    background: #f5f5f5;
                }
                .status-connecting {
                    color: #1565c0;
                    background: #e3f2fd;
                }
                .status-connected {
                    color: #2e7d32;
                    background: #e8f5e9;
                }
                .status-error {
                    color: #c62828;
                    background: #ffebee;
                }

                /* Command Input */
                .command-row {
                    display: flex;
                    gap: 8px;
                }
                #command-input {
                    flex: 1;
                    padding: 12px;
                    font-size: 14px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    outline: none;
                }
                #command-input:focus {
                    border-color: #7c4dff;
                    box-shadow: 0 0 0 2px rgba(124, 77, 255, 0.2);
                }
                .send-btn {
                    padding: 12px 20px;
                    font-size: 14px;
                    background: #7c4dff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .send-btn:hover:not(:disabled) {
                    background: #651fff;
                }
                .send-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                /* Voice */
                .voice-options {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #666;
                }
                .voice-options input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                }
                #voice-transcript {
                    display: none;
                    padding: 10px;
                    background: #f0f0f0;
                    border-radius: 6px;
                    margin-top: 8px;
                    font-size: 13px;
                    min-height: 20px;
                }

                /* Status */
                .status-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                }
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-badge.ready {
                    background: #e8f5e9;
                    color: #2e7d32;
                }
                .status-badge.submitted {
                    background: #fff3e0;
                    color: #e65100;
                }
                .status-badge.streaming {
                    background: #e3f2fd;
                    color: #1565c0;
                }
                .status-badge.executing {
                    background: #f3e5f5;
                    color: #7b1fa2;
                }
                .status-badge.error {
                    background: #ffebee;
                    color: #c62828;
                }

                /* Response */
                #response-output {
                    padding: 14px;
                    background: #fafafa;
                    border-radius: 8px;
                    min-height: 80px;
                    max-height: 180px;
                    overflow-y: auto;
                    font-size: 13px;
                    white-space: pre-wrap;
                    line-height: 1.5;
                    font-family: ui-monospace, monospace;
                    border: 1px solid #eee;
                }

                /* Voice Button */
                .action-btn {
                    padding: 10px 12px;
                    font-size: 16px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .action-btn.voice {
                    background: #e3f2fd;
                    color: #1565c0;
                }
                .action-btn.voice:hover:not(:disabled) {
                    background: #bbdefb;
                }
                .action-btn.voice.active {
                    background: #f44336;
                    color: white;
                }

                /* WebLLM Model Row */
                .webllm-model-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .webllm-model-row select {
                    flex: 1;
                }
                .clear-cache-btn {
                    padding: 8px 12px;
                    font-size: 14px;
                    background: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .clear-cache-btn:hover {
                    background: #f57c00;
                }
                .clear-cache-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                /* Memory Warning */
                .memory-warning {
                    padding: 8px 12px;
                    background: #fff3e0;
                    color: #e65100;
                    border-radius: 6px;
                    font-size: 12px;
                    margin-top: 8px;
                }

                /* History */
                #command-history {
                    max-height: 150px;
                    overflow-y: auto;
                }
                .history-entry {
                    padding: 8px 10px;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 12px;
                }
                .history-entry:last-child {
                    border-bottom: none;
                }
                .history-input {
                    color: #1976d2;
                    font-family: monospace;
                    margin-bottom: 2px;
                }
                .history-result {
                    color: #555;
                }
                .history-entry.success .history-result {
                    color: #2e7d32;
                }
                .history-entry.error .history-result {
                    color: #c62828;
                }

                /* Commands Hint */
                .commands-hint {
                    font-size: 11px;
                    color: #888;
                    padding: 10px;
                    background: #fafafa;
                    border-radius: 6px;
                    line-height: 1.6;
                }
                .commands-hint strong {
                    color: #555;
                }
            </style>

            <div class="showcase-layout">
                <div class="graph-container">
                    <!-- The sample network is handed over with the element rather than added once it has
                         rendered: the layout steps on every frame, and a frame drawn between an
                         add of nodes and an add of edges lays the nodes out without their edges
                         for however many frames fit in the gap, so the settled picture depended
                         on how fast the machine was. -->
                    <graphty-element
                        layout-type="ngraph"
                        .nodeData=${SAMPLE_NODES}
                        .edgeData=${SAMPLE_EDGES}
                    ></graphty-element>
                </div>

                <div class="control-panel">
                    <!-- Header -->
                    <div class="panel-section" style="padding: 12px 16px;">
                        <h2 style="margin: 0; font-size: 18px;">🤖 AI Showcase</h2>
                        <p style="margin: 4px 0 0; font-size: 13px; color: #666;">
                            Complete demonstration of AI-powered graph control
                        </p>
                    </div>

                    <!-- Provider Selection -->
                    <div class="panel-section">
                        <div class="section-header">
                            <div class="section-icon provider">🔌</div>
                            <span class="section-title">LLM Provider</span>
                        </div>

                        <div class="provider-row">
                            <select id="provider-select">
                                <optgroup label="Cloud Providers (API Key)">
                                    <option value="openai">OpenAI (GPT-4o)</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                    <option value="google">Google (Gemini)</option>
                                </optgroup>
                                <optgroup label="Local/Browser">
                                    <option value="webllm">WebLLM (In-Browser)</option>
                                    <option value="mock">Mock (Testing)</option>
                                </optgroup>
                            </select>
                            <button id="connect-btn" class="connect-btn">Connect</button>
                            <button id="disconnect-btn" class="connect-btn disconnect" disabled>×</button>
                        </div>

                        <!-- Cloud Provider Options -->
                        <div id="cloud-provider-section">
                            <div class="key-row">
                                <input id="api-key" type="password" placeholder="Enter API key..." />
                            </div>
                            <div class="remember-row">
                                <input type="checkbox" id="remember-key" />
                                <label for="remember-key">Remember key (encrypted)</label>
                            </div>
                        </div>

                        <!-- WebLLM Options -->
                        <div id="webllm-section" style="display: none;">
                            <div id="webgpu-status">Checking WebGPU...</div>
                            <div class="webllm-model-row">
                                <select id="webllm-model">
                                    <option value="Hermes-3-Llama-3.1-8B-q4f16_1-MLC">
                                        Hermes 3 Llama 8B (q4f16) (~4GB)
                                    </option>
                                    <option value="Hermes-3-Llama-3.1-8B-q4f32_1-MLC">
                                        Hermes 3 Llama 8B (q4f32) (~4GB)
                                    </option>
                                    <option value="Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC">
                                        Hermes 2 Pro Llama 8B (q4f16) (~4GB)
                                    </option>
                                    <option value="Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC">
                                        Hermes 2 Pro Llama 8B (q4f32) (~4GB)
                                    </option>
                                    <option value="Hermes-2-Pro-Mistral-7B-q4f16_1-MLC">
                                        Hermes 2 Pro Mistral 7B (~3.5GB)
                                    </option>
                                </select>
                                <button id="clear-cache-btn" class="clear-cache-btn" title="Clear cached models">
                                    🗑️
                                </button>
                            </div>
                            <div id="memory-warning" class="memory-warning" style="display: none;">
                                ⚠️ <span id="memory-warning-text">Large model may cause issues</span>
                            </div>
                            <div id="webllm-progress" style="display: none;">
                                <div class="progress-bar">
                                    <div id="webllm-progress-fill" class="progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>

                        <div id="connection-status">Select a provider and connect</div>
                    </div>

                    <!-- Command Input -->
                    <div class="panel-section">
                        <div class="section-header">
                            <div class="section-icon command">💬</div>
                            <span class="section-title">Natural Language Command</span>
                        </div>

                        <div class="command-row">
                            <button id="voice-btn" class="action-btn voice" disabled title="Voice input">🎤</button>
                            <input id="command-input" type="text" placeholder="e.g., 'Make database nodes blue'" />
                            <button id="send-btn" class="send-btn" disabled>Send</button>
                        </div>

                        <div class="voice-options">
                            <input type="checkbox" id="voice-auto-execute" checked />
                            <label for="voice-auto-execute">Auto-execute voice commands</label>
                        </div>

                        <div id="voice-transcript"></div>

                        <div class="status-row">
                            <span style="font-size: 12px; color: #888;">Status:</span>
                            <span id="status-badge" class="status-badge ready">ready</span>
                        </div>

                        <pre id="response-output">Loading graph...</pre>
                    </div>

                    <!-- Command History -->
                    <div class="panel-section" style="flex: 1; min-height: 100px;">
                        <div class="section-header">
                            <div class="section-icon history">📜</div>
                            <span class="section-title">Command History</span>
                        </div>
                        <div id="command-history"></div>
                    </div>

                    <!-- Hints -->
                    <div class="commands-hint">
                        <strong>Try:</strong> "highlight servers" • "circular layout" • "top view" • "how many nodes?" •
                        "switch to 2D"
                    </div>
                </div>
            </div>
        `;
    },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "AI Control Default");

        // The showcase hands its own sample network to the element as it renders.
        await assertGraphLoaded(scene, { nodes: 12, edges: 20 });
        await assertLayoutPlaced(scene, {});

        // The panel beside the graph is half of what this story is: the provider it will talk to,
        // the key it will talk with, and the box a person types a command into.
        await assertControlsPresent(canvasElement, "AI Control Default", [
            "#provider-select",
            "#api-key",
            "#connect-btn",
            "#command-input",
            "#send-btn",
            "#command-history",
            "#response-output",
        ]);
    },
};

/**
 * A small page around the element, as a consumer writes it from the AI guide: an input and a Send
 * button, a transcript redrawn on `ai-conversation-changed`, and an approval card drawn from
 * `ai-approval-requested`. The assistant runs on the mock provider with scripted answers, so the
 * story needs no key and draws the same picture every time.
 */
interface AssistantPage {
    /** The page's root. */
    readonly root: HTMLElement;
    /** Settles when the assistant is enabled and scripted. */
    readonly ready: Promise<void>;
    /** The last message the reader sent, until it resolves. */
    sent?: Promise<ExecutionResult>;
    /** The last answer the reader gave an approval request, until it resolves. */
    decided?: Promise<ExecutionResult>;
    /** The last answer the reader gave a question, until it resolves. */
    answered?: Promise<ExecutionResult>;
}

/** One scripted answer of the mock provider. */
type ScriptedResponse = Parameters<MockLlmProvider["setResponse"]>[1];

/** Each rendered page, by its root, for the play function. */
const assistantPages = new WeakMap<Element, AssistantPage>();

/**
 * Draw the page and enable the assistant. With `questions` the page also draws a question card from
 * `ai-question-asked`; with `agents`, a list of what each helper did from `ai-agent-start` and
 * `ai-agent-end`; with `tools.inPageCode`, the programs the model ran, from the conversation; with
 * `voice`, a talk button held by pointer or by Space (the AI guide's simple path) and a line
 * showing what is heard, the microphone's level and how the last press ended.
 * @param config - The assistant's history, approvals, questions and helpers.
 * @param scripted - The mock provider's answers: by a phrase of the reader's message, or every
 *     model turn in order (the main model's and its helpers'), for a message with several turns.
 * @param engine - An engine the mock provider runs on instead (a scripted live conversation).
 * @returns The page's root.
 */
function assistantPage(
    config: Pick<AiManagerConfig, "history" | "approvals" | "questions" | "agents" | "tools" | "voice">,
    scripted: Readonly<Record<string, ScriptedResponse>> | readonly ScriptedResponse[],
    engine?: AiEngine,
): HTMLElement {
    const root = document.createElement("div");
    // Room on the right for the console-capture button Storybook floats in the top-right corner,
    // which would otherwise sit over Send.
    root.style.cssText = "display:flex;gap:16px;height:600px;font:14px sans-serif;padding-right:56px;";

    const element = document.createElement("graphty-element");
    element.id = "assistant-graph";
    element.style.cssText = "flex:1;min-width:0;display:block;height:100%;";
    element.layout = "circular";
    element.nodeData = SAMPLE_NODES;
    element.edgeData = SAMPLE_EDGES;

    const panel = document.createElement("div");
    panel.style.cssText = "width:340px;display:flex;flex-direction:column;gap:8px;";
    const form = document.createElement("form");
    form.style.cssText = "display:flex;gap:8px;";
    const input = document.createElement("input");
    input.id = "ask";
    input.placeholder = "Ask the assistant";
    input.style.cssText = "flex:1;padding:6px;";
    const send = document.createElement("button");
    send.id = "send";
    send.type = "submit";
    send.textContent = "Send";
    form.append(input, send);
    const transcript = document.createElement("ol");
    transcript.id = "transcript";
    transcript.style.cssText = "margin:0;padding-left:20px;";
    const card = document.createElement("div");
    card.id = "approval";
    card.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    panel.append(form, transcript, card);
    root.append(element, panel);

    // The question card: the model's question and one button per choice, as text.
    const question = document.createElement("div");
    question.id = "question";
    question.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    if (config.questions === true) {
        panel.append(question);
    }

    element.addEventListener("ai-question-asked", (e) => {
        const { request } = e.detail;
        question.replaceChildren();
        const asked = document.createElement("p");
        asked.style.cssText = "margin:0;font-weight:bold;";
        asked.textContent = request.question;
        question.append(asked);
        for (const choice of request.choices) {
            const button = document.createElement("button");
            button.textContent = choice;
            button.addEventListener("click", () => {
                question.replaceChildren();
                page.answered = element.answerAiQuestion(request.id, choice);
            });
            question.append(button);
        }
    });

    // What each helper did: started, and how it ended with the tokens it used.
    const helpers = document.createElement("ul");
    helpers.id = "helpers";
    helpers.style.cssText = "margin:0;padding-left:20px;color:#555;";
    if (config.agents !== undefined) {
        panel.append(helpers);
    }

    element.addEventListener("ai-agent-start", (e) => {
        const item = document.createElement("li");
        item.textContent = `${e.detail.agent} started: ${e.detail.task}`;
        helpers.append(item);
    });
    element.addEventListener("ai-agent-end", (e) => {
        const { agent, code, usage } = e.detail;
        const tokens = usage.inputTokens + usage.outputTokens;
        const item = document.createElement("li");
        item.textContent = `${agent} ended ${code}, ${String(tokens)} tokens`;
        helpers.append(item);
    });

    // The talk button: held by pointer or by Space, as the AI guide wires it. The release is read
    // on the window, so letting go off the button still ends the press.
    const talk = document.createElement("button");
    talk.id = "talk";
    talk.type = "button";
    talk.textContent = "Hold to talk";
    talk.style.cssText = "padding:8px;";
    const heard = document.createElement("p");
    heard.id = "voice-status";
    heard.style.cssText = "margin:0;color:#555;min-height:1.2em;";
    const level = document.createElement("meter");
    level.id = "voice-level";
    level.style.cssText = "width:100%;";
    if (config.voice !== undefined) {
        panel.append(talk, level, heard);
    }

    const release = (): void => {
        talk.removeAttribute("aria-pressed");
        element.aiTalk(false);
    };
    talk.addEventListener("pointerdown", () => {
        talk.setAttribute("aria-pressed", "true");
        element.aiTalk(true);
        window.addEventListener("pointerup", release, { once: true });
        window.addEventListener("pointercancel", release, { once: true });
    });
    talk.addEventListener("keydown", (e) => {
        if (e.key === " " && !e.repeat) {
            e.preventDefault();
            talk.setAttribute("aria-pressed", "true");
            element.aiTalk(true);
        }
    });
    talk.addEventListener("keyup", (e) => {
        if (e.key === " ") {
            release();
        }
    });
    element.addEventListener("ai-voice-start", (e) => {
        heard.textContent = e.detail.mode === "live" ? "Listening (live)" : "Listening";
    });
    element.addEventListener("ai-voice-transcript", (e) => {
        heard.textContent = e.detail.transcript;
    });
    element.addEventListener("ai-voice-level", (e) => {
        level.value = e.detail.level;
    });
    element.addEventListener("ai-voice-end", (e) => {
        level.value = 0;
        heard.textContent = `Ended: ${e.detail.code ?? e.detail.reason}`;
    });

    // The programs the model ran (`run_code` calls), as text.
    const programs = document.createElement("div");
    programs.id = "programs";
    programs.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    if (config.tools?.inPageCode !== undefined) {
        panel.append(programs);
    }

    // The transcript: the reader's words and the assistant's, with the tools each answer used.
    element.addEventListener("ai-conversation-changed", () => {
        programs.replaceChildren(
            ...(element.getAiConversation()?.messages ?? [])
                .flatMap((message) => (message.role === "assistant" ? message.calls : []))
                .filter((call) => call.command === "run_code")
                .map((call) => {
                    const program = document.createElement("pre");
                    program.style.cssText = "margin:0;white-space:pre-wrap;background:#f3f3f3;padding:6px;";
                    program.textContent = `${String(call.arguments.code)}\n-> ${call.code}`;
                    return program;
                }),
        );
        transcript.replaceChildren(
            ...(element.getAiConversation()?.messages ?? []).map((message) => {
                const item = document.createElement("li");
                const calls = message.role === "assistant" ? message.calls.map((call) => call.command) : [];
                const reader = message.role === "reader" && message.via === "voice" ? "You (spoken)" : "You";
                const who = message.role === "reader" ? reader : (message.agent ?? "Assistant");
                item.textContent = `${who}: ${message.text}${calls.length > 0 ? ` [${calls.join(", ")}]` : ""}`;
                return item;
            }),
        );
    });

    // The approval card: what the model asked for, as text, and the reader's two answers.
    element.addEventListener("ai-approval-requested", (e) => {
        const { request } = e.detail;
        card.replaceChildren();
        for (const call of request.calls) {
            const line = document.createElement("pre");
            line.style.cssText = "margin:0;white-space:pre-wrap;background:#f3f3f3;padding:6px;";
            line.textContent = `${call.tool} ${JSON.stringify(call.arguments)}`;
            card.append(line);
        }

        for (const approve of [true, false]) {
            const button = document.createElement("button");
            button.textContent = approve ? "Approve" : "Deny";
            button.addEventListener("click", () => {
                card.replaceChildren();
                page.decided = element.resolveAiApproval(request.id, { approve });
            });
            card.append(button);
        }
    });
    element.addEventListener("ai-pending-resolved", (e) => {
        (e.detail.kind === "question" ? question : card).replaceChildren();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        input.value = "";
        if (text !== "") {
            page.sent = element.aiCommand(text);
        }
    });

    const page: AssistantPage = {
        root,
        ready: (async () => {
            if (Array.isArray(scripted)) {
                const queued = new QueuedProvider();
                queued.queue.push(...(scripted as readonly ScriptedResponse[]));
                await element.enableAiControl({ provider: "mock", providerInstance: queued, ...config });
                return;
            }

            await element.enableAiControl({ provider: "mock", ...config });
            const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
            if (engine !== undefined) {
                registerProviderApiEngine(provider, () => engine);
            }

            for (const [phrase, response] of Object.entries(scripted)) {
                provider.setResponse(phrase, response);
            }
        })(),
    };
    assistantPages.set(root, page);
    return root;
}

/**
 * The page a story rendered, ready for the reader.
 * @param canvasElement - Where the story was rendered.
 * @returns The page.
 */
async function readyPage(canvasElement: HTMLElement): Promise<AssistantPage> {
    const root = canvasElement.firstElementChild;
    const page = root === null ? undefined : assistantPages.get(root);
    await holds(page !== undefined, "the story rendered no assistant page");
    if (page === undefined) {
        throw new Error("the story rendered no assistant page");
    }

    await page.ready;
    return page;
}

/**
 * Type a message into the page's input and press Send, as a reader does.
 * @param canvasElement - Where the story was rendered.
 * @param page - The page.
 * @param text - What the reader types.
 * @returns The message's result.
 */
async function ask(canvasElement: HTMLElement, page: AssistantPage, text: string): Promise<ExecutionResult> {
    const input = canvasElement.querySelector<HTMLInputElement>("#ask");
    const send = canvasElement.querySelector<HTMLButtonElement>("#send");
    await holds(input !== null && send !== null, "the page has no input and Send button");
    const previous = page.sent;
    // A reader's pointer lands on Send wherever on it they press, not on anything drawn over it.
    const box = (send as HTMLButtonElement).getBoundingClientRect();
    const covered = [0.1, 0.5, 0.9]
        .flatMap((fx) => [0.1, 0.5, 0.9].map((fy) => [box.left + fx * box.width, box.top + fy * box.height]))
        .map(([x, y]) => document.elementFromPoint(x, y))
        .find((hit) => hit !== send);
    await holds(covered === undefined, `${covered?.id ?? "something"} is drawn over part of Send`);
    await userEvent.type(input as HTMLInputElement, text);
    await userEvent.click(send as HTMLButtonElement);
    const { sent } = page;
    await holds(sent !== undefined && sent !== previous, `pressing Send did not send "${text}"`);
    return (await sent) as ExecutionResult;
}

/**
 * The assistant remembers the conversation (`history: "memory"`): the reader asks to color the
 * servers red, then says "now make them bigger", and the model is sent the first exchange with
 * the second message. The transcript beside the graph is the page's, read from
 * `getAiConversation()`.
 */
export const RememberedConversation: Story = {
    name: "Remembered conversation",
    render: () =>
        assistantPage(
            { history: "memory" },
            {
                "servers red": {
                    text: "I colored the four servers red.",
                    toolCalls: [
                        {
                            id: "c1",
                            name: "style",
                            arguments: {
                                action: "add",
                                where: "data.type == 'server'",
                                values: { "node.color": "red" },
                            },
                        },
                    ],
                },
                "make them bigger": {
                    text: "The servers are bigger now.",
                    toolCalls: [
                        {
                            id: "c2",
                            name: "style",
                            arguments: { action: "add", where: "data.type == 'server'", values: { "node.size": 2 } },
                        },
                    ],
                },
            },
        ),
    play: async ({ canvasElement }) => {
        const page = await readyPage(canvasElement);
        await drawn(canvasElement, "AI Control Remembered conversation");

        const first = await ask(canvasElement, page, "Color the servers red");
        await holds(first.code === "AI_COMPLETED", `the first message ended ${String(first.code)}`);
        const second = await ask(canvasElement, page, "Now make them bigger");
        await holds(second.code === "AI_COMPLETED", `the second message ended ${String(second.code)}`);

        // Remembered: the model was sent the first exchange along with the second message.
        const element = canvasElement.querySelector("graphty-element");
        const provider = element?.getAiManager()?.getProvider() as MockLlmProvider | undefined;
        const lastAsk = (provider?.getCallHistory() ?? [])
            .filter((call) =>
                call.messages.some((m) => m.role === "user" && m.content.includes("Now make them bigger")),
            )
            .at(-1);
        await holds(
            lastAsk?.messages.some((m) => m.role === "user" && m.content.includes("Color the servers red")) === true,
            "the second message was sent without the first: the conversation was not remembered",
        );

        const said = (element?.getAiConversation()?.messages ?? []).map((m) => `${m.role}:${m.text}`);
        await holds(
            JSON.stringify(said) ===
                JSON.stringify([
                    "reader:Color the servers red",
                    "assistant:I colored the four servers red.",
                    "reader:Now make them bigger",
                    "assistant:The servers are bigger now.",
                ]),
            `the conversation holds ${JSON.stringify(said)}`,
        );
        await holds(
            canvasElement.querySelectorAll("#transcript li").length === 4,
            "the page's transcript does not show the four messages",
        );
        await drawn(canvasElement, "AI Control Remembered conversation");
    },
};

/**
 * The assistant asks before it changes the graph (`approvals: "writes"`): the reader asks to
 * remove the monitoring node, the page draws the held call and Approve and Deny from
 * `ai-approval-requested`, nothing changes until the reader clicks Approve, and then the node goes
 * and the message ends with the model's answer.
 */
export const Approvals: Story = {
    render: () =>
        assistantPage(
            { history: "memory", approvals: "writes" },
            {
                "remove the monitoring": {
                    text: "I removed the monitoring node.",
                    toolCalls: [
                        { id: "r1", name: "edit_data", arguments: { action: "remove_nodes", ids: ["monitor"] } },
                    ],
                },
            },
        ),
    play: async ({ canvasElement }) => {
        const page = await readyPage(canvasElement);
        const before = await drawn(canvasElement, "AI Control Approvals");
        await assertGraphLoaded(before, { nodes: 12, edges: 20 });

        const held = await ask(canvasElement, page, "Remove the monitoring node");
        await holds(held.code === "AI_CONFIRMATION_NEEDED", `the message was not held: ${String(held.code)}`);
        await holds(before.session.status.counts.nodes === 12, "the node was removed before the reader approved");

        const approve = [...canvasElement.querySelectorAll<HTMLButtonElement>("#approval button")].find(
            (button) => button.textContent === "Approve",
        );
        await holds(approve !== undefined, "the page drew no Approve button for the request");
        await userEvent.click(approve as HTMLButtonElement);
        const { decided } = page;
        await holds(decided !== undefined, "clicking Approve did not answer the request");
        const final = (await decided) as ExecutionResult;

        await holds(final.code === "AI_COMPLETED", `approving ended ${String(final.code)}`);
        const after = await drawn(canvasElement, "AI Control Approvals");
        await holds(
            after.session.status.counts.nodes === 11 && after.session.data.node("monitor") === undefined,
            "approving did not remove the monitoring node",
        );
        await holds(canvasElement.querySelectorAll("#approval button").length === 0, "the approval card stayed up");
    },
};

/**
 * The assistant hands a task to a helper (`agents`): the reader asks to color the servers red, the
 * main model hands it to the `stylist` helper, which has only the `style` tool, and the page lists
 * what the helper did from `ai-agent-start` and `ai-agent-end`, with the tokens it used. The
 * transcript names the helper beside its own words. Every model turn is scripted, in order.
 */
export const Helpers: Story = {
    render: () =>
        assistantPage(
            {
                history: "memory",
                agents: [{ name: "stylist", purpose: "Color and size nodes", commands: ["style"] }],
            },
            [
                // The main model hands the task on.
                {
                    text: "",
                    toolCalls: [
                        {
                            id: "d1",
                            name: "delegate",
                            arguments: { agent: "stylist", task: "Color the four server nodes red" },
                        },
                    ],
                },
                // The stylist styles, then answers.
                {
                    text: "",
                    toolCalls: [
                        {
                            id: "s1",
                            name: "style",
                            arguments: {
                                action: "add",
                                where: "data.type == 'server'",
                                values: { "node.color": "red" },
                            },
                        },
                    ],
                    usage: { promptTokens: 400, completionTokens: 40 },
                },
                {
                    text: "I colored the four servers red.",
                    toolCalls: [],
                    usage: { promptTokens: 450, completionTokens: 10 },
                },
                // The main model answers the reader.
                { text: "The stylist colored the four servers red.", toolCalls: [] },
            ],
        ),
    play: async ({ canvasElement }) => {
        const page = await readyPage(canvasElement);
        await drawn(canvasElement, "AI Control Helpers");

        const result = await ask(canvasElement, page, "Color the servers red");
        await holds(result.code === "AI_COMPLETED", `the message ended ${String(result.code)}`);
        await holds(
            result.llmText === "The stylist colored the four servers red.",
            `the main model answered ${JSON.stringify(result.llmText)}`,
        );

        const logged = [...canvasElement.querySelectorAll("#helpers li")].map((item) => item.textContent);
        await holds(
            JSON.stringify(logged) ===
                JSON.stringify([
                    "stylist started: Color the four server nodes red",
                    "stylist ended AI_COMPLETED, 900 tokens",
                ]),
            `the page's helper list shows ${JSON.stringify(logged)}`,
        );

        // The helper's words and its style call are in the conversation, under its name.
        const element = canvasElement.querySelector("graphty-element");
        const said = (element?.getAiConversation()?.messages ?? []).filter(
            (message) => message.role === "assistant" && message.agent === "stylist",
        );
        await holds(
            said.some(
                (message) =>
                    message.role === "assistant" &&
                    message.calls.some((call) => call.command === "style" && call.code === "AI_COMPLETED"),
            ),
            "the conversation has no style call by the stylist",
        );
        await holds(
            canvasElement
                .querySelector("#transcript")
                ?.textContent?.includes("stylist: I colored the four servers red.") === true,
            "the page's transcript does not name the helper beside its answer",
        );
        await drawn(canvasElement, "AI Control Helpers");
    },
};

/**
 * The model asks the reader a question (`questions: true`): the reader asks to color their favorite
 * kind of node, the page draws the model's question and one button per choice from
 * `ai-question-asked`, nothing changes until the reader clicks one, and then the message goes on
 * with that answer and colors the databases. Every model turn is scripted, in order.
 */
export const Question: Story = {
    render: () =>
        assistantPage({ history: "memory", questions: true }, [
            {
                text: "",
                toolCalls: [
                    {
                        id: "q1",
                        name: "ask_reader",
                        arguments: {
                            question: "Which kind of node should I color red?",
                            choices: ["server", "database", "worker"],
                        },
                    },
                ],
            },
            // After the reader's answer.
            {
                text: "",
                toolCalls: [
                    {
                        id: "s1",
                        name: "style",
                        arguments: { action: "add", where: "data.type == 'database'", values: { "node.color": "red" } },
                    },
                ],
            },
            { text: "I colored the two databases red.", toolCalls: [] },
        ]),
    play: async ({ canvasElement }) => {
        const page = await readyPage(canvasElement);
        await drawn(canvasElement, "AI Control Question");

        const asked = await ask(canvasElement, page, "Color my favorite kind of node red");
        await holds(asked.code === "AI_QUESTION_ASKED", `the model asked nothing: ${String(asked.code)}`);
        const choices = [...canvasElement.querySelectorAll<HTMLButtonElement>("#question button")];
        await holds(
            JSON.stringify(choices.map((button) => button.textContent)) ===
                JSON.stringify(["server", "database", "worker"]),
            "the page did not draw one button per choice",
        );
        await holds(
            canvasElement.querySelector("#question p")?.textContent === "Which kind of node should I color red?",
            "the page did not draw the model's question",
        );
        const element = canvasElement.querySelector("graphty-element");
        await holds(element?.getPendingAiQuestions().length === 1, "the question is not pending");

        const database = choices.find((button) => button.textContent === "database");
        await holds(database !== undefined, "the page drew no database button");
        await userEvent.click(database as HTMLButtonElement);
        const { answered } = page;
        await holds(answered !== undefined, "clicking a choice did not answer the question");
        const final = (await answered) as ExecutionResult;

        await holds(final.code === "AI_COMPLETED", `answering ended ${String(final.code)}`);
        await holds(
            final.llmText === "I colored the two databases red.",
            `the model answered ${String(final.llmText)}`,
        );
        await holds(element?.getPendingAiQuestions().length === 0, "the question stayed open");
        await holds(canvasElement.querySelectorAll("#question button").length === 0, "the question card stayed up");
        const said = (element?.getAiConversation()?.messages ?? []).map((m) => `${m.role}:${m.text}`);
        await holds(
            said.includes("reader:database"),
            `the answer is not the reader's message: ${JSON.stringify(said)}`,
        );
        await drawn(canvasElement, "AI Control Question");
    },
};

/** The program the model writes: the mean degree from the query tool's counts. */
const MEAN_DEGREE = `const seen = await tools.query({ action: "overview" });
return (2 * seen.data.edges) / seen.data.nodes;`;

/**
 * The model runs a program in the page (`tools: { inPageCode: true }`): the reader asks for the
 * average degree, the model writes a short program that reads the graph's counts through
 * `tools.query` and returns the mean degree, the program runs in the page's sandbox, and the model
 * answers from its value. The page shows the program beside the transcript. Every model turn is
 * scripted, in order; the program itself really runs.
 */
export const RunCode: Story = {
    name: "Run code",
    render: () =>
        assistantPage({ history: "memory", tools: { inPageCode: true } }, [
            {
                text: "",
                toolCalls: [{ id: "code1", name: "run_code", arguments: { code: MEAN_DEGREE } }],
            },
            // After the program's value.
            { text: "The average degree is 3.33.", toolCalls: [] },
        ]),
    play: async ({ canvasElement }) => {
        const page = await readyPage(canvasElement);
        const before = await drawn(canvasElement, "AI Control Run code");
        const element = canvasElement.querySelector("graphty-element");
        await holds(
            element?.getAiCapabilities()?.tools["in-page-code"] === "available",
            "in-page code is not available on this page",
        );

        const result = await ask(canvasElement, page, "Use code to compute the average degree");
        await holds(result.code === "AI_COMPLETED", `the message ended ${String(result.code)}`);

        // The model was sent the program's value, and it is the graph's own mean degree.
        const provider = element?.getAiManager()?.getProvider() as QueuedProvider | undefined;
        const sent = (provider?.sent.at(-1) ?? []).find((message) => message.toolCallId === "code1")?.content ?? "";
        const json = sent.slice(sent.indexOf("{"), sent.lastIndexOf("}") + 1);
        const value = (JSON.parse(json === "" ? "{}" : json) as { data?: { value?: unknown } }).data?.value;
        const { nodes, edges } = before.session.status.counts;
        await holds(
            typeof value === "number" && Math.abs(value - (2 * edges) / nodes) < 1e-5,
            `the program returned ${JSON.stringify(value)}, not the mean degree ${String((2 * edges) / nodes)}`,
        );

        await holds(
            canvasElement.querySelector("#programs pre")?.textContent?.includes("tools.query") === true,
            "the page does not show the program the model ran",
        );
        await holds(
            canvasElement.querySelector("#transcript")?.textContent?.includes("[run_code]") === true,
            "the page's transcript does not show the run_code call",
        );
        await holds(before.session.status.counts.nodes === 12, "running code changed the graph");
        await drawn(canvasElement, "AI Control Run code");
    },
};

/**
 * How long the first press may take to load the voice chunk and read the page's speech support;
 * later presses take a frame. A budget for a condition, never a wait.
 */
const VOICE_LOAD_BUDGET_MS = 10_000;

/**
 * Throw unless `condition` holds, for `waitFor` to retry.
 * @param condition - What must hold.
 * @param complaint - What to say when it does not.
 */
function need(condition: boolean, complaint: string): void {
    if (!condition) {
        throw new Error(complaint);
    }
}

/** What the scripted recognizer hears, one utterance per press, in order. */
const SPOKEN: string[] = [];

/** Every microphone stream the scripted page opened. */
const OPENED: MediaStream[] = [];

/**
 * A recognizer that hears the next scripted utterance as soon as it starts, in place of the
 * browser's under automation, where nobody speaks.
 */
class ScriptedRecognition {
    continuous = false;
    interimResults = false;
    lang = "";
    processLocally?: boolean;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    onstart: (() => void) | null = null;

    start(): void {
        const said = SPOKEN.shift() ?? "";
        queueMicrotask(() => {
            this.onstart?.();
            this.onresult?.({
                resultIndex: 0,
                results: [Object.assign([{ transcript: said, confidence: 1 }], { isFinal: true })],
            });
        });
    }

    stop(): void {
        queueMicrotask(() => this.onend?.());
    }

    abort(): void {
        this.stop();
    }
}

/**
 * Under automation (Playwright sets `navigator.webdriver`), replace the browser's recognizer with
 * {@link ScriptedRecognition} and the microphone with a silent stream; on a real device, change
 * nothing, so the story runs the device's own speech paths.
 * @returns Puts the browser's own back.
 */
function scriptSpeech(): (() => void) | undefined {
    if (!navigator.webdriver) {
        return undefined;
    }

    const names = ["SpeechRecognition", "webkitSpeechRecognition"] as const;
    const saved = names.map((name) => Object.getOwnPropertyDescriptor(window, name));
    for (const name of names) {
        Object.defineProperty(window, name, {
            value: name === "webkitSpeechRecognition" ? ScriptedRecognition : undefined,
            configurable: true,
            writable: true,
        });
    }

    const { mediaDevices } = navigator;
    mediaDevices.getUserMedia = () => {
        const { stream } = new AudioContext().createMediaStreamDestination();
        OPENED.push(stream);
        return Promise.resolve(stream);
    };
    try {
        // A probe remembered by an earlier run would choose the path for this one.
        localStorage.removeItem("@graphty-ai-voice:recognition");
    } catch {
        // No storage: nothing is remembered either.
    }

    return () => {
        names.forEach((name, i) => {
            const descriptor = saved[i];
            if (descriptor === undefined) {
                Reflect.deleteProperty(window, name);
            } else {
                Object.defineProperty(window, name, descriptor);
            }
        });
        Reflect.deleteProperty(mediaDevices, "getUserMedia");
        SPOKEN.length = 0;
        OPENED.length = 0;
    };
}

/**
 * Hold the page's talk button, as a reader does, until the recognizer has heard `utterance`, then
 * let go.
 * @param canvasElement - Where the story was rendered.
 * @param utterance - What the reader says.
 * @returns How the press ended (`ai-voice-end`'s code).
 */
async function speak(canvasElement: HTMLElement, utterance: string): Promise<string | undefined> {
    const element = await renderedElement(canvasElement, "the story rendered no <graphty-element>");
    const talk = canvasElement.querySelector<HTMLButtonElement>("#talk");
    await holds(talk !== null, "the page has no talk button");
    SPOKEN.push(utterance);
    const ended = new Promise<string | undefined>((resolve) => {
        element.addEventListener(
            "ai-voice-end",
            (e) => {
                resolve(e.detail.code);
            },
            { once: true },
        );
    });
    // One user for the whole press, so the release lets go of the button the press holds.
    const user = userEvent.setup();
    await user.pointer({ keys: "[MouseLeft>]", target: talk as HTMLButtonElement });
    await waitFor(
        () => {
            need(
                canvasElement.querySelector("#voice-status")?.textContent === utterance,
                `"${utterance}" was not heard`,
            );
        },
        { timeout: VOICE_LOAD_BUDGET_MS },
    );
    await user.pointer({ keys: "[/MouseLeft]", target: talk as HTMLButtonElement });
    return ended;
}

/**
 * The reader talks to the assistant (`voice`): they hold "Hold to talk" and say "Color the servers
 * red", and the message is sent as spoken; they say "Remove the monitoring node", which is held
 * for approval (`approvals: { ask: ["edit_data"] }`), and answer it by saying "Yes.". The page
 * draws what is heard and the microphone's level from the voice events. The answers are the mock
 * provider's, scripted.
 *
 * Under automation the recognizer and the microphone are scripted fakes and the play function
 * talks. On a real device -- a desktop browser, Quest Browser, Galaxy XR, Vision Pro -- nothing is
 * faked and the play function does nothing: hold the button (or, in VR, B or Y, or the wrist orb)
 * and say one of the two requests, then "yes" or "no", to check the device's own recognition,
 * speech and in-scene approval.
 */
export const Voice: Story = {
    beforeEach: scriptSpeech,
    render: () => {
        const root = assistantPage(
            { history: "memory", approvals: { ask: ["edit_data"] }, voice: { input: "auto", output: "auto" } },
            {
                "servers red": {
                    text: "I colored the four servers red.",
                    toolCalls: [
                        {
                            id: "c1",
                            name: "style",
                            arguments: {
                                action: "add",
                                where: "data.type == 'server'",
                                values: { "node.color": "red" },
                            },
                        },
                    ],
                },
                "remove the monitoring": {
                    text: "I removed the monitoring node.",
                    toolCalls: [
                        { id: "r1", name: "edit_data", arguments: { action: "remove_nodes", ids: ["monitor"] } },
                    ],
                },
            },
        );
        // On a headset the story is the device check, so it offers VR and AR.
        const element = root.querySelector("graphty-element");
        if (element !== null && !navigator.webdriver) {
            element.xr = { enabled: true };
        }

        return root;
    },
    play: async ({ canvasElement }) => {
        if (!navigator.webdriver) {
            return;
        }

        await readyPage(canvasElement);
        const before = await drawn(canvasElement, "AI Control Voice");
        await assertGraphLoaded(before, { nodes: 12, edges: 20 });
        const element = await renderedElement(canvasElement, "the story rendered no <graphty-element>");
        const support = await element.getAiVoiceSupport();
        await holds(support.input.path === "browser", `speech would be heard by ${support.input.path}`);

        const first = await speak(canvasElement, "Color the servers red");
        await holds(first === "AI_COMPLETED", `the first press ended ${String(first)}`);
        await waitFor(() => {
            need(element.getAiConversation()?.messages.length === 2, "the spoken request was not answered");
        });
        const spoken = element.getAiConversation()?.messages[0];
        await holds(
            spoken?.role === "reader" && spoken.via === "voice" && spoken.text === "Color the servers red",
            `the first message is ${JSON.stringify(spoken)}, not the spoken request`,
        );
        await holds(
            canvasElement.querySelector("#transcript")?.textContent?.includes("You (spoken): Color the servers red") ===
                true,
            "the page's transcript does not show the spoken message",
        );

        await speak(canvasElement, "Remove the monitoring node");
        await waitFor(() => {
            need(element.getPendingAiApprovals().length === 1, "the spoken removal was not held for approval");
        });
        await holds(before.session.status.counts.nodes === 12, "the node was removed before the reader approved");

        // Answered by voice: "Yes." approves the held request, and is not sent as a message.
        await speak(canvasElement, "Yes.");
        await waitFor(() => {
            need(before.session.status.counts.nodes === 11, "saying yes did not remove the monitoring node");
        });
        await holds(element.getPendingAiApprovals().length === 0, "the approval stayed open");
        await holds(
            !(element.getAiConversation()?.messages ?? []).some((m) => m.role === "reader" && m.text === "Yes."),
            "the spoken answer was sent as a message",
        );

        const live = OPENED.flatMap((stream) => stream.getTracks()).filter((track) => track.readyState === "live");
        await holds(
            OPENED.length === 3 && live.length === 0,
            `${String(live.length)} microphone tracks are still open`,
        );
        await drawn(canvasElement, "AI Control Voice");
    },
};

/** What the "Live voice" story's scripted provider hears and does, one press. */
const LIVE_SCRIPT = [
    {
        heard: "Make the servers red",
        calls: [
            {
                id: "live1",
                name: "style",
                arguments: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
            },
        ],
        answer: "I colored the four servers red.",
    },
];

/** The scripted live engine of each "Live voice" page, by its root, for the play function. */
const liveEngines = new WeakMap<Element, ReturnType<typeof scriptedLiveEngine>>();

/**
 * The reader holds a live conversation with the assistant (`voice: { mode: "live" }`): they hold
 * "Hold to talk", say "Make the servers red" and let go; the provider hears it, the model colors
 * the four servers red through the assistant's own tools, and its answer is spoken and saved as
 * one voice message. The page is the AI guide's simple path, unchanged from turn by turn.
 *
 * The provider is a scripted live connection (`src/testing/fakeLive.ts`), so nothing is sent
 * anywhere and no key is needed, on a device as in a test: on a headset it checks the talk
 * bindings (B or Y, the wrist orb) and the in-scene panel in live mode, not the provider's audio.
 *
 * Live voice needs a secure page: open this Storybook over HTTPS or on localhost. Over plain HTTP
 * on a hostname, live is unavailable (`insecure-context`) and the play function fails.
 */
export const LiveVoice: Story = {
    name: "Live voice",
    render: () => {
        const engine = scriptedLiveEngine(LIVE_SCRIPT);
        const root = assistantPage({ history: "memory", voice: { mode: "live", output: "on" } }, {}, engine);
        liveEngines.set(root, engine);
        const element = root.querySelector("graphty-element");
        if (element !== null && !navigator.webdriver) {
            element.xr = { enabled: true };
        }

        return root;
    },
    play: async ({ canvasElement }) => {
        await readyPage(canvasElement);
        const before = await drawn(canvasElement, "AI Control Live voice");
        await assertGraphLoaded(before, { nodes: 12, edges: 20 });
        const element = await renderedElement(canvasElement, "the story rendered no <graphty-element>");
        const engine =
            canvasElement.firstElementChild === null ? undefined : liveEngines.get(canvasElement.firstElementChild);
        const support = await element.getAiVoiceSupport();
        await holds(
            support.live?.path === "provider",
            `a live conversation cannot run here: ${JSON.stringify(support.live?.params)}`,
        );

        // Hold "Hold to talk" with the real pointer, then let go.
        const talk = canvasElement.querySelector<HTMLButtonElement>("#talk");
        await holds(talk !== null, "the page has no talk button");
        const user = userEvent.setup();
        await user.pointer({ keys: "[MouseLeft>]", target: talk as HTMLButtonElement });
        await waitFor(
            () => {
                need(
                    canvasElement.querySelector("#voice-status")?.textContent === "Listening (live)",
                    "the press did not start a live conversation",
                );
            },
            { timeout: VOICE_LOAD_BUDGET_MS },
        );
        await user.pointer({ keys: "[/MouseLeft]", target: talk as HTMLButtonElement });

        await waitFor(() => {
            need(
                (element.getAiConversation()?.messages ?? []).some(
                    (m) => m.role === "assistant" && m.text === "I colored the four servers red.",
                ),
                "the spoken request was not answered",
            );
        });
        const messages = element.getAiConversation()?.messages ?? [];
        const [spoken] = messages;
        await holds(
            spoken?.role === "reader" && spoken.via === "voice" && spoken.text === "Make the servers red",
            `the first message is ${JSON.stringify(spoken)}, not the spoken request`,
        );
        await holds(
            messages.filter((m) => m.role === "reader").length === 1 &&
                messages.some(
                    (m) =>
                        m.role === "assistant" &&
                        m.calls.some((call) => call.command === "style" && call.code === "AI_COMPLETED"),
                ),
            "the spoken request was not one message whose style call ran",
        );
        await waitFor(() => {
            need(
                canvasElement
                    .querySelector("#transcript")
                    ?.textContent?.includes("Assistant: I colored the four servers red.") === true,
                "the page's transcript does not show the spoken answer",
            );
        });
        await holds(
            JSON.stringify(engine?.liveConnections.map((connection) => connection.captures)) === "[[true,false]]",
            "the microphone was not sent exactly while talk was held, on one connection",
        );
        await drawn(canvasElement, "AI Control Live voice");
    },
};
