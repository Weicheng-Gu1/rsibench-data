# Direct full-training gate result

- Result: `targeted_training_infrastructure_contaminated`
- Candidate source commit: `121d86731dcaea330c6072bf9cf4ff99ab7495e8`
- Repeats per claimed task: `3`
- Evidence: `/volume/ywan/yss/rsibench/runs/formal-environment-learning-claude-opus-4-8-meta-same-pi-skyinfer-32w-full-18-direct-g5-tr3-te3-20260826T165724Z/cells/environment-learning/claude-opus-4-8/pi/attempts/1/pi-source-evolution/archive/round-05/candidates/round-05/attempt-03/target-validation/result.json`

- `edgebench-molecular_self_assembly`: baseline `0.15101989864235751`, candidate `None`, delta `None`
- `edgebench-dcss_dungeon_ai`: baseline `0.05954806589291775`, candidate `None`, delta `None`
- `edgebench-graph_node_classification`: baseline `0.0`, candidate `None`, delta `None`
- `edgebench-wesnoth_tactical_ai`: baseline `0.8166666666666668`, candidate `None`, delta `None`
- `edgebench-sphere_eversion_formalization`: baseline `0.10791729702471003`, candidate `None`, delta `None`
- `edgebench-juliet_vulnerability_analyzer`: baseline `0.5576333333333333`, candidate `None`, delta `None`
- `edgebench-integer_compression_codec`: baseline `0.0732786230107954`, candidate `None`, delta `None`
- `edgebench-vehicle_routing_time_windows`: baseline `0.39173318394627393`, candidate `None`, delta `None`
- `edgebench-flt_regular_formalization`: baseline `0.0574712643678161`, candidate `None`, delta `None`
- `edgebench-vibrating_path_graph_coloring`: baseline `0.3333333333333333`, candidate `None`, delta `None`
- `edgebench-ad_placement_optimization`: baseline `0.6059429078765494`, candidate `None`, delta `None`
- `edgebench-ann_vector_search_qps`: baseline `0.24274717393128456`, candidate `None`, delta `None`
- `edgebench-tree_block_partitioning`: baseline `0.13268518666666665`, candidate `None`, delta `None`
- `edgebench-exchange_core_throughput`: baseline `0.0`, candidate `None`, delta `None`
- `edgebench-openttd_transport_ai`: baseline `0.0`, candidate `None`, delta `None`

The controller evaluated every frozen training task and compared the candidate mean with the cached accepted mean. Acceptance additionally requires improvements on at least two distinct tasks and rejects any task falling from 3/3 to 1/3 or 0/3. There are no target, anchor, or post-review gates in direct mode.
