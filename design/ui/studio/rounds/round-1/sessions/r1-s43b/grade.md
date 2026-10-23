# Grade: session r1-s43b -- Tom, untangle the Les Miserables drawing

**Grade: SD** (success with difficulty). Tom applied two layout methods other than the one in use,
Circle (`07.png`) and Spectral (`08.png`), and the node positions changed visibly each time. That
meets the task's definition of success. It is SD, not S, because his first choice, "No crossings",
did nothing (`06.png`), so he reached a working method only after that detour. At the end he put
the drawing back to "Force - Recommended" (`09.png`), which matches the drawing he started with.
Putting it back does not undo the earlier changes. His verdict that no method helped is recorded as
an opinion. On this build that is the expected answer, and it does not count as a failure.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`). The success path is 3:
  open the sample, open Layout, pick another method.
- **Wrong turns:** 1. Choosing "No crossings" (`06.png`) changed nothing. Tom stopping to look at
  the drawing after Circle and Spectral was not a wrong turn, because each of those choices
  completed the task. Restoring Force at step 9 was a choice, not an error.
- **False "done":** none. Tom said he did not finish. Each thing he said about the screen was true:
  "Nothing moved" at `06.png`, "a ring" at `07.png`, "bunched in the bottom corner" at `08.png`.
- **Usage card:** declined with "No thanks". No detour.
- **Build-decided:** partly. The method he picked first does nothing on this graph and says
  nothing about it (problem 1). The other methods in the list still worked.
- **Void:** no. `real.mjs` did nothing a person could not do.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                     |
| --- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | 3        | build-defect | On Les Miserables, picking "No crossings" changes nothing. The Method box goes back to "Force - Recommended" and the drawing stays exactly the same. No message says that the method cannot draw this graph (it is not planar) or that anything went wrong. Tom could not tell whether it had worked, failed or was still running. The same thing happened on every scripted run (repro below). | step 6 `06.png`; repro `rounds/round-1/repro/r1-s43b/06.png` |
| 2   | 2        | behavior     | Spectral moves almost every node into one cluster at the bottom right, with one node far above it at the top, and the camera does not refit to the result. The cluster is half hidden behind the Layout box. Tom read the result as "broken".                                                                                                                                                   | step 8 `08.png`                                              |
| 3   | 2        | wording      | Nothing in the method list says what each method does or which one to use for seeing groups. Only "Recommended" gives any guidance. Tom understood "only a few" of the names and picked "No crossings" because it "sounds like untangling".                                                                                                                                                     | step 5 `05.png`                                              |
| 4   | 1        | wording      | The Seed field has no explanation, and Tom left it alone because he did not know what it was. It does no harm here, but it takes up space in a box this small.                                                                                                                                                                                                                                  | step 4 `04.png`                                              |
| 5   | 1        | opinion      | The bottom toolbar shows four icons and no words. Tom found Layout by guessing from the arrows icon. He never hovers, so he did not see the tooltip.                                                                                                                                                                                                                                            | step 3 `03.png`, step 4 `04.png`                             |
| 6   | 1        | behavior     | After "No crossings", a small "x" with no text appeared next to the Layout box. It looks like the close button of an empty message. It did not appear in the scripted repro.                                                                                                                                                                                                                    | step 6 `06.png`                                              |
| 7   | 0        | opinion      | Every node is the same color, so even a better arrangement would not have shown Tom which characters belong together. That is what he actually wanted from "untangle".                                                                                                                                                                                                                          | transcript, "Where I hesitated"                              |

## Repro of problem 1

`rounds/round-1/repro/r1-s43b/` (build 452285142099, graphty@0.8.53), from the studio folder:

```
node tool/real.mjs --start rounds/round-1/repro/r1-s43b empty
node tool/real.mjs --step  rounds/round-1/repro/r1-s43b --click "No thanks"
node tool/real.mjs --step  rounds/round-1/repro/r1-s43b --click "Les Miserables"
node tool/real.mjs --step  rounds/round-1/repro/r1-s43b --click "Layout"
node tool/real.mjs --step  rounds/round-1/repro/r1-s43b --click "Method" --click "No crossings" --wait 5000
node tool/real.mjs --step  rounds/round-1/repro/r1-s43b --wait 10000
node tool/real.mjs --end   rounds/round-1/repro/r1-s43b
```

`05.png` and `06.png` are the same drawing as `04.png`, and the Method box reads
"Force - Recommended" 15 seconds after "No crossings" was chosen. No message is shown, and the
session log holds no error.
