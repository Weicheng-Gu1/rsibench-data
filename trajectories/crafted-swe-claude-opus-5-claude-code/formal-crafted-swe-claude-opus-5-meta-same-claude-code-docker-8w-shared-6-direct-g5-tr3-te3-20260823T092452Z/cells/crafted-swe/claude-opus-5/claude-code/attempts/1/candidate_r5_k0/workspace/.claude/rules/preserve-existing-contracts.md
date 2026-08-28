# Changes that alter a pre-existing contract

Trigger: you are about to edit a file that existed before this session, and the
edit changes something an existing caller could already observe. Concretely:

- the signature, receiver, parameter list, or return type of an exported
  function, method, constructor, or class;
- the text, type, or wrapping of an error / exception / diagnostic that
  existing code already produces;
- the numeric value or ordering of members in an existing enum, `iota` block,
  opcode table, or serialized constant;
- the tokens a grammar or parser reserves, in a way that removes an identifier
  or syntax that used to be legal;
- the geometry, column/row bookkeeping, or emitted markup of an existing
  rendering path;
- the contents of a pre-existing test, golden, fixture, or snapshot file.

When the trigger matches:

1. Look first for an additive way to satisfy the same requirement: a new
   function or overload beside the old one, a new options-struct field with a
   zero-valued default, a new file next to the existing one, an enum member
   appended after the last existing member, an opt-in token, a new CSS class.
   Prefer the additive form unless the task statement asks for the
   incompatible change.
2. If you keep the incompatible change, search the repository for every
   in-repo user of that observable -- the symbol name, the literal error text,
   the constant -- and quote the clause of the task statement that asks for
   that observable to change. If no clause asks for it, it is collateral
   damage: revert to the additive form.
3. Treat "a pre-existing test, golden file, or fixture stopped compiling or
   passing because of my change" as the strongest instance of step 2, not as a
   chore to clear. Editing that file so it agrees with your new behavior
   removes the breakage from the visible suite while leaving it in place for
   any caller you did not edit. Only change a pre-existing expectation when the
   task statement asks for that expectation to change; otherwise keep adjusting
   your implementation until the untouched file passes again.

Not triggered by: files you created during this session, and by behavior the
task statement explicitly redefines.

When more than one observable is involved, or when you are unsure whether an
edit qualifies, work through them with the `compat-audit` skill.
