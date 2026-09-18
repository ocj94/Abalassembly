🇫🇷 [Version française](CHANGELOG.md)

# Changelog

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `APP_VERSION` in `index.html` and the
[GitHub Releases](https://github.com/ocj94/Abalassembly/releases).

This file exists because the history lived only in the Releases, and so was
invisible offline — which contradicts the project's own principle.

## [v2.46]

### Added
- **Alitration variant**, playable. Found on onlineabalone.wordpress.com;
  the position was verified by replaying a real 122-ply MiGs game through to
  its conclusion before integration.
- **Principal variation** on the move hint: the opponent's likely reply is
  shown, honestly bounded to the depth actually searched.
- **`docs/Variants`**: what is playable versus merely documented, across the
  three places on the site that describe variants.
- **`docs/Function glossary`**: 1,236 functions extracted from the real
  code, sorted by letter with their section.
- **`tablebase/generate-3v3.js`**: self-contained 3v3 solver.

### Changed
- The 21 starting layouts moved to a dropdown (previously individual
  buttons); the layout preview is larger.
- Progressive encapsulation of global state behind an explicit interface:
  `GameMode`, `HumanColor`, `CurrentTurn`, `CapturedByBlack`,
  `CapturedByWhite`, `MoveCount`, `GameOver`. `board` was deliberately left
  out — see `RECOVERY.en.md` for the figures behind that decision.
- Documentation reorganised into `docs-fr/` and `docs-en/`, explicit suffixes.

### Fixed
- **1D view**: now flips correctly when the human plays white. The standard
  layout puts black at the bottom; the display stayed fixed, so it was right
  for a black player and upside-down for a white one.
- **Undo impossible as white**: `requestUndo()` compared against a hardcoded
  `'black'`. A human playing white against the AI was told "only you can
  request an undo" — while being the player.
- **Train-the-Trainer certificate threshold**: the 6 sessions now genuinely
  count, alongside the assessment.
- Faster comparison against the 418,595 historical fingerprints (index
  access instead of text-key lookup), with no dependency added.
- References to a non-existent `tb-3v2.json`: the 3v2 data is embedded as
  base64, there is no separate file.

## [v2.45]

- Pattern detector in the evaluation curve.

## [v2.44]

- Korean Daisy and Anglattack variants.

## [v2.43]

- Live game: integrated subsection.

---

*Versions before v2.43 are not restated here: their detail lives in the
GitHub Releases and the commit history.*
