# Round 7 grades: bring in two wide CSV exports (hosts and connections)

Task as given: "The configuration database exported two spreadsheets: one line per host, with 69
things recorded about each, and one line per network connection, with 26 things recorded about
each. They are in your Downloads folder and graphty has never seen them. Bring them in so each
connection is drawn between the two hosts it runs between, with busier connections tying hosts
more tightly. Before you bring them in, find which of the 69 things recorded about each host tells
how many serious security holes it has."

Grading bar:

- Success: "Open project or file..." or "New from data..." (or a drop) opens the file chooser,
  both CSVs are chosen, the Data page reads them, "Go to column" reaches the vulnerability column
  on the hosts table, the connections' source and target link to host by its inventory number
  (id) as proposed, bytes_total_24h is the weight with "Stronger", and Load leaves the hosts graph
  on screen.
- Success with difficulty: chooses only one file at first and adds the other on the Data page;
  opens the link's "by" list and hesitates between id and hostname before checking the sample
  rows; or reaches the column after a wrong turn or a long search.
- Failure: links the connections by hostname (no rows would match), loads without a weight while
  believing traffic is used, or opens the IT estate sample instead of the two exports.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Answer |
|---|---|---|---|---|
| Threat hunter (Priya) | success | success | hosts graph, 300 nodes, 1,105 edges, weight "bytes_total_24h, stronger" | vuln_count_critical |
| Knowledge engineer (Dr. Kim) | success | success | same screen | vuln_count_critical (plus vuln_count_high if "serious" includes high) |
| Analyst Alex | success | success | same screen | vuln_count_critical |
| ML engineer (Chris) | success | success | same screen | vuln_count_critical |
| Supply chain analyst (Dana) | success | success with difficulty | same screen | vuln_count_critical, found by arrowing 55 rows down the column list |
| Criminal intelligence analyst (Marcus) | success | success | same screen | vuln_count_critical |

Totals: 5 success, 1 success with difficulty, 0 failure, 0 gave up. All six final renders are
pixel-identical to the success path's last screen (the hosts graph with the weight shown in the
Summary). All six named vuln_count_critical, all six took both files in one pick with "New from
data...", and none changed the proposed links or weight.

If the one difficulty is set aside as caused by the study tool rather than the design (see below),
the task is 6 of 6 success.

## Why each grade

**Threat hunter -- success.** New from data, both files ticked, Open. Typed "vuln" in Find a
column, Enter jumped to vuln_count_critical. Checked the connections table: source and target
"From -> host" / "To -> host", bytes_total_24h as Weight with Stronger, match report read. Loaded
and checked 300 / 1,105 against the files. The failed "--type" step was the study tool, retried
key by key; not counted.

**Knowledge engineer -- success.** The most direct route: clicked the match in the finder
instead of pressing Enter, otherwise identical. Read every proposed role as a labeled guess and
accepted them. Named vuln_count_high as the companion if "serious" includes high, which widens
the answer but does not change it.

**Analyst Alex -- success.** Same route as the threat hunter, including the study tool's
dropped typing. Briefly weighed flow_count_24h against bytes_total_24h for "busier" and kept
bytes; never left the success path.

**ML engineer -- success.** Same route, no detours. Raised a fair doubt that "every row has both
ends" may mean "not blank" rather than "matched a host"; it did not change what they did.

**Supply chain analyst -- success with difficulty, down from their own "success".** The study
tool dropped their typed "vuln" twice and they did not retry key by key, so they paged down the
69-column list with the arrow keys (20, 35, then 55 presses) until the vuln columns appeared
(render 08), then clicked vuln_count_critical. That is a long search by the bar's definition. The
cause was the test rig, not the design: with a working keyboard the finder filters to 7 matches
on four letters, as the other five sessions show. Their finding "the finder lists 69 columns in
file order; without typing, finding one means paging through dozens" should therefore not be
counted as evidence against the design.

**Criminal intelligence analyst -- success.** Same route; three tries at typing, the first two
lost by the study tool. Read the patch_pendi...ical_count header next to the answer as a possible
rival and still chose vuln_count_critical correctly.

## What the grades do and do not show

- The task's riskiest step went untested. The bar's main failure is linking connections by
  hostname instead of id, and its main difficulty is hesitating in the link's "by" list. Nobody
  opened that list: the skeleton proposed "host by id (Key)" and every participant accepted it
  from the "From -> host" tag without seeing which host column it matched on. The sample rows
  (CI0100214 in source, matching the hosts' id) were on screen, but no one checked them. This
  round shows the proposal is trusted, not that a wrong proposal would be caught. A follow-up
  task should start with the link proposed wrongly (by hostname, match report showing 0 rows)
  and see whether people find and fix it.
- Likewise, every participant accepted bytes_total_24h as the weight because it was preselected.
  All six said unprompted that flow_count_24h was an equally good reading of "busier" and
  that the screen never said why bytes was chosen.

## Problems reported, with counts

| Problem | Participants | Severity (Nielsen 0-4) |
|---|---|---|
| Long column names are cut in the middle in the finder and grid headers ("vuln_count_critical...iated_over_30_days", "patch_pendi...ical_count"), hiding the word that tells two similar columns apart | 6 of 6 | 2 |
| The weight was chosen as bytes_total_24h with no reason given; flow_count_24h is an equally plausible "busier" and nothing says it was considered | 6 of 6 | 1 |
| No column profile (min, max, nonzero count) before loading; the 8 preview rows of vuln_count_critical are all 0, so the column cannot be sanity-checked | 2 of 6 (threat hunter, ML engineer) | 1 |
| "Every row has both ends" does not say whether both ends matched a host or were merely not blank | 1 of 6 (ML engineer) | 1 |
| "Nothing is colored or sized by a row" after Load reads as an unexplained status | 1 of 6 (intelligence analyst; three others read it as honest) | 0 |
| The project is titled "IT estate, March 2026" during import before the user named it | 1 of 6 (threat hunter) | 0 |
| The finder lists columns in file order with no hits shown | 1 of 6 (supply chain) -- caused by the study tool dropping typed text; not counted | -- |

Single Ease Question: 6 of 7 from all six.
