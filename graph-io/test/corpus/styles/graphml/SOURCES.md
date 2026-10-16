# GraphML style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `a-little-srdjan_grapher__bleve.graphml.gz` | https://raw.githubusercontent.com/a-little-srdjan/grapher/63d8536dd0cddc8d5203f20069e4e11e38082ba9/samples/bleve.graphml | MIT | GitHub a-little-srdjan/grapher samples/bleve.graphml |
| `architolk_mimtools__fbm-mim2.graphml.gz` | https://raw.githubusercontent.com/architolk/mimtools/c34e9717f540645ce709161bc3629c760188bedd/fbm-metamodel/fbm-mim2.graphml | MIT | GitHub architolk/mimtools fbm-metamodel/fbm-mim2.graphml |
| `color-key/iVis-at-Bilkent__chilay__circle.graphml` | https://raw.githubusercontent.com/iVis-at-Bilkent/chilay/605e77732a6f06da2081e2d89a68084c1e508cdb/graphs/circle.graphml | MIT |  |
| `cytoscape/chatox__networks-science-course__karate.graphml` | https://raw.githubusercontent.com/chatox/networks-science-course/a678e3600a643d60994c1ee12fb1a03949866f8b/practicum/data/karate-club/karate.graphml | CC-BY-4.0 |  |
| `cytoscape/coinslab__pgdcm__AH_DCM.graphml` | https://raw.githubusercontent.com/coinslab/pgdcm/a732dcf39277817d9b5f69dc72b885f6034375c3/vignettes/AH_DCM.graphml | MIT |  |
| `cytoscape/karchern__network_connectivity_queries__eco03258.graphml` | https://raw.githubusercontent.com/karchern/network_connectivity_queries/c47e6fa4b5c68bdbdcf64791046764920911cd7f/networks_graphml/eco/eco03258.graphml | MIT |  |
| `cytoscape/Multiomics-Analytics-Group__MicW2Graph__Wastewater_assembly_nosinglt_cclasso_10.graphml` | https://raw.githubusercontent.com/Multiomics-Analytics-Group/MicW2Graph/69eb3762c8df02fc70f10fef42e7cf231cfa348f/data/Microb_asso_nets/Wastewater/Assembly/Wastewater_assembly_nosinglt_cclasso_10.graphml | MIT |  |
| `cytoscape/Thakar-Lab__WikiNetworks__WP3935_cytoscape.graphml` | https://raw.githubusercontent.com/Thakar-Lab/WikiNetworks/0c3f9c97029931072047c7e03191eb2a42b697e8/data/cytoscape_networks/WP3935_cytoscape.graphml | MIT |  |
| `generated/fill-oddities.graphml` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/graphty-written.graphml` | Generated for this project: `generated/scale-50.graphml` imported with its styles and written by graph-io's GraphML exporter with them | MIT (generated for this project) | a file graphty wrote: yEd graphics and the `graphty.styles` block |
| `generated/labels-multi.graphml` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/ramp-with-exceptions.graphml.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/scale-50.graphml` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/scale-500.graphml.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/scale-5000.graphml.gz` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `generated/tamper-block-truncated.graphml` | Generated for this project: `graphty-written.graphml` with its `graphty.styles` block cut in half | MIT (generated for this project) | block-tamper fixture: the block is ignored (NOT_JSON) |
| `generated/tamper-native-edited.graphml` | Generated for this project: `graphty-written.graphml` with one node's `y:Fill` color changed | MIT (generated for this project) | block-tamper fixture: the edit comes back as one exception |
| `generated/tamper-node-added.graphml` | Generated for this project: `graphty-written.graphml` with one node added | MIT (generated for this project) | block-tamper fixture: the block is ignored (FINGERPRINT) |
| `generated/yfiles3-shared-cycle.graphml` | Written by hand for this project | MIT (generated for this project) | yFiles 3 shared data whose references refer to themselves and each other |
| `gephi-large/othercriteria__StochasticBlockmodel__celegans-modified.graphml.gz` | https://raw.githubusercontent.com/othercriteria/StochasticBlockmodel/a33b274bc8196c38fc659e44941a9ecf589cb739/data/celegans-modified.graphml | MIT |  |
| `gephi-large/saraiva3__Shape-of-War__ONLY_RED.graphml` | https://raw.githubusercontent.com/saraiva3/Shape-of-War/454f7d77f919742420dfa4cdc44820f0c88f91ea/src/MultiEdge/graphs/ONLY_RED.graphml | MIT |  |
| `gephi-rgb/NetworkGraphs__graphysics__LesMiserables.graphml` | https://raw.githubusercontent.com/NetworkGraphs/graphysics/8c0335f683d8de5ef7694b20752df5016ddd69e2/data/LesMiserables.graphml | MIT |  |
| `gephi-rgb/nielmclaren__constellation.js__data.graphml` | https://raw.githubusercontent.com/nielmclaren/constellation.js/bbe77e3d8e5daa575e9c0e62441d23013d11d829/data/data.graphml | MIT |  |
| `inbloom_secure-data-service__index.graphml` | https://raw.githubusercontent.com/inbloom/secure-data-service/9aee3b965493a9b2a90d6a3b6502ce8aacc66f77/sli/domain/Documentation/index.graphml | Apache-2.0 | GitHub inbloom/secure-data-service sli/domain/Documentation/index.graphml |
| `java-graphml-lib/boschglobal__dse.clib__arch__fmi_library.graphml` | https://raw.githubusercontent.com/boschglobal/dse.clib/787cbe5af31a351378ede747cba880df004b77f8/doc/yed/arch__fmi_library.graphml | Apache-2.0 |  |
| `java-graphml-lib/domondi1__KEVGraph__guin-D__Library-Management-System.graphml` | https://raw.githubusercontent.com/domondi1/KEVGraph/71d65bbf97fcbfc195fe3218c61ae38d4dd7a37c/data/maven/graphs/guin-D__Library-Management-System.graphml | MIT |  |
| `java-graphml-lib/ZUGFeRD__mustangproject__mustangArchitecture.graphml` | https://raw.githubusercontent.com/ZUGFeRD/mustangproject/17f716b23ddd3d0978cb21f7765553ea39762f2b/doc/mustangArchitecture.graphml | Apache-2.0 |  |
| `LTVA1_STM32CrapSynth__func.graphml.gz` | https://raw.githubusercontent.com/LTVA1/STM32CrapSynth/25764bceb4231ce7088ae8fd1eeb3df12fc5f08a/func.graphml | MIT | GitHub LTVA1/STM32CrapSynth func.graphml |
| `SleepyTrousers_EnderIO-1.5-1.12__TileEntities.graphml` | https://raw.githubusercontent.com/SleepyTrousers/EnderIO-1.5-1.12/9249b7e01fd73c7bc92a2fd60e768c1ef5b39fd3/doc/diagrams/TileEntities.graphml | Unlicense | GitHub SleepyTrousers/EnderIO-1.5-1.12 doc/diagrams/TileEntities.graphml |
| `StateSmith_StateSmith__Spec1Sm.graphml` | https://raw.githubusercontent.com/StateSmith/StateSmith/0c32be37bf4d4fee5499780a5ef37a7996c192f9/src/StateSmithTest/spec/1/Spec1Sm.graphml | Apache-2.0 | GitHub StateSmith/StateSmith src/StateSmithTest/spec/1/Spec1Sm.graphml |
| `yed-genericnode/Accenture__reactive-interaction-gateway__overview.graphml` | https://raw.githubusercontent.com/Accenture/reactive-interaction-gateway/b65435c63db0572e7a0ed5acba08198c0bed7439/guides/overview.graphml | Apache-2.0 |  |
| `yed-genericnode/awslabs__aws-c-io__slots.graphml` | https://raw.githubusercontent.com/awslabs/aws-c-io/ee0165f744743927cf617e9909974bbceb1bcad9/docs/graphs/slots.graphml | Apache-2.0 |  |
| `yed-genericnode/brucou__kingly__hero_graph.graphml` | https://raw.githubusercontent.com/brucou/kingly/4c6f87d2d8e3162ff32bd7351ca9d926cf85d767/assets/hero%20graph.graphml | MIT |  |
| `yed-genericnode/buaazp__zimg__arch.graphml` | https://raw.githubusercontent.com/buaazp/zimg/5cd73c5d603f54f47f11a64e23553a4390ed6d39/doc/arch.graphml | BSD-3-Clause |  |
| `yed-genericnode/CERT-Polska__ursadb__dataset.graphml` | https://raw.githubusercontent.com/CERT-Polska/ursadb/9dce7ddbc002560016732fe7474906936313b802/docs/dataset.graphml | BSD-3-Clause |  |
| `yed-genericnode/diennea__herddb__herddb.graphml` | https://raw.githubusercontent.com/diennea/herddb/f10954477d9a183082fd07f3695f37de7c76fa9d/docs/herddb.graphml | Apache-2.0 |  |
| `yed-genericnode/TimothyJones__github-cognito-openid-wrapper__overview.graphml` | https://raw.githubusercontent.com/TimothyJones/github-cognito-openid-wrapper/9f56e3a9edfa5737773a66e406fae8feb8b68021/docs/overview.graphml | BSD-3-Clause |  |
| `yed-large/crocs-muni__scrutiny__SCRUTINYWholeProcess.graphml.gz` | https://raw.githubusercontent.com/crocs-muni/scrutiny/a24e2e39f898d48702efa2c5bdf18a247d1a979b/docs/SCRUTINYWholeProcess.graphml | MIT |  |
| `yed-large/cuba-platform__documentation__DeploymentStructure.graphml.gz` | https://raw.githubusercontent.com/cuba-platform/documentation/fa4486203145dadb5f775e289101d33a8b39ca86/content/manual/img_src/DeploymentStructure.graphml | CC-BY-4.0 |  |
| `yed-large/IBM__responsible-prompting-course__prompt_anatomy.graphml.gz` | https://raw.githubusercontent.com/IBM/responsible-prompting-course/75879600c39f767f2889d96e23d1d152849454a6/docs/prompt_anatomy.graphml | Apache-2.0 |  |
| `yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz` | https://raw.githubusercontent.com/ministryofjustice/cla_backend/84f94e01dd200ca13b149ab981041345a715516c/cla_backend/apps/diagnosis/data/checker-graph.graphml | MIT |  |
| `yed-shapenode/Animatron__player__flow.graphml` | https://raw.githubusercontent.com/Animatron/player/6eb7fb85cba677ca83918220450df0bb7a122cb1/doc/flow.graphml | MIT |  |
| `yed-shapenode/awslabs__ml-io__architecture.graphml` | https://raw.githubusercontent.com/awslabs/ml-io/bf29354d1cccee23c7f562c1f3604357528ea87d/doc/architecture.graphml | Apache-2.0 |  |
| `yed-shapenode/getopt-php__getopt-php__getopt.graphml` | https://raw.githubusercontent.com/getopt-php/getopt-php/ed9006ac30a3b55c5dd7c689f2c53cc6721e223e/docs/getopt.graphml | MIT |  |
| `yed-shapenode/kwk__docker-registry-setup__setup.graphml` | https://raw.githubusercontent.com/kwk/docker-registry-setup/101aa6e8cba1c58174cceee549383efcdfb0fb15/docs/setup.graphml | Apache-2.0 |  |
| `yed-shapenode/linux4sam__egt__v4l2.graphml` | https://raw.githubusercontent.com/linux4sam/egt/b2cb2d4af77af5faed2c95db31c80696a63b61f2/docs/src/v4l2.graphml | Apache-2.0 |  |
| `yed-shapenode/svanoort__pyresttest__contexts.graphml` | https://raw.githubusercontent.com/svanoort/pyresttest/f92acf8e838c4623ddd8e12e880f31046ff9317f/site/contexts.graphml | Apache-2.0 |  |
| `yed-shapenode/voc__voctomix__schema.graphml` | https://raw.githubusercontent.com/voc/voctomix/173287ba60ce77c0595477f97c904f513de12c4d/doc/schema.graphml | MIT |  |
| `yed-svgnode/japila-books__apache-spark-internals__spark-rdd-partitioned-distributed.graphml` | https://raw.githubusercontent.com/japila-books/apache-spark-internals/512b4b15e6fdfdcb30ca1cb360368a14ec8ae9dc/docs/images/diagrams/spark-rdd-partitioned-distributed.graphml | Apache-2.0 |  |
| `yed-svgnode/JustDerb__yed-aws-palettes__AWS_-_Blockchain.graphml` | https://raw.githubusercontent.com/JustDerb/yed-aws-palettes/a7504de8bd9f1f7dadf297857e6dc528f7329a35/AWS%20-%20Blockchain.graphml | MIT |  |
| `yed-svgnode/kyriosdata__rnds__xds.b.graphml` | https://raw.githubusercontent.com/kyriosdata/rnds/32737e333c1983f33f3295c9916233e923fd7946/imagens/xds.b.graphml | Apache-2.0 |  |
| `yed-svgnode/mitogen-hq__mitogen__persistent.graphml` | https://raw.githubusercontent.com/mitogen-hq/mitogen/60f5a53aa6c58926ce7624cfd5f1141cc38b6b89/docs/images/persistent.graphml | BSD-3-Clause |  |
| `yed-svgnode/sk2__autonetkit-py__small_internet.graphml` | https://raw.githubusercontent.com/sk2/autonetkit-py/cae459a0c57d53022177cf61e1735559f85a59f4/autonetkit/example/small_internet.graphml | BSD-3-Clause |  |
| `yed-svgnode/ZUGFeRD__quba-viewer__XSLGenesis.graphml` | https://raw.githubusercontent.com/ZUGFeRD/quba-viewer/1362ad45f238e7f17ec3c5a722ed92067e5ae18b/doc/XSLGenesis.graphml | Apache-2.0 |  |
| `yfiles-html-large/Arannamoy-Mondal__Cryptocurrency-Yearly-Market-Analysis-Using-SQL__Schema.graphml` | https://raw.githubusercontent.com/Arannamoy-Mondal/Cryptocurrency-Yearly-Market-Analysis-Using-SQL/838b7d36ef8a7afeeedea1f6ef2b02d42ce948ca/Schema.graphml | Apache-2.0 |  |
| `yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml` | https://raw.githubusercontent.com/ctmrbio/stag-mwc/2c6e62cc2702bb31e4ae1cc968651f9408575446/docs/source/img/stag_flowchart.graphml | MIT |  |
| `yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz` | https://raw.githubusercontent.com/spacestation13/SS13-Codebases/800da82735093a8109cd3b98d950d60f3201f139/tree.graphml | MIT |  |
| `yfiles-html/aleph-im__pyaleph__PyAleph_architecture.graphml` | https://raw.githubusercontent.com/aleph-im/pyaleph/c407b90ba1d06f490088d726a2b54d0a1d908d34/docs/figures/PyAleph%20architecture.graphml | MIT |  |
| `yfiles-html/cheind__autoregressive__wavenet-causal-padding.graphml` | https://raw.githubusercontent.com/cheind/autoregressive/e54c7f2cf66c6ffde706ea5839c747b5ab9b61c1/etc/presentation/wavenet-causal-padding.graphml | MIT |  |
| `yfiles-html/luizomf__design-patterns-python__State_1.graphml` | https://raw.githubusercontent.com/luizomf/design-patterns-python/5017e33fa18060e2dcca31aa5eb1879b19654ad5/behavioral/state/State%201.graphml | MIT |  |
| `yfiles-html/OmniOneID__did-doc-architecture__genKey_iOS.graphml` | https://raw.githubusercontent.com/OmniOneID/did-doc-architecture/cbef31640c78f7e12c8b4f7772c57f51daeff29c/docs/concepts/graphml/genKey_iOS.graphml | Apache-2.0 |  |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

On 2026-10-16 the owner chose to commit every file of the style fidelity corpus regardless of its license, so some files below state no license, or one that does not allow redistribution; each row gives the license its source states, or "none stated".

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/open-archaeo.graphml` | https://github.com/zackbatist/open-archaeo/blob/c6121916ea3c18f0c521d34c4cfed41d3703fa5c/open-archaeo.graphml | CC0-1.0 | yed GraphML |
| `fidelity/galaxy-lcms-workflow.graphml` | https://github.com/galaxyproject/training-material/blob/e02e01a4dd4ab2d42d01138c47fb44cf855e7947/topics/metabolomics/images/tutorial-lcms-workflow.graphml | MIT | yed GraphML |
| `fidelity/scala-collection-mutable.graphml` | https://github.com/soulmachine/scala-cheat-sheet/blob/778c8158b267976ba17334b1239fa9542f99563f/images/scala-collection-mutable.graphml | Apache-2.0 | yed GraphML |
| `fidelity/libcitygml-mapping.graphml` | https://github.com/jklimke/libcitygml/blob/141ed719c0ccdf8691e1dc98aa4f915438292b6b/citygml_to_libcitygml_mapping.graphml | LGPL-2.1 | yed GraphML |
| `fidelity/synthetic-nodes.graphml` | generated by generators/gen-synthetic.py (seeded) | MIT (generated) | yed GraphML |
| `fidelity/synthetic-edges.graphml` | generated by generators/gen-synthetic.py (seeded) | MIT (generated) | yed GraphML |
| `fidelity/magiclantern-architecture.graphml` | https://github.com/reticulatedpines/magiclantern_simplified/blob/142472e95054d73640f50789ac0fd66325499d82/doc/Architecture_Drawings.graphml | GPL-2.0 | yEd GraphML |
