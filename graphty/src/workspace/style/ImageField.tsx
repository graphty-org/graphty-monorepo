import { ImagePicker, type ImagePickerItem } from "@graphty/compact-mantine";
import { assetFileExtensions } from "@graphty/graphty-element/catalog";
import type { AssetSource, CodedFact, GraphSession } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { fileStem, pictureName } from "../canvas/models";
import { useWorkspace } from "../state/WorkspaceContext";
import { chipLine } from "./modelWords";
import { logUnexpected } from "./words";

/** The field's error for a 3D model given where a picture goes; Use as model sits under it. */
const NOT_A_PICTURE = "Not a picture: this file is a 3D model";

/** The files the chooser and the drop take; the element says what arrived. */
const ACCEPT = assetFileExtensions("image").join(",");

/**
 * The project's accepted pictures, newest first, each with an object URL of its bytes while shown. A picture kept
 * by URL has no thumbnail: drawing it would fetch it past the element's web-address question (node-models 2.6).
 * @param session - the element's session.
 * @returns the images.
 */
function useImages(session: GraphSession | null): readonly ImagePickerItem[] {
    const records = (session?.assets.list() ?? []).filter((r) => r.kind === "image" && r.state === "accepted");
    const key = records.map((r) => r.id).join("\n");
    const [srcs, setSrcs] = useState<ReadonlyMap<string, string>>(new Map());
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const made = new Map<string, string>();
        for (const record of session.assets.list()) {
            if (record.kind !== "image" || record.state !== "accepted") {
                continue;
            }
            const { id } = record;
            const bytes = [...session.assets.files(id).values()].at(0);
            if (bytes !== undefined) {
                made.set(id, URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>])));
            }
        }
        setSrcs(made);
        return () => {
            for (const url of made.values()) {
                URL.revokeObjectURL(url);
            }
        };
    }, [session, key]);
    if (session === null) {
        return [];
    }
    return records.map((r) => ({ id: r.id, name: pictureName(session, r.id), src: srcs.get(r.id) })).reverse();
}

/** Props for ImageField. */
interface ImageFieldProps {
    /** Its name: the caption above it and its accessible name. */
    readonly label: string;
    /** What the line names now (an image asset's id or an address), if anything. */
    readonly value: string | undefined;
    /** Called with what the line should name: an asset id or an address. */
    readonly onPick: (ref: string) => void;
    /** Called with a model's asset id when a model that arrived here is taken as the model; no Use as model without. */
    readonly onModel?: (ref: string) => void;
    /** Open at once (a line "+" just added, waiting for its picture). */
    readonly defaultOpened?: boolean;
    /** Closed without a pick. */
    readonly onDismiss?: () => void;
    /** Opened or closed, however. */
    readonly onOpenChange?: (opened: boolean) => void;
}

/**
 * A picture field (R16): compact-mantine's ImagePicker over the project's pictures (graphty-element's
 * `session.assets`), with a file, a drop or an address added through `session.assets.add`. A picture is picked as it
 * is accepted; a model that arrives offers Use as model where the line takes one; any other refusal is the field's
 * error.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - what the line names now
 * @param props.onPick - called with what the line should name
 * @param props.onModel - called with a model taken as the model
 * @param props.defaultOpened - open at once
 * @param props.onDismiss - closed without a pick
 * @param props.onOpenChange - opened or closed
 * @returns The field
 */
export function ImageField({
    label,
    value,
    onPick,
    onModel,
    defaultOpened,
    onDismiss,
    onOpenChange,
}: ImageFieldProps): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const images = useImages(session);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<string | undefined>(undefined);
    const [model, setModel] = useState<{ readonly id: string; readonly name: string } | null>(null);
    // A model waiting for its parts is let go once the field goes, so it never takes files dropped later.
    const stray = useRef<string | null>(null);
    // Each opening of the pop-out: a load that settles after it closed picks nothing and keeps nothing.
    const opening = useRef(0);
    useEffect(
        () => () => {
            if (stray.current !== null) {
                session?.assets.remove(stray.current);
                stray.current = null;
            }
        },
        [session],
    );
    if (session === null) {
        return null;
    }
    const refuse = (fact: CodedFact): void => {
        setProblem(chipLine(fact));
        store.set({ announcement: chipLine(fact) });
    };
    const settle = async (source: AssetSource, given: string): Promise<void> => {
        const mine = opening.current;
        const record = await session.assets.add(source);
        if (mine !== opening.current) {
            // Closed while it loaded: a model waiting for parts is let go, so it never takes files dropped later.
            if (session.assets.waiting().some((w) => w.id === record.id)) {
                session.assets.remove(record.id);
            }
            return;
        }
        if (record.kind === "model") {
            const waits = session.assets.waiting().some((w) => w.id === record.id);
            if (record.state === "accepted" || waits) {
                if (waits) {
                    stray.current = record.id;
                }
                const name = fileStem(record.path ?? given) || "model";
                setModel({ id: record.id, name });
                setProblem(NOT_A_PICTURE);
                store.set({ announcement: `Not a picture: ${name} is a 3D model` });
                return;
            }
        } else if (record.state === "accepted") {
            // A URL is named by its address: the element reports it under that ref.
            onPick(typeof source === "string" ? source : record.id);
            return;
        }
        refuse(record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} });
    };
    const add = (source: AssetSource, given: string): void => {
        setBusy(true);
        setProblem(undefined);
        setModel(null);
        if (stray.current !== null) {
            session.assets.remove(stray.current);
            stray.current = null;
        }
        settle(source, given)
            .catch((error: unknown) => {
                logUnexpected("assets.add", error, []);
                refuse({ code: "E_MODEL_PARSE", params: { message: String(error) } });
            })
            .finally(() => {
                setBusy(false);
            });
    };
    const held = value ?? "";
    // eslint-disable-next-line unicorn/no-array-callback-reference -- session.assets.find takes an asset ref, not a callback
    const chosen = held === "" ? null : (session.assets.find(held)?.id ?? held);
    return (
        <ImagePicker
            label={label}
            title="Picture"
            value={chosen}
            images={images}
            valueName={chosen === null ? undefined : pictureName(session, chosen)}
            busy={busy}
            error={problem}
            defaultOpened={defaultOpened}
            onDismiss={onDismiss}
            onOpenChange={(opened) => {
                if (!opened) {
                    opening.current += 1;
                    if (stray.current !== null) {
                        session.assets.remove(stray.current);
                        stray.current = null;
                    }
                    setModel(null);
                    setProblem(undefined);
                    setBusy(false);
                }
                onOpenChange?.(opened);
            }}
            onChange={(id) => {
                if (id !== null) {
                    onPick(id);
                }
            }}
            onFiles={([file]) => {
                add(file, file.name);
            }}
            onUrl={(address) => {
                add(address, address);
            }}
            accept={ACCEPT}
            clearable={false}
            footer={
                model === null || onModel === undefined ? undefined : (
                    <Button
                        size="compact-xs"
                        variant="default"
                        aria-label={`Use ${model.name} as model`}
                        onClick={() => {
                            // Taken as the model: it is the reader's now, not let go.
                            stray.current = null;
                            onModel(model.id);
                        }}
                    >
                        Use as model
                    </Button>
                )
            }
        />
    );
}
