# Training evidence overview

Mean reward: 0.23533179564618031
Trajectories: 45 across 15 tasks.

## Observed outcome patterns

- agent_timeout: 15 task(s) — edgebench-ad_placement_optimization, edgebench-ann_vector_search_qps, edgebench-dcss_dungeon_ai, edgebench-exchange_core_throughput, edgebench-flt_regular_formalization, edgebench-graph_node_classification, edgebench-integer_compression_codec, edgebench-juliet_vulnerability_analyzer, edgebench-molecular_self_assembly, edgebench-openttd_transport_ai, edgebench-sphere_eversion_formalization, edgebench-tree_block_partitioning, edgebench-vehicle_routing_time_windows, edgebench-vibrating_path_graph_coloring, edgebench-wesnoth_tactical_ai
- task_solution_failure: 5 task(s) — edgebench-ad_placement_optimization, edgebench-graph_node_classification, edgebench-integer_compression_codec, edgebench-vibrating_path_graph_coloring, edgebench-wesnoth_tactical_ai

## Diagnostic guardrails

- Outcome categories are symptoms, not root causes.
- Each detail report now joins the real external verifier result to the
  chronological agent judgments, tool calls, and observations.
- Agent narration over-represents agent-loop explanations. Inspect observation,
  context, tools, verification, provider runtime, and shared resources before choosing.
- Partial-pass tasks are highest-value evidence: use the aligned failed/pass pair,
  then identify the causally critical action rather than blindly trusting the first
  syntactic divergence.
- Prefer deterministic executable mechanisms over generic reminders.
