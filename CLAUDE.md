@AGENTS.md

## Claude-specific notes

- Put scratch files (debug journals, parse dumps) in the session scratchpad,
  not in the repository.
- Run `tree-sitter generate` before `tree-sitter test`: the tests run against
  `src/parser.c`, not `grammar.js`.
