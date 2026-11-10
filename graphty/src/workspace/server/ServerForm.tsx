import "./server.css";

import {
    ActionRow,
    FieldRow,
    PANEL_GRID,
    PanelField,
    PanelLabelsProvider,
    Popout,
    PopoutManager,
    SegmentedControl,
    ToggleRow,
} from "@graphty/compact-mantine";
import type { SourceCatalogEntry } from "@graphty/graphty-element/catalog";
import { type CodedFact, type SourceParamDescriptor, type SourcePreview } from "@graphty/graphty-element/session";
import { Button, Input, Loader, PasswordInput, Stack, Textarea } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { sourceName } from "../data-place/words";
import { networkOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { replaceWith } from "../replace/commands";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    EXPAND_DEFAULTS,
    formFromSettings,
    formReady,
    freshForm,
    SERVER_DIALOG,
    type ServerFormState,
    serverKinds,
    serverLoad,
    START_WORDS,
    undeclaredParams,
    withStart,
} from "./commands";
import { CodeChip, PreviewRows } from "./PreviewRows";
import { codeWords, failureOf, kindName } from "./words";

/** The params the form draws as its own rows, not as the source's generic rows. */
const OWN_ROWS = new Set(["mode"]);

/** Params few readers change, drawn after the main rows with the source's own advanced ones. */
const RARE_PARAMS = new Set(["transport"]);

/** The choice of a select that means none: an enum left unset. */
const NONE = "";

/**
 * A number field's value as a param takes it: a number, or undefined for a blank.
 * @param value - what the field reported.
 * @returns the number, or undefined.
 */
