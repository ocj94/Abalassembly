🇫🇷 [Version française](../docs-fr/Secrets.fr.md)

# Never push a key

Two safety nets, and why two are needed. Put in place in November 2026 after a pass with gitleaks, semgrep and `npm audit`.

---

## The rule, first

**A pushed key is a lost key.** Deleting the commit does not un-leak it: it existed in a public repository, it may have been cloned, indexed, cached. The only useful action is to **revoke** it and create another. Cleaning up the history comes after, and replaces nothing.

The two nets exist so that day does not come.

## Net 1 — the pre-commit hook

It stops the key **before** it enters the history. Install it once, in each clone:

```bash
git config core.hooksPath tools/githooks
```

The hook lives in the repository, so it follows clones and Codespaces; the command above only tells git where to look.

It runs `tools/scan-secrets.js` on what is staged. That scanner has **no dependencies**: it runs anywhere Node runs, including an empty Codespace, and costs a second. It knows the formats that matter here — GitHub token (`ghp_`, `github_pat_`), AWS key, private key, Slack token, Google key, Stripe token, JWT — plus one general rule: a `secret = "…"` assignment of at least twenty characters with enough entropy.

It stays silent on a line containing `exemple`, `placeholder`, `votre`, `xxxx`, `REDACTED` and the like, on `index.html` (the assembled site, which repeats everything else), and on images and archives.

To override once, knowingly:

```bash
git commit --no-verify
```

## Net 2 — continuous integration

The hook only protects whoever installed it. The `secrets` job in `.github/workflows/verify.yml` catches the rest:

1. the **same in-house scanner** over every tracked file — if it breaks, we learn it here and not on the day it was needed;
2. the **real gitleaks**, over the **whole history** (`fetch-depth: 0`) then over the files. It knows hundreds of formats the in-house scanner never will.

The binary is pinned **by version and by SHA-256 digest**: a replaced release on GitHub's side would not pass the check. The same precaution as the SHA-pinned actions elsewhere in the file.

The job runs in parallel with the rest, so it does not lengthen the verification.

## What this does not cover

- **The player's browser.** A site delivered as a single file has no secrets: everything written in `index.html` is public by construction. That is not a flaw to fix, it is the model.
- **Secrets that look like nothing.** An ordinary string that happens to be a password will be caught by neither. Hence the rule: no secret goes into a file, not even "to test".
- **Dependencies.** The site has no `package.json` at all. On the API side, `npm audit` is the right tool, and it reported zero vulnerabilities when this page was written.

## State on 18 November 2026

| Check | Scope | Result |
|---|---|---|
| gitleaks, history | 1,744 commits | no leaks |
| gitleaks, files | whole repository | no leaks |
| in-house scanner | 1,014 tracked files | no leaks |
| semgrep, 11 in-house rules | 120 files | 47 alerts, 0 confirmed after triage |
| workflows | 3 files | permissions declared, actions SHA-pinned |

The 47 semgrep alerts broke down as follows: 21 `http://` which were all `xmlns="http://www.w3.org/2000/svg"` — an XML namespace identifier, nothing is fetched; 18 `target="_blank"` which did carry `rel="noopener"` on the same line, the rule could not see it; 5 `new Function` in tools that only run in continuous integration and that load the repository's own code; 3 window openings, two with a constant URL and one onto the site's own page.
