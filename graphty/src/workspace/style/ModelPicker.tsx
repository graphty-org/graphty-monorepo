import type { AssetSource } from "@graphty/graphty-element/session";
import { Button, Group, Image, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { Upload } from "lucide-react";
import React, { useRef, useState } from "react";

import { modelName, readDrop } from "../canvas/models";
import { useWorkspace } from "../state/WorkspaceContext";
import { modelWords } from "./words";

/** The files the file chooser offers; the element decides what they are. */
const ACCEPT = ".glb,.gltf,.bin,.obj,.mtl,.stl,.ply,.zip,.png,.jpg,.jpeg,.webp";

/** The pictures the file chooser offers for a texture. */
const ACCEPT_IMAGE = ".png,.jpg,.jpeg,.webp";

/** Props for ModelPicker. */
interface ModelPickerProps {
    /**
     * Called with what the layer should name once the element accepted it: the asset's id, or for
     * a pasted URL the URL itself, so the project can keep it by URL.
     */
    onPick: (ref: string) => void;
    /** What it picks: a 3D model (the default), or a picture drawn on nodes (`node.texture`). */
    kind?: "model" | "image";
}

/**
 * The Model picker: graphty-element's sample models with their pictures, the models this project
 * already holds, a Choose file... button and a drop zone for files, a folder or a .zip, and a field
 * for a pasted URL. With `kind: "image"` it picks a picture the same ways. Files and URLs go
 * to `session.assets.add`; a refused model shows the element's reason, in words, here.
 * @param props - Component props
 * @param props.onPick - called with the picked model's id, or a pasted URL
 * @param props.kind - a model, or a picture for `node.texture`
 * @returns The picker
 */
export function ModelPicker({ onPick, kind = "model" }: Readonly<ModelPickerProps>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const input = useRef<HTMLInputElement>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);
    const [url, setUrl] = useState("");
    const what = kind === "image" ? "picture" : "model";
    if (session === null) {
        return null;
    }
    const add = (source: AssetSource): void => {
        setBusy(true);
        setProblem(null);
        session.assets.add(source).then(
            (record) => {
                setBusy(false);
                if (record.state === "accepted") {
                    onPick(typeof source === "string" ? source : record.id);
                    return;
                }
                const [first] = record.problems;
                setProblem(first === undefined ? `The ${what} could not be added.` : modelWords(first));
            },
            () => {
                setBusy(false);
                setProblem(`The ${what} could not be added.`);
            },
        );
    };
    const samples = kind === "model" ? session.catalog.models() : [];
    const own = session.assets.list().filter((r) => r.state === "accepted" && r.kind === kind);
    const pasted = url.trim();

    return (
        <Stack gap={6} p={8} w={260} aria-label={kind === "image" ? "Pictures" : "Models"} role="group">
            {samples.length > 0 ? (
                <Text size="xs" fw={600}>
                    Samples
                </Text>
            ) : null}
            <Group gap={4}>
                {samples.map((sample) => (
                    <UnstyledButton
                        key={sample.id}
                        aria-label={sample.plainName}
                        onClick={() => {
                            onPick(sample.id);
                        }}
                    >
                        <Stack gap={0} align="center" w={56}>
                            <Image src={sample.thumbnail} alt="" w={48} h={48} />
                            <Text size="xs">{sample.plainName}</Text>
                        </Stack>
                    </UnstyledButton>
                ))}
            </Group>
            {own.length > 0 ? (
                <>
                    <Text size="xs" fw={600}>
                        In this project
                    </Text>
                    {own.map((record) => (
                        <Button
                            key={record.id}
                            size="compact-xs"
                            variant="subtle"
                            color="dark"
                            justify="start"
                            onClick={() => {
                                onPick(record.id);
                            }}
                        >
                            {modelName(session, record.id)}
                        </Button>
                    ))}
                </>
            ) : null}
            <div
                data-testid="model-drop-zone"
                data-over={over || undefined}
                style={{
                    border: "1px dashed var(--cm-border, var(--mantine-color-gray-5))",
                    borderRadius: 4,
                    padding: 8,
                    background: over ? "var(--mantine-color-default-hover)" : undefined,
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => {
                    setOver(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setOver(false);
                    void readDrop(event.dataTransfer).then((dropped) => {
                        add(dropped.source);
                    });
                }}
            >
                <Stack gap={4} align="center">
                    <Button
                        size="compact-xs"
                        variant="default"
                        leftSection={<Upload size={12} aria-hidden />}
                        loading={busy}
                        onClick={() => input.current?.click()}
                    >
                        Choose file...
                    </Button>
                    <Text size="xs" c="dimmed" ta="center">
                        {kind === "image"
                            ? "Or drop a .png, .jpg or .webp"
                            : "Or drop a .glb, a .gltf with its files, a folder or a .zip"}
                    </Text>
                </Stack>
                <input
                    ref={input}
                    data-testid="model-file-input"
                    type="file"
                    multiple
                    accept={kind === "image" ? ACCEPT_IMAGE : ACCEPT}
                    hidden
                    onChange={(event) => {
                        const { files } = event.currentTarget;
                        if (files !== null && files.length > 0) {
                            add([...files]);
                        }
                        event.currentTarget.value = "";
                    }}
                />
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (pasted !== "") {
                        add(pasted);
                    }
                }}
            >
                <Group gap={4} wrap="nowrap" align="end">
                    <TextInput
                        size="xs"
                        flex={1}
                        label={kind === "image" ? "Picture URL" : "Model URL"}
                        placeholder="https://..."
                        value={url}
                        onChange={(event) => {
                            setUrl(event.currentTarget.value);
                        }}
                    />
                    <Button type="submit" size="compact-xs" variant="default" disabled={pasted === ""} loading={busy}>
                        Add
                    </Button>
                </Group>
            </form>
            {problem === null ? null : (
                <Text size="xs" c="var(--cm-text-danger)" role="alert">
                    {problem}
                </Text>
            )}
        </Stack>
    );
}
