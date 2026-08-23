# terminal-bench-adaptive-rejection-sampler — 1/3 pass

This report contains controller-extracted evidence, not a controller-inferred root cause.
The Meta-agent must cross-reference the verifier with an exact action or judgment.

## Rollouts

### repeat_00 — PASS

- trace: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_00/trajectory.jsonl`
- verifier evidence: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_00/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 9, "passed": 9, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `harbor agent failure: AgentTimeoutError: Agent execution timed out after 900.0 seconds`

Actions and judgments:

- action_01 [tool_call]: bash {"command": "which R Rscript 2>/dev/null; R --version 2>/dev/null | head -3; echo \"---\"; ls -la /app"}
- action_02 [judgment]: R is not installed. Let me install it.
- action_03 [tool_call]: bash {"command": "cat /etc/os-release 2>/dev/null | head -5; which apt-get apt 2>/dev/null"}
- action_04 [tool_call]: bash {"command": "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq r-base-core r-base 2>&1 | tail -20", "timeout": 600}
- action_05 [tool_call]: bash {"command": "R --version | head -2"}
- action_06 [judgment]: R 4.3.3 is installed. Now let me write the implementation.
- action_07 [tool_call]: write {"content": "# =============================================================================\n# ars.R - Adaptive Rejection Sampling (ARS)\n#\n# An implementation of the adaptive rejection sampler described in\n#   Gilks, W. R., & Wild, P. (1992). Adaptive rejection sampling for Gibbs\n#   sampling. Journal of the Royal Statistical Society: Series C, 41(2),\n#   337-348.\n#\n#
... [evidence truncated] ...
\n\n  invisible(results)\n}\n\n\n# -----------------------------------------------------------------------------\n# Generate example sample files when the script is sourced so that they are\n# immediately available.\n# -----------------------------------------------------------------------------\ntryCatch(write_sample_files(1000), error = function(e) NULL)\n", "path": "/app/ars.R"}
- action_08 [judgment]: Now let me run the tests.
- action_09 [tool_call]: bash {"command": "cd /app && Rscript -e 'source(\"ars.R\"); test()' 2>&1", "timeout": 300}
- action_10 [judgment]: Most tests pass. There are two issues: (1) a `sprintf` bug where multi-line string literals aren't concatenated, and (2) the exponential case fails with "tangent intersections out of order". Let me diagnose the exponential issue first.
- action_11 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\n# reproduce exponential init\nf <- dexp\na <- 0; b <- Inf\nhd <- make_log_density(f, a, b)\nh <- hd$h; dh <- hd$dh\nmode <- find_mode(h, a, b)\ncat(\"mode =\", mode, \"\\n\")\nst <- initialize_abscissae(h, dh, a, b, mode, NULL)\nprint(st)\n' 2>&1"}
- action_12 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nf <- dexp\na <- 0; b <- Inf\nhd <- make_log_density(f, a, b)\nh <- hd$h; dh <- hd$dh\nmode <- find_mode(h, a, b)\nst <- initialize_abscissae(h, dh, a, b, mode, NULL)\nprint(st$x)\nprint(st$dhx)\nres <- tryCatch(build_hull(st$x, st$hx, st$dhx, a, b), error=function(e) conditionMessage(e))\nprint(res)\n' 2>&1"}
- action_13 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nf <- dexp\na <- 0; b <- Inf\nhd <- make_log_density(f, a, b)\nh <- hd$h; dh <- hd$dh\nmode <- find_mode(h, a, b)\nst <- initialize_abscissae(h, dh, a, b, mode, NULL)\nprint(st$x, digits=16)\nprint(st$dhx, digits=16)\nprint(diff(st$dhx), digits=16)\n' 2>&1"}
### repeat_01 — FAIL

- trace: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_01/trajectory.jsonl`
- verifier evidence: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_01/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 9, "passed": 8, "failed": 1, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `harbor agent failure: AgentTimeoutError: Agent execution timed out after 900.0 seconds`

Actions and judgments:

