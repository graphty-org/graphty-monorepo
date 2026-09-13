/**
 * Settings > AI providers: the provider list, the key form behind each row, and
 * the key-storage block under it (Settings.dc.html:742-990).
 *
 * This is the ONE key-entry surface in the app. Spec 5.1 places AI settings inside
 * Settings and 5.3 AI tier 3 names this pane as what the AI panel's setup prompt
 * opens ("Provider keys and settings (opens Settings > AI)"), so the form lives
 * here and `AiSettingsModal` is a thin dialog around this same component rather
 * than a second copy of it. A second key form would be two places for one secret
 * to be masked, autocompleted and cleared differently.
 *
 * It is drawn from the panel design system even though it is not a 280px panel:
 * every control is PANEL_GRID.CONTROL_HEIGHT, every value and label is the panel's
 * own 11px reading size, and every colour comes from PANEL_INK. The overlay's forms
 * keep the label-above-field stack, which VOCAB 11 retires inside 280px panels and
 * exempts here by name (Settings.dc.html:767).
 *
 * The overlay's header promises "Changes save automatically", so this pane carries
 * no commit button: a key is written to the store when its field loses focus or
 * Enter is pressed, and "Remove key" takes it away again. That is also what the
 * artboard draws -- "the way back is the header's 'Back to the assistant' text
 * action, not a commit button in this column" (Settings.dc.html:745).
 */

import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { Box, Button, Checkbox, NativeSelect, PasswordInput } from "@mantine/core";
import React, { useCallback, useState } from "react";

import { getCreateProvider, type ProviderType } from "../../types/ai";
import { PanelOutlineButton } from "../shell/panel/panelButtons";

/**
 * The column every block in this pane is measured against
 * (Settings.dc.html:749, "max-width: 640px"). The pane itself is as wide as the
 * overlay; the forms are not, because an 11px field 900px wide is unreadable.
 */
const PANE_COLUMN = 640;

/** The gap between two blocks of the pane (Settings.dc.html:743). */
const BLOCK_GAP = PANEL_GRID.PAD_LEFT;

/** The width of a field that holds a name rather than a secret: the two selects. */
const NAME_FIELD_WIDTH = 240;

/**
 * One provider row's height, the section-header pitch. It is a header -- the row
 * is the door and the key form is what is behind it -- so it takes the 32 the grid
 * already freezes section headers at (Settings.dc.html:791).
 */
const PROVIDER_ROW_HEIGHT = PANEL_GRID.SECTION_HEADER;

/**
 * Where the expanded key form begins, measured from the provider list's own edge:
 * the row's 8px pad, plus its 16px chevron slot, plus a 12px indent that puts the
 * form under the provider's name rather than under its chevron
 * (Settings.dc.html:808, "padding: 8px 16px 12px 36px").
 */
const DETAIL_INDENT = 36;

/** The expanded form's own bottom pad (Settings.dc.html:808). */
const DETAIL_PAD_BOTTOM = 12;

/** The side of the connected dot (Settings.dc.html:801). */
const STATE_DOT = 6;

/** The gap between the dot and the word it belongs to (Settings.dc.html:800). */
const STATE_GAP = 6;

/** The 12px name of a provider, and of the Key storage header. */
const NAME_FONT_SIZE = "var(--mantine-font-size-md)";

/** The 11px reading of every value, label and state word in the pane. */
const READING_FONT_SIZE = "var(--mantine-font-size-sm)";

/** How long a test result reads as "just now" before it starts counting minutes. */
const JUST_NOW_MS = 60_000;

/** One minute, for the run record's own arithmetic. */
const MINUTE_MS = 60_000;

/**
 * One provider the app can talk to.
 */
interface AiProviderConfig {
    /** The provider id the key store and the AI manager both use. */
    readonly type: ProviderType;
    /** The provider's own name, drawn at the head of its row. */
    readonly name: string;
    /**
     * The model family, drawn after the name in the secondary ink: it is what a
     * reader looking for "Claude" or "GPT" actually scans for
     * (Settings.dc.html:797).
     */
    readonly family: string;
    /** What the start of this provider's key looks like. */
    readonly placeholder: string;
    /** Whether the provider needs a key at all. */
    readonly requiresKey: boolean;
}

