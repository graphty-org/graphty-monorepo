# Session: set aside minor characters for every count and drawing -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md), played in character.

Task as given by the moderator: "The Les Miserables network is open (example data, not your own). For every count and every drawing from now on, you want to set aside the minor characters -- anyone who shares chapters with fewer than five others. Set that up, then say how many characters are left."

Start screen: shots/tasks/r8-t20/01.png. Renders: tmp/round-8-sessions/r8-t20--knowledge-engineer/02.png to 10.png.
All commands ran from design/ui/prototype.

## Think-aloud

**01 (start screen).** The Graph tree is open with PageRank selected. "Fewer than five others" is degree under five, so I need a filter, not a hidden layer. The top bar has a funnel button labeled "Full graph". That looks like the scope for the whole session, so I try it first.

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t20 --click "Full graph"
```

**02.** It moved me to the Data section. The Filters box says: "No filters. Filters change what is computed; the eye in the Graph tree only hides." Good. That is the exact distinction I care about, written in one sentence. Clicking "Add filter step".

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t20 --click "Full graph" --click "Add filter step"
```

**03.** A "New step" appeared and the condition menu opened by itself: "By an attribute or computed value", "Top of a computed value", "Largest component", "k-core", and "Neighbors of the selection", which is grayed out. I do not take k-core. A 5-core strips nodes repeatedly until every remaining node has degree 5 or more within what remains. That is not "shares chapters with fewer than five others" on the full graph. I am glad the menu offers both; a tool that offered only k-core would quietly give a different answer. I pick the attribute option.

```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"
```

**04.** The attribute picker lists nodes / edges / Results / Notes. "degree" is under "Other attributes", so it is a stored column from the GEXF file, not something the tool computed. I want to know who computed it and whether it is weighted. I pick it anyway and plan to check afterward.

```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree"
```

**05.** Wrong target. The "degree" in the Attributes list on the left took the click, so the right panel now shows the attribute, not my step. It answered my question, though: "miserables.gexf (imported, not computed)", 77 of 77 nodes have a value, range 1 to 36, median 6. A maximum of 36 matches "Highest degree 36" in the graph summary, so it is plain unweighted degree. Fine. Back to the dropdown.

(Facilitation note: two controls share the name "degree". In a real session the pointer would land on the open dropdown. The step below is the same intent, aimed at the dropdown.)

```
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes"
```

**06.** "degree" / "is at least" / an empty box. "At least 5" keeps everyone with five or more co-appearance partners, the inverse of what I am setting aside. That is correct. Typing 5.

```
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5
```

**07.** The 5 is in the box, but nothing else changed. "This step: 77 of 77 nodes", the step is still named "degree is at least" with no number, and the top bar still says "Full graph". No Apply button. Perhaps Enter.

```
timeout 120 node app-b/study.mjs --try .../08.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter
```

**08.** Now the top bar reads "41 of 77 nodes", and the step reads "degree is at least 5 -- 41 of 77 nodes (the full graph)". degree moved into "In use (3)" with "Filter s..." beside it. So the answer is 41.

But the canvas is unchanged. The Myriel fan in the upper right is still drawn: those are characters who appear only with the bishop, degree 1. The PageRank legend still says 0.00330 to 0.0754, the same as before. The empty Filters box told me filters "change what is computed", and the moderator asked for every drawing. So why is the drawing the same? I check the top-bar chip.

```
timeout 120 node app-b/study.mjs --try .../09.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter --click "41 of 77 nodes"
```

**09.** The chip shows the Co-appearances graph summary. It still says 77 nodes, 254 edges, density 0.0868, average degree 6.60, highest degree 36, 1 connected component. Those are the full graph's numbers, sitting under a top bar that says 41 of 77. Nothing tells me whether this summary is the file or my filtered view. One more check: the node table.

```
timeout 120 node app-b/study.mjs --try .../10.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter --click "Table"
```

**10.** The table header says "41 of 77 nodes", but the pager says "Rows 1 to 77 of 77", and the rank column says "#1 of 77". The measure columns, to be fair, are labeled honestly: "Degree (full graph)", "Rank by degree (full graph)", "PageRank (full graph)". So the tool admits those values were computed before the filter, and I like that it says so. But the row count, the summary panel and the drawing all still say 77, and nothing explains it. That is two unexplained disagreements. I stop here.

## Result

- Answer given: **41 characters are left** (degree at least 5, out of 77).
- Succeeded? Partly. The filter exists, it is the right condition, and the 41 is stated in three places: the top bar, the step and the table header. I am not convinced it applies to "every count and every drawing". The canvas still draws 77, the graph summary still reports 77 nodes and 254 edges, and the table pager says 77 of 77. If I had to defend the 41 to a stakeholder, I could. If I had to defend any other number on that screen, I could not say which population it describes.
- Single Ease Question: **4 of 7.** Finding the filter took one click and the wording was good. Committing the threshold needed an Enter that nothing asked for. The aftermath leaves me unsure the setup did what was asked.
- Would I use this instead of my current tool? Not yet. In SPARQL this is a HAVING (COUNT(?other) >= 5) and every downstream number comes from the same result set. Here the filter's count and the rest of the screen disagree. The ideas are right: a filter that is separate from hiding, k-core offered as a separate choice, "(imported, not computed)" provenance, "(full graph)" on stale measures. If the drawing, the summary and the row count followed the filter, or each said "full graph" the way the table columns do, I would take it seriously.

## Problems observed

1. After the filter applies, the canvas still draws all 77 nodes, including the degree-1 characters it should remove. The task asked for every drawing. (High)
2. The graph summary under the top-bar chip still says 77 nodes, 254 edges, average degree 6.60, density 0.0868, with no label saying it describes the unfiltered graph. (High)
3. The table header says "41 of 77 nodes" while its pager says "Rows 1 to 77 of 77". (Medium)
4. Typing the threshold does nothing until Enter. "This step: 77 of 77" and the step name lag behind the box, and there is no Apply button. (Medium)
5. The PageRank legend range does not change and is not labeled as full-graph, unlike the table columns. (Low to medium)
6. Two controls on screen are both named "degree" (the Attributes list and the picker option). (Low)

## What worked

- "Filters change what is computed; the eye in the Graph tree only hides." The one sentence that told me where to go and why.
- The top-bar scope button doubles as the way in, and after the filter it reports "41 of 77 nodes".
- The condition menu separates "By an attribute" from "k-core", so a degree threshold is not silently turned into a core decomposition.
- The attribute inspector says "miserables.gexf (imported, not computed)" with its range, so I could verify the column before trusting it.
- Table columns say "(full graph)" when a measure was computed before the filter.
