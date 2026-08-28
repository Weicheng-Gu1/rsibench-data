---
name: compat-audit
description: Use when a change touches something existing callers already observe -- an exported signature, an error or diagnostic string, an enum or opcode value, a reserved grammar token, an existing rendering path, or a pre-existing test/golden/fixture file -- to audit in-repo users and choose an additive alternative.
---

Run this audit before you finish, once per observable you changed.

1. List the observables. For each pre-existing file you edited, name what an
   outside caller could already see and now sees differently: symbol and
   signature, error/diagnostic text, constant value or ordering, accepted
   syntax, emitted markup or geometry. A rename, a reorder, and an inserted
   parameter all count; adding a new name beside the old one does not.
2. Find the users. For each observable, grep the whole repository for the
   symbol, the literal string, or the constant name -- including test
   directories, golden files, fixtures, snapshots, and docs. The visible suite
   is a subset of the callers; do not assume it is all of them.
3. Ask what the task actually required. Quote the clause of the task statement
   that asks for this observable to change. No clause means the change is
   incidental to your implementation choice, not a requirement.
4. Build the additive alternative for every observable with no clause behind
   it. Typical shapes: keep the old function and add a new one or an options
   argument with a zero-valued default; append the new enum member after the
   last existing member instead of inserting; add a new file rather than
   rewriting an existing one; make the new token opt-in rather than reserved;
   add a new class/attribute rather than changing the existing output.
5. Re-check the pre-existing expectations. Restore every pre-existing test,
   golden, fixture, and snapshot you edited to its original content, then run
   the suite. If it now passes untouched, keep the restoration. If it still
   fails, that failure is the real signal: fix the implementation, and only
   leave the expectation modified when step 3 produced a clause requiring it.

Report the audit as one line per observable: what changed, which clause
required it (or `additive alternative applied`), and whether any pre-existing
expectation file remains modified.
