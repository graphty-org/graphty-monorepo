# Visual review: passkey approval, implementation plan

This plan builds design.md section 8 ("Accept, reject, and approval integrity") and roadmap.md
milestone 3: an accept counts only when the owner's own device approved it with a passkey (Face
ID or Touch ID, from iCloud Keychain), and the pull request gate in CI refuses every baseline
change without such an approval. The passkey's relying party id (rpId) is `dev.ato.ms`, the host
the review page is served from. The owner reviews in Safari on an iPad and a Mac.

Everything here uses `node:crypto` and the browser's WebAuthn API. No new dependency.

## 1. How it turns on

- `visual-review/passkeys.json` ships in this pull request with no keys: `{ "version": 1, "keys": [] }`.
- The gate enforces approvals once `passkeys.json` **on the base branch** holds at least one key.
  Keys are only ever read from the base branch, never from the pull request, so a pull request
  cannot approve itself with a key it adds.
- The owner presses "Register passkey" on the review page; the server opens a pull request that
  adds the key; the owner merges it. From that merge on, every record a pull request adds must be
  version 2 with a valid approval.
- Grandfathering: records already on the base branch are never checked (the gate only reads the
  records a pull request adds, as it does today). A record a pull request adds after enforcement
  is on must verify, whatever version it claims: a version 1 record, an `"unproven": true` record
  or a version 2 record without `approval` fails the gate even when its items match.
- Once on, enforcement cannot be switched off by a pull request: the gate fails a pull request
  whose `passkeys.json` would hold no keys, or would not parse, while the base has keys.
- A pull request Finished without Face ID before enforcement and still open when it turns on
  fails the gate. The fix is to revert its accept commit (which removes the record and the
  baselines from the diff), let CI recapture, and review again with Face ID. To make that rare, the
  server asks for Face ID as soon as it knows of any key, including one it registered whose pull
  request is not merged yet.

## 2. Files

| File | Change |
|------|--------|
| `visual-review/trusted/lib/approval.mjs` | NEW. Canonical JSON, the record hash, `passkeys.json` parsing, the four assertion checks, the record checks the gate runs, the registration check. `node:crypto` only, no other import, so the gate still runs without an install. |
| `visual-review/trusted/gate.mjs` | Reads the base branch's keys, verifies each added record when enforced, counts only verified records, the enforcement-off ratchet, a `--pr` option, warnings when the pull request touches the trust files. |
| `visual-review/trusted/lib/accept.mjs` | Record version 2 (with `rejects`), `prepareRecord` (the record before the worktree exists), the record built in the worktree must hash to what was approved, the approval verified with `approval.mjs` immediately before `git commit`; the approved record in the reject comment; `proposeKey` (the registration pull request). |
| `visual-review/trusted/lib/serve.mjs` | New routes `GET /api/passkeys`, `POST /api/passkey-challenge`, `POST /api/register`, `POST /api/finish-prepare`; `POST /api/finish` takes and checks an approval; `/passkey.js` in `STATIC`; the new write routes in `WRITES`. |
| `visual-review/trusted/page/passkey.js` | NEW. All WebAuthn browser code: base64url helpers, `registerPasskey(api)`, `approve(prepared)`. |
| `visual-review/trusted/page/review.js` | Two touch points only (another branch is redesigning the page): the Finish step in `finishTarget`, and one "Register passkey" entry on the targets screen. |
| `visual-review/trusted/cli.mjs` | Nothing beyond `GATE_USAGE`, which lives in gate.mjs. |
| `visual-review/passkeys.json` | NEW, empty key list. |
| `visual-review/templates/visual-review.yml` | The gate command gains `--pr "${{ github.event.pull_request.number }}"`. |
| `.github/workflows/ci.yml` | The "Check visual changes were accepted" step gains the same `--pr` argument; its comment stops saying records are unproven. |
| `visual-review/test/passkey-vectors.mjs` | NEW. A software authenticator for tests (section 10). |
| `visual-review/test/approval.test.mjs` | NEW. The unit failure vectors. |
| `visual-review/test/gate.test.mjs`, `accept.test.mjs`, `serve.test.mjs`, `page.test.mjs` | New cases (section 11). |
| `visual-review/README.md` | New section "Approving with a passkey"; "Finish", "What the gate does and does not guarantee" and "Troubleshooting" updated. |
| `CLAUDE.md` | "Visual review": the agent rules of section 12. |

Not touched: capture, comparison, `visual-baselines/`, `visual-seed.yml`, results.json.

