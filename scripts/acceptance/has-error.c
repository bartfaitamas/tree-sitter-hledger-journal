// Prints "<0|1>\t<path>" for each file named on stdin (one path per line):
// 1 if the parse tree has any ERROR or MISSING node, including MISSING hidden
// tokens that `tree-sitter parse` does not report.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <tree_sitter/api.h>

const TSLanguage *tree_sitter_hledger_journal(void);

static char *read_file(const char *path, long *size) {
  FILE *f = fopen(path, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  *size = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *buf = malloc(*size + 1);
  if (buf && fread(buf, 1, *size, f) != (size_t)*size) {
    free(buf);
    buf = NULL;
  }
  fclose(f);
  return buf;
}

int main(void) {
  TSParser *parser = ts_parser_new();
  ts_parser_set_language(parser, tree_sitter_hledger_journal());

  char path[4096];
  while (fgets(path, sizeof path, stdin)) {
    path[strcspn(path, "\n")] = '\0';
    if (!*path) continue;
    long size;
    char *source = read_file(path, &size);
    if (!source) {
      fprintf(stderr, "cannot read %s\n", path);
      return 2;
    }
    TSTree *tree = ts_parser_parse_string(parser, NULL, source, (uint32_t)size);
    printf("%d\t%s\n", ts_node_has_error(ts_tree_root_node(tree)), path);
    ts_tree_delete(tree);
    free(source);
  }
  ts_parser_delete(parser);
  return 0;
}
