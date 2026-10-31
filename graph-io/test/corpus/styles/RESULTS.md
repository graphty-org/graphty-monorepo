# Style corpus results

Written by `test/styles/harness.test.ts`, which fails when this file differs from what the inputs give now;
rerun it with `-u` to accept a change after reviewing it. One row per input: whether it imported, its
elements, the rules its styles plan to per target, and three measures of how readable the rules are. Varying
values are those that differ from their property's most common value; opaque ones come from a rule that only
copies values (an unexplained passthrough or the exceptions), exception ones from the exceptions rule alone.
Tool values are elements drawn with the writing program's default.

455 inputs, 452 with styles; at most 15 node and 16 edge rules.

| Input | Import | Nodes | Edges | Node rules | Edge rules | Varying | Opaque | Exceptions | Approximated | Tool values | Declared selecting nothing | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cx/fidelity/ddram.cx | ok | 109 | 142 | 8 | 5 | 318 | 61% | 59% | 0 | 1364 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/lianhe-affiliation.cx.gz | ok | 244 | 388 | 5 | 5 | 323 | 52% | 26% | 0 | 3319 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/nci-pid-rhoa.cx | ok | 48 | 63 | 4 | 6 | 159 | 0% | 0% | 0 | 603 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/polygenic-sle.cx.gz | ok | 127 | 497 | 6 | 3 | 969 | 0% | 0% | 0 | 3374 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_NOT_CARRIED |
| cx/fidelity/radiation-bibliography.cx.gz | ok | 188 | 207 | 5 | 7 | 505 | 9% | 9% | 0 | 2163 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_NOT_CARRIED |
| cx/fidelity/repro-locked-own-size.cx | ok | 12 | 12 | 5 | 2 | 22 | 82% | 82% | 0 | 360 | 0 |  |
| cx/fidelity/repro-unplaced-boxes.cx | ok | 24 | 29 | 3 | 3 | 0 | - | - | 0 | 746 | 0 |  |
| cx/fidelity/syn-bypass.cx | ok | 64 | 90 | 7 | 5 | 247 | 100% | 90% | 0 | 834 | 0 | W_STYLE_NOT_CARRIED |
| cx/fidelity/syn-mappings.cx | ok | 96 | 140 | 13 | 12 | 1628 | 26% | 26% | 0 | 1276 | 0 | W_STYLE_BAD_MAPPING, W_STYLE_NOT_CARRIED |
| cx/generated/graphty-written-block-other-graph.cx | ok | 75 | 108 | 8 | 3 | 102 | 8% | 8% | 0 | 1065 | 0 | W_STYLE_BLOCK_IGNORED |
| cx/generated/graphty-written-block-truncated.cx | ok | 75 | 108 | 8 | 3 | 102 | 8% | 8% | 0 | 1065 | 0 | W_STYLE_BLOCK_IGNORED |
| cx/generated/graphty-written-native-edit.cx | ok | 75 | 108 | 7 | 3 | 103 | 9% | 9% | 0 | 0 | 0 |  |
| cx/generated/graphty-written.cx | ok | 75 | 108 | 6 | 3 | 102 | 8% | 8% | 0 | 0 | 0 |  |
| cx/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx.gz | ok | 32 | 48 | 6 | 4 | 91 | 0% | 0% | 0 | 432 | 0 | W_STYLE_NOT_CARRIED |
| cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx | ok | 75 | 108 | 6 | 4 | 102 | 8% | 8% | 0 | 990 | 0 | W_STYLE_NOT_CARRIED |
| cx/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx.gz | ok | 2207 | 2282 | 1 | 2 | 0 | - | - | 0 | 89467 | 0 |  |
| cx/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx.gz | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 7289 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/imatinib-smpdb.cx2 | ok | 75 | 159 | 8 | 6 | 403 | 2% | 2% | 0 | 1245 | 0 |  |
| cx2/fidelity/repro-shared-interaction.cx2 | ok | 16 | 16 | 4 | 5 | 32 | 0% | 0% | 0 | 411 | 0 |  |
| cx2/fidelity/signor-aml.cx2 | ok | 147 | 306 | 5 | 8 | 762 | 14% | 13% | 0 | 2412 | 0 |  |
| cx2/fidelity/syn-bypass.cx2 | ok | 64 | 90 | 7 | 5 | 247 | 100% | 90% | 0 | 834 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/syn-mappings.cx2 | ok | 96 | 140 | 14 | 12 | 1700 | 25% | 25% | 0 | 1276 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/synthetic-lethal.cx2 | ok | 69 | 152 | 9 | 4 | 365 | 0% | 0% | 13 | 1174 | 0 | W_STYLE_RAMP_ROUNDED |
| cx2/fidelity/u2os-hierarchy.cx2 | ok | 82 | 84 | 8 | 2 | 134 | 0% | 0% | 16 | 996 | 0 | W_STYLE_RAMP_ROUNDED |
| cx2/fidelity/us-returned-students.cx2 | ok | 170 | 491 | 3 | 6 | 36 | 78% | 78% | 0 | 3475 | 0 | W_STYLE_NOT_CARRIED |
| cx2/fidelity/wp1449-tlr.cx2 | ok | 280 | 159 | 13 | 11 | 1021 | 49% | 48% | 0 | 2475 | 0 | W_STYLE_NOT_CARRIED |
| cx2/generated/graphty-written-block-other-graph.cx2 | ok | 599 | 739 | 8 | 2 | 580 | 83% | 83% | 0 | 7888 | 0 | W_STYLE_BLOCK_IGNORED |
| cx2/generated/graphty-written-block-truncated.cx2 | ok | 599 | 739 | 8 | 2 | 580 | 83% | 83% | 0 | 7888 | 0 | W_STYLE_BLOCK_IGNORED |
| cx2/generated/graphty-written-native-edit.cx2 | ok | 599 | 739 | 6 | 2 | 581 | 83% | 83% | 0 | 0 | 0 |  |
| cx2/generated/graphty-written.cx2 | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 0 | 0 |  |
| cx2/generated/mapping-edges.cx2 | ok | 200 | 100 | 8 | 3 | 491 | 21% | 21% | 0 | 4950 | 0 | W_STYLE_BAD_VALUE, W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_UNKNOWN_VALUE |
| cx2/ndex-1014623d-c2e0-11f1-be0a-005056ae3c32.cx2.gz | ok | 821 | 1046 | 6 | 6 | 2271 | 23% | 19% | 0 | 10156 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-440c8958-1dd0-11ef-9621-005056ae23aa.cx2.gz | ok | 2718 | 4820 | 6 | 4 | 1997 | 5% | 5% | 0 | 40408 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx2.gz | ok | 32 | 48 | 6 | 3 | 92 | 0% | 0% | 0 | 432 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2 | ok | 75 | 108 | 6 | 4 | 102 | 8% | 8% | 0 | 990 | 0 | W_STYLE_NOT_CARRIED |
| cx2/ndex-a2d9d91b-b1dc-11ec-b3be-0ac135e8bacf.cx2.gz | ok | 468 | 1713 | 4 | 3 | 1866 | 0% | 0% | 0 | 11373 | 0 |  |
| cx2/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx2.gz | ok | 2207 | 2282 | 1 | 2 | 0 | - | - | 0 | 89467 | 0 |  |
| cx2/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2 | ok | 599 | 739 | 5 | 2 | 580 | 83% | 83% | 0 | 7289 | 0 | W_STYLE_NOT_CARRIED |
| cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 63000 | 0 |  |
| cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 15 | 7 | 777 | 0% | 0% | 0 | 14331 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 1075 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2557 | 0% | 0% | 0 | 13610 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2406 | 0% | 0% | 0 | 13599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-10.cyjs | ok | 400 | 0 | 14 | 1 | 422 | 0% | 0% | 0 | 8814 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-160.cyjs | ok | 400 | 0 | 15 | 1 | 215 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-20.cyjs | ok | 400 | 0 | 15 | 1 | 536 | 0% | 0% | 0 | 8803 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-40.cyjs | ok | 400 | 0 | 15 | 1 | 477 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-5.cyjs | ok | 400 | 0 | 9 | 1 | 485 | 0% | 0% | 0 | 8852 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-only-80.cyjs | ok | 400 | 0 | 15 | 1 | 502 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-10.cyjs | ok | 400 | 0 | 14 | 1 | 967 | 0% | 0% | 0 | 8075 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-160.cyjs | ok | 400 | 0 | 15 | 1 | 1126 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-20.cyjs | ok | 400 | 0 | 15 | 1 | 769 | 0% | 0% | 0 | 8027 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-40.cyjs | ok | 400 | 0 | 15 | 1 | 877 | 0% | 0% | 0 | 8005 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-5.cyjs | ok | 400 | 0 | 8 | 1 | 730 | 0% | 0% | 0 | 8207 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv4/opacity-plus-80.cyjs | ok | 400 | 0 | 15 | 1 | 769 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/all-30.cyjs | ok | 400 | 0 | 15 | 1 | 1197 | 0% | 0% | 0 | 6599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/all-300.cyjs | ok | 400 | 0 | 15 | 1 | 1355 | 0% | 0% | 0 | 6400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-30.cyjs | ok | 400 | 0 | 15 | 1 | 645 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-300.cyjs | ok | 400 | 0 | 15 | 1 | 392 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bc-30.cyjs | ok | 400 | 0 | 15 | 1 | 823 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bc-300.cyjs | ok | 400 | 0 | 15 | 1 | 871 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bg-30.cyjs | ok | 400 | 0 | 15 | 1 | 823 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-bg-300.cyjs | ok | 400 | 0 | 15 | 1 | 871 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-col-fs-30.cyjs | ok | 400 | 0 | 15 | 1 | 458 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-col-fs-300.cyjs | ok | 400 | 0 | 15 | 1 | 550 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-lab-30.cyjs | ok | 400 | 0 | 15 | 1 | 330 | 0% | 0% | 0 | 8806 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-lab-300.cyjs | ok | 400 | 0 | 15 | 1 | 609 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-shape-30.cyjs | ok | 400 | 0 | 15 | 1 | 524 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-shape-300.cyjs | ok | 400 | 0 | 15 | 1 | 798 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-w-30.cyjs | ok | 400 | 0 | 15 | 1 | 503 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv5/op-w-300.cyjs | ok | 400 | 0 | 15 | 1 | 807 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bc-then-bcbg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bg-then-bgop.cyjs | ok | 4 | 0 | 4 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/bg-then-bgw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-default-then-class.cyjs | ok | 9 | 0 | 5 | 1 | 6 | 0% | 0% | 0 | 177 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-size-default-then-class-color.cyjs | ok | 9 | 0 | 3 | 1 | 6 | 0% | 0% | 0 | 186 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/common-two-classes.cyjs | ok | 9 | 0 | 4 | 1 | 3 | 0% | 0% | 0 | 197 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/eq-sel.cyjs | ok | 4 | 0 | 3 | 1 | 0 | - | - | 0 | 84 | 0 |  |
| cyjs/adv6/fo-then-fobg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/op-then-bg.cyjs | ok | 4 | 0 | 4 | 1 | 3 | 67% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/op-then-opw.cyjs | ok | 4 | 0 | 4 | 1 | 3 | 67% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/shape-then-shapebg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/size-then-sizebg-wonly.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/size-then-sizebg.cyjs | ok | 4 | 0 | 3 | 1 | 2 | 0% | 0% | 0 | 84 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/three-rules.cyjs | ok | 4 | 0 | 5 | 1 | 4 | 50% | 0% | 0 | 86 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv6/two-rules.cyjs | ok | 4 | 0 | 4 | 1 | 0 | - | - | 0 | 88 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2001 | 0% | 0% | 0 | 14408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2001 | 0% | 0% | 0 | 14408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 16 | 364 | 4% | 4% | 0 | 2420 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 7 | 5 | 23 | 43% | 43% | 0 | 3532 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 14 | 6 | 96 | 10% | 10% | 0 | 3300 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| cys/BasicDataVizDemo.cys | ok | 249 | 299 | 3 | 4 | 1 | 100% | 100% | 0 | 2989 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/STELZL.cys | ok | 1603 | 3308 | 3 | 5 | 249 | 100% | 93% | 0 | 26158 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-AnnotationExample.cys | ok | 330 | 359 | 6 | 4 | 728 | 0% | 0% | 0 | 3775 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-layout-v1.cys | ok | 331 | 362 | 3 | 6 | 112 | 1% | 1% | 0 | 3796 | 0 | W_STYLE_OTHER_STYLES |
| cys/fidelity/affinity-purification.cys | ok | 471 | 917 | 6 | 3 | 134 | 28% | 28% | 0 | 7411 | 0 | W_STYLE_OTHER_STYLES |
| cys/fidelity/galfiltered.cys | ok | 330 | 359 | 6 | 5 | 728 | 0% | 0% | 0 | 3775 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/import-and-save.cys | ok | 30 | 137 | 4 | 10 | 365 | 5% | 0% | 0 | 865 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/luad-vest-v2.cys | ok | 26 | 25 | 6 | 5 | 13 | 0% | 0% | 0 | 281 | 0 | W_STYLE_MAPPING_COLUMN_MISSING, W_STYLE_OTHER_STYLES |
| cys/fidelity/syn-bypass.cys | ok | 63 | 86 | 7 | 5 | 224 | 100% | 93% | 0 | 808 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/fidelity/syn-mappings.cys | ok | 96 | 140 | 13 | 12 | 1628 | 26% | 26% | 0 | 1276 | 0 | W_STYLE_BAD_MAPPING, W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/generated/graphty-written-block-other-graph.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 625 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-block-truncated.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 625 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-native-edit.cys | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| cys/generated/graphty-written.cys | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| dot/ArthurConmy_Automatic-Circuit-Discovery__layout.gv | ok | 108 | 926 | 4 | 3 | 80 | 100% | 0% | 0 | 7130 | 0 | W_STYLE_BAD_VALUE, W_STYLE_HTML_LABEL, W_STYLE_NOT_CARRIED |
| dot/DynamicalSystemsGroup_cats__cats_pkg.gv | ok | 456 | 1003 | 6 | 5 | 1071 | 0% | 0% | 0 | 11125 | 0 | W_STYLE_HTML_LABEL |
| dot/Ensembl_ensembl-hive__long_mult_jobs_04.dot | ok | 18 | 20 | 9 | 7 | 28 | 21% | 14% | 0 | 286 | 0 | W_STYLE_HTML_LABEL |
| dot/damoqiongqiu_NiceFish__dependencies.dot | ok | 126 | 75 | 7 | 5 | 82 | 27% | 27% | 0 | 1801 | 0 |  |
| dot/decentraland_architecture__architecture.dot | ok | 53 | 72 | 7 | 8 | 11 | 9% | 9% | 0 | 801 | 0 | W_STYLE_HTML_LABEL |
| dot/fidelity/real-crazy.gv | ok | 41 | 49 | 4 | 2 | 118 | 100% | 0% | 0 | 769 | 0 |  |
| dot/fidelity/real-depcruise.gv | ok | 115 | 652 | 8 | 5 | 224 | 91% | 58% | 0 | 1783 | 0 | W_STYLE_HTML_LABEL |
| dot/fidelity/real-happiness.gv | ok | 78 | 77 | 10 | 3 | 1 | 100% | 0% | 0 | 1134 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNFILLED |
| dot/fidelity/real-linux-kernel.gv | ok | 65 | 68 | 4 | 6 | 237 | 81% | 0% | 0 | 495 | 0 | W_STYLE_UNFILLED |
| dot/fidelity/real-siblings.gv | ok | 200 | 284 | 7 | 2 | 157 | 0% | 0% | 0 | 4356 | 0 |  |
| dot/fidelity/real-softmaint.gv | ok | 213 | 269 | 6 | 3 | 202 | 0% | 0% | 0 | 3654 | 0 |  |
| dot/fidelity/synth-edges-clusters.gv | ok | 80 | 102 | 11 | 7 | 155 | 70% | 23% | 0 | 1151 | 0 | W_STYLE_COLOR_LIST, W_STYLE_GRADIENT, W_STYLE_HTML_LABEL, W_STYLE_RECORD_LABEL |
| dot/fidelity/synth-nodes.gv | ok | 106 | 109 | 5 | 3 | 217 | 100% | 0% | 0 | 1475 | 0 | W_STYLE_GRADIENT, W_STYLE_HTML_LABEL, W_STYLE_NOT_CARRIED, W_STYLE_RECORD_LABEL, W_STYLE_UNFILLED, W_STYLE_UNKNOWN_VALUE |
| dot/generated/clusters-200.gv | ok | 1200 | 0 | 5 | 1 | 995 | 0% | 0% | 0 | 13000 | 0 |  |
| dot/generated/clusters-40.gv | ok | 160 | 39 | 4 | 2 | 117 | 0% | 0% | 0 | 2071 | 0 |  |
| dot/generated/colors-and-scopes.gv | ok | 33 | 3 | 4 | 5 | 50 | 100% | 2% | 0 | 320 | 0 | W_STYLE_BAD_VALUE, W_STYLE_COLOR_LIST, W_STYLE_GRADIENT, W_STYLE_HTML_LABEL |
| dot/generated/graphty-written.gv | ok | 75 | 131 | 6 | 7 | 277 | 9% | 0% | 0 | 75 | 0 |  |
| dot/generated/random-100.gv | ok | 100 | 100 | 4 | 6 | 502 | 90% | 0% | 0 | 1381 | 0 |  |
| dot/generated/random-1000.gv | ok | 1000 | 1000 | 4 | 6 | 5209 | 90% | 0% | 0 | 13805 | 0 |  |
| dot/generated/random-10000.gv.gz | ok | 10000 | 10000 | 4 | 6 | 52057 | 90% | 0% | 0 | 137999 | 0 |  |
| dot/generated/random-10000.gv.gz (cut) | ok | 300 | 153 | 4 | 6 | 1197 | 93% | 0% | 0 | 3263 | 0 |  |
| dot/generated/tamper-block-truncated.gv | ok | 75 | 131 | 6 | 7 | 153 | 3% | 0% | 0 | 1553 | 0 | W_STYLE_BLOCK_IGNORED |
| dot/generated/tamper-native-edited.gv | ok | 75 | 131 | 7 | 7 | 277 | 9% | 0% | 0 | 75 | 0 |  |
| dot/generated/tamper-node-added.gv | ok | 76 | 131 | 6 | 7 | 153 | 3% | 0% | 0 | 1565 | 0 | W_STYLE_BLOCK_IGNORED |
| dot/graphviz-gallery-directed-bazel.gv | ok | 8 | 15 | 3 | 3 | 0 | - | - | 0 | 200 | 0 |  |
| dot/graphviz-gallery-directed-go-package.gv | ok | 20 | 49 | 5 | 3 | 0 | - | - | 0 | 592 | 0 |  |
| dot/graphviz-gallery-directed-lion_share.gv | ok | 47 | 51 | 8 | 4 | 82 | 1% | 1% | 0 | 618 | 0 |  |
| dot/graphviz-gallery-directed-neural-network.gv | ok | 10 | 9 | 5 | 3 | 25 | 100% | 0% | 0 | 142 | 0 | W_STYLE_RECORD_LABEL |
| dot/graphviz-gallery-directed-ninja.gv | ok | 125 | 131 | 5 | 7 | 12 | 0% | 0% | 0 | 1651 | 0 |  |
| dot/graphviz-gallery-directed-profile.gv | ok | 61 | 85 | 4 | 4 | 42 | 0% | 0% | 0 | 1145 | 0 |  |
| dot/graphviz-gallery-directed-sdh.gv | ok | 75 | 131 | 6 | 7 | 174 | 2% | 0% | 0 | 1532 | 0 |  |
| dot/graphviz-gallery-gradient-colors.gv | ok | 28 | 3 | 6 | 3 | 64 | 100% | 0% | 0 | 264 | 0 | W_STYLE_GRADIENT |
| dot/graphviz-gallery-gradient-g_c_n.gv | ok | 2 | 0 | 5 | 1 | 3 | 100% | 0% | 0 | 15 | 0 | W_STYLE_GRADIENT |
| dot/graphviz-gallery-neato-colors.gv | ok | 13 | 21 | 4 | 5 | 28 | 43% | 0% | 0 | 177 | 0 |  |
| dot/graphviz-gallery-neato-philo.gv | ok | 21 | 27 | 6 | 3 | 9 | 0% | 0% | 0 | 402 | 0 |  |
| dot/graphviz-gallery-neato-traffic_lights.gv | ok | 14 | 16 | 6 | 3 | 6 | 33% | 33% | 0 | 252 | 0 |  |
| dot/graphviz-gallery-neato-transparency.gv | ok | 6 | 6 | 5 | 1 | 10 | 100% | 0% | 0 | 90 | 0 | W_STYLE_ALPHA_DROPPED |
| dot/graphviz-gallery-twopi-networkmap_twopi.gv.gz | ok | 426 | 425 | 8 | 2 | 7 | 86% | 86% | 0 | 5530 | 0 | W_STYLE_HTML_LABEL |
| dot/graphviz-gallery-twopi-twopi2.gv | ok | 1090 | 1118 | 5 | 7 | 1691 | 23% | 23% | 0 | 15574 | 0 |  |
| dot/graphviz-gallery-undirected-gd_1994_2007.gv | ok | 506 | 1380 | 6 | 2 | 667 | 100% | 0% | 0 | 16468 | 0 |  |
| dot/graphviz-gallery-undirected-root.gv | ok | 1054 | 1083 | 6 | 7 | 1637 | 23% | 23% | 0 | 13043 | 0 |  |
| dot/raphael-group_machina__T_seed9_mut1.dot | ok | 79 | 78 | 6 | 5 | 134 | 5% | 0% | 0 | 1257 | 0 | W_STYLE_COLOR_LIST |
| dot/vivek3141_super-mario-neat__Digraph.gv | ok | 281 | 878 | 5 | 8 | 1837 | 48% | 0% | 0 | 7235 | 0 |  |
| dot/zjunlp_KnowledgeCircuits__graph.gv | ok | 95 | 452 | 6 | 5 | 867 | 54% | 0% | 0 | 3639 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_HTML_LABEL |
| gexf/cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz | ok | 225 | 1090 | 6 | 4 | 0 | - | - | 0 | 9229 | 0 |  |
| gexf/fidelity/graphology-rio.gexf.gz | ok | 366 | 1107 | 7 | 6 | 796 | 0% | 0% | 0 | 10342 | 0 |  |
| gexf/fidelity/synth-13-hierarchy.gexf | ok | 60 | 104 | 6 | 5 | 140 | 69% | 0% | 0 | 1256 | 0 | W_STYLE_UNKNOWN_VALUE |
| gexf/fidelity/synth-nx-viz.gexf | ok | 96 | 193 | 9 | 7 | 202 | 67% | 0% | 0 | 2227 | 0 |  |
| gexf/generated/alpha-text.gexf | ok | 4 | 0 | 6 | 1 | 0 | - | - | 0 | 43 | 0 |  |
| gexf/generated/broken-viz.gexf | ok | 120 | 2 | 7 | 4 | 24 | 0% | 0% | 0 | 1245 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gexf/generated/distinct-1000-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 14880 | 100% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-128-keyed.gexf.gz | ok | 5000 | 0 | 8 | 1 | 14802 | 66% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-2-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 7500 | 0% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-32-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 14529 | 0% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-5000-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 14894 | 100% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-64-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 14763 | 0% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-65-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 14769 | 0% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/distinct-8-keyed.gexf.gz | ok | 5000 | 0 | 7 | 1 | 13125 | 0% | 0% | 0 | 40000 | 0 |  |
| gexf/generated/gexf10-edges-first.gexf | ok | 24 | 30 | 7 | 5 | 18 | 0% | 0% | 0 | 451 | 0 |  |
| gexf/generated/gexf13-hex-and-labels.gexf | ok | 40 | 0 | 7 | 1 | 14 | 0% | 0% | 0 | 400 | 0 |  |
| gexf/generated/graphty-written.gexf | ok | 60 | 120 | 8 | 6 | 163 | 67% | 0% | 0 | 1145 | 0 |  |
| gexf/generated/joint-100-classes.gexf.gz | ok | 2000 | 0 | 7 | 1 | 1970 | 100% | 0% | 0 | 20000 | 0 |  |
| gexf/generated/nonlinear-ramps.gexf | ok | 1500 | 0 | 8 | 1 | 3169 | 95% | 0% | 1327 | 12000 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/generated/random-all-60.gexf | ok | 60 | 120 | 8 | 6 | 158 | 70% | 0% | 0 | 1325 | 0 |  |
| gexf/generated/random-all-600.gexf | ok | 600 | 1200 | 8 | 6 | 1662 | 70% | 0% | 0 | 13209 | 0 |  |
| gexf/generated/random-all-6000.gexf.gz | ok | 6000 | 12000 | 8 | 6 | 16830 | 70% | 0% | 0 | 132006 | 0 |  |
| gexf/generated/tamper-block-truncated.gexf | ok | 60 | 120 | 9 | 6 | 163 | 71% | 0% | 0 | 1145 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/generated/tamper-native-edited.gexf | ok | 60 | 120 | 9 | 6 | 163 | 68% | 1% | 0 | 1145 | 0 |  |
| gexf/generated/tamper-node-added.gexf | ok | 61 | 120 | 8 | 6 | 163 | 71% | 0% | 0 | 1156 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/gexfjs-celegans.gexf.gz | ok | 306 | 2148 | 7 | 3 | 330 | 0% | 0% | 462 | 17178 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/gexfjs-miserables.gexf | ok | 77 | 254 | 7 | 3 | 179 | 0% | 0% | 0 | 2317 | 0 |  |
| gexf/glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz | ok | 868 | 1334 | 8 | 4 | 1626 | 50% | 0% | 676 | 16282 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/graphology-basic.gexf | ok | 2 | 3 | 5 | 6 | 3 | 100% | 0% | 0 | 40 | 0 |  |
| gexf/graphology-missing_nodes.gexf | ok | 2 | 1 | 6 | 4 | 0 | - | - | 0 | 29 | 0 |  |
| gexf/gsa-fpki-certs.gexf | ok | 120 | 119 | 6 | 4 | 0 | - | - | 0 | 1913 | 0 |  |
| gexf/pygraphistry-sample-1.3-viz.gexf | ok | 2 | 1 | 5 | 4 | 3 | 100% | 0% | 0 | 22 | 0 |  |
| gexf/pygraphistry-sample.gexf | ok | 2 | 1 | 5 | 5 | 3 | 100% | 0% | 0 | 22 | 0 |  |
| gexf/qvge-mine-airing.gexf | ok | 64 | 117 | 6 | 5 | 1 | 100% | 0% | 0 | 1461 | 0 | W_STYLE_UNKNOWN_VALUE |
| gexf/rgexf-lesmiserables.gexf | ok | 77 | 254 | 7 | 3 | 98 | 0% | 0% | 84 | 2317 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/sigma-arctic.gexf.gz | ok | 1715 | 6676 | 7 | 5 | 4521 | 0% | 0% | 0 | 59237 | 0 |  |
| gexf/sigma-moroccan-ediaspora.gexf.gz | ok | 156 | 397 | 7 | 5 | 160 | 0% | 0% | 196 | 3901 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/sigma-standard_graph.gexf | ok | 17 | 35 | 6 | 5 | 26 | 100% | 0% | 0 | 367 | 0 |  |
| gexf/sigma-website-diseasome.gexf.gz | ok | 1419 | 3926 | 7 | 4 | 1060 | 0% | 0% | 1148 | 38603 | 0 | W_STYLE_RAMP_ROUNDED |
| gml/ImperialCollegeLondon_pyrealm__pmodel.gml | ok | 36 | 57 | 5 | 6 | 55 | 36% | 4% | 0 | 465 | 0 |  |
| gml/TwelveYC_network-vi__metabolicpos.gml | ok | 453 | 2040 | 7 | 5 | 0 | - | - | 0 | 17919 | 0 |  |
| gml/di-unipi-socc_dgLBF__germany50.gml | ok | 50 | 88 | 2 | 1 | 0 | - | - | 0 | 0 | 0 | W_STYLE_UNKNOWN_VALUE |
| gml/fidelity/bionetgen-ruleviz-pattern.gml | ok | 134 | 40 | 6 | 3 | 72 | 0% | 0% | 0 | 1084 | 0 |  |
| gml/fidelity/dunnart-autobahn.gml | ok | 53 | 83 | 4 | 3 | 31 | 100% | 0% | 0 | 777 | 0 |  |
| gml/fidelity/dunnart-planar-orthogonal.gml | ok | 60 | 65 | 3 | 3 | 7 | 100% | 0% | 0 | 690 | 0 |  |
| gml/fidelity/jgrapht-grid-territorio.gml | ok | 25 | 40 | 5 | 2 | 5 | 0% | 0% | 0 | 430 | 0 |  |
| gml/fidelity/repro-groups-no-creator.gml | ok | 21 | 11 | 6 | 3 | 36 | 25% | 25% | 0 | 219 | 0 |  |
| gml/fidelity/synthetic-coverage.gml | ok | 82 | 80 | 3 | 3 | 719 | 100% | 0% | 0 | 367 | 0 | W_STYLE_GRADIENT, W_STYLE_NOT_CARRIED, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| gml/fidelity/visualgraph-tree30.gml | ok | 30 | 29 | 4 | 2 | 30 | 97% | 0% | 0 | 324 | 0 |  |
| gml/generated/cytoscape-interactions.gml | ok | 30 | 45 | 4 | 3 | 87 | 0% | 0% | 0 | 1125 | 0 |  |
| gml/generated/gephi-unquoted-creator.gml | ok | 40 | 70 | 7 | 5 | 87 | 0% | 0% | 0 | 812 | 0 |  |
| gml/generated/graphics-mix.gml | ok | 60 | 60 | 4 | 1 | 234 | 78% | 0% | 0 | 0 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gml/generated/graphty-written.gml | ok | 30 | 40 | 7 | 7 | 74 | 14% | 0% | 0 | 30 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/igraph-flat-attributes.gml | ok | 20 | 25 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| gml/generated/networkx-graphics.gml | ok | 24 | 30 | 3 | 2 | 45 | 33% | 0% | 0 | 0 | 0 |  |
| gml/generated/ogdf-escaped-labels.gml | ok | 25 | 35 | 10 | 6 | 67 | 18% | 4% | 0 | 240 | 0 |  |
| gml/generated/tamper-block-truncated.gml | ok | 30 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-native-edited.gml | ok | 30 | 40 | 8 | 7 | 74 | 15% | 1% | 0 | 30 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-node-added.gml | ok | 31 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/yed-labels-and-arrows.gml | ok | 30 | 40 | 7 | 7 | 34 | 0% | 0% | 0 | 332 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL |
| gml/spupyrev_bob__need4stacks261.gml | ok | 261 | 777 | 5 | 3 | 165 | 12% | 4% | 0 | 6681 | 0 |  |
| graphml/LTVA1_STM32CrapSynth__func.graphml.gz | ok | 147 | 94 | 7 | 4 | 483 | 83% | 8% | 0 | 629 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_UNKNOWN_VALUE |
| graphml/SleepyTrousers_EnderIO-1.5-1.12__TileEntities.graphml | ok | 70 | 72 | 9 | 7 | 98 | 76% | 4% | 0 | 291 | 0 |  |
| graphml/StateSmith_StateSmith__Spec1Sm.graphml | ok | 14 | 7 | 4 | 3 | 48 | 100% | 6% | 0 | 47 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/a-little-srdjan_grapher__bleve.graphml.gz | ok | 39 | 120 | 3 | 3 | 229 | 100% | 0% | 0 | 39 | 0 |  |
| graphml/architolk_mimtools__fbm-mim2.graphml.gz | ok | 73 | 38 | 6 | 6 | 150 | 63% | 14% | 0 | 362 | 0 | W_STYLE_EXTRA_LABELS |
| graphml/color-key/iVis-at-Bilkent__chilay__circle.graphml | ok | 64 | 64 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/cytoscape/Multiomics-Analytics-Group__MicW2Graph__Wastewater_assembly_nosinglt_cclasso_10.graphml | ok | 4 | 6 | 2 | 1 | 0 | - | - | 0 | 198 | 0 |  |
| graphml/cytoscape/Thakar-Lab__WikiNetworks__WP3935_cytoscape.graphml | ok | 24 | 14 | 2 | 1 | 0 | - | - | 0 | 770 | 0 |  |
| graphml/cytoscape/chatox__networks-science-course__karate.graphml | ok | 34 | 78 | 2 | 1 | 0 | - | - | 0 | 2196 | 0 |  |
| graphml/cytoscape/coinslab__pgdcm__AH_DCM.graphml | ok | 31 | 39 | 2 | 1 | 0 | - | - | 0 | 1392 | 0 |  |
| graphml/cytoscape/karchern__network_connectivity_queries__eco03258.graphml | ok | 21 | 0 | 2 | 1 | 0 | - | - | 0 | 441 | 0 |  |
| graphml/fidelity/galaxy-lcms-workflow.graphml | ok | 55 | 39 | 5 | 6 | 152 | 49% | 3% | 0 | 236 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/libcitygml-mapping.graphml | ok | 51 | 57 | 8 | 5 | 86 | 78% | 12% | 0 | 222 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/magiclantern-architecture.graphml | ok | 43 | 34 | 6 | 6 | 143 | 59% | 2% | 0 | 173 | 0 |  |
| graphml/fidelity/open-archaeo.graphml | ok | 61 | 54 | 6 | 5 | 148 | 61% | 9% | 0 | 276 | 0 | W_STYLE_NO_FILL |
| graphml/fidelity/scala-collection-mutable.graphml | ok | 42 | 42 | 5 | 6 | 59 | 54% | 0% | 0 | 185 | 0 | W_STYLE_NO_FILL |
| graphml/fidelity/synthetic-edges.graphml | ok | 40 | 109 | 3 | 2 | 369 | 100% | 0% | 0 | 337 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/fidelity/synthetic-nodes.graphml | ok | 74 | 24 | 2 | 2 | 370 | 100% | 0% | 0 | 156 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/generated/fill-oddities.graphml | ok | 15 | 3 | 4 | 2 | 18 | 100% | 11% | 0 | 108 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/generated/graphty-written.graphml | ok | 50 | 50 | 4 | 3 | 328 | 87% | 0% | 0 | 50 | 0 |  |
| graphml/generated/labels-multi.graphml | ok | 6 | 0 | 3 | 1 | 0 | - | - | 0 | 31 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_EXTRA_LABELS |
| graphml/generated/ramp-with-exceptions.graphml.gz | ok | 1000 | 0 | 4 | 1 | 1551 | 63% | 0% | 1420 | 6000 | 0 | W_STYLE_RAMP_ROUNDED |
| graphml/generated/scale-50.graphml | ok | 50 | 50 | 4 | 3 | 328 | 87% | 0% | 0 | 350 | 0 |  |
| graphml/generated/scale-500.graphml.gz | ok | 500 | 500 | 4 | 4 | 3391 | 67% | 0% | 0 | 3500 | 0 |  |
| graphml/generated/scale-5000.graphml.gz | ok | 5000 | 5000 | 4 | 4 | 34424 | 67% | 0% | 0 | 35000 | 0 |  |
| graphml/generated/tamper-block-truncated.graphml | ok | 50 | 50 | 4 | 3 | 328 | 87% | 0% | 0 | 200 | 0 | W_STYLE_BLOCK_IGNORED |
| graphml/generated/tamper-native-edited.graphml | ok | 50 | 50 | 5 | 3 | 329 | 87% | 0% | 0 | 50 | 0 |  |
| graphml/generated/tamper-node-added.graphml | ok | 51 | 50 | 3 | 3 | 328 | 87% | 0% | 0 | 211 | 0 | W_STYLE_BLOCK_IGNORED |
| graphml/generated/yfiles3-shared-cycle.graphml | ok | 3 | 0 | 2 | 1 | 1 | 100% | 0% | 0 | 24 | 0 | W_STYLE_REFERENCE_CYCLE, W_STYLE_UNRESOLVED |
| graphml/gephi-large/othercriteria__StochasticBlockmodel__celegans-modified.graphml.gz | ok | 306 | 2345 | 8 | 4 | 770 | 0% | 0% | 2 | 18863 | 0 | W_STYLE_RAMP_ROUNDED |
| graphml/gephi-large/saraiva3__Shape-of-War__ONLY_RED.graphml | ok | 166 | 544 | 8 | 3 | 423 | 71% | 0% | 0 | 5136 | 0 |  |
| graphml/gephi-rgb/NetworkGraphs__graphysics__LesMiserables.graphml | ok | 77 | 254 | 8 | 3 | 182 | 0% | 0% | 0 | 2394 | 0 |  |
| graphml/gephi-rgb/nielmclaren__constellation.js__data.graphml | ok | 47 | 57 | 8 | 4 | 102 | 0% | 0% | 0 | 775 | 0 |  |
| graphml/inbloom_secure-data-service__index.graphml | ok | 100 | 51 | 4 | 5 | 453 | 48% | 0% | 0 | 316 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/ZUGFeRD__mustangproject__mustangArchitecture.graphml | ok | 10 | 4 | 6 | 2 | 20 | 75% | 20% | 0 | 32 | 0 |  |
| graphml/java-graphml-lib/boschglobal__dse.clib__arch__fmi_library.graphml | ok | 33 | 5 | 8 | 3 | 55 | 84% | 24% | 0 | 78 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/domondi1__KEVGraph__guin-D__Library-Management-System.graphml | ok | 16 | 15 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/yed-genericnode/Accenture__reactive-interaction-gateway__overview.graphml | ok | 13 | 4 | 6 | 3 | 39 | 54% | 0% | 0 | 36 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/CERT-Polska__ursadb__dataset.graphml | ok | 11 | 0 | 5 | 1 | 12 | 67% | 0% | 0 | 11 | 0 |  |
| graphml/yed-genericnode/TimothyJones__github-cognito-openid-wrapper__overview.graphml | ok | 8 | 3 | 5 | 2 | 17 | 100% | 24% | 0 | 45 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/awslabs__aws-c-io__slots.graphml | ok | 4 | 0 | 3 | 1 | 6 | 100% | 0% | 0 | 9 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/brucou__kingly__hero_graph.graphml | ok | 6 | 8 | 3 | 3 | 1 | 100% | 0% | 0 | 21 | 0 |  |
| graphml/yed-genericnode/buaazp__zimg__arch.graphml | ok | 32 | 27 | 10 | 4 | 154 | 56% | 3% | 0 | 133 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/diennea__herddb__herddb.graphml | ok | 14 | 0 | 4 | 1 | 39 | 51% | 0% | 0 | 24 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/IBM__responsible-prompting-course__prompt_anatomy.graphml.gz | ok | 98 | 162 | 7 | 5 | 444 | 76% | 3% | 0 | 584 | 0 |  |
| graphml/yed-large/crocs-muni__scrutiny__SCRUTINYWholeProcess.graphml.gz | ok | 31 | 0 | 4 | 1 | 80 | 63% | 0% | 0 | 119 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/cuba-platform__documentation__DeploymentStructure.graphml.gz | ok | 263 | 6 | 6 | 3 | 273 | 84% | 18% | 0 | 1806 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz | ok | 152 | 254 | 7 | 3 | 736 | 93% | 5% | 0 | 914 | 0 |  |
| graphml/yed-shapenode/Animatron__player__flow.graphml | ok | 12 | 14 | 7 | 4 | 45 | 58% | 2% | 0 | 51 | 0 |  |
| graphml/yed-shapenode/awslabs__ml-io__architecture.graphml | ok | 14 | 6 | 7 | 3 | 19 | 74% | 37% | 0 | 26 | 0 |  |
| graphml/yed-shapenode/getopt-php__getopt-php__getopt.graphml | ok | 13 | 8 | 8 | 4 | 35 | 29% | 3% | 0 | 42 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/kwk__docker-registry-setup__setup.graphml | ok | 7 | 12 | 3 | 6 | 33 | 73% | 0% | 0 | 21 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/linux4sam__egt__v4l2.graphml | ok | 9 | 5 | 6 | 3 | 23 | 35% | 26% | 0 | 27 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/svanoort__pyresttest__contexts.graphml | ok | 32 | 18 | 7 | 4 | 120 | 46% | 2% | 0 | 113 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/voc__voctomix__schema.graphml | ok | 43 | 48 | 4 | 4 | 244 | 47% | 0% | 0 | 220 | 0 |  |
| graphml/yed-svgnode/JustDerb__yed-aws-palettes__AWS_-_Blockchain.graphml | ok | 2 | 0 | 3 | 1 | 2 | 100% | 0% | 0 | 12 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/ZUGFeRD__quba-viewer__XSLGenesis.graphml | ok | 62 | 9 | 5 | 3 | 143 | 56% | 1% | 0 | 319 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/japila-books__apache-spark-internals__spark-rdd-partitioned-distributed.graphml | ok | 17 | 0 | 3 | 1 | 39 | 49% | 0% | 0 | 41 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/kyriosdata__rnds__xds.b.graphml | ok | 12 | 11 | 6 | 4 | 21 | 43% | 38% | 0 | 15 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/mitogen-hq__mitogen__persistent.graphml | ok | 9 | 6 | 5 | 3 | 23 | 100% | 26% | 0 | 29 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/sk2__autonetkit-py__small_internet.graphml | ok | 15 | 18 | 3 | 4 | 1 | 0% | 0% | 0 | 69 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/Arannamoy-Mondal__Cryptocurrency-Yearly-Market-Analysis-Using-SQL__Schema.graphml | ok | 23 | 24 | 3 | 3 | 61 | 100% | 0% | 0 | 209 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml | ok | 37 | 37 | 5 | 3 | 71 | 32% | 4% | 0 | 185 | 0 | W_STYLE_GRADIENT |
| graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz | ok | 177 | 183 | 7 | 6 | 259 | 96% | 27% | 0 | 1418 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/OmniOneID__did-doc-architecture__genKey_iOS.graphml | ok | 14 | 7 | 4 | 2 | 24 | 50% | 0% | 0 | 86 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/aleph-im__pyaleph__PyAleph_architecture.graphml | ok | 30 | 3 | 9 | 3 | 44 | 48% | 11% | 0 | 42 | 0 |  |
| graphml/yfiles-html/cheind__autoregressive__wavenet-causal-padding.graphml | ok | 21 | 22 | 5 | 3 | 24 | 0% | 0% | 0 | 162 | 0 |  |
| graphml/yfiles-html/luizomf__design-patterns-python__State_1.graphml | ok | 4 | 13 | 3 | 5 | 13 | 100% | 0% | 0 | 56 | 0 |  |
| json/cyjs-colajs (data and stylesheet) | ok | 21 | 593 | 3 | 4 | 965 | 0% | 0% | 0 | 12789 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-colajs-data.json | ok | 21 | 593 | 1 | 2 | 0 | - | - | 0 | 15308 | 0 |  |
| json/cyjs-cose-bilkent-compound.json | ok | 28 | 35 | 3 | 5 | 0 | - | - | 0 | 1498 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs-edge-arrows (data and stylesheet) | ok | 24 | 12 | 4 | 3 | 10 | 0% | 0% | 0 | 756 | 0 |  |
| json/cyjs-edge-arrows-data.json | ok | 24 | 12 | 1 | 2 | 0 | - | - | 0 | 852 | 0 |  |
| json/cyjs-enrichment-map-desktop-style (data and stylesheet) | ok | 525 | 6421 | 4 | 3 | 0 | - | - | 0 | 109561 | 0 |  |
| json/cyjs-enrichment-map.networks.json.gz | ok | 525 | 6421 | 1 | 2 | 0 | - | - | 0 | 172600 | 0 |  |
| json/cyjs-genemania-export.json | ok | 31 | 255 | 2 | 1 | 0 | - | - | 0 | 5527 | 0 |  |
| json/cyjs-node-types (data and stylesheet) | ok | 26 | 0 | 4 | 1 | 26 | 19% | 19% | 0 | 520 | 0 | W_STYLE_UNKNOWN_VALUE |
| json/cyjs-node-types-data.json | ok | 26 | 0 | 1 | 1 | 0 | - | - | 0 | 598 | 0 |  |
| json/cyjs-tokyo-railways (data and stylesheet) | ok | 943 | 860 | 2 | 5 | 410 | 0% | 0% | 0 | 33231 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-tokyo-railways.json.gz | ok | 943 | 860 | 2 | 1 | 0 | - | - | 0 | 37086 | 0 |  |
| json/cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 63000 | 0 |  |
| json/cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 15 | 7 | 777 | 0% | 0% | 0 | 14331 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 1075 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2557 | 0% | 0% | 0 | 13610 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2406 | 0% | 0% | 0 | 13599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-10.cyjs | ok | 400 | 0 | 14 | 1 | 422 | 0% | 0% | 0 | 8814 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-160.cyjs | ok | 400 | 0 | 15 | 1 | 215 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-20.cyjs | ok | 400 | 0 | 15 | 1 | 536 | 0% | 0% | 0 | 8803 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-40.cyjs | ok | 400 | 0 | 15 | 1 | 477 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-5.cyjs | ok | 400 | 0 | 9 | 1 | 485 | 0% | 0% | 0 | 8852 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-only-80.cyjs | ok | 400 | 0 | 15 | 1 | 502 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-10.cyjs | ok | 400 | 0 | 14 | 1 | 967 | 0% | 0% | 0 | 8075 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-160.cyjs | ok | 400 | 0 | 15 | 1 | 1126 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-20.cyjs | ok | 400 | 0 | 15 | 1 | 769 | 0% | 0% | 0 | 8027 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-40.cyjs | ok | 400 | 0 | 15 | 1 | 877 | 0% | 0% | 0 | 8005 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-5.cyjs | ok | 400 | 0 | 8 | 1 | 730 | 0% | 0% | 0 | 8207 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv4/opacity-plus-80.cyjs | ok | 400 | 0 | 15 | 1 | 769 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/all-30.cyjs | ok | 400 | 0 | 15 | 1 | 1197 | 0% | 0% | 0 | 6599 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/all-300.cyjs | ok | 400 | 0 | 15 | 1 | 1355 | 0% | 0% | 0 | 6400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-30.cyjs | ok | 400 | 0 | 15 | 1 | 645 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-300.cyjs | ok | 400 | 0 | 15 | 1 | 392 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bc-30.cyjs | ok | 400 | 0 | 15 | 1 | 823 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bc-300.cyjs | ok | 400 | 0 | 15 | 1 | 871 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bg-30.cyjs | ok | 400 | 0 | 15 | 1 | 823 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-bg-300.cyjs | ok | 400 | 0 | 15 | 1 | 871 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-col-fs-30.cyjs | ok | 400 | 0 | 15 | 1 | 458 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-col-fs-300.cyjs | ok | 400 | 0 | 15 | 1 | 550 | 0% | 0% | 0 | 8000 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-lab-30.cyjs | ok | 400 | 0 | 15 | 1 | 330 | 0% | 0% | 0 | 8806 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-lab-300.cyjs | ok | 400 | 0 | 15 | 1 | 609 | 0% | 0% | 0 | 8800 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-shape-30.cyjs | ok | 400 | 0 | 15 | 1 | 524 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-shape-300.cyjs | ok | 400 | 0 | 15 | 1 | 798 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-w-30.cyjs | ok | 400 | 0 | 15 | 1 | 503 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv5/op-w-300.cyjs | ok | 400 | 0 | 15 | 1 | 807 | 0% | 0% | 0 | 8400 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bc-then-bcbg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bg-then-bgop.cyjs | ok | 4 | 0 | 4 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/bg-then-bgw.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-default-then-class.cyjs | ok | 9 | 0 | 5 | 1 | 6 | 0% | 0% | 0 | 177 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-size-default-then-class-color.cyjs | ok | 9 | 0 | 3 | 1 | 6 | 0% | 0% | 0 | 186 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/common-two-classes.cyjs | ok | 9 | 0 | 4 | 1 | 3 | 0% | 0% | 0 | 197 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/eq-sel.cyjs | ok | 4 | 0 | 3 | 1 | 0 | - | - | 0 | 84 | 0 |  |
| json/cyjs/adv6/fo-then-fobg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/op-then-bg.cyjs | ok | 4 | 0 | 4 | 1 | 3 | 67% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/op-then-opw.cyjs | ok | 4 | 0 | 4 | 1 | 3 | 67% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/shape-then-shapebg.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/size-then-sizebg-wonly.cyjs | ok | 4 | 0 | 3 | 1 | 1 | 0% | 0% | 0 | 87 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/size-then-sizebg.cyjs | ok | 4 | 0 | 3 | 1 | 2 | 0% | 0% | 0 | 84 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/three-rules.cyjs | ok | 4 | 0 | 5 | 1 | 4 | 50% | 0% | 0 | 86 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv6/two-rules.cyjs | ok | 4 | 0 | 4 | 1 | 0 | - | - | 0 | 88 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2001 | 0% | 0% | 0 | 14408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2001 | 0% | 0% | 0 | 14408 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 16 | 364 | 4% | 4% | 0 | 2420 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 7 | 5 | 23 | 43% | 43% | 0 | 3532 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| json/cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 14 | 6 | 96 | 10% | 10% | 0 | 3300 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-graphmaker.json | ok | 211 | 271 | 4 | 6 | 115 | 0% | 0% | 0 | 9586 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-perf.json.gz | ok | 500 | 1000 | 2 | 5 | 1959 | 0% | 0% | 0 | 33500 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-sbgn-sciluna.json | ok | 52 | 53 | 10 | 4 | 177 | 30% | 0% | 0 | 2079 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/cyjs-synth-edges-saved.json | ok | 101 | 58 | 7 | 14 | 64 | 13% | 2% | 0 | 3160 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-synth-edges.json | ok | 101 | 58 | 7 | 14 | 64 | 13% | 2% | 0 | 3160 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-synth-nodes.json | ok | 110 | 0 | 13 | 1 | 227 | 11% | 8% | 0 | 1939 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/fidelity/cyjs-tokyo.json.gz | ok | 943 | 860 | 2 | 5 | 410 | 0% | 0% | 0 | 33231 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/fidelity/cyjs-winecheese.json.gz | ok | 369 | 1333 | 7 | 5 | 2131 | 0% | 0% | 0 | 34862 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/fidelity/gephi-worldcup.json.gz | ok | 736 | 9228 | 4 | 3 | 9645 | 90% | 0% | 716 | 61992 | 0 | W_STYLE_RAMP_ROUNDED |
| json/fidelity/graphology-synth.json | ok | 100 | 270 | 3 | 3 | 584 | 54% | 0% | 0 | 2717 | 0 |  |
| json/fidelity/sigma-lesmis.json | ok | 77 | 254 | 3 | 2 | 227 | 69% | 0% | 110 | 2471 | 0 | W_STYLE_RAMP_ROUNDED |
| json/fidelity/vis-lesmiserables.json | ok | 77 | 254 | 15 | 3 | 126 | 0% | 0% | 0 | 4018 | 0 |  |
| json/fidelity/vis-nodelegend.json | ok | 21 | 15 | 8 | 4 | 69 | 48% | 1% | 0 | 306 | 0 |  |
| json/fidelity/vis-siblings.json | ok | 200 | 284 | 6 | 3 | 158 | 0% | 0% | 0 | 4808 | 0 |  |
| json/fidelity/vis-synth.json | ok | 72 | 84 | 10 | 6 | 232 | 65% | 24% | 0 | 1052 | 0 | W_STYLE_UNKNOWN_VALUE |
| json/fidelity/vis-transparency.json | ok | 50 | 100 | 3 | 3 | 0 | - | - | 0 | 1850 | 0 |  |
| json/fidelity/vis-unix.json | ok | 41 | 49 | 3 | 3 | 0 | - | - | 0 | 916 | 0 |  |
| json/fidelity/vis-world.json | ok | 48 | 69 | 3 | 3 | 0 | - | - | 0 | 1308 | 0 |  |
| json/generated/cytoscape-graphty-written.json | ok | 4 | 3 | 6 | 5 | 14 | 79% | 57% | 0 | 3 | 0 |  |
| json/generated/cytoscape-tamper-block-truncated.json | ok | 4 | 3 | 8 | 10 | 14 | 57% | 57% | 0 | 96 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/cytoscape-tamper-native-edited.json | ok | 4 | 3 | 7 | 5 | 14 | 86% | 64% | 0 | 3 | 0 |  |
| json/generated/cytoscape-tamper-node-added.json | ok | 5 | 3 | 8 | 10 | 14 | 57% | 57% | 0 | 108 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-graphty-written.json | ok | 4 | 3 | 6 | 5 | 9 | 78% | 67% | 0 | 98 | 0 |  |
| json/generated/graphology-tamper-block-truncated.json | ok | 4 | 3 | 2 | 2 | 9 | 100% | 0% | 0 | 54 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-tamper-native-edited.json | ok | 4 | 3 | 7 | 5 | 9 | 89% | 78% | 0 | 98 | 0 |  |
| json/generated/graphology-tamper-node-added.json | ok | 5 | 3 | 2 | 2 | 9 | 100% | 0% | 0 | 66 | 0 | W_STYLE_BLOCK_IGNORED |
| json/graphology-arctic.json.gz | ok | 1715 | 6228 | 1 | 1 | 0 | - | - | 0 | 70404 | 0 |  |
| json/graphology-eurosis.json.gz | ok | 1285 | 7524 | 4 | 1 | 2118 | 0% | 0% | 1540 | 71757 | 0 | W_STYLE_RAMP_ROUNDED |
| json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json | ok | 44 | 44 | 5 | 4 | 30 | 0% | 0% | 0 | 1746 | 0 |  |
| json/sciluna_cytoscape.js-sbgn-layout__9613829.json | ok | 52 | 53 | 10 | 4 | 177 | 30% | 0% | 0 | 2079 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/scsweb2020_graph-maker__aggregate-cy-graph.json.gz | ok | 211 | 271 | 4 | 6 | 115 | 0% | 0% | 0 | 9586 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN |
| json/sigma-website-airports.json.gz | ok | 3257 | 37042 | 1 | 1 | 0 | - | - | 0 | 335420 | 0 |  |
| json/sigma-website-euroSIS.json.gz | ok | 1285 | 7524 | 2 | 1 | 0 | - | - | 0 | 75612 | 0 |  |
| json/sigma-website-wikipedia.json.gz | ok | 2085 | 0 | 1 | 1 | 0 | - | - | 0 | 25020 | 0 |  |
| json/vis-WorldCup2014.json.gz | ok | 736 | 9228 | 4 | 3 | 9645 | 90% | 0% | 716 | 61992 | 0 | W_STYLE_RAMP_ROUNDED |
| json/vis-dot-to-graph-softmaint.json | ok | 213 | 269 | 5 | 3 | 202 | 100% | 0% | 0 | 4943 | 0 |  |
| pajek/SamTseng_CATAR__Pajek_format.net | ok | 3 | 8 | 3 | 4 | 11 | 100% | 45% | 0 | 76 | 0 |  |
| pajek/fidelity/1crn.net | ok | 327 | 337 | 7 | 1 | 363 | 0% | 0% | 0 | 6273 | 0 |  |
| pajek/fidelity/c.net | ok | 65 | 125 | 3 | 3 | 2 | 100% | 0% | 0 | 1080 | 0 |  |
| pajek/fidelity/football.net | ok | 35 | 118 | 2 | 4 | 207 | 33% | 33% | 0 | 1150 | 0 |  |
| pajek/fidelity/kdorola.net | ok | 127 | 152 | 5 | 3 | 109 | 0% | 0% | 0 | 2030 | 0 |  |
| pajek/fidelity/lin-rel4.net | ok | 234 | 604 | 4 | 3 | 300 | 0% | 0% | 0 | 6828 | 0 |  |
| pajek/fidelity/synth-lines.net | ok | 40 | 111 | 3 | 5 | 263 | 63% | 54% | 0 | 720 | 0 |  |
| pajek/fidelity/synth-vertices.net | ok | 81 | 112 | 2 | 1 | 281 | 100% | 0% | 0 | 1320 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/b98-trailing-zero.net | ok | 12 | 26 | 5 | 4 | 29 | 55% | 14% | 0 | 250 | 0 |  |
| pajek/generated/color-forms.net | ok | 8 | 5 | 3 | 4 | 12 | 100% | 25% | 0 | 139 | 0 | W_STYLE_BAD_VALUE |
| pajek/generated/colors-mix.net | ok | 80 | 80 | 3 | 8 | 292 | 82% | 25% | 0 | 1250 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/graphty-written.net | ok | 6 | 7 | 2 | 5 | 27 | 89% | 22% | 0 | 38 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/nan-values.net | ok | 4 | 16 | 3 | 3 | 0 | - | - | 0 | 148 | 0 |  |
| pajek/generated/proto-color-names.net | ok | 3 | 2 | 3 | 5 | 4 | 100% | 25% | 0 | 50 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/shapes-and-lines.net | ok | 6 | 7 | 2 | 5 | 23 | 100% | 26% | 0 | 71 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-block-truncated.net | ok | 6 | 7 | 3 | 5 | 22 | 100% | 27% | 0 | 72 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-native-edited.net | ok | 6 | 7 | 3 | 5 | 27 | 89% | 22% | 0 | 38 | 0 | W_STYLE_UNKNOWN_VALUE |
| pajek/generated/tamper-node-added.net | ok | 7 | 7 | 3 | 5 | 24 | 100% | 25% | 0 | 79 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_UNKNOWN_VALUE |
| pajek/graphstream_gs-core__B.net | ok | 111 | 193 | 6 | 4 | 151 | 0% | 0% | 0 | 1631 | 0 |  |
| pajek/kjhealy_kjhnet__iliad_killedby.net | ok | 311 | 292 | 4 | 3 | 75 | 76% | 76% | 0 | 6417 | 0 |  |
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
| xgmml/BasicDataVizDemo.xgmml.gz | ok | 331 | 362 | 7 | 5 | 438 | 74% | 0% | 0 | 3796 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/STRING-BreastCancer_expr.xgmml.gz | ok | 21 | 98 | 4 | 3 | 101 | 19% | 0% | 0 | 616 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/String_Network-breast_cancer.xgmml.gz | ok | 90 | 378 | 3 | 3 | 324 | 0% | 0% | 0 | 2430 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/aracne-mycccnd1.xgmml.gz | ok | 236 | 241 | 6 | 3 | 50 | 2% | 2% | 0 | 4288 | 0 |  |
| xgmml/fidelity/dream4-signaling.xgmml | ok | 40 | 58 | 5 | 2 | 13 | 0% | 0% | 0 | 864 | 0 |  |
| xgmml/fidelity/gcmodeller-demo.xgmml | ok | 20 | 24 | 3 | 3 | 23 | 100% | 0% | 0 | 240 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/imagenet-dog-children.xgmml | ok | 190 | 189 | 5 | 2 | 22 | 100% | 100% | 0 | 3412 | 0 |  |
| xgmml/fidelity/networkportal-nsoxphos.xgmml | ok | 69 | 88 | 7 | 4 | 196 | 11% | 11% | 0 | 1394 | 0 |  |
| xgmml/fidelity/pathguide-allpathwaysdb.xgmml | ok | 48 | 75 | 5 | 3 | 27 | 0% | 0% | 0 | 1080 | 0 |  |
| xgmml/fidelity/repro-name-only-labels.xgmml | ok | 14 | 13 | 6 | 2 | 9 | 0% | 0% | 0 | 283 | 0 |  |
| xgmml/fidelity/syn-bypass.xgmml.gz | ok | 67 | 110 | 4 | 6 | 259 | 79% | 29% | 0 | 1378 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/fidelity/syn-mappings.xgmml.gz | ok | 96 | 140 | 6 | 7 | 1628 | 54% | 0% | 6 | 1276 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_RAMP_ROUNDED |
| xgmml/fidelity/wp4271-cy3-export.xgmml.gz | ok | 158 | 90 | 7 | 7 | 500 | 50% | 10% | 0 | 1398 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/generated/graphics-mix.xgmml | ok | 80 | 80 | 4 | 3 | 408 | 66% | 0% | 0 | 2120 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| xgmml/generated/graphty-written-block-other-graph.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 625 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-block-truncated.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 625 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-native-edit.xgmml.gz | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| xgmml/generated/graphty-written.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| xgmml/parklab_NGSCheckMate__luad.out.xgmml | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 946 | 0 |  |
| xgmml/sample_yeast_network.xgmml.gz | ok | 128 | 220 | 8 | 7 | 62 | 79% | 66% | 0 | 1868 | 0 | W_STYLE_NOT_CARRIED |
