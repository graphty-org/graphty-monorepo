# Persona: the reporter with a contacts sheet ("Ruth")

Composite persona for the simulated user study. A first-time user of graph tools: a reporter who
has built a spreadsheet of people, companies and the ties between them for a story, and needs to
see who connects to whom. Built from the public sources listed under Sources. No real person's
identity is used. Details marked *(assumed)* have no source and exist only to make her concrete.

## Why this persona exists

The owner's priority (2026-10-02) names "a journalist with a contacts sheet" as an everyday
first-time user. Investigative and data journalism is a documented user group of network tools,
but no existing persona is a reporter.

## Portrait

Ruth is a reporter on a regional paper's investigations desk *(assumed)*. Her current story is
about who sits on which company boards and which of those companies won public contracts. She has
kept a sheet of names, companies and the tie between them for weeks. Guides for journalists
describe the method she is after: network tools reveal "who is connected to whom" and "how are
they connected" (search summary of an EBU Spotlight guide to investigative network mapping), and
the Panama Papers reporters used Gephi to "visualize and explore the web of offshore entities and
connections" (Bellingcat toolkit, read directly).

## Background and tools

- **Spreadsheets, documents, a notes app.** She is fast in a spreadsheet and slow in anything
  that wants a schema. The Bellingcat toolkit rates Gephi "a moderate learning curve" and advises
  that "a good strategy is to focus on one feature at a time" (read directly).
- **What she has heard of.** Flourish for charts; Kumu, where a map can be "updated by updating a
  public Google Sheet" (search summary of GIJN resources); NodeXL "for Microsoft Excel" (search
  summary of GIJN resources).
- **What she does not have.** Time to learn graph theory, or data already shaped as two files.
  Gephi has "no built-in data collection, meaning users must independently source and prepare
  network data before importing" (Bellingcat toolkit, read directly).

## Goals

1. Get the sheet in and confirm that every person and company arrived, with nothing silently
   dropped.
2. Find the shortest chain between two people in the story, and who sits in the middle of many
   chains.
3. A picture with names that an editor and a graphics desk can use, and a table of the numbers
   she can check line by line.
4. Notes on why a tie matters, kept with the tie, because every claim must be sourced.

## Frustrations, with evidence

- **A tool that hides its steps.** Every claim in a story must be checkable; a number she cannot
  explain to an editor is a number she cannot print *(assumed from the role; consistent with the
  "how are they connected" framing above)*.
- **Large or messy data slows to a crawl.** "Interactivity can degrade on very large graphs"
  (Bellingcat toolkit, read directly).
- **Preparing data before the tool will look at it.** See "no built-in data collection" above.

## Behavior rules for playing her in a session

- **Starts with a name.** After loading, types a person's name into the first search box she sees.
- **Asks "how do I know?"** For every number, looks for what it counted and over what.
- **Wants notes on things, not in a separate document.** Expects to attach a note to a person or
  a tie, and expects the note to keep its date even with no name set.
- **Export is a must.** Picture for the editor, table for the fact-checker.
- **Privacy-sensitive.** Unpublished names must not leave the computer; she checks.

## Evidence limits

No first-person account by a reporter learning a graph tool was read directly (the EBU guide
returned an error; the GIJN article refused automated access). Her paper, her story and her desk
are assumptions. Weight findings on import, search, notes and export over findings on her words.

## Sources

1. Bellingcat Online Investigation Toolkit, "Gephi", https://bellingcat.gitbook.io/toolkit/more/all-tools/gephi (read directly)
2. EBU Spotlight, "How to Use Maltego and Gephi for Investigative Journalism", https://spotlight.ebu.ch/p/investigative-network-mapping-link (search summary only; the page returned 404 when fetched)
3. GIJN, "Unleashing the Power of Social Network Analysis for Investigative Journalism", https://gijn.org/stories/power-social-network-analysis-investigative-journalism/ (search summary only; fetch refused)
4. GIJN, "My Favorite Tools 2020" and resource pages naming Kumu, Flourish and NodeXL, https://gijn.org/stories/my-favorite-tools-2020-top-investigative-journalists-tell-us-what-theyre-using/ (search summary only)
</content>
</invoke>