## 3. The record, version 2

```json
{
    "version": 2,
    "pr": 123,
    "subject": { "builtMerge": "<sha>", "head": "<sha>", "runId": 987654, "runAttempt": 1,
                 "environment": { "...": "as today" }, "scale": 2 },
    "items": [{ "path": "...", "from": "<sha256|null>", "to": "<sha256|null>", "reason": "..." }],
    "rejects": [{ "path": "visual-baselines/<project>/<file>", "capture": "<sha256>", "reason": "..." }],
    "reviewedAt": "2026-09-28T12:00:00.000Z",
    "approval": {
        "credentialId": "<base64url>",
        "authenticatorData": "<base64url>",
        "clientDataJSON": "<base64url>",
        "signature": "<base64url>"
    }
}
```

- `subject` keeps every field version 1 has (`runAttempt` and `environment` included); more bound
  facts cost nothing. `items` are built exactly as today (accepts, exclusions, removals, the two
  items of a rename), sorted by path. `rejects` is new: the path the baseline would have, and the
  hash of the image the owner looked at (the capture, or for a removed item its baseline), sorted
  by path. No `unproven` key.
- Version 1 stays what Finish writes while no key is known to the server (section 6), so nothing
  changes for anyone before registration.

**Record hash.** `canonical(record without approval)` encoded as UTF-8, then SHA-256 (32 bytes).

`canonical(v)`: `null`, booleans, numbers and strings as `JSON.stringify` writes them; an array as
`[` + its elements' canonical forms joined by `,` + `]`, order kept; an object as `{` + its keys
sorted by `Array.prototype.sort()` (UTF-16 code units), each `JSON.stringify(key) + ":" +
canonical(value)`, joined by `,` + `}`, keys whose value is `undefined` dropped. No whitespace.
Only the top-level `approval` is removed. Only Node computes the hash (the server, the gate and
the tests), so the page never needs a copy of this function.

The WebAuthn challenge is the 32 hash bytes. In clientDataJSON the browser writes them as
base64url without padding, so the check is `clientData.challenge === hash.toString("base64url")`.

## 4. passkeys.json

```json
{
    "version": 1,
    "keys": [
        {
            "id": "<credential id, base64url>",
            "publicKey": "<SubjectPublicKeyInfo DER, base64url>",
            "rpId": "dev.ato.ms",
            "label": "iCloud Keychain",
            "registeredAt": "2026-09-28T12:00:00.000Z"
        }
    ]
}
```

At the repository root path `visual-review/passkeys.json` (constant `PASSKEYS_FILE` in
approval.mjs; consumers of the package use the same path). `parsePasskeys(text)` returns the keys
or throws with the reason: `version` must be 1, `keys` an array, each `id` non-empty base64url
and unique, `rpId` a non-empty host name, `publicKey` must load with
`createPublicKey({ key, format: "der", type: "spki" })` as an EC key on `prime256v1` (ES256 is the
only algorithm). One bad entry makes the whole file invalid: the gate fails closed rather than
guessing. `label` and `registeredAt` are informational.

## 5. approval.mjs

```js
export const PASSKEYS_FILE = "visual-review/passkeys.json";
export function canonical(value)                     // section 3
export function recordHash(record)                   // Buffer(32), approval removed
export function parsePasskeys(text)                  // section 4; throws
export function verifyApproval(record, keys, { origin } = {})  // null, or why not
export function verifyRecord(record, keys, { pr })   // null, or why not; the gate's per-record check
export function verifyRegistration(input, { challenge, origin, rpId })  // the server's check
```

`verifyApproval` never throws (every parse is guarded); it returns the first failing reason, so
the gate's line names it. In order:

0. `approval` is an object whose four fields match `/^[A-Za-z0-9_-]+$/` (Buffer's base64url
   decoder silently skips bad characters, so it is checked first).
1. **The key.** `approval.credentialId` equals the `id` of a key in the list given. The gate gives
   the base branch's keys only.
2. **clientDataJSON.** Parses as JSON; `type === "webauthn.get"`; `challenge ===
   recordHash(record).toString("base64url")` (so an edited record, or an approval copied from
   another record, fails here); `crossOrigin !== true`; the origin: with `options.origin` (the
   server), exactly that origin; without it (the gate), a URL whose protocol is `https:` and whose
   hostname equals the key's `rpId` or ends with `"." + rpId`.
