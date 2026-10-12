# Style corpus results

Written by `test/styles/harness.test.ts`, which fails when this file differs from what the inputs give now;
rerun it with `-u` to accept a change after reviewing it. One row per input: whether it imported, its
elements, the rules its styles plan to per target, and three measures of how readable the rules are. Varying
values are those that differ from their property's most common value; opaque ones come from a rule that only
copies values (an unexplained passthrough or the exceptions), exception ones from the exceptions rule alone.
Tool values are elements drawn with the writing program's default.

343 inputs, 296 with styles; at most 15 node and 15 edge rules.

| Input | Import | Nodes | Edges | Node rules | Edge rules | Varying | Opaque | Exceptions | Approximated | Tool values | Declared selecting nothing | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cx/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx.gz | ok | 32 | 48 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx | ok | 75 | 108 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx.gz | ok | 2207 | 2282 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx.gz | ok | 599 | 739 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/generated/mapping-edges.cx2 | ok | 200 | 100 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-1014623d-c2e0-11f1-be0a-005056ae3c32.cx2.gz | ok | 821 | 1046 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-440c8958-1dd0-11ef-9621-005056ae23aa.cx2.gz | ok | 2718 | 4820 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx2.gz | ok | 32 | 48 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2 | ok | 75 | 108 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-a2d9d91b-b1dc-11ec-b3be-0ac135e8bacf.cx2.gz | ok | 468 | 1713 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx2.gz | ok | 2207 | 2282 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cx2/ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2 | ok | 599 | 739 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 36000 | 0 |  |
| cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 13 | 6 | 765 | 0% | 0% | 0 | 6892 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 625 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2375 | 0% | 0% | 0 | 5210 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2452 | 0% | 0% | 0 | 5199 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
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
| cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6008 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6008 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 15 | 310 | 0% | 0% | 0 | 796 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 6 | 4 | 11 | 91% | 91% | 0 | 1900 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 11 | 5 | 84 | 12% | 12% | 0 | 1668 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| cys/BasicDataVizDemo.cys | ok | 249 | 299 | 3 | 2 | 0 | - | - | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/STELZL.cys | ok | 1603 | 3308 | 3 | 2 | 0 | - | - | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-AnnotationExample.cys | ok | 330 | 359 | 6 | 2 | 727 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/cytoscape-tutorials-layout-v1.cys | ok | 331 | 362 | 3 | 4 | 111 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_OTHER_STYLES |
| cys/generated/graphty-written-block-other-graph.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-block-truncated.cys | ok | 45 | 62 | 4 | 4 | 103 | 0% | 0% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED |
| cys/generated/graphty-written-native-edit.cys | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| cys/generated/graphty-written.cys | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| dot/ArthurConmy_Automatic-Circuit-Discovery__layout.gv | ok | 108 | 926 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/DynamicalSystemsGroup_cats__cats_pkg.gv | ok | 456 | 1003 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/Ensembl_ensembl-hive__long_mult_jobs_04.dot | ok | 18 | 20 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/damoqiongqiu_NiceFish__dependencies.dot | ok | 126 | 75 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/decentraland_architecture__architecture.dot | ok | 53 | 72 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/generated/clusters-200.gv | ok | 1200 | 0 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/generated/colors-and-scopes.gv | ok | 33 | 3 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/generated/random-100.gv | ok | 100 | 100 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/generated/random-1000.gv | ok | 1000 | 1000 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/generated/random-10000.gv.gz | ok | 10000 | 10000 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-bazel.gv | ok | 8 | 15 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-go-package.gv | ok | 20 | 49 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-lion_share.gv | ok | 47 | 51 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-neural-network.gv | ok | 10 | 9 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-ninja.gv | ok | 125 | 131 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-profile.gv | ok | 61 | 85 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-directed-sdh.gv | ok | 75 | 131 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-gradient-colors.gv | ok | 28 | 3 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-gradient-g_c_n.gv | ok | 2 | 0 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-neato-colors.gv | ok | 13 | 21 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-neato-philo.gv | ok | 21 | 27 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-neato-traffic_lights.gv | ok | 14 | 16 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-neato-transparency.gv | ok | 6 | 6 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-twopi-networkmap_twopi.gv.gz | ok | 426 | 425 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-twopi-twopi2.gv | ok | 1090 | 1118 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-undirected-gd_1994_2007.gv | ok | 506 | 1380 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/graphviz-gallery-undirected-root.gv | ok | 1054 | 1083 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/raphael-group_machina__T_seed9_mut1.dot | ok | 79 | 78 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/vivek3141_super-mario-neat__Digraph.gv | ok | 281 | 878 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| dot/zjunlp_KnowledgeCircuits__graph.gv | ok | 95 | 452 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| gexf/cns-iu_cns-pubvis__wos-extract.isi_full-layout.gexf.gz | ok | 225 | 1090 | 2 | 2 | 0 | - | - | 0 | 3495 | 0 |  |
| gexf/generated/alpha-text.gexf | ok | 4 | 0 | 2 | 1 | 0 | - | - | 0 | 15 | 0 |  |
| gexf/generated/broken-viz.gexf | ok | 120 | 2 | 3 | 5 | 33 | 0% | 0% | 0 | 378 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gexf/generated/distinct-1000-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 14880 | 100% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-128-keyed.gexf.gz | ok | 5000 | 0 | 3 | 1 | 14802 | 66% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-2-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 7500 | 0% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-32-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 14529 | 0% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-5000-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 14894 | 100% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-64-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 14763 | 0% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-65-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 14769 | 0% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/distinct-8-keyed.gexf.gz | ok | 5000 | 0 | 2 | 1 | 13125 | 0% | 0% | 0 | 5000 | 0 |  |
| gexf/generated/gexf10-edges-first.gexf | ok | 24 | 30 | 2 | 3 | 18 | 0% | 0% | 0 | 162 | 0 |  |
| gexf/generated/gexf13-hex-and-labels.gexf | ok | 40 | 0 | 2 | 1 | 14 | 0% | 0% | 0 | 120 | 0 |  |
| gexf/generated/graphty-written.gexf | ok | 60 | 120 | 3 | 3 | 429 | 79% | 0% | 0 | 240 | 0 |  |
| gexf/generated/joint-100-classes.gexf.gz | ok | 2000 | 0 | 2 | 1 | 1970 | 100% | 0% | 0 | 6000 | 0 |  |
| gexf/generated/nonlinear-ramps.gexf | ok | 1500 | 0 | 3 | 1 | 3169 | 95% | 0% | 1327 | 1500 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/generated/random-all-60.gexf | ok | 60 | 120 | 3 | 3 | 429 | 79% | 0% | 0 | 240 | 0 |  |
| gexf/generated/random-all-600.gexf | ok | 600 | 1200 | 3 | 3 | 4452 | 79% | 0% | 0 | 2400 | 0 |  |
| gexf/generated/random-all-6000.gexf.gz | ok | 6000 | 12000 | 3 | 3 | 44940 | 79% | 0% | 0 | 24000 | 0 |  |
| gexf/generated/tamper-block-truncated.gexf | ok | 60 | 120 | 3 | 3 | 429 | 79% | 0% | 0 | 240 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/generated/tamper-native-edited.gexf | ok | 60 | 120 | 4 | 3 | 429 | 80% | 0% | 0 | 240 | 0 |  |
| gexf/generated/tamper-node-added.gexf | ok | 61 | 120 | 3 | 3 | 429 | 79% | 0% | 0 | 244 | 0 | W_STYLE_BLOCK_IGNORED |
| gexf/gexfjs-celegans.gexf.gz | ok | 306 | 2148 | 3 | 2 | 788 | 0% | 0% | 4 | 6750 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/gexfjs-miserables.gexf | ok | 77 | 254 | 3 | 2 | 179 | 0% | 0% | 0 | 839 | 0 |  |
| gexf/glxxyz_hskhsk.com__HSK1-3_chars_v09.gexf.gz | ok | 868 | 1334 | 3 | 3 | 2246 | 36% | 0% | 30 | 4870 | 0 | W_STYLE_RAMP_ROUNDED |
| gexf/gsa-fpki-certs.gexf | ok | 120 | 119 | 2 | 3 | 0 | - | - | 0 | 598 | 0 |  |
| gexf/pygraphistry-sample-1.3-viz.gexf | ok | 2 | 1 | 2 | 2 | 3 | 100% | 0% | 0 | 4 | 0 |  |
| gexf/pygraphistry-sample.gexf | ok | 2 | 1 | 2 | 3 | 4 | 100% | 0% | 0 | 2 | 0 |  |
| gexf/qvge-mine-airing.gexf | ok | 64 | 117 | 2 | 4 | 2 | 100% | 0% | 0 | 482 | 0 | W_STYLE_UNKNOWN_VALUE |
| gexf/rgexf-lesmiserables.gexf | ok | 77 | 254 | 3 | 2 | 182 | 0% | 0% | 0 | 839 | 0 |  |
| gexf/sigma-arctic.gexf.gz | ok | 1715 | 6676 | 3 | 2 | 4521 | 0% | 0% | 0 | 21743 | 0 |  |
| gexf/sigma-moroccan-ediaspora.gexf.gz | ok | 156 | 397 | 3 | 3 | 356 | 0% | 0% | 0 | 1347 | 0 |  |
| gexf/sigma-standard_graph.gexf | ok | 17 | 35 | 3 | 2 | 26 | 100% | 0% | 0 | 122 | 0 |  |
| gexf/sigma-website-diseasome.gexf.gz | ok | 1419 | 3926 | 3 | 2 | 2208 | 0% | 0% | 0 | 9271 | 0 |  |
| gml/TwelveYC_network-vi__metabolicpos.gml | ok | 453 | 2040 | 2 | 3 | 0 | - | - | 0 | 6573 | 0 |  |
| gml/di-unipi-socc_dgLBF__germany50.gml | ok | 50 | 88 | 2 | 1 | 0 | - | - | 0 | 0 | 0 | W_STYLE_UNKNOWN_VALUE |
| gml/generated/cytoscape-interactions.gml | ok | 30 | 45 | 4 | 3 | 87 | 0% | 0% | 0 | 690 | 0 |  |
| gml/generated/gephi-unquoted-creator.gml | ok | 40 | 70 | 2 | 4 | 87 | 0% | 0% | 0 | 236 | 0 |  |
| gml/generated/graphics-mix.gml | ok | 60 | 60 | 4 | 1 | 234 | 78% | 0% | 0 | 0 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| gml/generated/graphty-written.gml | ok | 30 | 40 | 7 | 7 | 74 | 14% | 0% | 0 | 30 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/igraph-flat-attributes.gml | ok | 20 | 25 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| gml/generated/networkx-graphics.gml | ok | 24 | 30 | 3 | 2 | 45 | 33% | 0% | 0 | 0 | 0 |  |
| gml/generated/ogdf-escaped-labels.gml | ok | 25 | 35 | 9 | 6 | 67 | 18% | 4% | 0 | 0 | 0 |  |
| gml/generated/tamper-block-truncated.gml | ok | 30 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-native-edited.gml | ok | 30 | 40 | 8 | 7 | 74 | 15% | 1% | 0 | 31 | 0 | W_STYLE_EXTRA_LABELS |
| gml/generated/tamper-node-added.gml | ok | 31 | 40 | 8 | 6 | 74 | 24% | 11% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED, W_STYLE_EXTRA_LABELS |
| gml/generated/yed-labels-and-arrows.gml | ok | 30 | 40 | 7 | 7 | 34 | 0% | 0% | 0 | 332 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL |
| gml/spupyrev_bob__need4stacks261.gml | ok | 261 | 777 | 5 | 3 | 153 | 5% | 5% | 0 | 6681 | 0 |  |
| graphml/LTVA1_STM32CrapSynth__func.graphml.gz | ok | 147 | 94 | 7 | 4 | 310 | 73% | 13% | 0 | 587 | 0 | W_STYLE_ALPHA_DROPPED, W_STYLE_UNKNOWN_VALUE |
| graphml/SleepyTrousers_EnderIO-1.5-1.12__TileEntities.graphml | ok | 70 | 72 | 7 | 4 | 101 | 72% | 4% | 0 | 290 | 0 | W_STYLE_GRADIENT |
| graphml/StateSmith_StateSmith__Spec1Sm.graphml | ok | 14 | 7 | 5 | 3 | 45 | 56% | 7% | 0 | 38 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/a-little-srdjan_grapher__bleve.graphml.gz | ok | 39 | 120 | 3 | 3 | 143 | 100% | 0% | 0 | 0 | 0 |  |
| graphml/architolk_mimtools__fbm-mim2.graphml.gz | ok | 73 | 38 | 9 | 5 | 143 | 61% | 15% | 0 | 303 | 0 | W_STYLE_EXTRA_LABELS |
| graphml/color-key/iVis-at-Bilkent__chilay__circle.graphml | ok | 64 | 64 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/cytoscape/Multiomics-Analytics-Group__MicW2Graph__Wastewater_assembly_nosinglt_cclasso_10.graphml | ok | 4 | 6 | 2 | 1 | 0 | - | - | 0 | 140 | 0 |  |
| graphml/cytoscape/Thakar-Lab__WikiNetworks__WP3935_cytoscape.graphml | ok | 24 | 14 | 2 | 1 | 0 | - | - | 0 | 532 | 0 |  |
| graphml/cytoscape/chatox__networks-science-course__karate.graphml | ok | 34 | 78 | 2 | 1 | 0 | - | - | 0 | 1568 | 0 |  |
| graphml/cytoscape/coinslab__pgdcm__AH_DCM.graphml | ok | 31 | 39 | 2 | 1 | 0 | - | - | 0 | 980 | 0 |  |
| graphml/cytoscape/karchern__network_connectivity_queries__eco03258.graphml | ok | 21 | 0 | 2 | 1 | 0 | - | - | 0 | 294 | 0 |  |
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
| graphml/generated/yfiles3-shared-cycle.graphml | ok | 3 | 0 | 2 | 1 | 1 | 100% | 0% | 0 | 18 | 0 | W_STYLE_REFERENCE_CYCLE, W_STYLE_UNRESOLVED |
| graphml/gephi-large/othercriteria__StochasticBlockmodel__celegans-modified.graphml.gz | ok | 306 | 2345 | 4 | 3 | 770 | 0% | 0% | 2 | 7341 | 0 | W_STYLE_RAMP_ROUNDED |
| graphml/gephi-large/saraiva3__Shape-of-War__ONLY_RED.graphml | ok | 166 | 544 | 4 | 2 | 423 | 71% | 0% | 0 | 1798 | 0 |  |
| graphml/gephi-rgb/NetworkGraphs__graphysics__LesMiserables.graphml | ok | 77 | 254 | 4 | 2 | 182 | 0% | 0% | 0 | 839 | 0 |  |
| graphml/gephi-rgb/nielmclaren__constellation.js__data.graphml | ok | 47 | 57 | 4 | 3 | 102 | 0% | 0% | 0 | 218 | 0 |  |
| graphml/inbloom_secure-data-service__index.graphml | ok | 100 | 51 | 4 | 4 | 398 | 41% | 0% | 0 | 216 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/ZUGFeRD__mustangproject__mustangArchitecture.graphml | ok | 10 | 4 | 6 | 2 | 20 | 75% | 20% | 0 | 28 | 0 |  |
| graphml/java-graphml-lib/boschglobal__dse.clib__arch__fmi_library.graphml | ok | 33 | 5 | 8 | 3 | 52 | 83% | 25% | 0 | 46 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/java-graphml-lib/domondi1__KEVGraph__guin-D__Library-Management-System.graphml | ok | 16 | 15 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| graphml/yed-genericnode/Accenture__reactive-interaction-gateway__overview.graphml | ok | 13 | 4 | 6 | 3 | 34 | 47% | 0% | 0 | 32 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/CERT-Polska__ursadb__dataset.graphml | ok | 11 | 0 | 5 | 1 | 10 | 80% | 0% | 0 | 9 | 0 | W_STYLE_GRADIENT |
| graphml/yed-genericnode/TimothyJones__github-cognito-openid-wrapper__overview.graphml | ok | 8 | 3 | 6 | 2 | 15 | 60% | 27% | 0 | 41 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/awslabs__aws-c-io__slots.graphml | ok | 4 | 0 | 3 | 1 | 6 | 100% | 0% | 0 | 8 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/brucou__kingly__hero_graph.graphml | ok | 6 | 8 | 3 | 3 | 0 | - | - | 0 | 21 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/buaazp__zimg__arch.graphml | ok | 32 | 27 | 9 | 5 | 127 | 48% | 3% | 0 | 120 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-genericnode/diennea__herddb__herddb.graphml | ok | 14 | 0 | 4 | 1 | 39 | 51% | 0% | 0 | 24 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/IBM__responsible-prompting-course__prompt_anatomy.graphml.gz | ok | 98 | 162 | 6 | 2 | 51 | 29% | 29% | 0 | 584 | 0 |  |
| graphml/yed-large/crocs-muni__scrutiny__SCRUTINYWholeProcess.graphml.gz | ok | 31 | 0 | 4 | 1 | 66 | 55% | 0% | 0 | 94 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/cuba-platform__documentation__DeploymentStructure.graphml.gz | ok | 263 | 6 | 6 | 2 | 266 | 83% | 18% | 0 | 1549 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz | ok | 152 | 254 | 7 | 2 | 225 | 79% | 16% | 0 | 912 | 0 |  |
| graphml/yed-shapenode/Animatron__player__flow.graphml | ok | 12 | 14 | 7 | 4 | 35 | 51% | 3% | 0 | 51 | 0 |  |
| graphml/yed-shapenode/awslabs__ml-io__architecture.graphml | ok | 14 | 6 | 7 | 3 | 19 | 74% | 37% | 0 | 26 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/getopt-php__getopt-php__getopt.graphml | ok | 13 | 8 | 6 | 3 | 31 | 19% | 3% | 0 | 41 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/kwk__docker-registry-setup__setup.graphml | ok | 7 | 12 | 3 | 6 | 19 | 53% | 0% | 0 | 21 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/linux4sam__egt__v4l2.graphml | ok | 9 | 5 | 6 | 2 | 21 | 29% | 29% | 0 | 24 | 0 | W_STYLE_NO_FILL |
| graphml/yed-shapenode/svanoort__pyresttest__contexts.graphml | ok | 32 | 18 | 7 | 4 | 118 | 51% | 6% | 0 | 102 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-shapenode/voc__voctomix__schema.graphml | ok | 43 | 48 | 4 | 4 | 214 | 38% | 0% | 0 | 209 | 0 |  |
| graphml/yed-svgnode/JustDerb__yed-aws-palettes__AWS_-_Blockchain.graphml | ok | 2 | 0 | 3 | 1 | 1 | 100% | 0% | 0 | 10 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/ZUGFeRD__quba-viewer__XSLGenesis.graphml | ok | 62 | 9 | 5 | 2 | 136 | 54% | 1% | 0 | 283 | 0 | W_STYLE_GRADIENT, W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/japila-books__apache-spark-internals__spark-rdd-partitioned-distributed.graphml | ok | 17 | 0 | 3 | 1 | 39 | 49% | 0% | 0 | 37 | 0 | W_STYLE_NO_FILL, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/kyriosdata__rnds__xds.b.graphml | ok | 12 | 11 | 6 | 4 | 20 | 40% | 40% | 0 | 15 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/mitogen-hq__mitogen__persistent.graphml | ok | 9 | 6 | 5 | 3 | 20 | 100% | 30% | 0 | 28 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yed-svgnode/sk2__autonetkit-py__small_internet.graphml | ok | 15 | 18 | 3 | 3 | 1 | 0% | 0% | 0 | 54 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/Arannamoy-Mondal__Cryptocurrency-Yearly-Market-Analysis-Using-SQL__Schema.graphml | ok | 23 | 24 | 3 | 3 | 38 | 100% | 0% | 0 | 163 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml | ok | 37 | 37 | 5 | 2 | 34 | 6% | 6% | 0 | 148 | 0 | W_STYLE_GRADIENT, W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz | ok | 177 | 183 | 6 | 6 | 259 | 96% | 27% | 0 | 1241 | 0 | W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/OmniOneID__did-doc-architecture__genKey_iOS.graphml | ok | 14 | 7 | 4 | 2 | 24 | 50% | 0% | 0 | 69 | 0 | W_STYLE_EXTRA_LABELS, W_STYLE_UNKNOWN_VALUE |
| graphml/yfiles-html/aleph-im__pyaleph__PyAleph_architecture.graphml | ok | 30 | 3 | 9 | 2 | 43 | 47% | 12% | 0 | 12 | 0 |  |
| graphml/yfiles-html/cheind__autoregressive__wavenet-causal-padding.graphml | ok | 21 | 22 | 5 | 3 | 24 | 0% | 0% | 0 | 120 | 0 | W_STYLE_ALPHA_DROPPED |
| graphml/yfiles-html/luizomf__design-patterns-python__State_1.graphml | ok | 4 | 13 | 3 | 5 | 2 | 100% | 0% | 0 | 52 | 0 |  |
| json/cyjs-colajs (data and stylesheet) | ok | 21 | 593 | 3 | 3 | 965 | 0% | 0% | 0 | 6098 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-colajs-data.json | ok | 21 | 593 | 1 | 2 | 0 | - | - | 0 | 8003 | 0 |  |
| json/cyjs-cose-bilkent-compound.json | ok | 28 | 35 | 2 | 3 | 0 | - | - | 0 | 826 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs-edge-arrows (data and stylesheet) | ok | 24 | 12 | 4 | 3 | 9 | 0% | 0% | 0 | 396 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| json/cyjs-edge-arrows-data.json | ok | 24 | 12 | 1 | 2 | 0 | - | - | 0 | 492 | 0 |  |
| json/cyjs-enrichment-map-desktop-style (data and stylesheet) | ok | 525 | 6421 | 4 | 2 | 0 | - | - | 0 | 27784 | 0 | W_STYLE_NOT_CARRIED |
| json/cyjs-enrichment-map.networks.json.gz | ok | 525 | 6421 | 1 | 2 | 0 | - | - | 0 | 90823 | 0 |  |
| json/cyjs-genemania-export.json | ok | 31 | 255 | 1 | 1 | 0 | - | - | 0 | 4004 | 0 |  |
| json/cyjs-node-types (data and stylesheet) | ok | 26 | 0 | 4 | 1 | 21 | 0% | 0% | 0 | 286 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_UNKNOWN_VALUE |
| json/cyjs-node-types-data.json | ok | 26 | 0 | 1 | 1 | 0 | - | - | 0 | 364 | 0 |  |
| json/cyjs-tokyo-railways (data and stylesheet) | ok | 943 | 860 | 2 | 4 | 410 | 0% | 0% | 0 | 14424 | 0 | W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR |
| json/cyjs-tokyo-railways.json.gz | ok | 943 | 860 | 1 | 1 | 0 | - | - | 0 | 25242 | 0 |  |
| json/cyjs/adv/cyjs-500-classes.cyjs | ok | 3000 | 0 | 2 | 1 | 5910 | 0% | 0% | 0 | 36000 | 0 |  |
| json/cyjs/adv/cyjs-selector-zoo.cyjs | ok | 300 | 400 | 13 | 6 | 765 | 0% | 0% | 0 | 6892 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv/cyjs-string-stylesheet.cyjs | ok | 50 | 0 | 4 | 1 | 25 | 0% | 0% | 0 | 625 | 0 | W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-30cols.cyjs | ok | 400 | 400 | 15 | 15 | 2375 | 0% | 0% | 0 | 5210 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv3/cyjs-overlap-80cols.cyjs | ok | 400 | 400 | 15 | 15 | 2452 | 0% | 0% | 0 | 5199 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
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
| json/cyjs/adv7/fold-no-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6008 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/adv7/fold-with-prefix-clash.cyjs | ok | 400 | 400 | 15 | 15 | 2047 | 0% | 0% | 0 | 6008 | 0 | W_STYLE_LAYER_CAP, W_STYLE_SELECTOR_AS_COLUMN |
| json/cyjs/rules/cyjs-semantics.cyjs | ok | 60 | 91 | 15 | 15 | 310 | 0% | 0% | 0 | 796 | 0 | W_STYLE_BAD_VALUE, W_STYLE_LAYER_CAP, W_STYLE_SELECTOR, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNKNOWN_VALUE |
| json/cyjs/rules/cyjs-text-stops.cyjs | ok | 60 | 91 | 6 | 4 | 11 | 91% | 91% | 0 | 1900 | 0 | W_STYLE_BAD_VALUE, W_STYLE_SELECTOR_AS_COLUMN, W_STYLE_UNREADABLE |
| json/cyjs/rules/cyjs-text.cyjs | ok | 60 | 91 | 11 | 5 | 84 | 12% | 12% | 0 | 1668 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/generated/cytoscape-graphty-written.json | ok | 4 | 3 | 6 | 4 | 12 | 75% | 50% | 0 | 0 | 0 |  |
| json/generated/cytoscape-tamper-block-truncated.json | ok | 4 | 3 | 8 | 8 | 12 | 50% | 50% | 0 | 34 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/cytoscape-tamper-native-edited.json | ok | 4 | 3 | 7 | 4 | 12 | 83% | 58% | 0 | 0 | 0 |  |
| json/generated/cytoscape-tamper-node-added.json | ok | 5 | 3 | 8 | 8 | 12 | 50% | 50% | 0 | 38 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-graphty-written.json | ok | 4 | 3 | 6 | 4 | 7 | 71% | 57% | 0 | 46 | 0 |  |
| json/generated/graphology-tamper-block-truncated.json | ok | 4 | 3 | 2 | 2 | 7 | 100% | 0% | 0 | 26 | 0 | W_STYLE_BLOCK_IGNORED |
| json/generated/graphology-tamper-native-edited.json | ok | 4 | 3 | 7 | 4 | 7 | 86% | 71% | 0 | 46 | 0 |  |
| json/generated/graphology-tamper-node-added.json | ok | 5 | 3 | 2 | 2 | 7 | 100% | 0% | 0 | 34 | 0 | W_STYLE_BLOCK_IGNORED |
| json/graphology-arctic.json.gz | ok | 1715 | 6228 | 1 | 1 | 0 | - | - | 0 | 38632 | 0 |  |
| json/graphology-eurosis.json.gz | ok | 1285 | 7524 | 4 | 1 | 3136 | 0% | 0% | 4 | 36521 | 0 | W_STYLE_RAMP_ROUNDED |
| json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json | ok | 44 | 44 | 5 | 4 | 30 | 0% | 0% | 0 | 822 | 0 | W_STYLE_NOT_CARRIED |
| json/sciluna_cytoscape.js-sbgn-layout__9613829.json | ok | 52 | 53 | 8 | 3 | 106 | 0% | 0% | 0 | 975 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/scsweb2020_graph-maker__aggregate-cy-graph.json.gz | ok | 211 | 271 | 4 | 3 | 112 | 0% | 0% | 0 | 4435 | 0 | W_STYLE_BAD_VALUE, W_STYLE_NOT_CARRIED, W_STYLE_SELECTOR_AS_COLUMN |
| json/sigma-website-airports.json.gz | ok | 3257 | 37042 | 1 | 1 | 0 | - | - | 0 | 174224 | 0 |  |
| json/sigma-website-euroSIS.json.gz | ok | 1285 | 7524 | 2 | 1 | 0 | - | - | 0 | 40376 | 0 |  |
| json/sigma-website-wikipedia.json.gz | ok | 2085 | 0 | 1 | 1 | 0 | - | - | 0 | 16680 | 0 |  |
| json/vis-WorldCup2014.json.gz | ok | 736 | 9228 | 4 | 3 | 10361 | 84% | 0% | 0 | 22136 | 0 |  |
| json/vis-dot-to-graph-softmaint.json | ok | 213 | 269 | 4 | 3 | 0 | - | - | 0 | 3004 | 0 |  |
| pajek/SamTseng_CATAR__Pajek_format.net | ok | 3 | 8 | - | - | 0 | - | - | 0 | 0 | 0 |  |
| pajek/generated/colors-mix.net | ok | 80 | 80 | - | - | 0 | - | - | 0 | 0 | 0 |  |
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
| xgmml/BasicDataVizDemo.xgmml.gz | ok | 331 | 362 | 7 | 2 | 437 | 74% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/STRING-BreastCancer_expr.xgmml.gz | ok | 21 | 98 | 4 | 3 | 101 | 19% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/String_Network-breast_cancer.xgmml.gz | ok | 90 | 378 | 3 | 3 | 324 | 0% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
| xgmml/generated/graphics-mix.xgmml | ok | 80 | 80 | 3 | 2 | 436 | 100% | 0% | 0 | 1161 | 0 | W_STYLE_BAD_VALUE, W_STYLE_UNKNOWN_VALUE |
| xgmml/generated/graphty-written-block-other-graph.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-block-truncated.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 | W_STYLE_BLOCK_IGNORED |
| xgmml/generated/graphty-written-native-edit.xgmml.gz | ok | 45 | 62 | 5 | 3 | 103 | 1% | 1% | 0 | 0 | 0 |  |
| xgmml/generated/graphty-written.xgmml.gz | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 0 | 0 |  |
| xgmml/parklab_NGSCheckMate__luad.out.xgmml | ok | 45 | 62 | 4 | 3 | 103 | 0% | 0% | 0 | 321 | 0 |  |
| xgmml/sample_yeast_network.xgmml.gz | ok | 128 | 220 | 8 | 4 | 21 | 38% | 0% | 0 | 0 | 0 | W_STYLE_NOT_CARRIED |
