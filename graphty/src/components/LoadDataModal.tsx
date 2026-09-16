import {
    Box,
    Button,
    Checkbox,
    Group,
    Modal,
    SegmentedControl,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
} from "@mantine/core";
import { AlertCircle, Clipboard, FileText, Link, Upload } from "lucide-react";
import { useCallback, useState } from "react";

import { standardModalStyles } from "../utils/modal-styles";

type InputMethod = "file" | "url" | "paste";
type FormatType = "auto" | "json" | "graphml" | "gexf" | "csv" | "gml" | "dot" | "pajek";

export interface LoadDataRequest {
    inputMethod: InputMethod;
    format: FormatType;
    url?: string;
    file?: File;
    data?: string;
    replaceExisting: boolean;
}

/**
 * Props of {@link LoadDataModal}.
 *
 * Exported, unlike the bare interface this replaces, because the dialog's contract is
 * now something a caller has to read rather than guess: `onLoad` returns a promise and
 * the dialog AWAITS it. Every other panel body in the shell (`DataPanelProps`,
 * `WelcomeStateProps`) already publishes its props for the same reason.
 * @public
 */
export interface LoadDataModalProps {
    /** Whether the dialog is on screen. */
    readonly opened: boolean;
    /** Closes the dialog. The dialog resets its own inputs before calling it. */
    readonly onClose: () => void;
    /**
     * Loads what the reader chose.
     *
     * The dialog awaits it, closes on a resolution and STAYS OPEN on a rejection with
     * the reason in its own error line. That is the whole reason the return type is a
     * promise: `handleClose` resets the inputs, so a dialog that closed on a failed load
     * destroyed the file, URL or pasted text the reader would need to try again, and
     * spec 1107-1108 says errors stop the import rather than quietly finishing it.
     *
     * WHAT THIS ASKS OF A CALLER, and why the sentence above was not enough on its own.
     * The promise must not resolve until the data has actually been READ. The shell's
     * `handleLoad` used to resolve as soon as graphty-element had accepted the bytes --
     * the app's load path ends in a property assignment and the element reports a parse
     * failure later, out of band, through its `data-loading-error` event rather than by
     * rejecting anything -- so for a malformed paste and a malformed file, which are the
     * failures this contract exists for, the promise resolved, this dialog closed, and
     * `resetState` destroyed the reader's text a beat before the failure was reported
     * anywhere. A caller that resolves on acceptance rather than on arrival keeps every
     * word of the contract above and still loses the input. The shell now waits for the
     * element's own `data-loaded` / `data-loading-error` before settling this promise.
     *
     * Because of that wait, this can take as long as the load takes. The dialog shows the
     * Load button busy for the whole of it and refuses a second press, and its Cancel
     * stays live: a reader who does not want to wait may leave, and the shell reports the
     * failure on its own surfaces if one arrives afterwards.
     */
    readonly onLoad: (request: LoadDataRequest) => Promise<void>;
}

interface DetectionResult {
    format: FormatType | null;
    confidence: "high" | "medium" | "low";
}

const FORMAT_OPTIONS = [
    { value: "auto", label: "Auto-detect" },
    { value: "json", label: "JSON" },
    { value: "graphml", label: "GraphML" },
    { value: "gexf", label: "GEXF" },
    { value: "csv", label: "CSV" },
    { value: "gml", label: "GML" },
    { value: "dot", label: "DOT (Graphviz)" },
    { value: "pajek", label: "Pajek NET" },
];

/** What the error line says when the refusal carried no message of its own. */
const UNREADABLE_LOAD_ERROR = "The data could not be loaded, and the loader gave no reason.";

const FORMAT_EXTENSIONS: Record<string, FormatType> = {
    ".json": "json",
    ".graphml": "graphml",
    ".xml": "graphml", // Could also be GEXF, will check content
    ".gexf": "gexf",
    ".csv": "csv",
    ".edges": "csv",
    ".edgelist": "csv",
    ".gml": "gml",
    ".dot": "dot",
    ".gv": "dot",
    ".net": "pajek",
    ".paj": "pajek",
};

function detectFormatFromFilename(filename: string): FormatType | null {
    const ext = /\.[^.]+$/.exec(filename.toLowerCase())?.[0];
    if (ext && ext in FORMAT_EXTENSIONS) {
        return FORMAT_EXTENSIONS[ext];
    }

    return null;
}

/**
 * What the dialog's error line says about a load that was refused.
 *
 * The rejection reaches here from the shell, which reaches it from `GraphtyHandle` or
 * from graphty-element, so its message is written by whoever actually knew what was
 * wrong and is printed as it stands. What is never printed is a thrown value that reads
 * as nothing at all: an empty message, or the `[object Object]` that stringifying a
 * plain object would produce -- which is why an object is not stringified here. Either
 * of those at a reader is the silent failure again, one indirection further along.
 * @param error - whatever the load rejected with.
 * @returns one sentence for the dialog's error line, never empty.
 */
function loadFailureMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message.trim() === "" ? UNREADABLE_LOAD_ERROR : error.message.trim();
    }

    if (typeof error === "string" && error.trim() !== "") {
        return error.trim();
    }

    return UNREADABLE_LOAD_ERROR;
}

function detectFormatFromContent(content: string): DetectionResult {
    const trimmed = content.trim();

    // XML-based formats
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
        if (trimmed.includes('xmlns="http://graphml.graphdrawing.org')) {
            return { format: "graphml", confidence: "high" };
        }

        if (trimmed.includes('xmlns="http://gexf.net')) {
            return { format: "gexf", confidence: "high" };
        }

        // Generic XML - could be GraphML or GEXF
        return { format: "graphml", confidence: "low" };
    }

    // JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return { format: "json", confidence: "high" };
    }

    // GML
    if (/graph\s*\[/i.test(trimmed)) {
        return { format: "gml", confidence: "high" };
    }

    // Pajek
    if (/^\*vertices/i.test(trimmed)) {
        return { format: "pajek", confidence: "high" };
    }

    // DOT
    if (/^\s*(strict\s+)?(di)?graph\s+/i.test(trimmed)) {
        return { format: "dot", confidence: "high" };
    }

    // CSV (very generic, check last)
    if (/^[\w-]+\s*,\s*[\w-]+/m.test(trimmed)) {
        return { format: "csv", confidence: "medium" };
    }

    return { format: null, confidence: "low" };
}

/**
 * Modal for loading graph data from file, URL, or pasted content.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Close the modal
 * @param root0.onLoad - Called with the load request; awaited, so a rejection keeps the
 * dialog open with the reader's file, URL or pasted text still in it
 * @returns The load data modal component
 */