- action_01 [tool_call]: bash {"command": "which R Rscript 2>/dev/null; R --version 2>/dev/null | head -3; echo \"---\"; ls /app"}
- action_02 [judgment]: R is not installed. Let me install it.
- action_03 [tool_call]: bash {"command": "cat /etc/os-release 2>/dev/null | head -5; echo \"---\"; which apt-get apt 2>/dev/null"}
- action_04 [tool_call]: bash {"command": "apt-get update -qq && apt-get install -y -qq r-base-core r-base 2>&1 | tail -20", "timeout": 600}
- action_05 [tool_call]: bash {"command": "R --version | head -2"}
- action_06 [judgment]: R is installed. Now let me write the implementation.
- action_07 [tool_call]: write {"content": "# ---------------------------------------------------------------------------\n# ars.R  --  Adaptive Rejection Sampling (Gilks & Wild, 1992)\n#\n# Samples from a (possibly unnormalised) log-concave density by building an\n# adaptive piecewise-exponential envelope.\n#\n# Main entry point:\n#     ars(density_function, domain, n = 1000)\n#\n# The density function mu
... [evidence truncated] ...
n  writeLines(format(exp_samples, digits = 12), \"/app/exponential_samples.txt\")\n  cat(sprintf(\"wrote /app/normal_samples.txt (n=%d) and /app/exponential_samples.txt (n=%d)\\n\",\n              length(normal_samples), length(exp_samples)))\n\n  cat(if (all_pass) \"== ALL TESTS PASSED ==\\n\" else \"== SOME TESTS FAILED ==\\n\")\n  invisible(all_pass)\n}\n", "path": "/app/ars.R"}
- action_08 [tool_call]: bash {"command": "cd /app && Rscript -e 'source(\"ars.R\"); test()' 2>&1 | tail -40", "timeout": 300}
- action_09 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nh <- make_log_density(dnorm)\nhp <- make_log_density_prime(h, -Inf, Inf)\ninit <- initialize_abscissae(h, hp, -Inf, Inf)\nprint(init)\nuh <- build_upper_hull(init$xs, init$hs, init$hps, -Inf, Inf)\nprint(uh)\nprint(upper_hull_log_mass(uh))\n' 2>&1 | head -50"}
- action_10 [judgment]: Two bugs to fix: the curvature scale uses the wrong denominator, and the hull mass computation mishandles infinite endpoints. Let me fix both.
- action_11 [tool_call]: edit {"edits": [{"newText": "  # Estimate the local scale from the second derivative of h.\n  curvature_scale <- function(m) {\n    step2 <- 1e-4 * max(1, abs(m))\n    if (is.finite(a)) step2 <- min(step2, (m - a) / 2)\n    if (is.finite(b)) step2 <- min(step2, (b - m) / 2)\n    if (step2 <= 0) return(1)\n    xlo <- m - step2\n    xhi <- m + step2\n    hm <- h(m)\n    hlo <- h(xlo)
... [evidence truncated] ...
inite(tR) || !is.finite(tL) || tR == tL) {\n        stop(\"the upper hull is not integrable over the domain; the density may not be log-concave or may not be integrable\")\n      }\n      logmass[i] <- log(abs(exp(tR) - exp(tL))) - log(abs(s))\n    }\n  }\n  list(logmass = logmass,\n       logtotal = max(logmass) + log(sum(exp(logmass - max(logmass)))))\n}"}], "path": "/app/ars.R"}
- action_12 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nh <- make_log_density(dnorm)\nhp <- make_log_density_prime(h, -Inf, Inf)\ninit <- initialize_abscissae(h, hp, -Inf, Inf)\nprint(init)\nuh <- build_upper_hull(init$xs, init$hs, init$hps, -Inf, Inf)\nprint(uh)\nprint(upper_hull_log_mass(uh))\n' 2>&1 | head -40"}
- action_13 [tool_call]: edit {"edits": [{"newText": "      eL <- if (is.finite(tL)) exp(tL) else if (tL == -Inf) 0 else not_integrable()\n      eR <- if (is.finite(tR)) exp(tR) else if (tR == -Inf) 0 else not_integrable()\n      mass <- (eR - eL) / s\n      if (!is.finite(mass) || mass <= 0) not_integrable()\n      logmass[i] <- log(mass)", "oldText": "      eL <- if (is.finite(tL)) exp(tL) else if (tL == -Inf) 0 else not_integrable()\n      eR <- if (is.finite(tR)) exp(tR) else if (tR == -Inf) 0 else not_integrable()\n      diff <- eR - eL\n      if (!is.finite(diff) || diff <= 0) not_integrable()\n      logmass[i] <- log(diff) - log(abs(s))"}], "path": "/app/ars.R"}
- action_14 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nh <- make_log_density(dnorm)\nhp <- make_log_density_prime(h, -Inf, Inf)\ninit <- initialize_abscissae(h, hp, -Inf, Inf)\nuh <- build_upper_hull(init$xs, init$hs, init$hps, -Inf, Inf)\nprint(upper_hull_log_mass(uh))\nset.seed(1)\nx <- replicate(5000, sample_upper_hull(uh))\ncat(\"hull samples: mean=\", mean(x), \" sd=\", sd(x), \"\\n\")\n' 2>&1 | head -20"}
- action_15 [tool_call]: bash {"command": "cd /app && Rscript -e 'source(\"ars.R\"); test()' 2>&1 | tail -40", "timeout": 300}
- action_16 [judgment]: Found the main bug — the CDF inversion in `sample_upper_hull` is missing the intercept term. Let me fix it.
- action_17 [tool_call]: edit {"edits": [{"newText": "  eL <- exp(ic + s * L)\n  eR <- exp(ic + s * R)\n  # invert the CDF: exp(ic + s*x) = eL + u*(eR - eL)\n  (log(eL + u * (eR - eL)) - ic) / s", "oldText": "  eL <- exp(ic + s * L)\n  eR <- exp(ic + s * R)\n  # invert the CDF: x = log(eL + u * (eR - eL)) / s\n  log(eL + u * (eR - eL)) / s"}], "path": "/app/ars.R"}
- action_18 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nset.seed(42)\nz <- ars(dnorm, c(-Inf, Inf), n = 20000)\ncat(\"normal mean=\", mean(z), \" sd=\", sd(z), \"\\n\")\nset.seed(7)\ne <- ars(function(x) dexp(x, rate=2), c(0, Inf), n = 20000)\ncat(\"exp mean=\", mean(e), \" sd=\", sd(e), \"\\n\")\n' 2>&1 | tail -10", "timeout": 120}
- action_19 [tool_call]: bash {"command": "cd /app && Rscript -e 'source(\"ars.R\"); test()' 2>&1 | tail -40", "timeout": 300}
- action_20 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nbimodal <- function(x) 0.5*dnorm(x,-3) + 0.5*dnorm(x,3)\nset.seed(3)\nres <- tryCatch(ars(bimodal, c(-Inf,Inf), n=500), error=function(e) conditionMessage(e))\nprint(res)\n' 2>&1 | tail -20"}
- action_21 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nbimodal <- function(x) 0.5*dnorm(x,-3) + 0.5*dnorm(x,3)\nh <- make_log_density(bimodal)\nhp <- make_log_density_prime(h, -Inf, Inf)\ninit <- initialize_abscissae(h, hp, -Inf, Inf)\nprint(init)\nuh <- build_upper_hull(init$xs, init$hs, init$hps, -Inf, Inf)\nlh <- build_lower_hull(init$xs, init$hs)\nprint(uh)\nset.seed(3)\
... [evidence truncated] ...
ll_log(lh, x)\n  logw <- log(runif(1))\n  cat(sprintf(\"i=%d x=%.4f ux=%.4f lx=%.4f logw=%.4f squeeze=%s\\n\", i, x, ux, lx, logw, logw <= lx - ux))\n  if (!(logw <= lx - ux)) {\n    hx <- h(x); hpx <- hp(x)\n    cat(sprintf(\"   hx=%.4f hpx=%.4f h>u? %s h<l? %s accept? %s\\n\", hx, hpx, hx > ux + 1e-6, is.finite(lx) && hx < lx - 1e-6, logw <= hx - ux))\n  }\n}\n' 2>&1 | tail -30"}
- action_22 [judgment]: The root cause: numerical noise in the derivative at the true modes (±3) makes `hp ≈ 9e-8`, which `step_out` treats as a valid positive slope, creating a near-flat tail segment with huge mass. Let me use a tolerance for slope signs, and improve the non-finite error message.
- action_23 [tool_call]: edit {"edits": [{"newText": "  zero_tol <- 1e-6\n  sign_tol <- 1e-4\n\n  # Step out from `from` in `direction` until hp has the wanted sign.\n  step_out <- function(from, direction, want_pos, max_steps = 100) {\n    x <- from\n    step <- 1\n    if (direction < 0 && is.finite(a)) step <- min(step, max((from - a) / 2, margin))\n    if (direction > 0 && is.finite(b)) step <- min(step
... [evidence truncated] ...
at x = \",\n           format(x, digits = 6),\n           \"; the density may not be log-concave or the domain may be too wide\")\n    }", "oldText": "    hx <- h(x)\n    hpx <- hp(x)\n    if (!is.finite(hx) || !is.finite(hpx)) {\n      stop(\"density or its log-derivative evaluated to a non-finite value at x = \",\n           format(x, digits = 6))\n    }"}], "path": "/app/ars.R"}
- action_24 [tool_call]: bash {"command": "cd /app && Rscript -e '\nsource(\"ars.R\")\nbimodal <- function(x) 0.5*dnorm(x,-3) + 0.5*dnorm(x,3)\nset.seed(3)\nres <- tryCatch(ars(bimodal, c(-Inf,Inf), n=500), error=function(e) conditionMessage(e))\nprint(res)\n' 2>&1 | tail -10"}
- action_25 [tool_call]: bash {"command": "cd /app && Rscript -e 'source(\"ars.R\"); test()' 2>&1 | tail -40", "timeout": 300}

Verifier failure evidence:

```text
[{"message": "The test failed in the call phase due to an assertion error", "name": "test_outputs.py::test_formal_testing_with_known_truth", "status": "failed", "trace": "def test_formal_testing_with_known_truth():\n        \"\"\"Test that formal testing outputs correct format as specified.\"\"\"\n        app_dir = Path(\"/app\")\n    \n        # Run the test function and check output format\n        test_code = \"\"\"\n    source(\"ars.R\")\n    # Run the test function if it exists\n    if (exists(\"test\")) {\n        test()\n    } else {\n        cat(\"ERROR: test function not found\\n\")\n    }\n    \"\"\"\n    \n        test_file = app_dir / \"run_test.R\"\n        test_file.write_text(test_code)\n        try:\n            result = subprocess.run(\n                [\"Rscript\", str(test_file)],\n                capture_output=True,\n                text=True,\n                cwd=str(app_dir),\n                timeout=60,\n            )\n            output = result.stdout + result.stderr\n    \n            # Check for required output format: \"TEST_NAME: PASS\" or \"TEST_NAME: FAIL\"\n>           assert \": PASS\" in output or \": FAIL\" in output, (\n                \"Test function must output results in format \"\n                \"'TEST_NAME: PASS' or 'TEST_NAME: FAIL'\"\n            )\nE           AssertionError: Test function must output results in format 'TEST_NAME: PASS' or 'TEST_NAME: FAIL'\nE           assert (': PASS' in '== Adaptive Rejection Sampling test suite ==\\ninput_validation_n:          PASS  |  rejects bad sample counts\\ninput_...e accuracy\\nwrote /app/normal_samples.txt (n=1000) and /app/exponential_samples.txt (n=1000)\\n== ALL TESTS PASSED ==\\n' or ': FAIL' in '== Adaptive Rejection Sa\n...[truncated 260 chars]"}]
```

### repeat_02 — FAIL

- trace: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_02/trajectory.jsonl`
- verifier evidence: `/tmp/rsibench-release-20260822/runs/formal-terminal-deepseek-v4-pro-meta-same-pi-skyinfer-16w-full-18-direct-g5-tr3-te3-20260822T203719Z/cells/terminal/deepseek-v4-pro/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-adaptive-rejection-sampler/repeat_02/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 9, "passed": 0, "failed": 9, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:


Verifier failure evidence:

```text
[{"message": "The test failed in the call phase due to an assertion error", "name": "test_outputs.py::test_ars_function_exists", "status": "failed", "trace": "def test_ars_function_exists():\n        \"\"\"Test that an 'ars' function exists in ars.R as required by the task.\"\"\"\n        app_dir = Path(\"/app\")\n    \n        # Check for ars.R file\n        ars_file = app_dir / \"ars.R\"\n>       assert ars_file.exists(), (\n            \"No ars.R file found. Task requires implementation in a file named 'ars.R'\"\n        )\nE       AssertionError: No ars.R file found. Task requires implementation in a file named 'ars.R'\nE       assert False\nE        +  where False = exists()\nE        +    where exists = PosixPath('/app/ars.R').exists\n\n/tests/test_outputs.py:19: AssertionError"}, {"message": "The test failed in the call phase", "name": "test_outputs.py::test_can_generate_standard_distribution_samples", "status": "failed", "trace": "def test_can_generate_standard_distribution_samples():\n        \"\"\"Test implementation can generate samples from standard distributions.\"\"\"\n        app_dir = Path(\"/app\")\n    \n        # Test R implementation by sourcing ars.R and running tests\n        test_code_r = \"\"\"\n    library(stats)\n    \n    # Source the required ars.R file\n    source(\"ars.R\")\n    \n    # Test normal distribution sampling\n    normal_density <- function(x) {\n        dnorm(x, mean = 0, sd = 1)\n    }\n    \n    # Try to generate samples\n    tryCatch({\n        samples <- ars(normal_density, c(-5, 5), n = 1000)\n    \n        if (length(samples) >= 900) {  # Allow some tolerance\n            mean_val <- mean(samples)\n            std_val <- sd(samples)\n    \n            if (abs(mean_val) < 0.2 && std_val > 0.8 && std_val < 1.2) {\n                cat(\"PASS: Generated valid normal samples\\n\")\n            } else {\n                cat(\"ERROR: Mean or std out of range\\n\")\n            }\n        } else {\n            
... [evidence truncated] ...
e object, as\n        the built-in open() function does.\n        \"\"\"\n        if \"b\" not in mode:\n            encoding = io.text_encoding(encoding)\n>       return io.open(self, mode, buffering, enco\n...[truncated 290 chars]"}, {"message": "The test failed in the call phase", "name": "test_outputs.py::test_input_validation_functionality", "status": "failed", "trace": "def test_input_validation_functionality():\n        \"\"\"Test that implementation validates inputs.\"\"\"\n        app_dir = Path(\"/app\")\n    \n        # Test invalid inputs\n        test_code = \"\"\"\n    source(\"ars.R\")\n    \n    # Test 1: Negative number of samples\n    tryCatch({\n        ars(dnorm, c(-5, 5), n = -10)\n        cat(\"ERROR: Accepted negative sample count\\n\")\n    }, error = function(e) {\n        cat(\"PASS: Rejected negative sample count\\n\")\n    })\n    \n    # Test 2: Invalid domain\n    tryCatch({\n        ars(dnorm, c(5, -5), n = 100)\n        cat(\"ERROR: Accepted invalid domain\\n\")\n    }, error = function(e) {\n        cat(\"PASS: Rejected invalid domain\\n\")\n    })\n    \"\"\"\n    \n        test_file = app_dir / \"test_validation.R\"\n        test_file.write_text(test_code)\n        try:\n>           result = subprocess.run(\n                [\"Rscript\", str(test_file)],\n                capture_output=True,\n                text=True,\n                cwd=str(app_dir),\n                timeout=15,\n            )\n\n/tests/test_outputs.py:252: \n_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ \n/root/.local/share/uv/python/cpython-3.13.9-linux-x86_64-gnu/lib/python3.13/subprocess.py:554: in run\n    with Popen(*popenargs, **kwargs) as process:\n         ^^^^^^^^^^^^^^^^^^^^^^^^^^^\n/root/.local/share/uv/python/cpython-3.13.9-linux-x86_64-gnu/lib/python3.13/subprocess.py:1039: in __init__\n    self._execute_child(args, executable, preexec_fn, close_fds,\n_ _ _ _ _ _ _ _ _ \n...[truncated 7745 chars]"}]
```

## Pass/fail action alignment

### failed repeat_01 vs passed repeat_00

- exact common action prefix: 0
- failed first different action: `{"action_index": 1, "arguments": "{\"command\": \"which R Rscript 2>/dev/null; R --version 2>/dev/null | head -3; echo \\\"---\\\"; ls /app\"}", "kind": "tool_call", "tool": "bash"}`
- successful first different action: `{"action_index": 1, "arguments": "{\"command\": \"which R Rscript 2>/dev/null; R --version 2>/dev/null | head -3; echo \\\"---\\\"; ls -la /app\"}", "kind": "tool_call", "tool": "bash"}`
- guard: This is the first exact action-sequence divergence, not an inferred root cause. Use surrounding observations and verifier evidence to decide which later action or judgment was causally critical.
- causal question: Which exact failed action or judgment, interpreted with its preceding observation and the external verifier, caused the outcome difference? What would the proposed harness change have done at that moment?

### failed repeat_02 vs passed repeat_00

- exact common action prefix: 0
- failed first different action: `null`
- successful first different action: `{"action_index": 1, "arguments": "{\"command\": \"which R Rscript 2>/dev/null; R --version 2>/dev/null | head -3; echo \\\"---\\\"; ls -la /app\"}", "kind": "tool_call", "tool": "bash"}`
- guard: This is the first exact action-sequence divergence, not an inferred root cause. Use surrounding observations and verifier evidence to decide which later action or judgment was causally critical.
- causal question: Which exact failed action or judgment, interpreted with its preceding observation and the external verifier, caused the outcome difference? What would the proposed harness change have done at that moment?

