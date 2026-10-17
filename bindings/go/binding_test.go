package tree_sitter_hledger_journal_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_hledger_journal "github.com/bartfaitamas/tree-sitter-hledger-journal/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_hledger_journal.Language())
	if language == nil {
		t.Errorf("Error loading hledger journal grammar")
	}
}