3. **authenticatorData.** At least 37 bytes; bytes 0-31 equal `SHA-256(key.rpId)`; flags byte 32
   has UP (bit 0) and UV (bit 2) set. The signature counter (bytes 33-36) is ignored: iCloud
   Keychain passkeys report 0.
4. **The signature.** `crypto.verify("sha256", concat(authenticatorData,
   SHA-256(clientDataJSON)), publicKey, signature)` with the default DER encoding WebAuthn uses for
   ES256. A throw counts as a bad signature.

`verifyRecord(record, keys, { pr })` first checks `version === 2`, `items` and `rejects` arrays,
then `record.pr === pr` or `record.pr === null` (a seed record, made before its pull request
existed), then `verifyApproval(record, keys)`. The `pr` check is what stops an approved record
from one pull request being copied into another; the challenge check stops an approval being
moved to a different record.

Known limit, documented in the README: a seed record (`pr: null`) could be copied into another
pull request together with the exact images the owner approved for that seed. It can only
reinstate owner-approved images, so it is accepted rather than checked against history the gate's
depth-2 checkout does not have.

`verifyRegistration` checks a `navigator.credentials.create` response: clientDataJSON `type ===
"webauthn.create"`, the server's challenge, the exact server origin; authenticatorData's rpId hash
and UP and UV flags; `algorithm === -7`; the public key loads as P-256 SPKI. It does not verify
attestation (Apple passkeys return `"none"`); the owner merging the key's pull request is the
trust step.

## 6. The server

