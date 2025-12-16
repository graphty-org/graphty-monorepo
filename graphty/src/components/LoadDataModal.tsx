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
import {AlertCircle, Clipboard, FileText, Link, Upload} from "lucide-react";
import {useCallback, useState} from "react";

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

interface LoadDataModalProps {
    opened: boolean;
    onClose: () => void;
    onLoad: (request: LoadDataRequest) => void;
}

interface DetectionResult {
    format: FormatType | null;
    confidence: "high" | "medium" | "low";
}

const FORMAT_OPTIONS = [
    {value: "auto", label: "Auto-detect"},
    {value: "json", label: "JSON"},
    {value: "graphml", label: "GraphML"},
    {value: "gexf", label: "GEXF"},
    {value: "csv", label: "CSV"},
    {value: "gml", label: "GML"},
    {value: "dot", label: "DOT (Graphviz)"},
    {value: "pajek", label: "Pajek NET"},
];

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
    const ext = (/\.[^.]+$/.exec(filename.toLowerCase()))?.[0];
    if (ext && ext in FORMAT_EXTENSIONS) {
        return FORMAT_EXTENSIONS[ext];
    }

    return null;
}

function detectFormatFromContent(content: string): DetectionResult {
    const trimmed = content.trim();

    // XML-based formats
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
        if (trimmed.includes("xmlns=\"http://graphml.graphdrawing.org")) {
            return {format: "graphml", confidence: "high"};
        }

        if (trimmed.includes("xmlns=\"http://gexf.net")) {
            return {format: "gexf", confidence: "high"};
        }

        // Generic XML - could be GraphML or GEXF
        return {format: "graphml", confidence: "low"};
    }

    // JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return {format: "json", confidence: "high"};
    }

    // GML
    if (/graph\s*\[/i.test(trimmed)) {
        return {format: "gml", confidence: "high"};
    }

    // Pajek
    if (/^\*vertices/i.test(trimmed)) {
        return {format: "pajek", confidence: "high"};
    }

    // DOT
    if (/^\s*(strict\s+)?(di)?graph\s+/i.test(trimmed)) {
        return {format: "dot", confidence: "high"};
    }

    // CSV (very generic, check last)
    if (/^[\w-]+\s*,\s*[\w-]+/m.test(trimmed)) {
        return {format: "csv", confidence: "medium"};
    }

    return {format: null, confidence: "low"};
}

export function LoadDataModal({opened, onClose, onLoad}: LoadDataModalProps): React.JSX.Element {
    const [inputMethod, setInputMethod] = useState<InputMethod>("file");
    const [selectedFormat, setSelectedFormat] = useState<FormatType>("auto");
    const [detectedFormat, setDetectedFormat] = useState<DetectionResult | null>(null);
    const [url, setUrl] = useState("");
    const [pastedContent, setPastedContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replaceExisting, setReplaceExisting] = useState(true);

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
            setDetectedFormat({format: formatFromName, confidence: "high"});
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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0] as File | undefined;
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleUrlChange = useCallback((value: string) => {
        setUrl(value);
        setError(null);

        // Detect format from URL extension
        if (value) {
            const formatFromUrl = detectFormatFromFilename(value);
            if (formatFromUrl) {
                setDetectedFormat({format: formatFromUrl, confidence: "medium"});
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

    const handleLoad = useCallback(() => {
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

        onLoad(request);
        handleClose();
    }, [inputMethod, selectedFile, url, pastedContent, getEffectiveFormat, onLoad, handleClose, replaceExisting]);

    const canLoad = useCallback((): boolean => {
        const hasData = (inputMethod === "file" && selectedFile !== null) ||
            (inputMethod === "url" && url.trim() !== "") ||
            (inputMethod === "paste" && pastedContent.trim() !== "");

        // For URL and file, we can use auto-detection even without a detected format
        // For paste, we need either explicit format or detected format
        const hasFormat = selectedFormat !== "auto" ||
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
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Load Data"
            size="lg"
            centered
            styles={{
                header: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                },
                body: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    padding: "20px",
                },
                content: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                },
                title: {
                    color: "var(--mantine-color-gray-1)",
                    fontWeight: 500,
                },
            }}
        >
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
                            backgroundColor: "var(--mantine-color-dark-6)",
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
                            border: `2px dashed ${isDragging ? "var(--mantine-color-blue-5)" : "var(--mantine-color-dark-4)"}`,
                            borderRadius: "8px",
                            padding: "40px 20px",
                            textAlign: "center",
                            cursor: "pointer",
                            backgroundColor: isDragging ? "var(--mantine-color-dark-6)" : "transparent",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".json,.graphml,.xml,.gexf,.csv,.edges,.edgelist,.gml,.dot,.gv,.net,.paj"
                            onChange={handleFileInputChange}
                            style={{display: "none"}}
                        />
                        <Upload
                            size={32}
                            style={{
                                color: "var(--mantine-color-dark-3)",
                                marginBottom: "12px",
                            }}
                        />
                        {selectedFile ? (
                            <>
                                <Text size="sm" c="gray.1" fw={500}>
                                    {selectedFile.name}
                                </Text>
                                <Text size="xs" c="gray.5" mt="xs">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text size="sm" c="gray.3">
                                    Drag & drop a file here
                                </Text>
                                <Text size="xs" c="gray.5" mt="xs">
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
                            label: {color: "var(--mantine-color-gray-3)"},
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
                            label: {color: "var(--mantine-color-gray-3)"},
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
                        label: {color: "var(--mantine-color-gray-3)"},
                        description: {
                            color: detectedFormat?.format ? "var(--mantine-color-green-5)" : "var(--mantine-color-gray-5)",
                        },
                    }}
                />

                {/* Supported Formats Help */}
                <Text size="xs" c="gray.5">
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
                        label: {color: "var(--mantine-color-gray-1)"},
                        description: {color: "var(--mantine-color-gray-5)"},
                    }}
                />

                {/* Error Display */}
                {error && (
                    <Group gap="xs" style={{color: "var(--mantine-color-red-5)"}}>
                        <AlertCircle size={16} />
                        <Text size="sm">{error}</Text>
                    </Group>
                )}

                {/* Action Buttons */}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLoad}
                        disabled={!canLoad()}
                        leftSection={<Upload size={16} />}
                    >
                        Load {getFormatDisplay() !== "Auto-detect" ? getFormatDisplay() : "Data"}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
