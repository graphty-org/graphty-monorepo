/**
 * @file One store for the credentials a reader asks the element to remember: the AI provider keys
 * (its `ai` namespace, an `ApiKeyManager` with its storage keys unchanged) and the credentials of
 * network sources (its `source` namespace), keyed by source id, the endpoint's origin, the source's
 * credential slot and, for basic authentication, the user name. Both share one persistence switch, one encryption and one
 * passphrase: the `ApiKeyManager`'s (design/graph-io/network-sources-design.md section 6.4).
 *
 * Lookup is by the origin about to be contacted, so a project file naming another endpoint never
 * receives a credential remembered for a different host. Experimental.
 */

import {
    type Credential,
    type CredentialKind,
    fromStorableCredential,
    type StorableCredential,
    storableCredential,
} from "@graphty/graph-io";

import type { ApiKeyManager } from "../ai/keys/ApiKeyManager";
import { GraphtyError } from "../errors/GraphtyError";

/** The item the source namespace keeps in the AI key manager's store. */
const SOURCE_ITEM = "source-credentials";

/** The slot of a source that declares none; a credential saved before slots existed fills it. */
const DEFAULT_SLOT = "default";

/** Where a source credential is used. Experimental. */
export interface SourceCredentialTarget {
    /** The source id. */
    readonly source: string;
    /** The endpoint; only its origin (scheme, host and port) is kept. */
    readonly endpoint: string | URL;
    /**
     * The source's credential slot it fills (`credentialSlots(descriptor)`, "api_key" for
     * OpenAlex). Absent: it fills whichever slot the source's load asks for.
     */
    readonly slot?: string;
}

/** One remembered credential, as `list()` describes it: never a secret. Experimental. */
export type StoredCredentialInfo =
    | {
          /** An AI provider key. */
          readonly namespace: "ai";
          /** The provider. */
          readonly provider: string;
      }
    | {
          /** A network source credential. */
          readonly namespace: "source";
          /** The source id. */
          readonly source: string;
          /** The origin it is sent to. */
          readonly origin: string;
          /** Its kind. */
          readonly kind: CredentialKind;
          /** A basic credential's user name. */
          readonly username?: string;
          /** The credential slot it fills, when it was remembered for one. */
          readonly slot?: string;
      };

/** A remembered source credential, as stored. */
interface Entry {
    readonly source: string;
    readonly origin: string;
    readonly slot?: string;
    readonly parts: StorableCredential;
}

/**
 * The scheme, host and port of an endpoint.
 * @param endpoint - the endpoint
 * @returns the origin
 */
function originOf(endpoint: string | URL): string {
    const url = new URL(String(endpoint));
    return `${url.protocol}//${url.host}`;
}

/**
 * The key an entry is stored under.
 * @param entry - the entry
 * @returns the key
 */
function keyOf(entry: Entry): string {
    const { source, origin, slot, parts } = entry;
    return JSON.stringify([source, origin, parts.kind === "basic" ? parts.username : "", slot ?? ""]);
}

/**
 * Whether an entry fills a slot: one remembered for that slot, or for no slot in particular.
 * @param entry - the entry
 * @param slot - the slot, or undefined for any
 * @returns true when it does
 */
function fills(entry: Entry, slot: string | undefined): boolean {
    return slot === undefined || entry.slot === undefined || entry.slot === slot;
}

/** The credentials a reader asked to remember: AI keys and network-source credentials. Experimental. */
export class CredentialStore {
    #ai: ApiKeyManager | null = null;
    readonly #ready: Promise<void>;
    readonly #entries = new Map<string, Entry>();

    /**
     * Make a store over an AI key manager, whose persistence it shares.
     * @param ai - the key manager, or a promise of it (the element loads it on first use); a
     *     rejected promise leaves the store in memory only
     */
    constructor(ai?: ApiKeyManager | Promise<ApiKeyManager>) {
        this.#ready = this.#attachWhenLoaded(ai); // NOSONAR(S7059): the constructor's contract accepts a promise of the key manager
    }