The rpId is the hostname of the server's own origin (`dev.ato.ms` when started through servherd
with `HOST={{hostname}}`; `localhost` in the page tests). "Known keys" are the default branch's
keys (`git show refs/remotes/origin/<default>:visual-review/passkeys.json`, refreshed by the page
load's fetch) plus the keys this server registered whose pull request is not merged yet
(`<tmp>/state/passkeys-pending.json`). Approval is **required** when any key is known; the server
decides that, so leaving the approval out of a request does not skip it.

Every new route takes the session token; the POST ones go in `WRITES`, so the origin check
applies.

- `GET /api/passkeys` -> `{ rpId, keys: [{ id, rpId, label, pending }], required }`. The page uses
  it for the Register entry and to know Finish needs Face ID.
- `POST /api/passkey-challenge` -> `{ challenge, userId }`: 32 random bytes, remembered for five
  minutes and usable once.
- `POST /api/register` `{ challenge, credentialId, publicKey, algorithm, authenticatorData,
  clientDataJSON, label }` -> `verifyRegistration`; refuses an id already known; then
  `proposeKey` (accept.mjs) in a throwaway worktree at the fetched default branch: append the
  entry to `passkeys.json` (create it if absent), commit with the config's commit prefix ("register
  a visual review passkey"), push branch `visual/passkey-<UTC stamp>`, open a pull request whose
  body names the label, rpId and credential id and says that merging it turns enforcement on.
  Writes the pending key. Returns `{ entry, pullRequest }`; the page shows both. It reuses
  accept.mjs's hook-free `git` runner and `createPullRequest`. Small and quick, so it runs inline,
  not as a background job.
- `POST /api/finish-prepare` `{ id }` -> runs the same decision list `POST /api/finish` builds
  today, then `prepareRecord` (accept.mjs): `check()`, then the record without `approval` and with
  `reviewedAt` = now. Exclusion items need the old settings file, read with `git show
  <captured head>:<path>` instead of from a worktree. Stored in memory as the target's pending
  approval (one per target, replaced by the next prepare, gone after 10 minutes). Returns `{
  challenge, rpId, allowCredentials, record, required }`. When nothing is required the page skips
  Face ID.
- `POST /api/finish` `{ id, challenge, approval }`: when approval is required, refuses with 400
  without `approval`, 409 when no pending approval for the target has that challenge (prepared on
  another tab, expired, or the decisions changed: press Finish again), and 403 when
  `verifyApproval(record + approval, knownKeys, { origin })` fails. Then it starts the job as today
  with the approved record and the decisions it was built from (not a fresh read of the state
  file). `POST /api/decide` and `accept-all` on a target drop its pending approval.

**Inside Finish (accept.mjs).** `commitAccepts` keeps every check it has. It builds the record in
the worktree as today (with `reviewedAt` from the approved record and the version 2 shape) and
refuses with "the record changed after you approved it; press Finish again" unless
`recordHash(built)` equals the approved hash. After `fetch(defaultBranch)` it reads the keys from
`refs/visual-review/origin/<default>` plus the pending keys and runs `verifyApproval(record,
keys, { origin })` once more, immediately before writing the record file and `git commit`: the gate's
own code, on the bytes about to be committed. One shared function builds the items (split out of
`write()`: compute the items and the file to write from the old bytes, then apply), so prepare and
commit cannot drift; the hash comparison catches it if they ever do.

A Finish with only rejects commits nothing: the reject comment's machine-readable block gains a
`record` field holding the approved record. The seed retry path ("a seed this tool pushed whose
pull request failed to open is used as it is") keeps returning the pushed commit; its record was
approved when it was pushed.

## 7. The page

`trusted/page/passkey.js` (new, served as `/passkey.js`, imported by review.js):

- `registerPasskey(api)`: `GET /api/passkeys`, `POST /api/passkey-challenge`, then
  `navigator.credentials.create({ publicKey: { rp: { id: rpId, name: "Visual review" }, user: {
  id, name: "visual-review", displayName: "Visual review owner" }, challenge, pubKeyCredParams: [{
  type: "public-key", alg: -7 }], authenticatorSelection: { residentKey: "preferred",
  userVerification: "required" }, attestation: "none", excludeCredentials: known } })`, then
  `POST /api/register` with `response.getPublicKey()`, `getPublicKeyAlgorithm()`,
  `getAuthenticatorData()` and `clientDataJSON` as base64url. Returns the server's answer.
- `approve(prepared)`: `navigator.credentials.get({ publicKey: { challenge, rpId,
  allowCredentials, userVerification: "required", timeout: 120000 } })` and returns the four
  approval fields as base64url.
- Its own base64url helpers (no `Uint8Array.fromBase64`, which older Safari lacks).

Safari requires a user gesture for both calls. So no network request may sit between the press
and the WebAuthn call: the challenge is fetched before the button is shown.

`review.js`, two touch points:

1. `finishTarget`: fetch `/api/finish-prepare` together with `/api/target`; when `required`, add a
   line "Face ID approves this record: N accepts, M rejects" to the question and label the yes
   button "Approve with Face ID and finish"; on yes, call `approve(prepared)` first, before any
   `await`, then `POST /api/finish` with the approval. A `NotAllowedError` (cancelled, or Safari
   refused the gesture) gives up with "Not approved: nothing was changed" and leaves the Finish
   button on, so a second press tries again.
2. A "Register passkey" button on the targets screen next to the signing-key block: it calls
   `registerPasskey` and shows the entry and the pull request link, or the error.

## 8. The gate

`runGate` gains `--pr <number>`. Before the existing checks it reads `git show
<base>:visual-review/passkeys.json`:

- absent, or zero keys: enforcement is off; the gate behaves exactly as today.
- does not parse (`parsePasskeys` throws): fail with "passkeys.json on the base branch is invalid:
  <reason>". Fail closed.
- one key or more: enforcement is on. `--pr` must be given (else fail, naming the option). And the
  pull request's own `passkeys.json` at `--head` must still parse with at least one key (else
  fail: "this pull request would switch approval enforcement off").

`unrecordedChanges(base, head, cwd, baselines, { keys, pr })`: with `keys`, each record the pull
request adds is checked with `verifyRecord(record, keys, { pr })` (unparseable JSON fails too).
A record that fails is one error line, `<path>: <reason>` (for example `approval is from a key not
in passkeys.json on the base branch`), and its items do not count. Only verified records fill the
`reviewed` set, so the existing "changed with no review record naming its new contents" line then
names every baseline the bad record claimed. Every added record must pass, even one that names
nothing that changed. Without `keys` the function is unchanged.

Warnings (`::warning::`, never a failure, so the owner's own registration pull request passes):
the pull request changes `visual-review/passkeys.json`, `visual-review/trusted/gate.mjs`,
`visual-review/trusted/lib/approval.mjs` or the gate step's workflow file. They point code review
at the files a pull request could use to loosen the gate.

`GATE_USAGE` documents `--pr`.

## 9. CI

- `ci.yml`, "Check visual changes were accepted": `node visual-review/trusted/cli.mjs gate --captures
  "$RUNNER_TEMP/visual" --pr "${{ github.event.pull_request.number }}" --base HEAD^1 --head HEAD`.
  The step stays pull-request only and inside "All Checks Pass", the required check. The sparse
  checkout of `visual-review` already holds `passkeys.json`; the gate reads it from `HEAD^1` with
  `git show`, which the partial clone fetches on demand.
- The template's "Visual gate" job gets the same arguments; `workflows.test.mjs` already fails
  when ci.yml's gate arguments differ from the template's.
- What fails the required check: the gate exits 1 on any line of section 8 or the existing
  checks, which fails the step, the "All Checks Pass" job and so the required check. In a consumer
  repository it fails the "Visual gate" job, which the template tells them to require.
- The gate still runs from the pull request's own checkout (so a gate change is tested by its own
  pull request); moving it to code the pull request cannot edit is the later hardening step the
  roadmap names, not part of this plan. The warnings and code review cover it until then.

## 10. Test vectors

`test/passkey-vectors.mjs` is a software authenticator that produces exactly the bytes a WebAuthn
authenticator and browser produce:

```js
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const entry = { id: randomBytes(16).toString("base64url"),
    publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64url"),
    rpId: "dev.ato.ms", label: "test", registeredAt: "2026-09-28T12:00:00.000Z" };

function approve(record, key, { rpId = key.rpId, origin = `https://${rpId}:9443`,
        flags = 0x05, type = "webauthn.get", challenge = recordHash(record) } = {}) {
    const authenticatorData = Buffer.concat([sha256(rpId), Buffer.from([flags]), Buffer.alloc(4)]);
    const clientDataJSON = Buffer.from(JSON.stringify({ type,
        challenge: challenge.toString("base64url"), origin, crossOrigin: false }));
    const signature = sign("sha256", Buffer.concat([authenticatorData, sha256(clientDataJSON)]),
        key.privateKey);  // DER, as WebAuthn ES256
    return { credentialId: key.entry.id, authenticatorData: b64u(authenticatorData),
        clientDataJSON: b64u(clientDataJSON), signature: b64u(signature) };
}
```

Flags `0x05` are UP and UV. The same helper makes registration responses (`type
"webauthn.create"`) for the server tests. Keys are generated per test run; nothing secret is
checked in.

Real-browser bytes: `page.test.mjs` uses Chromium's virtual authenticator over CDP
(`WebAuthn.enable`, `WebAuthn.addVirtualAuthenticator` with `protocol: "ctap2"`, `transport:
"internal"`, `hasResidentKey`, `hasUserVerification`, `isUserVerified`) on `http://localhost`, so a
registration and a Finish approval made by a real browser are verified by `approval.mjs`. After
the owner's first real approval, its record and public key (public data only) become a fixture,
so Safari and iCloud Keychain bytes are tested too.

