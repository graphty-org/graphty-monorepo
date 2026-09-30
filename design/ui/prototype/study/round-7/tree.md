graphty, with a project open
|
+-- Main menu (the button at the top of the rail)
|   +-- Quick actions... (Ctrl+K; type what you want to do, in your own words)
|   +-- File
|   |   +-- Open... (Ctrl+O)
|   |   +-- Update with new data...
|   |   +-- Export... (Ctrl+Shift+E)
|   |   +-- Download project file
|   |   +-- Version history
|   |   +-- Project info...
|   |   +-- Rename
|   |   +-- Duplicate
|   |   +-- Close
|   +-- Edit
|   |   +-- Undo (Ctrl+Z)
|   |   +-- Redo (Ctrl+Shift+Z)
|   |   +-- Undo history
|   |   +-- Copy ids
|   |   +-- Select all
|   +-- View
|   |   +-- 2D or 3D
|   |   +-- Table
|   |   +-- Minimize UI
|   +-- Selection
|   |   +-- Neighbors... (hops, direction, from a date)
|   |   +-- Paths between...
|   |   +-- Create set
|   |   +-- Add note...
|   +-- Algorithms
|   |   +-- Centrality (Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank,
|   |   |   Weighted degree)
|   |   +-- Community (Girvan-Newman, Label propagation, Leiden, Louvain)
|   |   +-- Path (All-pairs distance, Breadth-first search, Depth-first search, Shortest path)
|   |   +-- Structure (Bridges, K-core, Maximum bipartite matching, Minimum spanning tree,
|   |   |   Topological sort)
|   |   +-- Flow (Maximum flow, Minimum cut)
|   |   +-- Prediction (Link prediction)
|   +-- Recipes
|   |   +-- Apply a recipe...
|   |   +-- Export recipe...
|   +-- Preferences
|   |   +-- Your name on notes and recipes
|   |   +-- Theme
|   |   +-- Assistant provider
|   |   +-- Usage data
|   |   +-- Use WebGPU when available
|   |   +-- Default overview
|   |   +-- Reduced motion
|   |   +-- Scroll wheel zooms
|   +-- Help
|       +-- Documentation
|       +-- Keyboard shortcuts
|
+-- Project name menu (the project's name at the top of the left panel)
|   +-- Open... (Ctrl+O)
|   +-- Update with new data...
|   +-- Export... (Ctrl+Shift+E)
|   +-- Download project file
|   +-- Version history
|   +-- Project info...
|   +-- Rename
|   +-- Duplicate
|   +-- Close
|
+-- The line under the project name ("Nothing has been sent from this project")
|
+-- The loaded file's chip (under the project name, "transfers-2026-03.csv")
|   +-- Update with new data...
|   +-- The file's row in Data (where it came from and when it was read)
|
+-- Filter chip ("Full graph", or the steps applied)
|   +-- Filter steps (each step: turn off, edit, move, delete)
|   +-- Add a step
|
+-- Graph (rail)
|   +-- Graphs (each graph in the project; search; new graph)
|   +-- Sets and paths (each kept set or path; add; pick two or more to work with them together)
|   +-- Views (saved camera, filter and look; add)
|
+-- Data (rail)
|   +-- Export...
|   +-- Sources
|   |   +-- Each file or query, with its facts ("9,113 rows, one edge each")
|   |   +-- Its columns ("value: each run that uses it asks what it means")
|   |   +-- Update with new data...
|   |   +-- Add a table...
|   |   +-- Add a source (+)
|   +-- Versions
|   |   +-- Each version (open it to read the graph as it was)
|   |   +-- Version history
|   +-- Recipes (each one applied here; add)
|   +-- Sent and saved (what has been sent, and every file written)
|
+-- Results (rail) ("Every run of a measure, with its settings and date")
|   +-- Run a measure... (opens the list of algorithms)
|   +-- Each run, newest first, named by its settings and date ("Betweenness, exact, normalized,
|   |   no weight. Full graph, 77 nodes")
|   +-- An opened run
|       +-- State line (what it ran on, what a weight meant, and whether it used the CPU or WebGPU)
|       +-- Settings (method, seed, options, when it ran)
|       +-- Re-run on the current graph (keeps this run)
|       +-- Compare with another run...
|       +-- The selected node's line ("Valjean: #3 of 77, show in table")
|       +-- Top nodes
|       +-- Groups (in a community run; each row selects its group)
|       +-- Show in table, sorted
|       +-- Show as style layer
|
+-- Notes (rail)
|   +-- Add a note...
|   +-- Every note, newest first (find in notes)
|
+-- Assistant (rail) ("Off. Nothing is sent.")
|   +-- Conversations
|
+-- Right panel, with nothing selected (the graph)
|   +-- Background
|   +-- Layout (Force-directed; Run layout; its options)
|   +-- Overview (what was loaded; counts with their units: nodes, edges (rows), distinct pairs,
|   |   density, components, degree distribution; attributes)
|   +-- Style stack
|       +-- Each layer (top wins; drag to reorder; hide; its swatch opens the color picker
|       |   with Custom and Libraries; a layer made from a run says "From run: <the run>")
|       +-- Add a layer (+)
|       |   +-- Empty layer
|       |   +-- From a recipe or file...
|       |   +-- Suggested for this graph
|       +-- Look (Screen, Print, High contrast)
|
+-- Right panel, with a node selected
|   +-- Header actions: Neighbors (hops, direction, from a date), Path to..., Create set
|   +-- Appearance (the whole stack, with the layers that paint this node marked; add a layer for
|   |   the selection)
|   +-- Show label anyway
|   +-- Attributes (the columns from the file)
|   +-- Results (this node's value and rank in each run)
|   +-- Memberships (the kept sets that hold it)
|   +-- Notes (add)
|
+-- Right panel, with a set, a group or a path selected
|   +-- Appearance
|   +-- Members (count and sums; show in table)
|   +-- Route 1 of 2 (on a found path, when two routes tie)
|   +-- Compare with the rest
|   +-- Notes (add)
|
+-- Right panel header
|   +-- Zoom and view menu
|
+-- Canvas
|   +-- Legend
|   |   +-- Each entry's label (selects that group)
|   |   +-- Each entry's swatch (opens the color picker)
|   |   +-- Each entry's menu (Change color..., Select these, Create set)
|   |   +-- The "too close" flag on an entry (Fix...)
|   |   +-- The labels line ("7 more hidden where they overlap"; each hidden name selects its node)
|   +-- Floating toolbar
|   |   +-- Select
|   |   +-- Path (pick two nodes; options: weight by, and in this run what a bigger value means)
|   |   +-- Quick actions
|   |   +-- 2D or 3D
|   +-- The one-line notice (what just happened, and what you can do about it)
|
+-- Bottom table
    +-- Nodes tab, Edges tab, and a tab for each opened run
    +-- Search (goes to the matching row, with every result column shown)
    +-- Column header menu (sort, filter to..., color by..., compare with..., join..., new column)
    +-- Row menu (select, create set, compare this group with the rest)
    +-- Footer (the sum of each numeric column over the selected rows)
    +-- More (...)
        +-- Keep top rows...
        +-- Export table...
