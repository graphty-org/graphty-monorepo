# Autosave on the iPad: the manual checklist

What no automated run can show: how Safari on a real iPad treats autosaved work when it hides,
suspends, kills or forgets the page. The iOS Simulator covers an app switch followed by Safari being
terminated (`.github/workflows/work-protection-macos.yml`); it has no memory-pressure killer, no
7-day storage rule and no Stage Manager. This checklist covers those, in about 15 minutes of hands-on
time plus one overnight wait. The design it checks is `design/work-protection/design.md`.

## Setup

1. Start graphty-element's Storybook and the collector through servherd, both over HTTPS so the
   iPad can reach them by the machine's hostname:

    ```jsonc
    servherd_start({ name: "graphty-element-storybook", cwd: "<repo>/graphty-element", protocol: "https",
      command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run storybook",
      env: { PORT: "{{port}}", HOST: "0.0.0.0" } })
    servherd_start({ name: "autosave-collector", cwd: "<repo>/graphty-element", protocol: "https",
      command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} node scripts/autosave-collector.mjs",
      env: { PORT: "{{port}}" } })
    ```

2. On the iPad, open the diagnostics story by itself (not inside the Storybook manager), with the
   collector's URL added:

    ```
    https://<storybook host>:<port>/iframe.html?id=autosave-diagnostics--diagnostics&viewMode=story&collector=https://<collector host>:<port>
    ```

3. The page shows a graph, five buttons (Edit, Edit and leave, Import 100,000 nodes, Request
   persistence, Clear log) and a log. Each log line starts with the load number (`#1`, `#2`, ...);
   a new number means the page was loaded again. The same lines, with the time each arrived, are
   at `https://<collector host>:<port>/` and in `graphty-element/tmp/autosave-diagnostics/collector.jsonl`.
4. Press Clear log before the first case.

**How to read a result.** After every case, find the newest `ready` line. `restored` names the
revision that came back, and `probes` lists the `probe` value of every node. The work is safe when
`restored.revision` is at least the last revision a `status` line reported as `saved` before the case
started, and `probes` holds exactly that revision (every node agrees, so the restore is whole). Write
down the outcome as pass or fail, and the lines that show it.

## Cases

Make two edits (press Edit twice, wait for a `status` line with `"state":"saved"` after each) before
every case unless the case says otherwise. Unless noted, "come back" means switch back to Safari and
to the same tab.

| #   | Case                             | Steps                                                                                                                                                                             | Expected outcome                                                                                                                                                                                                                                                |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | App switch, 1 minute             | Press Edit once more and switch to another app at once. Wait 1 minute. Come back.                                                                                                 | A `visibility` `hidden` line, then a `saved` status for the last edit (the write on hide). Either no new load (the page was only suspended), or a new load whose `ready` restores the last edit.                                                                |
| 2   | App switch, 10 minutes           | As case 1, waiting 10 minutes, with a few other apps opened meanwhile.                                                                                                            | As case 1. A new load is likely (Safari reloads a page it dropped); its `ready` restores the last saved revision.                                                                                                                                               |
| 3   | App switch, overnight            | As case 1, and leave the iPad overnight.                                                                                                                                          | A new load whose `ready` restores the last saved revision. Note whether `persisted` is true (case 8).                                                                                                                                                           |
| 4   | Tab closed from the tab switcher | Press Edit once more, open the tab overview at once and close the tab. Open the story URL again.                                                                                  | `beforeunload` never fires on iOS and no prompt appears. The new load restores at least the revision saved before the last edit; the last edit is back only if a `saved` line for it reached the collector before the close.                                    |
| 5   | Stage Manager                    | With Stage Manager on, put Safari beside another app, then make the other app the only one on screen; press Edit in Safari first. Come back after 1 minute.                       | A `hidden` line only when Safari's window left the screen; the last edit saved on hide; no work lost.                                                                                                                                                           |
| 6   | Home Screen app                  | Share, Add to Home Screen; open it from the icon (the `boot` line shows `"standalone":true`). Repeat cases 1 and 4 there.                                                         | As cases 1 and 4. The Home Screen app has its own storage: a `ready` with `restored: null` on its first load is correct.                                                                                                                                        |
| 7   | Private window                   | Open the URL in a private tab, make two edits, close the private tab, open the URL in a private tab again.                                                                        | An `at-risk` line when the first edit is saved, with `ephemeral` `"likely"` if Safari's private storage is detectable. After reopening, `restored: null` is expected (private storage ends with the window); record what IndexedDB did.                         |
| 8   | Persistent storage               | Press Request persistence, in a tab and again in the Home Screen app.                                                                                                             | A `persist` line with `granted` true or false, and the `ready` line's `persisted` agrees on the next load. Record both answers.                                                                                                                                 |
| 9   | Large import, then app switch    | Press Import 100,000 nodes; wait for a `saved` status after the `import` line (it can take several seconds). Press Edit, switch to another app at once, wait 1 minute, come back. | No work lost: the `ready` line (after a new load, if there was one) shows 100,000 `nodes` and restores at least the last saved revision. If the page was killed, note whether the kill came during the write on hide (a `hidden` line and no `saved` after it). |
| 10  | Memory kill                      | After case 9, open several heavy pages (maps, a video, large documents) in other tabs and apps for a few minutes. Come back to the diagnostics tab.                               | Either the page survived (no new load) or a new load restores at least the last saved revision. Record which, and roughly how much was open.                                                                                                                    |

## Platform questions this answers

Record the answer to each beside the case that shows it:

- Is `persist()` granted in a Safari tab? In a Home Screen app? (case 8)
- Does a granted `persist()` keep the work past Safari's 7-day rule for sites not visited? Check
  again after 8 days without opening the page: the `ready` line restores the work, or `restored: null`
  with no `saved` lines lost from the collector's record. (case 8, revisited)
- What does IndexedDB do in a private window: does it work, and is it gone after the window
  closes? (case 7)
- At what point does the iPad kill the page for memory: after the 100,000-node import alone, during
  the write on hide, or only with other heavy pages open? (cases 9 and 10)

## Recording the run

Copy the collector's file (`graphty-element/tmp/autosave-diagnostics/collector.jsonl`) beside the
filled-in checklist. A failed case is a defect in graphty-element's autosave: file it with the case
number, the iPad and iPadOS version (in the `agent` field of every collector line) and the lines
that show it.
