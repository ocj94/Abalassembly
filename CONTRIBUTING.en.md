🇫🇷 [Version française](CONTRIBUTING.fr.md)

# Contributing

An honest word first: this project is essentially maintained solo, alongside
[abalassembly-api](https://github.com/ocj94/abalassembly-api), not by an
established team. Contributions are welcome, but expect a personal review
pace.

## Reporting a vulnerability

Not here — see [`SECURITY.md`](SECURITY.en.md), which points to the
repository's private form rather than a public issue.

## Before proposing a change

**The 3 checks CI actually enforces** (`.github/workflows/verify.yml`,
~30 seconds, on every push):

```bash
node tools/check-scripts.js index.html      # 1/3 — syntax of every <script> block
node tools/check-embedded.js index.html     # 2/3 — embedded tables match their source data
node tablebase/audit-puzzles.js index.html --baseline tablebase/puzzles-baseline.json  # 3/3 — every puzzle has a provable solution
```

A pull request that doesn't pass these 3 checks won't be merged, whatever
else it does.

**On top of that, not CI-enforced but useful locally**:
`node tests/regression.js`, `node tests/nacre.js`, `node tests/gamecode.js` —
integrity, notation, game-code round trip.

## The `src/` folder and the single file

The root `index.html` is **generated**, not hand-edited: see
[`src/README.md`](src/README.en.md) for the full structure. In short —
edit the right file in `src/`, then:

```bash
node tools/build.js --check   # regenerates index.html and checks nothing was lost
```

**Why flat concatenation and not real `import`/`export` modules**: the code
communicates entirely through shared global variables (`board`,
`currentTurn`, `humanColor`, `capturedByBlack`…) — some called hundreds of
times across the file. Real modules would require tracing and fixing every
caller one by one; missing even one doesn't fail loudly — it keeps reading
the old reference while another part of the code writes to the new one, a
silent divergence bug, not a visible error. A deliberate choice, documented
in `src/README.md`, not an abandoned effort.

## Style and principles

- **Never fabricate data.** A displayed number must be computed or sourced,
  never estimated. A missing value shows `—`, never `0`.
- **Verify before asserting.** Before claiming a bug exists or a feature is
  missing, go read the real code (`raw.githubusercontent.com` or the
  authenticated API, not a cached version).
- **Offline-first.** The game must stay playable with no network, including
  from `file://`. Any feature that assumes a connection needs an honest
  fallback, never a silent failure.
- **Document limitations instead of staying silent about them.** See
  [`docs/Multi-worker`](docs/Moteur-multi-worker.en.md) or
  [`docs/Distributed computing`](docs/Calcul-distribue.en.md) as examples: a
  real, unresolved problem documented honestly beats silence.

## What genuinely helps

- A fix accompanied by a test that failed before and passes after
- A correction of a stale figure (variants, puzzles, games) found by
  cross-checking it against the real code — not copied from another page
- An English translation of a page that doesn't have one yet, in the same
  spirit as the rest of the wiki: French unchanged, a switcher link added
