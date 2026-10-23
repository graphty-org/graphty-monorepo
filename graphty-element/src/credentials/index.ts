/**
 * @file The credential store, published from `@graphty/graphty-element/credentials`. Experimental.
 */

import { ApiKeyManager, type ApiKeyManagerOptions } from "../ai/keys/ApiKeyManager";
import { CredentialStore } from "./CredentialStore";

export { CredentialStore, type SourceCredentialTarget, type StoredCredentialInfo } from "./CredentialStore";

/**
 * A credential store without an element, over a new AI key manager: remembered AI keys and source
 * credentials restore themselves when an earlier page persisted them. `<graphty-element>` has its
 * own as `element.credentials`. Experimental.
 * @param options - where the key manager keeps persisted items (its storage keys by default)
 * @returns the store
 * @example
 * ```ts
 * import { createCredentialStore } from "@graphty/graphty-element/credentials";
 * import { credentials } from "@graphty/graphty-element";
 *
 * const store = createCredentialStore();
 * await store.remember({ source: "neo4j", endpoint }, credentials.basic("neo4j", password));
 * ```
 */
export function createCredentialStore(options: ApiKeyManagerOptions = {}): CredentialStore {
    return new CredentialStore(new ApiKeyManager(options));
}
