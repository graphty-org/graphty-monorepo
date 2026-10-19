# The text and file service shared by the six VR mocks

Date: 2026-10-10. For graphty's owner and whoever builds the mocks. Every mock in [the mock recommendation](../xr-prototype-mocks.md)
beside this file types text, opens data and saves through this one service, so the mocks compare
interaction and not infrastructure. It is built once, in the first two weeks, before any mock's
own controls.

## Headset only (the default condition)

Every mock's basic journey is first run and counted this way.

- **Text.** An in-scene keyboard opens under every focused text field. It has a caret, Left and
  Right caret keys, word-jump keys, Home and End, a completion row drawn from the data's own names
  and ids, attribute names and common English, Enter and Done. Pinching inside a field's text
  places the caret at the nearest word boundary; the caret keys do the rest, because a hand ray
  cannot hit the gap between two letters. Typing is pinching keys, so no typing pause is needed.
  Suggested names everywhere mean most saves and sets need no typing; ids match on any part
  ("48213" finds ACC-48213).
- **Opening data.** Home lists Samples (built in), Recent, and Files on this headset (files kept in
  graphty's own storage in the headset browser). "Add a file from this headset..." opens the
  browser's file picker. Whether the picker opens without ending the immersive session differs by
  headset and is a check; if it ends the session, graphty re-enters VR on the same page with one
  pinch. Open URL takes an address typed on the in-scene keyboard.
- **Saving.** A project lives where it was saved. Save writes it to graphty's storage on the
  headset, and Export writes files to the headset's downloads. Each Save keeps the previous saved
  version, and the project page offers "Restore the version saved at 16:40". graphty asks the
  browser to keep its storage (`navigator.storage.persist()`). On Vision Pro, Safari may still
  clear a site's storage after 7 days without use, so a headset-only project there says so on its
  page and in Recent and offers "Keep a copy in Files" (a download, which Safari does not clear).

## Paired (an optional second condition, measured separately)

Built after the headset-only study, in this order: the laptop's keys and folder first, the phone
keyboard last.

- **Pairing.** Once, in the headset browser's 2D window before Enter VR: a six-digit code typed on
  the laptop's or phone's graphty pairing page; device keys that cannot be exported; an end-to-end
  encrypted WebRTC channel. On an iPhone the Pair button also asks for the motion permission the
  phone keyboard needs.
- **Laptop.** A folder granted on the laptop is listed in the headset as the Inbox; Save and Export
  can write back to it; Lend keyboard sends the laptop's keys to the focused field. Writing to a
  laptop folder works only in Chrome or Edge; in other browsers the laptop page offers each export
  as a download instead, and says so.
- **Phone.** graphty's own keyboard on the phone's glass. The lit key is mirrored under the field
  being typed in and commits on lift. The mirror is turned by the phone's own orientation, so a
  thumb moving right moves the lit key right whatever way the phone lies.
- **The typing gate**, for keys from another device only. It starts on a key-down or a keyboard
  touch-down, never on a phone pad touch. While a field is focused, each pinch is held back for one
  round trip (about 150 ms) and dropped if a key arrives in that window. The gate ends at once on
  Enter, Done or loss of focus, otherwise 1 s after the last key. While it is on, the ray tip dims
  and reads "paused". Enter opens the highlighted search result, so a search never needs a pinch
  inside the gate.
- **Safe writes.** Every write to a project's saved file carries the version it was based on. A
  write whose base is not the file's current version goes to a "two versions" page (both with
  their times and step counts; keep one or both), never over the file. Whichever device has a
  project open holds it; the other shows it read-only with "Open in the headset". Every existing
  file other than the project's own saved file asks before it is replaced. When the laptop is
  asleep, the Inbox says so with the time; nothing claims a background tab can keep it awake.
- **Connection.** Direct on the local network where possible, otherwise through a relay; "Direct
  only" and an organization's own pairing and relay service are Settings rows; the Devices page
  says which path the data takes. The mocks stub the relay on the development machine.

## Checks

| Check                                     | What decides it                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files without leaving VR, on each headset | Whether the file picker, Export and "Keep a copy in Files" each work without ending the immersive session; how long a re-entry takes when one does                                           |
| Text unpaired                             | Characters per minute and corrections on the in-scene keyboard for an id, a name and a sentence                                                                                              |
| Paired                                    | Time saved on text; pairing failures; whether the typing gate ever drops a wanted press; a 30-minute run with the laptop page in a background tab; whether anyone loses work (target: never) |
