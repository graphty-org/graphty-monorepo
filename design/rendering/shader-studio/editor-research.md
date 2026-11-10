# Shader editor: what exists and what we can borrow

Background for `editor.md`, the design for making graphty's shader dialog friendlier. Surveyed
November 2026. Effort is an estimate. Where a claim could not be confirmed it says so below.

## Shader code editors

| Tool                                                                                                                                                                           | What it does well                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Godot](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/shading_language.html)                                                                       | Uniform hints become inspector controls: `source_color`, `hint_range(min, max, step)`, `hint_enum`. Its [create dialog](https://raw.githubusercontent.com/godotengine/godot/master/editor/shader/shader_create_dialog.cpp) has a Mode list and a template list, remembers the last choice, and lets the caller's mode override it for that opening. |
| [twigl](https://raw.githubusercontent.com/doxas/twigl/master/src/script.js)                                                                                                    | Changing mode swaps in the new starter only if the code still equals the old starter; edited code stays, with no confirm dialog.                                                                                                                                                                                                                    |
| [GLSL Sandbox](https://raw.githubusercontent.com/mrdoob/glsl-sandbox/master/static/index.html)                                                                                 | Gutter marker with the error as a tooltip, and a tinted line.                                                                                                                                                                                                                                                                                       |
| [three.js editor](https://raw.githubusercontent.com/mrdoob/three.js/dev/editor/js/Script.js)                                                                                   | One CodeMirror panel reused for every kind of code; compile errors marked on their line.                                                                                                                                                                                                                                                            |
| [Babylon.js Node Material Editor](https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/packages/tools/nodeEditor/src/components/propertyTab/propertyTabComponent.tsx) | One window with one mode dropdown; changing it loads that mode's default and suits the preview. It warns that changes are lost. Closest precedent for the request.                                                                                                                                                                                  |
| [KodeLife](https://hexler.net/kodelife/manual/parameters-built-in), [SHADERed](https://shadered.org/docs/workspace.html)                                                       | List the built-in names available to the code. SHADERed's templates appear by name, and a message with a line opens that line.                                                                                                                                                                                                                      |
| [glslEditor](https://github.com/patriciogonzalezvivo/glslEditor)                                                                                                               | Inline color picker and sliders on literals in the code (README only).                                                                                                                                                                                                                                                                              |
| [Shadertoy](https://en.wikipedia.org/wiki/Shadertoy), [Bonzomatic](https://github.com/Gargaj/Bonzomatic)                                                                       | Highlighted editor with the result behind or beside it.                                                                                                                                                                                                                                                                                             |

## Parameters without typing a schema

| Tool                                                                                                                                                                                                                 | What it does well                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ISF](https://docs.isf.video/ref_json.html) and [ISF Editor](https://docs.vidvox.net/freebies_isf_editor.html)                                                                                                       | The same file shape as graphty's: JSON in the first comment, GLSL below, inputs become uniforms automatically. The editor has a UI for the metadata and also allows editing the JSON by hand. |
| [TouchDesigner](https://docs.derivative.ca/Component_Editor_Dialog)                                                                                                                                                  | Common fields first, then fields that "only appear when applicable" to the parameter's type.                                                                                                  |
| [Unity ShaderLab](https://docs.unity.com/en-us/engine/current/manual/materials-and-shaders/shaders/reference/sl-reference/sl-shader-object/sl-properties)                                                            | The type decides the widget. Its weakness: every property is declared twice.                                                                                                                  |
| [lil-gui](https://lil-gui.georgealways.com/), [Leva](https://raw.githubusercontent.com/pmndrs/leva/main/docs/getting-started/inputs.md)                                                                              | The control follows the value's shape; a slider appears when both min and max are set.                                                                                                        |
| [Unreal](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-and-using-material-instances-in-unreal-engine), [Blender](https://docs.blender.org/manual/de/4.5/interface/controls/nodes/groups.html) | A value becomes a parameter where it is used. Both are node editors; no text editor documents this.                                                                                           |

## Code editor components

Sizes are minified and gzipped, measured with esbuild 0.28.2, tree-shaken, and exclude Monaco's
workers. iPad and screen reader behavior was not tested on any of them.

| Component                                                                                                               | Size (gzip)                     | Notes                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [CodeMirror 6](https://codemirror.net/) + [codemirror-lang-glsl](https://github.com/schmid-daniel/codemirror-lang-glsl) | 128 KB with lint and completion | Best GLSL tested: 0 parse errors on graphty's text. Gutter diagnostics, completion hooks, native mobile editing. MIT. The grammar is a 0.x community package, about 570 downloads a month. |
| CodeMirror 6 + [legacy shader mode](https://github.com/codemirror/legacy-modes/blob/main/mode/clike.js)                 | 99 KB                           | First party, but old GLSL: leaves `precision`, `layout`, `uvec2`, `texture` plain. The fallback if the community grammar goes away.                                                        |
| [Monaco](https://github.com/microsoft/monaco-editor)                                                                    | 699 to 1191 KB                  | Its FAQ answers "No" for mobile browsers. Ruled out.                                                                                                                                       |
| [Ace](https://github.com/ajaxorg/ace)                                                                                   | 153 KB                          | GLSL mode misses `layout`, `uvec2`. Weaker on touch by [Replit's account](https://frontier.replit.com/code-editors/).                                                                      |
| [Prism overlay](https://github.com/satya164/react-simple-code-editor)                                                   | 8 KB                            | Real textarea, but no inline errors and no completion.                                                                                                                                     |
| [Shiki](https://shiki.style/) overlay                                                                                   | 72 KB                           | Coloring only; its latest release is under the two-week age rule.                                                                                                                          |

Mantine's Modal closes on any Escape in the capture phase unless the event target carries
`data-mantine-stop-propagation="true"` (read in the installed `use-modal.mjs`). CodeMirror's
documented way out of the editor is Escape then Tab, so it collides with the dialog.

## Designer-facing tools

| Tool                                                                                                                     | What it does well                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [Figma shaders](https://help.figma.com/hc/en-us/articles/41175721167767-Find-and-use-shaders)                            | Reached from where it applies and from a global tab. Built-ins named for the look. |
| [Unicorn Studio](https://www.unicorn.studio/docs/faqs/), [cables.gl](https://cables.gl/docs/5_writing_ops/shader/shader) | Declared uniforms become controls.                                                 |
| [Rive](https://rive.app/docs/scripting/wgsl-shaders.md)                                                                  | Creation is three decisions in order: type, name, code.                            |
| [Hydra](https://hydra.ojack.xyz/docs/docs/learning/getting-started/)                                                     | A random-sketch button and a random-change dice.                                   |
| [Paper Shaders](https://shaders.paper.design/)                                                                           | A gallery of named tiles and named presets.                                        |

## What we borrow

- A form over the header, with type-specific fields: TouchDesigner, Godot.
- The text stays the one source of truth: ISF.
- A starter follows the switch only while untouched: twigl.
- One window, one mode control: Babylon.js, three.js; a per-target draft fixes Babylon's lost work.
- The caller's mode wins, else the last used: Godot.
- Gutter marks with the message on hover: GLSL Sandbox, three.js.
- CodeMirror 6 with the community grammar, loaded on demand.
- Examples named for the look, starting from what ships: Figma, Paper Shaders.

What was not borrowed, and why, is in `editor.md`, "Borrowed ideas".

## Not confirmed

- shadertoy.com returned 403; its behavior rests on Wikipedia and secondary pages.
- glslEditor's source paths returned 404, so its features come from its README.
- Godot's line highlighting, twigl's line-level errors and KodeLife's templates.
- Whether ISF Editor can add inputs, and how its UI and JSON stay in sync.
- Blender and part of Unity come from search extracts, because direct fetches returned 403.
- Babylon.js behavior comes from its source code, not its documentation.
- Figma Make shaders, Spline custom GLSL, and the three.js TSL playground's menus.
