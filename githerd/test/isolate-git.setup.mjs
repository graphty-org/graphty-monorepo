import { rmSync } from "node:fs";
import { basename, dirname } from "node:path";
import { afterAll } from "vitest";

import { isolateGit } from "../../tools/isolated-git-env.mjs";

// isolateGit keeps the caller's GIT_CONFIG_COUNT overrides. A session's signing override
// (user.signingkey, gpg.format) beats a test repository's own config, so a fixture commit would
// be signed with the session's key instead of the key the test repository trusts.
for (const k of Object.keys(process.env)) {
    if (/^GIT_CONFIG_(COUNT|KEY_\d+|VALUE_\d+|PARAMETERS)$/.test(k)) delete process.env[k];
}
const inherited = process.env.GIT_CONFIG_GLOBAL;
isolateGit();
// The private git config this file made (a test-git-* directory), removed when the file ends; one
// it inherited belongs to the process that made it. Registered first, so it runs after every
// other afterAll.
const made = process.env.GIT_CONFIG_GLOBAL;
if (made !== inherited && basename(dirname(made)).startsWith("test-git-")) {
    afterAll(() => rmSync(dirname(made), { recursive: true, force: true }));
}
