# Direct full-training gate result

- Result: `direct_full_training_improved`
- Candidate source commit: `6470c29f17bf3b05042c262a31d3bac481a56584`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench/runs/formal-environment-learning-claude-opus-4-8-meta-same-pi-skyinfer-32w-full-18-direct-g5-tr3-te3-20260826T165724Z/cells/environment-learning/claude-opus-4-8/pi/attempts/1/pi-source-evolution/archive/round-01/candidates/round-01/attempt-01/target-validation/result.json`

- `edgebench-molecular_self_assembly`: baseline `0.08774069884573919`, candidate `0.10384837639059315`, delta `0.016107677544853954`
- `edgebench-vibrating_path_graph_coloring`: baseline `0.060000000000000005`, candidate `0.2733333333333334`, delta `0.21333333333333337`
- `edgebench-juliet_vulnerability_analyzer`: baseline `0.5747`, candidate `0.5388666666666667`, delta `-0.03583333333333327`
- `edgebench-integer_compression_codec`: baseline `0.08307942877804454`, candidate `0.14018493104128646`, delta `0.05710550226324192`
- `edgebench-wesnoth_tactical_ai`: baseline `0.79`, candidate `0.7600000000000001`, delta `-0.029999999999999916`
- `edgebench-vehicle_routing_time_windows`: baseline `0.3838330612407815`, candidate `0.39102270707700043`, delta `0.00718964583621895`
- `edgebench-graph_node_classification`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `edgebench-dcss_dungeon_ai`: baseline `0.023845100298038158`, candidate `0.03301109640074829`, delta `0.009165996102710135`
- `edgebench-openttd_transport_ai`: baseline `0.03624134152355787`, candidate `0.0`, delta `-0.03624134152355787`
- `edgebench-exchange_core_throughput`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `edgebench-flt_regular_formalization`: baseline `0.04597701149425287`, candidate `0.05363984674329502`, delta `0.007662835249042148`
- `edgebench-tree_block_partitioning`: baseline `0.12393518666666666`, candidate `0.11064814666666667`, delta `-0.013287039999999986`
- `edgebench-ad_placement_optimization`: baseline `0.46705920563204534`, candidate `0.5839207209359253`, delta `0.11686151530387995`
- `edgebench-ann_vector_search_qps`: baseline `0.4431632301579391`, candidate `0.30631737799713976`, delta `-0.13684585216079936`
- `edgebench-sphere_eversion_formalization`: baseline `0.16540595057992938`, candidate `0.17095310136157338`, delta `0.005547150781644`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