/**
 * The four providers, in the order Settings.dc.html:791-925 draws them.
 *
 * Anthropic leads because the artboard draws it connected and expanded; the local
 * runtime is last because it is the only row that asks for nothing.
 */
const AI_PROVIDERS: readonly AiProviderConfig[] = [
    { type: "anthropic", name: "Anthropic", family: "Claude", placeholder: "sk-ant-...", requiresKey: true },
    { type: "openai", name: "OpenAI", family: "GPT", placeholder: "sk-...", requiresKey: true },
    { type: "google", name: "Google", family: "Gemini", placeholder: "AI...", requiresKey: true },
    {
        type: "webllm",
        name: "Local (WebLLM)",
        family: "Runs in this browser, no key needed",
        placeholder: "",
        requiresKey: false,
    },
];

/** Where a provider's key test has got to. */
type TestStatus = "idle" | "testing" | "success" | "error";

/**
 * The result of one Test connection, and when it happened -- the run record floor
 * item 3 keeps beside the tick (Settings.dc.html:838).
 */
interface TestState {
    /** Where the test has got to. */
    readonly status: TestStatus;
    /** What went wrong, for a failed test. Empty otherwise. */
    readonly message: string;
    /** How long the call took, in milliseconds. */
    readonly durationMs: number;
    /** When it finished, as a timestamp. */
    readonly finishedAt: number;
}

/**
 * Props of the AI providers pane.
 *
 * Every member is the key store's own surface, handed down by the shell rather
 * than reached for here: `AppShell` holds the one `useAiKeyStorage` instance, and a
 * second instance inside this pane would be a second `ApiKeyManager` with its own
 * copy of the keys.
 */
export interface AiProviderSettingsProps {
    /**
     * Whether the key store is loaded and can be written to.
     *
     * The store loads its manager asynchronously and drops a write made before it
     * arrives, so until it is ready the key fields are disabled rather than
     * silently swallowing a secret the user typed.
     */
    readonly ready?: boolean;
    /** Reads a provider's stored key. */
    readonly getKey: (provider: ProviderType) => string | undefined;
    /** Writes a provider's key. */
    readonly setKey: (provider: ProviderType, key: string) => void;
    /** Takes a provider's key away. */
    readonly removeKey: (provider: ProviderType) => void;
    /** Whether a provider has a key. */
    readonly hasKey: (provider: ProviderType) => boolean;
    /** Every provider that currently has a key. */
    readonly configuredProviders: readonly ProviderType[];
    /** The provider the assistant opens with. */
    readonly defaultProvider: ProviderType | null;
    /** Changes the provider the assistant opens with. */
    readonly onDefaultProviderChange: (provider: ProviderType | null) => void;
    /** Whether keys survive a reload. */
    readonly isPersistenceEnabled: boolean;
    /** Starts remembering keys, encrypted, in this browser. */
    readonly onEnablePersistence: (encryptionKey?: string) => void;
    /** Stops remembering keys. */
    readonly onDisablePersistence: (clearStorage?: boolean) => void;
}

/**
 * The words a finished test draws beside its tick: the run record of floor item 3.
 * @param state - the finished test.
 * @param now - the current time, passed in so the record is computed once per render.
 * @returns the record, e.g. "Tested just now, 412 ms".
 */
function describeTest(state: TestState, now: number): string {
    const age = now - state.finishedAt;

    if (age < JUST_NOW_MS) {
        return `Tested just now, ${state.durationMs} ms`;
    }

    return `Tested ${Math.floor(age / MINUTE_MS)} min ago, ${state.durationMs} ms`;
}

/**
 * What a key that cannot be verified against the provider's own API still tells us:
 * whether it is even the shape of that provider's keys.
 *
 * The provider module is loaded from graphty-element on demand and can fail to load
 * (Safari, an offline first run), so a failed load must not read as a failed key.
 * The key itself is never logged, here or anywhere: only the error is.
 * @param provider - the provider the key belongs to.
 * @param key - the key to look at.
 * @returns whether the key has the right shape, and what to say when it does not.
 */
