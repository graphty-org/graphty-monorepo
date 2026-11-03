/**
 * @file Registers `encrypt-storage` statically, for the `./ai` and `./credentials` entry points:
 * their consumers construct `ApiKeyManager` synchronously. Never imported by anything the root
 * entry point reaches; see `encryptStorage.ts`.
 */

import { EncryptStorage } from "encrypt-storage";

import { useEncryptStorage } from "./encryptStorage";

useEncryptStorage(EncryptStorage);
