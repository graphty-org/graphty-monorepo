import { isolateGit } from "../../tools/isolated-git-env.mjs";

// isolateGit keeps the caller's GIT_CONFIG_COUNT overrides. A session's signing override
// (user.signingkey, gpg.format) beats a test repository's own config, so a fixture commit would
// be signed with the session's key instead of the key the test repository trusts.
for (const k of Object.keys(process.env)) {
    if (/^GIT_CONFIG_(COUNT|KEY_\d+|VALUE_\d+|PARAMETERS)$/.test(k)) delete process.env[k];
}
isolateGit();