## 11. Tests

`approval.test.mjs` (pure, no git): a valid approval passes; and each fails with its own reason:

- an edited record (`items[0].to` changed after signing);
- an approval moved onto another record (signed for record A, attached to record B);
- a wrong rpId (authenticatorData hashed for `evil.example`, key registered for `dev.ato.ms`);
- a wrong origin: `https://evil.example`, `http://dev.ato.ms:9443`, `https://notdev.ato.ms`
  (suffix without the dot); and with `{ origin }`, any origin but the exact one;
- UV clear (flags `0x01`), and UP clear (`0x04`);
- an unknown key (credential id not in the list);
- a bad signature (one byte flipped), and a valid signature by a different key;
- `type: "webauthn.create"`, `crossOrigin: true`, authenticatorData shorter than 37 bytes, non-base64url
  fields, clientDataJSON that is not JSON, a missing approval -- each a reason, never a throw;
- `canonical`: key order and whitespace do not change the hash; `approval` is excluded; a change
  to any nested value does;
- `parsePasskeys`: a non-P-256 key, a duplicate id, a bad version, invalid JSON are refused;
- `verifyRegistration`: wrong challenge, wrong origin, `alg` -257, UV clear are refused.

`gate.test.mjs` (git repositories from `makeRepo`, base and head commits):

- base without passkeys.json, and with zero keys: version 1 records pass as today (enforcement off);
- base with a key: an approved version 2 record naming the changed baseline passes;
- a record added in the old format (version 1, `unproven`) after enforcement fails, even with
  matching items, and its baseline is reported unrecorded;
- a version 2 record without `approval` fails;
- a replayed approval from another pull request (record `pr: 5`, gate `--pr 6`) fails;
- keys taken from the pull request: the pull request adds key K2 to passkeys.json and signs with
  it, the base holds only K1: fails as an unknown key;
- grandfathered: version 1 records already on the base, with enforcement on and no new record,
  pass;
