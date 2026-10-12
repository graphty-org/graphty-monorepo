/**
 * @file The shapes the assistant's generated tools are built from: a tool is a family of actions,
 * an action is a zod object of fields plus the session call it makes, and what it reaches (an op,
 * a door, a catalog entry) is declared beside it so the coverage test can read it. Nothing here is
 * exported from a public entry point except through `./catalog`'s constants.
 */

import type { z } from "zod";

import type {
    AlgorithmDescriptor,
    CameraDescriptor,
    FormatDescriptor,
    LayoutDescriptor,
    PaletteDescriptor,
    ScaleDescriptor,
} from "../../catalog/types";
import type { AiEvent } from "../../events";
import type { ChannelDescriptor } from "../../session/styles/channels";
import type { GraphSession, TransactionScope } from "../../session/types";
import type { CommandContext } from "../commands/types";

/** A value that survives `JSON.stringify` unchanged. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** A JSON object. */
export type JsonObject = { [key: string]: JsonValue };

/**
 * What one action reaches, for the coverage test: a session op it dispatches, a public member
 * (`<root>.<member>`, the root names of `doors.ts`) it calls, or a catalog entry
 * (`<table>/<id>`) it offers.
 */
export type Reach =
    | { readonly op: string }
    | { readonly door: string }
    | { readonly catalog: string }
    /** Every option of every entry of a catalog table, which the action validates and passes on. */
    | {
          readonly options: "algorithms" | "layouts" | "engines" | "formats" | "writers" | "scales" | "cameras";
          /** Only these option names, when the action passes only some. */
          readonly only?: readonly string[];
      };

/**
 * How an action relates to undo. `read` changes nothing; `write` joins the message's step;
 * `exempt` changes something no project file saves (the camera, the selection) and adds no step.
 */
export type ActionEffect = "read" | "write" | "exempt";

/** What a write did, which the gate adds to the message's running totals. */
export interface Measure {
    readonly removeNodes?: number;
    readonly removeEdges?: number;
    readonly changedValues?: number;
    /** It replaced or emptied the graph. */
    readonly replaces?: boolean;
    /** It cannot be undone. */
    readonly irreversible?: boolean;
    /** It fetched a URL the reader did not give, which a host admitted. */
    readonly network?: string;
}

/** A page of records, as a result reports it. */
export interface PageInfo {
    readonly total: number;
    readonly returned: number;
    readonly cursor?: string;
    /**
     * Where the page starts and the revision it was read at, never shown to the model: a page cut
     * down to fit the result cap gets a cursor to the first record it dropped.
     */
    readonly at?: { readonly offset: number; readonly revision: string };
}

/** What an action returns: a code and its facts, never English. */
export interface ActionResult {
    /** The session's own success code where it has one; `AI_OK` when absent. */
    readonly code?: string;
    readonly params?: JsonObject;
    readonly data?: JsonValue;
    readonly page?: PageInfo;
    readonly measure?: Measure;
    /** On-demand tools this result names, which the next turn offers. */
    readonly load?: readonly string[];
    /** Ids of nodes the action touched, for the reader-facing result. */
    readonly affectedNodes?: readonly string[];
    /**
     * The rest of the action, a wait with nothing left to write (a run finishing, a recording):
     * its result replaces this one. The batch's last call waits after the batch commits, so the
     * batch holds nothing while it waits and the reader's own edits go through; any other call
     * waits at once, since the calls after it may read what it made.
     */
    readonly settle?: (context: SettleContext) => Promise<ActionResult>;
}

/** What a settling action reads: the session, which its batch's closed transaction no longer is. */
export interface SettleContext {
    readonly session: GraphSession;
    readonly signal: AbortSignal;
    readonly host: ToolHost;
}

/**
 * A coded refusal an action throws: the model reads `{ code, params }` and can fix the call in
 * one retry. Never thrown for a bug; a bug is an ordinary error and fails the message.
 */
