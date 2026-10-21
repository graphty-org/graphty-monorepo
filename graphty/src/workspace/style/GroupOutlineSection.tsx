import { ControlSection, Popout, PopoutButton } from "@graphty/compact-mantine";
import type { LayerBoundary, ShaderParams as Params } from "@graphty/graphty-element/catalog";
import type { Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import type { RowContext } from "./PropertyRow";
import { type DataChoice, sourceName, topmostRow } from "./row";
import { AddButton } from "./Section";
import { ShaderGallery } from "./ShaderGallery";
import { ShaderParams } from "./ShaderParams";
import { copyShaderText, ownLayer } from "./shaderSlots";
import { ValuePicker } from "./ValuePicker";
import { failureWords, GROUP_OUTLINE_WORDS as WORDS } from "./words";

/** The width of the section's pop-outs, as every shader row's. */
const POPOUT_WIDTH = 240;

/** What the section can be: closed, picking an outline, picking what it groups by. */
type Open = "gallery" | "group-by" | null;

/**
 * The layers a write reaches: the row's own layer, or, for several rows edited together (a
 * folder's bulk edit), every unlocked node layer of them, so each draws its own outline.
 * @param ctx - the row.
 * @returns the layers.
 */
function targetsOf(ctx: RowContext): Layer[] {
    if (ctx.many !== undefined) {
        return ctx.layers.filter((layer) => !layer.locked);
    }
    const own = ownLayer(ctx);
    return own === undefined ? [] : [own];
}

/**
 * The outline the layers draw, when they all draw the same one; `"mixed"` when they differ.
 * @param layers - the layers.
 * @returns the boundary, undefined for none, or "mixed".
 */
function sharedOf(layers: readonly Layer[]): LayerBoundary | undefined | "mixed" {
    const keys = new Set(layers.map((layer) => JSON.stringify(layer.boundary ?? null)));
    if (keys.size > 1) {
        return "mixed";
    }
    return layers[0]?.boundary;
}

/**
 * The data path a picked value reads: a column's, or a run field's.
 * @param ctx - the row.
 * @param choice - the pick.
 * @returns the path, or undefined when the session no longer answers it.
 */
function pathOf(ctx: RowContext, choice: DataChoice): string | undefined {
    if (choice.kind === "result") {
        return ctx.session.results.path(choice.runId, choice.field);
    }
    return ctx.session.data
        .attributes()
        .find((attribute) => attribute.kind === choice.column.kind && attribute.name === choice.column.name)?.path;
}

/**
 * Writes a boundary (or none) to the layers a write reaches, as one undo step. A row with no layer
 * of its own yet gets one, as its first edit of any property would.
 * @param ctx - the row.
 * @param next - the boundary each layer draws, from its own; undefined takes it off.
 * @returns when it is written.
 */
async function writeBoundary(
    ctx: RowContext,
    next: (was: LayerBoundary | undefined) => LayerBoundary | undefined,
): Promise<void> {
    const { session, fresh } = ctx;
    const targets = targetsOf(ctx);
    if (targets.length === 0) {
        const boundary = next(undefined);
        if (boundary === undefined || fresh === undefined) {
            return;
        }
        const base = ctx.layers.at(-1) ?? topmostRow(session);
        await session.styles.add(
            {
                name: fresh.name,
                target: "node",
                selector: fresh.selector,
                boundary,
                ...(fresh.userData === undefined ? {} : { userData: fresh.userData }),
            },
            base === undefined ? undefined : { above: base.id },
        );
        return;
    }
    const patches = targets.map((layer) => ({ id: layer.id, patch: { boundary: next(layer.boundary) } }));
    await session.transaction(WORDS.step(patches.length), (tx) => tx.styles.updateMany(patches, { keepEmpty: true }));
}

/**
 * The Node tab's Group outline section (shader-styles design, section 6.5): one shape drawn
 * around each group of the layer's nodes. Its "+" opens the gallery of outlines, and a pick opens
 * the Group by list at once (as the Text "+" opens its list), because an outline on a layer of
 * every node with no grouping is one blob. Its rows: the outline (its picture and name swap it,
 * its settings button its parameters, its minus takes it off) and Group by (None, or the value
 * each group shares). On a folder's bulk edit, a pick gives every layer in it its own outline, in
 * one undo step. Every write is one undo step on the element.
 * @param props - Component props
 * @param props.ctx - the row, on nodes
 * @returns The section
 */
export function GroupOutlineSection({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState<Open>(null);
    const [settings, setSettings] = useState(false);
    // An outline picked on a single row before it groups by anything: drawn once a value is
    // picked. With no grouping it would be one outline around every node of the layer.
    const [pending, setPending] = useState<string | null>(null);
    const targets = targetsOf(ctx);
    const shared = sharedOf(targets);
    const boundary = shared === "mixed" ? undefined : shared;
    const shownShader = pending ?? boundary?.shader;
    const descriptor =
        shownShader === undefined ? undefined : ctx.session.catalog.shaders().find((each) => each.id === shownShader);
    const name = descriptor?.plainName ?? shownShader ?? WORDS.mixed;
    const empty = shared === undefined && pending === null;
    const canWrite = targets.length > 0 || ctx.fresh !== undefined;
    const fail =
        (verb: string) =>
        (error: unknown): void => {
            store.set({ notice: { message: failureWords(WORDS.title, verb, error), error: true } });
        };
    const pick = (id: string): void => {
        // A single row groups by a value next, and draws nothing until it does; a folder's layers
        // are its groups already.
        if (ctx.many === undefined && boundary?.groupBy === undefined) {
            setPending(id);
            setOpen("group-by");
            return;
        }
        setOpen(null);
        writeBoundary(ctx, (was) => ({ ...(was?.groupBy === undefined ? {} : { groupBy: was.groupBy }), shader: id }))
            .then(() => {
                store.set({
                    announcement: WORDS.added(ctx.session.catalog.shaders().find((s) => s.id === id)?.plainName ?? id),
                });
            })
            .catch(fail("added"));
    };
    const groupBy = (path: string | undefined): void => {
        setOpen(null);
        if (pending !== null) {
            setPending(null);
            if (path === undefined) {
                return;
            }
            writeBoundary(ctx, () => ({ shader: pending, groupBy: path }))
                .then(() => {
                    store.set({ announcement: WORDS.added(name) });
                })
                .catch(fail("added"));
            return;
        }
        writeBoundary(ctx, (was) =>
            was === undefined
                ? undefined
                : {
                      shader: was.shader,
                      ...(was.params === undefined ? {} : { params: was.params }),
                      ...(path === undefined ? {} : { groupBy: path }),
                  },
        ).catch(fail("changed"));
    };
    const writeParam = (param: string, value: Params[string] | undefined): void => {
        writeBoundary(ctx, (was) => {
            if (was === undefined) {
                return undefined;
            }
            const rest = Object.fromEntries(Object.entries(was.params ?? {}).filter(([key]) => key !== param));
            const params = value === undefined ? rest : { ...rest, [param]: value };
            const { params: _old, ...base } = was;
            return Object.keys(params).length === 0 ? base : { ...base, params };
        }).catch(fail("changed"));
    };
    const remove = (): void => {
        box.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        store.set({ announcement: WORDS.removed(name) });
        if (pending !== null) {
            setPending(null);
            return;
        }
        writeBoundary(ctx, () => undefined).catch(fail("removed"));
    };
    const groupWord =
        boundary?.groupBy === undefined
            ? WORDS.none
            : (sourceName(ctx.session, { by: boundary.groupBy }) ?? boundary.groupBy);

    const gallery = (
        <Popout.Panel
            width={POPOUT_WIDTH}
            placement="left"
            alignment="start"
            anchorY={box}
            header={{ variant: "title", title: WORDS.outline }}
        >
            <Popout.Content>
                <ShaderGallery
                    session={ctx.session}
                    kinds={["boundary"]}
                    label={WORDS.find}
                    marked={shownShader === undefined ? [] : [shownShader]}
                    onPick={(id) => {
                        if (id === shownShader && pending === null) {
                            setOpen(null);
                            return;
                        }
                        pick(id);
                    }}
                />
            </Popout.Content>
        </Popout.Panel>
    );
    const groupList = (
        <Popout.Panel
            width={POPOUT_WIDTH}
            placement="left"
            alignment="start"
            anchorY={box}
            header={{ variant: "title", title: WORDS.groupBy }}
        >
            <ValuePicker
                title={WORDS.groupBy}
                target="node"
                inUse={boundary?.groupBy === undefined ? [] : [boundary.groupBy]}
                // A single row's outline groups by a value: None would draw one outline around
                // every node. A folder's layers are its groups, so None is theirs.
                fixedLabel={ctx.many === undefined ? undefined : WORDS.none}
                fixedInForce={boundary !== undefined && boundary.groupBy === undefined}
                onFixed={() => {
                    groupBy(undefined);
                }}
                onPick={(choice) => {
                    groupBy(pathOf(ctx, choice));
                }}
                onClose={() => {
                    setOpen(null);
                    setPending(null);
                }}
            />
        </Popout.Panel>
    );
    const onOpenChange =
        (which: Exclude<Open, null>) =>
        (opened: boolean): void => {
            setOpen(opened ? which : null);
            // Group by closed with no value picked: the picked outline is not drawn.
            if (!opened && which === "group-by") {
                setPending(null);
            }
        };

    return (
        <div ref={box} data-section="node-outline" className="ws-section">
            <ControlSection
                label={WORDS.title}
                headingLevel={3}
                empty={empty}
                collapsible={false}
                actions={
                    <AddButton
                        kind="node"
                        title={WORDS.title}
                        options={empty && canWrite ? [{ key: "gallery", label: `${WORDS.outline}...` }] : []}
                        onAdd={() => {
                            setOpen("gallery");
                        }}
                    />
                }
            >
                {empty ? null : (
                    <>
                        <div
                            className="ws-row ws-shader-row"
                            data-line="node.boundary"
                            data-set=""
                            data-shader={shownShader}
                        >
                            <div className="ws-field" data-named="">
                                <span className="ws-field-label">
                                    <span className="ws-field-name" title={WORDS.outline} aria-hidden>
                                        {WORDS.outline}
                                    </span>
                                </span>
                                <div className="ws-field-control ws-shader-control">
                                    <Popout opened={open === "gallery"} onOpenChange={onOpenChange("gallery")}>
                                        <Popout.Trigger>
                                            <UnstyledButton
                                                className="ws-shader-pick"
                                                aria-label={`${WORDS.outline}: ${name}`}
                                                aria-haspopup="dialog"
                                                aria-expanded={open === "gallery"}
                                            >
                                                {descriptor?.thumbnail === undefined ? (
                                                    <span className="ws-shader-thumb" aria-hidden />
                                                ) : (
                                                    <img
                                                        className="ws-shader-thumb"
                                                        src={descriptor.thumbnail}
                                                        alt=""
                                                    />
                                                )}
                                                <Text size="xs" truncate>
                                                    {name}
                                                </Text>
                                            </UnstyledButton>
                                        </Popout.Trigger>
                                        {gallery}
                                    </Popout>
                                </div>
                                <span className="ws-slot">
                                    {descriptor === undefined ||
                                    boundary === undefined ||
                                    descriptor.params.length === 0 ? null : (
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
                                            >
                                                <Popout.Content>
                                                    <ShaderParams
                                                        ctx={ctx}
                                                        descriptor={descriptor}
                                                        channel="node.shaderParams"
                                                        values={boundary.params ?? {}}
                                                        bindings={{}}
                                                        onChange={writeParam}
                                                        onUnbind={() => undefined}
                                                    />
                                                    <Button
                                                        size="compact-xs"
                                                        variant="subtle"
                                                        onClick={() => {
                                                            copyShaderText(ctx.session, descriptor.id).catch(
                                                                fail("copied"),
                                                            );
                                                        }}
                                                    >
                                                        {WORDS.copy}
                                                    </Button>
                                                </Popout.Content>
                                            </Popout.Panel>
                                        </Popout>
                                    )}
                                </span>
                                <span className="ws-slot">
                                    <Tooltip label={WORDS.remove} position="top">
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            aria-label={WORDS.remove}
                                            onClick={remove}
                                        >
                                            <GLYPHS.remove size={14} aria-hidden />
                                        </ActionIcon>
                                    </Tooltip>
                                </span>
                            </div>
                        </div>
                        {shownShader === undefined ? null : (
                            // A line under the outline, at the field column: its words name it,
                            // so it adds no name to the tab's label column (which would widen it).
                            <div className="ws-row" data-line="node.boundary.groupBy" data-set="">
                                <div className="ws-field ws-field-sub">
                                    <div className="ws-field-control">
                                        <Popout opened={open === "group-by"} onOpenChange={onOpenChange("group-by")}>
                                            <Popout.Trigger>
                                                <Button
                                                    size="compact-xs"
                                                    variant="default"
                                                    fullWidth
                                                    justify="flex-start"
                                                >
                                                    {WORDS.line(pending === null ? groupWord : undefined)}
                                                </Button>
                                            </Popout.Trigger>
                                            {groupList}
                                        </Popout>
                                    </div>
                                    <span className="ws-slot" />
                                    <span className="ws-slot" />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </ControlSection>
            {/* The "+" pick: the gallery opens beside the section before any row is drawn. */}
            {empty && (
                <Popout opened={open === "gallery"} onOpenChange={onOpenChange("gallery")}>
                    {gallery}
                </Popout>
            )}
        </div>
    );
}
