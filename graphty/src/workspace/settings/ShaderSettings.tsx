import { ControlSection, Popout, PopoutButton } from "@graphty/compact-mantine";
import type { ShaderParams as Params } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Select, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { type PasteInit, PasteShaderDialog } from "../style/PasteShaderDialog";
import { ShaderGallery } from "../style/ShaderGallery";
import { ShaderParams } from "../style/ShaderParams";
import { copyShaderText } from "../style/shaderSlots";
import { headerBottom } from "../style/useFocusLine";
import {
    BACKGROUND_SECTION_WORDS,
    placeWords,
    renderQualityWords,
    SHADER_MOTION_WORDS,
    SHADER_QUALITY_WORDS,
    SHADER_STEP_WORDS,
    usedByWords,
} from "../style/words";
import { heldShaders, runHeld } from "./heldShaders";
import { SHADER_MOTION, SHADER_QUALITY, useShaderSettings, writeShaderPreference } from "./shaderPreferences";

/** The width of the pop-outs beside the panel, as a shader row's. */
const POPOUT_WIDTH = 240;

/**
 * Draws again when a project shader's status or the render quality changes.
 * @param session - the element's session.
 */
function useShaderVersion(session: GraphSession | null): void {
    const [, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = [session.on("shader:status", bump), session.on("render:quality", bump)];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
}

/** Props for BackgroundShader. */
interface BackgroundShaderProps {
    readonly session: GraphSession;
    /** The background shader in force, if the background is one. */
    readonly shader: string | undefined;
    /** Its parameters. */
    readonly params: Params;
    /**
     * Writes a shader and its parameters as the background, through `scope` when given (a paste's
     * transaction, so the add and the write are one undo step).
     */
    readonly onWrite: (shader: string, params: Params, scope?: GraphSession) => Promise<void> | void;
    /** Whether the gallery is open when the row appears: the row was just added by a "+". */
    readonly startOpen?: boolean;
}

/**
 * The Background's Shader paint (shader-styles design, section 6.1): the shader's still picture
 * and name, which opens the gallery of background shaders (Paste shader... last), and its settings
 * pop-out, drawn from the catalog's parameters, which opens after a pick. The gallery opens by
 * itself only when the reader added the row with the Background "+". Each write is one undo step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.shader - the shader in force
 * @param props.params - its parameters
 * @param props.onWrite - writes the background
 * @param props.startOpen - whether the gallery is open when the row appears
 * @returns The row
 */
export function BackgroundShader({
    session,
    shader,
    params,
    onWrite,
    startOpen = false,
}: Readonly<BackgroundShaderProps>): React.JSX.Element {
    const [picking, setPicking] = useState(startOpen);
    const [settings, setSettings] = useState(false);
    const [paste, setPaste] = useState<PasteInit | null>(null);
    const descriptor = session.catalog.shaders().find((each) => each.id === shader);
    const name = descriptor?.plainName ?? shader ?? "None";
    return (
        <Group gap={4} wrap="nowrap" className="ws-shader-control">
            <Popout opened={picking} onOpenChange={setPicking}>
                <Popout.Trigger>
                    <UnstyledButton
                        className="ws-shader-pick"
                        aria-label={`Background shader: ${name}`}
                        aria-haspopup="dialog"
                        aria-expanded={picking}
                    >
                        {descriptor?.thumbnail === undefined ? (
                            <span className="ws-shader-thumb" aria-hidden />
                        ) : (
                            <img className="ws-shader-thumb" src={descriptor.thumbnail} alt="" />
                        )}
                        <Text size="xs" truncate>
                            {name}
                        </Text>
                    </UnstyledButton>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    boundaryTop={picking ? headerBottom() : 0}
                    header={{ variant: "title", title: "Background" }}
                    closeLabel="Close Background"
                >
                    <Popout.Content>
                        <ShaderGallery
                            session={session}
                            tab="background"
                            marked={shader === undefined ? [] : [shader]}
                            onNew={() => {
                                setPicking(false);
                                setPaste({});
                            }}
                            onPick={(id) => {
                                setPicking(false);
                                if (id !== shader) {
                                    void onWrite(id, {});
                                }
                                // Its settings open next, as a style row's do after a pick.
                                const picked = session.catalog.shaders().find((each) => each.id === id);
                                setSettings((picked?.params.length ?? 0) > 0);
                            }}
                        />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
            {descriptor !== undefined && descriptor.params.length > 0 && (
                <Popout opened={settings} onOpenChange={setSettings}>
                    <Popout.Trigger>
                        <Tooltip label={`${name} settings`}>
                            <PopoutButton
                                icon={<GLYPHS.settings size={14} aria-hidden />}
                                aria-label={`${name} settings`}
                                aria-haspopup="dialog"
                                aria-expanded={settings}
                            />
                        </Tooltip>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={POPOUT_WIDTH}
                        placement="left"
                        alignment="start"
                        header={{ variant: "title", title: `${name} settings` }}
                        closeLabel={`Close ${name} settings`}
                    >
                        <Popout.Content>
                            <ShaderParams
                                descriptor={descriptor}
                                values={params}
                                onChange={(param, value) => {
                                    // The background's parameters are plain values; it has no clocks.
                                    if (typeof value === "object") {
                                        return;
                                    }
                                    const rest = Object.fromEntries(
                                        Object.entries(params).filter(([key]) => key !== param),
                                    );
                                    const next = value === undefined ? rest : { ...rest, [param]: value };
                                    const option = descriptor.params.find((each) => each.name === param);
                                    // One step, named so Undo reads "Undid changing Nebula tint".
                                    void session.transaction(
                                        SHADER_STEP_WORDS.param(name, option?.plainName ?? param),
                                        (tx) => onWrite(descriptor.id, next, tx as GraphSession),
                                    );
                                }}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            )}
            {paste !== null && (
                <PasteShaderDialog
                    session={session}
                    tab="background"
                    put={async (scope, id, values) => {
                        await onWrite(id, values, scope);
                    }}
                    init={paste}
                    onClose={() => {
                        setPaste(null);
                    }}
                />
            )}
        </Group>
    );
}

/**
 * Where a held shader draws, in words: the Background section's title, or its place on a node or an edge.
 * @param shader - the held shader
 * @returns The words
 */
function shaderPlaceWords(shader: ReturnType<typeof heldShaders>[number]): string {
    if (shader.target === "background") {
        return BACKGROUND_SECTION_WORDS.title;
    }
    return placeWords(shader.place, shader.target === "edge" ? "edge" : "node");
}

/**
 * The Held shaders row: how many shaders from a file wait to run, and a pop-out listing each
 * (name, kind, how many layers use it) with Run and Copy shader, then Run all. Drawn only while
 * one is held.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The row, or nothing
 */
function HeldShadersRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const held = heldShaders(session);
    if (held.length === 0) {
        return null;
    }
    const run = (ids?: readonly string[]): void => {
        void runHeld(session, ids).then((failed) => {
            if (failed > 0) {
                const shaders = failed === 1 ? "1 shader" : `${String(failed)} shaders`;
                store.set({ notice: { message: `${shaders} did not pass the checks`, error: true } });
            }
        });
    };
    return (
        <Group gap={4} wrap="nowrap" justify="space-between" data-testid="held-shaders">
            <Text size="xs" aria-hidden>
                Held shaders
            </Text>
            <Popout opened={open} onOpenChange={setOpen}>
                <Popout.Trigger>
                    <Button
                        size="compact-xs"
                        variant="default"
                        aria-label={`Held shaders, ${String(held.length)}`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    >
                        {String(held.length)}
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: "Held shaders" }}
                    closeLabel="Close Held shaders"
                >
                    <Popout.Content>
                        <Stack gap={6} role="list" aria-label="Held shaders">
                            {held.map((shader) => (
                                <Group key={shader.id} gap={4} wrap="nowrap" role="listitem" data-shader={shader.id}>
                                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="xs" truncate>
                                            {shader.plainName}
                                        </Text>
                                        <Text size="xs" c="dimmed" truncate>
                                            {`${shaderPlaceWords(shader)}, ${usedByWords(shader.usedBy)}`}
                                        </Text>
                                    </Stack>
                                    <Button
                                        size="compact-xs"
                                        variant="subtle"
                                        aria-label={`Copy ${shader.plainName}`}
                                        onClick={() => {
                                            void copyShaderText(session, shader.id).then(() => {
                                                store.set({ announcement: `${shader.plainName} copied` });
                                            });
                                        }}
                                    >
                                        Copy shader
                                    </Button>
                                    <Button
                                        size="compact-xs"
                                        variant="light"
                                        aria-label={`Run ${shader.plainName}`}
                                        onClick={() => {
                                            run([shader.id]);
                                        }}
                                    >
                                        Run
                                    </Button>
                                </Group>
                            ))}
                        </Stack>
                        {held.length > 1 && (
                            <Button
                                size="compact-xs"
                                mt={8}
                                onClick={() => {
                                    run();
                                }}
                            >
                                Run all
                            </Button>
                        )}
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </Group>
    );
}