export class ToolRefusal extends Error {
    /**
     * A refusal.
     * @param code - The cause code (`AI_TOOL_CAUSE_CODES`) or a session `E_*` code.
     * @param params - The facts the model needs to fix the call.
     */
    constructor(
        readonly code: string,
        readonly params: JsonObject = {},
    ) {
        super(code);
        this.name = "ToolRefusal";
    }
}

/** What the conversation hands an action besides its arguments. */
export interface ToolHost {
    /** Hands the reader's application an event (an export's payload, an approval request). */
    emit(event: AiEvent): void;
    /** The reader's own text in this message, which an import URL must appear in verbatim. */
    readonly readerText: string;
    /** Admits a URL the reader did not type; absent, none is admitted. */
    readonly allowImportUrl?: (url: URL) => boolean;
}

/**
 * Why a batch is held for the reader's approval: a measured limit, `"policy"` when the host's
 * approval policy asked about one of its calls, or `"plan"` for a hand-off to helpers while
 * `confirmPlans` is set.
 */
export type GateKind = "slow" | "large" | "replaces" | "irreversible" | "network" | "policy" | "plan";

/** One call the model made, as an approval policy judges it before anything runs. */
export interface AiToolCallFacts {
    /** The tool's name (for `call`, the tool it stands for). */
    readonly command: string;
    /** The action, for a tool generated from the catalog. */
    readonly action?: string;
    /** The arguments, as checked. */
    readonly arguments: Readonly<Record<string, unknown>>;
    /** What the call does: `read` changes nothing, `write` changes the project, `exempt` changes only the view. */
    readonly effect: ActionEffect;
}

/** What an approval policy says about one call: run it, ask the reader first, or refuse it. */
export type AiApprovalVerdict = "allow" | "ask" | "deny";

/**
 * The limits past which the assistant's changes are held for the reader's approval, by the
 * host and never by the model. `AiManagerConfig.gate` sets them; `false` turns the gate off.
 */
export interface AssistantGateLimits {
    /** Nodes one message may remove. */
    readonly removeNodes: number;
    /** The share of the graph's nodes one message may remove, 0 to 1. */
    readonly removeNodesShare: number;
    /** Edges one message may remove. */
    readonly removeEdges: number;
    /** Attribute values one message may change. */
    readonly changedValues: number;
    /** Seconds an algorithm run or a layout may be estimated to take. */
    readonly slowSeconds: number;
}

/** The gate's limits when a host sets none. */
export const DEFAULT_ASSISTANT_GATE_LIMITS: Readonly<AssistantGateLimits> = Object.freeze({
    removeNodes: 50,
    removeNodesShare: 0.2,
    removeEdges: 500,
    changedValues: 1000,
    slowSeconds: 30,
});

/**
 * Thrown inside a batch to hold it for approval: the batch rolls back, and the host is asked.
 */
export class GateHold extends Error {
    /**
     * A hold.
     * @param gate - Why.
     * @param preview - What the reader is shown: counts, seconds, the selector, the first ids.
     */
    constructor(
        readonly gate: GateKind,
        readonly preview: JsonObject,
    ) {
        super(gate);
        this.name = "GateHold";
    }
}

