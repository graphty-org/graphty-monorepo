/**
 * @file The synchronous doors of `session.sets`: the reads that only look at records and the
 * writes that resolve nothing (design/sets/sets-design.md sections 13.2, 13.3, 15.2).
 *
 * Each write door does the one thing a pure `prepare` cannot: it reaches the graph to turn a
 * session edge id into the edge's stable identity, and it mints the id and the order. Then, in one
 * store write group, it prepares one operation and writes the result. A no-op writes nothing and
 * emits nothing.
 *
 * Built by the session, not yet published on it.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, EdgeMember, EdgeRef, SetDefinitionInput, SetId } from "../../catalog/types";
import { edgeCounterOf, stableEdgeMember } from "../../data/edgeIdentity";
import { readEndpoint } from "../../data/endpoints";
import { GraphtyError } from "../../errors/GraphtyError";
import type { SessionAttributes } from "../types";
import {
    defaultName,
    MAX_EDGE_MEMBER_EDIT,
    prepareCreate,
    prepareMembers,
    prepareRedefine,
    prepareRemove,
    prepareRename,
} from "./prepare";
import { SetsStore } from "./store";
import type { ElementSet, SetMemberDelta, SetsApi } from "./types";

/** What the doors read from the rest of the session. */
interface SetsDependencies {
    /**
     * A session edge's stable identity.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** The most edge members one member edit may touch. */
    readonly maxEdgeMembers?: number;
}

/**
 * A session edge's stable identity, read from the current snapshot: its file id at the configured
 * `edgeIdPath` when there is one, else its ordinal among its pair's edges in its load, else the id
 * minted from its counter.
 * @param snapshot - The current snapshot.
 * @param id - The session edge id.
 * @param attributes - The edge's attribute bag by row, where the file id is read.
 * @param edgeIdPath - The configured file-id path, or null.
 * @returns The member, or undefined when the snapshot holds no such edge.
 */
export function sessionEdgeMember(
    snapshot: GraphSnapshot,
    id: EdgeId,
    attributes: (row: number) => SessionAttributes | undefined,
    edgeIdPath: string | null,
): EdgeMember | undefined {
    const counter = edgeCounterOf(id);
    const row = counter === INVALID_INDEX ? INVALID_INDEX : snapshot.edgeIndexOf(counter);
    if (row === INVALID_INDEX) {
        return undefined;
    }

    const bag = edgeIdPath === null ? undefined : attributes(row);
    const fileId = bag === undefined || edgeIdPath === null ? undefined : readEndpoint(bag, edgeIdPath);
    const usable = typeof fileId === "string" || (typeof fileId === "number" && Number.isFinite(fileId));

    return stableEdgeMember(snapshot, row, usable ? fileId : undefined);
}

/**
 * Build the synchronous doors over a store.
 * @param dependencies - Where session edge ids are looked up.
 * @param store - The slice; a fresh one when absent.
 * @returns The doors.
 */
export function createSetsApi(dependencies: SetsDependencies, store: SetsStore = new SetsStore()): SetsApi {
    const limit = dependencies.maxEdgeMembers ?? MAX_EDGE_MEMBER_EDIT;

    /**
     * An edge reference in stable form.
     * @param ref - A session edge id or a member.
     * @returns The member.
     * @throws `E_BAD_COMMAND` for a session edge id the graph does not hold.
     */
    const stable = (ref: EdgeRef): EdgeMember => {
        if (typeof ref !== "string") {
            return ref;
        }

        const member = dependencies.edgeMember(ref);
        if (member === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The graph holds no edge "${ref}". An edge member needs its stable identity, which only a held edge has.`,
                source: "data",
                details: { edge: ref },
            });
        }

        return member;
    };

    /**
     * A definition with every session edge id replaced by its stable member. Other values pass
     * through for the validator to judge.
     * @param definition - The definition as given.
     * @returns The definition, stable.
     */
    const stabilise = (definition: SetDefinitionInput): unknown => {
        const loose = definition as { kind?: unknown; edges?: unknown };
        if (!Array.isArray(loose.edges) || (loose.kind !== "fixed" && loose.kind !== "path")) {
            return definition;
        }

        const edges = (loose.edges as unknown[]).map((step) => {
            if (typeof step === "string") {
                return stable(step);
            }

            return Array.isArray(step) ? step.map((ref: unknown) => (typeof ref === "string" ? stable(ref) : ref)) : step;
        });

        return { ...definition, edges };
    };

    const stableDelta = (delta: SetMemberDelta): { nodes?: SetMemberDelta["nodes"]; edges?: readonly EdgeMember[] } => ({
        ...(delta.nodes === undefined ? {} : { nodes: delta.nodes }),
        ...(delta.edges === undefined ? {} : { edges: delta.edges.map(stable) }),
    });

    /**
     * Write a prepared record, or nothing for a no-op.
     * @param record - The record, or null.
     */
    const write = (record: ElementSet | null): void => {
        if (record !== null) {
            store.put(record);
        }
    };

    return {
        list: () => store.list(),

        get: (id: SetId) => store.get(id),

        create(definition: SetDefinitionInput, options: { readonly name?: string } = {}): SetId {
            const concrete = stabilise(definition);

            return store.transact(() => {
                const name = options.name ?? defaultName(store);
                const id = store.mint(typeof name === "string" ? name.trim() : "");
                store.put(prepareCreate(store, { id, name, order: store.nextOrder(), definition: concrete, createdFrom: { kind: "user" } }));

                return id;
            });
        },

        rename(id: SetId, name: string): void {
            store.transact(() => {
                write(prepareRename(store, { id, name }));
            });
        },

        redefine(id: SetId, definition: SetDefinitionInput): void {
            const concrete = stabilise(definition);
            store.transact(() => {
                write(prepareRedefine(store, { id, definition: concrete }));
            });
        },

        addMembers(id: SetId, members: SetMemberDelta): void {
            const add = stableDelta(members);
            store.transact(() => {
                write(prepareMembers(store, { id, add }, limit));
            });
        },

        removeMembers(id: SetId, members: SetMemberDelta): void {
            const remove = stableDelta(members);
            store.transact(() => {
                write(prepareMembers(store, { id, remove }, limit));
            });
        },

        remove(id: SetId): void {
            store.transact(() => {
                store.delete(prepareRemove(store, { id }));
            });
        },
    };
}
