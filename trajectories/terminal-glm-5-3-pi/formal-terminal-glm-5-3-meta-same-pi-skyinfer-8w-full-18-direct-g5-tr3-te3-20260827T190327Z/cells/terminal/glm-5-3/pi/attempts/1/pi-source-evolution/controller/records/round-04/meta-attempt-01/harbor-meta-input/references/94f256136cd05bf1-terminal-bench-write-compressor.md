# terminal-bench-write-compressor — 3/3 pass

This report contains controller-extracted evidence, not a controller-inferred root cause.
The Meta-agent must cross-reference the verifier with an exact action or judgment.

## Rollouts

### repeat_00 — PASS

- trace: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_00/trajectory.jsonl`
- verifier evidence: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_00/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/decomp.c"}
- action_02 [tool_call]: bash {"command": "ls -la /app; wc -c /app/data.txt; head -c 500 /app/data.txt"}
- action_03 [tool_call]: bash {"command": "file data.txt; python3 -c \"\nd=open('/app/data.txt','rb').read()\nprint(len(d))\nprint('NULs:', d.count(b'\\x00'))\nprint('nonascii:', sum(1 for b in d if b>127))\nprint(repr(d[:200]))\nprint(repr(d[-200:]))\n\""}
- action_04 [tool_call]: bash {"command": "which python python2 gcc cc g++ tcc clang perl awk xxd od 2>/dev/null; ls /usr/bin | head -50; cat /etc/os-release 2>/dev/null | head -3"}
- action_05 [judgment]: No Python here, but gcc is available. Let me look at the data more closely and then write a matching encoder in C.
- action_06 [tool_call]: bash {"command": "od -c /app/data.txt | head -20; echo ---; od -c /app/data.txt | tail -5; echo ---; tr -d '\\0' < /app/data.txt | wc -c; wc -l /app/data.txt"}
- action_07 [judgment]: The file is clean ASCII text (4868 bytes, no NULs), so `printf("%s")` will work if I append a final literal 0 as a terminator. Now I'll write the encoder.

**My approach:** The decompressor is an adaptive binary arithmetic decoder (base 255, carryless). Crucially, `range`, the counts, and `split` depend *only* on the decoded bit sequence — never on the code bytes. So I can:
1. Parse data.txt into the command language (matches/literals) via DP.
2. Simulate the decoder's state machine exactly, recording for each bit an interval constraint on the code digits (code prefix − accumulated subtractions ∈ [lo,hi)).
3. Solve the constraint system for the K-digit base-255 code value and emit it.
- action_08 [tool_call]: write {"content": "/* Encoder matching /app/decomp.c  */\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n#define RADIX 255\n\nstatic unsigned char data[65536];\nstatic int n;\n\n/* ---------------- bit-level simulation (mirror of decomp.c) ---------------- */\n/* cc indexed like decomp: cc + ctx*2 */\nstatic int cc[1000000];\nstatic int crange = 1;\nstatic int kdig
... [evidence truncated] ...
 of 255^(K-i) */\n    FILE *o = fopen(\"/app/data.comp\", \"wb\");\n    if (!o) { perror(\"data.comp\"); return 1; }\n    for (int b = 1; b <= K; b++) {\n        int pos = K - b;\n        int dig = pos < Alen ? Ad[pos] : 0;\n        fputc(dig + 1, o);\n    }\n    fclose(o);\n    fprintf(stderr, \"wrote %d bytes to /app/data.comp\\n\", K);\n    return 0;\n}\n", "path": "/tmp/enc.c"}
- action_09 [tool_call]: bash {"command": "cd /tmp && gcc -O2 -o enc enc.c && ./enc && ls -l /app/data.comp"}
- action_10 [judgment]: Encoder ran — 2397 bytes, under the 2500 limit. Now the critical test with the actual decompressor:
- action_11 [tool_call]: bash {"command": "cat /app/data.comp | /app/decomp > /tmp/out.bin; cmp /tmp/out.bin /app/data.txt && echo \"MATCH with /app/decomp\"; gcc -O2 -o /tmp/decomp2 /app/decomp.c && cat /app/data.comp | /tmp/decomp2 | cmp - /app/data.txt && echo \"MATCH with fresh compile\"; wc -c /app/data.comp /tmp/out.bin"}
- action_12 [judgment]: Segfault — the decode diverged, so my model has a bug somewhere. Let me instrument both sides to find the divergence:
- action_13 [tool_call]: bash {"command": "cd /tmp && sed -e 's|int the_bit = fraction >= split;|int the_bit = fraction >= split; fprintf(stderr,\"GB n=%d ctx=%d rng=%d split=%d frac=%d bit=%d k=%d\\\\n\",++nbt,ctx,range,split,fraction,the_bit,nbc);|' \\\n -e 's|int gc() {|static int nbt=0; static int nbc=0;\\nint gc() { nbc++; return (int)getchar(); }\\nint gc_unused() {|' /app/decomp.c > trace.c && sed -i 's|fraction += gc()-1;|fraction += gc()-1;|' trace.c && grep -n \"nbt\\|gc()\" trace.c | head"}
- action_14 [judgment]: The sed hack mangled it. Let me write a clean instrumented decoder plus an instrumented mirror of my encoder:
- action_15 [tool_call]: write {"content": "#include <stdio.h>\n#include <stdlib.h>\n#define W for (i=0;i<tmp;i++)\n\nint i;\nint radix = 255;\nint fraction;\nlong range = 1;\nint tmp;\nint cc[1000000];\n\nint OFF1 = 5;\nint OFF2 = 2;\nint LITSIZE = 4;\n\nint nbt = 0, nbc = 0;\n\nint gc() {\n  unsigned char c = (unsigned char)getchar();\n  return (int)c;\n}\n\nint get_bit(int ctx) {\n  if ( range < radix )
... [evidence truncated] ...
H off=%d len=%d pos=%d\\n\", d+1, l+1, (int)(Q-buf));\n      W { *Q++ = *z++; }\n    } else {\n      int sg = get_bit(8);\n      int mg = get_integer(LITSIZE, 9);\n      *Q++ = (1-2*sg) * mg;\n      fprintf(stderr,\"LIT %d pos=%d\\n\", (1-2*sg)*mg, (int)(Q-buf));\n    }\n  }\n  fprintf(stderr,\"OUT %d bytes\\n\", (int)(Q-buf));\n  printf(\"%s\", buf);\n}\n", "path": "/tmp/trace.c"}
- action_16 [tool_call]: bash {"command": "cd /tmp && gcc -O0 -o trace trace.c && ./trace < /app/data.comp > /tmp/tout.bin 2>/tmp/trace.log; tail -3 /tmp/trace.log; head -3 /tmp/trace.log; wc -l /tmp/trace.log"}
- action_17 [tool_call]: bash {"command": "cd /tmp && sed -e 's|ev\\[nev\\].bit = bit; ev\\[nev\\].split = split; ev\\[nev\\].rng = crange; ev\\[nev\\].k = kdig; nev++;|ev[nev].bit = bit; ev[nev].split = split; ev[nev].rng = crange; ev[nev].k = kdig; nev++; fprintf(stderr,\"GB n=%d ctx=%d rng=%d split=%d frac=? bit=%d k=%d\\\\n\",nev,ctx,crange,split,bit,kdig);|' enc.c > enctrace.c && gcc -O0 -o enctrace enctrace.c && ./enctrace 2>/tmp/enctrace.log >/dev/null; wc -l /tmp/enctrace.log; diff <(head -1500 /tmp/trace.log) <(head -1500 /tmp/enctrace.log) | head -20"}
- action_18 [judgment]: The diff is polluted by the `frac` field. Let me strip it:
- action_19 [tool_call]: bash {"command": "cd /tmp && sed 's/frac=[0-9-]* //' /tmp/trace.log > tr.norm && diff tr.norm /tmp/enctrace.log | head -10"}
- action_20 [tool_call]: bash {"command": "cd /tmp && diff <(head -1609 tr.norm) <(head -1609 /tmp/enctrace.log) | head -20"}
- action_21 [judgment]: Lines look identical yet diff says they differ — must be an invisible character issue. Let me check raw bytes:
- action_22 [tool_call]: bash {"command": "cd /tmp && head -2 /tmp/enctrace.log | od -c | head -6; grep -n 'GB n=1 ' /tmp/enctrace.log | head -3; head -1 /tmp/enctrace.log"}
- action_23 [judgment]: My own debug line and the `frac=?` token skewed the diff. Strip both:
- action_24 [tool_call]: bash {"command": "cd /tmp && grep '^GB ' /tmp/enctrace.log | sed 's/frac=? //' > enc.norm && diff tr.norm enc.norm | head -20"}
- action_25 [judgment]: First 23 events match. Let me see the exact divergence point:
- action_26 [tool_call]: bash {"command": "cd /tmp && echo \"--- decoder:\"; sed -n '20,26p' tr.norm; echo \"--- encoder:\"; sed -n '20,26p' enc.norm"}
- action_27 [judgment]: Found it. `get_integer` does `tmp--` **after** the unary loop where `tmp` started at `t`, so the value-bit count is `t + k - 1`, not `k - 1`. The decoder read 20 value bits for the header (t=9, 12 unary bits → 9+12−1=20), while I emitted 11. So an integer with value-bit-length `nb` needs `nb − t` unary zeros, not `nb`. Fixing `enc_int` and the cost model:
- action_28 [tool_call]: edit {"edits": [{"newText": "/* mirrors get_integer(t, ctx): encode value v  (v >= 0)\n * unary loop runs k times (k-1 zeros then a 1), leaving tmp = t+k;\n * tmp-- then t+k-1 value bits are read; result_ans = 1<<nb | bits,\n * so nb = t+k-1  =>  k = nb-t+1  =>  nb-t unary zeros. */\nstatic void enc_int(int t, int ctx, int v)\n{\n    int ra = v + (1 << t);          /* result_ans */
... [evidence truncated] ...
* (bitlen(dist + 31) - 1) - 5.0 + 1.0)\n               + (2.0 * (bitlen(L + 3) - 1) - 2.0 + 1.0);\n}", "oldText": "static double litcostf(int b){\n    int mag = b < 128 ? b : 256 - b;\n    return 3.0 + 2.0 * (bitlen(mag + 16) - 1);\n}\nstatic double matchcostf(int dist, int L){\n    return 3.0 + 2.0 * (bitlen(dist + 31) - 1) + 2.0 * (bitlen(L + 3) - 1);\n}"}], "path": "/tmp/enc.c"}
- action_29 [tool_call]: bash {"command": "cd /tmp && gcc -O2 -o enc enc.c && ./enc && cat /app/data.comp | /app/decomp > /tmp/out.bin; echo \"decomp exit: $?\"; cmp /tmp/out.bin /app/data.txt && echo \"EXACT MATCH\" ; wc -c /app/data.comp /tmp/out.bin"}
- action_30 [judgment]: Exact match at 2389 bytes. Let me run focused validation per the verify-work skill:
- action_31 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_32 [tool_call]: bash {"command": "cd /app && cat data.comp | /app/decomp > /tmp/v1.bin; e1=$?; cat data.comp | /tmp/decomp2 > /tmp/v2.bin; e2=$?; sha256sum /app/data.txt /tmp/v1.bin /tmp/v2.bin; cmp /tmp/v1.bin /app/data.txt && cmp /tmp/v2.bin /app/data.txt && echo \"both decoders OK (exit $e1/$e2)\"; stat -c 'data.comp size: %s bytes (limit 2500)' /app/data.comp; od -Ad -tc data.comp | tail -3 | head -1"}
- action_33 [judgment]: Done. `/app/data.comp` is **2389 bytes** (limit 2500), and `cat data.comp | /app/decomp` reproduces `data.txt` byte-for-byte (sha256-identical, verified with both the shipped `/app/decomp` and a fresh compile of `decomp.c`).

**How it works** — `/app/decomp.c` is a carryless adaptive binary arithmetic decoder (base 255) driving an LZ-style parser. Key observations that made writing
... [evidence truncated] ...
ary zeros — this was the one bug my first attempt hit, caught by diffing traces of the instrumented decoder against the encoder.
4. A final **literal 0** command NUL-terminates the buffer so `printf("%s", buf)` emits exactly the 4868 bytes and nothing more.

The encoder is at `/tmp/enc.c` (compile & run: `gcc -O2 -o enc enc.c && ./enc`) if you want to regenerate or tweak the parse.
### repeat_01 — PASS

- trace: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_01/trajectory.jsonl`
- verifier evidence: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_01/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/decomp.c"}
- action_02 [tool_call]: bash {"command": "ls -la /app/ && wc -c /app/data.txt"}
- action_03 [tool_call]: read {"path": "/app/data.txt"}
- action_04 [tool_call]: bash {"command": "objdump -d /app/decomp --no-show-raw-insn | sed -n '/<main>:/,/ret/p' | head -120"}
- action_05 [judgment]: The compiler inlined `get_bit`/`get_integer` into `main`. I need to check the literal path at `1460` to see the evaluation order of `(1-2*get_bit(8)) * get_integer(4, 9)` (C doesn't specify operand evaluation order, so this is critical).
- action_06 [tool_call]: bash {"command": "objdump -d /app/decomp --no-show-raw-insn | sed -n '/<main>:/,/ret/p' | sed -n '/1460:/,/1600:/p' | head -90"}
- action_07 [tool_call]: bash {"command": "objdump -d /app/decomp --no-show-raw-insn | awk '/<main>:/,/^$/' | grep -n \"1460\" ; objdump -d /app/decomp --no-show-raw-insn | awk '/<main>:/,/^$/' | sed -n '/^ *1460:/,/^ *1560:/p'"}
- action_08 [judgment]: Now let me see the rest of the match path and the copy loop dispatch:
- action_09 [tool_call]: bash {"command": "objdump -d /app/decomp --no-show-raw-insn | awk '/<main>:/,/^$/' | sed -n '/^ *1289:/,/^ *13a9:/p' | head -75"}
- action_10 [judgment]: Now I understand the full structure. Let me check the tail of main (the printf) and scan data.txt for non-ASCII bytes:
- action_11 [tool_call]: bash {"command": "objdump -d /app/decomp --no-show-raw-insn | awk '/<main>:/,/^$/' | sed -n '/^ *13a9:/,/^ *1460:/p' | head -50"}
- action_12 [tool_call]: bash {"command": "python3 -c \"\ndata = open('/app/data.txt','rb').read()\nprint('len', len(data))\nprint('non-ascii bytes:', sorted(set(b for b in data if b > 127)))\nfrom collections import Counter\nc = Counter(data)\nprint('most common:', c.most_common(10))\nprint('ends with:', data[-20:])\n\""}
- action_13 [judgment]: printf("%s", buf) confirmed. No python3 — let me check available tools:
- action_14 [tool_call]: bash {"command": "for t in python python2 perl gcc cc g++ node awk ruby tcc busybox; do command -v $t >/dev/null 2>&1 && echo \"$t: $(command -v $t)\"; done; ls /usr/bin | head -50"}
- action_15 [tool_call]: bash {"command": "od -c /app/data.txt | awk '{for(i=2;i<=NF;i++) if($i ~ /^[2-9][0-9]{2}$/ && $i+0>127) print $i}' | sort | uniq -c; echo ---; tail -c 30 /app/data.txt | od -c"}
- action_16 [judgment]: No python, but I have gcc. I now fully understand the decompressor. Let me summarize the format I must produce, then write a matching compressor in C:

**Decoded format** (mirrored from `decomp.c` + disassembly):
- Carryless arithmetic decoder, base-255 digits (byte = digit+1), adaptive bit contexts, `split = range*(c0+1)/(c0+c1+2)`
- `j = get_integer(9, ctx0)` = token count, then 
... [evidence truncated] ...
≥8, len≥16 needs dist≥16
- Output printed with `printf("%s")` → I'll end with a literal-0 token to guarantee NUL termination

The key insight: the decoder computes `fraction = floor(T·255^k) - S`, so an exact mirror encoder tracks `lo` (arbitrary precision, as a base-255 digit array) with identical renorm/split/count updates, then outputs `lo`'s digits. Let me write the compressor:
- action_17 [tool_call]: write {"content": "/* Encoder that exactly mirrors /app/decomp.c (carryless base-255 arithmetic\n * decoder with adaptive bit contexts + LZ77 matches).\n *\n * Mirror proof sketch: decoder maintains fraction = floor(T*255^k) - S where T\n * is the code value (base-255 digits, byte = digit+1) and S accumulated\n * subtractions; decisions compare against integer splits so they are ex
... [evidence truncated] ...
\n    /* final encode of best token set */\n    memcpy(toks, best, sizeof(Tok) * best_ntok);\n    ntok = best_ntok;\n    emit_tokens();\n\n    f = fopen(outfile, \"wb\");\n    int i;\n    for (i = ndig - 1; i >= 0; i--) fputc(dig[i] + 1, f);\n    fclose(f);\n    fprintf(stderr, \"wrote %s: %d bytes (input %d)\\n\", outfile, ndig, N);\n    return 0;\n}\n", "path": "/app/compress.c"}
- action_18 [tool_call]: bash {"command": "gcc -O2 -o /app/compress compress.c -lm && ./compress data.txt data.comp", "timeout": 120}
- action_19 [judgment]: 2266 bytes — under the 2500 limit. Now the critical test with the real decompressor:
- action_20 [tool_call]: bash {"command": "cat data.comp | /app/decomp > /tmp/out; echo \"exit: $?\"; cmp /tmp/out data.txt && echo \"EXACT MATCH\"; wc -c /tmp/out data.txt data.comp"}
- action_21 [judgment]: Exact match on the first try. Let me run the verify-work skill for focused validation:
- action_22 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_23 [tool_call]: bash {"command": "cd /tmp && for i in 1 2 3; do cat /app/data.comp | /app/decomp > v$i.txt; done; cmp v1.txt v2.txt && cmp v2.txt v3.txt && cmp v1.txt /app/data.txt && echo \"DETERMINISTIC + EXACT\"; md5sum v1.txt /app/data.txt; ls -l /app/data.comp"}
- action_24 [judgment]: Done. `/app/data.comp` is written and verified.

## Summary

**`/app/data.comp`: 2266 bytes** (limit: 2500) — `cat data.comp | /app/decomp` reproduces `data.txt` byte-for-byte (md5 `4ae35d9…` matches, deterministic across runs).

### How I did it

I reverse-engineered `decomp.c` (plus disassembly of `/app/decomp`, since the compiler inlined and restructured the coder) and wrote a m
... [evidence truncated] ...
n≥16 needs dist≥16).
   - `printf("%s")` needs a NUL, so the last token is a literal `0`, guaranteeing termination regardless of stack garbage.

4. **Parsing**: optimal-parse DP with iterative cost refinement (6 passes) — costs estimated from the adaptive model state snapshotted at each position from the previous pass's parse, keeping the best actually-encoded result (1432 tokens).
### repeat_02 — PASS

- trace: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_02/trajectory.jsonl`
- verifier evidence: `/volume/ywan/yss/rsibench/runs/formal-terminal-glm-5-3-meta-same-pi-skyinfer-8w-full-18-direct-g5-tr3-te3-20260827T190327Z/cells/terminal/glm-5-3/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-write-compressor/repeat_02/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/decomp.c"}
- action_02 [tool_call]: bash {"command": "ls -la /app; wc -c /app/data.txt; head -c 400 /app/data.txt"}
- action_03 [tool_call]: bash {"command": "od -c /app/data.txt | tail -5; echo ---; grep -c $'\\0' /app/data.txt || true; awk 'BEGIN{RS=\"\\x00\"}END{print NR}' /app/data.txt; tail -c 20 /app/data.txt | od -c"}
- action_04 [judgment]: No NUL bytes, ends with `\n`. The decompressor is an adaptive binary arithmetic decoder (base-255 renormalization) driving an LZ77-ish token stream:

- Header: `get_integer(9,0)` = token count
- Token: flag bit (ctx 1); match → `get_integer(5,2)` = dist-1, `get_integer(2,3)` = len-1; literal → sign bit (ctx 8) + `get_integer(4,9)` = magnitude
- Output via `printf("%s", buf)` → I'll append a literal 0 as a guaranteed NUL terminator.

I'll write a mirror encoder (same int/long arithmetic, big-int `low`, emit base-255 digits MSB-first as digit+1), with an optimal-parse DP to pick tokens.
- action_05 [tool_call]: write {"content": "/* Encoder matching /app/decomp.c exactly. */\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n#define RADIX 255\n\nstatic long range = 1;\nstatic int cc[1000000];\n\n/* low as base-255 digits, least significant first; digit d is written as byte d+1 */\nstatic unsigned char dig[1000000];\nstatic int ndig = 0;\n\nstatic void bn_add(unsigned v) {\n 
... [evidence truncated] ...
         /* sign + */\n      put_integer(tA[i], 4, 9);      /* magnitude */\n    }\n  }\n\n  FILE *o = fopen(\"data.comp\", \"wb\");\n  if (!o) { perror(\"data.comp\"); return 1; }\n  for (i = ndig - 1; i >= 0; i--) fputc(dig[i] + 1, o);\n  fclose(o);\n  printf(\"input=%d tokens=%d est_bits=%.0f comp_bytes=%d\\n\", N, ntok, best[N], ndig);\n  return 0;\n}\n", "path": "/app/comp.c"}
