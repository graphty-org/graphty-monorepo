## 3.33.0 (2026-10-31)

### 🚀 Features

- **graphty-element:** cache the prompt prefix and use the Flex tier in the paid Gemini LLM tests ([#4486](https://github.com/graphty-org/graphty-monorepo/issues/4486))
- **graphty-element:** filter conditions with keep, exclude and select effects ([#4405](https://github.com/graphty-org/graphty-monorepo/issues/4405))
- **graphty-element:** mapScale draws the flat map larger too, as it does the globe ([cf5ebc59db](https://github.com/graphty-org/graphty-monorepo/commit/cf5ebc59db))
- **graphty-element:** live preview of shader text in the code dialog ([#3320](https://github.com/graphty-org/graphty-monorepo/issues/3320))
- **graphty-element:** a globeScale option draws the globe larger under nodes that keep their size ([ffd5dcaaac](https://github.com/graphty-org/graphty-monorepo/commit/ffd5dcaaac))
- **graphty-element:** the map follows the 2D and 3D view; globe sizing, arcs, look and camera ([04fccd1912](https://github.com/graphty-org/graphty-monorepo/commit/04fccd1912))
- **graphty-element:** shader presets per the second redesign, and an animates fact ([9d1e732769](https://github.com/graphty-org/graphty-monorepo/commit/9d1e732769))
- **graphty-element:** node.shaders and edge.shaders lists with a place per use ([b0fef19232](https://github.com/graphty-org/graphty-monorepo/commit/b0fef19232))
- **graphty-element:** place-based shader descriptor, registration and GLSL contract ([8eb1c9340d](https://github.com/graphty-org/graphty-monorepo/commit/8eb1c9340d))
- **graphty-element:** node.meshDetail channel for low-detail round node meshes ([b141e52844](https://github.com/graphty-org/graphty-monorepo/commit/b141e52844))
- **graphty-element:** background color, image and shader stack ([bc6f0166ca](https://github.com/graphty-org/graphty-monorepo/commit/bc6f0166ca))
- **graphty:** a reload of this tab reopens its own work in the workspace ([ae83981e43](https://github.com/graphty-org/graphty-monorepo/commit/ae83981e43))
- **graphty-element:** thumbnails, saving and safety the same for every shader origin ([148550eebf](https://github.com/graphty-org/graphty-monorepo/commit/148550eebf))
- **graphty-element:** shaders by target and role, one registration path, and the shader guide ([36757b7fe1](https://github.com/graphty-org/graphty-monorepo/commit/36757b7fe1))
- **graphty-element:** listAutosaves marks this tab's own entry, decided by its Web Lock ([104f2e3f14](https://github.com/graphty-org/graphty-monorepo/commit/104f2e3f14))
- **graphty-element:** glyphs for the node shapes, arrow kinds and line patterns golden added ([0beed2f467](https://github.com/graphty-org/graphty-monorepo/commit/0beed2f467))
- **graphty-element:** element.drawnShaders() reports the node shaders and boundaries drawn ([53c508858f](https://github.com/graphty-org/graphty-monorepo/commit/53c508858f))
- **graphty-element:** models and pictures on nodes by file or URL, kept in project files ([5ddd7cf485](https://github.com/graphty-org/graphty-monorepo/commit/5ddd7cf485))
- **graphty-element:** add session.assets, the Babylon-free intake of 3D model files ([3dd2428210](https://github.com/graphty-org/graphty-monorepo/commit/3dd2428210))
- **graphty-element:** add the lazily loaded model chunk for drawing nodes as 3D models ([89a09d83e8](https://github.com/graphty-org/graphty-monorepo/commit/89a09d83e8))
- **graphty-element:** propose a binding for a shader parameter by its address ([0d7f616ae3](https://github.com/graphty-org/graphty-monorepo/commit/0d7f616ae3))
- **graphty-element:** list every shader and transition preset in the catalog ([227fac261b](https://github.com/graphty-org/graphty-monorepo/commit/227fac261b))
- **graphty-element:** scene presets: nebula, soap bubble and metaball hull ([15c071d414](https://github.com/graphty-org/graphty-monorepo/commit/15c071d414))
- **graphty-element:** edge shader presets: fiber, light packets, comets, edge glow, edge change ([d4b2f428d8](https://github.com/graphty-org/graphty-monorepo/commit/d4b2f428d8))
- **graphty-element:** node-effect presets: aura, reticle, satellites, shockwave, change flash ([736b40c86e](https://github.com/graphty-org/graphty-monorepo/commit/736b40c86e))
- **graphty-element:** seven layout transition presets ([d0abddfd6f](https://github.com/graphty-org/graphty-monorepo/commit/d0abddfd6f))
- **graphty-element:** pattern, state and sprite shader presets ([c176e2519c](https://github.com/graphty-org/graphty-monorepo/commit/c176e2519c))
- **graphty-element:** lit-surface shader presets ([35c3082e7a](https://github.com/graphty-org/graphty-monorepo/commit/35c3082e7a))
- **graphty-element:** heavy and glowing surface presets with small-size programs ([c7ddd4b50b](https://github.com/graphty-org/graphty-monorepo/commit/c7ddd4b50b))
- **graphty-element:** layout transitions, registerTransition and the particle drawable ([b86775758f](https://github.com/graphty-org/graphty-monorepo/commit/b86775758f))
- **graphty-element:** background shaders, group boundaries and the shared bloom ([52457d0ce8](https://github.com/graphty-org/graphty-monorepo/commit/52457d0ce8))
- **graphty-element:** draw edge shaders, taper and lift ([cde7cb7049](https://github.com/graphty-org/graphty-monorepo/commit/cde7cb7049))
- **graphty-element:** shader quality levels and the GPU-bound frame guard ([858427a450](https://github.com/graphty-org/graphty-monorepo/commit/858427a450))
- **graphty-element:** draw node shaders: impostor and sprite batch, mesh path, effect batch ([19ee04502b](https://github.com/graphty-org/graphty-monorepo/commit/19ee04502b))
- **graphty-element:** shader runtime, session.shaders and the trust gate ([4167779f6e](https://github.com/graphty-org/graphty-monorepo/commit/4167779f6e))
- **graphty-element:** shader catalog, shader text checker and shader style channels ([81a115e065](https://github.com/graphty-org/graphty-monorepo/commit/81a115e065))

### 🩹 Fixes

- **graphty-element:** let curves rest beside an edge whose two ends are at one place ([#4587](https://github.com/graphty-org/graphty-monorepo/issues/4587), [#4271](https://github.com/graphty-org/graphty-monorepo/issues/4271))
- **graphty-element:** launch Safari once before the first safaridriver session ([#4580](https://github.com/graphty-org/graphty-monorepo/issues/4580))
- **graphty-element:** run the paid Gemini tests on Standard and give each request a deadline ([#4579](https://github.com/graphty-org/graphty-monorepo/issues/4579), [#4512](https://github.com/graphty-org/graphty-monorepo/issues/4512))
- **graphty-element:** select conditions follow the picture and a hand selection ([#4585](https://github.com/graphty-org/graphty-monorepo/issues/4585))
- **graphty-element:** bow vis-network's dynamic curves as deep as it does on files it lays out ([#4455](https://github.com/graphty-org/graphty-monorepo/issues/4455), [#4271](https://github.com/graphty-org/graphty-monorepo/issues/4271))
- **graph-io:** read at most four shapes of a Graphviz arrow name, as Graphviz does ([#4267](https://github.com/graphty-org/graphty-monorepo/issues/4267))
- **graphty-element:** classify RenderManager.canvasInView as a read door ([#4426](https://github.com/graphty-org/graphty-monorepo/issues/4426))
- **graphty-element:** read a short edge's open line, not the open dot of its head, as its line ([#4267](https://github.com/graphty-org/graphty-monorepo/issues/4267))
- **graphty-element:** rest a turning graph drawn on demand while its canvas is out of view ([#1831](https://github.com/graphty-org/graphty-monorepo/issues/1831), [#4170](https://github.com/graphty-org/graphty-monorepo/issues/4170), [#4426](https://github.com/graphty-org/graphty-monorepo/issues/4426))
- **graphty-element:** draw each part of a stacked arrowhead in a row along the line ([#4267](https://github.com/graphty-org/graphty-monorepo/issues/4267))
- **graph-io:** draw Cytoscape chart axes' words and shrink the plot for them as JFreeChart does ([#404040](https://github.com/graphty-org/graphty-monorepo/issues/404040), [#4249](https://github.com/graphty-org/graphty-monorepo/issues/4249))
- **graphty-element:** classify LayoutManager.preStepsInFlight in the door list ([#3533](https://github.com/graphty-org/graphty-monorepo/issues/3533))
- **graphty-element:** count a queued data import as reading from the moment it is queued ([#4439](https://github.com/graphty-org/graphty-monorepo/issues/4439), [#3535](https://github.com/graphty-org/graphty-monorepo/issues/3535))
- **graphty-element:** count pre-step chunks in flight; owed pre-steps test no longer hangs ([#4437](https://github.com/graphty-org/graphty-monorepo/issues/4437), [#3533](https://github.com/graphty-org/graphty-monorepo/issues/3533))
- **graphty-element:** hold the stable frame until the background layer is drawn ([#3536](https://github.com/graphty-org/graphty-monorepo/issues/3536))
- **graphty-element:** judge a node's picture after every other stray, so stray ids stay stable ([#4272](https://github.com/graphty-org/graphty-monorepo/issues/4272))
- **graphty-element:** publish project:derived when the lane is idle and no repaint is owed ([e815b6c8d8](https://github.com/graphty-org/graphty-monorepo/commit/e815b6c8d8))
- **graphty-element:** style comparator round 6: close the blind spots round 5 left ([#4272](https://github.com/graphty-org/graphty-monorepo/issues/4272))
- **graphty-element:** run one data import at a time so each keeps its load id ([#3535](https://github.com/graphty-org/graphty-monorepo/issues/3535))
- **graphty-element:** draw an edge effect over its edge surface, whatever order they were made in ([#4424](https://github.com/graphty-org/graphty-monorepo/issues/4424))
- **graphty-element:** filter condition events, rollback selection and condition history facts ([#4405](https://github.com/graphty-org/graphty-monorepo/issues/4405))
- **graphty-element:** publish project:derived once the picture catches up with a change ([#3543](https://github.com/graphty-org/graphty-monorepo/issues/3543), [#3529](https://github.com/graphty-org/graphty-monorepo/issues/3529))
- **graphty-element:** no frame steps a GPU layout while its pre-step chunk is in flight ([#3533](https://github.com/graphty-org/graphty-monorepo/issues/3533))
- **graphty-element:** a re-added layer never reads the departed layer's last paint ([#3530](https://github.com/graphty-org/graphty-monorepo/issues/3530))
- **graphty-element:** keep the flat map's reach out of the lazily loaded placement code ([#4412](https://github.com/graphty-org/graphty-monorepo/issues/4412))
- **graphty-element:** clip planes that follow the location map, not only the graph ([#4403](https://github.com/graphty-org/graphty-monorepo/issues/4403))
- **graphty-element,graphty:** a whole-window timeline drag is its own undo step ([#4387](https://github.com/graphty-org/graphty-monorepo/issues/4387), [#4400](https://github.com/graphty-org/graphty-monorepo/issues/4400))
- **graphty-element:** classify GraphContext.getUpdateManager in the door and cost lists ([#4392](https://github.com/graphty-org/graphty-monorepo/issues/4392))
- **graphty-element:** re-trim a node's edges when its model lands ([#4392](https://github.com/graphty-org/graphty-monorepo/issues/4392))
- **graphty-element,graphty:** stop drawing and re-reading what a play does not change ([#4386](https://github.com/graphty-org/graphty-monorepo/issues/4386), [#4196](https://github.com/graphty-org/graphty-monorepo/issues/4196))
- **graphty-element:** serve the STL story fixture as a file in the built Storybook ([#4369](https://github.com/graphty-org/graphty-monorepo/issues/4369), [#4365](https://github.com/graphty-org/graphty-monorepo/issues/4365))
- **graphty-element:** keep the Babylon.js barrel out of the models chunk ([#4241](https://github.com/graphty-org/graphty-monorepo/issues/4241))
- **graphty-element:** name the material class type for the JSDoc lint ([#4241](https://github.com/graphty-org/graphty-monorepo/issues/4241))
- **graphty-element:** pin bundled shaders before a material's first compile ([#4241](https://github.com/graphty-org/graphty-monorepo/issues/4241))
- **graphty-element:** a vee's line runs on to its notch only while the vee covers its end ([#4254](https://github.com/graphty-org/graphty-monorepo/issues/4254), [#4307](https://github.com/graphty-org/graphty-monorepo/issues/4307))
- **graphty-element:** keep timing benchmarks out of the WebKit models project ([#4302](https://github.com/graphty-org/graphty-monorepo/issues/4302))
- **graphty-element:** judge a final frame by the shaders it drew with ([#4237](https://github.com/graphty-org/graphty-monorepo/issues/4237))
- **graphty-element:** count same-name nodes as near twins within two node sizes ([#4247](https://github.com/graphty-org/graphty-monorepo/issues/4247))
- **graphty-element:** use graphty's label offset only for same-name nodes within a node size ([#4247](https://github.com/graphty-org/graphty-monorepo/issues/4247))
- **graphty-element:** hold a layout transition still, so a held pose is a final picture ([#4256](https://github.com/graphty-org/graphty-monorepo/issues/4256))
- **graphty-element:** refuse a twin only when it is another node's best body ([#4247](https://github.com/graphty-org/graphty-monorepo/issues/4247))
- **graphty-element:** never hand Graphviz a quoted label it cannot read ([#4203](https://github.com/graphty-org/graphty-monorepo/issues/4203))
- **graphty-element:** draw the vee as broad as Graphviz, Cytoscape.js and vis-network do ([#4202](https://github.com/graphty-org/graphty-monorepo/issues/4202))
- **graphty-element:** classify shaderPicturePending and update the API report ([#4243](https://github.com/graphty-org/graphty-monorepo/issues/4243))
- **graph-io:** size file arrowheads as Cytoscape, vis-network and Graphviz draw them ([#4202](https://github.com/graphty-org/graphty-monorepo/issues/4202))
- **graphty-element:** lay a DOT file out with Graphviz's own node sizes and edge label places ([#4203](https://github.com/graphty-org/graphty-monorepo/issues/4203))
- **graphty-element:** fidelity comparator keeps close same-name nodes and their labels apart ([#4247](https://github.com/graphty-org/graphty-monorepo/issues/4247))
- **graphty-element:** hold the stable frame until scene shaders have drawn ([#4243](https://github.com/graphty-org/graphty-monorepo/issues/4243))
- **graphty-element:** draw a group-tinted background once the outlines are laid out ([#4243](https://github.com/graphty-org/graphty-monorepo/issues/4243))
- **graphty-element:** fidelity comparator review fixes for per-edge targets, mirrored heads, Calibri ([#4222](https://github.com/graphty-org/graphty-monorepo/issues/4222))
- **graphty-element:** style comparator round 5: own-layout and zigzag blind spots, false failures ([#4222](https://github.com/graphty-org/graphty-monorepo/issues/4222))
- **graphty-element:** report a planar refusal a frame meets, and test it in any frame order ([#4197](https://github.com/graphty-org/graphty-monorepo/issues/4197), [#4208](https://github.com/graphty-org/graphty-monorepo/issues/4208))
- **graphty-element:** drop two TypeDoc links to undocumented symbols ([#4233](https://github.com/graphty-org/graphty-monorepo/issues/4233))
- **graphty-element:** list PendingWork and BasemapManager.loading in the door list ([#3546](https://github.com/graphty-org/graphty-monorepo/issues/3546))
- **graphty-element:** resend an LLM regression first request that Gemini refuses with 400 once ([#4220](https://github.com/graphty-org/graphty-monorepo/issues/4220))
- **graphty-element:** decide "the picture is final" from one record of pending work ([#4176](https://github.com/graphty-org/graphty-monorepo/issues/4176), [#3546](https://github.com/graphty-org/graphty-monorepo/issues/3546))
- **graphty-element:** tell the page that loses an autosave claim race which tab holds the work ([#4148](https://github.com/graphty-org/graphty-monorepo/issues/4148))
- **graphty-element:** the map type picks the map in the 3D view, whatever the layout's shape ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **graphty-element:** make the shader studio's tests, stories and checks pass in CI ([#4159](https://github.com/graphty-org/graphty-monorepo/issues/4159))
- **graphty-element:** drop the node model stories' capture delay and format Frame ([fe71e3a459](https://github.com/graphty-org/graphty-monorepo/commit/fe71e3a459))
- **graphty-element:** draw a resize or a camera move in one frame, not two ([#3537](https://github.com/graphty-org/graphty-monorepo/issues/3537))
- **graphty-element:** node pictures and models retry, finish and wireframe review fixes ([#3396](https://github.com/graphty-org/graphty-monorepo/issues/3396))
- **graphty-element:** node model zip, host and load-retry review fixes ([#3396](https://github.com/graphty-org/graphty-monorepo/issues/3396))
- **graphty-element:** keep drawing until an unused model template is freed ([#3396](https://github.com/graphty-org/graphty-monorepo/issues/3396))
- **graphty:** drop the legend room master removed; refresh API reports and size budgets ([3338e9afb6](https://github.com/graphty-org/graphty-monorepo/commit/3338e9afb6))
- **graphty-element:** name the location column source by its new CoordinateSource type ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **babylonjs-map:** draw a flat map past its box as one world centered on the data ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **graphty-element:** shader nodes write depth so nodes and edges occlude correctly ([#3320](https://github.com/graphty-org/graphty-monorepo/issues/3320))
- **babylonjs-map:** keep a globe's lower layers under the tiles drawn over them ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **graphty-element:** raise arcs over a flat map in the 3D view when the layout is 2D ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **graphty-element:** the sticker's foil is on by default, and its kind is named Foil ([#3320](https://github.com/graphty-org/graphty-monorepo/issues/3320))
- **babylonjs-map:** draw a flat map's world once, never repeated east or west ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **graphty-element:** judge flashing only on frames shaders alone changed ([#3320](https://github.com/graphty-org/graphty-monorepo/issues/3320))
- **graphty-element:** draw the Halftone gallery picture with dots a reader can see ([#3320](https://github.com/graphty-org/graphty-monorepo/issues/3320))
- **graphty-element:** a globe fills the view, its nodes and arrowheads small on it ([721ca382d1](https://github.com/graphty-org/graphty-monorepo/commit/721ca382d1))
- **graphty-element:** draw pasted shaders on nodes again ([bd0cb5f820](https://github.com/graphty-org/graphty-monorepo/commit/bd0cb5f820))
- **graphty-element:** draw clock-bound shader parameters, and time the built-in plays by them ([34480e7020](https://github.com/graphty-org/graphty-monorepo/commit/34480e7020))
- **graphty-element:** group outlines enclose every member, in one shape ([6b1cfbef80](https://github.com/graphty-org/graphty-monorepo/commit/6b1cfbef80))
- **graphty-element:** ship shader preset thumbnails as files, not base64 in every entry point ([184a274173](https://github.com/graphty-org/graphty-monorepo/commit/184a274173))
- **graphty-element:** drop duplicate channel names and an unused import left by the golden merge ([de4663d922](https://github.com/graphty-org/graphty-monorepo/commit/de4663d922))
- shader rows say why a shader draws nothing; lint and test fixes ([534792b1e0](https://github.com/graphty-org/graphty-monorepo/commit/534792b1e0))
- **graphty-element:** preset looks agree with the fill on the light canvas ([5e541f3329](https://github.com/graphty-org/graphty-monorepo/commit/5e541f3329))
- **graphty-element:** shader preset stories keep room at the canvas edge ([ee07ce615c](https://github.com/graphty-org/graphty-monorepo/commit/ee07ce615c))
- **graphty-element:** particle morph holds the camera and bursts like the lab ([2ed39854fc](https://github.com/graphty-org/graphty-monorepo/commit/2ed39854fc))
- **graphty-element:** shader check matches add, copies keep values and ids ([14288c92be](https://github.com/graphty-org/graphty-monorepo/commit/14288c92be))
- **graphty-element:** cheaper shader passes, steady effect claims, uncropped node effects ([1f60fbad35](https://github.com/graphty-org/graphty-monorepo/commit/1f60fbad35))
- **graphty-element:** the frame guard sees a slow GPU, and the flashing check samples every frame ([e84354419f](https://github.com/graphty-org/graphty-monorepo/commit/e84354419f))
- **graphty-element:** keep edge surfaces drawing after a line change, an undo or a reload ([91e58f4574](https://github.com/graphty-org/graphty-monorepo/commit/91e58f4574))
- **graphty-element:** refuse a lone carriage return and any backslash in a shader body ([b1b95a38e3](https://github.com/graphty-org/graphty-monorepo/commit/b1b95a38e3))
- **graphty-element:** sameAs finds a preset whose body pasted text repeats ([e99acba77f](https://github.com/graphty-org/graphty-monorepo/commit/e99acba77f))

### 🔥 Performance

- **graphty-element:** cut edges back to screen-sized nodes only as the zoom drifts ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.64
- Updated @graphty/remote-logger to 2.0.26
- Updated babylonjs-map to 0.0.3
- Updated graph-samples to 0.1.42
- Updated visual-review to 0.2.38
- Updated graph-format to 1.4.10
- Updated algorithms to 3.4.17
- Updated graph-io to 0.3.51
- Updated layout to 2.5.13

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent

## 3.32.0 (2026-10-29)

### 🚀 Features

- **graphty-element:** have Graphviz route the edges of a placed DOT file ([5a26cc34ea](https://github.com/graphty-org/graphty-monorepo/commit/5a26cc34ea))
- **graphty-element:** draw curved edges through support points a force simulation places ([28c375dddd](https://github.com/graphty-org/graphty-monorepo/commit/28c375dddd))
- **graphty-element:** save each load's column roles and a joined table's join ([ee71e4ba8d](https://github.com/graphty-org/graphty-monorepo/commit/ee71e4ba8d))
- **graph-io:** declare a source's credential slots, and remember keys per slot in graphty-element ([35fb9f5d02](https://github.com/graphty-org/graphty-monorepo/commit/35fb9f5d02))

### 🩹 Fixes

- **graphty-element:** share one claim of an entry's lock between a write and the bfcache reclaim ([#4037](https://github.com/graphty-org/graphty-monorepo/issues/4037))
- **graphty-element:** tell a map fallback only once the world under it is drawn ([#3999](https://github.com/graphty-org/graphty-monorepo/issues/3999), [#3984](https://github.com/graphty-org/graphty-monorepo/issues/3984), [#4124](https://github.com/graphty-org/graphty-monorepo/issues/4124))
- **graphty-element:** drop a duplicate cypher helper, update the API report ([#3395](https://github.com/graphty-org/graphty-monorepo/issues/3395))
- **graphty-element:** draw the first-frame resize instead of clearing the canvas ([#4122](https://github.com/graphty-org/graphty-monorepo/issues/4122))
- **graphty-element:** recompute node world matrix before every edge ray cast ([#4073](https://github.com/graphty-org/graphty-monorepo/issues/4073))
- **graphty-element:** leave the support point step's calm count optional without a literal default ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graphty-element:** let support points come to rest by their speed, not the step limit ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graph-io:** export BendPoint from the dot entry so its API docs build ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graphty-element:** classify Node.groupDrawnForAnotherCamera and update the API report ([#4088](https://github.com/graphty-org/graphty-monorepo/issues/4088))
- **graphty-element:** frame and draw a 3D group independently of the previous camera ([#4088](https://github.com/graphty-org/graphty-monorepo/issues/4088), [#3997](https://github.com/graphty-org/graphty-monorepo/issues/3997), [#4073](https://github.com/graphty-org/graphty-monorepo/issues/4073))
- **graphty-element:** settle a support point afresh when its forces change ([11d08e97d4](https://github.com/graphty-org/graphty-monorepo/commit/11d08e97d4))
- **graph-io:** write a Pajek line's arrowhead size and read a graphty-written file's arcs unbowed ([2c777460c6](https://github.com/graphty-org/graphty-monorepo/commit/2c777460c6))
- **graphty-element:** bound a compound member's label as Cytoscape.js does, margin in font pixels ([37adbc9973](https://github.com/graphty-org/graphty-monorepo/commit/37adbc9973))
- **graphty-element:** read double lines, covered stubs and overlapping ends as drawn in comparator ([b2120ff039](https://github.com/graphty-org/graphty-monorepo/commit/b2120ff039))
- **graphty-element:** classify round 4's new public members for undo; refuse a support unit of 0 ([8be8b4a031](https://github.com/graphty-org/graphty-monorepo/commit/8be8b4a031))
- **graphty-element:** clear the SonarQube findings on round 4's changed lines ([21e0e82d38](https://github.com/graphty-org/graphty-monorepo/commit/21e0e82d38))
- **graphty-element:** keep a load's left-out edge rows in the sources member ([9c02cdd4bc](https://github.com/graphty-org/graphty-monorepo/commit/9c02cdd4bc))
- **graphty-element:** hand Graphviz a DOT file's rank subgraphs, edge weights and cluster labels ([5513e52c23](https://github.com/graphty-org/graphty-monorepo/commit/5513e52c23))
- **graphty-element:** stop growing a label-fit polygon by its corners' reach twice ([385bb4f7b5](https://github.com/graphty-org/graphty-monorepo/commit/385bb4f7b5))
- **graphty-element:** draw each edge along the route Graphviz lays it ([0ba57c813b](https://github.com/graphty-org/graphty-monorepo/commit/0ba57c813b))
- **graphty-element:** call support points at rest after 1500 steps, not 4000 ([500bd541fa](https://github.com/graphty-org/graphty-monorepo/commit/500bd541fa))
- **graphty-element:** lay a file out at its styled node sizes however late the next frame is ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graphty-element:** lay out a DOT file with Graphviz at 72 units an inch when lengths are kept ([377a408469](https://github.com/graphty-org/graphty-monorepo/commit/377a408469))
- **graphty-element:** hand a file's clusters to Graphviz as cluster subgraphs ([e6e5b76442](https://github.com/graphty-org/graphty-monorepo/commit/e6e5b76442))
- **graphty-element:** read and draw the smaller edge settings of Cytoscape.js, DOT and vis-network ([fc282fe5b3](https://github.com/graphty-org/graphty-monorepo/commit/fc282fe5b3))
- **graphty-element:** pair a mutual pair by its arrowheads, not by the ends the markup names ([7436354ff4](https://github.com/graphty-org/graphty-monorepo/commit/7436354ff4))
- **graphty-element:** judge covered arrowheads, mutual pairs and dashed routes in the comparator ([7162b30896](https://github.com/graphty-org/graphty-monorepo/commit/7162b30896))
- **graphty-element:** never squeeze dashes together on a short or shortened line ([2acac7cb4a](https://github.com/graphty-org/graphty-monorepo/commit/2acac7cb4a))
- **graphty-element:** measure self-loop bends against the node's size, not its border-shrunk fill ([7787044066](https://github.com/graphty-org/graphty-monorepo/commit/7787044066))
- **graphty-element:** hold the oracle raster floors to the GPU path they were measured on ([e2886b7d0f](https://github.com/graphty-org/graphty-monorepo/commit/e2886b7d0f))
- **graphty-element:** judge a specimen labeled as its caption in the comparator ([58b0da0416](https://github.com/graphty-org/graphty-monorepo/commit/58b0da0416))
- **graphty-element:** read a box round one node as the group graphty draws there in the comparator ([10c573ce4b](https://github.com/graphty-org/graphty-monorepo/commit/10c573ce4b))
- **graphty-element:** judge sigma.js drawings by their discs and their framing in the comparator ([755331d1d4](https://github.com/graphty-org/graphty-monorepo/commit/755331d1d4))
- **graphty-element:** read coincident, banded and tapered Cytoscape.js lines in the comparator ([5439146599](https://github.com/graphty-org/graphty-monorepo/commit/5439146599))
- **graphty-element:** read a cap along the line where it sits in the comparator ([087f3796d9](https://github.com/graphty-org/graphty-monorepo/commit/087f3796d9))
- **graphty-element:** read a curved line's arrowhead along its own axis in the comparator ([b8c79fd8c0](https://github.com/graphty-org/graphty-monorepo/commit/b8c79fd8c0))
- **graphty-element:** a key saved before credential slots fills slot default ([2abda5ca84](https://github.com/graphty-org/graphty-monorepo/commit/2abda5ca84))
- **graphty-element:** carry Cytoscape's patterned lines to their own arrowheads in the comparator ([49b1d22e23](https://github.com/graphty-org/graphty-monorepo/commit/49b1d22e23))
- **graphty-element:** name a source preview row as data.name does, and pass the API report check ([edf475c0ae](https://github.com/graphty-org/graphty-monorepo/commit/edf475c0ae))
- **graphty-element:** a received project's loads fetch nothing until the application runs them ([4f96df27dd](https://github.com/graphty-org/graphty-monorepo/commit/4f96df27dd))
- **graphty-element:** name vis-network's nodes by where it drew them in the oracle comparator ([4054e4da91](https://github.com/graphty-org/graphty-monorepo/commit/4054e4da91))
- **graphty-element:** pair oracle edges at nodes drawn on one another in the comparator ([f222573e32](https://github.com/graphty-org/graphty-monorepo/commit/f222573e32))
- **graphty-element:** read draw.io's classic arrow as notched in the oracle comparator ([a7b4625796](https://github.com/graphty-org/graphty-monorepo/commit/a7b4625796))

### 🔥 Performance

- **graphty-element:** load the source load and expand code on first use ([3c0e1c4cf7](https://github.com/graphty-org/graphty-monorepo/commit/3c0e1c4cf7))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.63
- Updated @graphty/remote-logger to 2.0.25
- Updated babylonjs-map to 0.0.2
- Updated graph-samples to 0.1.41
- Updated visual-review to 0.2.37
- Updated graph-format to 1.4.9
- Updated algorithms to 3.4.16
- Updated graph-io to 0.3.50
- Updated layout to 2.5.12

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent

## 3.31.0 (2026-10-28)

### 🚀 Features

- **ci:** finish the features-on configuration: capture query, ordering, on-demand runs ([#3476](https://github.com/graphty-org/graphty-monorepo/issues/3476))
- **visual-review:** take each story's screenshot inside its story test ([#3389](https://github.com/graphty-org/graphty-monorepo/issues/3389), [#3471](https://github.com/graphty-org/graphty-monorepo/issues/3471))
- **graphty-element:** add experiments switched on by the features attribute ([#3474](https://github.com/graphty-org/graphty-monorepo/issues/3474))
- **graphty-element:** reframeOnViewInsets frames the graph again when the insets change ([#3372](https://github.com/graphty-org/graphty-monorepo/issues/3372))
- **graphty-element,graphty:** one Fields entry per kind of location ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty-element:** issue filter, pinned state, label detection and layout descriptions ([#3299](https://github.com/graphty-org/graphty-monorepo/issues/3299))
- **graphty-element:** read place names as node locations through a hosted gazetteer ([#3299](https://github.com/graphty-org/graphty-monorepo/issues/3299))
- **graphty-element:** designate the location columns the location map reads ([86ad6d0662](https://github.com/graphty-org/graphty-monorepo/commit/86ad6d0662))
- **graphty-element:** the location map layout's own map option replaces the basemap setting ([1fd2f12ce6](https://github.com/graphty-org/graphty-monorepo/commit/1fd2f12ce6))
- **graphty-element:** ghost elements outside the time window through a Ghost layer ([7212558120](https://github.com/graphty-org/graphty-monorepo/commit/7212558120))
- **graphty-element:** a text column of plain dates measures time ([e5f34509ed](https://github.com/graphty-org/graphty-monorepo/commit/e5f34509ed))
- **graphty-element:** publish style:batch-changed once per repaint, after its style:changed events ([413715c342](https://github.com/graphty-org/graphty-monorepo/commit/413715c342))
- **graphty-element:** location map says why it cannot run, faces the map, credits what it draws ([264a529471](https://github.com/graphty-org/graphty-monorepo/commit/264a529471))
- **graphty-element:** session.time plays smoothly, sliding the window every frame ([0d21ed6ee4](https://github.com/graphty-org/graphty-monorepo/commit/0d21ed6ee4))
- **graphty-element:** timeline settings, window-aware staleness and the studio's rulings ([#300](https://github.com/graphty-org/graphty-monorepo/issues/300))
- **graphty-element:** list the named map sources and say when the basemap is in effect ([2372a754e2](https://github.com/graphty-org/graphty-monorepo/commit/2372a754e2))
- **graphty-element:** location map layout with a flat map or globe, raised arcs and a basemap ([866150470c](https://github.com/graphty-org/graphty-monorepo/commit/866150470c))
- **graphty-element:** time.window fills left-out bounds, and bins count a node's edges ([#300](https://github.com/graphty-org/graphty-monorepo/issues/300))
- **graphty-element:** session.time, a designated time field and a playable window ([#300](https://github.com/graphty-org/graphty-monorepo/issues/300))
- **graphty-element:** glyphs for the node shapes, arrow kinds and line patterns golden added ([7fbbf33698](https://github.com/graphty-org/graphty-monorepo/commit/7fbbf33698))
- **graphty-element:** give every unavailable acceleration state a code ([5f8e0a1a8d](https://github.com/graphty-org/graphty-monorepo/commit/5f8e0a1a8d))
- **graph-io:** report a Cypher load's node total, and list and save it in graphty-element ([e1b929655b](https://github.com/graphty-org/graphty-monorepo/commit/e1b929655b))
- **graphty-element:** write and read the graphty-sources member version 2 ([0debb83990](https://github.com/graphty-org/graphty-monorepo/commit/0debb83990))
- **graphty-element:** one source entry per network load and node source facts ([3449a7c02c](https://github.com/graphty-org/graphty-monorepo/commit/3449a7c02c))
- **graph-io:** a SPARQL source, registered among the built-ins ([714031aa45](https://github.com/graphty-org/graphty-monorepo/commit/714031aa45))
- **graphty-element:** server preview, paging a chosen load, refresh and source features ([e78178fafa](https://github.com/graphty-org/graphty-monorepo/commit/e78178fafa))
- **graphty-element:** source provenance, a source rule and data.removeSource ([6c13261324](https://github.com/graphty-org/graphty-monorepo/commit/6c13261324))
- **graphty-element:** filter steps, data.sources(), value counts and value labels ([01b92fd3dd](https://github.com/graphty-org/graphty-monorepo/commit/01b92fd3dd))
- **graphty-element:** list every export loss code at runtime ([d95961c660](https://github.com/graphty-org/graphty-monorepo/commit/d95961c660))
- **graphty-element:** time window arithmetic in the element (firstWindow, stepWindow) ([29a723b582](https://github.com/graphty-org/graphty-monorepo/commit/29a723b582))
- **graphty-element:** issue states, text/flag/edge rule leaves, one-side source rules, key columns ([2d471dc931](https://github.com/graphty-org/graphty-monorepo/commit/2d471dc931))
- **graphty-element:** one source entry per network load, node source facts and join fixes ([3827a3c493](https://github.com/graphty-org/graphty-monorepo/commit/3827a3c493))
- **graphty-element:** draw the first table loaded, guess event ends, weight and label ([6df30a20b6](https://github.com/graphty-org/graphty-monorepo/commit/6df30a20b6))
- **graphty-element:** let a node's further texts take their own size, color, font and turn ([f493ff50ae](https://github.com/graphty-org/graphty-monorepo/commit/f493ff50ae))
- **graphty-element:** record a tour of named views with captureAnimation ([0cd7c44fae](https://github.com/graphty-org/graphty-monorepo/commit/0cd7c44fae))
- **graphty-element:** name each join row's match, and count an edit of a join ([1e90b31ec1](https://github.com/graphty-org/graphty-monorepo/commit/1e90b31ec1))
- **graphty-element:** guess a table's roles from its values when asked ([92daacfbb3](https://github.com/graphty-org/graphty-monorepo/commit/92daacfbb3))
- **graphty-element:** draw an edge's outline band dashed or dotted ([a196b5c957](https://github.com/graphty-org/graphty-monorepo/commit/a196b5c957))
- **graphty-element:** read a load again with new choices, its kept roles and network key ([7391c9b577](https://github.com/graphty-org/graphty-monorepo/commit/7391c9b577))
- **graphty-element:** draw bar, line, box and cell charts over a node ([eb65c64c39](https://github.com/graphty-org/graphty-monorepo/commit/eb65c64c39))
- **graphty-element:** draw an edge's one bend as the apex of a circular arc ([cc91f6418b](https://github.com/graphty-org/graphty-monorepo/commit/cc91f6418b))
- **graph-io:** a SPARQL source, registered among the built-ins ([fb28d7697c](https://github.com/graphty-org/graphty-monorepo/commit/fb28d7697c))
- **graphty-element:** end curves on node outlines, edge gaps off nodes, further texts on nodes ([08ea57654e](https://github.com/graphty-org/graphty-monorepo/commit/08ea57654e))
- **graphty-element:** server preview, paging a chosen load, refresh and source features ([cdeadf22a2](https://github.com/graphty-org/graphty-monorepo/commit/cdeadf22a2))
- **graphty-element:** time histogram, interval windows and nodes that follow their edges ([2438928bed](https://github.com/graphty-org/graphty-monorepo/commit/2438928bed))
- **graphty-element:** export scope and columns, a style file, a recipe and the screenshot presets ([37f13f2ef8](https://github.com/graphty-org/graphty-monorepo/commit/37f13f2ef8))
- **graphty-element:** replace a load with a newer copy ([14961d5469](https://github.com/graphty-org/graphty-monorepo/commit/14961d5469))
- **graphty-element:** draw an image's unset side at its own pixels, as Cytoscape.js draws auto ([8ff5f49fa0](https://github.com/graphty-org/graphty-monorepo/commit/8ff5f49fa0))
- **graphty-element:** join a table onto the graph ([4da4ad8457](https://github.com/graphty-org/graphty-monorepo/commit/4da4ad8457))
- **graphty-element:** shift a label markup run off its line, and align runs of different sizes ([5778b71115](https://github.com/graphty-org/graphty-monorepo/commit/5778b71115))
- **graphty-element:** draw a node's further parts and lines, as Graphviz draws its glyph shapes ([e1d38bce13](https://github.com/graphty-org/graphty-monorepo/commit/e1d38bce13))
- **graphty-element:** data issues with fixes and ignore ([bfcd28af64](https://github.com/graphty-org/graphty-monorepo/commit/bfcd28af64))
- **graphty-element:** draw radial and multi-stop gradients, wrap rules, caption turns, loop rings ([c60e6996ea](https://github.com/graphty-org/graphty-monorepo/commit/c60e6996ea))
- **graphty-element:** source provenance, a source rule and data.removeSource ([e122c990e3](https://github.com/graphty-org/graphty-monorepo/commit/e122c990e3))
- **graphty-element:** filter steps, data.sources(), value counts and value labels ([98d5f5ddb1](https://github.com/graphty-org/graphty-monorepo/commit/98d5f5ddb1))
- **graphty-element:** draw an end cap standing off its node by its gap ([9ae6f9f2cd](https://github.com/graphty-org/graphty-monorepo/commit/9ae6f9f2cd))
- **graphty-element:** round a file label box's corners with a labelCornerRadius channel ([e6d877107c](https://github.com/graphty-org/graphty-monorepo/commit/e6d877107c))
- **graphty-element:** draw a file's label runs, and a label moved over its node in front of it ([3e2a9d5cdd](https://github.com/graphty-org/graphty-monorepo/commit/3e2a9d5cdd))
- **graphty-element:** draw a label's outline and border opacity, box padding and line height ([9ad9f34d43](https://github.com/graphty-org/graphty-monorepo/commit/9ad9f34d43))
- **graphty-element:** draw an open inverted triangle cap ([b0bde4e8f7](https://github.com/graphty-org/graphty-monorepo/commit/b0bde4e8f7))
- **graphty-element:** floor edge lines at a screen width, hide labels by their node's screen size ([0a7c2b7e5e](https://github.com/graphty-org/graphty-monorepo/commit/0a7c2b7e5e))
- **graphty-element:** draw Cytoscape's sine waves, zigzags and arrow chains ([606c7f3452](https://github.com/graphty-org/graphty-monorepo/commit/606c7f3452))
- **graphty-element:** draw an edge's end captions in its label's face, color, weight, opacity ([74de09b69b](https://github.com/graphty-org/graphty-monorepo/commit/74de09b69b))
- **graphty-element:** draw one-sided caps, crossed deltas and every label place a file sets ([e80795ac8c](https://github.com/graphty-org/graphty-monorepo/commit/e80795ac8c))
- **graphty-element:** take Pajek's Draw window settings for a Pajek file as pajekDraw ([a456bc1802](https://github.com/graphty-org/graphty-monorepo/commit/a456bc1802))
- **graphty-element:** draw label opacity, label box opacity and freely placed labels ([7486ef95a0](https://github.com/graphty-org/graphty-monorepo/commit/7486ef95a0))
- **graph-io:** read yEd label borders, drawn by new labelBorder channels in graphty-element ([ff231ffe52](https://github.com/graphty-org/graphty-monorepo/commit/ff231ffe52))
- **graphty-element:** take Gephi's Preview settings for a GEXF file as gephiPreview ([baeaa007fd](https://github.com/graphty-org/graphty-monorepo/commit/baeaa007fd))
- **graphty-element:** line up a label's lines with node.labelTextAlign and edge.labelTextAlign ([8d159f97a8](https://github.com/graphty-org/graphty-monorepo/commit/8d159f97a8))
- **graphty-element:** draw Bezier edges, label backgrounds and outlines, edge label places ([f926d51641](https://github.com/graphty-org/graphty-monorepo/commit/f926d51641))
- **graphty-element:** draw Cytoscape's slash, arrow and parallel line types and wave borders ([692ad6b970](https://github.com/graphty-org/graphty-monorepo/commit/692ad6b970))
- **graphty-element:** draw exact corner radii, a database's rim and a node glyph ([06011c07da](https://github.com/graphty-org/graphty-monorepo/commit/06011c07da))
- **graphty-element:** draw node and edge underlays and overlays ([a4b019712e](https://github.com/graphty-org/graphty-monorepo/commit/a4b019712e))
- **graphty-element:** draw the half arrow's other side, the open box and image caps ([1557d57f1d](https://github.com/graphty-org/graphty-monorepo/commit/1557d57f1d))
- **graphty-element:** curve edges through bend midpoints or as arcs, draw polygons unstretched ([1aaff7308b](https://github.com/graphty-org/graphty-monorepo/commit/1aaff7308b))
- **graphty-element:** move a node's pie off its center ([a1b60bbdf4](https://github.com/graphty-org/graphty-monorepo/commit/a1b60bbdf4))
- **graphty-element:** draw node images, pie charts, stripes and rounded polygons ([9afba35ee3](https://github.com/graphty-org/graphty-monorepo/commit/9afba35ee3))
- **graphty-element:** draw middle caps, more arrow shapes, outer borders, edge outlines, gradients ([9f414d3bab](https://github.com/graphty-org/graphty-monorepo/commit/9f414d3bab))
- **graphty-element:** draw a node border's dash-dot as dash-dot ([f058f7a432](https://github.com/graphty-org/graphty-monorepo/commit/f058f7a432))
- **graphty-element:** publish canvas:element-click for every click on a node or an edge ([d4c279613a](https://github.com/graphty-org/graphty-monorepo/commit/d4c279613a))
- **graphty-element:** draw vis-network borders in screen pixels at every zoom ([2257dae806](https://github.com/graphty-org/graphty-monorepo/commit/2257dae806))
- **graphty-element:** place a node border outside, centered on or inside the node's size ([9519e5ef12](https://github.com/graphty-org/graphty-monorepo/commit/9519e5ef12))
- **graphty-element:** wrap a label with the space after each word counted, as Cytoscape does ([19f0077d3d](https://github.com/graphty-org/graphty-monorepo/commit/19f0077d3d))
- **graphty-element:** draw gradient node fills and labels inside a node ([7b8f4a41f4](https://github.com/graphty-org/graphty-monorepo/commit/7b8f4a41f4))
- **graphty-element:** turn labels and draw picture annotations from a file's styles ([1c79d1bd6b](https://github.com/graphty-org/graphty-monorepo/commit/1c79d1bd6b))
- **graphty-element:** draw a file's arrowheads in its program's proportions ([c1505a98a1](https://github.com/graphty-org/graphty-monorepo/commit/c1505a98a1))
- **graphty-element:** draw labels once with true edges, and hide them by screen size or overlap ([c790053107](https://github.com/graphty-org/graphty-monorepo/commit/c790053107))
- **graphty-element:** draw polygons of any corners and nested groups around each other ([36c1b20724](https://github.com/graphty-org/graphty-monorepo/commit/36c1b20724))
- **graphty-element:** draw edge ports and self-loop routes from a file ([#3172](https://github.com/graphty-org/graphty-monorepo/issues/3172))
- **graphty-element:** grow nodes to fit their labels (shape.labelFit) ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graphty-element:** set how far apart a bundle's curved edges fan with edge.fanSpacing ([#3171](https://github.com/graphty-org/graphty-monorepo/issues/3171))
- draw Pajek's bodiless, cross, house, man and woman vertices and mid-line arrows ([#3170](https://github.com/graphty-org/graphty-monorepo/issues/3170))
- **graphty-element:** say which columns a rule reads that nothing answers ([4736d48362](https://github.com/graphty-org/graphty-monorepo/commit/4736d48362))
- read and draw a node border's opacity ([4a74d1f7e0](https://github.com/graphty-org/graphty-monorepo/commit/4a74d1f7e0))
- **graphty-element:** repaint a removed color, zoom by key taps and toward the pointer ([ceeea10287](https://github.com/graphty-org/graphty-monorepo/commit/ceeea10287))
- **graphty-element:** count every value of any readable path with data.valueCounts ([a1013b9f74](https://github.com/graphty-org/graphty-monorepo/commit/a1013b9f74))
- **graphty-element:** element.nodeThumbnail draws one node of a shape and color alone ([b7500a7cf6](https://github.com/graphty-org/graphty-monorepo/commit/b7500a7cf6))
- **graphty-element:** styles.layerGroups reads several layers as the groups of one binding ([f8d2d203a9](https://github.com/graphty-org/graphty-monorepo/commit/f8d2d203a9))
- **graphty-element:** export OVERFLOW_SHAPES and OVERFLOW_PATTERNS from the session entry ([90154c8e57](https://github.com/graphty-org/graphty-monorepo/commit/90154c8e57))
- **graphty-element:** wrap a label's words at a wrap width ([6eeacfd14e](https://github.com/graphty-org/graphty-monorepo/commit/6eeacfd14e))
- **graph-io:** name the annotation kinds a style import skips in a style note ([e92fc8ac22](https://github.com/graphty-org/graphty-monorepo/commit/e92fc8ac22))
- **graphty-element:** styles.sequence gives a binding's values for items in order ([092ab18b31](https://github.com/graphty-org/graphty-monorepo/commit/092ab18b31))
- **graphty-element:** the legend lists copies of one binding once ([2f70546a0d](https://github.com/graphty-org/graphty-monorepo/commit/2f70546a0d))
- **graphty-element:** preview a binding within one layer ([af1b5d5156](https://github.com/graphty-org/graphty-monorepo/commit/af1b5d5156))
- **graphty-element:** a partition run can paint each group as a layer in a folder ([87767d68e5](https://github.com/graphty-org/graphty-monorepo/commit/87767d68e5))
- **graphty-element:** read what some style rows reach and write many layers in one step ([f2a04a35cf](https://github.com/graphty-org/graphty-monorepo/commit/f2a04a35cf))
- **graphty-element:** fold small groups in every property; a repeated color always has a second cue ([86b11acdad](https://github.com/graphty-org/graphty-monorepo/commit/86b11acdad))
- **graphty-element:** restore a run's layer, name values, step list channels, and more facts ([57fdb75698](https://github.com/graphty-org/graphty-monorepo/commit/57fdb75698))
- **graphty-element:** styles.preview can cut its bins over the data's extent ([34fcc2dc1c](https://github.com/graphty-org/graphty-monorepo/commit/34fcc2dc1c))
- **graphty-element:** styles.counts says when a tie stopped a top N short ([b1f4669991](https://github.com/graphty-org/graphty-monorepo/commit/b1f4669991))
- **graphty-element:** labels.declutter hides overlapping edge labels too ([0b21c5d650](https://github.com/graphty-org/graphty-monorepo/commit/0b21c5d650))
- **graphty-element:** styles.counts reports end captions with no arrow to hang from ([7eae06dad3](https://github.com/graphty-org/graphty-monorepo/commit/7eae06dad3))
- **graphty-element:** say what an unset text background draws: none ([5fd7d5a2df](https://github.com/graphty-org/graphty-monorepo/commit/5fd7d5a2df))
- **graphty-element:** styles.update can keep an emptied layer; Everything's base look is the floor ([eae4f47cf2](https://github.com/graphty-org/graphty-monorepo/commit/eae4f47cf2))
- **graphty-element:** an editableBase setting puts the base look into the Everything row ([31ae2825d6](https://github.com/graphty-org/graphty-monorepo/commit/31ae2825d6))
- **graphty-element:** say what an unwritten channel draws, and name a graph file's nodes on import ([b027b22a33](https://github.com/graphty-org/graphty-monorepo/commit/b027b22a33))
- **graphty-element:** a run's style option can name the layers it adds ([133057476c](https://github.com/graphty-org/graphty-monorepo/commit/133057476c))
- **graphty-element:** a hidden row's layers say they are hidden in styles.list() and get() ([3d2859a637](https://github.com/graphty-org/graphty-monorepo/commit/3d2859a637))
- **graphty-element:** label style defaults, and a gradient with no colors draws ([83267f6685](https://github.com/graphty-org/graphty-monorepo/commit/83267f6685))
- **graphty-element:** readable values for number counts, colors and edge ends; find reads them ([6b68f35fbf](https://github.com/graphty-org/graphty-monorepo/commit/6b68f35fbf))
- **graphty-element:** screen-pixel label sizes, label number formats, a Selected ring on black ([2c5080144c](https://github.com/graphty-org/graphty-monorepo/commit/2c5080144c))
- **graphty-element:** read what lies beneath a style row over the row's own elements ([ff438d565e](https://github.com/graphty-org/graphty-monorepo/commit/ff438d565e))
- **graphty:** popovers name values as the key does, open beside the panel, give focus back ([9ef9c72efd](https://github.com/graphty-org/graphty-monorepo/commit/9ef9c72efd))
- **graphty:** starting rows in every opened project, whole painted-over marks, a fuller row menu ([2bac042d0c](https://github.com/graphty-org/graphty-monorepo/commit/2bac042d0c))
- **graphty-element:** legend painted counts, a visible Selected ring, and a label size's unit ([c6f12aebb7](https://github.com/graphty-org/graphty-monorepo/commit/c6f12aebb7))
- **graphty-element:** session.data.readableValues, one list of readable values ([a1477f424f](https://github.com/graphty-org/graphty-monorepo/commit/a1477f424f))
- **graphty-element:** a run's layers behave like a reader's: one route row, readable rules, kind change in place ([836eb76bba](https://github.com/graphty-org/graphty-monorepo/commit/836eb76bba))
- **graphty-element:** say what a style layer reads, and a histogram's minimum, median and maximum ([d006cf9cd5](https://github.com/graphty-org/graphty-monorepo/commit/d006cf9cd5))
- **graphty-element:** count each step of a binding preview, and let rules read a run's value ([f45aa2ebbd](https://github.com/graphty-org/graphty-monorepo/commit/f45aa2ebbd))
- **graphty:** effects lists with a picker per effect, and arrow end colors that read "Line color" ([6d62f3d65f](https://github.com/graphty-org/graphty-monorepo/commit/6d62f3d65f))
- **graphty-element:** light the default studio mode with a camera headlight, a soft fill and a rim ([b1b36edbce](https://github.com/graphty-org/graphty-monorepo/commit/b1b36edbce))
- **graphty:** label entries in a Text list, with looks and label settings ([92e30a8b9a](https://github.com/graphty-org/graphty-monorepo/commit/92e30a8b9a))
- **graphty:** search and selection as ways into a layer's rule ([c7f740d9c6](https://github.com/graphty-org/graphty-monorepo/commit/c7f740d9c6))
- **graphty-element:** starting rows for Everything, Selected and Hovered, and run placement ([8a64723fba](https://github.com/graphty-org/graphty-monorepo/commit/8a64723fba))
- **graphty-element:** glyphs for shapes, arrows and line patterns, and named label looks ([9961db9256](https://github.com/graphty-org/graphty-monorepo/commit/9961db9256))
- **graphty-element:** colors across style rows, and an off value for effects ([05068f77f1](https://github.com/graphty-org/graphty-monorepo/commit/05068f77f1))
- **graphty-element:** hide by style, label looks that vary, and combine on numbers ([c8c828aad8](https://github.com/graphty-org/graphty-monorepo/commit/c8c828aad8))
- **graphty-element:** per-value entries that follow their groups ([9c5f5bf184](https://github.com/graphty-org/graphty-monorepo/commit/9c5f5bf184))
- **graphty-element:** what lies beneath a style row, and a preview of a binding ([34724d3d53](https://github.com/graphty-org/graphty-monorepo/commit/34724d3d53))
- **graphty-element:** a style tree with folders, pins, a reader's lock and an eye ([0def269780](https://github.com/graphty-org/graphty-monorepo/commit/0def269780))
- **graphty-element:** one style row that paints nodes and edges ([262b846095](https://github.com/graphty-org/graphty-monorepo/commit/262b846095))
- **graphty-element:** split a style layer into one child per value ([3701fd8d62](https://github.com/graphty-org/graphty-monorepo/commit/3701fd8d62))
- **graphty-element:** generic layer rules, a text test and the node id as a value ([2242877542](https://github.com/graphty-org/graphty-monorepo/commit/2242877542))
- **graphty-element:** studio lighting for 3D nodes, and a lighting option to switch it ([fd5eb360df](https://github.com/graphty-org/graphty-monorepo/commit/fd5eb360df))
- **graphty-element:** find offers "N or more" for a number inside a column's range ([40dcbe1c3f](https://github.com/graphty-org/graphty-monorepo/commit/40dcbe1c3f))
- **graphty-element:** rulePath names a column the way a typed rule does ([1c9e3fa726](https://github.com/graphty-org/graphty-monorepo/commit/1c9e3fa726))
- **graphty-element:** a number found in a column also offers its 'or more' rule ([9b69ca6503](https://github.com/graphty-org/graphty-monorepo/commit/9b69ca6503))
- **graphty-element:** write a partition's group as its rank only when asked (groupRanks) ([814e45f912](https://github.com/graphty-org/graphty-monorepo/commit/814e45f912))
- **graphty:** the find box offers a typed condition as a rule, and Enter runs it ([1e63adc42c](https://github.com/graphty-org/graphty-monorepo/commit/1e63adc42c))
- **graphty-element:** publish a click on empty canvas, and let go of a selected run on it ([bde1e5de01](https://github.com/graphty-org/graphty-monorepo/commit/bde1e5de01))
- **graphty-element:** carry a node's tooltip words on graphty-node-hover ([01633829dc](https://github.com/graphty-org/graphty-monorepo/commit/01633829dc))
- **graphty:** a Color or Width added to a selection's layer starts at the highlight look ([7aecca4464](https://github.com/graphty-org/graphty-monorepo/commit/7aecca4464))
- **graphty:** an Add that repeats loaded edges says so and offers Replace ([29c78fb26d](https://github.com/graphty-org/graphty-monorepo/commit/29c78fb26d))
- **graphty-element:** let a click on a node's label pick the node with labelStyle.pickable ([d3214bbcb3](https://github.com/graphty-org/graphty-monorepo/commit/d3214bbcb3))
- **graphty:** name the step Undo and Redo take back, and say what Escape cleared ([865ba5b4d6](https://github.com/graphty-org/graphty-monorepo/commit/865ba5b4d6))
- **graphty-element:** let a shortest path follow edges one way ([6117883439](https://github.com/graphty-org/graphty-monorepo/commit/6117883439))
- **graphty:** say what a find rule selected, group finds by kind, list selected edges ([a38f44f912](https://github.com/graphty-org/graphty-monorepo/commit/a38f44f912))
- **graphty-element:** a shortest path left unset says which method it used ([b51a735b8f](https://github.com/graphty-org/graphty-monorepo/commit/b51a735b8f))
- **graphty-element:** say which end of a left-out edge row names no node ([58467a9cf6](https://github.com/graphty-org/graphty-monorepo/commit/58467a9cf6))
- **graphty-element:** let a label draw over the graph with labelStyle.onTop ([3f6a99bf37](https://github.com/graphty-org/graphty-monorepo/commit/3f6a99bf37))
- **graphty-element:** say when a run assumed its weight's meaning ([88d7a43b75](https://github.com/graphty-org/graphty-monorepo/commit/88d7a43b75))
- **graphty-element:** show the pointer cursor over a clickable edge ([8b7e381802](https://github.com/graphty-org/graphty-monorepo/commit/8b7e381802))
- **graphty-element:** keep a left-out row's line and end columns with its load ([146b4e9e96](https://github.com/graphty-org/graphty-monorepo/commit/146b4e9e96))
- **graphty-element:** keep the edge rows a load left out ([58f02b5d06](https://github.com/graphty-org/graphty-monorepo/commit/58f02b5d06))
- **graphty-element:** keep the edge rows a load left out on its source entry ([0c12c233b7](https://github.com/graphty-org/graphty-monorepo/commit/0c12c233b7))
- **graphty-element:** pick edges on the canvas and draw selected edges ([5a2b3b605c](https://github.com/graphty-org/graphty-monorepo/commit/5a2b3b605c))
- **graphty-element:** a run goes out of date when its data changes, and says why ([ce34f31f35](https://github.com/graphty-org/graphty-monorepo/commit/ce34f31f35))
- **graphty-element:** choose a weight's meaning at load and read it back ([89a2977df7](https://github.com/graphty-org/graphty-monorepo/commit/89a2977df7))
- **graphty-element:** every run reads the loaded weight by default ([337e98044b](https://github.com/graphty-org/graphty-monorepo/commit/337e98044b))
- **graphty-element:** filter steps with per-step counts ([8966b0888f](https://github.com/graphty-org/graphty-monorepo/commit/8966b0888f))
- **graphty-element:** keep every load in the graph as a source ([f141b12833](https://github.com/graphty-org/graphty-monorepo/commit/f141b12833))
- **graphty-element:** a filter on an edge attribute keeps the passing edges ([559f5dcb26](https://github.com/graphty-org/graphty-monorepo/commit/559f5dcb26))
- **graphty-element:** give every selector refusal a reason code ([3d89d43c3f](https://github.com/graphty-org/graphty-monorepo/commit/3d89d43c3f))
- **graphty-element:** draw node sizes comparably at any 3D depth ([ec66a2991b](https://github.com/graphty-org/graphty-monorepo/commit/ec66a2991b))
- **graphty-element:** frame a kept angle by the box's corners ([2538731dc9](https://github.com/graphty-org/graphty-monorepo/commit/2538731dc9))
- **graphty-element:** keep every fit clear of what covers the canvas ([fa260f20d9](https://github.com/graphty-org/graphty-monorepo/commit/fa260f20d9))
- **graphty-element:** fit the whole graph from the current angle on request ([6f1cf692b2](https://github.com/graphty-org/graphty-monorepo/commit/6f1cf692b2))
- **graphty-element:** report why a layout or run cannot start as a code, not a sentence ([481c6715a8](https://github.com/graphty-org/graphty-monorepo/commit/481c6715a8))
- **graphty-element:** leave the selection highlight out of a capture on request ([4c087d8bcd](https://github.com/graphty-org/graphty-monorepo/commit/4c087d8bcd))
- **graphty-element:** offer run results as groupings for grouping layouts ([8ca7596fbd](https://github.com/graphty-org/graphty-monorepo/commit/8ca7596fbd))
- **graphty:** pick a layout from a list and edit it in one form with Shape and Apply ([a9b59c94a9](https://github.com/graphty-org/graphty-monorepo/commit/a9b59c94a9))
- **graphty:** show each export format's advanced options behind an Advanced fold ([95f1ddb1e9](https://github.com/graphty-org/graphty-monorepo/commit/95f1ddb1e9))
- **graphty-element:** publish VR and AR availability and turn XR on by default ([67960c8eea](https://github.com/graphty-org/graphty-monorepo/commit/67960c8eea))
- **graphty-element:** zoom the 3D orbit camera with the mouse wheel ([d9e5cc8dc6](https://github.com/graphty-org/graphty-monorepo/commit/d9e5cc8dc6))
- **graphty-element:** make the first import into a new session the project's baseline ([48d11d0cc3](https://github.com/graphty-org/graphty-monorepo/commit/48d11d0cc3))
- **graphty-element:** estimate and plan a layout choice ([2df752ff40](https://github.com/graphty-org/graphty-monorepo/commit/2df752ff40))
- **graphty-element:** move a run's style layers as one block with runs.move ([0a0a7ebf19](https://github.com/graphty-org/graphty-monorepo/commit/0a0a7ebf19))
- **graphty-element:** group shell, layers and bipartite layouts by a node attribute with groupBy ([e0fdce5f00](https://github.com/graphty-org/graphty-monorepo/commit/e0fdce5f00))
- **graphty-element:** fold force-2d into force and report the arranged dimension ([4cc3d820ca](https://github.com/graphty-org/graphty-monorepo/commit/4cc3d820ca))
- **graphty-element:** keep projects in the browser with browserProjects ([effb80326f](https://github.com/graphty-org/graphty-monorepo/commit/effb80326f))
- **graphty-element:** add downloadGraph and keep download URLs alive past the click ([f88efbbd46](https://github.com/graphty-org/graphty-monorepo/commit/f88efbbd46))
- **graphty-element:** list export variants and the project file in the format catalog ([555c851e1e](https://github.com/graphty-org/graphty-monorepo/commit/555c851e1e))
- **graphty-element:** draw the caller's legend into a captured image ([#133](https://github.com/graphty-org/graphty-monorepo/issues/133))

### 🩹 Fixes

- **graphty-element:** free a disposed graph at once so the next benchmark starts on an empty heap ([#3413](https://github.com/graphty-org/graphty-monorepo/issues/3413))
- **graphty-element:** drop the capture delay from the Lighting story ([#3263](https://github.com/graphty-org/graphty-monorepo/issues/3263))
- **graphty-element:** read an out-of-credit provider as an owner item in LLM regression ([#4020](https://github.com/graphty-org/graphty-monorepo/issues/4020))
- **graphty-element:** drop the group rank that never matched ([#3612](https://github.com/graphty-org/graphty-monorepo/issues/3612))
- **graphty-element:** draw group regions first, not in creation order ([#3612](https://github.com/graphty-org/graphty-monorepo/issues/3612))
- **graphty-element:** draw opaque meshes in a fixed order on every load ([#3612](https://github.com/graphty-org/graphty-monorepo/issues/3612))
- **babylonjs-map:** make the location parsers linear and drop the deploy gazetteer cache ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **ci:** preset FC_FONTATIONS for every Chromium launch; one shared vitest base ([#3787](https://github.com/graphty-org/graphty-monorepo/issues/3787))
- **graphty-element:** round the scaled label font box to whole pixels ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** place label baselines from the unrounded font box ([#3841](https://github.com/graphty-org/graphty-monorepo/issues/3841), [#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** never count a story re-render as its own sibling ([#3841](https://github.com/graphty-org/graphty-monorepo/issues/3841), [#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** draw label glyphs unhinted so pixels do not depend on load order ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** put the data doors that read the graph in the load line ([#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547), [#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty-element:** classify RenderManager.resize in the door list ([#3704](https://github.com/graphty-org/graphty-monorepo/issues/3704))
- **graphty-element:** draw every resize's frame, even while the GPU is behind ([#3704](https://github.com/graphty-org/graphty-monorepo/issues/3704))
- **graphty-element:** read bare-identifier id and endpoint paths without parsing JMESPath ([#3670](https://github.com/graphty-org/graphty-monorepo/issues/3670))
- **graphty-element:** settled() also waits for passes a finishing run asks for ([#3667](https://github.com/graphty-org/graphty-monorepo/issues/3667), [#3640](https://github.com/graphty-org/graphty-monorepo/issues/3640))
- **graphty-element:** reject a restore(id) a clear cancelled with E_SUPERSEDED ([#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547))
- **graphty-element:** settled() reads the repaint chain when it is called ([#3640](https://github.com/graphty-org/graphty-monorepo/issues/3640))
- **graphty-element:** read collapse's graph in turn and keep a pair a clear cancelled cleared ([#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547))
- **graphty-element:** styles.settled() waits for live-set repaints too ([#3640](https://github.com/graphty-org/graphty-monorepo/issues/3640))
- **graphty-element:** resolve an edit a clear cancels instead of rejecting it ([#3524](https://github.com/graphty-org/graphty-monorepo/issues/3524), [#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547), [#3604](https://github.com/graphty-org/graphty-monorepo/issues/3604), [#3525](https://github.com/graphty-org/graphty-monorepo/issues/3525), [#3526](https://github.com/graphty-org/graphty-monorepo/issues/3526))
- **graphty-element:** styles.settled() waits for unawaited repaint passes ([#3640](https://github.com/graphty-org/graphty-monorepo/issues/3640))
- **deps:** bind the storybook test browser API to loopback ([#3568](https://github.com/graphty-org/graphty-monorepo/issues/3568))
- **deps:** allow browser API write and exec in the storybook test projects ([#3568](https://github.com/graphty-org/graphty-monorepo/issues/3568))
- **graphty-element:** a late session:disposed watcher that unsubscribes is not told ([#3521](https://github.com/graphty-org/graphty-monorepo/issues/3521))
- **graphty-element:** close the open-after-wait gap and keep a clear uncancellable ([#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547))
- **graphty-element:** keep clearData synchronous and one bypass rule in the load line ([#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547))
- clear the SonarQube findings on the data management changes ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **ci:** keep On twins out of pull-request selection and On through beforeAll ([#3476](https://github.com/graphty-org/graphty-monorepo/issues/3476))
- **graphty-element:** close the load entry's gaps around open, clear and the element ([#3604](https://github.com/graphty-org/graphty-monorepo/issues/3604), [#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547))
- **graphty-element:** keep the queue out of the public stable state ([#3528](https://github.com/graphty-org/graphty-monorepo/issues/3528), [#3527](https://github.com/graphty-org/graphty-monorepo/issues/3527), [#3546](https://github.com/graphty-org/graphty-monorepo/issues/3546))
- **ci:** keep graphty's !storybook filter and require Node 22.18 ([#3476](https://github.com/graphty-org/graphty-monorepo/issues/3476))
- **graphty-element:** route every graph-changing session door through one load entry ([#3525](https://github.com/graphty-org/graphty-monorepo/issues/3525), [#3547](https://github.com/graphty-org/graphty-monorepo/issues/3547), [#3524](https://github.com/graphty-org/graphty-monorepo/issues/3524), [#3526](https://github.com/graphty-org/graphty-monorepo/issues/3526))
- **ci:** keep the On configuration whole through selection, resets and the durations cache ([#3476](https://github.com/graphty-org/graphty-monorepo/issues/3476))
- **graphty-element:** stable-frame wait rechecks owed work and wakes on any pass ([#3528](https://github.com/graphty-org/graphty-monorepo/issues/3528), [#3527](https://github.com/graphty-org/graphty-monorepo/issues/3527), [#3546](https://github.com/graphty-org/graphty-monorepo/issues/3546))
- **graphty-element:** tell a late subscriber that the session was disposed ([#3521](https://github.com/graphty-org/graphty-monorepo/issues/3521))
- **graphty-element:** write a change made while hidden at once, with no timer ([#3485](https://github.com/graphty-org/graphty-monorepo/issues/3485))
- **graphty-element:** tell a session's watchers when it is disposed ([#3521](https://github.com/graphty-org/graphty-monorepo/issues/3521))
- **graphty-element:** keep the Autosave Diagnostics story as wide as its page ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** end waitForStableFrame at once on a removed element ([#3523](https://github.com/graphty-org/graphty-monorepo/issues/3523))
- **visual-review:** story-test shots match graphty-element's built-Storybook capture ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **graphty-element:** call a frame final only if the picture is still finished when drawn ([#3517](https://github.com/graphty-org/graphty-monorepo/issues/3517))
- **graphty-element:** write settings added after the first project files only when set ([#3459](https://github.com/graphty-org/graphty-monorepo/issues/3459))
- **compact-mantine:** take only the storybook 8.6.19 security fix ([#3492](https://github.com/graphty-org/graphty-monorepo/issues/3492))
- **graphty-element:** redraw groups after resizing paint and keep their outline material ([#3478](https://github.com/graphty-org/graphty-monorepo/issues/3478))
- **graphty-element:** frame the graph only once arrived paint is applied to every node ([#3479](https://github.com/graphty-org/graphty-monorepo/issues/3479))
- **graphty-element:** settle a session's experiments when it is created ([#3474](https://github.com/graphty-org/graphty-monorepo/issues/3474))
- **visual-review:** put the spike constants above, not inside, the configs' existing doc comments ([#3389](https://github.com/graphty-org/graphty-monorepo/issues/3389))
- **graphty-element:** classify Graph.resize and RenderManager.drawNow in the door list ([#3373](https://github.com/graphty-org/graphty-monorepo/issues/3373))
- **graphty:** frame the drawing in the canvas alone; overlays never inset it ([#3372](https://github.com/graphty-org/graphty-monorepo/issues/3372))
- **graphty-element:** one wait-then-dispatch helper for the load line, and the budget for it ([#3382](https://github.com/graphty-org/graphty-monorepo/issues/3382))
- **graphty-element:** the data-source pair, nodeData and source merges wait their turn too ([#3382](https://github.com/graphty-org/graphty-monorepo/issues/3382))
- **graphty-element:** a screenshot's own camera never counts as the reader placing it ([#3372](https://github.com/graphty-org/graphty-monorepo/issues/3372))
- **graphty-element:** every load and open can start the history, so no late clear ([#3374](https://github.com/graphty-org/graphty-monorepo/issues/3374))
- **graphty-element:** a load that starts the history ends the fresh-project state ([#3374](https://github.com/graphty-org/graphty-monorepo/issues/3374))
- **graphty-element:** every load door shares the session's load line ([#3382](https://github.com/graphty-org/graphty-monorepo/issues/3382))
- **graphty-element:** a probe overtaken by a policy change answers with the new probe ([#3386](https://github.com/graphty-org/graphty-monorepo/issues/3386))
- **graphty-element:** settle waits wait for queued commands held off the queue ([#3386](https://github.com/graphty-org/graphty-monorepo/issues/3386))
- **graphty-element:** seeded simulation layouts draw the same graph however the data arrives ([#3379](https://github.com/graphty-org/graphty-monorepo/issues/3379))
- **graphty-element:** draw a resize's frame inside the engine's frame, once per size change ([#3373](https://github.com/graphty-org/graphty-monorepo/issues/3373))
- **graphty-element:** a load can start the history, so Undo never cancels an opening project ([#3374](https://github.com/graphty-org/graphty-monorepo/issues/3374))
- **graphty-element:** overlapping session loads land in the order they were asked for ([#3382](https://github.com/graphty-org/graphty-monorepo/issues/3382))
- **deps:** take zod 4.6.7 and body-parser 2.4.0 so the release audit passes ([#3393](https://github.com/graphty-org/graphty-monorepo/issues/3393), [#3318](https://github.com/graphty-org/graphty-monorepo/issues/3318))
- **graphty-element:** a capture's own margins never reframe, and the reader test uses a real wheel ([#3372](https://github.com/graphty-org/graphty-monorepo/issues/3372))
- **graphty-element:** stop three settle races in the GPU probe, the queue and Graphviz ([#3386](https://github.com/graphty-org/graphty-monorepo/issues/3386))
- **graphty-element:** draw the frame a resize is painted in ([#3373](https://github.com/graphty-org/graphty-monorepo/issues/3373))
- **graphty-element:** announce a finished load only once its step is recorded ([#3384](https://github.com/graphty-org/graphty-monorepo/issues/3384))
- **graphty-element:** settle waits wait for the autosave restore and the page loads behind it ([#3376](https://github.com/graphty-org/graphty-monorepo/issues/3376))
- **graphty-element:** a camera placed without animation or a canvas resize unsettles the frame ([#3377](https://github.com/graphty-org/graphty-monorepo/issues/3377))
- **graphty-element:** frame a settled layout after its style pass, not before it ([#3378](https://github.com/graphty-org/graphty-monorepo/issues/3378))
- **graphty-element:** a loading image annotation keeps the picture unfinished ([#3383](https://github.com/graphty-org/graphty-monorepo/issues/3383))
- **graphty-element:** pass the public API check's plain string rule on the new data types ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty-element:** stop reading a small storage quota as a private window ([#3335](https://github.com/graphty-org/graphty-monorepo/issues/3335))
- **graphty-element:** draw again after a resize while resting on demand ([#3351](https://github.com/graphty-org/graphty-monorepo/issues/3351))
- **graphty-element:** keep only untouched pending work across history.clear ([#3340](https://github.com/graphty-org/graphty-monorepo/issues/3340))
- **graphty-element:** let history.clear keep pending work ([#3340](https://github.com/graphty-org/graphty-monorepo/issues/3340))
- **graphty-element:** a project reopened over the same settings keeps exactly its saved rows ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty-element:** draw a scene change once when it is ready, not again to check it ([#3317](https://github.com/graphty-org/graphty-monorepo/issues/3317))
- **workspace:** give every pre-push gate shard its own Vite dependency cache ([#3319](https://github.com/graphty-org/graphty-monorepo/issues/3319))
- **graphty-element:** the 3D zoom keys move from the first frame, with no jump on the press ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty:** a visible pinned ring, the address in effect in file rows, and tests after the merges ([740c39424d](https://github.com/graphty-org/graphty-monorepo/commit/740c39424d))
- **graphty-element:** publish one style:changed per edit, not per layer ([#3246](https://github.com/graphty-org/graphty-monorepo/issues/3246))
- **graphty-element:** the selection glide keeps to the clock, not the frame count ([#3246](https://github.com/graphty-org/graphty-monorepo/issues/3246))
- **graphty-element:** read whole-number years as years, so a year timeline moves ([6e61c148ff](https://github.com/graphty-org/graphty-monorepo/commit/6e61c148ff))
- **graphty:** offer only the flat map as the map's Surface in 2D ([d7176e1c03](https://github.com/graphty-org/graphty-monorepo/commit/d7176e1c03))
- **graphty-element:** a map gives nodes and edges no outline of its own ([5cfcbf6b9c](https://github.com/graphty-org/graphty-monorepo/commit/5cfcbf6b9c))
- **graphty-element:** keep a doc comment's code span on one line so the docs build ([#3246](https://github.com/graphty-org/graphty-monorepo/issues/3246))
- **graphty:** say when the map's code could not be loaded, and test Apply on a geographic graph ([299b1cfd5a](https://github.com/graphty-org/graphty-monorepo/commit/299b1cfd5a))
- **graphty-element:** map edges show their line, a globe opens on its data, ready means drawn ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050))
- **graphty-element:** one ngraph spring per node pair, so parallel edges cannot keep layouts moving ([d3fc3a2383](https://github.com/graphty-org/graphty-monorepo/commit/d3fc3a2383))
- **graphty-element:** whole-number time never splits into bins narrower than one ([ea5b535c75](https://github.com/graphty-org/graphty-monorepo/commit/ea5b535c75))
- **graphty-element:** frame a map or globe from the side it faces ([3137c48f2f](https://github.com/graphty-org/graphty-monorepo/commit/3137c48f2f))
- **graphty-element:** a re-run keeps its id after the visible scope moved ([89f4c97563](https://github.com/graphty-org/graphty-monorepo/commit/89f4c97563))
- make four tier 3 stories draw the same picture on every capture ([63d86ff772](https://github.com/graphty-org/graphty-monorepo/commit/63d86ff772))
- **graphty-element:** keep the style frame budget in the extracted drawArrivedPaint ([d2dd1921d1](https://github.com/graphty-org/graphty-monorepo/commit/d2dd1921d1))
- reconcile golden's project-file refusal with tier 3's draft and data page ([ba5bba950a](https://github.com/graphty-org/graphty-monorepo/commit/ba5bba950a))
- **graphty-element:** an edge text with no words no longer keeps the picture from settling ([21edc0090c](https://github.com/graphty-org/graphty-monorepo/commit/21edc0090c))
- **graphty-element:** keep names sharp in a capture larger than the canvas ([c208daf662](https://github.com/graphty-org/graphty-monorepo/commit/c208daf662))
- **graphty-element:** render() returns the graph container again ([8ce967ab98](https://github.com/graphty-org/graphty-monorepo/commit/8ce967ab98))
- **graphty-element:** keep XR off by default and its canvas buttons on, as released ([c346e1d2c6](https://github.com/graphty-org/graphty-monorepo/commit/c346e1d2c6))
- **graphty-element:** a draft's report counts no node rows for an edge table's ends ([4c25914575](https://github.com/graphty-org/graphty-monorepo/commit/4c25914575))
- **graphty-element:** lay a file out at its styled node sizes however late the next frame is ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167))
- **graphty-element:** a key press brings the canvas focus ring back, and four test files load ([ba88910d49](https://github.com/graphty-org/graphty-monorepo/commit/ba88910d49))
- **graphty-element:** place a selected edge's band, and give back a bent band's slots ([8b6004ed10](https://github.com/graphty-org/graphty-monorepo/commit/8b6004ed10))
- **graphty-element:** a hand-pumped frame applies the whole repaint; its last batch walks every edge ([9850cd494a](https://github.com/graphty-org/graphty-monorepo/commit/9850cd494a))
- **graphty-element:** test only the meshes the pointer's ray can reach when picking ([#3244](https://github.com/graphty-org/graphty-monorepo/issues/3244))
- **graphty-element:** keep a draft's label suggestion for graph files ([#911](https://github.com/graphty-org/graphty-monorepo/issues/911), [#3243](https://github.com/graphty-org/graphty-monorepo/issues/3243))
- **graphty-element:** refuse a project file as data, and load a draft of a graph file as import does ([#911](https://github.com/graphty-org/graphty-monorepo/issues/911))
- **graphty-element:** zoom keys step per frame again, a restyle keeps the hover, real keys in tests ([88f0371589](https://github.com/graphty-org/graphty-monorepo/commit/88f0371589))
- **graphty-element:** repaint only the layers that read a finished run ([2b68fdb21f](https://github.com/graphty-org/graphty-monorepo/commit/2b68fdb21f))
- **graphty-element:** frame a graph the same on every load when borders are in screen pixels ([#3107](https://github.com/graphty-org/graphty-monorepo/issues/3107))
- **graphty-element:** a held W or S keeps zooming, and a wheel notch zooms 10% again ([e6f724b91c](https://github.com/graphty-org/graphty-monorepo/commit/e6f724b91c))
- **graphty-element:** undo across a file opened over itself redraws from the layers ([e3baf98a84](https://github.com/graphty-org/graphty-monorepo/commit/e3baf98a84))
- **graphty-element:** an empty layer takes a new selector or name before its first look ([4a008f063f](https://github.com/graphty-org/graphty-monorepo/commit/4a008f063f))
- **graphty-element:** autosave every change to the source records ([751b462093](https://github.com/graphty-org/graphty-monorepo/commit/751b462093))
- **graphty-element:** draw the selection stories' labels in dark letters on the light canvas ([#222222](https://github.com/graphty-org/graphty-monorepo/issues/222222))
- **graphty-element:** keep twopi and patchwork nodes apart as the element draws them ([eae96eb03b](https://github.com/graphty-org/graphty-monorepo/commit/eae96eb03b))
- **graphty-element:** keep a label's letters their size when it has a text outline ([8ae8cfa0a8](https://github.com/graphty-org/graphty-monorepo/commit/8ae8cfa0a8))
- **graphty-element:** draw a file's label outline, so white labels stay readable ([16c01e5af6](https://github.com/graphty-org/graphty-monorepo/commit/16c01e5af6))
- **graphty-element:** lay a bare reload mapping over a load's one named table ([e7a1303184](https://github.com/graphty-org/graphty-monorepo/commit/e7a1303184))
- **graphty-element:** draw a rounded polygon at its size under sizeMode diameter ([49690e657f](https://github.com/graphty-org/graphty-monorepo/commit/49690e657f))
- **graphty-element:** end an edge where it finally leaves its source node's outline ([e4bd2299cc](https://github.com/graphty-org/graphty-monorepo/commit/e4bd2299cc))
- **graphty-element:** a replacing load keeps hand-picked edge layers on the same edges ([65f41f6b15](https://github.com/graphty-org/graphty-monorepo/commit/65f41f6b15))
- **graphty-element:** read a saved style's node.haloSize as node.haloScale ([3892643e51](https://github.com/graphty-org/graphty-monorepo/commit/3892643e51))
- **graphty-element:** lay a DOT file out with Graphviz at the scale its styles are drawn ([#2322](https://github.com/graphty-org/graphty-monorepo/issues/2322))
- **graphty-element:** draw a 2D group the same size on every load ([#3107](https://github.com/graphty-org/graphty-monorepo/issues/3107))
- **graphty-element:** undoing a load, join, replace or type change keeps the selection ([c355b5954f](https://github.com/graphty-org/graphty-monorepo/commit/c355b5954f))
- **graphty-element:** drop middle-cap gap channels, match label ranges to the schema ([aed3585642](https://github.com/graphty-org/graphty-monorepo/commit/aed3585642))
- **graphty-element:** stand the 2D camera back far enough to see a text over a big node ([59dace13f9](https://github.com/graphty-org/graphty-monorepo/commit/59dace13f9))
- **graphty-element:** draw an edge outline band dash-dot as well ([72e0832455](https://github.com/graphty-org/graphty-monorepo/commit/72e0832455))
- **graphty-element:** turn a label's shift with the label, so it turns about its pinned point ([74cbbef306](https://github.com/graphty-org/graphty-monorepo/commit/74cbbef306))
- **graphty-element:** keep whole a label line that fits before its trailing space is counted ([e37884b689](https://github.com/graphty-org/graphty-monorepo/commit/e37884b689))
- **graph-io:** thin sigma.js labels by its own 100 px label grid ([c5dcf0d5c4](https://github.com/graphty-org/graphty-monorepo/commit/c5dcf0d5c4))
- **graphty-element:** list reloadSource in the API report where the report generator orders it ([881333badc](https://github.com/graphty-org/graphty-monorepo/commit/881333badc))
- **graphty-element:** a centered border on a tiny node reaches half its width past the size ([ac7e87f0d6](https://github.com/graphty-org/graphty-monorepo/commit/ac7e87f0d6))
- **graphty-element:** a stable frame waits for the glide back to the selection ([9054001e5a](https://github.com/graphty-org/graphty-monorepo/commit/9054001e5a))
- **graphty-element:** place a node's label against its outline, wherever its border sits ([2dc938a658](https://github.com/graphty-org/graphty-monorepo/commit/2dc938a658))
- **graphty-element:** draw Pajek's man and woman as Pajek 6.02 draws them ([0385b9e075](https://github.com/graphty-org/graphty-monorepo/commit/0385b9e075))
- **graphty-element:** reconcile the studio's and golden's label, shape, row and import behavior ([5de1340bbb](https://github.com/graphty-org/graphty-monorepo/commit/5de1340bbb))
- **graphty-element:** draw a label's border as a ring where its background lets the middle show ([61a4970016](https://github.com/graphty-org/graphty-monorepo/commit/61a4970016))
- **graph-io:** draw Cytoscape.js label and ring opacities times the element's, label box padding ([b25603d67b](https://github.com/graphty-org/graphty-monorepo/commit/b25603d67b))
- **graphty:** new layer from selection makes the layer and opens its Style tab ([18f1cae069](https://github.com/graphty-org/graphty-monorepo/commit/18f1cae069))
- **graphty-element:** pass sigma settings to graphology files; judge screen-floored lines as drawn ([16990d549b](https://github.com/graphty-org/graphty-monorepo/commit/16990d549b))
- **graphty-element:** draw a file node's whole opacity on its border too ([0abc009909](https://github.com/graphty-org/graphty-monorepo/commit/0abc009909))
- **graphty-element:** hide labels that touch, and keep moved labels clear of the ring ([e0bf7c63eb](https://github.com/graphty-org/graphty-monorepo/commit/e0bf7c63eb))
- **graphty-element:** keep a partly placed file's nodes when the advised layout cannot hold them ([917f310084](https://github.com/graphty-org/graphty-monorepo/commit/917f310084))
- **graph-io:** draw a GEXF image shape as Gephi's disc, and rescale weights of large graphs ([ae98516232](https://github.com/graphty-org/graphty-monorepo/commit/ae98516232))
- **graphty-element:** fill a round rectangle whose corners meet, a pill or a circle, whole ([1da7e11a38](https://github.com/graphty-org/graphty-monorepo/commit/1da7e11a38))
- **graph-io:** read CX2 edge label anchors and Cytoscape's EDGE_LABEL_AUTOROTATE ([c7fae3b223](https://github.com/graphty-org/graphty-monorepo/commit/c7fae3b223))
- **graph-io:** size Cytoscape's annotation arrowheads as Cytoscape draws them ([5ec2fef9e7](https://github.com/graphty-org/graphty-monorepo/commit/5ec2fef9e7))
- **graph-io:** read vis-network curves, loops, label boxes and outlines as vis-network draws ([41972ec2de](https://github.com/graphty-org/graphty-monorepo/commit/41972ec2de))
- **graph-io:** read Cytoscape.js haystack arrows, line opacity, gradients and label text as drawn ([dd42ab2f92](https://github.com/graphty-org/graphty-monorepo/commit/dd42ab2f92))
- **graphty-element:** scale label-sized nodes by their labels, keep a rim with its outline ([5b300c013b](https://github.com/graphty-org/graphty-monorepo/commit/5b300c013b))
- **graph-io:** place Cytoscape desktop charts as Cytoscape does, add the missing chart specimens ([c3e5ac654f](https://github.com/graphty-org/graphty-monorepo/commit/c3e5ac654f))
- **graph-io:** read Graphviz's gv2gml GML as Graphviz draws it, with its specimen sheets ([#45](https://github.com/graphty-org/graphty-monorepo/issues/45))
- **graph-io:** read graphology positions y up and labels on one line, as sigma.js draws them ([3a5147bbc4](https://github.com/graphty-org/graphty-monorepo/commit/3a5147bbc4))
- **graph-io:** read graphology colors with sigma.js's own parser and add the edge color sheet ([3de6d40016](https://github.com/graphty-org/graphty-monorepo/commit/3de6d40016))
- **graphty,graphty-element:** layer rows and the key say what a layer draws ([52cb47a85a](https://github.com/graphty-org/graphty-monorepo/commit/52cb47a85a))
- **graphty-element:** draw node images, pies and stripes in their own colors ([54f1c81086](https://github.com/graphty-org/graphty-monorepo/commit/54f1c81086))
- **graphty,graphty-element,compact-mantine:** find names columns as the screen does ([3c27003a63](https://github.com/graphty-org/graphty-monorepo/commit/3c27003a63))
- **graphty-element,graphty:** names stay off other nodes, clear of the ring, and decluttered fresh ([fa270090e9](https://github.com/graphty-org/graphty-monorepo/commit/fa270090e9))
- **graphty:** a sample opens centered, and Frame selection keeps the angle ([ef2f796eea](https://github.com/graphty-org/graphty-monorepo/commit/ef2f796eea))
- **graphty-element:** a hover ends when the pointer leaves the drawing ([28e989215f](https://github.com/graphty-org/graphty-monorepo/commit/28e989215f))
- **graph-io:** read Gephi's GML as Gephi draws it, and add Gephi's GML specimen sheets ([d47dcc30e1](https://github.com/graphty-org/graphty-monorepo/commit/d47dcc30e1))
- **graphty-element:** read a JSON document's dialect from the parsed document, not its first 64 KB ([5f550f89b8](https://github.com/graphty-org/graphty-monorepo/commit/5f550f89b8))
- **graph-io:** tell a vis-network document with no edges by its options, and export sniffJsonDialect ([a0311a66ed](https://github.com/graphty-org/graphty-monorepo/commit/a0311a66ed))
- **graph-io:** draw graphology elements marked visibility hidden, as sigma.js 4 does ([1622484f43](https://github.com/graphty-org/graphty-monorepo/commit/1622484f43))
- **graphty,graphty-element:** a redone run's layers match again, and Update acts or is not offered ([84c28db0d8](https://github.com/graphty-org/graphty-monorepo/commit/84c28db0d8))
- **graphty,graphty-element:** the key counts what is drawn and never moves the drawing ([14b7a76061](https://github.com/graphty-org/graphty-monorepo/commit/14b7a76061))
- **graphty:** inspector summaries list every value, empty columns and degree ([806f842f2b](https://github.com/graphty-org/graphty-monorepo/commit/806f842f2b))
- **graph-io:** draw Pajek files with Pajek's own defaults and carried parameters ([#660000](https://github.com/graphty-org/graphty-monorepo/issues/660000), [#999999](https://github.com/graphty-org/graphty-monorepo/issues/999999), [#007091](https://github.com/graphty-org/graphty-monorepo/issues/007091))
- **graph-io:** repair the merged oracle branch so it builds ([2ada109567](https://github.com/graphty-org/graphty-monorepo/commit/2ada109567))
- **graphty-element:** keep a vis-network border's length beside its screen width ([d35e2c9ed3](https://github.com/graphty-org/graphty-monorepo/commit/d35e2c9ed3))
- **graph-io:** do not place a Cytoscape.js compound at its saved position ([5d18550114](https://github.com/graphty-org/graphty-monorepo/commit/5d18550114))
- **graphty-element:** read every label field channel with one pattern again ([3d9259b713](https://github.com/graphty-org/graphty-monorepo/commit/3d9259b713))
- **graphty-element:** take a label letter size of zero as its channel does ([c557a5e2a2](https://github.com/graphty-org/graphty-monorepo/commit/c557a5e2a2))
- **graphty-element:** read the label rotation channel beside the others after the merge ([3f07a49265](https://github.com/graphty-org/graphty-monorepo/commit/3f07a49265))
- **graphty-element:** read the label rotation channel the merge of two label branches declared twice ([8c38bd70ad](https://github.com/graphty-org/graphty-monorepo/commit/8c38bd70ad))
- **graphty-element:** draw an edge's end caption at an end that has no arrow ([9a8e0695d8](https://github.com/graphty-org/graphty-monorepo/commit/9a8e0695d8))
- **graphty-element:** draw a file's label letters at the file's size in any font ([513b175f67](https://github.com/graphty-org/graphty-monorepo/commit/513b175f67))
- **graphty-element:** keep the first-added of equal-size labels when decluttering by size ([bdea2afa83](https://github.com/graphty-org/graphty-monorepo/commit/bdea2afa83))
- **graphty-element:** count a space after a label's last word too when wrapping as Cytoscape ([e05740eda4](https://github.com/graphty-org/graphty-monorepo/commit/e05740eda4))
- **graph-io:** state each end's arrow as Cytoscape and Graphviz draw it ([02aa64163a](https://github.com/graphty-org/graphty-monorepo/commit/02aa64163a))
- **graphty-element:** draw each Gephi curved edge as its own curve, so a mutual pair bows apart ([71c139b397](https://github.com/graphty-org/graphty-monorepo/commit/71c139b397))
- **graphty-element:** keep the label rotation channel the branch merge declared twice ([02c6986ef7](https://github.com/graphty-org/graphty-monorepo/commit/02c6986ef7))
- **graphty-element:** read the label rotation channel the two merged branches each added ([bcd4139a7f](https://github.com/graphty-org/graphty-monorepo/commit/bcd4139a7f))
- **graphty-element:** restore the label channels the oracle branch merge declared twice ([30751c1c0c](https://github.com/graphty-org/graphty-monorepo/commit/30751c1c0c))
- **graphty,compact-mantine,graphty-element:** cells read with their row; summaries count columns ([5cf1552b96](https://github.com/graphty-org/graphty-monorepo/commit/5cf1552b96))
- **graphty,graphty-element:** keep the key off the drawing and say what each entry reaches ([e07dec7235](https://github.com/graphty-org/graphty-monorepo/commit/e07dec7235))
- **graphty,graphty-element:** find reads plain rules, says what it selects, finds degree and yes ([fa2c8d09d8](https://github.com/graphty-org/graphty-monorepo/commit/fa2c8d09d8))
- **graphty:** name each control for what it does, once, in the words it means ([fa3b1b8fd8](https://github.com/graphty-org/graphty-monorepo/commit/fa3b1b8fd8))
- **graphty-element:** restore a partly placed file's positions in one layout step ([e498103dfe](https://github.com/graphty-org/graphty-monorepo/commit/e498103dfe))
- **graphty:** focus stays on a control and lands where the reader goes next ([ae2a7f2184](https://github.com/graphty-org/graphty-monorepo/commit/ae2a7f2184))
- **graph-io:** give each program's white background and read Cytoscape.js shape spellings ([10f1306d42](https://github.com/graphty-org/graphty-monorepo/commit/10f1306d42))
- **graphty-element:** draw a file's vee arrows in its program's proportions ([a07d590b53](https://github.com/graphty-org/graphty-monorepo/commit/a07d590b53))
- **graphty-element:** draw a lone curved edge along its curve, its arrow along the curve's end ([873c1de4c0](https://github.com/graphty-org/graphty-monorepo/commit/873c1de4c0))
- **graphty-element:** bow a curved edge in the plane a 2D graph is drawn in ([28e195d917](https://github.com/graphty-org/graphty-monorepo/commit/28e195d917))
- **graph-io:** read GEXF styles the way Gephi's preview draws them ([bfa3c0da55](https://github.com/graphty-org/graphty-monorepo/commit/bfa3c0da55))
- **graphty-element:** keep a file's placed nodes when it places only some ([d62494c44b](https://github.com/graphty-org/graphty-monorepo/commit/d62494c44b))
- **graphty-element:** labels draw over the selection ring; wheel turns out undo turns in ([4e7c5cddd6](https://github.com/graphty-org/graphty-monorepo/commit/4e7c5cddd6))
- **graphty-element:** draw sigma.js labels in canvas px over positions fitted to the canvas ([#3173](https://github.com/graphty-org/graphty-monorepo/issues/3173))
- settle the round 6 style fixes together ([#3167](https://github.com/graphty-org/graphty-monorepo/issues/3167), [#3170](https://github.com/graphty-org/graphty-monorepo/issues/3170), [#3171](https://github.com/graphty-org/graphty-monorepo/issues/3171))
- **graphty-element:** meet a bodiless node's box with its edges ([#3170](https://github.com/graphty-org/graphty-monorepo/issues/3170))
- **graphty:** the key names the bound column, stays current and never cuts a line ([ed4351b258](https://github.com/graphty-org/graphty-monorepo/commit/ed4351b258))
- **graphty-element:** predict a continuous label size mapping as drawn between its converted points ([64c0906a6f](https://github.com/graphty-org/graphty-monorepo/commit/64c0906a6f))
- **graphty,graphty-element:** page text, right-click and the Data page act like an app ([b4dc42dd20](https://github.com/graphty-org/graphty-monorepo/commit/b4dc42dd20))
- **graphty-element:** draw every file label size in proportion, not only the median one ([74d87ba589](https://github.com/graphty-org/graphty-monorepo/commit/74d87ba589))
- **graphty,graphty-element:** condition lists take Enter, Tab and the window's edge ([ed738e6840](https://github.com/graphty-org/graphty-monorepo/commit/ed738e6840))
- **graphty-element,graphty:** put the rule check and the find-rule cards where they belong ([ef95e565f9](https://github.com/graphty-org/graphty-monorepo/commit/ef95e565f9))
- **graphty-element:** draw stored positions in the styles' unit when lengths are kept ([93e92787d4](https://github.com/graphty-org/graphty-monorepo/commit/93e92787d4))
- **graphty-element:** keep a node's own size under a file's locked node size ([3f426e3a90](https://github.com/graphty-org/graphty-monorepo/commit/3f426e3a90))
- **graph-io:** read GEXF viz:size as a radius and use sigma 4's node defaults ([#666666](https://github.com/graphty-org/graphty-monorepo/issues/666666))
- **graphty-element:** draw dashed and dotted self-loops round their teardrop ([ac654d16a6](https://github.com/graphty-org/graphty-monorepo/commit/ac654d16a6))
- **graphty-element:** fan parallel edges apart only when they are curved ([31520baeec](https://github.com/graphty-org/graphty-monorepo/commit/31520baeec))
- **graphty-element:** join an opened project's style rows to their layers ([619ce32be2](https://github.com/graphty-org/graphty-monorepo/commit/619ce32be2))
- **graphty-element:** classify data.valueCounts as a read and document its kind option ([8589ca1025](https://github.com/graphty-org/graphty-monorepo/commit/8589ca1025))
- **graphty-element:** give a label at most 64 texture pixels per em ([1422b27953](https://github.com/graphty-org/graphty-monorepo/commit/1422b27953))
- **graphty-element:** accept a wrap width of zero, as its channel does ([23dc297686](https://github.com/graphty-org/graphty-monorepo/commit/23dc297686))
- **graphty-element:** scale a file's lengths by each node's larger side ([90b8d9e703](https://github.com/graphty-org/graphty-monorepo/commit/90b8d9e703))
- **graphty-element:** draw self-loops as teardrops and fan out parallel edges ([a9358f7ae7](https://github.com/graphty-org/graphty-monorepo/commit/a9358f7ae7))
- **graphty-element:** keep a stretched group's border width and label size ([7fea040e66](https://github.com/graphty-org/graphty-monorepo/commit/7fea040e66))
- **graphty-element:** count groups that follow their members as placed ([072386368c](https://github.com/graphty-org/graphty-monorepo/commit/072386368c))
- **graphty-element:** keep the positions of graphology and vis.js files ([72a3105a38](https://github.com/graphty-org/graphty-monorepo/commit/72a3105a38))
- **graphty-element:** draw every 2D shape of a file as the flat shape of the same name ([f4882b2504](https://github.com/graphty-org/graphty-monorepo/commit/f4882b2504))
- **graph-io:** place a yEd GML label anchored inside its node at the center ([51221f858e](https://github.com/graphty-org/graphty-monorepo/commit/51221f858e))
- **graphty-element:** bind the preview passed to the groups' palette helper ([c1bd0b0869](https://github.com/graphty-org/graphty-monorepo/commit/c1bd0b0869))
- **graphty-element:** a run's groups as layers keep the run's palette past its colors ([c98618389d](https://github.com/graphty-org/graphty-monorepo/commit/c98618389d))
- **graphty-element:** group layers keep their colors and names through a re-run, and scale with size ([b2428f9e11](https://github.com/graphty-org/graphty-monorepo/commit/b2428f9e11))
- **graphty-element:** restoring a group run's deleted layers brings its folder of groups back ([43bd88a519](https://github.com/graphty-org/graphty-monorepo/commit/43bd88a519))
- **graphty-element:** a group run's re-run keeps its folder without repeating the option ([ff68e77fa9](https://github.com/graphty-org/graphty-monorepo/commit/ff68e77fa9))
- **graphty-element:** stop the first-import check copying the whole history on every step ([a070e32a2c](https://github.com/graphty-org/graphty-monorepo/commit/a070e32a2c))
- **graphty-element:** a layer's groups read steady while its repaint is pending ([d163a771ac](https://github.com/graphty-org/graphty-monorepo/commit/d163a771ac))
- **graphty-element:** classify Node.drawnFill as a read in the door list ([92cb0371be](https://github.com/graphty-org/graphty-monorepo/commit/92cb0371be))
- **graphty-element:** a hidden row holds no run's picture back, and a node reports its drawn fill ([5c4b3600d4](https://github.com/graphty-org/graphty-monorepo/commit/5c4b3600d4))
- **graphty-element:** a hidden row stays hidden when a run, a note or a data change repaints ([7f36cec26b](https://github.com/graphty-org/graphty-monorepo/commit/7f36cec26b))
- **graphty-element:** accept a run-bound encoding on a layer that paints everything ([7f47d03d33](https://github.com/graphty-org/graphty-monorepo/commit/7f47d03d33))
- **graphty-element:** text size channels take what their schema takes; under 1 draws no text ([#2619](https://github.com/graphty-org/graphty-monorepo/issues/2619))
- **graphty-element:** a label's font size schema states the minimum its channel enforces ([ad39896231](https://github.com/graphty-org/graphty-monorepo/commit/ad39896231))
- **graphty-element:** an outline stays outside its node when edges cross in front of it ([204e60e703](https://github.com/graphty-org/graphty-monorepo/commit/204e60e703))
- **graphty-element:** the Selected row starts with the yellow highlight readers expect ([a207b9ca36](https://github.com/graphty-org/graphty-monorepo/commit/a207b9ca36))
- **graphty-element:** the route highlight default stands apart from every group color ([#0000](https://github.com/graphty-org/graphty-monorepo/issues/0000))
- **graphty-element:** a node's outline is a ring around it, never a disc over it ([65dbbf2486](https://github.com/graphty-org/graphty-monorepo/commit/65dbbf2486))
- **graphty-element:** a restyle keeps the hover, and the reader's zoom stops the element's framing ([26778bf6fd](https://github.com/graphty-org/graphty-monorepo/commit/26778bf6fd))
- **graphty-element:** zoom a 3D wheel notch by its own 10 percent step ([#2349](https://github.com/graphty-org/graphty-monorepo/issues/2349))
- **graphty-element:** changing a style row's kind keeps the row ([6e906816ff](https://github.com/graphty-org/graphty-monorepo/commit/6e906816ff))
- **graphty-element:** mark arf's scalingFactor advanced now that arf also declares scale ([bd12dc6d8f](https://github.com/graphty-org/graphty-monorepo/commit/bd12dc6d8f))
- **graphty-element:** suggest backticks only for a rewrite the selector accepts ([f9a4c19cfe](https://github.com/graphty-org/graphty-monorepo/commit/f9a4c19cfe))
- **graphty-element:** a run reports the parameters of the execution undo restores ([864c50dfb5](https://github.com/graphty-org/graphty-monorepo/commit/864c50dfb5))
- **graphty-element:** Shift-click on a node adds it to the selection ([a509261980](https://github.com/graphty-org/graphty-monorepo/commit/a509261980))
- **graphty-element:** draw a glow around the node, and fade it by its color's opacity ([d8750e8399](https://github.com/graphty-org/graphty-monorepo/commit/d8750e8399))
- **graphty-element:** move a selected node's halo with it while it is dragged ([48f1439d1f](https://github.com/graphty-org/graphty-monorepo/commit/48f1439d1f))
- **graphty-element:** free the viewport for an unmeasured size; door-list highlightStyle ([c366e5c56b](https://github.com/graphty-org/graphty-monorepo/commit/c366e5c56b))
- clear the last SonarQube findings (NaN-safe comparisons, readonly props, vector normalising) ([703577afbc](https://github.com/graphty-org/graphty-monorepo/commit/703577afbc))
- clear the SonarQube findings on the studio branch's changed lines ([9de6080dbd](https://github.com/graphty-org/graphty-monorepo/commit/9de6080dbd))
- **graphty-element:** refuse a sharp capture whose encode fails instead of leaving it pending ([0c5f44639d](https://github.com/graphty-org/graphty-monorepo/commit/0c5f44639d))
- **graphty-element:** name the run scope's data digest dataDigest, and allow column names in results ([130a6e52e1](https://github.com/graphty-org/graphty-monorepo/commit/130a6e52e1))
- **graphty-element:** tell subscribers when only the selection origin changes; suggest only a backtick rewrite that parses ([79b7000b42](https://github.com/graphty-org/graphty-monorepo/commit/79b7000b42))
- **graphty:** show the reader's own rule in the find box's number hints ([24883fcff0](https://github.com/graphty-org/graphty-monorepo/commit/24883fcff0))
- keep encoding layers named after their run and classify the new public methods ([fa4563f0ae](https://github.com/graphty-org/graphty-monorepo/commit/fa4563f0ae))
- repair what merging master broke on the studio branch ([#1636](https://github.com/graphty-org/graphty-monorepo/issues/1636))
- **graphty-element:** let a press on the drawing reach the host page ([2a236410c4](https://github.com/graphty-org/graphty-monorepo/commit/2a236410c4))
- **graphty-element:** draw the selection halo as a ring that does not tint the node ([f429f72c80](https://github.com/graphty-org/graphty-monorepo/commit/f429f72c80))
- **graphty:** find list counts each kind, shows its scrollbar and rests only on a whole row ([a930cc3df4](https://github.com/graphty-org/graphty-monorepo/commit/a930cc3df4))
- **graphty:** draw the app's labels on a white chip so a selected edge's band cannot hide a letter ([6651eb1226](https://github.com/graphty-org/graphty-monorepo/commit/6651eb1226))
- **graphty:** choose the app's own path highlight color and keep the element default indigo ([#332288](https://github.com/graphty-org/graphty-monorepo/issues/332288))
- **graphty:** truthful import checks, child source rows, and a replace drawn as an open is ([3c6b76c7f4](https://github.com/graphty-org/graphty-monorepo/commit/3c6b76c7f4))
- **graphty:** focus the inspector title after a run or a find pick; no canvas ring after a click ([c9430b8d77](https://github.com/graphty-org/graphty-monorepo/commit/c9430b8d77))
- **graphty-element:** pick no edge before the first frame is drawn ([eaa3325bb0](https://github.com/graphty-org/graphty-monorepo/commit/eaa3325bb0))
- **graphty-element:** draw a route's nodes in black so they stand out from the default nodes ([#332288](https://github.com/graphty-org/graphty-monorepo/issues/332288))
- **graphty-element:** let go of a graph when its element leaves the page ([a264852888](https://github.com/graphty-org/graphty-monorepo/commit/a264852888))
- **graphty:** keep the drawing where it is after a run, a find pick and with a dialog open ([892c0578a0](https://github.com/graphty-org/graphty-monorepo/commit/892c0578a0))
- **graphty:** find an edge by its name and keep a typed rule in the box ([8c3bdf125e](https://github.com/graphty-org/graphty-monorepo/commit/8c3bdf125e))
- **graphty-element:** keep a run's summary when a project is reopened ([5c8edb99fa](https://github.com/graphty-org/graphty-monorepo/commit/5c8edb99fa))
- **graphty-element:** draw a route and a selected edge so they stand out on a colored drawing ([#332288](https://github.com/graphty-org/graphty-monorepo/issues/332288), [#0077](https://github.com/graphty-org/graphty-monorepo/issues/0077))
- **graphty-element:** band a continuous measure's histogram instead of one bar per value ([0ccdc828dc](https://github.com/graphty-org/graphty-monorepo/commit/0ccdc828dc))
- **graphty-element:** sort the session imports and list the selected-edge story in the roster ([a115f95c6d](https://github.com/graphty-org/graphty-monorepo/commit/a115f95c6d))
- **graphty-element:** repair the session sources a partial commit left unparseable ([75867bd894](https://github.com/graphty-org/graphty-monorepo/commit/75867bd894))
- **graphty-element:** plan() states the weight a run would read ([0e23792501](https://github.com/graphty-org/graphty-monorepo/commit/0e23792501))
- **graphty:** frame selection frames a selected edge's ends ([c74a85615e](https://github.com/graphty-org/graphty-monorepo/commit/c74a85615e))
- **graphty-element:** draw a selected edge with the configured selection color ([288624ad14](https://github.com/graphty-org/graphty-monorepo/commit/288624ad14))
- **graphty-element:** restore the camera views a mixed commit left unbuildable ([ebb2cfcbad](https://github.com/graphty-org/graphty-monorepo/commit/ebb2cfcbad))
- **graphty-element:** write the CSV adjacency table without the header row default ([2143deaaec](https://github.com/graphty-org/graphty-monorepo/commit/2143deaaec))
- **graphty-element:** hand focus given to the element to its drawing ([e63ee191b9](https://github.com/graphty-org/graphty-monorepo/commit/e63ee191b9))
- **graphty-element:** publish the force layout defaults ngraph actually runs ([b6011c01db](https://github.com/graphty-org/graphty-monorepo/commit/b6011c01db))
- **graphty-element:** draw a capture larger than the canvas at its own size ([6783ba895a](https://github.com/graphty-org/graphty-monorepo/commit/6783ba895a))
- **graphty-element:** frame the whole graph when fitting a 2D view ([d088c23418](https://github.com/graphty-org/graphty-monorepo/commit/d088c23418))
- **graphty-element:** name the drawing's canvas and show its focus ring ([416876eeaa](https://github.com/graphty-org/graphty-monorepo/commit/416876eeaa))
- **graphty-element:** leave a layer painted over on every node out of the legend ([895e5fab35](https://github.com/graphty-org/graphty-monorepo/commit/895e5fab35))
- **graphty:** start Glow and Outline in the element's own colors and fold animation into Pattern ([#00](https://github.com/graphty-org/graphty-monorepo/issues/00))
- **graphty-element:** keep Babylon's default WebXR enter button off the canvas ([dba64036dd](https://github.com/graphty-org/graphty-monorepo/commit/dba64036dd))
- **graphty:** say under Method when a layout method is refused ([269053df07](https://github.com/graphty-org/graphty-monorepo/commit/269053df07))
- **graphty-element:** light 3D nodes matte so a lit face never washes to white ([e85d74633b](https://github.com/graphty-org/graphty-monorepo/commit/e85d74633b))
- **graphty-element:** draw a visible default glow and publish the glow strength default ([#00](https://github.com/graphty-org/graphty-monorepo/issues/00))
- **graphty-element:** flag layout and algorithm options so key forms show the right fields ([94b3fc0ce4](https://github.com/graphty-org/graphty-monorepo/commit/94b3fc0ce4))
- **graphty-element:** record the directed getter in the public API report ([ae2af73e90](https://github.com/graphty-org/graphty-monorepo/commit/ae2af73e90))
- **graphty-element:** export a partition's groups by the rank the screen names them by ([9d6598eea3](https://github.com/graphty-org/graphty-monorepo/commit/9d6598eea3))
- **graphty-element:** draw undirected graphs without arrowheads ([bee8d9c102](https://github.com/graphty-org/graphty-monorepo/commit/bee8d9c102))
- **graphty-element:** impose no default layout seed; the graphty app passes its own ([b98e99a5b1](https://github.com/graphty-org/graphty-monorepo/commit/b98e99a5b1))
- **graphty:** keep the legend and the Color line to what the drawing shows ([377c526e15](https://github.com/graphty-org/graphty-monorepo/commit/377c526e15))
- **graphty-element:** draw the nodes a load's edges name when no node row gives them ([92882d5fd3](https://github.com/graphty-org/graphty-monorepo/commit/92882d5fd3))
- **graphty-element:** lay out Spectral by the smallest Laplacian eigenvectors ([4dcee7c739](https://github.com/graphty-org/graphty-monorepo/commit/4dcee7c739))
- **graphty-element:** stop camera keys sticking when a shortcut moves focus ([7006b45a2a](https://github.com/graphty-org/graphty-monorepo/commit/7006b45a2a))
- **graphty-element:** refuse a GraphML or GEXF file cut short instead of loading part of it ([0e6159facc](https://github.com/graphty-org/graphty-monorepo/commit/0e6159facc))

### 🔥 Performance

- **graphty-element:** read a legend's element counts from the scope bitmaps, not id sets ([51d459c5fd](https://github.com/graphty-org/graphty-monorepo/commit/51d459c5fd))
- **graphty-element:** run Louvain, k-core and label propagation's CPU port in a Worker ([877448a2a5](https://github.com/graphty-org/graphty-monorepo/commit/877448a2a5))
- **graphty-element:** apply a repaint across frames, 16 ms of it a frame ([2c8405412a](https://github.com/graphty-org/graphty-monorepo/commit/2c8405412a))
- **graphty-element:** check a run's layer without describing every record ([6c87f50992](https://github.com/graphty-org/graphty-monorepo/commit/6c87f50992))
- **graphty-element:** cap a frame's layout catch-up at 40 ms of stepping ([d4055ddc37](https://github.com/graphty-org/graphty-monorepo/commit/d4055ddc37))
- **graphty-element:** fill painted styles in one pass instead of lodash defaultsDeep ([f9ae3869e4](https://github.com/graphty-org/graphty-monorepo/commit/f9ae3869e4))
- **graphty-element:** draw a fanned edge's arc with as many pieces as it bends ([0c764de8ce](https://github.com/graphty-org/graphty-monorepo/commit/0c764de8ce))
- **graphty-element:** hash a run's data once per data change, not once per layout frame ([14bd98cae8](https://github.com/graphty-org/graphty-monorepo/commit/14bd98cae8))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.62
- Updated @graphty/remote-logger to 2.0.24
- Updated babylonjs-map to 0.0.1
- Updated graph-samples to 0.1.40
- Updated visual-review to 0.2.36
- Updated graph-format to 1.4.8
- Updated algorithms to 3.4.15
- Updated graph-io to 0.3.49
- Updated layout to 2.5.11

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent

## 3.30.0 (2026-10-21)

### 🚀 Features

- **graphty-element:** node.halo channels draw the selection halo on any node a layer picks ([49c96397e](https://github.com/graphty-org/graphty-monorepo/commit/49c96397e))
- **graphty-element:** make the first import into a new session the project's baseline ([4ce3d5914](https://github.com/graphty-org/graphty-monorepo/commit/4ce3d5914))
- **graphty-element:** list the sample datasets and generators from ./catalog ([d7dcc8a5d](https://github.com/graphty-org/graphty-monorepo/commit/d7dcc8a5d))
- **graphty-element:** load a generated graph or a sample dataset by name ([d1a66f391](https://github.com/graphty-org/graphty-monorepo/commit/d1a66f391))
- **graphty-element:** read a label template line as a row and write it back ([d25b40463](https://github.com/graphty-org/graphty-monorepo/commit/d25b40463))
- **graphty-element:** lay graphs out with Graphviz engines in WebAssembly ([13b699bee](https://github.com/graphty-org/graphty-monorepo/commit/13b699bee))
- **graphty-element:** network source stories say what their data is ([5c74c9a2a](https://github.com/graphty-org/graphty-monorepo/commit/5c74c9a2a))
- **graphty-element:** loadSample, loads() that follows undo, and expansion "none" on load ([32ad0c97c](https://github.com/graphty-org/graphty-monorepo/commit/32ad0c97c))
- **graphty-element:** a turning fit, outlines drawn as rings, no halo at opacity 0 ([160f4c330](https://github.com/graphty-org/graphty-monorepo/commit/160f4c330))
- **graphty-element:** auto-rotate, fit insets, unlit nodes, hover look that follows the selection ([71cbee20b](https://github.com/graphty-org/graphty-monorepo/commit/71cbee20b))
- **graphty-element:** list and delete autosaved work without an element ([3421bd441](https://github.com/graphty-org/graphty-monorepo/commit/3421bd441))
- **graph-io:** the Cypher source for Neo4j and Neptune (experimental) ([fe4858f9e](https://github.com/graphty-org/graphty-monorepo/commit/fe4858f9e))
- **graphty-element:** click-to-expand from a node's network source (experimental) ([f079befe7](https://github.com/graphty-org/graphty-monorepo/commit/f079befe7))
- **graphty-element:** load from network sources through the session (experimental) ([#2907](https://github.com/graphty-org/graphty-monorepo/issues/2907))
- **graphty-element:** network source seams (experimental) ([#2907](https://github.com/graphty-org/graphty-monorepo/issues/2907))
- **graphty-element:** a hover selector for style layers that follow the pointer ([d0738bf00](https://github.com/graphty-org/graphty-monorepo/commit/d0738bf00))
- **graphty-element:** rebuild the Labels / Card look story on the card label options ([67b8d5a3d](https://github.com/graphty-org/graphty-monorepo/commit/67b8d5a3d))
- **graphty-element:** draw card labels: panel shadow, padded text, even corners ([#3157](https://github.com/graphty-org/graphty-monorepo/issues/3157), [#3158](https://github.com/graphty-org/graphty-monorepo/issues/3158))
- **graphty-element:** close button on labels ([3dca4951b](https://github.com/graphty-org/graphty-monorepo/commit/3dca4951b))
- **graphty-element:** screen-sized labels and labels kept in view ([b2c578b85](https://github.com/graphty-org/graphty-monorepo/commit/b2c578b85))
- **graphty-element:** build label text from several values with a template binding ([5975b4f55](https://github.com/graphty-org/graphty-monorepo/commit/5975b4f55))
- **graphty-element:** scaffold the card-label options and hooks ([501fb0551](https://github.com/graphty-org/graphty-monorepo/commit/501fb0551))
- **graphty-element:** rendererStatus.drawing says whether anything is drawn ([be05a41de](https://github.com/graphty-org/graphty-monorepo/commit/be05a41de))
- **graphty-element:** autosave on the element, with the page lifecycle ([9b9d8befa](https://github.com/graphty-org/graphty-monorepo/commit/9b9d8befa))
- **graphty-element:** restore autosaved work on the next load ([58f1bc696](https://github.com/graphty-org/graphty-monorepo/commit/58f1bc696))
- **graphty-element:** write autosave entries as the work changes ([4d19b91bb](https://github.com/graphty-org/graphty-monorepo/commit/4d19b91bb))
- **graphty-element:** add the autosave store ([87525f1bf](https://github.com/graphty-org/graphty-monorepo/commit/87525f1bf))
- **graphty-element:** build the project file one member at a time ([9b1b2a1ef](https://github.com/graphty-org/graphty-monorepo/commit/9b1b2a1ef))

### 🩹 Fixes

- **graphty-element:** draw the selection stories' labels in dark letters on the light canvas ([#222222](https://github.com/graphty-org/graphty-monorepo/issues/222222))
- **graphty-element:** keep twopi and patchwork nodes apart as the element draws them ([8a920e6cd](https://github.com/graphty-org/graphty-monorepo/commit/8a920e6cd))
- **graphty-element:** count a change made while a page load settles as unsaved work ([9bf9ccd2a](https://github.com/graphty-org/graphty-monorepo/commit/9bf9ccd2a))
- **workspace:** clear the SonarQube findings golden picked up ([c89ebf4be](https://github.com/graphty-org/graphty-monorepo/commit/c89ebf4be))
- **graphty-element:** keep a flat node's halo visible while a solid's draws only its far side ([b56fcc3cc](https://github.com/graphty-org/graphty-monorepo/commit/b56fcc3cc))
- **graphty-element:** accept a halo scale of 0 in the node style, as the channel does ([#2067](https://github.com/graphty-org/graphty-monorepo/issues/2067))
- **graphty-element:** send a chunked load's edges after its nodes ([72f283d43](https://github.com/graphty-org/graphty-monorepo/commit/72f283d43))
- **graphty-element:** compute the layout in 2D whenever the view is 2D ([d5e1db480](https://github.com/graphty-org/graphty-monorepo/commit/d5e1db480))
- **graphty-element:** draw a layer's halo while the selection's own halo is hidden ([53b881ebc](https://github.com/graphty-org/graphty-monorepo/commit/53b881ebc))
- **graphty-element:** keep a node's outline ring against the node anywhere in a 3D view ([1750d3488](https://github.com/graphty-org/graphty-monorepo/commit/1750d3488))
- **graphty-element:** stop node materials importing their shaders lazily at draw time ([a86e4c621](https://github.com/graphty-org/graphty-monorepo/commit/a86e4c621))
- **graphty-element:** flag layout and algorithm options so key forms show the right fields ([8aac9d535](https://github.com/graphty-org/graphty-monorepo/commit/8aac9d535))
- **graphty-element:** leave layers scoped to the selection out of a file's styles ([a99e2f238](https://github.com/graphty-org/graphty-monorepo/commit/a99e2f238))
- **graphty-element:** let the layout property take a catalog id ([5b2efb159](https://github.com/graphty-org/graphty-monorepo/commit/5b2efb159))
- **graphty-element:** detect a csv file behind leading # and % comment lines ([3d7ffda70](https://github.com/graphty-org/graphty-monorepo/commit/3d7ffda70))
- **graphty-element:** declare neo4j-driver as an optional peer ([ea9d70521](https://github.com/graphty-org/graphty-monorepo/commit/ea9d70521))
- **graphty,graphty-element:** the selected card draws and clicks over nodes nearer the camera ([2b08868f4](https://github.com/graphty-org/graphty-monorepo/commit/2b08868f4))
- **graphty-element:** a screenshot keeps the size asked for and its see-through background ([c90d95ccf](https://github.com/graphty-org/graphty-monorepo/commit/c90d95ccf))
- **graphty-element:** a camera key press ends the rest of the opposite key's step ([eeb6e0323](https://github.com/graphty-org/graphty-monorepo/commit/eeb6e0323))
- **graphty-element:** sharp canvas, hover that ends, outline over its edges, labels on top ([ee6ce0ed6](https://github.com/graphty-org/graphty-monorepo/commit/ee6ce0ed6))
- **graphty-element:** redraw after a lost GL context, keep hover tooltips, step arrow taps ([ed5005212](https://github.com/graphty-org/graphty-monorepo/commit/ed5005212))
- **graphty-element:** size Graphviz nodes as drawn, bundle Graphviz in Storybook ([16afaed47](https://github.com/graphty-org/graphty-monorepo/commit/16afaed47))
- **graphty-element:** clear the SonarQube findings in the Graphviz layouts ([3804fa4d2](https://github.com/graphty-org/graphty-monorepo/commit/3804fa4d2))
- **graphty-element:** network source stories readable in the capture ([85b3b9204](https://github.com/graphty-org/graphty-monorepo/commit/85b3b9204))
- **graphty-element:** draw outlines by depth and no focus ring for pointer focus ([e8546ecf5](https://github.com/graphty-org/graphty-monorepo/commit/e8546ecf5))
- **graphty-element:** ring a selected node with its halo instead of tinting it ([538c2a0ed](https://github.com/graphty-org/graphty-monorepo/commit/538c2a0ed))
- **graphty-element:** expand nodes a source load brought, and rerun saved loads cleanly ([6625c6d52](https://github.com/graphty-org/graphty-monorepo/commit/6625c6d52))
- **graphty-element:** an expansion looks up its stored credential through the data surface ([388cb4487](https://github.com/graphty-org/graphty-monorepo/commit/388cb4487))
- **graphty-element:** a removed element's pending update no longer rejects ([97797a8ca](https://github.com/graphty-org/graphty-monorepo/commit/97797a8ca))
- **graphty-element:** lifecycle fixture lays out its nodes; a commit asks about large parts at once ([fceafc525](https://github.com/graphty-org/graphty-monorepo/commit/fceafc525))
- **graphty-element:** restore and remove refuse with E_UNSUPPORTED when autosave is off ([62e44664b](https://github.com/graphty-org/graphty-monorepo/commit/62e44664b))
- **graphty-element:** keep the reader's changes made during a page load that fails ([af489488c](https://github.com/graphty-org/graphty-monorepo/commit/af489488c))
- **graphty-element:** list the NODE_SIZE_LABEL file style reason ([#2660](https://github.com/graphty-org/graphty-monorepo/issues/2660))
- **graphty-element:** build the element without WebGL, so autosaved work still restores ([5969c8e80](https://github.com/graphty-org/graphty-monorepo/commit/5969c8e80))
- **graphty-element:** list the END_NODES_COLOR and FILL_BORDER file style reasons ([#2494](https://github.com/graphty-org/graphty-monorepo/issues/2494))
- **graph-io:** round Cytoscape's integer properties and paint Graphviz's default background white ([#2497](https://github.com/graphty-org/graphty-monorepo/issues/2497))
- **graphty-element:** a stuck IndexedDB write no longer holds autosave on WebKit ([cf858afe6](https://github.com/graphty-org/graphty-monorepo/commit/cf858afe6))
- **graphty-element:** autosave keeps edits made while a page load settles ([cd57abc99](https://github.com/graphty-org/graphty-monorepo/commit/cd57abc99))
- **graphty-element:** autosave survives long frames and browser-aborted transactions ([2b1d1473d](https://github.com/graphty-org/graphty-monorepo/commit/2b1d1473d))
- **graphty-element:** keep a center label over its node by moving it along the view axis ([#2323](https://github.com/graphty-org/graphty-monorepo/issues/2323))
- **graphty-element:** draw a node's center label in front of the node and its outline ([#2323](https://github.com/graphty-org/graphty-monorepo/issues/2323))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.61
- Updated @graphty/remote-logger to 2.0.23
- Updated graph-samples to 0.1.39
- Updated graph-format to 1.4.7
- Updated algorithms to 3.4.14
- Updated graph-io to 0.3.48
- Updated layout to 2.5.10

### ❤️ Thank You

- Adam Powers @apowers313

## 3.29.3 (2026-10-20)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.60
- Updated @graphty/remote-logger to 2.0.22
- Updated graph-samples to 0.1.38
- Updated graph-format to 1.4.6
- Updated algorithms to 3.4.13
- Updated graph-io to 0.3.47
- Updated layout to 2.5.9

## 3.29.2 (2026-10-19)

### 🩹 Fixes

- **graphty-element:** keep every batch of an assistant message in its one undo step ([6c4905822](https://github.com/graphty-org/graphty-monorepo/commit/6c4905822))
- **graphty-element:** start the load-time algorithms when a non-add write trails the adds ([494c465c5](https://github.com/graphty-org/graphty-monorepo/commit/494c465c5))
- **graphty-element:** move a selected node's halo with it while it is dragged ([37380db7e](https://github.com/graphty-org/graphty-monorepo/commit/37380db7e))

### 🧱 Updated Dependencies

- Updated graph-io to 0.3.46

### ❤️ Thank You

- Adam Powers @apowers313

## 3.29.1 (2026-10-18)

### 🩹 Fixes

- **graphty-element:** draw styles from the first frame instead of after the layout settles ([eb56d74ba](https://github.com/graphty-org/graphty-monorepo/commit/eb56d74ba))

### 🧱 Updated Dependencies

- Updated graph-io to 0.3.45

### ❤️ Thank You

- Adam Powers @apowers313

## 3.29.0 (2026-10-18)

### 🚀 Features

- **graphty-element:** join a bent edge's pieces at their corners ([6ec20106b](https://github.com/graphty-org/graphty-monorepo/commit/6ec20106b))
- **graphty-element:** draw overlapping file nodes in the file's own order ([6200b61ba](https://github.com/graphty-org/graphty-monorepo/commit/6200b61ba))
- **graphty-element:** draw a file's annotations when it is loaded with its styles ([0a2309c23](https://github.com/graphty-org/graphty-monorepo/commit/0a2309c23))
- **graphty-element:** draw edges through bends with the edge.bends channel ([8ebc4190d](https://github.com/graphty-org/graphty-monorepo/commit/8ebc4190d))
- **graphty-element:** lay a group with no stored position out by its members ([9ae4c2ed8](https://github.com/graphty-org/graphty-monorepo/commit/9ae4c2ed8))
- **graph-io:** writtenPositions gives neutral coordinates as each built-in writer spells them ([35f60df6f](https://github.com/graphty-org/graphty-monorepo/commit/35f60df6f))
- **graphty-element:** draw file group nodes behind their members with node.zIndex ([b1332a531](https://github.com/graphty-org/graphty-monorepo/commit/b1332a531))
- **graphty-element:** one file-positions path for every reader, and layout on the load calls ([#2490](https://github.com/graphty-org/graphty-monorepo/issues/2490), [#2325](https://github.com/graphty-org/graphty-monorepo/issues/2325))
- **graphty-element:** draw a center label in front of its node, and size labels in node units ([#2323](https://github.com/graphty-org/graphty-monorepo/issues/2323))
- **graphty-element:** flat node shapes, node borders, node width and height, one extent per shape ([2a9060854](https://github.com/graphty-org/graphty-monorepo/commit/2a9060854))
- **graphty-element:** name the channel of an export loss about a graphty-only look ([99e28cf27](https://github.com/graphty-org/graphty-monorepo/commit/99e28cf27))
- **graphty-element:** export CX and Cytoscape sessions, with their styles ([4cd5540be](https://github.com/graphty-org/graphty-monorepo/commit/4cd5540be))
- **graph-io:** draw a Gephi edge with no thickness as thick as its weight ([cff1c0b23](https://github.com/graphty-org/graphty-monorepo/commit/cff1c0b23))
- **graphty-element:** list every file-style reason at runtime from ./session ([572994adf](https://github.com/graphty-org/graphty-monorepo/commit/572994adf))
- **graphty-element:** leave GEXF and yEd style keys off records when drawing file styles ([e2f4fde12](https://github.com/graphty-org/graphty-monorepo/commit/e2f4fde12))
- **graphty-element:** write the style layers into exported files with styles: true ([b73343bbd](https://github.com/graphty-org/graphty-monorepo/commit/b73343bbd))
- **graphty-element:** draw a file's own styles as layers when a load asks for them ([d419d1fea](https://github.com/graphty-org/graphty-monorepo/commit/d419d1fea))
- **graphty-element:** file-style store, style and degree paths, template position, layer facts ([196c0c3c1](https://github.com/graphty-org/graphty-monorepo/commit/196c0c3c1))
- **graphty-element:** bindable label fields, label styles merged in explain() ([a5037638a](https://github.com/graphty-org/graphty-monorepo/commit/a5037638a))
- **graphty-element:** unmapped skip, stops bindings and counted style adjustments ([7ad098c92](https://github.com/graphty-org/graphty-monorepo/commit/7ad098c92))

### 🩹 Fixes

- **graphty-element:** build a joined line's material without marking the scene dirty ([7bc8f9b45](https://github.com/graphty-org/graphty-monorepo/commit/7bc8f9b45))
- **graphty-element:** let the AI node tools pick nodes by their edges ([95fef1e43](https://github.com/graphty-org/graphty-monorepo/commit/95fef1e43))
- **graphty-element:** keep each shape's own size by default, and remove the duplicate planar story ([#2495](https://github.com/graphty-org/graphty-monorepo/issues/2495))
- **graphty-element:** clip a sharp corner's miter instead of switching to a bevel ([593515ee4](https://github.com/graphty-org/graphty-monorepo/commit/593515ee4))
- **graphty-element:** draw a group that follows its members as a faint region behind them ([60709cd42](https://github.com/graphty-org/graphty-monorepo/commit/60709cd42))
- **graphty-element:** draw flat node shapes as thin plaques in 3D views ([f88020aba](https://github.com/graphty-org/graphty-monorepo/commit/f88020aba))
- **graphty-element:** cap a file's rounded corners so large groups keep small ones ([c6aefbdbc](https://github.com/graphty-org/graphty-monorepo/commit/c6aefbdbc))
- **graphty-element:** draw DOT input positions in the unit of the file's style lengths ([271fe09f6](https://github.com/graphty-org/graphty-monorepo/commit/271fe09f6))
- **graphty-element:** draw a file's rounded rectangles and parallelograms as those shapes ([f198072c5](https://github.com/graphty-org/graphty-monorepo/commit/f198072c5))
- **graphty-element:** name a lost label style when the file keeps no style block ([b44aa9b4f](https://github.com/graphty-org/graphty-monorepo/commit/b44aa9b4f))
- close the CodeQL alerts in the file-styles code ([27bc92c08](https://github.com/graphty-org/graphty-monorepo/commit/27bc92c08))
- **graphty-element:** draw the file stories the way up and at the proportions of their files ([2d08ef196](https://github.com/graphty-org/graphty-monorepo/commit/2d08ef196))
- **graphty-element:** announce label counts on the first still frame, not ten frames later ([92375a6bd](https://github.com/graphty-org/graphty-monorepo/commit/92375a6bd))
- **graphty-element:** draw sub-pixel edges as a continuous faint line ([25bf45b5e](https://github.com/graphty-org/graphty-monorepo/commit/25bf45b5e))
- **graphty-element:** draw a file's lengths and stored drawing in one unit ([#2322](https://github.com/graphty-org/graphty-monorepo/issues/2322))
- **graphty-element:** draw a file's node border as a border ring ([#2252](https://github.com/graphty-org/graphty-monorepo/issues/2252))
- **graph-io:** mark an edge curved only when its tool draws it curved ([#2489](https://github.com/graphty-org/graphty-monorepo/issues/2489))
- reconcile the merged file-styles, file-positions and master branches ([852fd978c](https://github.com/graphty-org/graphty-monorepo/commit/852fd978c))
- **graphty-element:** read JSON node positions through the shared file-positions path ([578a6f627](https://github.com/graphty-org/graphty-monorepo/commit/578a6f627))
- **graphty-element:** save GML and Pajek positions in the file's own spelling ([#2490](https://github.com/graphty-org/graphty-monorepo/issues/2490))
- **graphty-element:** stop drawing another program's node border as a screen-space outline ([#2252](https://github.com/graphty-org/graphty-monorepo/issues/2252))
- **graphty-element:** take every label size the label style schema takes ([a1dea8741](https://github.com/graphty-org/graphty-monorepo/commit/a1dea8741))
- **graphty-element:** keep DataSource.fileStyles internal and take any JSON dialect graph-io names ([c75c1d12b](https://github.com/graphty-org/graphty-monorepo/commit/c75c1d12b))
- **graphty-element:** keep a file layer's facts out of the consumer's userData ([2d7935a56](https://github.com/graphty-org/graphty-monorepo/commit/2d7935a56))
- **graphty-element:** give every format id a file-style namespace the store accepts ([1c5d51779](https://github.com/graphty-org/graphty-monorepo/commit/1c5d51779))
- **graphty-element:** rebuild no layer over a column any rule reads from graph-io's copy ([cbd0c3e02](https://github.com/graphty-org/graphty-monorepo/commit/cbd0c3e02))
- **graphty-element:** load a source chunk of any size without overflowing the stack ([e9f385c58](https://github.com/graphty-org/graphty-monorepo/commit/e9f385c58))
- **graphty-element:** load a GEXF slice that has only one time bound ([eaa00716a](https://github.com/graphty-org/graphty-monorepo/commit/eaa00716a))
- **graphty-element:** draw a file's rule, not its stale layer, where graph-io carried an input ([72a02a33e](https://github.com/graphty-org/graphty-monorepo/commit/72a02a33e))
- **graphty-element:** bring back a layer that selects by id as it was written ([4a27ae971](https://github.com/graphty-org/graphty-monorepo/commit/4a27ae971))
- **graphty-element:** keep the order of node and edge layers through a file ([4845af4c7](https://github.com/graphty-org/graphty-monorepo/commit/4845af4c7))
- **graphty-element:** report no style loss for what only the element's base layers draw ([e0927dd89](https://github.com/graphty-org/graphty-monorepo/commit/e0927dd89))
- **graphty-element:** load the links of node-link and d3 JSON, and JGF of one graph ([0432c6032](https://github.com/graphty-org/graphty-monorepo/commit/0432c6032))
- **graphty-element:** draw a file's styles on nodes an edge created ([e339bc90d](https://github.com/graphty-org/graphty-monorepo/commit/e339bc90d))
- **graphty-element:** count each element once in a file-style load note ([17d2d874b](https://github.com/graphty-org/graphty-monorepo/commit/17d2d874b))
- **graphty-element:** file styles read back exactly through every writer, checked over the corpus ([799d56644](https://github.com/graphty-org/graphty-monorepo/commit/799d56644))
- **graphty-element:** load the same nodes and edges graph-io loads, under the same record keys ([888df8e91](https://github.com/graphty-org/graphty-monorepo/commit/888df8e91))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.59
- Updated @graphty/remote-logger to 2.0.21
- Updated graph-samples to 0.1.37
- Updated graph-format to 1.4.5
- Updated algorithms to 3.4.12
- Updated graph-io to 0.3.44
- Updated layout to 2.5.8

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.7 (2026-10-18)

### 🩹 Fixes

- **graphty-element:** keep the owed 3D framing when only the camera's rotation is placed ([#3153](https://github.com/graphty-org/graphty-monorepo/issues/3153))
- **graphty-element:** pick the scene once per pointer event, not once per node ([#2941](https://github.com/graphty-org/graphty-monorepo/issues/2941))
- **graphty-element:** stop one node or edge repaint from walking the whole scene ([#2938](https://github.com/graphty-org/graphty-monorepo/issues/2938), [#2894](https://github.com/graphty-org/graphty-monorepo/issues/2894))
- **graphty-element:** skip the repaint when only graph values change ([#2734](https://github.com/graphty-org/graphty-monorepo/issues/2734))
- **graphty-element:** build the Box selection story with its own render ([#2643](https://github.com/graphty-org/graphty-monorepo/issues/2643))
- **graphty-element:** trim an edge by the node's bounding box when its ray misses ([#2643](https://github.com/graphty-org/graphty-monorepo/issues/2643))
- **graphty-element:** draw the selection highlight in the node's own shape ([#2643](https://github.com/graphty-org/graphty-monorepo/issues/2643))
- **graphty-element:** release the engine of a graph shut down before init() finishes ([#1970](https://github.com/graphty-org/graphty-monorepo/issues/1970))
- **graphty-element:** read a zod 4 type list as a union in optionsFromZod ([#1940](https://github.com/graphty-org/graphty-monorepo/issues/1940))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.6 (2026-10-17)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.58
- Updated @graphty/remote-logger to 2.0.20
- Updated graph-samples to 0.1.36
- Updated graph-format to 1.4.4
- Updated algorithms to 3.4.11
- Updated graph-io to 0.3.43
- Updated layout to 2.5.7

## 3.28.5 (2026-10-17)

### 🩹 Fixes

- **graphty-element:** draw labels with the arrow caps, after node outlines ([2cfe015e4](https://github.com/graphty-org/graphty-monorepo/commit/2cfe015e4))
- **graphty-element:** draw arrowheads over node outlines ([138551424](https://github.com/graphty-org/graphty-monorepo/commit/138551424))
- **graphty-element:** draw a 2D curve at the straight edge's line width ([ba38a2eb7](https://github.com/graphty-org/graphty-monorepo/commit/ba38a2eb7))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.57
- Updated graph-samples to 0.1.35
- Updated graph-format to 1.4.3
- Updated algorithms to 3.4.10
- Updated graph-io to 0.3.42
- Updated layout to 2.5.6

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.4 (2026-10-16)

### 🩹 Fixes

- **graphty-element:** paint algorithm results as ordinary layers, not highlights ([c2757912e](https://github.com/graphty-org/graphty-monorepo/commit/c2757912e))
- **graphty-element:** draw no halo on a node the selection cap refused ([#2978](https://github.com/graphty-org/graphty-monorepo/issues/2978))
- **graphty-element:** input recording keeps the pointer button for playback ([#3002](https://github.com/graphty-org/graphty-monorepo/issues/3002))
- **graphty-element:** stop the canvas taking focus on load ([#2424](https://github.com/graphty-org/graphty-monorepo/issues/2424))

### 🔥 Performance

- **graphty-element:** switch between 2D and 3D in time linear in the graph ([#2895](https://github.com/graphty-org/graphty-monorepo/issues/2895), [#1643](https://github.com/graphty-org/graphty-monorepo/issues/1643))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.3 (2026-10-16)

### 🩹 Fixes

- **graphty-element:** run per-element frame work from one observer per scene ([#2995](https://github.com/graphty-org/graphty-monorepo/issues/2995))
- **graphty-element:** layout guide options match the layouts, and unknown options warn ([c00751a71](https://github.com/graphty-org/graphty-monorepo/commit/c00751a71))
- **graphty-element:** fixed layout reads the documented node position shape ([676312e59](https://github.com/graphty-org/graphty-monorepo/commit/676312e59))
- **graphty-element:** send input event fields as plain values ([#2976](https://github.com/graphty-org/graphty-monorepo/issues/2976))
- **graphty-element:** apply the view masks to nodes and edges added after a load or clear ([#2953](https://github.com/graphty-org/graphty-monorepo/issues/2953))
- **graphty-element:** publish label counts to a waiter once labels settle ([#2983](https://github.com/graphty-org/graphty-monorepo/issues/2983))
- **graphty-element:** handle a two-axis wheel turn once ([#2937](https://github.com/graphty-org/graphty-monorepo/issues/2937))
- **graphty-element:** draw a selection change without walking every node ([#2899](https://github.com/graphty-org/graphty-monorepo/issues/2899))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.2 (2026-10-15)

### 🩹 Fixes

- **graphty-element:** release removed labels together in bulk teardown ([#2804](https://github.com/graphty-org/graphty-monorepo/issues/2804))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.56
- Updated @graphty/remote-logger to 2.0.19
- Updated graph-samples to 0.1.34
- Updated graph-format to 1.4.2
- Updated algorithms to 3.4.9
- Updated graph-io to 0.3.41
- Updated layout to 2.5.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.1 (2026-10-15)

### 🩹 Fixes

- **graphty-element:** charge the derivation lane's catch-up to the pass that wrote the keys ([#2844](https://github.com/graphty-org/graphty-monorepo/issues/2844))
- **graphty-element:** keep the selection when a freeze compacts rows ([#2792](https://github.com/graphty-org/graphty-monorepo/issues/2792))

### 🔥 Performance

- **graphty-element:** remove a node with an edge selected without walking every edge ([#2788](https://github.com/graphty-org/graphty-monorepo/issues/2788))
- **graphty-element:** draw and remove a label on every element in linear time ([#2762](https://github.com/graphty-org/graphty-monorepo/issues/2762))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.28.0 (2026-10-15)

### 🚀 Features

- **graphty-element:** report the screen rectangle a node covers in nodeScreenPosition ([#2668](https://github.com/graphty-org/graphty-monorepo/issues/2668))

### 🩹 Fixes

- **graphty-element:** keep an edge's ray aimed from source to destination when it is built ([#2668](https://github.com/graphty-org/graphty-monorepo/issues/2668))
- **graphty-element:** keep round nodes on the sphere path of nodeGap without reading extents ([#2668](https://github.com/graphty-org/graphty-monorepo/issues/2668))
- **graphty-element:** measure non-round nodes by their box in edge trim, nodeGap, labels, loops ([#2668](https://github.com/graphty-org/graphty-monorepo/issues/2668))

### 🔥 Performance

- **graphty-element:** add or remove one node or edge in time linear in the run ([#2733](https://github.com/graphty-org/graphty-monorepo/issues/2733))
- **graphty-element:** restyle every node's shape in linear time ([#2749](https://github.com/graphty-org/graphty-monorepo/issues/2749))
- **graphty-element:** remove part of a graph in linear time ([#543](https://github.com/graphty-org/graphty-monorepo/issues/543), [#2732](https://github.com/graphty-org/graphty-monorepo/issues/2732))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.27.0 (2026-10-15)

### 🚀 Features

- **graphty-element:** add node.sizeMode so every shape can be drawn at one extent ([#2495](https://github.com/graphty-org/graphty-monorepo/issues/2495))
- **graphty-element:** an option to make the selected nodes the camera pivot ([#2293](https://github.com/graphty-org/graphty-monorepo/issues/2293), [#2294](https://github.com/graphty-org/graphty-monorepo/issues/2294))

### 🩹 Fixes

- **graphty-element:** the picture is not final while the camera glides to the selection ([#2293](https://github.com/graphty-org/graphty-monorepo/issues/2293))
- **graphty-element:** turn the 3D camera by a steady angle while an arrow key is held ([#2292](https://github.com/graphty-org/graphty-monorepo/issues/2292))
- **graphty-element:** planar story captions keep a fixed height ([dd0cf8c9e](https://github.com/graphty-org/graphty-monorepo/commit/dd0cf8c9e))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.55
- Updated graph-samples to 0.1.33
- Updated algorithms to 3.4.8
- Updated layout to 2.5.4

### ❤️ Thank You

- Adam Powers @apowers313

## 3.26.0 (2026-10-14)

### 🚀 Features

- **graphty-element:** count what each render loop tick did ([#2535](https://github.com/graphty-org/graphty-monorepo/issues/2535))

### 🩹 Fixes

- **graphty-element:** start a load's label animations once, after its labels are built ([#2577](https://github.com/graphty-org/graphty-monorepo/issues/2577))
- **graphty-element:** classify RenderManager.ticks as a read in the door list ([#2535](https://github.com/graphty-org/graphty-monorepo/issues/2535))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.54
- Updated @graphty/remote-logger to 2.0.18
- Updated graph-samples to 0.1.32
- Updated graph-format to 1.4.1
- Updated algorithms to 3.4.7
- Updated graph-io to 0.3.40
- Updated layout to 2.5.3

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.8 (2026-10-14)

### 🩹 Fixes

- **graphty-element:** keep the node positions GML, DOT and Pajek files store ([#2490](https://github.com/graphty-org/graphty-monorepo/issues/2490))
- **graphty-element:** use engine-independent math in seeded layouts and A* ([#2440](https://github.com/graphty-org/graphty-monorepo/issues/2440))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.53
- Updated graph-samples to 0.1.31
- Updated graph-format to 1.4.0
- Updated algorithms to 3.4.6
- Updated graph-io to 0.3.39
- Updated layout to 2.5.2

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.7 (2026-10-14)

### 🩹 Fixes

- **graphty-element:** time the repaint's slices on the session's clock ([#2411](https://github.com/graphty-org/graphty-monorepo/issues/2411))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.6 (2026-10-13)

### 🩹 Fixes

- **graphty-element:** read data.-prefixed fields in describeProperty and sampleData ([#2384](https://github.com/graphty-org/graphty-monorepo/issues/2384))
- **graphty-element:** zoom and turn the 2D view by the per-frame amount while a key is held ([#2292](https://github.com/graphty-org/graphty-monorepo/issues/2292))
- **graphty-element:** turn the 3D camera at the A and D rate while an arrow key is held ([#2292](https://github.com/graphty-org/graphty-monorepo/issues/2292))
- **graphty-element:** report layout and algorithm refusals by their own codes ([#2335](https://github.com/graphty-org/graphty-monorepo/issues/2335))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.52
- Updated layout to 2.5.1

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.5 (2026-10-13)

### 🩹 Fixes

- **graphty-element:** implement setRenderSettings and getAvailableAlgorithms ([#2342](https://github.com/graphty-org/graphty-monorepo/issues/2342))
- **graphty-element:** report a layout's refusal by its code and place nothing ([#2275](https://github.com/graphty-org/graphty-monorepo/issues/2275))
- **graphty-element:** zoom the 3D camera by a fraction of its distance on W, S and pinch ([#2291](https://github.com/graphty-org/graphty-monorepo/issues/2291))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.51
- Updated layout to 2.5.0

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.4 (2026-10-13)

### 🩹 Fixes

- **graphty-element:** free each test file's page under v8 coverage in browser tests ([#2247](https://github.com/graphty-org/graphty-monorepo/issues/2247))
- **graphty-element:** build sphere and box nodes in their own graph's scene ([#2257](https://github.com/graphty-org/graphty-monorepo/issues/2257))
- **graphty-element:** declare d3-force-3d once with callable forces, dropping the any casts ([#2255](https://github.com/graphty-org/graphty-monorepo/issues/2255))
- **graphty-element:** cap the segments one curved edge is drawn with ([#2249](https://github.com/graphty-org/graphty-monorepo/issues/2249))
- **graphty-element:** draw node.flat as flat shading ([#2069](https://github.com/graphty-org/graphty-monorepo/issues/2069))
- **graphty-element:** draw the arf layout at the size the other layouts draw at ([e3ba3dd94](https://github.com/graphty-org/graphty-monorepo/commit/e3ba3dd94))
- **graphty-element:** draw the ARF layout at the same size as every other layout ([5c69e1747](https://github.com/graphty-org/graphty-monorepo/commit/5c69e1747))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.50
- Updated @graphty/remote-logger to 2.0.17
- Updated graph-samples to 0.1.30
- Updated graph-format to 1.3.15
- Updated algorithms to 3.4.5
- Updated graph-io to 0.3.38
- Updated layout to 2.4.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.3 (2026-10-13)

### 🩹 Fixes

- **graphty-element:** pace a CPU simulation layout by time, like every other layout ([#2204](https://github.com/graphty-org/graphty-monorepo/issues/2204))
- **tools:** cap each test slot's Node workers at its share of the cores ([9daf98f16](https://github.com/graphty-org/graphty-monorepo/commit/9daf98f16))
- **graphty-element:** draw capsule and torus nodes at node.size ([#2070](https://github.com/graphty-org/graphty-monorepo/issues/2070))
- **graphty-element:** use American spelling in the catalog's published plain names and descriptions ([#2105](https://github.com/graphty-org/graphty-monorepo/issues/2105))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.49
- Updated @graphty/remote-logger to 2.0.16
- Updated graph-samples to 0.1.29
- Updated graph-format to 1.3.14
- Updated algorithms to 3.4.4
- Updated graph-io to 0.3.37
- Updated layout to 2.4.4

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.2 (2026-10-12)

### 🩹 Fixes

- **graphty-element:** let 0 draw nothing for glow strength, edge width and arrow size ([#2067](https://github.com/graphty-org/graphty-monorepo/issues/2067))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.48
- Updated layout to 2.4.3

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.1 (2026-10-12)

### 🩹 Fixes

- **graphty-element:** one rule for an alpha inside a colour on every style channel ([#2071](https://github.com/graphty-org/graphty-monorepo/issues/2071))
- **graphty-element:** resolve either spelling of an integer id in style ids selectors ([#2061](https://github.com/graphty-org/graphty-monorepo/issues/2061))
- **graphty-element:** a glow strength alone no longer switches glow on ([#2068](https://github.com/graphty-org/graphty-monorepo/issues/2068))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.47
- Updated layout to 2.4.2

### ❤️ Thank You

- Adam Powers @apowers313

## 3.25.0 (2026-10-12)

### 🚀 Features

- **graphty-element:** keep nodes and labels off each other, opt-in ([#1727](https://github.com/graphty-org/graphty-monorepo/issues/1727))

### 🩹 Fixes

- **graphty-element:** charge large-graph estimates for loaded memory ([#2032](https://github.com/graphty-org/graphty-monorepo/issues/2032))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.46
- Updated @graphty/remote-logger to 2.0.15
- Updated graph-samples to 0.1.28
- Updated graph-format to 1.3.13
- Updated algorithms to 3.4.3
- Updated graph-io to 0.3.36
- Updated layout to 2.4.1

### ❤️ Thank You

- Adam Powers @apowers313

## 3.24.2 (2026-10-11)

### 🩹 Fixes

- **graphty-element:** open no engine for an element that is never used ([#1977](https://github.com/graphty-org/graphty-monorepo/issues/1977))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.24.1 (2026-10-11)

### 🚀 Features

- **tools:** fail a CI test that uses more than 25% of its time limit ([#1602](https://github.com/graphty-org/graphty-monorepo/issues/1602))

### 🩹 Fixes

- **graphty-element:** say how many frames were drawn when waitForStableFrame times out ([#1947](https://github.com/graphty-org/graphty-monorepo/issues/1947))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.45
- Updated @graphty/remote-logger to 2.0.14
- Updated graph-samples to 0.1.27
- Updated graph-format to 1.3.12
- Updated algorithms to 3.4.2
- Updated graph-io to 0.3.35
- Updated layout to 2.4.0

### ❤️ Thank You

- Adam Powers @apowers313

## 3.24.0 (2026-10-11)

### 🚀 Features

- **graphty-element:** draw frames only when the picture changes, opt-in renderOnDemand ([#1824](https://github.com/graphty-org/graphty-monorepo/issues/1824))

### 🩹 Fixes

- **graphty-element:** charge only the new and top history steps on a write ([#1891](https://github.com/graphty-org/graphty-monorepo/issues/1891))
- **graphty-element:** drawing on demand keeps drawing while a shader is still on its way ([808e352eb](https://github.com/graphty-org/graphty-monorepo/commit/808e352eb))
- **graphty-element:** drawing on demand reads the scene's lists instead of observing them ([40ce07989](https://github.com/graphty-org/graphty-monorepo/commit/40ce07989))
- **graphty-element:** a throwing pass-ended listener never holds the derivation lane ([#1824](https://github.com/graphty-org/graphty-monorepo/issues/1824))
- **graphty-element:** wake the on-demand loop after state changes, recordings and new meshes ([#1824](https://github.com/graphty-org/graphty-monorepo/issues/1824))

### 🔥 Performance

- **graphty-element:** copy only what a derivation pass changed ([#1906](https://github.com/graphty-org/graphty-monorepo/issues/1906))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.44
- Updated algorithms to 3.4.1
- Updated graph-io to 0.3.34
- Updated layout to 2.3.1

### ❤️ Thank You

- Adam Powers @apowers313

## 3.23.0 (2026-10-10)

### 🚀 Features

- **graphty-element:** lint rule reporting node mesh position writes outside the funnel ([#1605](https://github.com/graphty-org/graphty-monorepo/issues/1605))
- **graphty-element:** let a screenshot set how long it waits for the layout ([340165b7c](https://github.com/graphty-org/graphty-monorepo/commit/340165b7c))

### 🩹 Fixes

- **graphty-element:** tell note:changed from the notes a write names, not every note ([#1890](https://github.com/graphty-org/graphty-monorepo/issues/1890), [#1643](https://github.com/graphty-org/graphty-monorepo/issues/1643))

### 🔥 Performance

- **graphty-element:** look up path edge members by key, not by scanning the path ([ebe854d0d](https://github.com/graphty-org/graphty-monorepo/commit/ebe854d0d))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.22.0 (2026-10-10)

### 🚀 Features

- **graphty-element:** give every AI command result a code and params ([#1792](https://github.com/graphty-org/graphty-monorepo/issues/1792))
- **graphty-element:** publish the AI provider catalog from ./catalog ([#1722](https://github.com/graphty-org/graphty-monorepo/issues/1722))
- **graphty-element:** publish maxIter on the spring-electrical layout ([#1766](https://github.com/graphty-org/graphty-monorepo/issues/1766))
- **algorithms:** list each undirected link-prediction pair once on request ([#723](https://github.com/graphty-org/graphty-monorepo/issues/723))

### 🩹 Fixes

- **graphty-element:** make ExecutionResult code and params optional ([#1792](https://github.com/graphty-org/graphty-monorepo/issues/1792))
- **graphty-element:** time a click by its events, not by when the page handles them ([#1771](https://github.com/graphty-org/graphty-monorepo/issues/1771))
- **graphty-element:** name the caught import error as the lint rules expect ([#1724](https://github.com/graphty-org/graphty-monorepo/issues/1724))
- **graphty-element:** keep @mlc-ai/web-llm out of the single-file bundle ([#1724](https://github.com/graphty-org/graphty-monorepo/issues/1724))
- **graphty-element:** keep a layout's coded E_TOO_LARGE and a sibling error's params ([b00fb3a20](https://github.com/graphty-org/graphty-monorepo/commit/b00fb3a20))
- **graphty-element:** release a disposed graph's WebGL context once the GPU is idle ([#1738](https://github.com/graphty-org/graphty-monorepo/issues/1738))
- **graphty-element:** build the WebLLM provider inside enableAiControl ([#1724](https://github.com/graphty-org/graphty-monorepo/issues/1724))
- **graphty-element:** log facts only on the AI path ([#1763](https://github.com/graphty-org/graphty-monorepo/issues/1763))
- **graphty-element:** release the WebGL context when a graph is disposed ([#1738](https://github.com/graphty-org/graphty-monorepo/issues/1738))
- **graphty-element:** take either spelling of an integer id in every node and edge lookup ([#1690](https://github.com/graphty-org/graphty-monorepo/issues/1690))
- **graphty-element:** keep request, response and key out of AI errors ([a9bcc383c](https://github.com/graphty-org/graphty-monorepo/commit/a9bcc383c))
- **graphty-element:** run each assistant tool batch in its own short transaction ([#1721](https://github.com/graphty-org/graphty-monorepo/issues/1721))
- **graphty-element:** recover from headset-ended XR sessions; honor the reference space ([#1731](https://github.com/graphty-org/graphty-monorepo/issues/1731), [#1732](https://github.com/graphty-org/graphty-monorepo/issues/1732))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.43
- Updated algorithms to 3.4.0
- Updated layout to 2.3.0

### ❤️ Thank You

- Adam Powers @apowers313

## 3.21.0 (2026-10-09)

### 🚀 Features

- **graphty-element:** derive the ai key store's encryption key from a passphrase ([#691](https://github.com/graphty-org/graphty-monorepo/issues/691))

### 🩹 Fixes

- **graphty-element:** never store a passphrase-derived ai key in clear text ([#691](https://github.com/graphty-org/graphty-monorepo/issues/691))
- **graphty-element:** send tools only to in-browser models that accept them ([#1681](https://github.com/graphty-org/graphty-monorepo/issues/1681))
- **graphty-element:** answer either id spelling from the visible and scope node sets ([#1594](https://github.com/graphty-org/graphty-monorepo/issues/1594))
- **graphty-element:** type-check event names where they are emitted and subscribed ([#1592](https://github.com/graphty-org/graphty-monorepo/issues/1592), [#1572](https://github.com/graphty-org/graphty-monorepo/issues/1572))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.42
- Updated @graphty/remote-logger to 2.0.13
- Updated graph-samples to 0.1.26
- Updated graph-format to 1.3.11
- Updated algorithms to 3.3.13
- Updated graph-io to 0.3.33
- Updated layout to 2.2.14

### ❤️ Thank You

- Adam Powers @apowers313

## 3.20.1 (2026-10-09)

### 🩹 Fixes

- **graphty-element:** code the layout recommendation and implementation reasons ([#1593](https://github.com/graphty-org/graphty-monorepo/issues/1593))
- **graphty-element:** keep the event fix additive ([#1577](https://github.com/graphty-org/graphty-monorepo/issues/1577), [#1441](https://github.com/graphty-org/graphty-monorepo/issues/1441))
- **graphty-element:** start the animation of a label built while the layout is at rest ([#1554](https://github.com/graphty-org/graphty-monorepo/issues/1554))
- **graphty-element:** keep a node removed and brought back unplaced under undo ([#583](https://github.com/graphty-org/graphty-monorepo/issues/583))
- **graphty-element:** ask the data manager for its rows without freezing a snapshot ([#1488](https://github.com/graphty-org/graphty-monorepo/issues/1488))
- **graphty-element:** declare the twelve emitted events no type covered ([#1441](https://github.com/graphty-org/graphty-monorepo/issues/1441))
- **graphty-element:** trim slug separators in linear time ([#1141](https://github.com/graphty-org/graphty-monorepo/issues/1141))
- **graphty-element:** keep the public lane generation counting every write ([#1488](https://github.com/graphty-org/graphty-monorepo/issues/1488))
- **graphty-element:** an engine writing back the coordinates a node holds moves nothing ([#1488](https://github.com/graphty-org/graphty-monorepo/issues/1488))
- **graphty-element:** keep a node an edge left behind in an arrangement capture ([#1488](https://github.com/graphty-org/graphty-monorepo/issues/1488))
- **graphty-element:** keep every node on the plane in 2D under undo, redo and every engine ([#1341](https://github.com/graphty-org/graphty-monorepo/issues/1341), [#1488](https://github.com/graphty-org/graphty-monorepo/issues/1488))

### 🔥 Performance

- **graphty-element:** find a column's median without sorting it ([#1517](https://github.com/graphty-org/graphty-monorepo/issues/1517))
- **graphty-element:** paint only the rows an add changes; undo a redone import without a rebuild ([#1253](https://github.com/graphty-org/graphty-monorepo/issues/1253))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.41
- Updated @graphty/remote-logger to 2.0.12
- Updated graph-samples to 0.1.25
- Updated graph-format to 1.3.10
- Updated algorithms to 3.3.12
- Updated graph-io to 0.3.32
- Updated layout to 2.2.13

### ❤️ Thank You

- Adam Powers @apowers313

## 3.20.0 (2026-10-08)

### 🚀 Features

- **graphty-element:** run the LLM regression tests on Google, and always answer ([801e21a9d](https://github.com/graphty-org/graphty-monorepo/commit/801e21a9d))

### 🩹 Fixes

- **graphty-element:** start label animations on the first frame at rest, not a 100 ms timer ([#1422](https://github.com/graphty-org/graphty-monorepo/issues/1422))
- **graphty-element:** default edge.width encodings to the edge width range ([#1506](https://github.com/graphty-org/graphty-monorepo/issues/1506))
- **graphty-element:** compact the edge-id index after removals ([#1411](https://github.com/graphty-org/graphty-monorepo/issues/1411))
- **graphty-element:** run the LLM regression suite on Anthropic and fix what it found ([69d346ebd](https://github.com/graphty-org/graphty-monorepo/commit/69d346ebd))

### 🔥 Performance

- **graphty-element:** remove nodes from the d3 and ngraph layouts touching only their edges ([#1425](https://github.com/graphty-org/graphty-monorepo/issues/1425))
- **graphty-element:** read a partial rank column through an optional chain ([#1042](https://github.com/graphty-org/graphty-monorepo/issues/1042))
- **graphty-element:** build a run's result without an id map or a sort ([#1517](https://github.com/graphty-org/graphty-monorepo/issues/1517), [#1042](https://github.com/graphty-org/graphty-monorepo/issues/1042))
- **graphty-element:** take a draft checkpoint without copying the draft ([#1316](https://github.com/graphty-org/graphty-monorepo/issues/1316))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.40
- Updated @graphty/remote-logger to 2.0.11
- Updated graph-samples to 0.1.24
- Updated graph-format to 1.3.9
- Updated algorithms to 3.3.11
- Updated graph-io to 0.3.31
- Updated layout to 2.2.12

### ❤️ Thank You

- Adam Powers @apowers313

## 3.19.0 (2026-10-08)

### 🚀 Features

- **graphty-element:** neutral facts beside the English in result APIs ([#866](https://github.com/graphty-org/graphty-monorepo/issues/866))

### 🩹 Fixes

- **graphty-element:** give each waiting freeze its own render id ([#1440](https://github.com/graphty-org/graphty-monorepo/issues/1440))
- **graphty-element:** keep a node unplaced when undo restores it unplaced under ngraph and d3 ([#582](https://github.com/graphty-org/graphty-monorepo/issues/582))
- **graphty-element:** let an edge measurement ask for edge width ([#708](https://github.com/graphty-org/graphty-monorepo/issues/708))
- **graph-io:** import positions as f64 so exact values round-trip ([#963](https://github.com/graphty-org/graphty-monorepo/issues/963))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.39
- Updated algorithms to 3.3.10
- Updated graph-io to 0.3.30
- Updated layout to 2.2.11

### ❤️ Thank You

- Adam Powers @apowers313

## 3.18.0 (2026-10-08)

### 🚀 Features

- **graphty-element:** type the forwarded unprefixed events through the element's own listeners ([#865](https://github.com/graphty-org/graphty-monorepo/issues/865))
- **graphty-element:** name every graphty-* event detail and compile each listener against dist ([#865](https://github.com/graphty-org/graphty-monorepo/issues/865))
- **graphty-element:** give style explain refusals and unbound layers a coded fact ([#1221](https://github.com/graphty-org/graphty-monorepo/issues/1221))
- **graphty-element:** styles.legendOf(id) reads one layer's legend blocks ([ba854e769](https://github.com/graphty-org/graphty-monorepo/commit/ba854e769))
- **graphty-element:** report export losses as coded facts ([#876](https://github.com/graphty-org/graphty-monorepo/issues/876))
- **graphty-element:** elementAt reports the node under a point ([#798](https://github.com/graphty-org/graphty-monorepo/issues/798))

### 🩹 Fixes

- **graphty-element:** classify the element's typed event listener overloads as listen doors ([#865](https://github.com/graphty-org/graphty-monorepo/issues/865))
- **graphty-element:** undo a freeze Babylon runs after a change withdrew it ([d336701ff](https://github.com/graphty-org/graphty-monorepo/commit/d336701ff))
- **graphty-element:** report the configured graph direction as soon as data.directed is set ([#969](https://github.com/graphty-org/graphty-monorepo/issues/969))
- **graphty-element:** record the camera resetCamera returns to when the final framing lands ([#416](https://github.com/graphty-org/graphty-monorepo/issues/416))
- **graphty-element:** bound what a strict-state dispatch checks ([#584](https://github.com/graphty-org/graphty-monorepo/issues/584))
- **graphty-element:** a run's fields name the run, not the $ placeholder ([#354](https://github.com/graphty-org/graphty-monorepo/pull/354))
- **graphty-element:** stop XR controllers downloading their models ([#465](https://github.com/graphty-org/graphty-monorepo/pull/465))
- **graphty-element:** key the large-graph story generator on the unordered pair ([#228](https://github.com/graphty-org/graphty-monorepo/pull/228))
- **graphty-element:** give retained nodes their new record on nodeData ([#355](https://github.com/graphty-org/graphty-monorepo/issues/355))

### 🔥 Performance

- **graphty-element:** tear a graph down in linear time ([#1373](https://github.com/graphty-org/graphty-monorepo/issues/1373))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.38
- Updated @graphty/remote-logger to 2.0.10
- Updated algorithms to 3.3.9
- Updated graph-io to 0.3.29
- Updated layout to 2.2.10

### ❤️ Thank You

- Adam Powers @apowers313

## 3.17.0 (2026-10-07)

### 🚀 Features

- **graphty-element:** give every history step a coded fact ([#869](https://github.com/graphty-org/graphty-monorepo/issues/869))
- **graphty-element:** name a legend field's run result by catalog ids ([90d90bb46](https://github.com/graphty-org/graphty-monorepo/commit/90d90bb46))
- **graphty-element:** neutral legend facts and per-layer style counts ([#867](https://github.com/graphty-org/graphty-monorepo/issues/867), [#790](https://github.com/graphty-org/graphty-monorepo/issues/790))
- **graphty-element:** add styles.agreement for several elements ([#810](https://github.com/graphty-org/graphty-monorepo/issues/810))
- **graphty-element:** element.labelOf(id) returns a node's label as drawn ([#799](https://github.com/graphty-org/graphty-monorepo/issues/799))
- **graphty-element:** report where a node is drawn on screen ([#797](https://github.com/graphty-org/graphty-monorepo/issues/797))
- **graphty-element:** add session.journal and journal:appended ([#1230](https://github.com/graphty-org/graphty-monorepo/issues/1230), [#145](https://github.com/graphty-org/graphty-monorepo/issues/145))

### 🩹 Fixes

- **graphty-element:** twelve layout engines honor scalingFactor ([#1323](https://github.com/graphty-org/graphty-monorepo/pull/1323))
- **graphty-element:** setNodes reads added nodes with the idPath it was given ([#1168](https://github.com/graphty-org/graphty-monorepo/pull/1168))
- **graphty-element:** put every node on the plane when switching to 2D under any layout ([#1341](https://github.com/graphty-org/graphty-monorepo/issues/1341))
- **graphty-element:** drop unnecessary type assertion and reformat for prettier 3.9.9 ([dd32105d6](https://github.com/graphty-org/graphty-monorepo/commit/dd32105d6))
- **graphty-element:** a mid grey for the overflow group ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050), [#686868](https://github.com/graphty-org/graphty-monorepo/issues/686868), [#230](https://github.com/graphty-org/graphty-monorepo/issues/230))
- **graphty-element:** waitForStableFrame waits for a declutter switch to take effect ([c57e93c07](https://github.com/graphty-org/graphty-monorepo/commit/c57e93c07))
- **graphty-element:** journal a transaction only when it records ([#145](https://github.com/graphty-org/graphty-monorepo/issues/145))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.37
- Updated @graphty/remote-logger to 2.0.9
- Updated graph-samples to 0.1.23
- Updated graph-format to 1.3.8
- Updated algorithms to 3.3.8
- Updated graph-io to 0.3.28
- Updated layout to 2.2.9

### ❤️ Thank You

- Adam Powers @apowers313

## 3.16.0 (2026-10-07)

### 🚀 Features

- **graphty-element:** report where a broken graph file broke ([#1218](https://github.com/graphty-org/graphty-monorepo/issues/1218))
- **graphty-element:** seed the default layout so one file draws the same way each time ([#801](https://github.com/graphty-org/graphty-monorepo/issues/801))
- **graphty-element:** give notes an optional done state ([#705](https://github.com/graphty-org/graphty-monorepo/issues/705))
- **graphty-element:** a range selection target and the top's threshold ([85a38487f](https://github.com/graphty-org/graphty-monorepo/commit/85a38487f))
- **graphty-element:** implement session.catalog.optionsFor ([#336](https://github.com/graphty-org/graphty-monorepo/issues/336))
- **graphty-element:** raise the render ceilings to 100,000 nodes and 1,000,000 edges ([342a6dec5](https://github.com/graphty-org/graphty-monorepo/commit/342a6dec5))
- **graphty-element:** raise the declared edge ceiling to 500,000 ([d05e706a6](https://github.com/graphty-org/graphty-monorepo/commit/d05e706a6))

### 🩹 Fixes

- **graphty-element:** write the arrow caption glyphs as escapes ([#113](https://github.com/graphty-org/graphty-monorepo/issues/113))
- **graphty-element:** one scope digest, the one production uses ([#75](https://github.com/graphty-org/graphty-monorepo/issues/75))
- **graphty-element:** declare the language of the example pages ([#714](https://github.com/graphty-org/graphty-monorepo/issues/714))
- **graphty-element:** accept a skybox image from any http(s) host ([412472831](https://github.com/graphty-org/graphty-monorepo/commit/412472831))
- **graphty-element:** load story datasets from the repo, not GitHub ([#516](https://github.com/graphty-org/graphty-monorepo/issues/516))
- **webgpu-graph-algorithms:** settle label propagation on ordered paths ([#694](https://github.com/graphty-org/graphty-monorepo/issues/694))
- **graphty-element:** draw each instance once in a frozen frame ([f4db26959](https://github.com/graphty-org/graphty-monorepo/commit/f4db26959))
- **graphty-element:** keep the ray and arrow-mesh members as deprecated shims ([a9057340a](https://github.com/graphty-org/graphty-monorepo/commit/a9057340a))
- **graphty-element:** waitForStableFrame waits for the label counts to be announced ([3663f1a2d](https://github.com/graphty-org/graphty-monorepo/commit/3663f1a2d))
- **graphty-element:** clear the SonarQube optional-chain and Set findings on the edge lines ([a456fac9b](https://github.com/graphty-org/graphty-monorepo/commit/a456fac9b))
- **graphty-element:** pre-bundle the per-function lodash imports in the browser tests ([8863d118a](https://github.com/graphty-org/graphty-monorepo/commit/8863d118a))
- **graphty-element:** draw nothing for a hidden 3D arrow cap instead of a full cap at the origin ([2793ded2c](https://github.com/graphty-org/graphty-monorepo/commit/2793ded2c))
- **graphty-element:** keep a shared edge batch in the scene when some of its edges are removed ([a34c9211b](https://github.com/graphty-org/graphty-monorepo/commit/a34c9211b))
- **graphty-element:** draw patterned lines at their opacity in 3D and along their line in 2D ([#619](https://github.com/graphty-org/graphty-monorepo/issues/619), [#620](https://github.com/graphty-org/graphty-monorepo/issues/620))
- **graphty-element:** let a run of removals share one freeze instead of one each ([c45f1a05a](https://github.com/graphty-org/graphty-monorepo/commit/c45f1a05a))
- **graphty-element:** place edges a filter reveals again, so an undone filter draws them ([165f337ba](https://github.com/graphty-org/graphty-monorepo/commit/165f337ba))
- **graphty-element:** reconcile instanced edges with master's index sentinel, door list and floors ([fe3ee9dec](https://github.com/graphty-org/graphty-monorepo/commit/fe3ee9dec))
- **graphty-element:** drop the line paths no edge takes, and centre a curve's reading ([440fd781c](https://github.com/graphty-org/graphty-monorepo/commit/440fd781c))
- **graphty-element:** read a batch off hasThinInstances in the story assertions ([a0eb29b86](https://github.com/graphty-org/graphty-monorepo/commit/a0eb29b86))
- **graphty-element:** dispose a line batch's material with it, and pin the scene's shape ([#444](https://github.com/graphty-org/graphty-monorepo/issues/444), [#441](https://github.com/graphty-org/graphty-monorepo/issues/441))
- **graphty-element:** decide whether a node is round from its geometry, not from its name ([ff3517862](https://github.com/graphty-org/graphty-monorepo/commit/ff3517862))
- **graphty-element:** unfreeze the scene when a mesh appears, not only when one moves ([14aeac609](https://github.com/graphty-org/graphty-monorepo/commit/14aeac609))
- **graphty-element:** let a line batch die with its last edge, and say where a batched edge is drawn ([6d191e089](https://github.com/graphty-org/graphty-monorepo/commit/6d191e089))
- **graphty-element:** draw 2D arrow caps in the plane the camera looks at ([f55dff88f](https://github.com/graphty-org/graphty-monorepo/commit/f55dff88f))
- **graphty-element:** measure a cap's span the way its drawn box did ([5ac260f94](https://github.com/graphty-org/graphty-monorepo/commit/5ac260f94))

### 🔥 Performance

- **graphty-element:** keep Math.sqrt on three per-frame edge paths ([16b4165ce](https://github.com/graphty-org/graphty-monorepo/commit/16b4165ce))
- **graphty-element:** draw every edge line style as thin instances, in 2D and 3D ([#444](https://github.com/graphty-org/graphty-monorepo/issues/444))
- **graphty-element:** work out where a line meets a round node instead of searching for it ([#412](https://github.com/graphty-org/graphty-monorepo/issues/412))
- **graphty-element:** stop re-deciding what to draw on a frame that changed nothing ([c74988d36](https://github.com/graphty-org/graphty-monorepo/commit/c74988d36))
- **graphty-element:** stop doing per-edge work on a frame where nothing moved ([#412](https://github.com/graphty-org/graphty-monorepo/issues/412))
- **graphty-element:** draw arrow caps as thin instances ([9b0c25743](https://github.com/graphty-org/graphty-monorepo/commit/9b0c25743))
- **graphty-element:** nest the graph-root parenting instead of branching past it ([3e46fda90](https://github.com/graphty-org/graphty-monorepo/commit/3e46fda90))
- **graphty-element:** draw 3D solid edge lines as thin instances ([cf8771571](https://github.com/graphty-org/graphty-monorepo/commit/cf8771571))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.36
- Updated @graphty/remote-logger to 2.0.8
- Updated graph-samples to 0.1.22
- Updated graph-format to 1.3.7
- Updated algorithms to 3.3.7
- Updated graph-io to 0.3.27
- Updated layout to 2.2.8

### ❤️ Thank You

- Adam Powers @apowers313

## 3.15.0 (2026-10-06)

### 🚀 Features

- **graphty-element:** publish generated JSX types at ./jsx ([de176c23d](https://github.com/graphty-org/graphty-monorepo/commit/de176c23d))
- **graphty-element:** register clustering, A* and edge betweenness ([#55](https://github.com/graphty-org/graphty-monorepo/issues/55))
- **graphty-element:** attributes() says which layers and runs read a column ([#923](https://github.com/graphty-org/graphty-monorepo/pull/923))
- **graphty-element:** narrow nodePage and edgePage to records matching typed text ([#904](https://github.com/graphty-org/graphty-monorepo/pull/904))
- **graphty-element:** open a data file with project.open, the one intake verb ([#913](https://github.com/graphty-org/graphty-monorepo/pull/913))
- **graphty-element:** attributes() says which column is the key, the label, the weight ([#893](https://github.com/graphty-org/graphty-monorepo/pull/893))
- **graphty-element:** pair any file, URL or text as two tables, refusing a non-table ([#930](https://github.com/graphty-org/graphty-monorepo/pull/930))
- **graphty-element:** session.data.renameSource(name), and save the source in projects ([#894](https://github.com/graphty-org/graphty-monorepo/pull/894))
- **graphty-element:** recognize a CSV pair's edge file, and say what a draft resolved ([#911](https://github.com/graphty-org/graphty-monorepo/pull/911))
- **graphty-element:** selection.origin, the target a selection was made from ([#898](https://github.com/graphty-org/graphty-monorepo/pull/898))
- **graphty-element:** say which roles a draft's tables take, need and lack ([#926](https://github.com/graphty-org/graphty-monorepo/pull/926))
- **graphty-element:** session.data.histogram(column), a data column's distribution ([#897](https://github.com/graphty-org/graphty-monorepo/pull/897))
- **graphty-element:** the degree distribution in data.statistics() ([#896](https://github.com/graphty-org/graphty-monorepo/pull/896))
- **graphty-element:** report progress while prepare() reads a source ([#910](https://github.com/graphty-org/graphty-monorepo/pull/910))
- **graphty-element:** say when a load starts, what it reads and how it ended ([#902](https://github.com/graphty-org/graphty-monorepo/pull/902))
- **graphty-element:** session.data.name(id), a node's name by id ([#895](https://github.com/graphty-org/graphty-monorepo/pull/895))
- **graphty-element:** self-loop and repeated-edge rule leaves ([#899](https://github.com/graphty-org/graphty-monorepo/pull/899))
- **graphty-element:** an isolated rule leaf that selects what isolatedCount counts ([#931](https://github.com/graphty-org/graphty-monorepo/pull/931))
- **graphty-element:** offer the OBO Graphs shape when exporting JSON ([9f5e5042b](https://github.com/graphty-org/graphty-monorepo/commit/9f5e5042b))

### 🩹 Fixes

- **graphty-element:** fingerprint numeric ids past 32 bits ([#714](https://github.com/graphty-org/graphty-monorepo/issues/714))
- **graphty-element:** give two functions a single return ([#714](https://github.com/graphty-org/graphty-monorepo/issues/714))
- **graphty-element:** list only dispatched events in the manifest ([3616a8904](https://github.com/graphty-org/graphty-monorepo/commit/3616a8904))
- **graphty-element:** pin the XR demo's Babylon scripts with SRI ([#713](https://github.com/graphty-org/graphty-monorepo/issues/713))
- **graphty-element:** answer pinned.has for either spelling of an id ([#1065](https://github.com/graphty-org/graphty-monorepo/issues/1065))
- **graphty-element:** follow data.directed after a session is built ([#837](https://github.com/graphty-org/graphty-monorepo/issues/837))
- **graphty-element:** pin, unpin and edge paging accept either spelling of an integer id ([#1065](https://github.com/graphty-org/graphty-monorepo/issues/1065), [#542](https://github.com/graphty-org/graphty-monorepo/issues/542))
- **graphty-element:** publish degree as columns so its cost no longer depends on GC state ([1bba70027](https://github.com/graphty-org/graphty-monorepo/commit/1bba70027))
- **graphty-element:** refuse an empty file with E_EMPTY_LOAD, not E_PARSE_FAILED ([1ba338a4b](https://github.com/graphty-org/graphty-monorepo/commit/1ba338a4b))
- **graphty-element:** finish removing GraphShapeStatistics and test the selection origin causes ([564d6cb18](https://github.com/graphty-org/graphty-monorepo/commit/564d6cb18))
- **graphty-element:** close the load-preview review gaps in progress, refusals and id counts ([#902](https://github.com/graphty-org/graphty-monorepo/issues/902), [#910](https://github.com/graphty-org/graphty-monorepo/issues/910), [#928](https://github.com/graphty-org/graphty-monorepo/issues/928), [#930](https://github.com/graphty-org/graphty-monorepo/issues/930), [#926](https://github.com/graphty-org/graphty-monorepo/issues/926), [#929](https://github.com/graphty-org/graphty-monorepo/issues/929))
- **graphty-element:** keep selection.origin truthful and degreeHistogram optional ([5cde756af](https://github.com/graphty-org/graphty-monorepo/commit/5cde756af))
- **graphty-element:** count node rows with no id, and report duplicate ids ([#929](https://github.com/graphty-org/graphty-monorepo/pull/929))
- **graphty-element:** read a draft's rows under explicit choices, and list loaded rows ([#927](https://github.com/graphty-org/graphty-monorepo/pull/927))
- **graphty-element:** let a DataSource reader yield plain records ([#914](https://github.com/graphty-org/graphty-monorepo/pull/914))
- **graphty-element:** report a merge of an edge table alone as the load does it ([#935](https://github.com/graphty-org/graphty-monorepo/pull/935))
- **graphty-element:** refuse an unreadable file with E_PARSE_FAILED, not E_EMPTY_LOAD ([#928](https://github.com/graphty-org/graphty-monorepo/pull/928))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.35
- Updated @graphty/remote-logger to 2.0.7
- Updated graph-samples to 0.1.21
- Updated graph-format to 1.3.6
- Updated algorithms to 3.3.6
- Updated graph-io to 0.3.26
- Updated layout to 2.2.7

### ❤️ Thank You

- Adam Powers @apowers313

## 3.14.5 (2026-10-05)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.34
- Updated @graphty/remote-logger to 2.0.6
- Updated graph-samples to 0.1.20
- Updated graph-format to 1.3.5
- Updated algorithms to 3.3.5
- Updated graph-io to 0.3.25
- Updated layout to 2.2.6

## 3.14.4 (2026-10-05)

### 🩹 Fixes

- **graphty-element:** price degree for the heap the element runs it in ([4c6a4c196](https://github.com/graphty-org/graphty-monorepo/commit/4c6a4c196))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.14.3 (2026-10-05)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.33
- Updated @graphty/remote-logger to 2.0.5
- Updated graph-samples to 0.1.19
- Updated graph-format to 1.3.4
- Updated algorithms to 3.3.4
- Updated graph-io to 0.3.24
- Updated layout to 2.2.5

## 3.14.2 (2026-10-04)

### 🩹 Fixes

- **graphty-element:** hand a frame the time of the ticks skipped for the GPU ([2d363c971](https://github.com/graphty-org/graphty-monorepo/commit/2d363c971))
- **graphty-element:** draw no frame while the GPU is still drawing the last one ([c19587620](https://github.com/graphty-org/graphty-monorepo/commit/c19587620))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.14.1 (2026-10-04)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.32
- Updated @graphty/remote-logger to 2.0.4
- Updated graph-samples to 0.1.18
- Updated graph-format to 1.3.3
- Updated algorithms to 3.3.3
- Updated graph-io to 0.3.23
- Updated layout to 2.2.4

## 3.14.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** hide and show the paint of one value of an encoding ([#907](https://github.com/graphty-org/graphty-monorepo/pull/907))
- **graphty-element:** a grouping result bins its groups by size ([#932](https://github.com/graphty-org/graphty-monorepo/pull/932))
- **graphty-element:** list the runs a node or edge page takes as a column ([#922](https://github.com/graphty-org/graphty-monorepo/pull/922))
- **graphty-element:** a community page column carries each cell's group rank ([#905](https://github.com/graphty-org/graphty-monorepo/pull/905))
- **graphty-element:** a partition's groups publish their rank by size ([#921](https://github.com/graphty-org/graphty-monorepo/pull/921))

### 🩹 Fixes

- **graphty-element:** hide a value in one field, rank legend groups by the run ([f763976d9](https://github.com/graphty-org/graphty-monorepo/commit/f763976d9))
- **graphty-element:** a legend swatch spells its value as the data does ([#906](https://github.com/graphty-org/graphty-monorepo/pull/906))
- **graphty-element:** sizing by a run result gets the default size range ([#915](https://github.com/graphty-org/graphty-monorepo/pull/915))
- **graphty-element:** a run whose caveats say it stopped early reports partial ([#933](https://github.com/graphty-org/graphty-monorepo/pull/933))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.31
- Updated @graphty/remote-logger to 2.0.3
- Updated graph-samples to 0.1.17
- Updated graph-format to 1.3.2
- Updated algorithms to 3.3.2
- Updated graph-io to 0.3.22
- Updated layout to 2.2.3

### ❤️ Thank You

- Adam Powers @apowers313

## 3.13.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** export the project file's name, extension and media type ([#919](https://github.com/graphty-org/graphty-monorepo/pull/919))
- **graphty-element:** mark a project saved only after the caller's write ([#918](https://github.com/graphty-org/graphty-monorepo/pull/918))
- **graphty-element:** read a load once as a draft and load it with the reader's column roles ([209b2141e](https://github.com/graphty-org/graphty-monorepo/commit/209b2141e))
- **graphty-element:** preview a load and load it with the reader's column roles ([5ca313b0b](https://github.com/graphty-org/graphty-monorepo/commit/5ca313b0b))
- **graphty-element:** name the limit in every E_TOO_LARGE refusal ([1b8b07488](https://github.com/graphty-org/graphty-monorepo/commit/1b8b07488))

### 🩹 Fixes

- **graphty-element:** count a node row once when an earlier edge already created it ([2ef8c6b23](https://github.com/graphty-org/graphty-monorepo/commit/2ef8c6b23))
- **graphty-element:** address review of the project save and direction changes ([c9811f5a4](https://github.com/graphty-org/graphty-monorepo/commit/c9811f5a4))
- **graphty-element:** a saved project reopens with the graph's direction ([#909](https://github.com/graphty-org/graphty-monorepo/pull/909))
- **graphty-element:** count the nodes an edge creates against the render ceiling ([32aeae330](https://github.com/graphty-org/graphty-monorepo/commit/32aeae330))
- **graphty-element:** load the edges a CSV source's edgeSource and edgeTarget options name ([2f62994fa](https://github.com/graphty-org/graphty-monorepo/commit/2f62994fa))
- **graphty-element:** satisfy lint and SonarQube in the load preview ([f134725ea](https://github.com/graphty-org/graphty-monorepo/commit/f134725ea))
- **graphty-element:** keep edgeSource and edgeTarget as expressions when a load has no mapping ([3d74440f6](https://github.com/graphty-org/graphty-monorepo/commit/3d74440f6))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.12.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** legend blocks state what a higher value means and the bound range ([#912](https://github.com/graphty-org/graphty-monorepo/pull/912))
- **graphty-element:** a yes/no switch for framing after a load ([#900](https://github.com/graphty-org/graphty-monorepo/pull/900))

### 🩹 Fixes

- **graphty-element:** legend reading and range only where they hold; keep an explicit fit ([e58419396](https://github.com/graphty-org/graphty-monorepo/commit/e58419396))
- **graphty-element:** give label declutter a view door of its own ([#903](https://github.com/graphty-org/graphty-monorepo/pull/903))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.11.1 (2026-10-04)

### 🩹 Fixes

- **graphty-element:** price louvain by the graph's transitivity, not one flat rate ([72ec48a6a](https://github.com/graphty-org/graphty-monorepo/commit/72ec48a6a))
- **graphty-element:** pre-bundle the per-function lodash imports in the browser tests ([d11555da9](https://github.com/graphty-org/graphty-monorepo/commit/d11555da9))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.11.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** report node label counts on the element, not the session ([76778d4f3](https://github.com/graphty-org/graphty-monorepo/commit/76778d4f3))
- **graphty-element:** count the labels the overlap rule hid, and which ([#787](https://github.com/graphty-org/graphty-monorepo/issues/787))
- **graphty-element:** read XGMML, CX, CX2, Cytoscape sessions and OBO with no wiring ([6ec8b8aa4](https://github.com/graphty-org/graphty-monorepo/commit/6ec8b8aa4))

### 🩹 Fixes

- **graphty-element:** type graphty-label-change's detail and complete the labels guide ([521736a5e](https://github.com/graphty-org/graphty-monorepo/commit/521736a5e))
- **graphty-element:** export the label count types from the session entry ([8b5886343](https://github.com/graphty-org/graphty-monorepo/commit/8b5886343))
- **graphty-element:** tx.labels.setDeclutter joins the transaction ([cce1b13c6](https://github.com/graphty-org/graphty-monorepo/commit/cce1b13c6))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.30
- Updated @graphty/remote-logger to 2.0.2
- Updated graph-samples to 0.1.16
- Updated graph-format to 1.3.1
- Updated algorithms to 3.3.1
- Updated graph-io to 0.3.21
- Updated layout to 2.2.2

### ❤️ Thank You

- Adam Powers @apowers313

## 3.10.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** export NodeId from the root; neighbors guide states types and limits ([35904f75](https://github.com/graphty-org/graphty-monorepo/commit/35904f75))
- **graphty-element:** export WeightMeaning from the root; document neighbor counts ([4442c4af](https://github.com/graphty-org/graphty-monorepo/commit/4442c4af))
- **graphty-element:** neighbors takes the run's weight, direction, scope and sort ([8954ca7d](https://github.com/graphty-org/graphty-monorepo/commit/8954ca7d))
- **graphty-element:** list a node's neighbors with tie strength ([#784](https://github.com/graphty-org/graphty-monorepo/issues/784))

### 🩹 Fixes

- **graphty-element:** re-pin the louvain cost model over its slowest random graphs ([8057ee9c](https://github.com/graphty-org/graphty-monorepo/commit/8057ee9c))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.9.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** session.find lists hits and values without selecting ([953fac48](https://github.com/graphty-org/graphty-monorepo/commit/953fac48))
- **graphty-element:** find nodes, edges and values without selecting them ([#783](https://github.com/graphty-org/graphty-monorepo/issues/783))

### 🩹 Fixes

- **graphty-element:** zoomToSelection frames selected edges by their ends ([c581691b](https://github.com/graphty-org/graphty-monorepo/commit/c581691b))
- **graphty-element:** find never matches an edge by its assigned id ([ff2dfde9](https://github.com/graphty-org/graphty-monorepo/commit/ff2dfde9))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.29
- Updated layout to 2.2.1

### ❤️ Thank You

- Adam Powers @apowers313

## 3.8.0 (2026-10-04)

### 🚀 Features

- **graphty-element:** the project file is a graphty document ([d64088e2](https://github.com/graphty-org/graphty-monorepo/commit/d64088e2))
- **graphty-element:** encode by a data column from what it measures ([6cf1ec4e](https://github.com/graphty-org/graphty-monorepo/commit/6cf1ec4e))
- **graphty-element:** address result columns and result sorts by run ([9758284d](https://github.com/graphty-org/graphty-monorepo/commit/9758284d))
- **graphty-element:** report what a run's suggested style did as data with runs.painting ([88921f21](https://github.com/graphty-org/graphty-monorepo/commit/88921f21))
- **graphty-element:** column levels, default bindings and a capped legend ([#782](https://github.com/graphty-org/graphty-monorepo/issues/782))
- **graphty-element:** save and reopen a whole session as one project file ([#301](https://github.com/graphty-org/graphty-monorepo/issues/301))
- **graphty-element:** report what a run's suggested style applied, withheld or took over ([#788](https://github.com/graphty-org/graphty-monorepo/issues/788))
- **graphty-element:** page and sort records by run result columns ([#785](https://github.com/graphty-org/graphty-monorepo/issues/785))

### 🩹 Fixes

- **graphty-element:** raise the session entry's size budget for the tier 1 APIs ([#842](https://github.com/graphty-org/graphty-monorepo/issues/842), [#844](https://github.com/graphty-org/graphty-monorepo/issues/844), [#849](https://github.com/graphty-org/graphty-monorepo/issues/849))
- **graphty-element:** type result columns as present and name what a reader had to guess ([573499f8](https://github.com/graphty-org/graphty-monorepo/commit/573499f8))
- **graphty-element:** refuse an undrawable column with E_UNSUPPORTED ([3b7904c1](https://github.com/graphty-org/graphty-monorepo/commit/3b7904c1))
- **graphty-element:** a batch member's dropped suggestion reads superseded, not merged ([7e5b9472](https://github.com/graphty-org/graphty-monorepo/commit/7e5b9472))
- **graphty-element:** run no derivation pass after a session is disposed ([8aa601a8](https://github.com/graphty-org/graphty-monorepo/commit/8aa601a8))
- **graphty-element:** type the graphty-\* DOM events and name the project status event as approved ([cadd2c55](https://github.com/graphty-org/graphty-monorepo/commit/cadd2c55))
- **graphty-element:** clearer column encoding names and docs ([c1c6f6e8](https://github.com/graphty-org/graphty-monorepo/commit/c1c6f6e8))
- **graphty-element:** clearer runs.painting names and guide fixes from a blind-author review ([b92dcd4a](https://github.com/graphty-org/graphty-monorepo/commit/b92dcd4a))
- **graphty-element:** a reopened project keeps runs, filters and layers that name a set ([#301](https://github.com/graphty-org/graphty-monorepo/issues/301))
- **graphty-element:** defaultBinding reads the attribute of the channel's kind ([d23a8182](https://github.com/graphty-org/graphty-monorepo/commit/d23a8182))
- **graphty-element:** a layer reading a run's result counts as bound ([2e5fd441](https://github.com/graphty-org/graphty-monorepo/commit/2e5fd441))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.7.0 (2026-10-03)

### 🚀 Features

- **graphty-element:** shared column, result, fact and progress shapes ([968987ab](https://github.com/graphty-org/graphty-monorepo/commit/968987ab))

### 🔥 Performance

- **graphty-element:** import lodash functions one by one so the main entry drops the whole library ([8c2c2f36](https://github.com/graphty-org/graphty-monorepo/commit/8c2c2f36))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.6.0 (2026-10-03)

### 🚀 Features

- **graphty-element:** export toColorValue and ColorValue from the catalog entry ([#736](https://github.com/graphty-org/graphty-monorepo/issues/736))
- **graphty-element:** read a JSON graphs array through graph-io and choose one of its graphs ([8e21be28](https://github.com/graphty-org/graphty-monorepo/commit/8e21be28))
- **graphty-element:** read sources as bytes and choose one graph of a file ([c89186b9](https://github.com/graphty-org/graphty-monorepo/commit/c89186b9))
- **graphty-element:** algorithms suggest readable names for their results ([#383](https://github.com/graphty-org/graphty-monorepo/issues/383))

### 🩹 Fixes

- **graphty-element:** an interrupted camera animation stops moving the camera ([35d778ef](https://github.com/graphty-org/graphty-monorepo/commit/35d778ef))
- **graphty-element:** honor DOT charset, UTF-16 files and undecodable bytes ([324ae73f](https://github.com/graphty-org/graphty-monorepo/commit/324ae73f))
- **graphty-element:** a filter or selection not yet drawn keeps the frame from being stable ([5d1a3a45](https://github.com/graphty-org/graphty-monorepo/commit/5d1a3a45))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.28
- Updated graph-samples to 0.1.15
- Updated graph-format to 1.3.0
- Updated algorithms to 3.3.0
- Updated graph-io to 0.3.20
- Updated layout to 2.2.0

### ❤️ Thank You

- Adam Powers @apowers313

## 3.5.6 (2026-10-03)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.27
- Updated algorithms to 3.2.0
- Updated layout to 2.1.0

## 3.5.5 (2026-10-03)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.26
- Updated graph-io to 0.3.19
- Updated layout to 2.0.9

## 3.5.4 (2026-10-03)

### 🩹 Fixes

- **graphty-element:** ship the MIT license text with the package ([f00e65d3](https://github.com/graphty-org/graphty-monorepo/commit/f00e65d3))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.25
- Updated algorithms to 3.1.8
- Updated graph-io to 0.3.18
- Updated layout to 2.0.8

### ❤️ Thank You

- Adam Powers @apowers313

## 3.5.3 (2026-10-02)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.24
- Updated algorithms to 3.1.7
- Updated layout to 2.0.7

## 3.5.2 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-io to 0.3.17

## 3.5.1 (2026-10-02)

### 🔥 Performance

- **graphty-element:** tear a whole graph down in linear time ([#543](https://github.com/graphty-org/graphty-monorepo/issues/543))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.23

### ❤️ Thank You

- Adam Powers @apowers313

## 3.5.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** route kruskal to the GPU above a measured floor ([252a19ed](https://github.com/graphty-org/graphty-monorepo/commit/252a19ed))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.22
- Updated algorithms to 3.1.6

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.2 (2026-10-02)

### 🩹 Fixes

- **graphty-element:** size a label from its first line of words, not a blank first line ([26eff59a](https://github.com/graphty-org/graphty-monorepo/commit/26eff59a))
- **graphty-element:** fade labels from the camera's world position; grow multi-line labels ([52fd3d7e](https://github.com/graphty-org/graphty-monorepo/commit/52fd3d7e))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.1 (2026-10-02)

### 🩹 Fixes

- **graphty-element:** classify the layout manager's graph-writes-waiting hook in the door list ([11171693](https://github.com/graphty-org/graphty-monorepo/commit/11171693))
- **graphty-element:** start a seeded layout over once per run of queued graph writes ([16cfdaa8](https://github.com/graphty-org/graphty-monorepo/commit/16cfdaa8))
- **graphty-element:** keep an explicitly placed camera instead of auto-framing over it ([7cda8df4](https://github.com/graphty-org/graphty-monorepo/commit/7cda8df4))
- **graphty-element:** restart a seeded layout when data arrives in a later write ([#650](https://github.com/graphty-org/graphty-monorepo/issues/650))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.21
- Updated algorithms to 3.1.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** name the modularity band in a community result's own reading ([d3ebb1ac](https://github.com/graphty-org/graphty-monorepo/commit/d3ebb1ac))
- **graphty-element:** route the triangle count to the GPU on an edge floor ([#678](https://github.com/graphty-org/graphty-monorepo/pull/678))
- **graphty-element:** publish an interpretation scale for modularity and RunResult.band() ([#546](https://github.com/graphty-org/graphty-monorepo/issues/546))
- **graphty-element:** read node and edge records a page at a time ([#575](https://github.com/graphty-org/graphty-monorepo/issues/575))
- **graphty-element:** ai key store restores itself and keeps the default provider ([#576](https://github.com/graphty-org/graphty-monorepo/issues/576), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))
- **graphty-element:** add zoomToNodes to frame a set of nodes in 2D and 3D ([eec1e9b5](https://github.com/graphty-org/graphty-monorepo/commit/eec1e9b5))
- **graphty-element:** give channel descriptors a short name, group, default and reason ([2680142b](https://github.com/graphty-org/graphty-monorepo/commit/2680142b))
- **graphty-element:** export notes as columns on request, and report the notes left out ([b39b2dd3](https://github.com/graphty-org/graphty-monorepo/commit/b39b2dd3))
- **graphty-element:** draw label and tooltip text bound to a note as plain text ([e97f6f36](https://github.com/graphty-org/graphty-monorepo/commit/e97f6f36))
- **graphty-element:** read note counts and newest text through graphty.notes.\* style paths ([be1d65a8](https://github.com/graphty-org/graphty-monorepo/commit/be1d65a8))
- **graphty-element:** save and open notes with toDocument and mergeDocument ([e2ac4893](https://github.com/graphty-org/graphty-monorepo/commit/e2ac4893))
- **graphty-element:** add the document error codes and the warning code union ([7dacc3bb](https://github.com/graphty-org/graphty-monorepo/commit/7dacc3bb))
- **graphty-element:** select what a note is about, and list notes among a set's users ([db624628](https://github.com/graphty-org/graphty-monorepo/commit/db624628))
- **graphty-element:** mirror note:changed as the graphty-note-change DOM event ([9df281ea](https://github.com/graphty-org/graphty-monorepo/commit/9df281ea))
- **graphty-element:** add session.notes with undoable add, update and remove ([965b7a5c](https://github.com/graphty-org/graphty-monorepo/commit/965b7a5c))
- **graphty-element:** add the author project setting ([5a13ed97](https://github.com/graphty-org/graphty-monorepo/commit/5a13ed97))

### 🩹 Fixes

- **graphty-element:** set the triangle edge floor at the smallest measured all-win value ([#678](https://github.com/graphty-org/graphty-monorepo/issues/678))
- **graphty-element:** sort a page by a bigint value without throwing ([45ef70aa](https://github.com/graphty-org/graphty-monorepo/commit/45ef70aa))
- **graphty-element:** set the triangle edge floor from seven sweeps ([8199b7a1](https://github.com/graphty-org/graphty-monorepo/commit/8199b7a1))
- **graphty-element:** save a loaded edge's note by its position at save time ([7f009140](https://github.com/graphty-org/graphty-monorepo/commit/7f009140))
- **graphty-element:** ai key store clear() keeps remembering on and skips non-string entries ([b15f68e6](https://github.com/graphty-org/graphty-monorepo/commit/b15f68e6))
- **graphty-element:** zoomToNodes takes one id or several, and frames a lone node ([b3d539b9](https://github.com/graphty-org/graphty-monorepo/commit/b3d539b9))
- **graphty-element:** save a note about a session-added edge by its position ([b681820e](https://github.com/graphty-org/graphty-monorepo/commit/b681820e))
- **graphty-element:** keep the notes reader out of the extend entry point ([51567728](https://github.com/graphty-org/graphty-monorepo/commit/51567728))
- **graphty-element:** report a graphty. column an export leaves out ([73a7bbc0](https://github.com/graphty-org/graphty-monorepo/commit/73a7bbc0))
- **graphty-element:** read a notes file once, and bind its session edge ids to nothing ([06cd19a6](https://github.com/graphty-org/graphty-monorepo/commit/06cd19a6))

### 🔥 Performance

- **graphty-element:** build a WebGPU graph once, after the renderer opens ([#614](https://github.com/graphty-org/graphty-monorepo/issues/614))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.20
- Updated @graphty/remote-logger to 2.0.1
- Updated graph-samples to 0.1.14
- Updated graph-format to 1.2.6
- Updated algorithms to 3.1.4
- Updated graph-io to 0.3.16
- Updated layout to 2.0.6

### ❤️ Thank You

- Adam Powers @apowers313

## 3.3.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** choose the renderer, webgl or webgpu ([#464](https://github.com/graphty-org/graphty-monorepo/issues/464))
- **graphty-element:** park a moving edge at the start of its gradient when the scene stops animating ([57ecd41b](https://github.com/graphty-org/graphty-monorepo/commit/57ecd41b))

### 🩹 Fixes

- **graphty-element:** time the degree cost row at sizes it can measure ([8a4bb182](https://github.com/graphty-org/graphty-monorepo/commit/8a4bb182))
- **graphty-element:** count a video's duration from the recorder's first data ([cd9754a6](https://github.com/graphty-org/graphty-monorepo/commit/cd9754a6))
- **deps:** patch the open uuid, vitest mocker, ip-address and low-severity advisories ([a5a5109c](https://github.com/graphty-org/graphty-monorepo/commit/a5a5109c))
- **graphty-element:** paint runs beneath a partial user layer instead of suppressing them ([#551](https://github.com/graphty-org/graphty-monorepo/issues/551))
- **graphty-element:** stop a renderer open that outlives shutdown, and refuse changes during it ([1951634d](https://github.com/graphty-org/graphty-monorepo/commit/1951634d))
- **graphty-element:** give each animated line its own empty colours texture ([0a897fc9](https://github.com/graphty-org/graphty-monorepo/commit/0a897fc9))
- **graphty-element:** draw animated edges under webgpu ([9d688714](https://github.com/graphty-org/graphty-monorepo/commit/9d688714))
- **graphty-element:** draw an animated edge at the width the style asked for ([3cc18575](https://github.com/graphty-org/graphty-monorepo/commit/3cc18575))
- **graphty-element:** make an edge's animation speed set its speed ([#459](https://github.com/graphty-org/graphty-monorepo/issues/459))
- **compact-mantine:** inputs follow the size scale and the password toggle has a name ([#7](https://github.com/graphty-org/graphty-monorepo/issues/7), [#137](https://github.com/graphty-org/graphty-monorepo/issues/137), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.19
- Updated @graphty/remote-logger to 2.0.0
- Updated graph-samples to 0.1.13
- Updated graph-format to 1.2.5
- Updated algorithms to 3.1.3
- Updated graph-io to 0.3.15
- Updated layout to 2.0.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.2.0 (2026-10-01)

### 🚀 Features

- **graphty-element:** draw the default force layout on an accelerator ([#439](https://github.com/graphty-org/graphty-monorepo/issues/439))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.1.3 (2026-10-01)

### 🩹 Fixes

- **graphty-element:** stop color-control inference on the background property ([7919af6b](https://github.com/graphty-org/graphty-monorepo/commit/7919af6b))
- **graphty-element:** stop the color control matching the background object ([b97ece3b](https://github.com/graphty-org/graphty-monorepo/commit/b97ece3b))
- **graphty-element:** draw the GPU, log panel, AI and simple tier stories in the standard frame ([e7f59a2d](https://github.com/graphty-org/graphty-monorepo/commit/e7f59a2d))
- **graphty-element:** take no placement steps while a layout's pre-steps are owed ([#553](https://github.com/graphty-org/graphty-monorepo/issues/553))
- **graphty-element:** an element with no data reports a stable frame ([76f701df](https://github.com/graphty-org/graphty-monorepo/commit/76f701df))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.18
- Updated @graphty/remote-logger to 1.3.16
- Updated graph-samples to 0.1.12
- Updated graph-format to 1.2.4
- Updated algorithms to 3.1.2
- Updated graph-io to 0.3.14
- Updated layout to 2.0.4

### ❤️ Thank You

- Adam Powers @apowers313

## 3.1.2 (2026-10-01)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.17
- Updated @graphty/remote-logger to 1.3.15
- Updated graph-samples to 0.1.11
- Updated graph-format to 1.2.3
- Updated algorithms to 3.1.1
- Updated graph-io to 0.3.13
- Updated layout to 2.0.3

## 3.1.1 (2026-10-01)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.16
- Updated algorithms to 3.1.0

## 3.1.0 (2026-09-30)

### 🚀 Features

- Run the built-in algorithms on the graph snapshot, give plugin algorithms a snapshot accessor, and fix algorithm results ([4404517f](https://github.com/graphty-org/graphty-monorepo/commit/4404517f))

    Features:
    - A plugin algorithm reads its graph through `context.input(orientation)`: the snapshot, the scope's masks, `subgraph()`, `input.edgeId(row)` and `input.subgraphEdgeIds(row)` for edge ids, `input.column(option)` for declared attribute and partition options, and the `weight` input option. `./extend` also exports `edgeMetricFields`, `Column` and `WeightMeaning`.
    - `closeness` takes `k` to sample that many source nodes on a big graph; the result says so in `caveats.exact` and `caveats.sampleSize`.
    - `@graphty/graph-format` is a regular dependency only, no longer also a peer dependency, so a consumer does not install it alongside.

    Deprecated (removed in 4.0):
    - `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type keep working and return the same object graph as 3.0. In TypeScript, `AlgorithmGraphView` is no longer the `@graphty/algorithms` 2.x `Graph` type itself, so a plugin passing it to its own `@graphty/algorithms@2` functions needs a cast to compile; run time is unchanged. Move to `context.input(...).subgraph()`; the custom-algorithms guide maps each old call to its replacement.
    - `SimpleLayoutEngine`: a one-pass layout is now registered with `registerSnapshotLayout`.

    Fixes (the migration guide, "Algorithm results fixed in 3.x", lists every one):
    - PageRank and strongly connected components on an undirected graph read every edge both ways.
    - Prim and Bellman-Ford break equal-cost ties by edge order; Bellman-Ford marks no route through a negative cycle.
    - A node option naming no node (a BFS target, a DFS source or target, a Bellman-Ford source or target, a Prim start node) is refused with `E_OPTION_RANGE` instead of being silently ignored; so are `source` equal to `sink` in max flow and min cut, and `endpoints: true` on HITS, Katz and eigenvector centrality.
    - k-core, Louvain, label propagation, HITS and Katz modes, max flow, min cut, Karger, bipartite matching, Floyd-Warshall and Adamic-Adar results are corrected as the guide describes.
    - DOT, GML and Pajek files load through `@graphty/graph-io`, as Graphviz, NetworkX and Pajek define them; the data-sources guide, "Changes in graphty-element 3.1", lists the edge cases that load differently.

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.15
- Updated @graphty/remote-logger to 1.3.14
- Updated graph-samples to 0.1.10
- Updated graph-format to 1.2.2
- Updated algorithms to 3.0.0
- Updated graph-io to 0.3.12
- Updated layout to 2.0.2

### ❤️ Thank You

- Adam Powers @apowers313

## 3.0.1 (2026-09-30)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.14
- Updated @graphty/remote-logger to 1.3.13
- Updated graph-samples to 0.1.9
- Updated graph-format to 1.2.1
- Updated algorithms to 2.2.1
- Updated graph-io to 0.3.11
- Updated layout to 2.0.1

# 3.0.0 (2026-09-29)

### 🚀 Features

- **graphty-element:** build defineAlgorithm on an ordinary DeclaredAlgorithm registration ([25f89be1](https://github.com/graphty-org/graphty-monorepo/commit/25f89be1))
- **graphty-element:** build defineLayout, the simple tier's layout verb ([cd099f96](https://github.com/graphty-org/graphty-monorepo/commit/cd099f96))
- **graphty-element:** build defineLogDestination over registerLogSink ([46cf9cdb](https://github.com/graphty-org/graphty-monorepo/commit/46cf9cdb))
- **graphty-element:** build definePalette and setDefaultPalettes ([757d9e33](https://github.com/graphty-org/graphty-monorepo/commit/757d9e33))
- **graphty-element:** add the simple extension tier's graph view and define plumbing ([24d84233](https://github.com/graphty-org/graphty-monorepo/commit/24d84233))
- **graphty-element:** read json files through graph-io ([0d85280d](https://github.com/graphty-org/graphty-monorepo/commit/0d85280d))
- **graphty-element:** read csv and neo4j files through graph-io ([00745eec](https://github.com/graphty-org/graphty-monorepo/commit/00745eec))
- **graphty-element:** read gexf and graphml through graph-io ([97629983](https://github.com/graphty-org/graphty-monorepo/commit/97629983))
- **graphty-element:** run bfs, dfs, bellman-ford, prim, scc and pagerank on the index ports ([560d29f0](https://github.com/graphty-org/graphty-monorepo/commit/560d29f0))
- **graphty-element:** forward hits, katz and eigenvector centrality to the gpu ([ad98d559](https://github.com/graphty-org/graphty-monorepo/commit/ad98d559))
- **graphty-element:** read a file through a graph-io importer into today's records ([9fae5c16](https://github.com/graphty-org/graphty-monorepo/commit/9fae5c16))
- **graphty-element:** run the static layout engines on the indexed layouts ([d055587d](https://github.com/graphty-org/graphty-monorepo/commit/d055587d))
- **graphty-element:** run eigenvector, betweenness and closeness on the index-based ports ([#558](https://github.com/graphty-org/graphty-monorepo/issues/558))
- **graphty-element:** run floyd-warshall and label propagation on the dispatcher ([b492d3d8](https://github.com/graphty-org/graphty-monorepo/commit/b492d3d8))
- **graphty:** reach the element only through its session and public doors ([0372cc3a](https://github.com/graphty-org/graphty-monorepo/commit/0372cc3a))
- **graphty:** warn wherever the app changes the element outside session commands ([3b896764](https://github.com/graphty-org/graphty-monorepo/commit/3b896764))
- **graphty-element:** select what undo changed, and keep run results as columns ([8e0310f2](https://github.com/graphty-org/graphty-monorepo/commit/8e0310f2))
- **graphty-element:** add zoom step and zoom to selection as camera members ([ee4bd38d](https://github.com/graphty-org/graphty-monorepo/commit/ee4bd38d))
- **graphty-element:** make a drag, an assistant message and a batch one undoable step each ([383bbefa](https://github.com/graphty-org/graphty-monorepo/commit/383bbefa))
- **graphty-element:** close the public members that changed a graph without a step ([63920074](https://github.com/graphty-org/graphty-monorepo/commit/63920074))
- **graphty-element:** freeze records and seal the resident snapshot outside commands ([65193152](https://github.com/graphty-org/graphty-monorepo/commit/65193152))
- **graphty-element:** make a plugin algorithm without a descriptor one undoable step ([20f9e4fc](https://github.com/graphty-org/graphty-monorepo/commit/20f9e4fc))
- **graphty-element:** make the layout choice and 2d or 3d undoable steps ([b182121e](https://github.com/graphty-org/graphty-monorepo/commit/b182121e))
- **graphty-element:** keep coordinates right across datasets, cancelled loads and eviction ([0b75a106](https://github.com/graphty-org/graphty-monorepo/commit/0b75a106))
- **graphty-element:** restore node coordinates and pins on undo without reheating the layout ([f03521db](https://github.com/graphty-org/graphty-monorepo/commit/f03521db))
- **graphty-element:** make a run, its result and its layers one undoable step ([1cb8f222](https://github.com/graphty-org/graphty-monorepo/commit/1cb8f222))
- **graphty-element:** make imports, expansions and data batches undoable steps ([005156c5](https://github.com/graphty-org/graphty-monorepo/commit/005156c5))
- **graphty-element:** make node and edge removal and clearing undoable steps ([e220c4cd](https://github.com/graphty-org/graphty-monorepo/commit/e220c4cd))
- **graphty-element:** make graph additions and attribute edits undoable steps ([96866bc1](https://github.com/graphty-org/graphty-monorepo/commit/96866bc1))
- **graphty-element:** make project settings undoable steps behind a frozen configuration ([e5032312](https://github.com/graphty-org/graphty-monorepo/commit/e5032312))
- **graphty-element:** make saved scopes and saved camera views undoable steps ([5823f500](https://github.com/graphty-org/graphty-monorepo/commit/5823f500))
- **graphty-element:** make filter, time window and show-context undoable steps ([b12cbfac](https://github.com/graphty-org/graphty-monorepo/commit/b12cbfac))
- **graphty-element:** make every style edit one undoable step ([025a1e24](https://github.com/graphty-org/graphty-monorepo/commit/025a1e24))
- **graphty-element:** publish undo, redo, history, transaction and execute on the session ([e5eabc2e](https://github.com/graphty-org/graphty-monorepo/commit/e5eabc2e))
- **graphty-element:** derive every change on its own lane and publish events in one order ([f83f4bf3](https://github.com/graphty-org/graphty-monorepo/commit/f83f4bf3))
- **graphty-element:** queue commands, hold keys and cancel pending work on undo ([b5811c2d](https://github.com/graphty-org/graphty-monorepo/commit/b5811c2d))
- **graphty-element:** add the dispatcher with groups, rollback and transactions ([ec587c4e](https://github.com/graphty-org/graphty-monorepo/commit/ec587c4e))
- **graphty-element:** add the undo history with coalescing and a memory budget ([e633f890](https://github.com/graphty-org/graphty-monorepo/commit/e633f890))
- **graphty-element:** add project state, drafts and patches for undo ([948bc525](https://github.com/graphty-org/graphty-monorepo/commit/948bc525))

### 🩹 Fixes

- **graphty-element:** refit eigenvector centrality's cost to the snapshot kernel ([bcdc1df4](https://github.com/graphty-org/graphty-monorepo/commit/bcdc1df4))
- **graphty-element:** refit the cost model to the snapshot kernels ([8450f3b8](https://github.com/graphty-org/graphty-monorepo/commit/8450f3b8))
- **graphty-element:** keep the session dispatcher out of the extend entry point ([f57a3104](https://github.com/graphty-org/graphty-monorepo/commit/f57a3104))
- **graphty-element:** keep the layout engines out of the catalog entry point ([a30d96e0](https://github.com/graphty-org/graphty-monorepo/commit/a30d96e0))
- **graphty-element:** let a static layout chosen before any data wait for it ([52d25fba](https://github.com/graphty-org/graphty-monorepo/commit/52d25fba))
- **graphty-element:** keep 2D edges and nodes on the plane whatever Z arrives ([b94fa96f](https://github.com/graphty-org/graphty-monorepo/commit/b94fa96f))
- **graphty-element:** a click selects a node without pinning it ([32ab4309](https://github.com/graphty-org/graphty-monorepo/commit/32ab4309))
- **graphty-element:** put a pinned node on the plane when the layout switches to 2D ([58e4c7a8](https://github.com/graphty-org/graphty-monorepo/commit/58e4c7a8))
- **graphty-element:** do not report a setData cancelled by disposing the graph ([229a73a2](https://github.com/graphty-org/graphty-monorepo/commit/229a73a2))
- **graphty-element:** make simple-tier run records, warnings and guides tell the truth ([2933486f](https://github.com/graphty-org/graphty-monorepo/commit/2933486f))
- **graphty-element:** put nodes at their data positions when the layout switches to fixed ([e79e6040](https://github.com/graphty-org/graphty-monorepo/commit/e79e6040))
- **graphty-element:** keep csv and json records as the 2.x readers gave them ([f9e87950](https://github.com/graphty-org/graphty-monorepo/commit/f9e87950))
- **graphty-element:** refuse a personalized pagerank under required acceleration ([23f94701](https://github.com/graphty-org/graphty-monorepo/commit/23f94701))
- **graphty-element:** read an edge weight above the f32 range as no weight ([63196f28](https://github.com/graphty-org/graphty-monorepo/commit/63196f28))
- **graphty-element:** report an unreadable gexf or graphml file as E_PARSE_FAILED ([fad4dfbd](https://github.com/graphty-org/graphty-monorepo/commit/fad4dfbd))
- **graphty-element:** run unrouted floyd-warshall and label propagation on the cpu under required ([708f2959](https://github.com/graphty-org/graphty-monorepo/commit/708f2959))
- **graphty-element:** read csv headers, weights and ids as the 2.x readers did ([13c6c819](https://github.com/graphty-org/graphty-monorepo/commit/13c6c819))
- **graphty-element:** report a layout that cannot place newcomers instead of throwing ([241f2a87](https://github.com/graphty-org/graphty-monorepo/commit/241f2a87))
- **graphty-element:** place an import's newcomers once, not after every chunk ([2ff6caa9](https://github.com/graphty-org/graphty-monorepo/commit/2ff6caa9))
- **graphty-element:** a rollback with no arrangement to restore leaves the layout running ([7da90ba1](https://github.com/graphty-org/graphty-monorepo/commit/7da90ba1))
- **graphty-element:** undoing a placement puts a row nothing had placed back to unplaced ([0b581746](https://github.com/graphty-org/graphty-monorepo/commit/0b581746))
- **graphty-element:** repaint a run of queued graph writes once, and settle data doors on it ([045c8528](https://github.com/graphty-org/graphty-monorepo/commit/045c8528))
- **graphty-element:** place newcomers inside the derivation lane and check what is drawn ([5f3ae06e](https://github.com/graphty-org/graphty-monorepo/commit/5f3ae06e))
- **graphty-element:** keep a coalescing edit out of a step older than pending work ([ad855e4e](https://github.com/graphty-org/graphty-monorepo/commit/ad855e4e))
- **graphty-element:** give a redone import's edges back their load provenance ([527ee846](https://github.com/graphty-org/graphty-monorepo/commit/527ee846))
- ⚠️ **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
- ⚠️ **graphty-element:** start on-load algorithms after expansion, report store counts ([ea80b527](https://github.com/graphty-org/graphty-monorepo/commit/ea80b527))
- **graphty-element:** keep gexf key precedence and graphml node order ([cbcb798e](https://github.com/graphty-org/graphty-monorepo/commit/cbcb798e))
- **algorithms:** give accelerated hits and katz the cpu port's scale and weighting ([062aafb2](https://github.com/graphty-org/graphty-monorepo/commit/062aafb2))
- **graphty-element:** say what a pagerank personalization and a dfs target actually did ([a1a2e0b1](https://github.com/graphty-org/graphty-monorepo/commit/a1a2e0b1))
- **graphty-element:** keep weights, endpoint nodes and file decimals in graph-io records ([bf60cc9a](https://github.com/graphty-org/graphty-monorepo/commit/bf60cc9a))
- **graphty-element:** name the real reason when required acceleration refuses work ([2280de30](https://github.com/graphty-org/graphty-monorepo/commit/2280de30))
- **graphty-element:** never report a CPU run as accelerated for a member the element keeps ([9b2ab0e2](https://github.com/graphty-org/graphty-monorepo/commit/9b2ab0e2))
- **graphty-element:** place a fixed-layout node at its data position as it is added ([810e6e59](https://github.com/graphty-org/graphty-monorepo/commit/810e6e59))
- **graphty-element:** run leiden and girvan-newman on the index-based ports ([59b6e12f](https://github.com/graphty-org/graphty-monorepo/commit/59b6e12f))
- **graphty-element:** decide an unforwarded algorithm capability as unimplemented ([644e9a80](https://github.com/graphty-org/graphty-monorepo/commit/644e9a80))
- **graphty-element:** start on-load algorithms once per load, not once per chunk ([02fadde1](https://github.com/graphty-org/graphty-monorepo/commit/02fadde1))
- **graphty-element:** give every edge its own ngraph link ([b3c0aacf](https://github.com/graphty-org/graphty-monorepo/commit/b3c0aacf))
- **layout:** keep multipartiteLayout's one-layer fallback and count distinct planar edges ([0014a5d7](https://github.com/graphty-org/graphty-monorepo/commit/0014a5d7))
- **graphty-element:** rename the undo timing project to browser-bench ([e1484a38](https://github.com/graphty-org/graphty-monorepo/commit/e1484a38))
- **graphty-element:** keep strict state's per-dispatch check off the history ([8921b612](https://github.com/graphty-org/graphty-monorepo/commit/8921b612))
- **graphty-element:** carry load ids and supersede loads in the undo model, keep master's app fixes ([64401478](https://github.com/graphty-org/graphty-monorepo/commit/64401478))
- **graphty-element:** read settings back as assigned, keep layout membership and pins internal ([92777fae](https://github.com/graphty-org/graphty-monorepo/commit/92777fae))
- **graphty-element:** close the layout engine's writable lane, name algo.remove's run by runid ([#543](https://github.com/graphty-org/graphty-monorepo/issues/543))
- **graphty-element:** seal layout rest under the step that moved it, skip no-op steps ([1fcf183e](https://github.com/graphty-org/graphty-monorepo/commit/1fcf183e))
- **graphty-element:** close the remaining ways to change project state without a step ([#539](https://github.com/graphty-org/graphty-monorepo/issues/539))
- **graphty-element:** let session.data.import choose the recommended layout ([c96b2eac](https://github.com/graphty-org/graphty-monorepo/commit/c96b2eac))

### ⚠️ Breaking Changes

- **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
  toPositionMap leaves out a node whose row is all NaN, and
  the Embedding type is no longer exported.
- **graphty-element:** start on-load algorithms after expansion, report store counts ([ea80b527](https://github.com/graphty-org/graphty-monorepo/commit/ea80b527))
  DataManager.edgeCache is removed, together with the EdgeMap
  class it held. Use DataManager.getEdgesBetween(source, target), which answers
  from the graph store and lists every edge of that ordered pair, oldest first.
  DataManager.heldCounts() is now public.

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.13
- Updated @graphty/remote-logger to 1.3.12
- Updated graph-samples to 0.1.8
- Updated graph-format to 1.2.0
- Updated algorithms to 2.2.0
- Updated graph-io to 0.3.10
- Updated layout to 2.0.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.6.2 (2026-09-28)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.12
- Updated @graphty/remote-logger to 1.3.11
- Updated graph-samples to 0.1.7
- Updated graph-format to 1.1.2
- Updated algorithms to 2.1.2
- Updated layout to 1.10.5

## 2.6.1 (2026-09-28)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.11
- Updated @graphty/remote-logger to 1.3.10
- Updated graph-samples to 0.1.6
- Updated graph-format to 1.1.1
- Updated algorithms to 2.1.1
- Updated layout to 1.10.4

## 2.6.0 (2026-09-28)

### 🚀 Features

- **graphty-element:** apply the decided sets names, result ids and kept records ([91e0043d](https://github.com/graphty-org/graphty-monorepo/commit/91e0043d))
- **graphty-element:** hold sets within their memory budget at scale ([9eccdb20](https://github.com/graphty-org/graphty-monorepo/commit/9eccdb20))
- **graphty-element:** lay out one set while holding the rest of the graph still ([ce45487a](https://github.com/graphty-org/graphty-monorepo/commit/ce45487a))
- **graphty-element:** a plugin algorithm learns and computes over its run's scope ([83511019](https://github.com/graphty-org/graphty-monorepo/commit/83511019))
- **graphty-element:** eigenvector and link prediction compute over their run's scope ([c409ac7c](https://github.com/graphty-org/graphty-monorepo/commit/c409ac7c))
- **graphty-element:** path and flow algorithms compute over their run's scope ([59da5e49](https://github.com/graphty-org/graphty-monorepo/commit/59da5e49))
- **graphty-element:** community detection groups over its run's scope ([4e9642a7](https://github.com/graphty-org/graphty-monorepo/commit/4e9642a7))
- **graphty-element:** dijkstra routes within its run's scope ([a5d18eef](https://github.com/graphty-org/graphty-monorepo/commit/a5d18eef))
- **graphty-element:** breadth-first search walks its run's scope ([7d7dfc0a](https://github.com/graphty-org/graphty-monorepo/commit/7d7dfc0a))
- **graphty-element:** kruskal spans its run's scope ([ea6a749d](https://github.com/graphty-org/graphty-monorepo/commit/ea6a749d))
- **graphty-element:** connected components groups over its run's scope ([879b6296](https://github.com/graphty-org/graphty-monorepo/commit/879b6296))
- **graphty-element:** pagerank ranks over its run's scope ([7a2bdf87](https://github.com/graphty-org/graphty-monorepo/commit/7a2bdf87))
- **graphty-element:** betweenness counts paths within its run's scope ([874a5765](https://github.com/graphty-org/graphty-monorepo/commit/874a5765))
- **graphty-element:** closeness measures distances within its run's scope ([325aa6af](https://github.com/graphty-org/graphty-monorepo/commit/325aa6af))
- **graphty-element:** k-core peels its run's scope ([501035c0](https://github.com/graphty-org/graphty-monorepo/commit/501035c0))
- **graphty-element:** katz centrality scores over its run's scope ([ae0358d2](https://github.com/graphty-org/graphty-monorepo/commit/ae0358d2))
- **graphty-element:** hits scores over its run's scope ([f91100df](https://github.com/graphty-org/graphty-monorepo/commit/f91100df))
- **graphty-element:** degree counts over its run's scope ([596c08a3](https://github.com/graphty-org/graphty-monorepo/commit/596c08a3))
- **graphty-element:** the two base classes read their nodes and counts from the input ([fd583e44](https://github.com/graphty-org/graphty-monorepo/commit/fd583e44))
- **graphty-element:** the scoped input accessor and derived inputs ([a9bcb6e0](https://github.com/graphty-org/graphty-monorepo/commit/a9bcb6e0))
- **graphty-element:** the visibility filter follows the sets it names ([0b61e970](https://github.com/graphty-org/graphty-monorepo/commit/0b61e970))
- **graphty-element:** style layers name sets ([ea20d0b9](https://github.com/graphty-org/graphty-monorepo/commit/ea20d0b9))
- **graphty-element:** change notification and the re-resolution scheduler ([ea703640](https://github.com/graphty-org/graphty-monorepo/commit/ea703640))
- **graphty-element:** offered sets and memberships ([dd63f477](https://github.com/graphty-org/graphty-monorepo/commit/dd63f477))
- **graphty-element:** set algebra and the materialising doors ([35e00137](https://github.com/graphty-org/graphty-monorepo/commit/35e00137))
- **graphty-element:** set status, path kind, used by and held-item captures ([848fd50c](https://github.com/graphty-org/graphty-monorepo/commit/848fd50c))
- **graphty-element:** the item and threshold rule leaves ([c75ac48b](https://github.com/graphty-org/graphty-monorepo/commit/c75ac48b))
- **graphty-element:** publish session.sets and the set:changed event ([502ec3d0](https://github.com/graphty-org/graphty-monorepo/commit/502ec3d0))
- **graphty-element:** the scope leaf, inline set definitions and cycle refusal ([242511fa](https://github.com/graphty-org/graphty-monorepo/commit/242511fa))
- **graphty-element:** cache set resolutions by what they read, and round-trip stored sets ([d97d875a](https://github.com/graphty-org/graphty-monorepo/commit/d97d875a))
- **graphty-element:** bind listed edge members and paths across re-freezes ([a29e95b4](https://github.com/graphty-org/graphty-monorepo/commit/a29e95b4))
- **graphty-element:** resolve every scope form to node and edge bitmaps ([013ddcbb](https://github.com/graphty-org/graphty-monorepo/commit/013ddcbb))
- **graphty-element:** the kept-set store and its synchronous doors ([206167f6](https://github.com/graphty-org/graphty-monorepo/commit/206167f6))
- **graphty-element:** attribute revisions, the input tick and execution tokens ([5dc8facd](https://github.com/graphty-org/graphty-monorepo/commit/5dc8facd))
- **graphty-element:** stable edge identity and hash columns ([fa0bf98e](https://github.com/graphty-org/graphty-monorepo/commit/fa0bf98e))
- **graphty-element:** member hashes, the r1 revision and a benchmark runner ([694dc3bb](https://github.com/graphty-org/graphty-monorepo/commit/694dc3bb))
- **graphty-element:** set definition types, canonical form and validator ([cec68049](https://github.com/graphty-org/graphty-monorepo/commit/cec68049))

### 🩹 Fixes

- **graphty-element:** close the sets review's door gaps and repaint only moved rows ([8a2010f9](https://github.com/graphty-org/graphty-monorepo/commit/8a2010f9))
- **graphty-element:** canonical undirected edges at every door, status matching resolution ([1e56b36d](https://github.com/graphty-org/graphty-monorepo/commit/1e56b36d))
- **graphty-element:** cheaper load completion, and every scope door admits the same way ([70463668](https://github.com/graphty-org/graphty-monorepo/commit/70463668))
- **graphty-element:** stop charging module loads to test timeouts ([#491](https://github.com/graphty-org/graphty-monorepo/issues/491))
- **graphty-element:** set the acceleration routing floors from a measurement taken through the element ([#424](https://github.com/graphty-org/graphty-monorepo/issues/424))
- **graphty-element:** report the last frame's draw calls, not the frame count ([09a1cefd](https://github.com/graphty-org/graphty-monorepo/commit/09a1cefd))
- **graphty-element:** dijkstra uses the shortest of parallel edges ([1f4f7f38](https://github.com/graphty-org/graphty-monorepo/commit/1f4f7f38))
- **graphty-element:** scoped runs compute over their scope ([166fe1d2](https://github.com/graphty-org/graphty-monorepo/commit/166fe1d2))
- **graphty-element:** selection.promote keeps the selected edges ([5d62c8ac](https://github.com/graphty-org/graphty-monorepo/commit/5d62c8ac))
- **graphty-element:** scope.save never reissues a removed id ([ac35f705](https://github.com/graphty-org/graphty-monorepo/commit/ac35f705))
- **graphty-element:** scope.save keeps the current members of selection and visible ([a17c25bd](https://github.com/graphty-org/graphty-monorepo/commit/a17c25bd))
- **graphty-element:** version scope digests as d1 and sum them from hash columns ([0d7eb15f](https://github.com/graphty-org/graphty-monorepo/commit/0d7eb15f))
- **graphty-element:** never reissue an edge id after a clear or a replacing import ([37cda562](https://github.com/graphty-org/graphty-monorepo/commit/37cda562))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.10
- Updated @graphty/remote-logger to 1.3.9
- Updated graph-samples to 0.1.5
- Updated graph-format to 1.1.0
- Updated algorithms to 2.1.0
- Updated layout to 1.10.3

### ❤️ Thank You

- Adam Powers @apowers313

## 2.5.2 (2026-09-27)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.9
- Updated @graphty/remote-logger to 1.3.8
- Updated graph-format to 1.0.7
- Updated algorithms to 2.0.6
- Updated layout to 1.10.2

## 2.5.1 (2026-09-27)

### 🩹 Fixes

- **graph-format:** count every change the next freeze would show in mutationCount ([#100](https://github.com/graphty-org/graphty-monorepo/issues/100))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.8
- Updated graph-format to 1.0.6
- Updated algorithms to 2.0.5
- Updated layout to 1.10.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.5.0 (2026-09-27)

### 🚀 Features

- **graphty-element:** report an unknown style layer id as E_UNKNOWN_LAYER ([#111](https://github.com/graphty-org/graphty-monorepo/issues/111))

### 🩹 Fixes

- **graphty-element:** announce data-cleared, reset the layout, type style-changed ([#112](https://github.com/graphty-org/graphty-monorepo/issues/112), [#121](https://github.com/graphty-org/graphty-monorepo/issues/121))
- **graphty-element:** name partition groups the same in the summary and the legend ([63d79816](https://github.com/graphty-org/graphty-monorepo/commit/63d79816))
- **graphty-element:** explain why the sif and cx2 format names cannot load ([#306](https://github.com/graphty-org/graphty-monorepo/issues/306), [#307](https://github.com/graphty-org/graphty-monorepo/issues/307), [#57](https://github.com/graphty-org/graphty-monorepo/issues/57))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.4.1 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** do not apply style paint while a pass is painting ([#440](https://github.com/graphty-org/graphty-monorepo/issues/440))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.7

### ❤️ Thank You

- Adam Powers @apowers313

## 2.4.0 (2026-09-26)

### 🚀 Features

- **layout:** grid and radial layouts, available in graphty-element ([#58](https://github.com/graphty-org/graphty-monorepo/issues/58))
- **graphty-element:** k-core and link prediction, and deprecate unimplemented catalog entries ([#54](https://github.com/graphty-org/graphty-monorepo/issues/54), [#56](https://github.com/graphty-org/graphty-monorepo/issues/56), [#59](https://github.com/graphty-org/graphty-monorepo/issues/59))
- **graphty-element:** export the edge line and arrow types for pickers ([#46](https://github.com/graphty-org/graphty-monorepo/issues/46))

### 🩹 Fixes

- **graphty-element:** keep the batch material when an edge drops its caps ([bcde7d92](https://github.com/graphty-org/graphty-monorepo/commit/bcde7d92))
- **graphty-element:** sort the floor-table imports and narrow its partial reads ([75406966](https://github.com/graphty-org/graphty-monorepo/commit/75406966))
- **graphty-element:** type the per-capability floors against the seam's member names ([0bb5f5fb](https://github.com/graphty-org/graphty-monorepo/commit/0bb5f5fb))
- **graphty-element:** seeded ngraph starts where ngraph itself would ([8e6016e8](https://github.com/graphty-org/graphty-monorepo/commit/8e6016e8))
- **graphty-element:** decline the accelerator for an algorithm below a measured floor ([#386](https://github.com/graphty-org/graphty-monorepo/issues/386))
- **graphty-element:** import the rich text parser without a .ts extension ([df3be69c](https://github.com/graphty-org/graphty-monorepo/commit/df3be69c))
- **graphty-element:** load ids, replace only after a load succeeds, and nodeData replaces ([#49](https://github.com/graphty-org/graphty-monorepo/issues/49), [#50](https://github.com/graphty-org/graphty-monorepo/issues/50), [#110](https://github.com/graphty-org/graphty-monorepo/issues/110), [#198](https://github.com/graphty-org/graphty-monorepo/issues/198))
- **graphty-element:** seeded ngraph and random layouts are reproducible ([#114](https://github.com/graphty-org/graphty-monorepo/issues/114), [#115](https://github.com/graphty-org/graphty-monorepo/issues/115))
- **graphty-element:** size label panels from font metrics ([#128](https://github.com/graphty-org/graphty-monorepo/issues/128))
- **graphty-element:** acceleration policy changes detach, reach status and stop at dispose ([#150](https://github.com/graphty-org/graphty-monorepo/issues/150), [#151](https://github.com/graphty-org/graphty-monorepo/issues/151), [#152](https://github.com/graphty-org/graphty-monorepo/issues/152), [#155](https://github.com/graphty-org/graphty-monorepo/issues/155))
- **graphty-element:** share plugin registries, stop retrying 4xx, cost in work units ([#134](https://github.com/graphty-org/graphty-monorepo/issues/134), [#108](https://github.com/graphty-org/graphty-monorepo/issues/108), [#238](https://github.com/graphty-org/graphty-monorepo/issues/238))
- **graphty-element:** gexf import keeps start, end, spells and timed values ([#109](https://github.com/graphty-org/graphty-monorepo/issues/109))
- **graphty-element:** a paused layout stays paused, and setLayout accepts catalogue ids ([#119](https://github.com/graphty-org/graphty-monorepo/issues/119), [#120](https://github.com/graphty-org/graphty-monorepo/issues/120), [#153](https://github.com/graphty-org/graphty-monorepo/issues/153), [#80](https://github.com/graphty-org/graphty-monorepo/issues/80))
- **algorithms:** pagerank convergence, eigenvector direction, parallel edges, path walks ([#48](https://github.com/graphty-org/graphty-monorepo/issues/48), [#60](https://github.com/graphty-org/graphty-monorepo/issues/60), [#69](https://github.com/graphty-org/graphty-monorepo/issues/69), [#70](https://github.com/graphty-org/graphty-monorepo/issues/70))
- **graphty-element:** release unused style meshes and merge stacked label styles ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#71](https://github.com/graphty-org/graphty-monorepo/issues/71))
- **graphty-element:** dispose the glow layer when no node glows ([#29](https://github.com/graphty-org/graphty-monorepo/issues/29))
- **graphty-element:** batch repaints on load, and await suggested styles and teardown ([#27](https://github.com/graphty-org/graphty-monorepo/issues/27), [#72](https://github.com/graphty-org/graphty-monorepo/issues/72), [#73](https://github.com/graphty-org/graphty-monorepo/issues/73))

### 🔥 Performance

- **graphty-element:** draw arrowheads as instances and keep shader uniforms per scene ([#25](https://github.com/graphty-org/graphty-monorepo/issues/25), [#45](https://github.com/graphty-org/graphty-monorepo/issues/45))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.6
- Updated algorithms to 2.0.4
- Updated layout to 1.10.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.1 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** rasterise label textures on the cpu so every load draws the same pixels ([8c3f6b61](https://github.com/graphty-org/graphty-monorepo/commit/8c3f6b61))
- **graphty-element:** frame the camera after a style pass on its way, not before it ([11bae759](https://github.com/graphty-org/graphty-monorepo/commit/11bae759))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.0 (2026-09-26)

### 🚀 Features

- **graphty-element:** a top-n style selector, used by the app with the element's histogram ([#166](https://github.com/graphty-org/graphty-monorepo/issues/166), [#165](https://github.com/graphty-org/graphty-monorepo/issues/165))

### 🩹 Fixes

- **graphty-element:** yield to the host by time, not every 1,024 elements ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389))
- **graphty-element:** honour startingCameraDistance, camera modes, presets and a floor ([#52](https://github.com/graphty-org/graphty-monorepo/issues/52), [#130](https://github.com/graphty-org/graphty-monorepo/issues/130), [#131](https://github.com/graphty-org/graphty-monorepo/issues/131), [#132](https://github.com/graphty-org/graphty-monorepo/issues/132))
- **graphty-element:** ai runAlgorithm takes options and findNodes has a default limit ([#83](https://github.com/graphty-org/graphty-monorepo/issues/83), [#84](https://github.com/graphty-org/graphty-monorepo/issues/84))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.5 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** refuse a load past the ceiling before touching the graph ([24c37792](https://github.com/graphty-org/graphty-monorepo/commit/24c37792))
- **graphty-element:** decline a load past the render ceiling instead of freezing ([#405](https://github.com/graphty-org/graphty-monorepo/issues/405), [#394](https://github.com/graphty-org/graphty-monorepo/issues/394))
- **graphty-element:** hold the frames while an accelerated run is on the device ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389), [#390](https://github.com/graphty-org/graphty-monorepo/issues/390))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.5

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.4 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** keep the framing box type internal ([c815f158](https://github.com/graphty-org/graphty-monorepo/commit/c815f158))
- **graphty-element:** frame labels again on zoom-to-fit, never on a label edit ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** frame nodes by their size without an extra margin ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** keep the voice adapter's callback types internal ([82fb9dd5](https://github.com/graphty-org/graphty-monorepo/commit/82fb9dd5))
- **graphty-element:** repaint after node removal, frame nodes only, deliver AI events ([#74](https://github.com/graphty-org/graphty-monorepo/issues/74), [#76](https://github.com/graphty-org/graphty-monorepo/issues/76), [#81](https://github.com/graphty-org/graphty-monorepo/issues/81))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.3 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** load large graphs in linear time instead of quadratic ([#388](https://github.com/graphty-org/graphty-monorepo/issues/388))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.2 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** default to a 2:1 block that honours a height, with no minimum ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127))
- **graphty-element:** a default host size, and a warning for rich props set too early ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127), [#79](https://github.com/graphty-org/graphty-monorepo/issues/79))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.4
- Updated @graphty/remote-logger to 1.3.7
- Updated graph-format to 1.0.5
- Updated algorithms to 2.0.3
- Updated layout to 1.9.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.1 (2026-09-25)

### 🩹 Fixes

- **graphty-element:** a label's animation no longer undoes the declutter decision ([cca39906](https://github.com/graphty-org/graphty-monorepo/commit/cca39906))
- **graphty-element:** size the Combined Edge Flow story's arrowheads with edge strength ([e0969765](https://github.com/graphty-org/graphty-monorepo/commit/e0969765))
- **graphty-element:** glow strength per style, and labels no longer overlap ([#129](https://github.com/graphty-org/graphty-monorepo/issues/129), [#5](https://github.com/graphty-org/graphty-monorepo/issues/5))
- **graphty-element:** arrowheads follow the line, diagonals keep width, patterns fill edges ([#122](https://github.com/graphty-org/graphty-monorepo/issues/122), [#124](https://github.com/graphty-org/graphty-monorepo/issues/124), [#126](https://github.com/graphty-org/graphty-monorepo/issues/126))

### 🔥 Performance

- **graphty-element:** label declutter is an option, off by default, and runs only on change ([#5](https://github.com/graphty-org/graphty-monorepo/issues/5))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.0 (2026-09-25)

### 🚀 Features

- **graphty-element:** a query engine and text search behind Explore and edge endpoints ([#51](https://github.com/graphty-org/graphty-monorepo/issues/51), [#3](https://github.com/graphty-org/graphty-monorepo/issues/3))

### 🩹 Fixes

- **graphty-element:** csv import detects tab, semicolon and pipe delimiters, and reads .tsv ([#107](https://github.com/graphty-org/graphty-monorepo/issues/107))
- **graphty-element:** undo, redo and select-all accept Cmd on macOS; the canvas stops taking focus ([#77](https://github.com/graphty-org/graphty-monorepo/issues/77), [#78](https://github.com/graphty-org/graphty-monorepo/issues/78))
- **graphty-element:** the default highlight stands out from default nodes and edges ([#33](https://github.com/graphty-org/graphty-monorepo/issues/33), [#0072](https://github.com/graphty-org/graphty-monorepo/issues/0072))
- **graphty-element:** max flow and min cut check their source and sink ([#116](https://github.com/graphty-org/graphty-monorepo/issues/116))
- **graphty-element:** a node of size 0 draws as the smallest node ([#117](https://github.com/graphty-org/graphty-monorepo/issues/117))
- **graphty:** overlays close pop-outs, layer drags move one layer, runs keep their layers ([#184](https://github.com/graphty-org/graphty-monorepo/issues/184), [#164](https://github.com/graphty-org/graphty-monorepo/issues/164), [#163](https://github.com/graphty-org/graphty-monorepo/issues/163), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#4](https://github.com/graphty-org/graphty-monorepo/issues/4))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.1.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** the WebGPU accelerator proves the device before it is attached ([68d932a4](https://github.com/graphty-org/graphty-monorepo/commit/68d932a4))
- **graphty-element:** turn down an accelerator that computes the wrong answer ([f1d44234](https://github.com/graphty-org/graphty-monorepo/commit/f1d44234))
- **graphty-element:** a GPU can be unavailable because it computes wrong answers ([1f1fde12](https://github.com/graphty-org/graphty-monorepo/commit/1f1fde12))

### 🩹 Fixes

- **graphty-element:** stop reheating a simulation the bridge has just loaded ([6d5257ee](https://github.com/graphty-org/graphty-monorepo/commit/6d5257ee))
- **graphty-element:** let the fake accelerator compute the layout it was asked for ([1af02ff0](https://github.com/graphty-org/graphty-monorepo/commit/1af02ff0))
- **graphty-element:** settle the fake-accelerator stories in five frames, not thirty ([9c5c6a23](https://github.com/graphty-org/graphty-monorepo/commit/9c5c6a23))
- **graphty-element:** know every GPU flag value CI sets, so the config loads on macOS and Windows ([e646d599](https://github.com/graphty-org/graphty-monorepo/commit/e646d599))
- **graphty-element:** spend owed pre-steps a chunk at a time on a simulation ([1a32aa98](https://github.com/graphty-org/graphty-monorepo/commit/1a32aa98))
- **graphty-element:** publish only the device facts a backend actually named ([9d63d5dd](https://github.com/graphty-org/graphty-monorepo/commit/9d63d5dd))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.3
- Updated @graphty/remote-logger to 1.3.6
- Updated graph-format to 1.0.4
- Updated algorithms to 2.0.2
- Updated layout to 1.9.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.0.1 (2026-09-24)

### 🩹 Fixes

- **graphty-element:** install only the dependencies the published build imports ([ddebbcfb](https://github.com/graphty-org/graphty-monorepo/commit/ddebbcfb))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.2
- Updated @graphty/remote-logger to 1.3.5
- Updated graph-format to 1.0.3
- Updated algorithms to 2.0.1
- Updated layout to 1.8.2

### ❤️ Thank You

- Adam Powers @apowers313

# 2.0.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** load-time algorithms can carry run options ([f75d710f](https://github.com/graphty-org/graphty-monorepo/commit/f75d710f))
- **graphty-element:** an eigenvector run that does not converge fails with E_NOT_CONVERGED ([47b116ac](https://github.com/graphty-org/graphty-monorepo/commit/47b116ac))
- **graphty-element:** overflow policy for groups, and size by a run's metric ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050))
- **graphty-element:** research-backed default palettes for measurements and groups ([d1423a36](https://github.com/graphty-org/graphty-monorepo/commit/d1423a36))
- **graphty-element:** publish CHANNEL_DESCRIPTORS so the app stops copying it ([1ee1170d](https://github.com/graphty-org/graphty-monorepo/commit/1ee1170d))
- ⚠️ **graphty-element:** declarative style-channel api and self-sufficient rendering ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
- ⚠️ **graphty-element:** give every limit a name that carries its unit ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
- ⚠️ **graphty-element:** settle the custom element's attributes and events ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
- ⚠️ **graphty-element:** answer from the session what a consumer was computing itself ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
- ⚠️ **graphty-element:** give the layouts edge weights and keep a reader's pins ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
- ⚠️ **graphty-element:** let a file declare its own direction ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
- ⚠️ **graphty-element:** name edge endpoints source and target, and give every edge its own id ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
- ⚠️ **graphty-element:** scope what an algorithm's layer paints, and register palettes ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
- ⚠️ **graphty-element:** make a named camera view something a third party can add ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
- ⚠️ **graphty-element:** move the logger to its own entry point ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
- ⚠️ **graphty-element:** publish the algorithm base classes a plugin needs ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
- ⚠️ **graphty-element:** register palettes, formats, cameras, layouts and log sinks ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
- **graphty-element:** add the error codes the new refusals report ([05631c4f](https://github.com/graphty-org/graphty-monorepo/commit/05631c4f))
- ⚠️ **graphty-element:** delete the old style system ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
- ⚠️ **graphty-element:** derive an algorithm's styling from what its result declares ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
- ⚠️ **graphty-element:** replace evaluated style expressions with declarative layers ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
- ⚠️ **graphty-element:** give selection real sets and add a visibility model ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
- ⚠️ **graphty-element:** make a run an object with an identity, progress and a cost ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
- **graphty-element:** add a headless model that holds the graph ([554f791e](https://github.com/graphty-org/graphty-monorepo/commit/554f791e))
- ⚠️ **graphty-element:** move graph data off the render objects into a store ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
- ⚠️ **graphty-element:** publish a map of entry points, five of them free of a 3D engine ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
- **graphty-element:** own WebGPU detection, attachment and recovery ([6f3842ce](https://github.com/graphty-org/graphty-monorepo/commit/6f3842ce))
- ⚠️ **graphty-element:** publish the catalogue as plain JSON descriptors ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
- **graphty-element:** publish an error model with codes a consumer can switch on ([1416ab30](https://github.com/graphty-org/graphty-monorepo/commit/1416ab30))

### 🩹 Fixes

- **graphty-element:** the picture is not final while a mesh or glow shader is still arriving ([0e1b6304](https://github.com/graphty-org/graphty-monorepo/commit/0e1b6304))
- **graphty-element:** a second registration of the tag warns instead of throwing ([2150334d](https://github.com/graphty-org/graphty-monorepo/commit/2150334d))
- **graphty-element:** forget what a layer painted when the dataset is renumbered ([3f36833d](https://github.com/graphty-org/graphty-monorepo/commit/3f36833d))
- **graphty-element:** each module imports the Babylon augmentations it calls ([c4340504](https://github.com/graphty-org/graphty-monorepo/commit/c4340504))
- **graphty-element:** the picture is not final while a style edit waits to be drawn ([e3769c7f](https://github.com/graphty-org/graphty-monorepo/commit/e3769c7f))
- **graphty-element:** declare the source entry files as side effects ([f895ebda](https://github.com/graphty-org/graphty-monorepo/commit/f895ebda))
- **graphty-element:** only tooltips draw over the graph; labels sort by depth ([095195f8](https://github.com/graphty-org/graphty-monorepo/commit/095195f8))
- **graphty-element:** cost models for louvain and eigenvector, measured on twelve shapes ([41f1d05d](https://github.com/graphty-org/graphty-monorepo/commit/41f1d05d))
- **algorithms:** optimised louvain finds communities on graphs over 50 nodes ([7f66c545](https://github.com/graphty-org/graphty-monorepo/commit/7f66c545))
- **graphty-element:** give closeness its own cost model, and test cost across graph shapes ([4fa6c5b8](https://github.com/graphty-org/graphty-monorepo/commit/4fa6c5b8))
- **graphty-element:** a removed layer takes back everything it painted ([3cf9bdab](https://github.com/graphty-org/graphty-monorepo/commit/3cf9bdab))
- **graphty-element:** hold cost estimates to measured runs, and fix two rates ([dea31006](https://github.com/graphty-org/graphty-monorepo/commit/dea31006))
- **graphty-element:** honour handTracking false, and test real XR sessions ([617ad2aa](https://github.com/graphty-org/graphty-monorepo/commit/617ad2aa))
- **graphty-element:** refuse selectors that ignore the element ([391d1ef3](https://github.com/graphty-org/graphty-monorepo/commit/391d1ef3))
- **graphty-element:** colour the nodes of flow and matching runs, and size encodings ([0d21967b](https://github.com/graphty-org/graphty-monorepo/commit/0d21967b))
- **graphty-element:** build the opening layout in 2D when the graph opens in 2D ([76ca7037](https://github.com/graphty-org/graphty-monorepo/commit/76ca7037))
- **graphty-element:** apply smartOverflow to plain labels ([f8094ed8](https://github.com/graphty-org/graphty-monorepo/commit/f8094ed8))
- **graphty-element:** draw labels and tooltips over edges and nodes ([34bb20f9](https://github.com/graphty-org/graphty-monorepo/commit/34bb20f9))
- **graphty-element:** make the colour helpers total so a repaint cannot abort ([905c390b](https://github.com/graphty-org/graphty-monorepo/commit/905c390b))

### ⚠️ Breaking Changes

- **graphty-element:** declarative style-channel api and self-sufficient rendering ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
  the 1.x StyleManager, calculatedStyle, the StyleHelpers namespace,
  per-algorithm suggestedStyles, EdgeStyle.tooltip, NodeStyle.enabled, EdgeStyle.enabled,
  LabelStyle.maxWidth, LabelStyle.wrap and NodeStyle.effect.outline.width are removed.
  Node and edge appearance is set through style-layer channels.
- **graphty-element:** give every limit a name that carries its unit ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
  `Limits.exactComputationCap` is `Limits.approximateAboveNodes` and
  `Limits.memoryBudgetBytes` is `Limits.graphMemoryBudgetBytes`.
  `CostGateLimits.exactComputationCap` is `CostGateLimits.exactComputationSeconds` and
  `CostGateLimits.memoryBudgetBytes` is `CostGateLimits.runColumnBudgetBytes`.
- **graphty-element:** settle the custom element's attributes and events ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
  the graphty-element-logging, graphty-element-log-level and
  profiling URL parameters are ignored; call configureLogging instead.
  data-loading-progress.nodesLoaded and .edgesLoaded are renamed to
  nodeRecordsLoaded and edgeRecordsLoaded.
- **graphty-element:** answer from the session what a consumer was computing itself ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
  GraphStatistics gains directednessSource and meanDegree. A
  run's per-edge answers are keyed by the element's edge id. Every run, layout
  and export is scoped to what is visible by default, so a run under an active
  filter measures fewer elements than 1.x measured on the same dataset.
- **graphty-element:** give the layouts edge weights and keep a reader's pins ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
  every Kamada-Kawai and ForceAtlas2 arrangement of a graph with
  real weights moves. Node.isPinned() answers the element's own field, so code
  that branched on it and never took the pinned path now can.
- **graphty-element:** let a file declare its own direction ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
  an undirected file loads one edge per file edge rather than a
  mirrored pair, so edge counts halve and every degree, density and centrality
  moves with them.
- **graphty-element:** name edge endpoints source and target, and give every edge its own id ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
  edge records carry source and target, not src and dst. Edge
  ids are element-minted strings, so a selection or scope saved by 1.x matches
  nothing, and there is no translation because the old id was ambiguous. Edge
  counts rise on any multigraph and density, degree and every derived figure rise
  with them. Removing a node emits elements-removed naming the edges that went.
- **graphty-element:** scope what an algorithm's layer paints, and register palettes ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
  the 1.x style template is removed; a look is a StyleDocument
  applied through the style layer API. A layer or document naming an unknown
  palette reports E_UNKNOWN_PALETTE.
- **graphty-element:** make a named camera view something a third party can add ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
  BUILTIN_PRESETS is no longer exported; camera views are
  catalogue data reached through session.catalog. Three ScreenshotErrorCode
  members are removed -- CAMERA_PRESET_NOT_FOUND, CAMERA_PRESET_NOT_AVAILABLE_IN_2D
  and CANNOT_OVERWRITE_BUILTIN_PRESET -- because camera failures are now
  GraphtyErrors carrying E_UNKNOWN_CAMERA, E_UNSUPPORTED and E_PROTECTED.
- **graphty-element:** move the logger to its own entry point ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
  the root barrel no longer exports the 23 logging symbols;
  import them from @graphty/graphty-element/logging. The seven colour-vision
  helpers move to @graphty/graphty-element/schema, beside the palettes whose
  colorblindSafe flag is computed from them.
- **graphty-element:** publish the algorithm base classes a plugin needs ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
  edgeResultId is not published. An endpoint pair is a lookup
  key and not an identity -- it cannot name one of two parallel edges -- so a
  per-edge result row carries the id the element minted for that edge.
- **graphty-element:** register palettes, formats, cameras, layouts and log sinks ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
  session.catalog tables are composed rather than frozen
  built-in arrays, and the descriptor lookups search registrations as well as
  built-ins. OptionsSchema and resolveOptions are deprecated in favour of
  OptionDescriptor[] and resolveOptionValues.
- **graphty-element:** delete the old style system ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
  Styles, StyleManager and the style id types are no longer exported.
- **graphty-element:** derive an algorithm's styling from what its result declares ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
  the pictures seven algorithms draw change, and dimming what an algorithm did not
  select no longer ships with the algorithm. What to do with the elements a result says nothing
  about is a reader's decision, not the algorithm's.
- **graphty-element:** replace evaluated style expressions with declarative layers ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
  calculatedStyle and its expression string are removed, not sandboxed. Anything
  beyond the declared grammar is a registered scale, which is code shipped by a plugin: code stays
  code and layers stay data. Layers are addressed by a stable id rather than by array index, which
  forced the one consumer to write an index reconciliation module and delete highest-index-first;
  one off-by-one there once took the element's own base layer with it. A layer write now validates
  and repaints or rejects, where adding a layer used to be a push and a comment reading "TODO:
  recalculate".
- **graphty-element:** give selection real sets and add a visibility model ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
  the selection surface is two sets rather than a single node, and the element no
  longer writes a selected flag onto algorithm results.
- **graphty-element:** make a run an object with an identity, progress and a cost ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
  results move from a path keyed by namespace and type to one keyed by run id.
  The old path carried no parameters, so one algorithm at two settings wrote to the same place and
  a style layer could not say which it was drawing. Betweenness and closeness now publish the
  graph-level minimum and maximum they withheld, and a convergence flag reports null when it was
  never measured rather than asserting something untrue.
- **graphty-element:** move graph data off the render objects into a store ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
  betweenness centrality returns half what it used to, and the old number was
  wrong. The mesh-to-graph conversion built a directed graph carrying both arcs of every undirected
  edge, so the algorithm never took its undirected branch, where it halves its raw pair counts. On
  a three-node path the middle node scored two where the correct answer is one. Closeness,
  eigenvector and katz are unchanged to the last digit, and the percentage form of betweenness is
  unaffected because a uniform halving leaves a min-max normalisation identical.
- **graphty-element:** publish a map of entry points, five of them free of a 3D engine ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
  the exports map replaces the single entry, and the UMD build is gone. A page
  with a script tag and no installer loads ./bundle, one self-contained file. Sibling packages are
  externalised, so a consumer who installs one of them resolves a single copy rather than getting
  this package's private duplicate with types that do not assign to each other. Sourcemaps leave
  the tarball, which was forty-one megabytes unpacked with twenty-six of it maps.
- **graphty-element:** publish the catalogue as plain JSON descriptors ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
  option schemas cross the package boundary as plain JSON rather than as Zod
  objects. They crossed as Zod before, and the one consumer had to read Zod's private internals in
  two modules to recover a type, a default and a range -- carrying a branch for two Zod versions,
  because the element imported one major while depending on another. Shipping a validation library
  across a boundary made the consumer's version of it part of this package's API.
  Built-in algorithm keys are renamed, and five of twenty-three fold into two: dijkstra,
  bellman-ford and floyd-warshall become shortest-path with a method parameter, and scc becomes
  components with a strength parameter. Each descriptor names the keys it replaces, so a migration
  has one source of truth. Layout names become semantic -- force rather than the name of whichever
  library implements it -- so swapping an implementation stops being a rename a consumer can see.

### 🧱 Updated Dependencies

- Updated algorithms to 2.0.0
- Updated layout to 1.8.1

### ❤️ Thank You

- Adam Powers @apowers313

## 1.10.5 (2026-09-23)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.4

## 1.10.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.3
- Updated algorithms to 1.8.1
- Updated layout to 1.8.0

## 1.10.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated algorithms to 1.8.0

## 1.10.2 (2026-09-20)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.2
- Updated algorithms to 1.7.3
- Updated layout to 1.7.0

## 1.10.1 (2026-09-20)

### 🩹 Fixes

- **graphty-element:** stop rendering the scene twice on every frame ([a414f9dc](https://github.com/graphty-org/graphty-monorepo/commit/a414f9dc))
- **graphty-element:** publish caret ranges for the workspace siblings ([de93a6d2](https://github.com/graphty-org/graphty-monorepo/commit/de93a6d2))

### ❤️ Thank You

- Adam Powers @apowers313

## [1.4.7](https://github.com/graphty-org/graphty-element/compare/v1.4.6...v1.4.7) (2025-12-26)

### Bug Fixes

- fix xr node selection ([0e217d3](https://github.com/graphty-org/graphty-element/commit/0e217d3128db8913cf9cf1818243277e8e29b176))

## [1.4.6](https://github.com/graphty-org/graphty-element/compare/v1.4.5...v1.4.6) (2025-12-26)

### Bug Fixes

- fix api gaps, update documentation ([abbf39b](https://github.com/graphty-org/graphty-element/commit/abbf39b5c01773f66e9dee85e967ac22a1a2cd90))
- fix JS / Lit API parity, expand documentation ([6dd6599](https://github.com/graphty-org/graphty-element/commit/6dd6599f381a9a5f736999394f4e9ca8e436e9b3))

## [1.4.5](https://github.com/graphty-org/graphty-element/compare/v1.4.4...v1.4.5) (2025-12-25)

### Bug Fixes

- fix webllm dynamic import, change default server / port for dev ([323d568](https://github.com/graphty-org/graphty-element/commit/323d568c7e4a7ed9ec7365ff4717885f0939aafc))

## [1.4.4](https://github.com/graphty-org/graphty-element/compare/v1.4.3...v1.4.4) (2025-12-23)

### Bug Fixes

- better web-llm optional dependency handling ([755c7ee](https://github.com/graphty-org/graphty-element/commit/755c7eeade7783600f28090890b65e9ac733177d))
- correct zoom to fit calculations ([c9dc578](https://github.com/graphty-org/graphty-element/commit/c9dc578f9c9bc66e34e0f7d8032e0d4306632f4b))

## [1.4.3](https://github.com/graphty-org/graphty-element/compare/v1.4.2...v1.4.3) (2025-12-23)

### Bug Fixes

- export ai tools from index ([1400374](https://github.com/graphty-org/graphty-element/commit/1400374ac55b0267903ae49d4ff8bfc462ba2853))

## [1.4.2](https://github.com/graphty-org/graphty-element/compare/v1.4.1...v1.4.2) (2025-12-22)

### Bug Fixes

- ai key persistence api ([be2a808](https://github.com/graphty-org/graphty-element/commit/be2a8083e9479327261a2dc5b86c4493e81bb38d))

## [1.4.1](https://github.com/graphty-org/graphty-element/compare/v1.4.0...v1.4.1) (2025-12-21)

### Bug Fixes

- algorithms options export ([e7a7c05](https://github.com/graphty-org/graphty-element/commit/e7a7c05ec70af75df67ef9efd0b4032f69ce542d))

# [1.4.0](https://github.com/graphty-org/graphty-element/compare/v1.3.0...v1.4.0) (2025-12-20)

### Bug Fixes

- 2d, 3d, xr view mode api ([6e9299f](https://github.com/graphty-org/graphty-element/commit/6e9299f5d9823d0b0d0fa37dfe7fb04fa0fa5c13))
- add algorithm options and schemas ([7277f8a](https://github.com/graphty-org/graphty-element/commit/7277f8adbb9429f8da493b180c5c7cf9f99f36f3))

### Features

- add logging ([af4bc9f](https://github.com/graphty-org/graphty-element/commit/af4bc9f5671e71318dcd976432a46100126c8c09))
- add node selection, interaction testing ([4a50004](https://github.com/graphty-org/graphty-element/commit/4a50004e58935c1ad2e8480dcbedd191ece9ce1a))
- schema detection to support LLM interactions ([941e0c9](https://github.com/graphty-org/graphty-element/commit/941e0c95df02574923f4793670623707ea0c3d2c))
- working AI interface MVP ([9e6d228](https://github.com/graphty-org/graphty-element/commit/9e6d228c94951a1edb068fb035ac74ddc15c2eb2))

# [1.3.0](https://github.com/graphty-org/graphty-element/compare/v1.2.4...v1.3.0) (2025-12-15)

### Bug Fixes

- auto detect data format using url contents ([7ede111](https://github.com/graphty-org/graphty-element/commit/7ede111078184f7aa01265db9d771e0856276ef0))
- merge master, fix VR in stories to prevent chromatic errors ([8ef5062](https://github.com/graphty-org/graphty-element/commit/8ef5062545c1468eede826afe2af1bb973d1944c))

### Features

- working and integrated 3D and XR cameras and controls ([6a111fd](https://github.com/graphty-org/graphty-element/commit/6a111fd32625aae1b5b7e78630cdfca0f8271f01))

## [1.2.4](https://github.com/graphty-org/graphty-element/compare/v1.2.3...v1.2.4) (2025-12-13)

### Bug Fixes

- fix exports to support graphty development ([647e474](https://github.com/graphty-org/graphty-element/commit/647e47480309e09ff30299b8220501d1fb6a6048))

## [1.2.3](https://github.com/graphty-org/graphty-element/compare/v1.2.2...v1.2.3) (2025-12-12)

### Bug Fixes

- build and ship typescript types and export default styles ([0ec479c](https://github.com/graphty-org/graphty-element/commit/0ec479cf8f682a75728bf2d458757c591feb21a7))

## [1.2.2](https://github.com/graphty-org/graphty-element/compare/v1.2.1...v1.2.2) (2025-12-09)

### Bug Fixes

- event forwarding ([586b7af](https://github.com/graphty-org/graphty-element/commit/586b7afc2fe754c081aebdc9deda4253d3cbbb28))

## [1.2.1](https://github.com/graphty-org/graphty-element/compare/v1.2.0...v1.2.1) (2025-12-02)

### Bug Fixes

- prevent over enthusiastic tree shaking ([c1e926a](https://github.com/graphty-org/graphty-element/commit/c1e926ab6419968180c22444d13d7196eff7d2da))

# [1.2.0](https://github.com/graphty-org/graphty-element/compare/v1.1.1...v1.2.0) (2025-11-30)

### Bug Fixes

- deterministic outcomes from setting web component properties ([22f3459](https://github.com/graphty-org/graphty-element/commit/22f34595e9b03d8c154a089afc2111b78c629a60))
- finishing details on arrowheads ([6c257b8](https://github.com/graphty-org/graphty-element/commit/6c257b85453ba5f57b626ba5ef9936013c602678))
- fix deterministic rendering for cameras and algorithms, fix other rendering bugs ([b4a5c54](https://github.com/graphty-org/graphty-element/commit/b4a5c541329192180aadac648e9f680027cc3fb6))
- fix diamond pattern line offset ([ee4005d](https://github.com/graphty-org/graphty-element/commit/ee4005d38388e6070071632da3211dd199aa66ee))
- fix merge errors ([8e7168e](https://github.com/graphty-org/graphty-element/commit/8e7168e9c8edf638ab3dcfb42be64d5ea57c4708))
- fix testing includes for vitest ([ca26089](https://github.com/graphty-org/graphty-element/commit/ca2608986d91631bffad8ecff018b0851cb49fc1))
- implement phase 4 of dependency and batching, fix eslint TODOs, fix batching design ([a3dc4d9](https://github.com/graphty-org/graphty-element/commit/a3dc4d9cd86051e4c967a7c082549134c632fbb8))
- implement phase 5 of dependency and batching ([7343935](https://github.com/graphty-org/graphty-element/commit/7343935e6720cf955ae875358ff536dd62ee18a0))
- line rendering bug when switching stories ([b769690](https://github.com/graphty-org/graphty-element/commit/b76969088d33fb6ac599e1a691c48b3c09901016))
- merge resizing fix ([41f565c](https://github.com/graphty-org/graphty-element/commit/41f565c1e09b0c416cae03c63e046402ef14540c))
- working custom line renderer and custom arrowhead with shaders ([92e0709](https://github.com/graphty-org/graphty-element/commit/92e0709c6d9cb657de18176323c842cd604d8d0e))

### Features

- add dependency ordering and batching when setting web component properties ([fe17935](https://github.com/graphty-org/graphty-element/commit/fe17935b06816957cfa29e39112033c1861b7074))
- add name to style layers to support UI ([4d1ea0e](https://github.com/graphty-org/graphty-element/commit/4d1ea0e8012f09d5985c6e9a0ae83cce43fad79d))
- add performance profiling, edge performance enhancements, arrowheads are wip ([be33939](https://github.com/graphty-org/graphty-element/commit/be3393997dc33cc5dcd99910b2600df8f8b0a7ef))
- add various formats for loading data ([deed260](https://github.com/graphty-org/graphty-element/commit/deed260b7e5c13be86265d9b6c0d3f13dadac106))
- algorithm suggested styles and style helpers ([8f5f758](https://github.com/graphty-org/graphty-element/commit/8f5f7587a132215f6e548f766a8c22c021ddf49e))
- comprehensive set of data loaders ([9d489f5](https://github.com/graphty-org/graphty-element/commit/9d489f58b061a4e457c91d18554aae0a355e2ba1))
- new edge styles and arrowheads ([652d660](https://github.com/graphty-org/graphty-element/commit/652d6603eaed4a8fc4c41a50210b2a2a6889456e))
- patterned line styles ([55af883](https://github.com/graphty-org/graphty-element/commit/55af883367940130e2c67b28fa17b92f3d6cbd5a))
- screen capture and video capture ([1a0d5cf](https://github.com/graphty-org/graphty-element/commit/1a0d5cfca614fa2f8b55ee3e2502ffbd084e74f7))
- working data loaders ([b6dd9e9](https://github.com/graphty-org/graphty-element/commit/b6dd9e95799009dde377aa9bd5907863f9bc9570))
- working new arrowheads ([eac7fbf](https://github.com/graphty-org/graphty-element/commit/eac7fbf25326be7e1153bf4661f00eeae7fb1a3a))

## [1.1.1](https://github.com/graphty-org/graphty-element/compare/v1.1.0...v1.1.1) (2025-10-24)

### Bug Fixes

- implement phase 1 of dependency and batching to prevent race conditions ([443f18a](https://github.com/graphty-org/graphty-element/commit/443f18ae951f8db6fb6c0aaf3e082f614494a005))

# [1.1.0](https://github.com/graphty-org/graphty-element/compare/v1.0.5...v1.1.0) (2025-10-24)

### Features

- add fixed layout ([3208b22](https://github.com/graphty-org/graphty-element/commit/3208b222143513e8411f54a69a4dac03bf4f25cf))

## [1.0.5](https://github.com/graphty-org/graphty-element/compare/v1.0.4...v1.0.5) (2025-07-28)

### Bug Fixes

- 3d layout for circular ([c15a87a](https://github.com/graphty-org/graphty-element/commit/c15a87a57a90d4cb14c08255fd4f2638d636ac27))
- 3d layout for kamada kawai ([2b17c9b](https://github.com/graphty-org/graphty-element/commit/2b17c9b30a3fff8cc878ea0bd4c7653a83e2f34e))
- change shape names in config, fix build ([b3c2253](https://github.com/graphty-org/graphty-element/commit/b3c2253a73536439a85903cb0a208583a57c51ab))
- ensure center agrument to layouts supports 3d ([b14ea88](https://github.com/graphty-org/graphty-element/commit/b14ea88df7284fa5879f62aa2639fa0816ec04fc))
- fix build rollup, fix chromatic testing ([ba6a1db](https://github.com/graphty-org/graphty-element/commit/ba6a1dbbe6aa2141bf5f20f91bf738a5011370ae))
- fix camera zoom when layout settles ([ce7d6fc](https://github.com/graphty-org/graphty-element/commit/ce7d6fc8098f3b7828aa48995a128ef439bc17bd))
- fix orbit camera zoom while layout settles ([4d4d73f](https://github.com/graphty-org/graphty-element/commit/4d4d73f7c26b76bd0f338283326fcb3e4b063d85))

## [1.0.4](https://github.com/graphty-org/graphty-element/compare/v1.0.3...v1.0.4) (2025-07-15)

### Bug Fixes

- fix npm provenance ([922edf5](https://github.com/graphty-org/graphty-element/commit/922edf5a13a1108457adfa9a2b6d2dc225cb95ae))

## [1.0.3](https://github.com/graphty-org/graphty-element/compare/v1.0.2...v1.0.3) (2025-07-15)

### Bug Fixes

- provenance for semantic release ([0785f04](https://github.com/graphty-org/graphty-element/commit/0785f04c660a740682c7a420a658e01df25c0d07))

## [1.0.2](https://github.com/graphty-org/graphty-element/compare/v1.0.1...v1.0.2) (2025-07-15)

### Bug Fixes

- allow side-effects to that the web component automatically gets registered ([b8f1e90](https://github.com/graphty-org/graphty-element/commit/b8f1e9048475aa6dca3d967ce1a86e717a101e91))

## [1.0.1](https://github.com/graphty-org/graphty-element/compare/v1.0.0...v1.0.1) (2025-07-15)

### Bug Fixes

- semantic release (take 3) ([f603c55](https://github.com/graphty-org/graphty-element/commit/f603c55ee25bd5725baea63c0724784cf7187363))

# 1.0.0 (2025-07-15)

### Bug Fixes

- build and optional argument fixes ([26a1ef6](https://github.com/graphty-org/graphty-element/commit/26a1ef6323a8aadb280fe4f0d9c3b66217846dc7))
- **config:** fix default config parsing ([dbaa610](https://github.com/graphty-org/graphty-element/commit/dbaa610a9aab497f081899315bad540c9eaf9ecd))
- **config:** fix label default values ([3b4f3bb](https://github.com/graphty-org/graphty-element/commit/3b4f3bb0f5af6ddad4638dc471ef07a3e1b46b14))
- correct edge-node connection gaps and enable label animation ([1a82a09](https://github.com/graphty-org/graphty-element/commit/1a82a090c045f4353bf78296426abdeb621d79c5)), closes [#35](https://github.com/graphty-org/graphty-element/issues/35) [#27](https://github.com/graphty-org/graphty-element/issues/27)
- **edge:** fix edge styling and caching ([7749c50](https://github.com/graphty-org/graphty-element/commit/7749c506567222427b7fe8973211bd97db956935))
- **edge:** fix typo in color ([e9497f7](https://github.com/graphty-org/graphty-element/commit/e9497f7f66057a47bd17d49eb0fbeec19cba9a0c))
- **element:** fix async firstUpdate ([3d74616](https://github.com/graphty-org/graphty-element/commit/3d7461608e90ebb805164afdbb80938962a08b63)), closes [#24](https://github.com/graphty-org/graphty-element/issues/24) [#15](https://github.com/graphty-org/graphty-element/issues/15)
- fix arrows, fix storybook build, fix chromatic visual tests, fix spiral ([e12e82a](https://github.com/graphty-org/graphty-element/commit/e12e82a6e7fc2f8c7c8d478f89d073e5861bd732))
- fix bugs caused by delinting ([bf9a250](https://github.com/graphty-org/graphty-element/commit/bf9a25069ae1d2b08eb4867fdf796605d10fae22))
- fix calculated values ([b324b7e](https://github.com/graphty-org/graphty-element/commit/b324b7e483b61c1874c94ae4a7a145b052181e2b))
- fix claude code notifications, make them global across all projects ([250899e](https://github.com/graphty-org/graphty-element/commit/250899ed3147400a5258ee907c79cd368507ea98))
- fix flipping when starting two finger gesture ([ad7a525](https://github.com/graphty-org/graphty-element/commit/ad7a5258599c9a9135b7c6cfb797bc4c788c9083))
- fix initial camera zoom for 2D ([9155d6a](https://github.com/graphty-org/graphty-element/commit/9155d6ac58faa30c3cea3a6b53f71b70c17c90d3))
- fix label background gradient ([16a7dad](https://github.com/graphty-org/graphty-element/commit/16a7dadeb2bbd365d60823c34fddc0151196ba1b))
- fix package names for semantic release ([91e0adf](https://github.com/graphty-org/graphty-element/commit/91e0adf55ba42208b2f47a17e0bf7df14829fd4b))
- fix semantic release, refactor edge, node, and richtextlabel to use their config objects ([e6e22a7](https://github.com/graphty-org/graphty-element/commit/e6e22a76b774f24e20a605cfe7b7da9024cfb021))
- fix typescript errors for 'any' ([3b78721](https://github.com/graphty-org/graphty-element/commit/3b78721aa2a40707563a3d36b1deac0fe3f44264))
- **graph:** fix async handling ([f93266c](https://github.com/graphty-org/graphty-element/commit/f93266cb6e18751680e5fd5d4a5aca3d5f8c1489))
- **graphty:** fix hanging promise when handling propperties ([7c799ff](https://github.com/graphty-org/graphty-element/commit/7c799fffd9fb685a607147fd73e1b7e94a1e76fd))
- **layout:** fix 2D layouts and stories to only render in 2D ([d4927af](https://github.com/graphty-org/graphty-element/commit/d4927afc974f5a23cd8c65f0866ef9c28321e726)), closes [#17](https://github.com/graphty-org/graphty-element/issues/17)
- **layout:** fix 3d layouts ([e7a962e](https://github.com/graphty-org/graphty-element/commit/e7a962eeb65ba79c1ea598bf0283d86fcc5b579d))
- **node:** fix node labels and behavior, add storybook stories for labels and wireframes ([bbce06a](https://github.com/graphty-org/graphty-element/commit/bbce06a69d5a74911afc228c39c35ea88e602a48)), closes [#21](https://github.com/graphty-org/graphty-element/issues/21) [#22](https://github.com/graphty-org/graphty-element/issues/22)
- **node:** fix node style updates ([a947def](https://github.com/graphty-org/graphty-element/commit/a947def8b7b72daf23fc3befd46ddff1d9406e7c))
- prevent label crashes with large fontSize values and improve type safety ([b28b5e6](https://github.com/graphty-org/graphty-element/commit/b28b5e60b63dde957222eca2522192f63685356e))
- remove P0 memory leaks ([dacaf8b](https://github.com/graphty-org/graphty-element/commit/dacaf8b18f1d3cb5aea20f0125b8fdcb36a14ec5))
- rename graphty canvas element ([40e4d85](https://github.com/graphty-org/graphty-element/commit/40e4d85524b9e6890221ec8de0049c16ce444126))
- semantic release ([df9ed11](https://github.com/graphty-org/graphty-element/commit/df9ed11af4e55aa29e0f1c9b7723b67052a5020f))
- semantic release ([985a12e](https://github.com/graphty-org/graphty-element/commit/985a12e89a0567629239275f5fec7aa05d5f3464))
- semantic release should only run 'npm run test' for now ([d4e8dec](https://github.com/graphty-org/graphty-element/commit/d4e8dec0e25ac2b9f6310ba46465b0e199506fe2))
- **style:** fix graph skybox rotation. close [#37](https://github.com/graphty-org/graphty-element/issues/37) ([dc3ebbd](https://github.com/graphty-org/graphty-element/commit/dc3ebbdf272879eab00cab83fc54302d7b1252d9))
- **style:** fix style layering ([9a64041](https://github.com/graphty-org/graphty-element/commit/9a6404156ca85c602f41fd277a7be0e8a56b2d6a))

### Features

- add 2d node style ([6eddc59](https://github.com/graphty-org/graphty-element/commit/6eddc59f4bdcddad55fa931c986c56be42f6fb66))
- add calculated styles for nodes ([7acb622](https://github.com/graphty-org/graphty-element/commit/7acb62270d50db3ab41686d57e7e06b99dda8986))
- add calculated values ([a2daa05](https://github.com/graphty-org/graphty-element/commit/a2daa05459fd9c7ea3b44d91bda0e4e407760ae9))
- add layout support from styleTemplate and fix multipartite story rendering ([6704bda](https://github.com/graphty-org/graphty-element/commit/6704bda7ebcd1e0ab443ed044df9f17dba0e619a)), closes [#19](https://github.com/graphty-org/graphty-element/issues/19)
- add rich text label ([97baf9d](https://github.com/graphty-org/graphty-element/commit/97baf9db269b67647d943e2ccb307bf3c8508ca3))
- add rich text labels and associated stories (wip) ([4d374b6](https://github.com/graphty-org/graphty-element/commit/4d374b69f3d67bad658b018107bc312d7b711449))
- add schema parsing and conversion to calculated values ([3e6512c](https://github.com/graphty-org/graphty-element/commit/3e6512c570efb83df7f4f9f0834ff4824a7c11f0))
- add working 2D camera, camera manager ([d599847](https://github.com/graphty-org/graphty-element/commit/d599847440a3e0f11a8f59cceaed5ae0ffc47621))
- **algorithm:** add algorithm api, add node degree algorithm and corresponding test ([01f8b94](https://github.com/graphty-org/graphty-element/commit/01f8b9498ec75a216c3a6d0b37304c4dfc2e1681)), closes [#14](https://github.com/graphty-org/graphty-element/issues/14)
- **edge:** add edge id ([e7b7a30](https://github.com/graphty-org/graphty-element/commit/e7b7a30d822d830ccbeee3d0944400d35c204ede))
- **graph:** add background color, add skybox ([94a52f7](https://github.com/graphty-org/graphty-element/commit/94a52f77ed1e16bad89ec0bfa922459437f5f46d))
- **graph:** add orbit controller with mouse, touch, and keyboard inputs and without gimbal lock ([24f24f4](https://github.com/graphty-org/graphty-element/commit/24f24f4ecd755b7078ec1c663f6a26c9911aa6b0))
- **graph:** add zoom on initial layout ([16f59cd](https://github.com/graphty-org/graphty-element/commit/16f59cd5d30c3ac103a3c8fbea594634bfe3175e))
- **graph:** add zoom-to-fit for initial layouts ([27c7016](https://github.com/graphty-org/graphty-element/commit/27c701651dcfe8dd3172b13d6d5c33cc2d01e46b)), closes [#6](https://github.com/graphty-org/graphty-element/issues/6) [#3](https://github.com/graphty-org/graphty-element/issues/3)
- **graph:** remove initial graph config options ([1bc6c26](https://github.com/graphty-org/graphty-element/commit/1bc6c26ad78a72e9086b0859e95799df27e33318)), closes [#23](https://github.com/graphty-org/graphty-element/issues/23)
- **graph:** silence babylonjs logs ([b53e8be](https://github.com/graphty-org/graphty-element/commit/b53e8beb4cdc5bf7c2f3f3e9116c0620f4e623a0))
- implement flexible layout dimension configuratio ([f6a2bad](https://github.com/graphty-org/graphty-element/commit/f6a2bad3be1f8747d95d5bca4bd8027923c8fe6d))
- **layout:** add arf and spectral layouts ([b573e36](https://github.com/graphty-org/graphty-element/commit/b573e363e6145528bf86c0fa69a432ba6fdac4f2))
- **layout:** add bfs layout, fix layout options ([3b4af6f](https://github.com/graphty-org/graphty-element/commit/3b4af6f3707cfe8a0e783b3ca8518facb96fe2db))
- **layout:** add bipartite and multipartite layouts ([30feb74](https://github.com/graphty-org/graphty-element/commit/30feb74a417830df2032a5fad3291d34b29388cb))
- **layout:** add forceatlas2 layout ([8cd570b](https://github.com/graphty-org/graphty-element/commit/8cd570b2845add320ca9b8d91a699251183a50e4))
- **layout:** add more sensible layout defaults ([6fa6583](https://github.com/graphty-org/graphty-element/commit/6fa65838cc24dbb11141d5451ed6b077abb0bd87))
- **style:** add 2d node style ([9c19704](https://github.com/graphty-org/graphty-element/commit/9c197048802717e6a3404e7249a0d403752b1f77))
- **styles:** add edge inheritance, add styles to web component ([2f600bc](https://github.com/graphty-org/graphty-element/commit/2f600bc04d5da288f1398b8d2e7538400e187072))
- **styles:** add style inheritance, other refactoring ([f4d80e8](https://github.com/graphty-org/graphty-element/commit/f4d80e8b3b17f60680e1d9a19fa045af6ee18051)), closes [#1](https://github.com/graphty-org/graphty-element/issues/1)
- **style:** update default styles ([b44114b](https://github.com/graphty-org/graphty-element/commit/b44114b28c57f71577422074349af46d79a515c3))
