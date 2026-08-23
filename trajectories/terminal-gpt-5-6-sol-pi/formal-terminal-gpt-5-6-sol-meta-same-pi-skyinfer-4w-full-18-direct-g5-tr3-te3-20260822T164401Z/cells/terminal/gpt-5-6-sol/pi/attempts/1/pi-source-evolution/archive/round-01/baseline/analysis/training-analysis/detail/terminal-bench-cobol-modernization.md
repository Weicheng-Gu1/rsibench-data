# terminal-bench-cobol-modernization — 3/3 pass

This report contains controller-extracted evidence, not a controller-inferred root cause.
The Meta-agent must cross-reference the verifier with an exact action or judgment.

## Rollouts

### repeat_00 — PASS

- trace: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_00/trajectory.jsonl`
- verifier evidence: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_00/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/src/program.cbl"}
- action_02 [tool_call]: read {"path": "/app/src/INPUT.DAT"}
- action_03 [tool_call]: bash {"command": "ls -l /app/data /app/src && file /app/data/*.DAT /app/src/INPUT.DAT && printf '\\nPI vars:\\n' && env | grep '^PI_' || true"}
- action_04 [tool_call]: bash {"command": "od -An -tx1c /app/data/ACCOUNTS.DAT; echo BOOKS; od -An -tx1c /app/data/BOOKS.DAT; echo TRANS; od -An -tx1c /app/data/TRANSACTIONS.DAT; echo INPUT; od -An -tx1c /app/src/INPUT.DAT"}
- action_05 [tool_call]: bash {"command": "command -v cobc || true; cobc -V 2>/dev/null | head -4 || true; find /app -maxdepth 2 -type f -not -path '/app/data/*' -not -path '/app/src/*' -print"}
- action_06 [tool_call]: bash {"command": "rm -rf /tmp/cobtest && mkdir -p /tmp/cobtest/{data,src} && cobc -x -o /tmp/cobtest/program /app/src/program.cbl && cp /app/data/*.DAT /tmp/cobtest/data/ && printf 'U001U002B001200' > /tmp/cobtest/src/INPUT.DAT && (cd /tmp/cobtest && ./program) && echo ACCOUNTS && od -An -tc /tmp/cobtest/data/ACCOUNTS.DAT && echo BOOKS && od -An -tc /tmp/cobtest/data/BOOKS.DAT && echo TRANS && od -An -tc /tmp/cobtest/data/TRANSACTIONS.DAT", "timeout": 30}
- action_07 [tool_call]: bash {"command": "set -e\nrm -rf /tmp/probe; mkdir -p /tmp/probe/{data,src}; cp /tmp/cobtest/program /tmp/probe/\nrun(){ printf '%s' \"$1\" > /tmp/probe/src/INPUT.DAT; printf 'U001%-20s%010dU002%-20s%010d' John 1180 Jane \"$2\" > /tmp/probe/data/ACCOUNTS.DAT; printf 'B001%-20sU002' Book > /tmp/probe/data/BOOKS.DAT; : > /tmp/probe/data/TRANSACTIONS.DAT; (cd /tmp/probe && ./program >/dev/null); printf '%s => ' \"$1\"; od -An -v -tc /tmp/probe/data/ACCOUNTS.DAT | tr -d ' \\n'; echo; }\nrun U001U002B0010000000200 1800\nrun U001U002B0010000002000 1800\nrun U001U002B0019999999999 1800\nrun U001U002B0010000000200 9999999900\nrun U001U001B0010000000200 1180", "timeout": 30}
- action_08 [tool_call]: write {"content": "#!/usr/bin/env python3\n\"\"\"Python implementation of src/program.cbl (BOOKFORUM).\"\"\"\n\nfrom pathlib import Path\n\n\nROOT = Path(\"/app\")\nINPUT_FILE = ROOT / \"src\" / \"INPUT.DAT\"\nACCOUNTS_FILE = ROOT / \"data\" / \"ACCOUNTS.DAT\"\nBOOKS_FILE = ROOT / \"data\" / \"BOOKS.DAT\"\nTRANSACTIONS_FILE = ROOT / \"data\" / \"TRANSACTIONS.DAT\"\n\nACCOUNT_RECORD
... [evidence truncated] ...
ILE.write_bytes(b\"\".join(book_records))\n\n    transaction = book_id + f\"{amount % 10_000_000_000:010d}\".encode(\"ascii\")\n    transaction += seller_id + buyer_id\n    with TRANSACTIONS_FILE.open(\"ab\") as output:\n        output.write(transaction)\n\n    print(\"Transaction completed successfully\")\n\n\nif __name__ == \"__main__\":\n    main()\n", "path": "/app/program.py"}
- action_09 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_10 [tool_call]: bash {"command": "set -e\nchmod +x /app/program.py\nrm -rf /tmp/diff-cob /tmp/diff-py\nmkdir -p /tmp/diff-cob/{data,src} /tmp/diff-py/{data,src}\ncobc -x -o /tmp/diff-cob/program /app/src/program.cbl\n# Valid case, using the repository's exact initial files and short input record.\ncp /app/data/*.DAT /tmp/diff-cob/data/; cp /app/src/INPUT.DAT /tmp/diff-cob/src/\ncp -a /tmp/diff-cob
... [evidence truncated] ...
f-cob && ./program >/tmp/cob-invalid.out)\npython3 /tmp/diff-py/program.py >/tmp/py-invalid.out\ncmp /tmp/cob-invalid.out /tmp/py-invalid.out\nfor f in ACCOUNTS.DAT BOOKS.DAT TRANSACTIONS.DAT; do cmp \"/tmp/diff-cob/data/$f\" \"/tmp/diff-py/data/$f\"; done\npython3 -m py_compile /app/program.py\nprintf 'Differential valid/invalid checks and syntax check passed.\\n'", "timeout": 30}
- action_11 [judgment]: Implemented `/app/program.py` to mirror the COBOL program’s behavior.

Validation completed:
- Compared Python and GnuCOBOL outputs for valid and invalid transactions.
- Verified identical contents for:
  - `data/ACCOUNTS.DAT`
  - `data/BOOKS.DAT`
  - `data/TRANSACTIONS.DAT`
- Confirmed matching console output.
- Passed Python syntax compilation.
### repeat_01 — PASS

- trace: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_01/trajectory.jsonl`
- verifier evidence: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_01/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/src/program.cbl"}
- action_02 [tool_call]: read {"path": "/app/src/INPUT.DAT"}
- action_03 [tool_call]: bash {"command": "ls -l /app/data /app/src && file /app/data/*.DAT /app/src/INPUT.DAT && printf '\\nPI vars:\\n'; env | grep '^PI_' || true"}
- action_04 [tool_call]: bash {"command": "xxd -g1 /app/data/ACCOUNTS.DAT; xxd -g1 /app/data/BOOKS.DAT; xxd -g1 /app/data/TRANSACTIONS.DAT; xxd -g1 /app/src/INPUT.DAT; command -v cobc || true"}
- action_05 [tool_call]: read {"path": "/app/AGENTS.md"}
- action_06 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_07 [tool_call]: bash {"command": "python3 - <<'PY'\nfrom pathlib import Path\nfor f in ['ACCOUNTS.DAT','BOOKS.DAT','TRANSACTIONS.DAT']:\n d=Path('/app/data',f).read_bytes()\n print(f,len(d),repr(d))\nprint('input',repr(Path('/app/src/INPUT.DAT').read_bytes()))\nPY\nmkdir -p /tmp/cobtest && cp /app/data/*.DAT /tmp/cobtest/", "timeout": 10}
- action_08 [tool_call]: bash {"command": "rm -rf /tmp/cobrun && mkdir -p /tmp/cobrun/{data,src} && cp /app/data/*.DAT /tmp/cobrun/data/ && cp /app/src/INPUT.DAT /tmp/cobrun/src/ && cobc -x -o /tmp/cobrun/program /app/src/program.cbl && (cd /tmp/cobrun && ./program); echo status:$?; python3 - <<'PY'\nfrom pathlib import Path\nfor p in Path('/tmp/cobrun/data').glob('*'):\n print(p.name,len(p.read_bytes()),repr(p.read_bytes()))\nPY", "timeout": 20}
- action_09 [tool_call]: bash {"command": "rm -rf /tmp/cobrun && mkdir -p /tmp/cobrun/{data,src} && cp /app/data/*.DAT /tmp/cobrun/data/ && printf 'U001U002B0010000000200' > /tmp/cobrun/src/INPUT.DAT && cp /tmp/cobrun/src/INPUT.DAT /tmp/inshow && cobc -x -o /tmp/cobrun/program /app/src/program.cbl && (cd /tmp/cobrun && ./program); echo status:$?; python3 - <<'PY'\nfrom pathlib import Path\nfor p in Path('/tmp/cobrun/data').glob('*'):\n print(p.name,len(p.read_bytes()),repr(p.read_bytes()))\nPY", "timeout": 20}
- action_10 [tool_call]: write {"content": "#!/usr/bin/env python3\n\"\"\"Python implementation of src/program.cbl (BOOKFORUM).\"\"\"\n\nfrom pathlib import Path\n\n\nROOT = Path(__file__).resolve().parent\nDATA = ROOT / \"data\"\nINPUT = ROOT / \"src\" / \"INPUT.DAT\"\n\nACCOUNT_SIZE = 34\nBOOK_SIZE = 28\nTRANSACTION_SIZE = 22\n\n\ndef records(contents: bytes, size: int):\n    \"\"\"Return COBOL fixed-siz
... [evidence truncated] ...
WS-AMOUNT TO PIC 9(10) produces a zero-filled ten-digit integer.\n    transaction = book_id + f\"{amount:010d}\".encode(\"ascii\") + seller + buyer\n    with transactions_path.open(\"ab\") as transaction_file:\n        transaction_file.write(transaction)\n\n    print(\"Transaction completed successfully\")\n\n\nif __name__ == \"__main__\":\n    main()\n", "path": "/app/program.py"}
- action_11 [tool_call]: bash {"command": "set -eu\nfor input in U001U002B0010000000200 U003U002B0030000000017 U001U002B007200; do\n  rm -rf /tmp/cobrun /tmp/pyrun\n  mkdir -p /tmp/cobrun/{data,src} /tmp/pyrun/{data,src}\n  cp /app/data/*.DAT /tmp/cobrun/data/; cp /app/data/*.DAT /tmp/pyrun/data/\n  printf %s \"$input\" > /tmp/cobrun/src/INPUT.DAT; cp /tmp/cobrun/src/INPUT.DAT /tmp/pyrun/src/\n  cp /app/pr
... [evidence truncated] ...
ogram.cbl\n  (cd /tmp/cobrun && ./program > output)\n  (cd /tmp/pyrun && python3 program.py > output)\n  diff -u /tmp/cobrun/output /tmp/pyrun/output\n  for f in ACCOUNTS.DAT BOOKS.DAT TRANSACTIONS.DAT; do cmp /tmp/cobrun/data/$f /tmp/pyrun/data/$f; done\n  echo \"matched: $input\"\ndone\npython3 -m py_compile /app/program.py\ngit status --short 2>/dev/null || true", "timeout": 30}
- action_12 [judgment]: Implemented `/app/program.py` to mirror the COBOL program’s behavior:

- Reads `/app/src/INPUT.DAT`
- Validates buyer, seller, book, and ownership
- Updates account balances and book ownership
- Appends transaction records
- Preserves fixed-width binary file formatting

Validation against the compiled GnuCOBOL program passed for successful and failed transaction scenarios. All three `.DAT` outputs matched byte-for-byte.
### repeat_02 — PASS

- trace: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_02/trajectory.jsonl`
- verifier evidence: `<REDACTED_USER_HOME>/rsibench-formal-master-20260823/runs/formal-terminal-gpt-5-6-sol-meta-same-pi-skyinfer-4w-full-18-direct-g5-tr3-te3-20260822T164401Z/cells/terminal/gpt-5-6-sol/pi/attempts/1/pi-source-evolution/archive/round-01/baseline/rollouts/terminal-bench-cobol-modernization/repeat_02/pi-mechanism-evidence.json`
- verifier summary: `{"tests": 3, "passed": 3, "failed": 0, "skipped": 0, "pending": 0, "other": 0}`
- recorded agent error: `none`

Actions and judgments:

- action_01 [tool_call]: read {"path": "/app/src/program.cbl"}
- action_02 [tool_call]: read {"path": "/app/src/INPUT.DAT"}
- action_03 [tool_call]: bash {"command": "find /app/data -maxdepth 1 -type f -printf '%f %s bytes\\n' | sort && printf '\\nPI env:\\n' && env | grep '^PI_' | sort", "timeout": 10}
- action_04 [tool_call]: read {"path": "/app/AGENTS.md"}
- action_05 [tool_call]: bash {"command": "for f in data/*.DAT; do echo \"== $f ==\"; xxd -g1 \"$f\"; done", "timeout": 10}
- action_06 [tool_call]: bash {"command": "cobc -V | head -2; python3 --version; git status --short 2>/dev/null || true", "timeout": 10}
- action_07 [tool_call]: read {"path": "/app/.pi/skills/verify-work/SKILL.md"}
- action_08 [tool_call]: bash {"command": "for f in data/*.DAT src/INPUT.DAT; do echo \"== $f ==\"; od -An -tx1c \"$f\"; done", "timeout": 10}
- action_09 [tool_call]: bash {"command": "for f in data/*.DAT; do echo \"== $f ==\"; python3 - \"$f\" <<'PY'\nimport sys\np=sys.argv[1]; b=open(p,'rb').read(); print(repr(b))\nPY\ndone", "timeout": 10}
- action_10 [tool_call]: bash {"command": "set -e\nrm -rf /tmp/cobprobe && mkdir -p /tmp/cobprobe/{src,data}\ncp src/program.cbl /tmp/cobprobe/src/\nprintf 'U001Buyer               0000001000U002Seller              0000001000' > /tmp/cobprobe/data/ACCOUNTS.DAT\nprintf 'B007Probe Book          U002' > /tmp/cobprobe/data/BOOKS.DAT\n: > /tmp/cobprobe/data/TRANSACTIONS.DAT\nprintf 'U001U002B0070000000200' > /tmp/cobprobe/src/INPUT.DAT\ncd /tmp/cobprobe && cobc -x -o program src/program.cbl && ./program\npython3 - <<'PY'\nfrom pathlib import Path\nfor p in Path('data').glob('*'): print(p, repr(p.read_bytes()))\nPY", "timeout": 20}
- action_11 [tool_call]: write {"content": "#!/usr/bin/env python3\n\"\"\"Python implementation of src/program.cbl (BOOKFORUM).\"\"\"\n\nfrom pathlib import Path\n\n\nROOT = Path(__file__).resolve().parent\nINPUT_FILE = ROOT / \"src\" / \"INPUT.DAT\"\nACCOUNTS_FILE = ROOT / \"data\" / \"ACCOUNTS.DAT\"\nBOOKS_FILE = ROOT / \"data\" / \"BOOKS.DAT\"\nTRANSACTIONS_FILE = ROOT / \"data\" / \"TRANSACTIONS.DAT\"\
... [evidence truncated] ...
:4] == book_id:\n            record[24:28] = buyer_id\n    BOOKS_FILE.write_bytes(b\"\".join(books))\n\n    transaction = book_id + amount_field + seller_id + buyer_id\n    with TRANSACTIONS_FILE.open(\"ab\") as output:\n        output.write(transaction)\n\n    print(\"Transaction completed successfully\")\n\n\nif __name__ == \"__main__\":\n    main()\n", "path": "/app/program.py"}
- action_12 [tool_call]: bash {"command": "set -e\nwork=$(mktemp -d)\ncp -a data \"$work/original-data\"\ncp src/INPUT.DAT \"$work/original-input\"\nrestore() { rm -rf data; cp -a \"$work/original-data\" data; cp \"$work/original-input\" src/INPUT.DAT; rm -rf \"$work\"; }\ntrap restore EXIT\n# Build a valid fixture with multiple records and an existing transaction.\nprintf 'U001Buyer               00000010
... [evidence truncated] ...
ata/BOOKS.DAT\nprintf 'B0080000000025U003U001' > data/TRANSACTIONS.DAT\npython3 program.py > \"$work/python.out\"\ncmp \"$work/cobol.out\" \"$work/python.out\"\nfor f in ACCOUNTS.DAT BOOKS.DAT TRANSACTIONS.DAT; do cmp \"$work/cobol-data/$f\" \"data/$f\"; done\npython3 -m py_compile program.py\nprintf 'COBOL/Python fixture outputs and all three data files match.\\n'", "timeout": 30}
- action_13 [tool_call]: bash {"command": "git diff -- program.py 2>/dev/null || true; git status --short 2>/dev/null || true", "timeout": 10}
- action_14 [tool_call]: bash {"command": "sha256sum data/*.DAT > /tmp/before.sha && python3 program.py >/tmp/program.out && sha256sum data/*.DAT > /tmp/after.sha && diff -u /tmp/before.sha /tmp/after.sha && printf 'Output: '; python3 -c 'print(repr(open(\"/tmp/program.out\",\"rb\").read()))'", "timeout": 10}
- action_15 [tool_call]: bash {"command": "set -e\nrm -rf /tmp/cobshort && mkdir -p /tmp/cobshort/{src,data}\ncp src/program.cbl /tmp/cobshort/src/\nprintf 'U001Buyer               9000000000U002Seller              0000001000' > /tmp/cobshort/data/ACCOUNTS.DAT\nprintf 'B007Probe Book          U002' > /tmp/cobshort/data/BOOKS.DAT\n: > /tmp/cobshort/data/TRANSACTIONS.DAT\nprintf 'U001U002B007200' > /tmp/cobshort/src/INPUT.DAT\ncd /tmp/cobshort && cobc -x -o p src/program.cbl && ./p >/dev/null\npython3 - <<'PY'\nfrom pathlib import Path\nfor f in Path('data').glob('*'): print(f.name, repr(f.read_bytes()))\nPY", "timeout": 20}
- action_16 [tool_call]: bash {"command": "set -e\nrm -rf /tmp/cobneg && mkdir -p /tmp/cobneg/{src,data}\ncp src/program.cbl /tmp/cobneg/src/\nprintf 'U001Buyer               0000000100U002Seller              9999999900' > /tmp/cobneg/data/ACCOUNTS.DAT\nprintf 'B007Probe Book          U002' > /tmp/cobneg/data/BOOKS.DAT\n: > /tmp/cobneg/data/TRANSACTIONS.DAT\nprintf 'U001U002B0070000000200' > /tmp/cobneg/src/INPUT.DAT\ncd /tmp/cobneg && cobc -x -o p src/program.cbl && ./p >/dev/null\npython3 - <<'PY'\nfrom pathlib import Path\nprint(repr(Path('data/ACCOUNTS.DAT').read_bytes()))\nPY", "timeout": 20}
- action_17 [tool_call]: edit {"edits": [{"newText": "    amount_field = input_record[12:22]\n    amount = int(amount_field.decode(\"ascii\"))\n    formatted_amount = f\"{amount:010d}\".encode(\"ascii\")\n", "oldText": "    amount_field = input_record[12:22]\n    amount = int(amount_field.decode(\"ascii\"))\n"}, {"newText": "        if record[0:4] == buyer_id:\n            balance = int(record[24:34].decod
... [evidence truncated] ...
(\"ascii\")\n        if record[0:4] == seller_id:\n            balance = int(record[24:34].decode(\"ascii\")) + amount\n            record[24:34] = f\"{balance:010d}\".encode(\"ascii\")\n"}, {"newText": "    transaction = book_id + formatted_amount + seller_id + buyer_id\n", "oldText": "    transaction = book_id + amount_field + seller_id + buyer_id\n"}], "path": "/app/program.py"}
- action_18 [tool_call]: bash {"command": "set -e\nwork=$(mktemp -d)\ncp -a data \"$work/original-data\"; cp src/INPUT.DAT \"$work/original-input\"\nrestore() { rm -rf data; cp -a \"$work/original-data\" data; cp \"$work/original-input\" src/INPUT.DAT; rm -rf \"$work\"; }\ntrap restore EXIT\ncobc -x -o \"$work/cobol\" src/program.cbl\nrun_case() {\n  name=$1; accounts=$2; books=$3; transactions=$4; input=$
... [evidence truncated] ...
000000U002Seller              0000001000' 'B007Probe Book          U002' '' 'U001U002B007200'\nrun_case overflow 'U001Buyer               0000000100U002Seller              9999999900' 'B007Probe Book          U002' '' 'U001U002B0070000000200'\npython3 -m py_compile program.py\nprintf 'Validated normal, short-input, and arithmetic-edge fixtures against GnuCOBOL.\\n'", "timeout": 30}
- action_19 [tool_call]: edit {"edits": [{"newText": "    input_record = input_data[:INPUT_LENGTH]\n    identifiers = (input_record[:12] + b\" \" * 12)[:12]\n    buyer_id = identifiers[0:4]\n    seller_id = identifiers[4:8]\n    book_id = identifiers[8:12]\n    # GnuCOBOL pads a short unsigned numeric field with trailing zeroes.\n    amount_field = (input_record[12:22] + b\"0\" * 10)[:10]\n", "oldText": "    input_record = (input_data[:INPUT_LENGTH] + b\" \" * INPUT_LENGTH)[:INPUT_LENGTH]\n    buyer_id = input_record[0:4]\n    seller_id = input_record[4:8]\n    book_id = input_record[8:12]\n    amount_field = input_record[12:22]\n"}], "path": "/app/program.py"}
- action_20 [tool_call]: bash {"command": "set -e\nwork=$(mktemp -d)\ncp -a data \"$work/original-data\"; cp src/INPUT.DAT \"$work/original-input\"\nrestore() { rm -rf data; cp -a \"$work/original-data\" data; cp \"$work/original-input\" src/INPUT.DAT; rm -rf \"$work\"; }\ntrap restore EXIT\ncobc -x -o \"$work/cobol\" src/program.cbl\nrun_case() {\n  name=$1; accounts=$2; books=$3; transactions=$4; input=$
... [evidence truncated] ...
000000U002Seller              0000001000' 'B007Probe Book          U002' '' 'U001U002B007200'\nrun_case overflow 'U001Buyer               0000000100U002Seller              9999999900' 'B007Probe Book          U002' '' 'U001U002B0070000000200'\npython3 -m py_compile program.py\nprintf 'Validated normal, short-input, and arithmetic-edge fixtures against GnuCOBOL.\\n'", "timeout": 30}
- action_21 [judgment]: Implemented the COBOL functionality in:

- `/app/program.py`

The script:

- Reads `/app/src/INPUT.DAT`
- Validates buyer, seller, book, and ownership
- Updates account balances
- Transfers book ownership
- Appends transaction records
- Preserves fixed-width binary-compatible `.DAT` formatting

Validated against GnuCOBOL 3 using normal, short-input, overflow, and insufficient-balance scenarios. All three output data files matched byte-for-byte.