- an added record that names nothing changed but does not verify still fails;
- base passkeys.json invalid fails closed; the pull request emptying or deleting passkeys.json
  while enforced fails; enforced without `--pr` fails;
- a change to passkeys.json, gate.mjs or approval.mjs prints the warning and still passes.

`accept.test.mjs`: `prepareRecord` and the committed record hash the same (accepts, exclusions,
removals, renames, rejects); the committed record is version 2 with the approval and verifies with
`verifyRecord`; Finish refuses before committing when the record differs from the approved one,
and when the approval does not verify; with no known key it writes version 1 as today; a
rejects-only Finish puts the record in the comment block.

`serve.test.mjs`: the four routes and the finish changes: token and origin checks; challenge
single use and expiry; register refuses each `verifyRegistration` failure and a known id, and on
success pushes `visual/passkey-*` to the fake remote and opens a pull request through the fake gh;
`required` follows default-branch and pending keys; finish without an approval when required is
400, a stale challenge 409, a bad approval 403, and a good one starts the job.

`page.test.mjs` (Chromium, virtual authenticator): register, then Finish with Face ID end to end;
a cancelled approval (virtual authenticator with `isUserVerified: false`, refused by
`userVerification: "required"`) leaves nothing changed and the Finish button on.

The existing fault and journey tests keep calling Finish with no key known, so they do not change.

## 12. README and CLAUDE.md

README (`visual-review/README.md`):

- New "Approving with a passkey": what it proves; registering (start the page from your own shell
  on the host the passkey is for; press Register passkey; Face ID; merge the pull request it
  opens; the rpId is the page's host, so serve from the same host every time); Finish asks for Face
  ID once a key is known; a lost device loses nothing with iCloud Keychain; adding or replacing a
  key is another registration; `passkeys.json` lives at `visual-review/passkeys.json` in every
  repository using the tool.
- "Finish": the Face ID step and the version 2 record.
- "What the gate does and does not guarantee": rewritten. Once a key is on the base branch, every
  added record must carry an approval from the owner's device for exactly that record and that
  pull request; it does not prove the owner looked at every image; a page altered on the machine
  could ask approval for something else; a seed record can be replayed with its own images; the
  gate runs from the pull request's own workflow and code, so changes to them need code review
  (the gate warns).
- "Troubleshooting": "the record changed after you approved it"; "no passkey for this host";
  "approval is from a key not in passkeys.json on the base branch"; a pull request Finished before
  enforcement (revert its accept commit and review again).

`CLAUDE.md`, "Visual review", added to the agent rules:

- Agents never edit `visual-review/passkeys.json`, `visual-review/trusted/gate.mjs`,
  `visual-review/trusted/lib/approval.mjs` or the gate step in ci.yml, never register a passkey,
  and never call the page's passkey or Finish routes. Only the owner registers keys and approves.
- A gate line about a missing or invalid approval is fixed only by the owner reviewing again, never
  by writing or editing a record.
- An agent must never create a passkey or a virtual authenticator against a real review server;
  the virtual authenticator is for the test suite's own servers only.
- The sentence saying records are unproven is replaced by what the gate now checks.

## 13. Order of work

Each step ends with `npm run lint`, `npm run test:run` (page tests through
`design/ui/prototype/kit/with-browser.sh` in the ux-storyboards worktree, one browser at a time)
and a GPG-signed conventional commit on `feat/visual-review-passkey`, no attribution trailers.
Long commands under `timeout` (900 s at most).

1. `approval.mjs`, `test/passkey-vectors.mjs`, `approval.test.mjs`.
2. The gate: keys from the base, `verifyRecord` per added record, the ratchet, `--pr`, the
   warnings, `GATE_USAGE`; `visual-review/passkeys.json` with no keys; `--pr` in ci.yml and the
   template; gate tests.
3. accept.mjs: record version 2 with `rejects`, the shared item builder, `prepareRecord`, the hash
   comparison and the final `verifyApproval` before commit, the reject comment's record,
   `proposeKey`; accept tests.
4. serve.mjs: the routes, the pending approval and pending keys, `/passkey.js`; serve tests.
5. `passkey.js` and the two review.js touch points; page tests with the virtual authenticator.
6. README and CLAUDE.md.
7. Full package lint, typecheck, knip and tests; push the branch and open the pull request.

Then the owner: start the page from their own shell on `dev.ato.ms`, press Register passkey on
the iPad or Mac, merge the pull request it opens. Enforcement is on from that merge. After the
first real Face ID Finish, its record and public key become the Safari fixture of section 10.
