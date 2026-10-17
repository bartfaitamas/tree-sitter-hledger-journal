import XCTest
import SwiftTreeSitter
import TreeSitterHledgerJournal

final class TreeSitterHledgerJournalTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_hledger_journal())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading hledger journal grammar")
    }
}