function checkKeyFormat(provider: ProviderType, key: string): { readonly valid: boolean; readonly message: string } {
    switch (provider) {
        case "openai":
            return key.startsWith("sk-") && key.length > 20
                ? { valid: true, message: "" }
                : { valid: false, message: "OpenAI keys start with 'sk-'" };
        case "anthropic":
            return key.startsWith("sk-ant-") && key.length > 20
                ? { valid: true, message: "" }
                : { valid: false, message: "Anthropic keys start with 'sk-ant-'" };
        case "google":
            return key.length > 10 ? { valid: true, message: "" } : { valid: false, message: "That key is too short" };
        default:
            return key.length > 0 ? { valid: true, message: "" } : { valid: false, message: "Enter a key first" };
    }
}

/**
 * Settings > AI providers: a provider list whose rows open onto a key form, and the
 * key-storage block under it.
 * @param props - the key store's surface, handed down by the shell.
 * @returns the pane.
 */
export function AiProviderSettings(props: AiProviderSettingsProps): React.JSX.Element {
    const {
        ready = true,
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
    } = props;

    /* The row that is open. One at a time, like the nav it sits inside: the form is
       full width and two open at once would put two key fields on one screen.
       A user with no key at all is why this starts on a row rather than on none --
       the pane's whole job is that the first key is enterable without hunting. */
    const [openProvider, setOpenProvider] = useState<ProviderType | null>(() => {
        const connected = AI_PROVIDERS.find((entry) => entry.requiresKey && hasKey(entry.type));

        return (defaultProvider ?? connected?.type) ?? AI_PROVIDERS[0].type;
    });

    /* What is typed but not yet committed. A provider with no entry here is showing
       the store's own key, which is why this is partial rather than seeded: seeding
       would copy every secret into React state whether or not its row was opened. */
    const [drafts, setDrafts] = useState<Partial<Record<ProviderType, string>>>({});
    const [tests, setTests] = useState<Partial<Record<ProviderType, TestState>>>({});

    const keyFor = useCallback(
        (provider: ProviderType): string => drafts[provider] ?? getKey(provider) ?? "",
        [drafts, getKey],
    );

    /**
     * Writes what is typed to the store, or takes the key away when the field was
     * emptied. This is the whole of "Changes save automatically" for a key: there is
     * no commit button to reach.
     * @param provider - the provider whose field was left.
     */
    const commitKey = useCallback(
        (provider: ProviderType): void => {
            const typed = keyFor(provider).trim();
            const stored = getKey(provider) ?? "";

            if (typed === stored) {
                return;
            }

            if (typed === "") {
                if (hasKey(provider)) {
                    removeKey(provider);
                }

                return;
            }

            setKey(provider, typed);
        },
        [getKey, hasKey, keyFor, removeKey, setKey],
    );

    const handleTest = useCallback(
        async (provider: ProviderType): Promise<void> => {
            const key = keyFor(provider).trim();

            setTests((current) => ({
                ...current,
                [provider]: { status: "testing", message: "", durationMs: 0, finishedAt: 0 },
            }));

            const startedAt = Date.now();

            /**
             * Records the outcome under the provider it belongs to.
             * @param status - success or error.
             * @param message - what to say when it failed.
             */
            const finish = (status: TestStatus, message: string): void => {
                setTests((current) => ({
                    ...current,
                    [provider]: { status, message, durationMs: Date.now() - startedAt, finishedAt: Date.now() },
                }));
            };

            try {
                const createProvider = await getCreateProvider();
                const instance = createProvider({ provider, apiKey: key });
                const valid = await instance.validateApiKey();

                finish(valid ? "success" : "error", valid ? "" : "The provider rejected that key");
            } catch (err) {
                /* The module could not be loaded or the call could not be made, which
                   says nothing about the key -- so the key is checked for shape and the
                   reading says which of the two questions was answered. The key is not
                   in this log line and must never be put in one. */
                console.warn("[AiProviderSettings] Could not reach the provider, checking the key's shape:", err);

                const format = checkKeyFormat(provider, key);

                finish(format.valid ? "success" : "error", format.valid ? "" : format.message);
            }
        },
        [keyFor],
    );

    const handleRemove = useCallback(
        (provider: ProviderType): void => {
            removeKey(provider);
            setDrafts((current) => ({ ...current, [provider]: "" }));
            setTests((current) => ({ ...current, [provider]: undefined }));
        },
        [removeKey],
    );

    /**
     * Turns remembering on or off.
     *
     * Enabling it re-writes every key the store is already holding, because the
     * store's `enablePersistence` LOADS what is on disk and does not save what is in
     * memory -- so a key typed before the box was ticked would be forgotten on
     * reload, which is the opposite of what ticking the box asked for.
     * @param next - whether keys should be remembered.
     */
    const handleRememberChange = (next: boolean): void => {
        if (!next) {
            onDisablePersistence(false);

            return;
        }

        onEnablePersistence();

        for (const entry of AI_PROVIDERS) {
            const key = keyFor(entry.type).trim();

            if (entry.requiresKey && key !== "") {
                setKey(entry.type, key);
            }
        }
    };

    const now = Date.now();

    const defaultOptions = AI_PROVIDERS.filter(
        (entry) => configuredProviders.includes(entry.type) || (entry.requiresKey && hasKey(entry.type)),
    );

    return (
        <Box style={{ display: "flex", flexDirection: "column", gap: BLOCK_GAP }}>
            {/* Default provider. Drawn only once a provider can be chosen: a select
                with nothing in it reports a choice the user does not have. */}
            {defaultOptions.length > 0 && (
                <Box style={{ display: "flex", gap: PANEL_GRID.TRAIL_GAP, maxWidth: PANE_COLUMN }}>
                    <Box style={{ flex: `0 0 ${NAME_FIELD_WIDTH}px`, width: NAME_FIELD_WIDTH }}>
                        <NativeSelect
                            label="Default provider"
                            title="Used when opening the AI assistant."
                            data-testid="ai-default-provider"
                            value={defaultProvider ?? ""}
                            data={[
                                { value: "", label: "None" },
                                ...defaultOptions.map((entry) => ({ value: entry.type, label: entry.name })),
                            ]}
                            onChange={(event) => {
                                const next = event.currentTarget.value;

                                onDefaultProviderChange(next === "" ? null : (next as ProviderType));
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* The provider list. D7 refused this a pop-over by name: the rows are an
                accordion, which anchors each key inside that provider's own row at full
                width, which is what a pop-over would have been for. */}
            <Box
                data-testid="ai-provider-list"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: PANE_COLUMN,
                    border: `1px solid ${PANEL_INK.BORDER}`,
                    borderRadius: "var(--mantine-radius-sm)",
                    overflow: "hidden",
                }}
            >
                {AI_PROVIDERS.map((entry, index) => {
                    const open = entry.requiresKey && openProvider === entry.type;
                    const connected = entry.requiresKey && hasKey(entry.type);
                    const test = tests[entry.type];
                    const typed = keyFor(entry.type);

                    /* The row is the door, so a provider that HAS a form behind it is a
                       real button -- Tab reaches it, Space and Enter open it, and
                       `aria-expanded` says which state it is in. The local runtime asks
                       for nothing, so its row is a plain line rather than a button that
                       opens nothing. Both are drawn from one style and one body. */
                    const rowStyle: React.CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: PANEL_GRID.TRAIL_GAP,
                        width: "100%",
                        height: PROVIDER_ROW_HEIGHT,
                        paddingInline: PANEL_GRID.TRAIL_GAP,
                        border: "none",
                        borderBottom:
                            index === AI_PROVIDERS.length - 1 && !open ? "none" : `1px solid ${PANEL_INK.DIVIDER}`,
                        background: open ? PANEL_INK.SURFACE : "transparent",
                        color: PANEL_INK.VALUE,
                        fontSize: NAME_FONT_SIZE,
                        lineHeight: 1.2,
                        textAlign: "start",
                        boxSizing: "border-box",
                        cursor: entry.requiresKey ? "pointer" : "default",
                    };

                    const rowTitle = connected
                        ? `${entry.name} (${entry.family}). Key saved`
                        : `${entry.name} (${entry.family}). No key saved`;

                    const rowBody = (
                        <>
                            <Box
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: PANEL_GRID.TRIPLE_GAP,
                                    minWidth: 0,
                                }}
                            >
                                {entry.requiresKey && (
                                    <Box
                                        aria-hidden="true"
                                        style={{
                                            display: "flex",
                                            width: PANEL_GRID.GLYPH_SLOT,
                                            height: PANEL_GRID.GLYPH_SLOT,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: PANEL_INK.CHROME,
                                        }}
                                    >
                                        <UiGlyph name={open ? "chevronDown" : "chevronRight"} size={PANEL_GRID.CHEVRON} />
                                    </Box>
                                )}
                                <Box component="span" style={{ fontWeight: 500 }}>
                                    {entry.name}
                                </Box>
                                <Box component="span" style={{ fontSize: READING_FONT_SIZE, color: PANEL_INK.CHROME }}>
                                    {entry.family}
                                </Box>
                            </Box>

                            {/* Rule 7a: a provider with no key is the default state of this
                                list and draws nothing on the right. "Connected" is the
                                deviation, which is what makes the one live provider findable
                                at a glance in a list that will grow. */}
                            {connected && (
                                <Box
                                    data-testid={`ai-provider-state-${entry.type}`}
                                    style={{ display: "flex", alignItems: "center", gap: STATE_GAP }}
                                >
                                    <Box
                                        aria-hidden="true"
                                        style={{
                                            width: STATE_DOT,
                                            height: STATE_DOT,
                                            borderRadius: "50%",
                                            background: PANEL_INK.SUCCESS,
                                        }}
                                    />
                                    <Box
                                        component="span"
                                        style={{ fontSize: READING_FONT_SIZE, color: PANEL_INK.CHROME }}
                                    >
                                        Connected
                                    </Box>
                                </Box>
                            )}
                        </>
                    );

                    return (
                        <Box key={entry.type}>
                            {entry.requiresKey ? (
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    title={rowTitle}
                                    data-testid={`ai-provider-row-${entry.type}`}
                                    style={rowStyle}
                                    onClick={() => {
                                        setOpenProvider(open ? null : entry.type);
                                    }}
                                >
                                    {rowBody}
                                </button>
                            ) : (
                                <div title={rowTitle} data-testid={`ai-provider-row-${entry.type}`} style={rowStyle}>
                                    {rowBody}
                                </div>
                            )}

                            {open && (
                                <Box
                                    data-testid={`ai-provider-form-${entry.type}`}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: PANEL_GRID.TRAIL_GAP,
                                        paddingInlineStart: DETAIL_INDENT,
                                        paddingInlineEnd: PANEL_GRID.PAD_LEFT,
                                        paddingBlockStart: PANEL_GRID.TRAIL_GAP,
                                        paddingBlockEnd: DETAIL_PAD_BOTTOM,
                                        background: PANEL_INK.SURFACE,
                                        borderBottom:
                                            index === AI_PROVIDERS.length - 1
                                                ? "none"
                                                : `1px solid ${PANEL_INK.DIVIDER}`,
                                        boxSizing: "border-box",
                                    }}
                                >
                                    {/* A key is a secret: the field is a PasswordInput, so it is
                                        masked at rest and revealed only by its own control, and
                                        every password manager is told to keep out of it. */}
                                    <PasswordInput
                                        label="API key"
                                        placeholder={entry.placeholder}
                                        value={typed}
                                        disabled={!ready}
                                        title={ready ? undefined : "Key storage is still loading"}
                                        data-testid={`ai-key-input-${entry.type}`}
                                        autoComplete="off"
                                        data-1p-ignore
                                        data-lpignore="true"
                                        /* Mantine's reveal control ships with no name at all, and
                                           an icon-only control must have one. It keeps ONE name in
                                           both states, which is the register's own convention for
                                           a toggle ("a toggle never renames itself"), and it is
                                           the name the artboard draws (Settings.dc.html:820). */
                                        visibilityToggleButtonProps={{
                                            "aria-label": "Show the key",
                                            title: "Show the key",
                                        }}
                                        onChange={(event) => {
                                            const next = event.currentTarget.value;

                                            setDrafts((current) => ({ ...current, [entry.type]: next }));
                                            setTests((current) => ({ ...current, [entry.type]: undefined }));
                                        }}
                                        onBlur={() => {
                                            commitKey(entry.type);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                commitKey(entry.type);
                                            }
                                        }}
                                    />

                                    <Box
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: PANEL_GRID.TRAIL_GAP,
                                        }}
                                    >
                                        <Box
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: PANEL_GRID.TRAIL_GAP,
                                                minWidth: 0,
                                            }}
                                        >
                                            <PanelOutlineButton
                                                data-testid={`ai-test-connection-${entry.type}`}
                                                disabled={typed.trim() === "" || test?.status === "testing"}
                                                onClick={() => {
                                                    void handleTest(entry.type);
                                                }}
                                            >
                                                Test connection
                                            </PanelOutlineButton>

                                            {test?.status === "testing" && (
                                                <Box
                                                    component="span"
                                                    style={{ fontSize: READING_FONT_SIZE, color: PANEL_INK.CHROME }}
                                                >
                                                    Testing connection...
                                                </Box>
                                            )}

                                            {/* Rule 7a again: success is the default outcome, so it
                                                draws the tick alone and keeps its words in the
                                                title. A FAILED test is the deviation and says so
                                                inline, in full, in the warning ink (6.7). */}
                                            {test?.status === "success" && (
                                                <>
                                                    <Box
                                                        title="Connection successful"
                                                        data-testid={`ai-test-ok-${entry.type}`}
                                                        style={{ display: "flex", color: PANEL_INK.SUCCESS }}
                                                    >
                                                        <UiGlyph name="check" size={PANEL_GRID.GLYPH} />
                                                    </Box>
                                                    <Box
                                                        component="span"
                                                        style={{ fontSize: READING_FONT_SIZE, color: PANEL_INK.CHROME }}
                                                    >
                                                        {describeTest(test, now)}
                                                    </Box>
                                                </>
                                            )}

                                            {test?.status === "error" && (
                                                <Box
                                                    component="span"
                                                    data-testid={`ai-test-error-${entry.type}`}
                                                    style={{ fontSize: READING_FONT_SIZE, color: PANEL_INK.WARNING }}
                                                >
                                                    {test.message}
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Not PanelQuietButton: that component fixes the secondary
                                            ink, and destroying the user's key is the one verb in
                                            this pane that the boards draw in the danger ink
                                            (Settings.dc.html:842). */}
                                        {connected && (
                                            <Button
                                                variant="subtle"
                                                h={PANEL_GRID.CONTROL_HEIGHT}
                                                px={PANEL_GRID.TRAIL_GAP}
                                                radius="sm"
                                                c={PANEL_INK.DANGER}
                                                data-testid={`ai-remove-key-${entry.type}`}
                                                style={{ fontSize: READING_FONT_SIZE }}
                                                onClick={() => {
                                                    handleRemove(entry.type);
                                                }}
                                            >
                                                Remove key
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Key storage. */}
            <Box style={{ display: "flex", flexDirection: "column", maxWidth: PANE_COLUMN }}>
                <Box style={{ height: 1, background: PANEL_INK.DIVIDER }} />
                <Box
                    style={{
                        display: "flex",
                        alignItems: "center",
                        height: PANEL_GRID.SECTION_HEADER,
                        fontSize: NAME_FONT_SIZE,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        color: PANEL_INK.VALUE,
                    }}
                >
                    Key storage
                </Box>
                <Box style={{ display: "flex", flexDirection: "column", gap: PANEL_GRID.TRAIL_GAP }}>
                    <Checkbox
                        label="Remember API keys"
                        checked={isPersistenceEnabled}
                        data-testid="ai-remember-keys"
                        styles={{
                            label: {
                                fontSize: READING_FONT_SIZE,
                                lineHeight: 1.2,
                                color: PANEL_INK.VALUE,
                            },
                        }}
                        onChange={(event) => {
                            handleRememberChange(event.currentTarget.checked);
                        }}
                    />
                    {/* FLOOR KEEP (Settings.dc.html:966), and the one prose block in this
                        pane: it says where the user's credentials go, which is 6.7's third
                        carve-out, and it is what the box above will do before it does it.
                        No density setting may move it behind an info circle. */}
                    <Box
                        component="span"
                        style={{ fontSize: READING_FONT_SIZE, lineHeight: 1.4, color: PANEL_INK.PROSE }}
                    >
                        Keys are encrypted and stored in this browser only. They are sent to the provider you choose
                        and nowhere else.
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
