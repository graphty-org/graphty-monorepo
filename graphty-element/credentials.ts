/**
 * @file `@graphty/graphty-element/credentials`: one store for the credentials a reader asks to be
 * remembered -- AI provider keys and network-source credentials -- with one persistence switch.
 *
 * ```js
 * import { createCredentialStore } from "@graphty/graphty-element/credentials";
 * ```
 *
 * `<graphty-element>` has its own store as `element.credentials`; this entry point is for an
 * application with no element, or one that wants the store's types. It loads the optional
 * `encrypt-storage` peer the AI key manager persists with, like `./ai`. Experimental.
 */

export type { ApiKeyManagerOptions, PassphrasePersistenceConfig, PersistenceConfig } from "./src/ai/keys/ApiKeyManager";
export { ApiKeyManager } from "./src/ai/keys/ApiKeyManager";
export {
    createCredentialStore,
    CredentialStore,
    type SourceCredentialTarget,
    type StoredCredentialInfo,
} from "./src/credentials/index";
export { type Credential, type CredentialKind, credentials } from "@graphty/graph-io";