export function LoadDataModal({ opened, onClose, onLoad }: LoadDataModalProps): React.JSX.Element {
    const [inputMethod, setInputMethod] = useState<InputMethod>("file");
    const [selectedFormat, setSelectedFormat] = useState<FormatType>("auto");
    const [detectedFormat, setDetectedFormat] = useState<DetectionResult | null>(null);
    const [url, setUrl] = useState("");
    const [pastedContent, setPastedContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(true);
    /* Whether a load is in flight. It is not cosmetic: `onLoad` now settles only once
       graphty-element has said what became of the data, so the press and the answer are
       seconds apart on a large file, and a dialog that looked idle in between invited a
       second press that would start a second load over the first. */
    const [isLoading, setIsLoading] = useState(false);

    const resetState = useCallback(() => {
        setSelectedFormat("auto");
        setDetectedFormat(null);
        setUrl("");
        setPastedContent("");
        setSelectedFile(null);
        setError(null);
        setReplaceExisting(true);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const handleFileSelect = useCallback((file: File) => {
        setSelectedFile(file);
        setError(null);

        // Detect format from filename
        const formatFromName = detectFormatFromFilename(file.name);
        if (formatFromName) {
            setDetectedFormat({ format: formatFromName, confidence: "high" });
        } else {
            // Read content to detect format
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const detection = detectFormatFromContent(content.slice(0, 1000)); // Check first 1KB
                setDetectedFormat(detection);
            };
            reader.readAsText(file.slice(0, 1000));
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0] as File | undefined;
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect],
    );

    const handleUrlChange = useCallback((value: string) => {
        setUrl(value);
        setError(null);

        // Detect format from URL extension
        if (value) {
            const formatFromUrl = detectFormatFromFilename(value);
            if (formatFromUrl) {
                setDetectedFormat({ format: formatFromUrl, confidence: "medium" });
            } else {
                setDetectedFormat(null);
            }
        } else {
            setDetectedFormat(null);
        }
    }, []);

    const handlePasteChange = useCallback((value: string) => {
        setPastedContent(value);
        setError(null);

        if (value.trim()) {
            const detection = detectFormatFromContent(value);
            setDetectedFormat(detection);
        } else {
            setDetectedFormat(null);
        }
    }, []);

    const getEffectiveFormat = useCallback((): FormatType | null => {
        if (selectedFormat !== "auto") {
            return selectedFormat;
        }

        return detectedFormat?.format ?? null;
    }, [selectedFormat, detectedFormat]);

    const handleLoad = useCallback(async (): Promise<void> => {
        if (isLoading) {
            return;
        }

        const format = getEffectiveFormat();

        // For auto format with URL or file, we can let graphty-element do the detection
        // For paste, we need at least a detected format
        if (!format && inputMethod === "paste") {
            setError("Could not determine file format. Please select a format manually.");
            return;
        }

        const request: LoadDataRequest = {
            inputMethod,
            format: format ?? "auto",
            replaceExisting,
        };

        if (inputMethod === "file" && selectedFile) {
            request.file = selectedFile;
        } else if (inputMethod === "url" && url) {
            request.url = url;
        } else if (inputMethod === "paste" && pastedContent) {
            request.data = pastedContent;
        } else {
            setError("Please provide data to load.");
            return;
        }

        /* The dialog closes only once the load has ARRIVED, which is a stronger claim than
           the one this comment used to make and the reason the wait exists at all.
           `handleClose` calls `resetState`, which drops the selected file, the URL and the
           pasted text -- exactly what the reader needs to fix a separator, a format or a
           typo and try again -- so closing first and reporting the failure somewhere else
           takes the input away at the one moment it matters.

           It used to do precisely that on the commonest failure there is. `onLoad`
           resolved as soon as graphty-element had accepted the bytes, because the app's
           load path ends in a property assignment and the element reports a parse failure
           afterwards through its own `data-loading-error` event instead of rejecting. So a
           malformed paste closed this dialog, `resetState` wiped the textarea, and the
           sentence about it appeared in the canvas a beat later with no way back to the
           text. The fix is in the shell, which now settles this promise on the element's
           report rather than on its acceptance (`AppShell.handleLoad`); what is here is
           the busy state that wait made necessary.

           The error goes to the block this component already has (the AlertCircle line
           below), which is where the two pre-flight refusals above already land. */
        setIsLoading(true);

        try {
            await onLoad(request);
        } catch (loadError: unknown) {
            setError(loadFailureMessage(loadError));

            return;
        } finally {
            setIsLoading(false);
        }

        handleClose();
    }, [
        inputMethod,
        isLoading,
        selectedFile,
        url,
        pastedContent,
        getEffectiveFormat,
        onLoad,
        handleClose,
        replaceExisting,
    ]);

    const canLoad = useCallback((): boolean => {
        const hasData =
            (inputMethod === "file" && selectedFile !== null) ||
            (inputMethod === "url" && url.trim() !== "") ||
            (inputMethod === "paste" && pastedContent.trim() !== "");

        // For URL and file, we can use auto-detection even without a detected format
        // For paste, we need either explicit format or detected format
        const hasFormat =
            selectedFormat !== "auto" ||
            detectedFormat?.format !== null ||
            inputMethod === "url" ||
            inputMethod === "file";

        return hasData && hasFormat;
    }, [inputMethod, selectedFile, url, pastedContent, selectedFormat, detectedFormat]);

    const getFormatDisplay = (): string => {
        if (selectedFormat !== "auto") {
            return FORMAT_OPTIONS.find((o) => o.value === selectedFormat)?.label ?? selectedFormat;
        }

        if (detectedFormat?.format) {
            const label = FORMAT_OPTIONS.find((o) => o.value === detectedFormat.format)?.label ?? detectedFormat.format;
            return `${label} (detected)`;
        }

        // For URL and file, show that auto-detect will be used
        if (inputMethod === "url" || inputMethod === "file") {
            return "Auto-detect";
        }

        return "Auto-detect";
    };

    const getFormatDescription = (): string => {
        if (detectedFormat?.format && selectedFormat === "auto") {
            const label = FORMAT_OPTIONS.find((o) => o.value === detectedFormat.format)?.label ?? detectedFormat.format;
            return `Detected: ${label} (${detectedFormat.confidence} confidence)`;
        }

        if ((inputMethod === "url" || inputMethod === "file") && selectedFormat === "auto") {
            return "Format will be auto-detected from URL/file";
        }

        return "Select a format or use auto-detect";
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Load Data" size="lg" centered styles={standardModalStyles}>
            <Stack gap="lg">
                {/* Input Method Tabs */}
                <SegmentedControl
                    value={inputMethod}
                    onChange={(value) => {
                        setInputMethod(value as InputMethod);
                        setDetectedFormat(null);
                        setError(null);
                    }}
                    data={[
                        {
                            value: "file",
                            label: (
                                <Group gap="xs" wrap="nowrap">
                                    <FileText size={14} />
                                    <span>File</span>
                                </Group>
                            ),
                        },
                        {
                            value: "url",
                            label: (
                                <Group gap="xs" wrap="nowrap">
                                    <Link size={14} />
                                    <span>URL</span>
                                </Group>
                            ),
                        },
                        {
                            value: "paste",
                            label: (
                                <Group gap="xs" wrap="nowrap">
                                    <Clipboard size={14} />
                                    <span>Paste</span>
                                </Group>
                            ),
                        },
                    ]}
                    fullWidth
                    styles={{
                        root: {
                            backgroundColor: "var(--mantine-color-default)",
                        },
                    }}
                />

                {/* File Input */}
                {inputMethod === "file" && (
                    <Box
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => document.getElementById("file-input")?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? "var(--mantine-color-blue-5)" : "var(--mantine-color-default-border)"}`,
                            borderRadius: "8px",
                            padding: "40px 20px",
                            textAlign: "center",
                            cursor: "pointer",
                            backgroundColor: isDragging ? "var(--mantine-color-default)" : "transparent",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".json,.graphml,.xml,.gexf,.csv,.edges,.edgelist,.gml,.dot,.gv,.net,.paj"
                            onChange={handleFileInputChange}
                            style={{ display: "none" }}
                        />
                        <Upload
                            size={32}
                            style={{
                                color: "var(--mantine-color-dimmed)",
                                marginBottom: "12px",
                            }}
                        />
                        {selectedFile ? (
                            <>
                                <Text size="sm" fw={500}>
                                    {selectedFile.name}
                                </Text>
                                <Text size="xs" c="dimmed" mt="xs">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text size="sm" c="dimmed">
                                    Drag & drop a file here
                                </Text>
                                <Text size="xs" c="dimmed" mt="xs">
                                    or click to browse
                                </Text>
                            </>
                        )}
                    </Box>
                )}

                {/* URL Input */}
                {inputMethod === "url" && (
                    <TextInput
                        label="Data URL"
                        placeholder="https://example.com/data/graph.json"
                        value={url}
                        onChange={(e) => {
                            handleUrlChange(e.currentTarget.value);
                        }}
                        leftSection={<Link size={14} />}
                        styles={{
                            label: { color: "var(--mantine-color-dimmed)" },
                        }}
                    />
                )}

                {/* Paste Input */}
                {inputMethod === "paste" && (
                    <Textarea
                        label="Paste graph data"
                        placeholder={`{
  "nodes": [
    {"id": "a", "label": "Node A"},
    {"id": "b", "label": "Node B"}
  ],
  "edges": [
    {"source": "a", "target": "b"}
  ]
}`}
                        value={pastedContent}
                        onChange={(e) => {
                            handlePasteChange(e.currentTarget.value);
                        }}
                        minRows={8}
                        maxRows={12}
                        autosize
                        styles={{
                            label: { color: "var(--mantine-color-dimmed)" },
                            input: {
                                fontFamily: "monospace",
                                fontSize: "12px",
                            },
                        }}
                    />
                )}

                {/* Format Selection */}
                <Select
                    label="Format"
                    description={getFormatDescription()}
                    value={selectedFormat}
                    onChange={(value) => {
                        setSelectedFormat(value ? (value as FormatType) : "auto");
                    }}
                    data={FORMAT_OPTIONS}
                    styles={{
                        label: { color: "var(--mantine-color-dimmed)" },
                        description: {
                            color: detectedFormat?.format
                                ? "var(--mantine-color-green-5)"
                                : "var(--mantine-color-dimmed)",
                        },
                    }}
                />

                {/* Supported Formats Help */}
                <Text size="xs" c="dimmed">
                    Supported formats: JSON, GraphML, GEXF, CSV, GML, DOT, Pajek NET
                </Text>

                {/* Replace Existing Data Checkbox */}
                <Checkbox
                    label="Replace existing data"
                    description="Remove all existing nodes and edges before loading"
                    checked={replaceExisting}
                    onChange={(e) => {
                        setReplaceExisting(e.currentTarget.checked);
                    }}
                    styles={{
                        description: { color: "var(--mantine-color-dimmed)" },
                    }}
                />

                {/* Error Display */}
                {error && (
                    <Group gap="xs" style={{ color: "var(--mantine-color-red-5)" }}>
                        <AlertCircle size={16} />
                        <Text size="sm">{error}</Text>
                    </Group>
                )}

                {/* Action Buttons */}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={handleClose}>
                        Cancel
                    </Button>
                    {/* Busy for the whole of the wait, which is now as long as the load
                        takes rather than as long as the assignment takes: Mantine's own
                        loading state, so this control behaves like every other button in
                        the app and nothing bespoke is invented for it. */}
                    <Button
                        onClick={() => {
                            void handleLoad();
                        }}
                        disabled={!canLoad() || isLoading}
                        loading={isLoading}
                        leftSection={<Upload size={16} />}
                    >
                        Load {getFormatDisplay() !== "Auto-detect" ? getFormatDisplay() : "Data"}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
