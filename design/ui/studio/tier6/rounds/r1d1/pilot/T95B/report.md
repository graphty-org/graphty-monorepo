# Pilot walk: T95 B, which genes are essential, targeted re-walk

Build 48879618c4, served from `.study-builds/tier6-r1d1-48879618c4`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`, 1440 x 900. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T95B/ (written below as
`<walk>/<n>.png`). The folders with `-48879618c4` in their names are this build's walks; those
without hold the walks of the earlier build 3549e11129 and were the routes replayed here. The data
stayed yeast-galactose.graphml on both walks: 331 nodes and 361 edges, all visible and none selected,
at the end of each (`data.json`).

Result: the task can be reached by pointer. Nothing crashed, blocked the task or gave a result that
would spoil its grading. No script error, console error or failed request was printed on either walk.
An empty result alone still shows its row.

Walked: the pointer success path, and the one route of the touched list that belongs to this task
(route 35). No other route of that list is a T95 B route, so this pass has no keyboard walk or detour.

Model calls: success 9, touched-35 9.

## Success path, by pointer (success-48879618c4/)

The replay matched its first two steps and stopped at the third, only because this reply took 4 steps
where the recording took 6. The rest was walked by hand, with the same actions.

1. Assistant on the rail. Focus in the composer (02.png).
2. "Which of these genes are essential, meaning a yeast cell dies without them?", Enter. Reply: "The
   dataset does not contain gene essentiality data, tracking only gene identifiers and galactose
   expression levels (gal1RGexp, gal4RGexp, and gal80Rexp). Determining which genes are essential
   requires external yeast knockout viability data, such as from the Saccharomyces Genome Database."
   No chip, no empty row, no change to the drawing, Undo at the top still off (04.png). This is the
   key's plain refusal.
3. 4 steps opened: Query data, Query data, Catalog, Sets (05.png).
4. Composer keys: Enter when empty does nothing (06.png); Tab goes to the model label with the typed
   text kept (07.png); Shift+Tab comes back and Escape keeps the text (08.png). All as `decided.md`
   says. The placeholder text typed for this check was replaced before the next message.
5. Second question, Send button: "From what you know, which of these genes are likely essential?"
   gave "Under the centrality-lethality rule of yeast networks, highly connected hub proteins are
   significantly more likely to be essential. In this network, experimentally verified essential
   yeast genes include top hubs and critical machinery such as MCM1, RAP1, DED1, CRM1, NAB2, and SRM1,
   whereas specialized regulators like GAL4, MIG1, and STE11 are non-essential.", in plain text, with
   "Computed Connections for 331 nodes", Open run and Undo beneath (09.png). All nine genes are in the
   file. The Undo at the top lit up, as the key allows for a question that changes nothing.
6. 3 steps opened: Connections, Query data, Query data, and a chip 10 under the last query. The
   transcript took its own scrollbar; the header, scope line and composer stayed where they were
   (10.png).

## Touched route 35: an empty result alone still shows its row (touched-35-48879618c4/)

The replay matched its first step and stopped at the second, only because this reply took 8 steps
where the recording took 9.

1. "Which genes are marked essential?", Enter. Reply: "No genes are marked as essential in the
   current dataset, which only includes gene identifiers, names, and expression values. If you have an
   essential gene list or an attribute column to import, let me know how you would like to identify
   them." with "No matches for essential." and its warning mark beneath, no chip and no change line
   (03.png, the same screen as 02.png). The row is there.
2. 8 steps opened: the row shows under the Query data that came back empty, and again under the reply
   (04.png). The doubled row is already in the backlog.

## Mismatches with the answer key

None. The path of three steps, a plain refusal, a question run leaving "Computed Connections" and Undo
behind, and the list from memory all came as the key says.

## Defects

None that crashes, blocks the task or spoils its grading. Seen and already known to the key or the
backlog: the bare chip 10 in the open steps under a reply from memory (success-48879618c4/10.png, the
key's "they count the query's nodes, not the claim"); the "No matches for essential." row with a
warning mark on a correct answer, twice with steps open (touched-35-48879618c4/04.png).

One thing for the graders, in the model's words and not a build defect: this run's list from memory
says "In this network, experimentally verified essential yeast genes include ...", which reads closer
to a fact of the file than the earlier run's "In yeast biology" (success-48879618c4/09.png). It came
only because the walker asked "From what you know", and the key's `Taken on trust:` covers a reader
who repeats it as a finding.
