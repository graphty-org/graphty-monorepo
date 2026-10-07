# Grade: session r1-s45 -- Nadia, a picture and the numbers for a report (Les Miserables)

**Grade: S** (success). Both files are in `downloads/` and both meet the task's success
definition. The path was the success path, with the menu entry used instead of Control+e for the
first opening, and no wrong turns. She stopped to read a large warning on the Data tab, but read
the preview under it and went on without a detour, so the session is not SD.

Build: commit 9d6598eea (graphty 0.8.53), 1440 x 900.

## The two files

1. **Image: `downloads/les-miserables_current-view.png`** (1806 x 1720), against the last
   screenshot `06.png`, by the picture checklist:
   - Same nodes, same arrangement: yes. The orange cluster at the top, the green core, the blue
     and light-blue cluster on the left, the yellow fan on the right and the pink star at the
     bottom sit where they do on screen; the lone yellow node far right and the lone light-blue
     node top left match.
   - Sizes visibly different: not part of T13 (no size channel in use).
   - Names drawn on screen are drawn in the image: no names are drawn on screen, and none in the
     image. Holds.
   - A key naming every channel in use: the image carries "Color: Communities" with Group 1 to
     Group 6 and their swatches, in the same colors as the screen's key. Color is the only
     channel in use. Holds.
2. **Data: `downloads/les-miserables_nodes.csv`**: a header and 77 rows, one per character, 77
   distinct ids, columns `id,name,results.louvain.group,results.louvain.groupSize`. The group
   counts are 20, 17, 11, 11, 10 and 8, which match the left panel and the key in `06.png`. The
   computed column is present, so the `numbers without the computed column` failure does not
   apply. CSV opens in Excel, so it is not `wrong-file-type`.

`06.png` shows the toast "Exported les-miserables_nodes.csv"; the image's own toast was seen at
step 4.

## Measures

- **Steps:** 5 `real.mjs` steps after the start (`02.png` to `06.png`) against a success path of
  6; the menu click stands in for Control+e on the first opening.
- **Wrong turns:** 0.
- **False "done":** none. "Picture done, and the key is in it" (step 4) and the final "Done" (step
  6) are both true: the files exist and pass. truth_on_screen: not applicable.
- **Tool prints:** step 4 reported that "Export" matched both the dialog and its button and took
  the button, which is what she meant. Step 5 used a bare `--click "Data"`, which the answer key
  warns can reach the left rail's Data button; here it reached the dialog's Data tab (the
  transcript shows the Data tab's content). Not a tool fault.
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | The Data tab's large yellow box "CSV cannot hold everything" reads like an error and lists things she never asked for (positions, style columns, graph attributes) in words she does not know ("generic dialect", "importer", "read back as directed"). She could not tell whether her numbers were safe until she read the preview below it, and spent longer here than anywhere else. A hurried user may stop or switch formats. | step 5 `05.png` |
| 2 | 2 | wording | The CSV's headings are `results.louvain.group` and `results.louvain.groupSize`. The screen calls the run "Communities" and the values "Group"; "Louvain" appears nowhere she looked. She would rename the columns before the report. | the CSV download, step 6 |
| 3 | 0 | opinion | The key is a dark box on screen and a white box in the image. She noticed it and did not mind. | `06.png`, the image download |

No problem here is a build defect under the criteria (no crash, dead control, wrong count or
keyboard block), so there is no repro for this session.