/**
 * Graph settings > Shaders (shader-styles design, section 6.5): Quality and Motion, the reader's
 * preferences, kept in this browser and handed to the element's `shaderSettings`; under Quality,
 * the quality the frame guard draws at while it differs from the reader's; and the Held shaders
 * row while a file's shaders wait to run.
 * @returns The section
 */
export function ShaderSection(): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    const settings = useShaderSettings();
    useShaderVersion(session);
    if (session === null) {
        return null;
    }
    // The level the frame guard stepped down to, while it differs from the reader's setting.
    const guard = element?.renderQuality;
    return (
        <ControlSection label="Shaders" collapsible={false} headingLevel={3}>
            <Stack gap={6}>
                <Select
                    label="Quality"
                    size="xs"
                    allowDeselect={false}
                    description={guard?.code === undefined ? undefined : `Now ${renderQualityWords(guard)}`}
                    value={settings.quality ?? SHADER_QUALITY.fallback}
                    data={SHADER_QUALITY.values.map((value) => ({ value, label: SHADER_QUALITY_WORDS[value] }))}
                    onChange={(picked) => {
                        const quality = SHADER_QUALITY.values.find((value) => value === picked);
                        if (quality !== undefined) {
                            writeShaderPreference({ quality });
                        }
                    }}
                />
                <Select
                    label="Motion"
                    size="xs"
                    allowDeselect={false}
                    value={settings.motion ?? SHADER_MOTION.fallback}
                    data={SHADER_MOTION.values.map((value) => ({ value, label: SHADER_MOTION_WORDS[value] }))}
                    onChange={(picked) => {
                        const motion = SHADER_MOTION.values.find((value) => value === picked);
                        if (motion !== undefined) {
                            writeShaderPreference({ motion });
                        }
                    }}
                />
                <HeldShadersRow session={session} />
            </Stack>
        </ControlSection>
    );
}
