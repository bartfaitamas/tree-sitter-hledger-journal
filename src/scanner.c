#include "tree_sitter/parser.h"

// External tokens for what a regular grammar can't express.
enum TokenType {
  // End of file, possibly after trailing spaces/tabs: ends the last line of a
  // journal that has no final newline.
  EOF_TOKEN,
  // Lines after a "comment" line, through the "end comment" line or to the
  // end of the file.
  COMMENT_BLOCK_BODY,
};

void *tree_sitter_hledger_journal_external_scanner_create(void) { return NULL; }

void tree_sitter_hledger_journal_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_hledger_journal_external_scanner_serialize(void *payload,
                                                                 char *buffer) {
  return 0;
}

void tree_sitter_hledger_journal_external_scanner_deserialize(void *payload,
                                                               const char *buffer,
                                                               unsigned length) {}

static bool is_blank(int32_t c) { return c == ' ' || c == '\t'; }

static void skip_rest_of_line(TSLexer *lexer) {
  while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
    lexer->advance(lexer, false);
  }
  if (!lexer->eof(lexer)) lexer->advance(lexer, false);
}

// Consumes one line. Returns true if it was "end comment", allowing trailing
// blanks and a CR before the newline.
static bool consume_line_is_end_comment(TSLexer *lexer) {
  static const char end[] = "end comment";
  for (const char *p = end; *p; p++) {
    if (lexer->eof(lexer) || lexer->lookahead != *p) {
      skip_rest_of_line(lexer);
      return false;
    }
    lexer->advance(lexer, false);
  }
  while (is_blank(lexer->lookahead) || lexer->lookahead == '\r') {
    lexer->advance(lexer, false);
  }
  if (lexer->eof(lexer)) return true;
  if (lexer->lookahead != '\n') {
    skip_rest_of_line(lexer);
    return false;
  }
  lexer->advance(lexer, false);
  return true;
}

static bool scan_comment_block_body(TSLexer *lexer) {
  while (!lexer->eof(lexer)) {
    if (consume_line_is_end_comment(lexer)) break;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = COMMENT_BLOCK_BODY;
  return true;
}

static bool scan_eof(TSLexer *lexer) {
  while (is_blank(lexer->lookahead)) lexer->advance(lexer, false);
  if (!lexer->eof(lexer)) return false;
  lexer->mark_end(lexer);
  lexer->result_symbol = EOF_TOKEN;
  return true;
}

bool tree_sitter_hledger_journal_external_scanner_scan(void *payload, TSLexer *lexer,
                                                       const bool *valid_symbols) {
  // During error recovery every symbol is valid; never let the comment body
  // swallow the rest of the file then.
  if (valid_symbols[COMMENT_BLOCK_BODY] && !valid_symbols[EOF_TOKEN]) {
    return scan_comment_block_body(lexer);
  }
  if (valid_symbols[EOF_TOKEN]) return scan_eof(lexer);
  return false;
}