    /**
     * Attach the key manager now, or once its promise settles.
     * @param ai - the key manager, a promise of it, or nothing
     * @returns settles once attached, or once the promise rejected
     */
    async #attachWhenLoaded(ai?: ApiKeyManager | Promise<ApiKeyManager>): Promise<void> {
        if (ai === undefined) {
            return;
        }
        if (!(ai instanceof Promise)) {
            this.#attach(ai);
            return;
        }
        let manager: ApiKeyManager;
        try {
            manager = await ai;
        } catch {
            return; // a rejected promise leaves the store in memory only
        }
        this.#attach(manager);
    }

    /**
     * Take the key manager and the source credentials it persisted.
     * @param manager - the key manager
     */
    #attach(manager: ApiKeyManager): void {
        this.#ai = manager;
        const saved = manager.getStoredItem(SOURCE_ITEM);
        for (const entry of Array.isArray(saved) ? (saved as Entry[]) : []) {
            const key = keyOf(entry);
            if (!this.#entries.has(key)) {
                this.#entries.set(key, entry);
            }
        }
    }

    /**
     * The `ai` namespace: the AI provider key manager, with its persistence switches. Null until
     * it has loaded, and when it cannot (the optional `encrypt-storage` peer is missing).
     * @returns the manager, or null
     */
    get ai(): ApiKeyManager | null {
        return this.#ai;
    }

    /**
     * Remember a network-source credential for a source at an endpoint's origin, and for one of
     * its credential slots when `target.slot` names it. Kept in memory, and on this device when the
     * AI key manager's persistence is on.
     * @param target - the source, the endpoint and the slot
     * @param credential - from the `credentials` factories
     * @throws A `GraphtyError` with `E_CREDENTIAL_NOT_STORABLE` (`{ kind }`) for a token
     *     function, an AWS provider or a custom credential.
     */
    async remember(target: SourceCredentialTarget, credential: Credential): Promise<void> {
        const parts = storableCredential(credential);
        if (parts === null) {
            throw new GraphtyError({
                code: "E_CREDENTIAL_NOT_STORABLE",
                message: `A ${credential.kind} credential holds a function, so it cannot be remembered.`,
                source: "data",
                details: { kind: credential.kind },
            });
        }

        await this.#ready;
        const entry: Entry = {
            source: target.source,
            origin: originOf(target.endpoint),
            ...(target.slot === undefined ? {} : { slot: target.slot }),
            parts,
        };
        this.#entries.set(keyOf(entry), entry);
        this.#save();
    }

    /**
     * The remembered credential for a source, the origin about to be contacted and, when given,
     * the credential slot to fill.
     * @param source - the source id
     * @param origin - the origin, or any URL on it
     * @param slot - the slot; one remembered for no slot in particular fills any
     * @returns the credential, bound to that origin only, or undefined
     */
    async lookup(source: string, origin: string | URL, slot?: string): Promise<Credential | undefined> {
        await this.#ready;
        const wanted = originOf(origin);
        const matches = [...this.#entries.entries()].filter(
            ([, entry]) => entry.source === source && entry.origin === wanted && fills(entry, slot),
        );
        // A credential remembered for this very slot wins over one remembered for no slot.
        const [key, entry] = matches.find(([, e]) => e.slot === slot) ?? matches[0] ?? [];
        if (key === undefined || entry === undefined) {
            return undefined;
        }

        if (slot === DEFAULT_SLOT && entry.slot === undefined) {
            this.#migrate(key, { ...entry, slot });
        }

        return fromStorableCredential(entry.parts, { origins: [entry.origin] });
    }

    /**
     * Re-key an entry saved before credentials had slots under the slot a lookup found it for.
     * @param key - its old key
     * @param entry - the entry with its slot
     */
    #migrate(key: string, entry: Entry): void {
        this.#entries.delete(key);
        const migrated = keyOf(entry);
        if (!this.#entries.has(migrated)) {
            this.#entries.set(migrated, entry);
        }
        this.#save();
    }

    /**
     * Forget the credentials remembered for a source at an endpoint's origin: those of one slot
     * when `target.slot` names it, else all of them.
     * @param target - the source, the endpoint and the slot
     */
    async forget(target: SourceCredentialTarget): Promise<void> {
        await this.#ready;
        const origin = originOf(target.endpoint);
        for (const [key, entry] of this.#entries) {
            const slotMatches = target.slot === undefined || entry.slot === target.slot;
            if (entry.source === target.source && entry.origin === origin && slotMatches) {
                this.#entries.delete(key);
            }
        }

        this.#save();
    }

    /**
     * Everything remembered, never a secret: the AI providers with a key, then the source credentials.
     * @returns one entry per credential
     */
    list(): readonly StoredCredentialInfo[] {
        const ai: StoredCredentialInfo[] = (this.#ai?.getConfiguredProviders() ?? []).map((provider) => ({
            namespace: "ai",
            provider,
        }));
        const sources: StoredCredentialInfo[] = [...this.#entries.values()].map(({ source, origin, slot, parts }) => ({
            namespace: "source",
            source,
            origin,
            kind: parts.kind,
            ...(parts.kind === "basic" ? { username: parts.username } : {}),
            ...(slot === undefined ? {} : { slot }),
        }));
        return Object.freeze([...ai, ...sources]);
    }

    /** Forget every AI key and every source credential, in memory and on this device. */
    async forgetAll(): Promise<void> {
        await this.#ready;
        this.#ai?.clear();
        this.#entries.clear();
        this.#save();
    }

    /** Hand the source namespace to the key manager, which persists it when persistence is on. */
    #save(): void {
        this.#ai?.setStoredItem(SOURCE_ITEM, this.#entries.size === 0 ? undefined : [...this.#entries.values()]);
    }
}
