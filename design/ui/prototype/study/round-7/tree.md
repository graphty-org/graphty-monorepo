graphty, with a project open

Header (top of the window, left to right)
+-- Main menu (the button with three lines)
|   +-- New project
|   +-- Open... (Ctrl+O)
|   +-- Open recent
|   |   +-- (your recent projects)
|   +-- Select where...
|   +-- Select edges between
|   +-- Show hidden elements
|   +-- Settings... (Ctrl+,)
|   |   +-- General
|   |   |   +-- Your name
|   |   |   +-- Theme
|   |   |   +-- Number format
|   |   +-- Privacy
|   |   +-- Accessibility and input
|   |   +-- Performance
|   |   +-- Assistant
|   |   +-- Headset
|   |   +-- Diagnostics
|   +-- Keyboard shortcuts (?)
|   +-- Help
|       +-- Documentation
|       +-- Report a problem
|       +-- About
+-- Project name (click it for its menu)
|   +-- Rename (F2)
|   +-- Save (Ctrl+S)
|   +-- Save as... (Ctrl+Shift+S)
|   +-- Export... (Ctrl+E)
|   |   +-- Image
|   |   +-- Video
|   |   +-- Report
|   |   +-- Recipe
|   |   +-- Data
|   +-- Apply recipe or style file...
|   +-- Version history
|   +-- Close project
+-- Undo
+-- Redo
+-- Local only (privacy)
+-- Full graph (filter)

Rail (left edge, top to bottom)
+-- Graph
|   +-- Graph switcher (the graph's name, with a menu)
|   |   +-- (each graph in the project)
|   |   +-- Compare graphs...
|   +-- Find rows and notes
|   +-- List options (...)
|   +-- The list of rows, top to bottom
|       +-- Selection
|       +-- Notes
|       +-- Rows added by Analyze, each with its eye
|       |   +-- A ranking (a measure)
|       |   +-- A grouping (a run), opening to its groups
|       |   +-- Shortest paths, opening to each route found
|       +-- Sets you kept
|       +-- Folders you made
|       +-- Everything
|       +-- Show hidden rows
|       +-- A row's right-click menu
|           +-- Rename
|           +-- Select top N...
|           +-- Select members
|           +-- Show members in table
|           +-- Filter to...
|           +-- Rerun
|           +-- Run as copy
|           +-- Restore the suggested look
|           +-- Lay out by these groups
|           +-- Keep as set
|           +-- Combine with selected rows
|           +-- Move to folder
|           +-- Lock
|           +-- Hide in list
|           +-- Add note
|           +-- Compare with another row...
|           +-- Delete
+-- Data
|   +-- Graph switcher
|   +-- Sources (+ adds data)
|   |   +-- Each file or address, with its menu
|   |       +-- Rename
|   |       +-- Replace with file...
|   |       +-- Edit source...
|   |       +-- Refresh
|   +-- Filters (+ adds a step)
|   |   +-- Each step, with a checkbox to apply it
|   |   +-- A step's menu
|   |       +-- Move up
|   |       +-- Move down
|   |       +-- Add note
|   |       +-- Delete
|   +-- Attributes (grouped by table; In use first; Find when the list is long)
|       +-- An attribute's menu
|           +-- Color by
|           +-- Size by
|           +-- Label by
|           +-- Show as groups
|           +-- Place by
|           +-- Filter to...
|           +-- Create set where this is...
|           +-- Read as...
|           +-- Show in table
+-- Views
|   +-- Save view (+)
|   +-- Present (play)
|   +-- Export tour video... (...)
|   +-- Your saved views, in order, each with In tour
+-- Notes
|   +-- Add note (+)
|   +-- Find in notes
|   +-- Show (all notes, about the selection, about this graph)
|   +-- Every note, newest first
|       +-- A note's menu
|           +-- Edit
|           +-- Copy link to note
|           +-- Delete
+-- Assistant

The data page (opens from Sources +, Edit source..., Open..., or a dropped file)
+-- Back (Esc)
+-- Tables (+ adds another file)
|   +-- Each table
+-- Makes (what the tables will become)
+-- The chosen table
|   +-- File settings (format)
|   +-- Each row is: a node | an edge
|   +-- One edge per: Row | Pair
|   +-- Type
|   +-- Go to column
|   +-- Each column's role, under its name
|       +-- Key
|       +-- Name
|       +-- From ->
|       +-- To ->
|       +-- Subtype
|       +-- Time
|       +-- Weight
|       +-- Edge id
|       +-- Position
|       +-- Attribute
+-- For a nested document: the document's outline, with a checkbox on each list of records
+-- Match report
+-- Direction: As the file says | Directed | Undirected
+-- Cancel
+-- Load

Canvas (the drawing)
+-- Legend card (top left)
+-- Right-click on empty canvas
|   +-- Select all visible
|   +-- Invert selection
|   +-- Reselect previous
|   +-- Fit
|   +-- Re-run layout
|   +-- Reshuffle layout seed
|   +-- Unpin all
|   +-- Compute the overview
|   +-- Add node...
|   +-- Add note
|   +-- Clear graph data
+-- Right-click on a node
    +-- Neighborhood...
    +-- Path between...
    +-- Analyze...
    +-- Create set
    +-- Add to set...
    +-- Frame selection
    +-- Pin
    +-- Hide on canvas
    +-- Delete
    +-- Add note
    +-- Show in table

Toolbar (bottom of the canvas; icons, named by their tooltips)
+-- Analyze (Shift+A)
|   +-- Search, or say what to find
|   +-- Recent
|   +-- Rank nodes and edges
|   +-- Find groups
|   +-- Find paths and edge sets
|   +-- Measure the graph
+-- Pause layout / Resume layout
+-- View
|   +-- Fit
|   +-- Frame selection
|   +-- Standard views (Front, Side, Top, Isometric)
|   +-- Your views
|   +-- Save view
|   +-- Switch to 2D / Switch to 3D (5)
|   +-- Enter VR
|   +-- Enter AR
+-- Legend (L)
+-- Quick actions (Ctrl+K)

Selection bar (above the toolbar while something is selected)
+-- Neighborhood
|   +-- Filter to neighbors
|   +-- Add as steps
+-- Path between
+-- Create set
+-- Hide on canvas
+-- Add note

Inspector (right side; shows what is selected, or the graph when nothing is)
+-- Header: name, kind, where it came from, and "..." (the same menu as right-click)
+-- Style tab
|   +-- Paints (what this row colors or sizes)
|   +-- Nodes | Edges
|   +-- Fill
|   +-- Shape
|   +-- Effects
|   +-- Label (+ adds a label line)
|   +-- Tooltip
|   +-- Why this look (for a node, an edge or several)
|   +-- Canvas (when nothing is selected)
|   |   +-- Print-safe colors
|   |   +-- Background
|   |   +-- Hide overlapping labels
|   |   +-- Show filtered-out nodes faintly
|   |   +-- Reframe when data changes
|   +-- Layout (when nothing is selected)
|       +-- Method
|       +-- Seed
|       +-- Pinned nodes
+-- Data tab
    +-- Summary
    +-- Members or Values (with Top 10)
    +-- Sizes
    +-- Memberships
    +-- Painted by
    +-- Made with (All options...)
    +-- Notes

Table (bottom; Table, or Shift+T)
+-- Nodes
+-- Edges
+-- A tab for a grouping's groups
+-- Columns
+-- Table options (...)
|   +-- Time slider
|   +-- Export table as CSV...
+-- A column header's menu
+-- A row's menu
