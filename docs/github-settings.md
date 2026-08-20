# GitHub settings to configure by hand

Some of this repository's protection lives in GitHub's settings rather than in its files, and
nothing in the repo can turn it on. This is the list, with what each one buys.

Everything below is a to-do. None of it is done by the workflows.

## 1. Protect `master`

**Settings → Branches → Add branch ruleset**, targeting `master`:

- [ ] **Require a pull request before merging.** Without this every other check is optional,
      because anything can be pushed straight to `master`.
      - Required approvals: `0` is honest for a single-maintainer repository. The pull request
        itself is what makes CI run and gives you somewhere to read the diff.
      - [ ] Dismiss stale approvals when new commits are pushed
- [ ] **Require status checks to pass.** Add each by name, once it has run at least once:
      - `lint, tests, types, secrets, build`
      - `python assistant`
      - `browser suite`
      - `cms suite`
      - `d1 migrations`
      - `new dependencies`
      - `CodeQL (javascript-typescript)`
      - `CodeQL (actions)`
      - [ ] Require branches to be up to date before merging
- [ ] **Block force pushes**
- [ ] **Restrict deletions**
- [ ] **Require linear history** — optional, but it keeps `git log` readable, which this
      repository's commit messages are written on the assumption of

Leave "Do not allow bypassing" off unless you want to lock yourself out of your own hotfix at
2am. Admin bypass on a solo repository is a reasonable trade; on a team it is not.

## 2. Code security

**Settings → Advanced Security**:

- [x] **Secret scanning** — already enabled
- [x] **Push protection** — already enabled. This is the one that actually matters: it refuses
      the push rather than telling you afterwards
- [ ] **Dependabot security updates** — currently **disabled**. Turn it on. `dependabot.yml`
      schedules version updates, which is a different thing: security updates are what open a
      pull request the day an advisory lands
- [ ] **Dependabot alerts** — confirm on
- [ ] **Secret scanning for non-provider patterns** — optional. Catches generic-looking secrets
      at the cost of more false positives
- [ ] **Private vulnerability reporting** — on, so SECURITY.md's advisory link works

## 3. Actions

**Settings → Actions → General**:

- [ ] **Actions permissions**: "Allow enterprise/owner actions, and select non-owner actions" —
      then allow `actions/*`, `github/*` and `astral-sh/setup-uv@*`. That is the complete list
      this repository uses; anything else appearing is worth noticing
- [ ] **Workflow permissions**: "Read repository contents and packages permissions". Every
      workflow already declares `permissions:` explicitly, so this is belt and braces — but it
      means a workflow added later without a `permissions:` block is read-only by default
- [ ] **Require approval for all outside collaborators** — under fork pull request workflows

## 4. General

- [ ] Disable Wiki and Projects if unused — fewer surfaces, less to moderate
- [ ] **Settings → Discussions** off unless you want them; SECURITY.md points reporters at
      advisories, not discussions
- [ ] Confirm the repository description and topics are set — this is a portfolio, and the
      repository page is part of it

## 5. Verify it worked

Open a throwaway pull request that deliberately breaks something — delete a line from
`worker/index.ts`'s session guard — and confirm:

- [ ] CI goes red
- [ ] The merge button is blocked, not merely discouraged
- [ ] `git push --force origin master` is refused

Then close it. A protection nobody has tested is a protection nobody has.