- action_06 [tool_call]: bash {"command": "cd /app && gcc -O2 -o comp comp.c && ./comp && ls -l data.comp"}
- action_07 [tool_call]: bash {"command": "cd /app && cat data.comp | ./decomp > /tmp/out.txt; echo \"exit=$?\"; cmp /tmp/out.txt data.txt && echo IDENTICAL; wc -c /tmp/out.txt data.txt"}
- action_08 [judgment]: Verified identical. Let me run the focused validation per the verify-work skill.
- action_09 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_10 [tool_call]: bash {"command": "cd /tmp && rm -f v.txt && cat /app/data.comp | /app/decomp > v.txt && cmp /app/data.txt /tmp/v.txt && echo PASS; wc -c /app/data.comp"}
- action_11 [judgment]: Done. `/app/data.comp` is **2289 bytes** (limit 2500), and `cat /app/data.comp | /app/decomp` reproduces `data.txt` byte-for-byte (`cmp` clean, 4868/4868 bytes).

How I built it (`/app/comp.c`, run as `./comp` in `/app`):

- **Exact mirror of the arithmetic coder**: `decomp.c` is an adaptive binary arithmetic decoder that renormalizes when `range < 255`, refilling `fraction = fract
... [evidence truncated] ...
 bit-cost estimates (literal = 5+2k bits, match = 6+2·distk+2·lenk), trying the cheapest distance for each achievable match length (overlapping/RLE matches included) → 1452 tokens.
- **Safe termination**: since output is `printf("%s", buf)`, the last token is a literal 0, writing a guaranteed NUL right after the text (data.txt contains no NULs and ends in `\n`, which is preserved).
