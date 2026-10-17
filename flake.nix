{
  description = "tree-sitter grammar for hledger journal files";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    # hledger's test suite, read at check time by scripts/acceptance.
    # GPL-3.0: never copy its files into this repository.
    # The tag must equal the hledger version in the locked nixpkgs.
    hledger-src = {
      url = "github:simonmichael/hledger/1.52";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, hledger-src }:
    let
      supportedSystems = [
        "aarch64-darwin"
        "aarch64-linux"
        "i686-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      nixpkgsFor = forAllSystems (system: import nixpkgs { inherit system; });
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgsFor.${system};
        in
        {
          tree-sitter-hledger-journal = pkgs.tree-sitter.buildGrammar {
            language = "hledger_journal";
            version = "0.1.0";
            src = ./.;
          };
          default = self.packages.${system}.tree-sitter-hledger-journal;
        });

      overlays = {
        tree-sitter-grammars = final: prev: {
          tree-sitter-grammars = prev.tree-sitter-grammars // {
            tree-sitter-hledger-journal = final.tree-sitter.buildGrammar {
              language = "hledger_journal";
              version = "0.1.0";
              src = ./.;
            };
          };
        };
        default = self.overlays.tree-sitter-grammars;
      };

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgsFor.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.tree-sitter
              pkgs.nodejs
              pkgs.emscripten
              pkgs.gcc
              pkgs.hledger
              pkgs.gh
            ];
            env = {
              npm_config_build_from_source = true;
              HLEDGER_SRC = "${hledger-src}";
            };
          };
        });

      checks = forAllSystems (system:
        let
          pkgs = nixpkgsFor.${system};
        in
        {
          default = pkgs.stdenv.mkDerivation {
            pname = "tree-sitter-hledger-journal-test";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [
              pkgs.tree-sitter
              pkgs.nodejs
              pkgs.gcc
            ];
            buildPhase = ''
              export HOME=$(mktemp -d)
              tree-sitter test
              node scripts/acceptance/check-files.mjs test/fixtures/*.journal
            '';
            installPhase = "touch $out";
          };

          acceptance = pkgs.stdenv.mkDerivation {
            pname = "tree-sitter-hledger-journal-acceptance";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [
              pkgs.tree-sitter
              pkgs.nodejs
              pkgs.gcc
              pkgs.hledger
            ];
            buildPhase = ''
              HOME=$(mktemp -d) node scripts/acceptance/run.mjs \
                --hledger-src ${hledger-src} --out $TMPDIR/acc
            '';
            installPhase = "touch $out";
          };
        });
    };
}
