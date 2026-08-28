# Direct full-training gate result

- Result: `direct_full_training_improved`
- Candidate source commit: `74cd1a1aed08b66d57014304f078f720442ee470`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench/runs/formal-environment-learning-claude-opus-4-8-meta-same-pi-skyinfer-32w-full-18-direct-g5-tr3-te3-20260826T165724Z/cells/environment-learning/claude-opus-4-8/pi/attempts/1/pi-source-evolution/archive/round-02/candidates/round-02/attempt-01/target-validation/result.json`

- `edgebench-dcss_dungeon_ai`: baseline `0.03301109640074829`, candidate `0.05954806589291775`, delta `0.02653696949216946`
- `edgebench-vehicle_routing_time_windows`: baseline `0.39102270707700043`, candidate `0.39173318394627393`, delta `0.000710476869273502`
- `edgebench-openttd_transport_ai`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `edgebench-juliet_vulnerability_analyzer`: baseline `0.5388666666666667`, candidate `0.5576333333333333`, delta `0.018766666666666598`
- `edgebench-flt_regular_formalization`: baseline `0.05363984674329502`, candidate `0.0574712643678161`, delta `0.0038314176245210774`
- `edgebench-integer_compression_codec`: baseline `0.14018493104128646`, candidate `0.0732786230107954`, delta `-0.06690630803049107`
- `edgebench-graph_node_classification`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `edgebench-sphere_eversion_formalization`: baseline `0.17095310136157338`, candidate `0.10791729702471003`, delta `-0.06303580433686334`
- `edgebench-vibrating_path_graph_coloring`: baseline `0.2733333333333334`, candidate `0.3333333333333333`, delta `0.05999999999999994`
- `edgebench-molecular_self_assembly`: baseline `0.10384837639059315`, candidate `0.15101989864235751`, delta `0.04717152225176437`
- `edgebench-tree_block_partitioning`: baseline `0.11064814666666667`, candidate `0.13268518666666665`, delta `0.02203703999999998`
- `edgebench-exchange_core_throughput`: baseline `0.0`, candidate `0.0`, delta `0.0`
- `edgebench-ann_vector_search_qps`: baseline `0.30631737799713976`, candidate `0.24274717393128456`, delta `-0.0635702040658552`
- `edgebench-wesnoth_tactical_ai`: baseline `0.7600000000000001`, candidate `0.8166666666666668`, delta `0.05666666666666664`
- `edgebench-ad_placement_optimization`: baseline `0.5839207209359253`, candidate `0.6059429078765494`, delta `0.022022186940624078`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