function numberOf(value: string | number): number | undefined {
    if (value === "") {
        return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

/** What an expansion fetches, as the form and the node menu's Expand... edit it. */
type ExpandWith = ServerFormState["expandWith"];

/**
 * The rows of an expansion: depth, direction, edge types and limit.
 * @param props - Component props
 * @param props.value - what it fetches now.
 * @param props.onChange - takes the change.
 * @returns the rows.
 */
export function ExpandFields({
    value,
    onChange,
}: Readonly<{ value: ExpandWith; onChange: (next: ExpandWith) => void }>): React.JSX.Element {
    return (
        <>
            <FieldRow>
                <PanelField
                    label="Depth"
                    kind="number"
                    min={1}
                    max={5}
                    decimalScale={0}
                    value={value.depth}
                    onChange={(depth) => {
                        onChange({ ...value, depth: numberOf(depth) ?? 1 });
                    }}
                />
            </FieldRow>
            <Input.Wrapper label="Direction" size="xs" w={PANEL_GRID.BODY}>
                <SegmentedControl
                    size="xs"
                    aria-label="Direction"
                    fullWidth
                    data={[
                        { value: "out", label: "Out" },
                        { value: "in", label: "In" },
                        { value: "both", label: "Both" },
                    ]}
                    value={value.direction}
                    onChange={(direction) => {
                        onChange({ ...value, direction: direction as ExpandWith["direction"] });
                    }}
                />
            </Input.Wrapper>
            <FieldRow>
                <PanelField
                    label="Edge types"
                    placeholder="any"
                    value={value.types}
                    onChange={(types) => {
                        onChange({ ...value, types: String(types) });
                    }}
                />
            </FieldRow>
            <FieldRow>
                <PanelField
                    label="Expand limit"
                    kind="number"
                    min={1}
                    decimalScale={0}
                    value={value.limit}
                    onChange={(limit) => {
                        onChange({ ...value, limit: numberOf(limit) ?? EXPAND_DEFAULTS.limit });
                    }}
                />
            </FieldRow>
        </>
    );
}

/**
 * A param's value as a control shows it: a list joined with commas, an object as JSON.
 * @param value - the value.
 * @returns the text.
 */
function shownText(value: unknown): string {
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * One of a source's own params as a row, by its type.
 * @param props - Component props
 * @param props.param - the param.
 * @param props.value - its value.
 * @param props.onChange - takes the new value.
 * @returns the row.
 */
function ParamRow({
    param,
    value,
    onChange,
}: Readonly<{ param: SourceParamDescriptor; value: unknown; onChange: (next: unknown) => void }>): React.JSX.Element {
    const label = param.plainName;
    if (param.type === "boolean") {
        return (
            <ToggleRow
                label={label}
                checked={value === true}
                onChange={(checked) => {
                    onChange(checked);
                }}
            />
        );
    }
    if (param.type === "query" || param.type === "text") {
        return (
            <Textarea
                size="xs"
                w={PANEL_GRID.BODY}
                label={label}
                autosize
                minRows={2}
                maxRows={8}
                styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                value={shownText(value)}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
            />
        );
    }
    let field: React.JSX.Element;
    if (param.type === "enum") {
        field = (
            <PanelField
                label={label}
                kind="select"
                data={[
                    { value: NONE, label: "Default" },
                    ...(param.values ?? []).map((each) => ({ value: each.value, label: each.label })),
                ]}
                value={typeof value === "string" ? value : NONE}
                onChange={(next) => {
                    onChange(next === NONE ? undefined : next);
                }}
            />
        );
    } else if (param.type === "integer" || param.type === "number") {
        field = (
            <PanelField
                label={label}
                kind="number"
                min={param.min}
                max={param.max}
                decimalScale={param.type === "integer" ? 0 : undefined}
                placeholder="default"
                value={typeof value === "number" ? value : null}
                onChange={(next) => {
                    onChange(numberOf(next));
                }}
            />
        );
    } else {
        field = (
            <PanelField
                label={label}
                value={shownText(value)}
                onChange={(next) => {
                    onChange(String(next));
                }}
            />
        );
    }
    return <FieldRow>{field}</FieldRow>;
}

/**
 * Whether a param belongs in the Advanced section: the source marks it advanced, or few readers
 * change it.
 * @param param - the param.
 * @returns true for an Advanced row.
 */
function isRare(param: SourceParamDescriptor): boolean {
    return param.advanced === true || (RARE_PARAMS.has(param.name) && param.required !== true);
}

/**
 * Which of a source's params the form draws now, in the main rows or in Advanced: every one a
 * form need not hide, but the query only for a Query start and the seeds and depth only for a
 * Seed nodes start.
 * @param entry - the source.
 * @param mode - the Start picked, if the source has one.
 * @param rare - true for the Advanced rows, false for the main ones.
 * @returns the params.
 */
function shownParams(entry: SourceCatalogEntry, mode: unknown, rare: boolean): readonly SourceParamDescriptor[] {
    const hasMode = entry.descriptor.params.some((p) => p.name === "mode");
    return entry.descriptor.params.filter((param) => {
        if (OWN_ROWS.has(param.name) || isRare(param) !== rare) {
            return false;
        }
        if (hasMode && param.type === "query") {
            return mode === "query";
        }
        if (hasMode && (param.type === "node-id" || param.name === "depth")) {
            return mode === "neighborhood";
        }
        return true;
    });
}

/**
 * The API key row, for a source that takes a key and says where it goes; nothing for any other.
 * The key is never saved: the load remembers it in the element's credential store.
 * @param props - Component props
 * @param props.entry - the source.
 * @param props.value - the key typed.
 * @param props.onChange - takes a new key.
 * @returns the row, or nothing.
 */
function ApiKeyRow({
    entry,
    value,
    onChange,
}: Readonly<{ entry: SourceCatalogEntry; value: string; onChange: (key: string) => void }>): React.JSX.Element | null {
    const { auth = [], authRequired, apiKey } = entry.descriptor;
    if (authRequired === "none" || !auth.includes("api-key") || apiKey === undefined) {
        return null;
    }
    return (
        <PasswordInput
            size="xs"
            w={PANEL_GRID.BODY}
            label="API key"
            placeholder={authRequired === "optional" ? "optional" : "key"}
            autoComplete="off"
            value={value}
            onChange={(event) => {
                onChange(event.currentTarget.value);
            }}
        />
    );
}

/**
 * The Sign in rows, User and Password (or Token), for a source that takes a basic login or a
 * bearer token; nothing for any other.
 * @param props - Component props
 * @param props.entry - the source.
 * @param props.user - the user typed.
 * @param props.secret - the password or token typed.
 * @param props.onChange - takes the changed field.
 * @returns the row, or nothing.
 */
function SignInRow({
    entry,
    user,
    secret,
    onChange,
}: Readonly<{
    entry: SourceCatalogEntry;
    user: string;
    secret: string;
    onChange: (next: { user: string } | { secret: string }) => void;
}>): React.JSX.Element | null {
    const { auth = [], authRequired } = entry.descriptor;
    const basic = auth.includes("basic");
    if (authRequired === "none" || (!basic && !auth.includes("bearer"))) {
        return null;
    }
    return (
        <>
            {basic ? (
                <FieldRow>
                    <PanelField
                        label="User"
                        placeholder="user"
                        autoComplete="off"
                        value={user}
                        onChange={(next) => {
                            onChange({ user: String(next) });
                        }}
                    />
                </FieldRow>
            ) : null}
            <PasswordInput
                size="xs"
                w={PANEL_GRID.BODY}
                label={basic ? "Password" : "Token"}
                placeholder={basic ? "password" : "token"}
                autoComplete="off"
                value={secret}
                onChange={(event) => {
                    onChange({ secret: event.currentTarget.value });
                }}
            />
        </>
    );
}

/**
 * The network data form (spec section 3.9): Kind, Endpoint, Sign in, Start, the query or
 * the source's own params, Limit and Expand on double-click with what an expansion fetches; Test
 * reads a preview, Load loads. Rows a source cannot use are absent. Built only from compact-mantine
 * rows (FieldRow, PanelField, ToggleRow, ActionRow) with captions above, and themed Mantine inputs
 * as wide as a row's field; as a form that is itself a pop-over, it draws every setting flat
 * (SettingsPopout.tsx). Closing it during a Load stops the Load.
 * @param props - Component props
 * @param props.onClose - closes the pop-over.
 * @returns the form.
 */
function ServerForm({ onClose }: Readonly<{ onClose: () => void }>): React.JSX.Element {
    const { session, element, store } = useWorkspace();
    const kinds = serverKinds();
    const editing = store.get().serverEdit;
    // Opened on the source the store names, else on the first listed (NDEx, which needs no sign-in).
    // An edit opens filled in with what the load holds.
    const [form, setForm] = useState<ServerFormState>(() => {
        const asked = store.get().serverKind;
        const opened = kinds.find((each) => each.id === asked) ?? kinds[0];
        const settings = editing === null ? undefined : session?.data.sourceSettings(editing);
        return settings === undefined ? freshForm(opened) : formFromSettings(opened, settings);
    });
    const loading = useRef<AbortController | null>(null);
    useEffect(() => () => loading.current?.abort(), []);
    const [preview, setPreview] = useState<SourcePreview | null>(null);
    const [failure, setFailure] = useState<CodedFact | null>(null);
    const [busy, setBusy] = useState<"test" | "load" | null>(null);
    const entry = kinds.find((each) => each.id === form.kind);
    if (entry === undefined) {
        return <Stack gap={4} />;
    }
    const { descriptor } = entry;
    const modes = descriptor.params.find((p) => p.name === "mode")?.values ?? [];
    const change = (next: Partial<ServerFormState>): void => {
        setForm((was) => ({ ...was, ...next }));
        setPreview(null);
        setFailure(null);
    };
    const setParam = (name: string, value: unknown): void => {
        change({ params: { ...form.params, [name]: value } });
    };

    const ready = formReady(entry, form);
    const advanced = shownParams(entry, form.params.mode, true);
    const test = (): void => {
        if (session === null || busy !== null || !ready) {
            return;
        }
        const { input, options, credential } = serverLoad(entry, form);
        setBusy("test");
        setFailure(null);
        session.data
            .previewSource(input, {
                maxNodes: 25,
                // Load's cap: what Test refuses, Load would too.
                ...(options.limits === undefined ? {} : { limits: options.limits }),
                ...(options.endpoint === undefined ? {} : { endpoint: options.endpoint }),
                ...(credential === undefined ? {} : { credential }),
            })
            .then(setPreview, (error: unknown) => {
                setPreview(null);
                setFailure(failureOf(error));
            })
            .finally(() => {
                setBusy(null);
            });
    };

    const load = async (): Promise<void> => {
        if (session === null || busy !== null || !ready) {
            return;
        }
        const { input, options, credential, endpoint } = serverLoad(entry, form);
        setBusy("load");
        setFailure(null);
        loading.current = new AbortController();
        try {
            // Remembered in memory, never in the file, so Load more, Refresh and Expand find it.
            if (credential !== undefined && element !== null && endpoint !== undefined) {
                await element.credentials.remember({ source: entry.id, endpoint }, credential);
            }
            const edited = session.data.sources().find((each) => each.key === editing);
            if (edited === undefined) {
                await session.data.import(input, {
                    ...options,
                    signal: loading.current.signal,
                    ...(session.data.sources().length > 0 ? { mode: "merge" as const } : {}),
                });
            } else {
                // A read that changed is named as a new load from the form is; else the source keeps its name.
                const before = session.data.sourceSettings(edited.key);
                const same =
                    before !== undefined &&
                    JSON.stringify(before.config) === JSON.stringify(input.config) &&
                    (options.endpoint ?? before.endpoint) === before.endpoint;
                const { name: _name, ...unnamed } = input;
                await replaceWith(
                    store,
                    session,
                    edited.key,
                    same ? { source: unnamed, name: sourceName(edited) } : { source: input, name: input.name ?? "" },
                    {
                        ...options,
                        signal: loading.current.signal,
                    },
                );
            }
            onClose();
        } catch (error) {
            setFailure(failureOf(error));
        } finally {
            setBusy(null);
        }
    };

    return (
        <form // NOSONAR(S6847): the handler only marks an Escape the dropdown inside already used
            aria-label="Network data"
            onSubmit={(event) => {
                event.preventDefault();
                void load();
            }}
            onKeyDown={(event) => {
                // Escape in an open dropdown closes only the dropdown: the pop-over leaves a used
                // Escape alone, and compact-mantine's select (Figma-locked) does not mark its own (#6356).
                if (event.key === "Escape" && (event.target as HTMLElement).ariaExpanded === "true") {
                    event.preventDefault();
                }
            }}
        >
            <PanelLabelsProvider showLabels>
                <Stack gap={4}>
                    <FieldRow>
                        <PanelField
                            label="Kind"
                            kind="select"
                            disabled={editing !== null}
                            data={kinds.map((each) => ({ value: each.id, label: kindName(each) }))}
                            value={form.kind}
                            onChange={(id) => {
                                const next = kinds.find((each) => each.id === id);
                                if (next !== undefined) {
                                    setForm(freshForm(next));
                                    setPreview(null);
                                    setFailure(null);
                                }
                            }}
                        />
                    </FieldRow>
                    <FieldRow>
                        <PanelField
                            label="Endpoint"
                            placeholder={descriptor.defaultEndpoint ?? "https://"}
                            value={form.endpoint}
                            onChange={(endpoint) => {
                                change({ endpoint: String(endpoint) });
                            }}
                        />
                    </FieldRow>
                    <SignInRow
                        entry={entry}
                        user={form.user}
                        secret={form.secret}
                        onChange={(next) => {
                            change(next);
                        }}
                    />
                    <ApiKeyRow
                        entry={entry}
                        value={form.apiKey}
                        onChange={(apiKey) => {
                            change({ apiKey });
                        }}
                    />
                    {modes.length === 0 ? null : (
                        <Input.Wrapper label="Start" size="xs" w={PANEL_GRID.BODY}>
                            <SegmentedControl
                                size="xs"
                                aria-label="Start"
                                fullWidth
                                data={modes.map((each) => ({
                                    value: each.value,
                                    label: START_WORDS[each.value] ?? each.label,
                                }))}
                                value={
                                    typeof form.params.mode === "string" ? form.params.mode : (modes[0]?.value ?? "")
                                }
                                onChange={(mode) => {
                                    change({ params: withStart(entry, form, mode).params });
                                }}
                            />
                        </Input.Wrapper>
                    )}
                    {shownParams(entry, form.params.mode, false).map((param) => (
                        <ParamRow
                            key={param.name}
                            param={param}
                            value={form.params[param.name]}
                            onChange={(value) => {
                                setParam(param.name, value);
                            }}
                        />
                    ))}
                    <FieldRow>
                        <PanelField
                            label="Limit"
                            kind="number"
                            min={0}
                            decimalScale={0}
                            placeholder="none"
                            value={form.limit === 0 ? null : form.limit}
                            onChange={(limit) => {
                                change({ limit: numberOf(limit) ?? 0 });
                            }}
                        />
                    </FieldRow>
                    {entry.features.expand ? (
                        <>
                            <ToggleRow
                                label="Expand on double-click"
                                checked={form.expand}
                                onChange={(expand) => {
                                    change({ expand });
                                }}
                            />
                            {form.expand ? (
                                <ExpandFields
                                    value={form.expandWith}
                                    onChange={(expandWith) => {
                                        change({ expandWith });
                                    }}
                                />
                            ) : null}
                        </>
                    ) : null}
                    {[...advanced, ...undeclaredParams(entry, form.params)].map((param) => (
                        <ParamRow
                            key={param.name}
                            param={param}
                            value={form.params[param.name]}
                            onChange={(value) => {
                                setParam(param.name, value);
                            }}
                        />
                    ))}
                    <ActionRow
                        state={failure === null ? null : <CodeChip fact={failure} />}
                        stateTitle={failure === null ? undefined : codeWords(failure)}
                        busy={busy !== null}
                        actions={
                            <>
                                {/* aria-disabled while busy, not disabled, so the pressed button keeps focus. */}
                                <Button
                                    size="xs"
                                    variant="default"
                                    disabled={!ready}
                                    aria-disabled={busy !== null}
                                    leftSection={busy === "test" ? <Loader size={10} /> : null}
                                    onClick={test}
                                >
                                    Test
                                </Button>
                                <Button
                                    size="xs"
                                    type="submit"
                                    disabled={!ready}
                                    aria-disabled={busy !== null}
                                    leftSection={busy === "load" ? <Loader size={10} color="white" /> : null}
                                >
                                    Load
                                </Button>
                            </>
                        }
                    />
                    {preview === null ? null : <PreviewRows preview={preview} />}
                </Stack>
            </PanelLabelsProvider>
        </form>
    );
}

/**
 * A reopened project's loads that wait for the reader (spec section 3.2, requirement 27): one row
 * each, with Approve. Nothing fetches until the reader approves.
 * @returns the rows, or nothing when no load waits.
 */
function WaitingLoads(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    const [failed, setFailed] = useState<Readonly<Record<string, CodedFact>>>({});
    const waiting = session?.data.pendingSourceLoads() ?? [];
    if (session === null || !networkOn(session) || waiting.length === 0) {
        return null;
    }
    const names = new Map(serverKinds().map((each) => [each.id, kindName(each)]));
    return (
        <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
            role="list"
            aria-label="Waiting loads"
            className="sv-waiting"
        >
            {waiting.map((load) => {
                const host = load.endpoint !== null && URL.canParse(load.endpoint) ? new URL(load.endpoint).host : "";
                const name = `${names.get(load.source) ?? load.source} ${host}`.trim();
                const fact = failed[load.id];
                return (
                    <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
                        key={load.id}
                        role="listitem"
                        aria-label={name}
                        className="dp-source"
                    >
                        <span className="dp-source-icon">
                            <GLYPHS.server size={14} aria-hidden />
                        </span>
                        <span className="dp-source-name">{name}</span>
                        {fact === undefined ? null : <CodeChip fact={fact} />}
                        <Button
                            size="compact-xs"
                            variant="light"
                            onClick={() => {
                                session.data.runPendingSourceLoad(load.id).catch((error: unknown) => {
                                    setFailed((was) => ({ ...was, [load.id]: failureOf(error) }));
                                });
                            }}
                        >
                            Approve
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * The server place in the left sidebar: the loads waiting for approval, and the anchor the
 * network data form opens beside, as a pop-over, while the dialog is `"server"`. Nothing while the
 * network-data experiment is off.
 * @returns the place, or nothing.
 */
export function ServerPlace(): React.JSX.Element | null {
    const { store, session } = useWorkspace();
    const anchor = useRef<HTMLDivElement>(null);
    const opened = useWorkspaceState((state) => state.dialog === SERVER_DIALOG);
    const formKey = useWorkspaceState((state) => state.serverEdit ?? state.serverKind ?? "");
    const close = (): void => {
        if (store.get().dialog === SERVER_DIALOG) {
            store.set({ dialog: null });
        }
    };
    if (!networkOn(session)) {
        return null;
    }
    return (
        <>
            <WaitingLoads />
            <div className="sv-anchor" ref={anchor} aria-hidden />
            {/* Opened from Sources "+", so there is no Popout.Trigger: the panel opens beside the
                sidebar, level with the Sources section. */}
            <PopoutManager>
                <Popout
                    opened={opened}
                    onOpenChange={(open) => {
                        if (!open) {
                            close();
                        }
                    }}
                >
                    <Popout.Panel
                        width={240}
                        header={{ variant: "title", title: "Network data" }}
                        closeLabel="Close Network data"
                        anchorX={anchor}
                        anchorY={anchor}
                        placement="right"
                        alignment="start"
                    >
                        <Popout.Content>{opened ? <ServerForm key={formKey} onClose={close} /> : null}</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutManager>
        </>
    );
}
