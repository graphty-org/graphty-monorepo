graphty

Start screen (when no project is open)
+-- Start
|   +-- Open project or file... (Ctrl+O)
|   +-- New from data...
|   +-- or drop a file anywhere in this window
+-- Recent projects
|   +-- (each project you opened, with its menu)
|       +-- Locate...
|       +-- Remove from list
+-- Samples (each sample, with one line on what it is good for)
+-- Settings (gear)
+-- Local only (privacy)
+-- Usage data card (first launch only)
    +-- What is collected
    +-- Share usage data
    +-- No thanks

Header (top of the window, left to right, with a project open)
+-- Main menu (the button with three lines)
|   +-- New project
|   +-- Open recent
|   +-- Open project or file... (Ctrl+O)
|   +-- Save (Ctrl+S)
|   +-- Export... (Ctrl+E)
|   +-- Apply recipe or style file...
|   +-- Version history
|   +-- Select where...
|   +-- Select edges between
|   +-- Show hidden elements
|   +-- Settings... (Ctrl+,)
|   |   +-- General
|   |   +-- Privacy
|   |   +-- Accessibility and input
|   |   +-- Performance
|   |   +-- Assistant
|   |   +-- Headset
|   |   +-- Diagnostics
|   +-- Keyboard shortcuts (?)
|   +-- Help
+-- Project name (click it for its menu)
|   +-- Rename (F2)
|   +-- Open project or file... (Ctrl+O)
|   +-- Save (Ctrl+S)
|   +-- Export... (Ctrl+E)
|   |   +-- Image
|   |   +-- Video
|   |   +-- Report
|   |   +-- Recipe
|   |   +-- Data
|   |   +-- Recent exports
|   +-- Apply recipe or style file...
|   +-- Version history
|   +-- Save as... (Ctrl+Shift+S)
|   +-- Close project
+-- Undo
+-- Redo
+-- Local only (privacy)
+-- Full graph (filter)

Rail (left edge, top to bottom)
+-- Graph
|   +-- Graph switcher (the graph's name, with a menu)
|   +-- Find rows and notes
|   +-- List options (...)
|   +-- The list of rows, top to bottom
|       +-- Selection
|       +-- Notes
|       +-- Rows added by Analyze, each with its eye
|       |   +-- A measure (a ranking)
|       |   +-- A run that finds groups, opening to its groups
|       |   +-- Shortest paths, opening to each one found
|       +-- Sets
|       +-- Folders
|       +-- Everything
|       +-- Show rows removed from list view
|       +-- A row's right-click menu
|           +-- Rename
|           +-- Select top N...
|           +-- Rerun
|           +-- Run as copy
|           +-- Restore the suggested look
|           +-- Show members in table
|           +-- Show in table
|           +-- Filter to...
|           +-- Lay out by these groups
|           +-- Compare with another run... / Compare with another row...
|           +-- Lock
|           +-- Remove from list view
|           +-- Show only this row
|           +-- Add note
|           +-- Delete
+-- Data
|   +-- Graph switcher
|   +-- Sources (+ adds data)
|   |   +-- Each file or address, with its menu
|   |       +-- Rename
|   |       +-- Replace with file...
|   |       +-- Add rows from file...
|   |       +-- Edit source...
|   |       +-- Remove
|   +-- Filters (+ adds a step)
|   |   +-- Each step, with a checkbox to apply it
|   +-- Attributes (grouped by table; In use first; Find when the list is long)
|       +-- An attribute's menu
|           +-- Add label line
|           +-- Show as groups
|           +-- Place by
|           +-- Filter to...
|           +-- Select where (this attribute) is...
|           +-- Read as...
|           +-- Edit on the Data page
|           +-- Show in table
+-- Views
|   +-- Save view (+)
|   +-- Present (play)
|   +-- More (...)
|   +-- Your saved views, in order, each with In tour
+-- Notes
|   +-- Add note (+)
|   +-- Find in notes
|   +-- Show (all notes, about the selection, about this graph)
|   +-- Every note, newest first, each with what it is about and when
|       +-- A note's menu
|           +-- Edit
|           +-- Copy link to note
|           +-- Delete
+-- Assistant

The Data page (opens from New from data..., Sources +, Edit source..., Replace with file..., Add rows from file..., Open project or file..., or a dropped file)
+-- Back (Esc)
+-- Tables (+ adds another file)
+-- Makes (what the tables will become)
+-- The chosen table
|   +-- File settings (format)
|   +-- Each row is: a node | an edge
|   +-- One edge per: Row | Pair
|   +-- Weight
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
+-- Match report
+-- How it is drawn
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
+-- Layout
|   +-- Motion (Pause layout / Resume layout)
|   +-- Method
|   +-- Seed
+-- View
|   +-- Fit
|   +-- Frame selection
|   +-- Standard views
|   +-- Your views
|   +-- Save view
|   +-- Switch to 2D / Switch to 3D (5)
|   +-- Enter VR
|   +-- Enter AR
+-- Legend (L)
+-- Quick actions (Ctrl+K)

Selection bar (above the toolbar while something is selected; icons, named by their tooltips)
+-- Neighborhood
|   +-- Distance
|   +-- Filter to neighbors
|   +-- Add as steps
+-- Path between
+-- Create set (Ctrl+G)
+-- Hide on canvas
+-- Add note

Inspector (right side; shows what is selected, or the graph when nothing is)
+-- Header: name, kind, where it came from, and "..." (the same menu as right-click)
+-- Style tab
|   +-- Paints (what this row colors or sizes)
|   +-- Nodes | Edges
|   +-- Fill (+)
|   +-- Shape (+)
|   +-- Effects (+)
|   +-- Label (+ adds a label line)
|   +-- Tooltip (+)
|   +-- Why this look (for a node, an edge or several)
|   +-- Canvas (when nothing is selected)
+-- Layout tab (when nothing is selected)
|   +-- Motion
|   +-- Method
|   +-- Seed
|   +-- Pinned nodes
+-- Data tab
    +-- Summary
    +-- Values or Members (with Top 10)
    +-- Sizes
    +-- Made with (All options...)
    +-- Notes

Table (bottom; Table, or Shift+T)
+-- Nodes
+-- Edges
+-- A tab for a run's groups
+-- Columns
+-- Table options (...)
|   +-- Time slider
|   +-- Export table as CSV...
+-- A column header's menu (the same as an attribute's menu)
+-- A row's menu