/** State that lives for one message: what the gate and the undo rules count. */
export interface MessageState {
    /** The gate's limits, or false when it is off. */
    readonly gate: Readonly<AssistantGateLimits> | false;
    /**
     * The hold the reader approved, while that batch runs again: only that kind is let through,
     * and every other limit still holds -- except after a `"policy"` hold, whose reader approved
     * these exact calls before any ran, so no limit asks them again.
     */
    readonly approved?: GateKind;
    /**
     * The host's approval policy, judged per call before a batch runs; absent, every call is
     * allowed. For a batch the reader already approved only a `"deny"` counts, so edited
     * arguments cannot get past it.
     */
    readonly policy?: (call: AiToolCallFacts) => AiApprovalVerdict;
    /**
     * Set while a helper runs beside others (`"parallel-helper"`): every call that does not only
     * read (a write, an undo or redo, a selection, the view, cancelling a run) is refused
     * (`AI_TOOL_DENIED_BY_POLICY` with this as `reason`), before the policy is asked.
     */
    readonly readOnly?: "parallel-helper";
    /** The message's id, its steps' `provenance.message`. */
    readonly id: string;
    /** Runs the assistant started in this conversation, which it may cancel without asking. */
    readonly runs: Set<string>;
    /**
     * Undo or redo calls made in this message (at most one): one counter, shared by every copy of
     * the state (each helper running beside others gets one), so the limit is the message's.
     */
    readonly undo: { calls: number };
    /**
     * How often each tool the provider runs (a web search) was used in this message: shared by
     * every copy of the state, so a `maxUses` is the message's. Absent, each run counts its own.
     */
    readonly hostedUses?: Record<string, number>;
    /** The message's running totals of what its writes did. */
    readonly totals: { removeNodes: number; removeEdges: number; changedValues: number };
}

/**
 * Whether a change of one kind is held for approval in this message: the gate is on, and the
 * reader has not already approved that kind (or the batch's exact calls) for the batch running now.
 * @param message - The message.
 * @param kind - Why it would be held.
 * @returns True when the action must throw a `GateHold`.
 */
export function gated(message: MessageState, kind: GateKind): boolean {
    return message.gate !== false && message.approved !== kind && message.approved !== "policy";
}

/** Everything an action runs with. */
export interface ActionContext {
    /** Where writes go: the batch's transaction. */
    readonly tx: TransactionScope;
    /** The session itself, for the history and an undo. */
    readonly session: GraphSession;
    /** The graph, for what only the renderer does (the camera, a capture, XR). */
    readonly graph: CommandContext["graph"];
    readonly signal: AbortSignal;
    readonly message: MessageState;
    readonly host: ToolHost;
}

/** One action of a tool. */
export interface ActionSpec {
    /** The `action` value. */
    readonly name: string;
    /** One line for the model: what it does. */
    readonly summary: string;
    /** Its fields, each described. `action` is added by the generator. */
    readonly fields: z.ZodRawShape;
    readonly effect: ActionEffect;
    /** What it reaches, for the coverage test. */
    readonly reaches: readonly Reach[];
    /** Extra words `catalog` search matches it by. */
    readonly keywords?: readonly string[];
    /**
     * Settle spellings before validation: a legacy or differently cased catalog name becomes the
     * catalog's own. Returns the arguments to validate.
     */
    readonly prepare?: (args: Record<string, unknown>) => Record<string, unknown>;
    /**
     * Run it.
     * @param context - The session and the message.
     * @param args - Its arguments, validated.
     * @returns Its coded result.
     */
    run(context: ActionContext, args: Record<string, unknown>): Promise<ActionResult>;
}

/** A tool: a family of actions. */
export interface ToolDefinition {
    readonly name: string;
    /** The default name a transcript may show for it. */
    readonly plainName: string;
    /** Offered on every turn, or only once a `catalog` result names it. */
    readonly core: boolean;
    /** What it is for and when not to use it, for the model. */
    readonly description: string;
    /** One example call, for the description. */
    readonly example: JsonObject;
    readonly actions: readonly ActionSpec[];
}

/** The catalog as one build of the tools reads it: built-in and registered entries. */
export interface CatalogView {
    readonly algorithms: readonly AlgorithmDescriptor[];
    /** Algorithm classes registered with no descriptor, by `namespace:type`: runnable, never described. */
    readonly legacyAlgorithms: readonly string[];
    readonly layouts: readonly LayoutDescriptor[];
    readonly formats: readonly FormatDescriptor[];
    readonly palettes: readonly PaletteDescriptor[];
    readonly cameras: readonly CameraDescriptor[];
    readonly scales: readonly ScaleDescriptor[];
    readonly channels: readonly ChannelDescriptor[];
}
