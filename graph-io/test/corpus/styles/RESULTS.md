# Style corpus results

Written by `test/styles/harness.test.ts`, which fails when this file differs from what the inputs give now;
rerun it with `-u` to accept a change after reviewing it. One row per input: whether it imported, its
elements, the rules its styles plan to per target, and three measures of how readable the rules are. Varying
values are those that differ from their property's most common value; opaque ones come from a rule that only
copies values (an unexplained passthrough or the exceptions), exception ones from the exceptions rule alone.
Tool values are elements drawn with the writing program's default.

454 inputs, 451 with styles; at most 15 node and 16 edge rules.

| Input | Import | Nodes | Edges | Node rules | Edge rules | Varying | Opaque | Exceptions | Approximated | Tool values | Declared selecting nothing | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cx/fidelity/ddram.cx | ok | 109 | 142 | 7 | 5 | 318 | 61% | 59% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/lianhe-affiliation.cx.gz | ok | 244 | 388 | 5 | 5 | 289 | 29% | 29% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/nci-pid-rhoa.cx | ok | 48 | 63 | 4 | 6 | 159 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/polygenic-sle.cx.gz | ok | 127 | 497 | 6 | 3 | 980 | 0% | 0% | 0 | 127 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_NOT_CARRIED |
| cx/fidelity/radiation-bibliography.cx.gz | ok | 188 | 207 | 4 | 6 | 461 | 1% | 1% | 0 | 0 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_NOT_CARRIED |
| cx/fidelity/repro-locked-own-size.cx | ok | 12 | 12 | 5 | 2 | 22 | 82% | 82% | 0 | 228 | 0 |  |
| cx/fidelity/repro-unplaced-boxes.cx | ok | 24 | 29 | 3 | 2 | 0 | - | - | 0 | 458 | 0 |  |
| cx/fidelity/syn-bypass.cx | ok | 64 | 90 | 4 | 4 | 203 | 100% | 96% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/syn-mappings.cx | ok | 96 | 140 | 10 | 9 | 1517 | 27% | 27% | 0 | 0 | 0 | W_STYLE_BAD_MAPPING, W_STYLE_NOT_CARRIED |
| cx/generated/graphty-written-block-other-graph.cx | ok | 75 | 108 | 8 | 3 | 102 | 8% | 8% | 0 | 75 | 0 | W_STYLE_BLOCK_IGNORED |
| cx/generated/graphty-written-block-truncated.cx | ok | 75 | 108 | 8 | 3 | 102 | 8% | 8% | 0 | 75 | 0 | W_STYLE_BLOCK_IGNORED |
| cx/generated/graphty-written-native-edit.cx | ok | 75 | 108 | 7 | 3 | 103 | 9% | 9% | 0 | 0 | 0 |  |
| cx/generated/graphty-written.cx | ok | 75 | 108 | 6 | 3 | 102 | 8% | 8% | 0 | 0 | 0 |  |
| cx/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx.gz | ok | 32 | 48 | 5 | 3 | 92 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx | ok | 75 | 108 | 6 | 3 | 102 | 8% | 8% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx.gz | ok | 2207 | 2282 | 1 | 1 | 0 | - | - | 0 | 65053 | 0 |  |
| cx/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx.gz | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/imatinib-smpdb.cx2 | ok | 75 | 159 | 6 | 6 | 403 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/repro-shared-interaction.cx2 | ok | 16 | 16 | 3 | 3 | 32 | 0% | 0% | 0 | 240 | 0 |  |
| cx2/fidelity/signor-aml.cx2 | ok | 147 | 306 | 4 | 9 | 748 | 12% | 12% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/syn-bypass.cx2 | ok | 64 | 90 | 4 | 4 | 277 | 100% | 100% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/syn-mappings.cx2 | ok | 96 | 140 | 10 | 9 | 1589 | 26% | 26% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/synthetic-lethal.cx2 | ok | 69 | 152 | 7 | 4 | 365 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/u2os-hierarchy.cx2 | ok | 82 | 84 | 5 | 2 | 134 | 0% | 0% | 0 | 84 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/us-returned-students.cx2 | ok | 170 | 491 | 3 | 4 | 0 | - | - | 0 | 0 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_NOT_CARRIED |
| cx2/fidelity/wp1449-tlr.cx2 | ok | 280 | 159 | 13 | 8 | 994 | 48% | 48% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/generated/graphty-written-block-other-graph.cx2 | ok | 599 | 739 | 8 | 2 | 580 | 83% | 83% | 0 | 599 | 0 | W_STYLE_BLOCK_IGNORED |
| cx2/generated/graphty-written-block-truncated.cx2 | ok | 599 | 739 | 8 | 2 | 580 | 83% | 83% | 0 | 599 | 0 | W_STYLE_BLOCK_IGNORED |
| cx2/generated/graphty-written-native-edit.cx2 | ok | 599 | 739 | 6 | 2 | 581 | 83% | 83% | 0 | 0 | 0 |  |
| cx2/generated/graphty-written.cx2 | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 0 | 0 |  |
| cx2/generated/mapping-edges.cx2 | ok | 200 | 100 | 8 | 2 | 437 | 11% | 11% | 0 | 3251 | 0 | W_STYLE_BAD_VALUE, W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_UNKNOWN_VALUE |
| cx2/ndex-1014623d-c2e0-11f1-be0a-005056ae3c32.cx2.gz | ok | 821 | 1046 | 6 | 4 | 2060 | 15% | 15% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-440c8958-1dd0-11ef-9621-005056ae23aa.cx2.gz | ok | 2718 | 4820 | 6 | 3 | 1997 | 5% | 5% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx2.gz | ok | 32 | 48 | 5 | 3 | 92 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2 | ok | 75 | 108 | 6 | 3 | 102 | 8% | 8% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-a2d9d91b-b1dc-11ec-b3be-0ac135e8bacf.cx2.gz | ok | 468 | 1713 | 4 | 3 | 1866 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx2.gz | ok | 2207 | 2282 | 1 | 1 | 0 | - | - | 0 | 65053 | 0 |  |
| cx2/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2 | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 36000 | 0 |  |
| cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 13 | 7 | 776 | 0% | 0% | 0 | 7292 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 625 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2375 | 0% | 0% | 0 | 5610 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2452 | 0% | 0% | 0 | 5599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-10.cyjs | ok | 400 | 0 | 11 | 1 | 236 | 0% | 0% | 0 | 5214 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-160.cyjs | ok | 400 | 0 | 15 | 1 | 97 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-20.cyjs | ok | 400 | 0 | 15 | 1 | 236 | 0% | 0% | 0 | 5203 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-40.cyjs | ok | 400 | 0 | 15 | 1 | 237 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-5.cyjs | ok | 400 | 0 | 6 | 1 | 209 | 0% | 0% | 0 | 5252 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-80.cyjs | ok | 400 | 0 | 15 | 1 | 192 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-10.cyjs | ok | 400 | 0 | 11 | 1 | 665 | 0% | 0% | 0 | 4475 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-160.cyjs | ok | 400 | 0 | 15 | 1 | 692 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-20.cyjs | ok | 400 | 0 | 15 | 1 | 659 | 0% | 0% | 0 | 4427 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-40.cyjs | ok | 400 | 0 | 15 | 1 | 623 | 0% | 0% | 0 | 4405 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-5.cyjs | ok | 400 | 0 | 6 | 1 | 558 | 0% | 0% | 0 | 4607 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-80.cyjs | ok | 400 | 0 | 15 | 1 | 521 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/all-30.cyjs | ok | 400 | 0 | 15 | 1 | 1081 | 0% | 0% | 0 | 2999 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/all-300.cyjs | ok | 400 | 0 | 15 | 1 | 1151 | 0% | 0% | 0 | 2800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-30.cyjs | ok | 400 | 0 | 15 | 1 | 283 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-300.cyjs | ok | 400 | 0 | 15 | 1 | 174 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bc-30.cyjs | ok | 400 | 0 | 15 | 1 | 539 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bc-300.cyjs | ok | 400 | 0 | 15 | 1 | 497 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bg-30.cyjs | ok | 400 | 0 | 15 | 1 | 539 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bg-300.cyjs | ok | 400 | 0 | 15 | 1 | 497 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-col-fs-30.cyjs | ok | 400 | 0 | 15 | 1 | 174 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-col-fs-300.cyjs | ok | 400 | 0 | 15 | 1 | 250 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-lab-30.cyjs | ok | 400 | 0 | 15 | 1 | 176 | 0% | 0% | 0 | 5206 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-lab-300.cyjs | ok | 400 | 0 | 15 | 1 | 257 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-shape-30.cyjs | ok | 400 | 0 | 15 | 1 | 278 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-shape-300.cyjs | ok | 400 | 0 | 15 | 1 | 488 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-w-30.cyjs | ok | 400 | 0 | 15 | 1 | 403 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-w-300.cyjs | ok | 400 | 0 | 15 | 1 | 547 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bc-then-bcbg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bg-then-bgop.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bg-then-bgw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-default-then-class.cyjs | ok | 9 | 0 | 4 | 1 | 6 | 0% | 0% | 0 | 96 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-size-default-then-class-color.cyjs | ok | 9 | 0 | 3 | 1 | 6 | 0% | 0% | 0 | 105 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-two-classes.cyjs | ok | 9 | 0 | 4 | 1 | 3 | 0% | 0% | 0 | 116 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/eq-sel.cyjs | ok | 4 | 0 | 2 | 1 | 0 | - | - | 0 | 48 | 0 |  |
| cyjs/adv6/fo-then-fobg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/op-then-bg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/op-then-opw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/shape-then-shapebg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/size-then-sizebg-wonly.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/size-then-sizebg.cyjs | ok | 4 | 0 | 3 | 1 | 2 | 0% | 0% | 0 | 48 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/three-rules.cyjs | ok | 4 | 0 | 4 | 1 | 2 | 0% | 0% | 0 | 50 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/two-rules.cyjs | ok | 4 | 0 | 3 | 1 | 0 | - | - | 0 | 52 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 16 | 308 | 1% | 1% | 0 | 887 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 6 | 5 | 23 | 43% | 43% | 0 | 1991 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 11 | 6 | 96 | 10% | 10% | 0 | 1759 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| cys/BasicDataVizDemo.cys | ok | 249 | 299 | 3 | 4 | 1 | 100% | 100% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/STELZL.cys | ok | 1603 | 3308 | 3 | 4 | 185 | 100% | 100% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-AnnotationExample.cys | ok | 330 | 359 | 6 | 4 | 728 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-layout-v1.cys | ok | 331 | 362 | 3 | 6 | 112 | 1% | 1% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/affinity-purification.cys | ok | 471 | 917 | 6 | 3 | 134 | 28% | 28% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/galfiltered.cys | ok | 330 | 359 | 6 | 4 | 728 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/import-and-save.cys | ok | 30 | 137 | 4 | 9 | 350 | 17% | 17% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/luad-vest-v2.cys | ok | 26 | 25 | 6 | 5 | 13 | 0% | 0% | 0 | 0 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_OTHER_STYLES |
| cys/fidelity/syn-bypass.cys | ok | 63 | 86 | 4 | 4 | 181 | 100% | 97% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/syn-mappings.cys | ok | 96 | 140 | 10 | 9 | 1517 | 27% | 27% | 0 | 0 | 0 | W_STYLE_BAD_MAPPING, W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/generated/graphty-written-block-other-graph.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 45 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-block-truncated.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 45 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-native-edit.cys | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| cys/generated/graphty-written.cys | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| dot/ArthurConmy_Automatic-Circuit-Discovery__layout.gv | ok | 108 | 926 | 4 | 3 | 80 | 100% | 0% | 0 | 7022 | 0 | W_STYLE_BAD_VALUE, W_STYLE_HTML_LABEL, W_STYLE_NOT_CARRIED |
| dot/DynamicalSystemsGroup_cats__cats_pkg.gv | ok | 456 | 1003 | 6 | 4 | 1068 | 0% | 0% | 0 | 10746 | 0 | W_STYLE_HTML_LABEL |
| dot/Ensembl_ensembl-hive__long_mult_jobs_04.dot | ok | 18 | 20 | 8 | 7 | 27 | 22% | 22% | 0 | 273 | 0 | W_STYLE_HTML_LABEL, W_STYLE_UNKNOWN_VALUE |
| dot/damoqiongqiu_NiceFish__dependencies.dot | ok | 126 | 75 | 6 | 5 | 60 | 12% | 12% | 0 | 1739 | 0 |  |
| dot/decentraland_architecture__architecture.dot | ok | 53 | 72 | 7 | 8 | 11 | 9% | 9% | 0 | 766 | 0 | W_STYLE_HTML_LABEL |
| dot/fidelity/real-crazy.gv | ok | 41 | 49 | 4 | 2 | 78 | 100% | 0% | 0 | 728 | 0 |  |
| dot/fidelity/real-depcruise.gv | ok | 115 | 652 | 6 | 5 | 226 | 91% | 59% | 0 | 1763 | 0 | W_STYLE_HTML_LABEL, W_STYLE_UNKNOWN_VALUE |
| dot/fidelity/real-happiness.gv | ok | 78 | 77 | 10 | 3 | 1 | 100% | 0% | 0 | 1056 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNFILLED |
| dot/fidelity/real-linux-kernel.gv | ok | 65 | 68 | 4 | 6 | 237 | 81% | 0% | 0 | 430 | 0 | W_STYLE_UNFILLED |
| dot/fidelity/real-siblings.gv | ok | 200 | 284 | 7 | 2 | 157 | 0% | 0% | 0 | 4156 | 0 |  |
| dot/fidelity/real-softmaint.gv | ok | 213 | 269 | 6 | 3 | 202 | 0% | 0% | 0 | 3441 | 0 |  |
| dot/fidelity/synth-edges-clusters.gv | ok | 80 | 102 | 9 | 7 | 149 | 70% | 26% | 0 | 1111 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_COLOR_LIST, W_STYLE_GRADIENT, W_STYLE_HTML_LABEL, W_STYLE_NOT_CARRIED, W_STYLE_RECORD_LABEL, W_STYLE_UNKNOWN_VALUE |
| dot/fidelity/synth-nodes.gv | ok | 106 | 109 | 5 | 3 | 160 | 100% | 0% | 0 | 1378 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_GRADIENT, W_STYLE_HTML_LABEL, W_STYLE_NOT_CARRIED, W_STYLE_RECORD_LABEL, W_STYLE_UNFILLED, W_STYLE_UNKNOWN_VALUE |
| dot/generated/clusters-200.gv | ok | 1200 | 0 | 5 | 1 | 995 | 0% | 0% | 0 | 11800 | 0 |  |
| dot/generated/clusters-40.gv | ok | 160 | 39 | 4 | 2 | 117 | 0% | 0% | 0 | 1911 | 0 |  |
| dot/generated/colors-and-scopes.gv | ok | 33 | 3 | 4 | 5 | 49 | 100% | 2% | 0 | 288 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_BAD_VALUE, W_STYLE_COLOR_LIST, W_STYLE_GRADIENT, W_STYLE_HTML_LABEL, W_STYLE_UNKNOWN_VALUE |
| dot/generated/graphty-written.gv | ok | 75 | 131 | 5 | 7 | 273 | 8% | 0% | 0 | 75 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| dot/generated/random-100.gv | ok | 100 | 100 | 4 | 6 | 502 | 90% | 0% | 0 | 1281 | 0 |  |
| dot/generated/random-1000.gv | ok | 1000 | 1000 | 4 | 6 | 5209 | 90% | 0% | 0 | 12805 | 0 |  |
| dot/generated/random-10000.gv.gz | ok | 10000 | 10000 | 4 | 6 | 52057 | 90% | 0% | 0 | 127999 | 0 |  |
| dot/generated/tamper-block-truncated.gv | ok | 75 | 131 | 5 | 7 | 149 | 0% | 0% | 0 | 1478 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| dot/generated/tamper-native-edited.gv | ok | 75 | 131 | 6 | 7 | 273 | 8% | 0% | 0 | 75 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| dot/generated/tamper-node-added.gv | ok | 76 | 131 | 5 | 7 | 149 | 0% | 0% | 0 | 1489 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| dot/graphviz-gallery-directed-bazel.gv | ok | 8 | 15 | 3 | 3 | 0 | - | - | 0 | 192 | 0 |  |
| dot/graphviz-gallery-directed-go-package.gv | ok | 20 | 49 | 5 | 3 | 0 | - | - | 0 | 572 | 0 |  |
| dot/graphviz-gallery-directed-lion_share.gv | ok | 47 | 51 | 8 | 4 | 82 | 1% | 1% | 0 | 571 | 0 |  |
| dot/graphviz-gallery-directed-neural-network.gv | ok | 10 | 9 | 4 | 3 | 0 | - | - | 0 | 152 | 0 | W_STYLE_RECORD_LABEL |
| dot/graphviz-gallery-directed-ninja.gv | ok | 125 | 131 | 5 | 7 | 12 | 0% | 0% | 0 | 1526 | 0 |  |
| dot/graphviz-gallery-directed-profile.gv | ok | 61 | 85 | 4 | 4 | 42 | 0% | 0% | 0 | 1084 | 0 |  |
| dot/graphviz-gallery-directed-sdh.gv | ok | 75 | 131 | 5 | 7 | 170 | 0% | 0% | 0 | 1457 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| dot/graphviz-gallery-gradient-colors.gv | ok | 28 | 3 | 4 | 3 | 38 | 100% | 0% | 0 | 244 | 0 | W_STYLE_GRADIENT |
| dot/graphviz-gallery-gradient-g_c_n.gv | ok | 2 | 0 | 5 | 1 | 1 | 100% | 0% | 0 | 15 | 0 | W_STYLE_GRADIENT |
| dot/graphviz-gallery-neato-colors.gv | ok | 13 | 21 | 4 | 5 | 28 | 43% | 0% | 0 | 164 | 0 | W_STYLE_ALPHA_DROPPED |
| dot/graphviz-gallery-neato-philo.gv | ok | 21 | 27 | 6 | 3 | 9 | 0% | 0% | 0 | 381 | 0 |  |
| dot/graphviz-gallery-neato-traffic_lights.gv | ok | 14 | 16 | 6 | 3 | 6 | 33% | 33% | 0 | 238 | 0 |  |
| dot/graphviz-gallery-neato-transparency.gv | ok | 6 | 6 | 5 | 1 | 10 | 100% | 0% | 0 | 84 | 0 | W_STYLE_ALPHA_DROPPED |
| dot/graphviz-gallery-twopi-networkmap_twopi.gv.gz | ok | 426 | 425 | 6 | 2 | 6 | 100% | 100% | 0 | 5104 | 0 | W_STYLE_HTML_LABEL |
| dot/graphviz-gallery-twopi-twopi2.gv | ok | 1090 | 1118 | 5 | 7 | 1690 | 23% | 23% | 0 | 14484 | 0 |  |
| dot/graphviz-gallery-undirected-gd_1994_2007.gv | ok | 506 | 1380 | 6 | 2 | 721 | 100% | 0% | 0 | 15962 | 0 |  |
| dot/graphviz-gallery-undirected-root.gv | ok | 1054 | 1083 | 6 | 7 | 1636 | 23% | 23% | 0 | 11989 | 0 |  |
| dot/raphael-group_machina__T_seed9_mut1.dot | ok | 79 | 78 | 6 | 4 | 127 | 0% | 0% | 0 | 1178 | 0 | W_STYLE_COLOR_LIST |
| dot/vivek3141_super-mario-neat__Digraph.gv | ok | 281 | 878 | 5 | 8 | 1837 | 48% | 0% | 0 | 6954 | 0 |  |
| dot/zjunlp_KnowledgeCircuits__graph.gv | ok | 95 | 452 | 6 | 5 | 913 | 56% | 0% | 0 | 3544 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_HTML_LABEL |
| gexf/cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz | ok | 225 | 1090 | 3 | 3 | 0 | - | - | 0 | 4810 | 0 |  |
| gexf/fidelity/graphology-rio.gexf.gz | ok | 366 | 1107 | 4 | 4 | 796 | 0% | 0% | 0 | 5160 | 0 |  |
| gexf/fidelity/synth-13-hierarchy.gexf | ok | 60 | 104 | 4 | 6 | 268 | 55% | 19% | 0 | 402 | 0 | W_STYLE_UNKNOWN_VALUE |
| gexf/fidelity/synth-nx-viz.gexf | ok | 96 | 193 | 4 | 6 | 599 | 46% | 23% | 0 | 676 | 0 |  |
| gexf/generated/alpha-text.gexf | ok | 4 | 0 | 2 | 1 | 0 | - | - | 0 | 19 | 0 |  |
| gexf/generated/broken-viz.gexf | ok | 120 | 2 | 4 | 6 | 33 | 0% | 0% | 0 | 500 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gexf/generated/distinct-1000-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14880 | 100% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-128-keyed.gexf.gz | ok | 5000 | 0 | 4 | 1 | 14802 | 66% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-2-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 7500 | 0% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-32-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14529 | 0% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-5000-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14894 | 100% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-64-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14763 | 0% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-65-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14769 | 0% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/distinct-8-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 13125 | 0% | 0% | 0 | 10000 | 0 |  |
| gexf/generated/gexf10-edges-first.gexf | ok | 24 | 30 | 3 | 4 | 18 | 0% | 0% | 0 | 216 | 0 |  |
| gexf/generated/gexf13-hex-and-labels.gexf | ok | 40 | 0 | 3 | 1 | 14 | 0% | 0% | 0 | 160 | 0 |  |
| gexf/generated/graphty-written.gexf | ok | 60 | 120 | 4 | 3 | 429 | 79% | 0% | 0 | 300 | 0 |  |
| gexf/generated/joint-100-classes.gexf.gz | ok | 2000 | 0 | 3 | 1 | 1970 | 100% | 0% | 0 | 8000 | 0 |  |
| gexf/generated/nonlinear-ramps.gexf | ok | 1500 | 0 | 4 | 1 | 3169 | 95% | 0% | 1327 | 3000 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/generated/random-all-60.gexf | ok | 60 | 120 | 4 | 3 | 429 | 79% | 0% | 0 | 300 | 0 |  |
| gexf/generated/random-all-600.gexf | ok | 600 | 1200 | 4 | 3 | 4452 | 79% | 0% | 0 | 3000 | 0 |  |
| gexf/generated/random-all-6000.gexf.gz | ok | 6000 | 12000 | 4 | 3 | 44940 | 79% | 0% | 0 | 30000 | 0 |  |
| gexf/generated/tamper-block-truncated.gexf | ok | 60 | 120 | 4 | 3 | 429 | 79% | 0% | 0 | 300 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/generated/tamper-native-edited.gexf | ok | 60 | 120 | 5 | 3 | 429 | 80% | 0% | 0 | 300 | 0 |  |
| gexf/generated/tamper-node-added.gexf | ok | 61 | 120 | 4 | 3 | 429 | 79% | 0% | 0 | 305 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/gexfjs-celegans.gexf.gz | ok | 306 | 2148 | 4 | 3 | 330 | 0% | 0% | 462 | 9204 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/gexfjs-miserables.gexf | ok | 77 | 254 | 4 | 3 | 179 | 0% | 0% | 0 | 1170 | 0 |  |
| gexf/glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz | ok | 868 | 1334 | 4 | 4 | 1626 | 50% | 0% | 676 | 7072 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/graphology-basic.gexf | ok | 2 | 3 | 2 | 6 | 3 | 100% | 0% | 0 | 13 | 0 |  |
| gexf/graphology-missing_nodes.gexf | ok | 2 | 1 | 2 | 4 | 0 | - | - | 0 | 14 | 0 |  |
| gexf/gsa-fpki-certs.gexf | ok | 120 | 119 | 3 | 4 | 0 | - | - | 0 | 837 | 0 |  |
| gexf/pygraphistry-sample-1.3-viz.gexf | ok | 2 | 1 | 2 | 2 | 3 | 100% | 0% | 0 | 6 | 0 |  |
| gexf/pygraphistry-sample.gexf | ok | 2 | 1 | 2 | 3 | 4 | 100% | 0% | 0 | 4 | 0 |  |
| gexf/qvge-mine-airing.gexf | ok | 64 | 117 | 3 | 5 | 2 | 100% | 0% | 0 | 663 | 0 | W_STYLE_UNKNOWN_VALUE |
| gexf/rgexf-lesmiserables.gexf | ok | 77 | 254 | 4 | 3 | 98 | 0% | 0% | 84 | 1170 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/sigma-arctic.gexf.gz | ok | 1715 | 6676 | 4 | 3 | 4521 | 0% | 0% | 0 | 30134 | 0 |  |
| gexf/sigma-moroccan-ediaspora.gexf.gz | ok | 156 | 397 | 4 | 4 | 160 | 0% | 0% | 196 | 1900 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/sigma-standard_graph.gexf | ok | 17 | 35 | 4 | 3 | 26 | 100% | 0% | 0 | 174 | 0 |  |
| gexf/sigma-website-diseasome.gexf.gz | ok | 1419 | 3926 | 4 | 3 | 1060 | 0% | 0% | 1148 | 14616 | 0 | W_STYLE_RAMP_ROUNDED |
| gml/ImperialCollegeLondon_pyrealm__pmodel.gml | ok | 36 | 57 | 5 | 6 | 54 | 37% | 4% | 0 | 429 | 0 |  |
| gml/TwelveYC_network-vi__metabolicpos.gml | ok | 453 | 2040 | 2 | 4 | 0 | - | - | 0 | 9066 | 0 |  |
| gml/di-unipi-socc_dgLBF__germany50.gml | ok | 50 | 88 | 2 | 1 | 0 | - | - | 0 | 0 | 0 | W_STYLE_UNKNOWN_VALUE |
| gml/fidelity/bionetgen-ruleviz-pattern.gml | ok | 134 | 40 | 6 | 3 | 72 | 0% | 0% | 0 | 950 | 0 |  |
| gml/fidelity/dunnart-autobahn.gml | ok | 53 | 83 | 4 | 3 | 31 | 100% | 0% | 0 | 724 | 0 |  |
| gml/fidelity/dunnart-planar-orthogonal.gml | ok | 60 | 65 | 3 | 3 | 7 | 100% | 0% | 0 | 630 | 0 |  |
| gml/fidelity/jgrapht-grid-territorio.gml | ok | 25 | 40 | 5 | 2 | 5 | 0% | 0% | 0 | 405 | 0 |  |
| gml/fidelity/repro-groups-no-creator.gml | ok | 21 | 11 | 6 | 3 | 36 | 25% | 25% | 0 | 198 | 0 |  |
| gml/fidelity/synthetic-coverage.gml | ok | 82 | 80 | 3 | 3 | 714 | 100% | 0% | 0 | 285 | 0 | W_STYLE_GRADIENT, W_STYLE_NOT_CARRIED, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| gml/fidelity/visualgraph-tree30.gml | ok | 30 | 29 | 4 | 2 | 30 | 97% | 0% | 0 | 294 | 0 |  |
| gml/generated/cytoscape-interactions.gml | ok | 30 | 45 | 4 | 3 | 87 | 0% | 0% | 0 | 720 | 0 |  |
| gml/generated/gephi-unquoted-creator.gml | ok | 40 | 70 | 2 | 5 | 87 | 0% | 0% | 0 | 346 | 0 |  |
| gml/generated/graphics-mix.gml | ok | 60 | 60 | 4 | 1 | 234 | 78% | 0% | 0 | 0 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gml/generated/graphty-written.gml | ok | 30 | 40 | 7 | 7 | 74 | 14% | 0% | 0 | 0 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/igraph-flat-attributes.gml | ok | 20 | 25 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| gml/generated/networkx-graphics.gml | ok | 24 | 30 | 3 | 2 | 45 | 33% | 0% | 0 | 0 | 0 |  |
| gml/generated/ogdf-escaped-labels.gml | ok | 25 | 35 | 9 | 6 | 67 | 18% | 4% | 0 | 0 | 0 |  |
| gml/generated/tamper-block-truncated.gml | ok | 30 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-native-edited.gml | ok | 30 | 40 | 8 | 7 | 74 | 15% | 1% | 0 | 0 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-node-added.gml | ok | 31 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/yed-labels-and-arrows.gml | ok | 30 | 40 | 7 | 7 | 34 | 0% | 0% | 0 | 302 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL |
| gml/spupyrev_bob__need4stacks261.gml | ok | 261 | 777 | 5 | 3 | 165 | 12% | 4% | 0 | 6420 | 0 |  |
| graphml/LTVA1_STM32CrapSynth__func.graphml.gz | ok | 147 | 94 | 7 | 4 | 473 | 83% | 8% | 0 | 482 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_UNKNOWN_VALUE |
| graphml/SleepyTrousers_EnderIO-1.5-1.12__TileEntities.graphml | ok | 70 | 72 | 7 | 7 | 100 | 74% | 4% | 0 | 221 | 0 | W_STYLE_GRADIENT |
| graphml/StateSmith_StateSmith__Spec1Sm.graphml | ok | 14 | 7 | 5 | 3 | 48 | 58% | 6% | 0 | 33 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/a-little-srdjan_grapher__bleve.graphml.gz | ok | 39 | 120 | 3 | 3 | 229 | 100% | 0% | 0 | 0 | 0 |  |
| graphml/architolk_mimtools__fbm-mim2.graphml.gz | ok | 73 | 38 | 9 | 6 | 150 | 63% | 14% | 0 | 289 | 0 | W_STYLE_EXTRA_LABELS |
| graphml/color-key/iVis-at-Bilkent__chilay__circle.graphml | ok | 64 | 64 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/cytoscape/Multiomics-Analytics-Group__MicW2Graph__Wastewater_assembly_nosinglt_cclasso_10.graphml | ok | 4 | 6 | 2 | 1 | 0 | - | - | 0 | 144 | 0 |  |
| graphml/cytoscape/Thakar-Lab__WikiNetworks__WP3935_cytoscape.graphml | ok | 24 | 14 | 2 | 1 | 0 | - | - | 0 | 556 | 0 |  |
| graphml/cytoscape/chatox__networks-science-course__karate.graphml | ok | 34 | 78 | 2 | 1 | 0 | - | - | 0 | 1602 | 0 |  |
| graphml/cytoscape/coinslab__pgdcm__AH_DCM.graphml | ok | 31 | 39 | 2 | 1 | 0 | - | - | 0 | 1011 | 0 |  |
| graphml/cytoscape/karchern__network_connectivity_queries__eco03258.graphml | ok | 21 | 0 | 2 | 1 | 0 | - | - | 0 | 315 | 0 |  |
| graphml/fidelity/galaxy-lcms-workflow.graphml | ok | 55 | 39 | 5 | 6 | 152 | 49% | 3% | 0 | 181 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/libcitygml-mapping.graphml | ok | 51 | 57 | 6 | 5 | 86 | 78% | 12% | 0 | 171 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/magiclantern-architecture.graphml | ok | 43 | 34 | 6 | 4 | 141 | 60% | 2% | 0 | 130 | 0 | W_STYLE_GRADIENT |
| graphml/fidelity/open-archaeo.graphml | ok | 61 | 54 | 6 | 5 | 148 | 61% | 9% | 0 | 215 | 0 | W_STYLE_NO_FILL |
| graphml/fidelity/scala-collection-mutable.graphml | ok | 42 | 42 | 5 | 6 | 59 | 54% | 0% | 0 | 143 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL |
| graphml/fidelity/synthetic-edges.graphml | ok | 40 | 109 | 3 | 2 | 354 | 100% | 0% | 0 | 297 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/synthetic-nodes.graphml | ok | 74 | 24 | 2 | 2 | 354 | 100% | 0% | 0 | 82 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/generated/fill-oddities.graphml | ok | 15 | 3 | 4 | 2 | 18 | 100% | 11% | 0 | 93 | 0 | W_STYLE_BAD_VALUE, W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/generated/graphty-written.graphml | ok | 50 | 50 | 4 | 3 | 317 | 86% | 0% | 0 | 0 | 0 |  |
| graphml/generated/labels-multi.graphml | ok | 6 | 0 | 3 | 1 | 0 | - | - | 0 | 25 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_EXTRA_LABELS |
| graphml/generated/ramp-with-exceptions.graphml.gz | ok | 1000 | 0 | 4 | 1 | 1551 | 63% | 0% | 1420 | 5000 | 0 | W_STYLE_RAMP_ROUNDED |
| graphml/generated/scale-50.graphml | ok | 50 | 50 | 4 | 3 | 317 | 86% | 0% | 0 | 300 | 0 |  |
| graphml/generated/scale-500.graphml.gz | ok | 500 | 500 | 4 | 4 | 3275 | 69% | 0% | 0 | 3000 | 0 |  |
| graphml/generated/scale-5000.graphml.gz | ok | 5000 | 5000 | 4 | 4 | 33196 | 69% | 0% | 0 | 30000 | 0 |  |
| graphml/generated/tamper-block-truncated.graphml | ok | 50 | 50 | 4 | 3 | 317 | 86% | 0% | 0 | 150 | 0 | W_STYLE_BLOCK_IGNORED |
| graphml/generated/tamper-native-edited.graphml | ok | 50 | 50 | 5 | 3 | 318 | 86% | 0% | 0 | 0 | 0 |  |
| graphml/generated/tamper-node-added.graphml | ok | 51 | 50 | 3 | 3 | 317 | 86% | 0% | 0 | 160 | 0 | W_STYLE_BLOCK_IGNORED |
| graphml/generated/yfiles3-shared-cycle.graphml | ok | 3 | 0 | 2 | 1 | 1 | 100% | 0% | 0 | 21 | 0 | W_STYLE_REFERENCE_CYCLE, W_STYLE_UNRESOLVED |
| graphml/gephi-large/othercriteria__StochasticBlockmodel__celegans-modified.graphml.gz | ok | 306 | 2345 | 4 | 4 | 770 | 0% | 0% | 2 | 9992 | 0 | W_STYLE_RAMP_ROUNDED |
| graphml/gephi-large/saraiva3__Shape-of-War__ONLY_RED.graphml | ok | 166 | 544 | 4 | 3 | 423 | 71% | 0% | 0 | 2508 | 0 |  |
| graphml/gephi-rgb/NetworkGraphs__graphysics__LesMiserables.graphml | ok | 77 | 254 | 4 | 3 | 182 | 0% | 0% | 0 | 1170 | 0 |  |
| graphml/gephi-rgb/nielmclaren__constellation.js__data.graphml | ok | 47 | 57 | 4 | 4 | 102 | 0% | 0% | 0 | 322 | 0 |  |
| graphml/inbloom_secure-data-service__index.graphml | ok | 100 | 51 | 4 | 5 | 453 | 48% | 0% | 0 | 216 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/ZUGFeRD__mustangproject__mustangArchitecture.graphml | ok | 10 | 4 | 6 | 2 | 20 | 75% | 20% | 0 | 22 | 0 |  |
| graphml/java-graphml-lib/boschglobal__dse.clib__arch__fmi_library.graphml | ok | 33 | 5 | 8 | 3 | 55 | 84% | 24% | 0 | 45 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/domondi1__KEVGraph__guin-D__Library-Management-System.graphml | ok | 16 | 15 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/yed-genericnode/Accenture__reactive-interaction-gateway__overview.graphml | ok | 13 | 4 | 6 | 3 | 35 | 49% | 0% | 0 | 23 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/CERT-Polska__ursadb__dataset.graphml | ok | 11 | 0 | 5 | 1 | 10 | 80% | 0% | 0 | 0 | 0 | W_STYLE_GRADIENT |
| graphml/yed-genericnode/TimothyJones__github-cognito-openid-wrapper__overview.graphml | ok | 8 | 3 | 6 | 2 | 15 | 60% | 27% | 0 | 37 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/awslabs__aws-c-io__slots.graphml | ok | 4 | 0 | 3 | 1 | 6 | 100% | 0% | 0 | 5 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/brucou__kingly__hero_graph.graphml | ok | 6 | 8 | 3 | 3 | 1 | 100% | 0% | 0 | 15 | 0 | W_STYLE_GRADIENT |
| graphml/yed-genericnode/buaazp__zimg__arch.graphml | ok | 32 | 27 | 10 | 5 | 142 | 57% | 1% | 0 | 101 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/diennea__herddb__herddb.graphml | ok | 14 | 0 | 4 | 1 | 39 | 51% | 0% | 0 | 10 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/IBM__responsible-prompting-course__prompt_anatomy.graphml.gz | ok | 98 | 162 | 6 | 5 | 384 | 88% | 4% | 0 | 486 | 0 |  |
| graphml/yed-large/crocs-muni__scrutiny__SCRUTINYWholeProcess.graphml.gz | ok | 31 | 0 | 4 | 1 | 66 | 55% | 0% | 0 | 88 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/cuba-platform__documentation__DeploymentStructure.graphml.gz | ok | 263 | 6 | 6 | 3 | 273 | 84% | 18% | 0 | 1543 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz | ok | 152 | 254 | 7 | 3 | 736 | 93% | 5% | 0 | 762 | 0 |  |
| graphml/yed-shapenode/Animatron__player__flow.graphml | ok | 12 | 14 | 7 | 4 | 43 | 60% | 2% | 0 | 39 | 0 |  |
| graphml/yed-shapenode/awslabs__ml-io__architecture.graphml | ok | 14 | 6 | 7 | 3 | 19 | 74% | 37% | 0 | 12 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/getopt-php__getopt-php__getopt.graphml | ok | 13 | 8 | 6 | 4 | 35 | 29% | 3% | 0 | 29 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/kwk__docker-registry-setup__setup.graphml | ok | 7 | 12 | 3 | 6 | 33 | 73% | 0% | 0 | 14 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/linux4sam__egt__v4l2.graphml | ok | 9 | 5 | 6 | 3 | 23 | 35% | 26% | 0 | 18 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/svanoort__pyresttest__contexts.graphml | ok | 32 | 18 | 7 | 4 | 118 | 51% | 6% | 0 | 81 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/voc__voctomix__schema.graphml | ok | 43 | 48 | 4 | 4 | 244 | 47% | 0% | 0 | 177 | 0 |  |
| graphml/yed-svgnode/JustDerb__yed-aws-palettes__AWS_-_Blockchain.graphml | ok | 2 | 0 | 3 | 1 | 1 | 100% | 0% | 0 | 10 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/ZUGFeRD__quba-viewer__XSLGenesis.graphml | ok | 62 | 9 | 5 | 3 | 138 | 54% | 1% | 0 | 257 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/japila-books__apache-spark-internals__spark-rdd-partitioned-distributed.graphml | ok | 17 | 0 | 3 | 1 | 39 | 49% | 0% | 0 | 24 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/kyriosdata__rnds__xds.b.graphml | ok | 12 | 11 | 7 | 4 | 21 | 43% | 38% | 0 | 3 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/mitogen-hq__mitogen__persistent.graphml | ok | 9 | 6 | 5 | 3 | 22 | 100% | 27% | 0 | 20 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/sk2__autonetkit-py__small_internet.graphml | ok | 15 | 18 | 3 | 4 | 1 | 0% | 0% | 0 | 54 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/Arannamoy-Mondal__Cryptocurrency-Yearly-Market-Analysis-Using-SQL__Schema.graphml | ok | 23 | 24 | 3 | 3 | 38 | 100% | 0% | 0 | 186 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml | ok | 37 | 37 | 5 | 2 | 34 | 6% | 6% | 0 | 148 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz | ok | 177 | 183 | 7 | 6 | 259 | 96% | 27% | 0 | 1241 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/OmniOneID__did-doc-architecture__genKey_iOS.graphml | ok | 14 | 7 | 4 | 2 | 24 | 50% | 0% | 0 | 72 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/aleph-im__pyaleph__PyAleph_architecture.graphml | ok | 30 | 3 | 9 | 2 | 43 | 47% | 12% | 0 | 12 | 0 |  |
| graphml/yfiles-html/cheind__autoregressive__wavenet-causal-padding.graphml | ok | 21 | 22 | 5 | 3 | 24 | 0% | 0% | 0 | 141 | 0 | W_STYLE_ALPHA_DROPPED |
| graphml/yfiles-html/luizomf__design-patterns-python__State_1.graphml | ok | 4 | 13 | 3 | 5 | 2 | 100% | 0% | 0 | 52 | 0 |  |
| json/cyjs-colajs (data and stylesheet) | ok | 21 | 593 | 3 | 3 | 965 | 0% | 0% | 0 | 6691 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-colajs-data.json | ok | 21 | 593 | 1 | 2 | 0 | - | - | 0 | 8596 | 0 |  |
| json/cyjs-cose-bilkent-compound.json | ok | 28 | 35 | 2 | 4 | 0 | - | - | 0 | 861 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs-edge-arrows (data and stylesheet) | ok | 24 | 12 | 4 | 3 | 9 | 0% | 0% | 0 | 408 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| json/cyjs-edge-arrows-data.json | ok | 24 | 12 | 1 | 2 | 0 | - | - | 0 | 504 | 0 |  |
| json/cyjs-enrichment-map-desktop-style (data and stylesheet) | ok | 525 | 6421 | 4 | 2 | 0 | - | - | 0 | 34205 | 0 | W_STYLE_NOT_CARRIED |
| json/cyjs-enrichment-map.networks.json.gz | ok | 525 | 6421 | 1 | 2 | 0 | - | - | 0 | 97244 | 0 |  |
| json/cyjs-genemania-export.json | ok | 31 | 255 | 2 | 1 | 0 | - | - | 0 | 4066 | 0 |  |
| json/cyjs-node-types (data and stylesheet) | ok | 26 | 0 | 4 | 1 | 21 | 0% | 0% | 0 | 286 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| json/cyjs-node-types-data.json | ok | 26 | 0 | 1 | 1 | 0 | - | - | 0 | 364 | 0 |  |
| json/cyjs-tokyo-railways (data and stylesheet) | ok | 943 | 860 | 2 | 4 | 410 | 0% | 0% | 0 | 15284 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-tokyo-railways.json.gz | ok | 943 | 860 | 2 | 1 | 0 | - | - | 0 | 27128 | 0 |  |
| json/cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 36000 | 0 |  |
| json/cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 13 | 7 | 776 | 0% | 0% | 0 | 7292 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 625 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2375 | 0% | 0% | 0 | 5610 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2452 | 0% | 0% | 0 | 5599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-10.cyjs | ok | 400 | 0 | 11 | 1 | 236 | 0% | 0% | 0 | 5214 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-160.cyjs | ok | 400 | 0 | 15 | 1 | 97 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-20.cyjs | ok | 400 | 0 | 15 | 1 | 236 | 0% | 0% | 0 | 5203 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-40.cyjs | ok | 400 | 0 | 15 | 1 | 237 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-5.cyjs | ok | 400 | 0 | 6 | 1 | 209 | 0% | 0% | 0 | 5252 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-80.cyjs | ok | 400 | 0 | 15 | 1 | 192 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-10.cyjs | ok | 400 | 0 | 11 | 1 | 665 | 0% | 0% | 0 | 4475 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-160.cyjs | ok | 400 | 0 | 15 | 1 | 692 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-20.cyjs | ok | 400 | 0 | 15 | 1 | 659 | 0% | 0% | 0 | 4427 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-40.cyjs | ok | 400 | 0 | 15 | 1 | 623 | 0% | 0% | 0 | 4405 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-5.cyjs | ok | 400 | 0 | 6 | 1 | 558 | 0% | 0% | 0 | 4607 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-80.cyjs | ok | 400 | 0 | 15 | 1 | 521 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/all-30.cyjs | ok | 400 | 0 | 15 | 1 | 1081 | 0% | 0% | 0 | 2999 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/all-300.cyjs | ok | 400 | 0 | 15 | 1 | 1151 | 0% | 0% | 0 | 2800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-30.cyjs | ok | 400 | 0 | 15 | 1 | 283 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-300.cyjs | ok | 400 | 0 | 15 | 1 | 174 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bc-30.cyjs | ok | 400 | 0 | 15 | 1 | 539 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bc-300.cyjs | ok | 400 | 0 | 15 | 1 | 497 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bg-30.cyjs | ok | 400 | 0 | 15 | 1 | 539 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bg-300.cyjs | ok | 400 | 0 | 15 | 1 | 497 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-col-fs-30.cyjs | ok | 400 | 0 | 15 | 1 | 174 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-col-fs-300.cyjs | ok | 400 | 0 | 15 | 1 | 250 | 0% | 0% | 0 | 4400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-lab-30.cyjs | ok | 400 | 0 | 15 | 1 | 176 | 0% | 0% | 0 | 5206 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-lab-300.cyjs | ok | 400 | 0 | 15 | 1 | 257 | 0% | 0% | 0 | 5200 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-shape-30.cyjs | ok | 400 | 0 | 15 | 1 | 278 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-shape-300.cyjs | ok | 400 | 0 | 15 | 1 | 488 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-w-30.cyjs | ok | 400 | 0 | 15 | 1 | 403 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-w-300.cyjs | ok | 400 | 0 | 15 | 1 | 547 | 0% | 0% | 0 | 4800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bc-then-bcbg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bg-then-bgop.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bg-then-bgw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-default-then-class.cyjs | ok | 9 | 0 | 4 | 1 | 6 | 0% | 0% | 0 | 96 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-size-default-then-class-color.cyjs | ok | 9 | 0 | 3 | 1 | 6 | 0% | 0% | 0 | 105 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-two-classes.cyjs | ok | 9 | 0 | 4 | 1 | 3 | 0% | 0% | 0 | 116 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/eq-sel.cyjs | ok | 4 | 0 | 2 | 1 | 0 | - | - | 0 | 48 | 0 |  |
| json/cyjs/adv6/fo-then-fobg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/op-then-bg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/op-then-opw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/shape-then-shapebg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/size-then-sizebg-wonly.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 51 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/size-then-sizebg.cyjs | ok | 4 | 0 | 3 | 1 | 2 | 0% | 0% | 0 | 48 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/three-rules.cyjs | ok | 4 | 0 | 4 | 1 | 2 | 0% | 0% | 0 | 50 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/two-rules.cyjs | ok | 4 | 0 | 3 | 1 | 0 | - | - | 0 | 52 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 16 | 308 | 1% | 1% | 0 | 887 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 6 | 5 | 23 | 43% | 43% | 0 | 1991 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| json/cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 11 | 6 | 96 | 10% | 10% | 0 | 1759 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-graphmaker.json | ok | 211 | 271 | 4 | 4 | 112 | 0% | 0% | 0 | 4706 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-perf.json.gz | ok | 500 | 1000 | 2 | 3 | 1959 | 0% | 0% | 0 | 18000 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-sbgn-sciluna.json | ok | 52 | 53 | 9 | 3 | 108 | 0% | 0% | 0 | 1028 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-synth-edges-saved.json | ok | 101 | 58 | 7 | 14 | 56 | 0% | 0% | 0 | 1617 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-synth-edges.json | ok | 101 | 58 | 7 | 14 | 56 | 0% | 0% | 0 | 1617 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-synth-nodes.json | ok | 110 | 0 | 13 | 1 | 215 | 7% | 7% | 0 | 952 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-tokyo.json.gz | ok | 943 | 860 | 2 | 4 | 410 | 0% | 0% | 0 | 15284 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/fidelity/cyjs-winecheese.json.gz | ok | 369 | 1333 | 6 | 3 | 2131 | 0% | 0% | 0 | 17247 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/gephi-worldcup.json.gz | ok | 736 | 9228 | 4 | 3 | 9645 | 90% | 0% | 716 | 22136 | 0 | W_STYLE_RAMP_ROUNDED |
| json/fidelity/graphology-synth.json | ok | 100 | 270 | 3 | 3 | 584 | 54% | 0% | 0 | 1237 | 0 |  |
| json/fidelity/sigma-lesmis.json | ok | 77 | 254 | 3 | 2 | 227 | 69% | 0% | 110 | 1147 | 0 | W_STYLE_RAMP_ROUNDED |
| json/fidelity/vis-lesmiserables.json | ok | 77 | 254 | 14 | 2 | 126 | 0% | 0% | 0 | 2340 | 0 |  |
| json/fidelity/vis-nodelegend.json | ok | 21 | 15 | 7 | 4 | 69 | 48% | 1% | 0 | 174 | 0 |  |
| json/fidelity/vis-siblings.json | ok | 200 | 284 | 6 | 3 | 158 | 0% | 0% | 0 | 2704 | 0 |  |
| json/fidelity/vis-synth.json | ok | 72 | 84 | 10 | 5 | 232 | 66% | 28% | 0 | 403 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/vis-transparency.json | ok | 50 | 100 | 3 | 2 | 0 | - | - | 0 | 1150 | 0 |  |
| json/fidelity/vis-unix.json | ok | 41 | 49 | 3 | 3 | 0 | - | - | 0 | 540 | 0 |  |
| json/fidelity/vis-world.json | ok | 48 | 69 | 3 | 3 | 0 | - | - | 0 | 798 | 0 |  |
| json/generated/cytoscape-graphty-written.json | ok | 4 | 3 | 6 | 4 | 14 | 79% | 57% | 0 | 0 | 0 |  |
| json/generated/cytoscape-tamper-block-truncated.json | ok | 4 | 3 | 7 | 8 | 14 | 57% | 57% | 0 | 37 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/cytoscape-tamper-native-edited.json | ok | 4 | 3 | 7 | 4 | 14 | 86% | 64% | 0 | 0 | 0 |  |
| json/generated/cytoscape-tamper-node-added.json | ok | 5 | 3 | 7 | 8 | 14 | 57% | 57% | 0 | 41 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-graphty-written.json | ok | 4 | 3 | 6 | 4 | 9 | 78% | 67% | 0 | 49 | 0 |  |
| json/generated/graphology-tamper-block-truncated.json | ok | 4 | 3 | 2 | 2 | 9 | 100% | 0% | 0 | 26 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-tamper-native-edited.json | ok | 4 | 3 | 7 | 4 | 9 | 89% | 78% | 0 | 49 | 0 |  |
| json/generated/graphology-tamper-node-added.json | ok | 5 | 3 | 2 | 2 | 9 | 100% | 0% | 0 | 34 | 0 | W_STYLE_BLOCK_IGNORED |
| json/graphology-arctic.json.gz | ok | 1715 | 6228 | 1 | 1 | 0 | - | - | 0 | 38632 | 0 |  |
| json/graphology-eurosis.json.gz | ok | 1285 | 7524 | 4 | 1 | 2118 | 0% | 0% | 1540 | 36521 | 0 | W_STYLE_RAMP_ROUNDED |
| json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json | ok | 44 | 44 | 5 | 4 | 30 | 0% | 0% | 0 | 866 | 0 | W_STYLE_NOT_CARRIED |
| json/sciluna_cytoscape.js-sbgn-layout__9613829.json | ok | 52 | 53 | 9 | 3 | 108 | 0% | 0% | 0 | 1028 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/scsweb2020_graph-maker__aggregate-cy-graph.json.gz | ok | 211 | 271 | 4 | 4 | 112 | 0% | 0% | 0 | 4706 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/sigma-website-airports.json.gz | ok | 3257 | 37042 | 1 | 1 | 0 | - | - | 0 | 174224 | 0 |  |
| json/sigma-website-euroSIS.json.gz | ok | 1285 | 7524 | 2 | 1 | 0 | - | - | 0 | 40376 | 0 |  |
| json/sigma-website-wikipedia.json.gz | ok | 2085 | 0 | 1 | 1 | 0 | - | - | 0 | 16680 | 0 |  |
| json/vis-WorldCup2014.json.gz | ok | 736 | 9228 | 4 | 3 | 9645 | 90% | 0% | 716 | 22136 | 0 | W_STYLE_RAMP_ROUNDED |
| json/vis-dot-to-graph-softmaint.json | ok | 213 | 269 | 5 | 3 | 0 | - | - | 0 | 2903 | 0 |  |
| pajek/SamTseng_CATAR__Pajek_format.net | ok | 3 | 8 | 3 | 3 | 11 | 55% | 0% | 0 | 58 | 0 |  |
| pajek/fidelity/1crn.net | ok | 327 | 337 | 7 | 2 | 339 | 65% | 0% | 0 | 4652 | 0 |  |
| pajek/fidelity/c.net | ok | 65 | 125 | 3 | 2 | 0 | - | - | 0 | 1074 | 0 |  |
| pajek/fidelity/football.net | ok | 35 | 118 | 2 | 3 | 69 | 0% | 0% | 0 | 940 | 0 |  |
| pajek/fidelity/kdorola.net | ok | 127 | 152 | 3 | 3 | 51 | 2% | 0% | 0 | 2024 | 0 |  |
| pajek/fidelity/lin-rel4.net | ok | 234 | 604 | 3 | 2 | 280 | 0% | 0% | 0 | 5528 | 0 | W_STYLE_BAD_VALUE |
| pajek/fidelity/synth-lines.net | ok | 40 | 111 | 3 | 4 | 94 | 23% | 0% | 0 | 744 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED |
| pajek/fidelity/synth-vertices.net | ok | 81 | 112 | 2 | 1 | 258 | 100% | 0% | 0 | 1071 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/b98-trailing-zero.net | ok | 12 | 26 | 3 | 4 | 21 | 81% | 0% | 0 | 202 | 0 |  |
| pajek/generated/color-forms.net | ok | 8 | 5 | 3 | 3 | 11 | 100% | 0% | 0 | 93 | 0 | W_STYLE_BAD_VALUE |
| pajek/generated/colors-mix.net | ok | 80 | 80 | 4 | 4 | 283 | 29% | 0% | 0 | 814 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/graphty-written.net | ok | 6 | 7 | 2 | 3 | 30 | 80% | 0% | 0 | 20 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/nan-values.net | ok | 4 | 16 | 3 | 2 | 0 | - | - | 0 | 124 | 0 |  |
| pajek/generated/proto-color-names.net | ok | 3 | 2 | 3 | 3 | 2 | 100% | 0% | 0 | 35 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/shapes-and-lines.net | ok | 6 | 7 | 2 | 3 | 19 | 100% | 0% | 0 | 61 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-block-truncated.net | ok | 6 | 7 | 3 | 3 | 15 | 100% | 0% | 0 | 65 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-native-edited.net | ok | 6 | 7 | 3 | 3 | 30 | 80% | 0% | 0 | 20 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-node-added.net | ok | 7 | 7 | 3 | 3 | 15 | 100% | 0% | 0 | 75 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_UNKNOWN_VALUE |
| pajek/graphstream_gs-core__B.net | ok | 111 | 193 | 5 | 4 | 62 | 0% | 0% | 0 | 1699 | 0 | W_STYLE_BAD_VALUE |
| pajek/kjhealy_kjhnet__iliad_killedby.net | ok | 311 | 292 | 4 | 2 | 75 | 76% | 76% | 0 | 4551 | 0 |  |
| roles/by-group-0 | ok | 0 | 0 | 0 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/by-group-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/by-group-300 | ok | 300 | 600 | 3 | 3 | 1642 | 7% | 7% | 0 | 0 | 0 |  |
| roles/by-group-60 | ok | 60 | 120 | 3 | 3 | 295 | 3% | 3% | 0 | 0 | 0 |  |
| roles/by-group-9 | ok | 9 | 18 | 4 | 3 | 42 | 5% | 5% | 0 | 0 | 0 |  |
| roles/channels-0 | ok | 0 | 0 | 0 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/channels-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/channels-300 | ok | 300 | 600 | 4 | 3 | 1713 | 22% | 5% | 0 | 0 | 0 |  |
| roles/channels-60 | ok | 60 | 120 | 4 | 3 | 329 | 22% | 4% | 0 | 0 | 0 |  |
| roles/channels-9 | ok | 9 | 18 | 3 | 3 | 46 | 61% | 9% | 0 | 0 | 0 |  |
| roles/random-0 | ok | 0 | 0 | 0 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/random-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/random-300 | ok | 300 | 600 | 7 | 3 | 1765 | 88% | 4% | 0 | 0 | 0 |  |
| roles/random-60 | ok | 60 | 120 | 3 | 3 | 353 | 100% | 6% | 0 | 0 | 0 |  |
| roles/random-9 | ok | 9 | 18 | 2 | 3 | 47 | 94% | 0% | 0 | 0 | 0 |  |
| roles/sparse-0 | ok | 0 | 0 | 0 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/sparse-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| roles/sparse-300 | ok | 300 | 600 | 3 | 3 | 1464 | 0% | 0% | 0 | 0 | 0 |  |
| roles/sparse-60 | ok | 60 | 120 | 3 | 3 | 285 | 0% | 0% | 0 | 0 | 0 |  |
| roles/sparse-9 | ok | 9 | 18 | 3 | 2 | 41 | 10% | 0% | 0 | 0 | 0 |  |
| styled-json/by-group-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| styled-json/by-group-300 | ok | 300 | 600 | 3 | 3 | 1642 | 7% | 7% | 0 | 0 | 0 |  |
| styled-json/by-group-60 | ok | 60 | 120 | 3 | 3 | 295 | 3% | 3% | 0 | 0 | 0 |  |
| styled-json/by-group-9 | ok | 9 | 18 | 4 | 3 | 42 | 5% | 5% | 0 | 0 | 0 |  |
| styled-json/channels-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| styled-json/channels-300 | ok | 300 | 600 | 4 | 3 | 1713 | 22% | 5% | 0 | 0 | 0 |  |
| styled-json/channels-60 | ok | 60 | 120 | 4 | 3 | 329 | 22% | 4% | 0 | 0 | 0 |  |
| styled-json/channels-9 | ok | 9 | 18 | 3 | 3 | 46 | 61% | 9% | 0 | 0 | 0 |  |
| styled-json/random-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| styled-json/random-300 | ok | 300 | 600 | 7 | 3 | 1765 | 88% | 4% | 0 | 0 | 0 |  |
| styled-json/random-60 | ok | 60 | 120 | 3 | 3 | 353 | 100% | 6% | 0 | 0 | 0 |  |
| styled-json/random-9 | ok | 9 | 18 | 2 | 3 | 47 | 94% | 0% | 0 | 0 | 0 |  |
| styled-json/sparse-1 | ok | 1 | 0 | 1 | 0 | 0 | - | - | 0 | 0 | 0 |  |
| styled-json/sparse-300 | ok | 300 | 600 | 3 | 3 | 1464 | 0% | 0% | 0 | 0 | 0 |  |
| styled-json/sparse-60 | ok | 60 | 120 | 3 | 3 | 285 | 0% | 0% | 0 | 0 | 0 |  |
| styled-json/sparse-9 | ok | 9 | 18 | 3 | 2 | 41 | 10% | 0% | 0 | 0 | 0 |  |
| xgmml/BasicDataVizDemo.xgmml.gz | ok | 331 | 362 | 7 | 5 | 438 | 74% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/STRING-BreastCancer_expr.xgmml.gz | ok | 21 | 98 | 4 | 3 | 101 | 19% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/String_Network-breast_cancer.xgmml.gz | ok | 90 | 378 | 3 | 3 | 324 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/aracne-mycccnd1.xgmml.gz | ok | 236 | 241 | 6 | 2 | 50 | 2% | 2% | 0 | 1667 | 0 |  |
| xgmml/fidelity/dream4-signaling.xgmml | ok | 40 | 58 | 5 | 2 | 13 | 0% | 0% | 0 | 334 | 0 |  |
| xgmml/fidelity/gcmodeller-demo.xgmml | ok | 20 | 24 | 3 | 3 | 20 | 100% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/imagenet-dog-children.xgmml | ok | 190 | 189 | 5 | 2 | 22 | 100% | 100% | 0 | 1327 | 0 |  |
| xgmml/fidelity/networkportal-nsoxphos.xgmml | ok | 69 | 88 | 7 | 4 | 196 | 11% | 11% | 0 | 540 | 0 |  |
| xgmml/fidelity/pathguide-allpathwaysdb.xgmml | ok | 48 | 75 | 5 | 3 | 27 | 0% | 0% | 0 | 417 | 0 |  |
| xgmml/fidelity/repro-name-only-labels.xgmml | ok | 14 | 13 | 6 | 2 | 9 | 0% | 0% | 0 | 134 | 0 |  |
| xgmml/fidelity/syn-bypass.xgmml.gz | ok | 67 | 110 | 4 | 8 | 208 | 89% | 32% | 0 | 426 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/syn-mappings.xgmml.gz | ok | 96 | 140 | 6 | 6 | 1517 | 58% | 0% | 6 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_RAMP_ROUNDED |
| xgmml/fidelity/wp4271-cy3-export.xgmml.gz | ok | 158 | 90 | 7 | 7 | 505 | 49% | 10% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/generated/graphics-mix.xgmml | ok | 80 | 80 | 4 | 2 | 436 | 100% | 0% | 0 | 1241 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| xgmml/generated/graphty-written-block-other-graph.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 45 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-block-truncated.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 45 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-native-edit.xgmml.gz | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| xgmml/generated/graphty-written.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| xgmml/parklab_NGSCheckMate__luad.out.xgmml | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 366 | 0 |  |
| xgmml/sample_yeast_network.xgmml.gz | ok | 128 | 220 | 8 | 7 | 62 | 79% | 66% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
