#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE' >&2
Usage: scripts/bump-version.sh <version>

Examples:
  scripts/bump-version.sh 0.2.0

What it does:
  1. fetches main and verifies local main is up to date
  2. creates branch release/v<version>
  3. bumps version in:
       - package.json
       - src-tauri/tauri.conf.json
       - src-tauri/Cargo.toml
       - src-tauri/Cargo.lock (via `cargo update --workspace`)
  4. commits and pushes the branch
  5. opens a draft PR against main

Requires: git, node, cargo, gh CLI.
USAGE
  exit 1
}

[[ $# -eq 1 ]] || usage
VERSION="$1"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: invalid SemVer (expected X.Y.Z): $VERSION" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree is not clean" >&2
  exit 1
fi

git fetch origin main --quiet

LOCAL_MAIN=$(git rev-parse main 2>/dev/null || true)
REMOTE_MAIN=$(git rev-parse origin/main)
if [[ "$LOCAL_MAIN" != "$REMOTE_MAIN" ]]; then
  echo "ERROR: local main is out of sync with origin/main" >&2
  echo "       run: git checkout main && git pull --ff-only" >&2
  exit 1
fi

BRANCH="release/v${VERSION}"
if git show-ref --quiet "refs/heads/${BRANCH}"; then
  echo "ERROR: branch already exists locally: ${BRANCH}" >&2
  exit 1
fi
if git ls-remote --exit-code --heads origin "${BRANCH}" >/dev/null 2>&1; then
  echo "ERROR: branch already exists on origin: ${BRANCH}" >&2
  exit 1
fi

git checkout -b "${BRANCH}" "${REMOTE_MAIN}"

# package.json / src-tauri/tauri.conf.json
node - "$VERSION" <<'NODE'
const { readFileSync, writeFileSync } = require('node:fs');
const version = process.argv[2];
for (const f of ['package.json', 'src-tauri/tauri.conf.json']) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  j.version = version;
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
NODE

# src-tauri/Cargo.toml: rewrite the first `version = "..."` (the [package] one)
# BSD sed (macOS) requires `-i ''`.
sed -i '' -E "s/^version = \"[^\"]*\"$/version = \"${VERSION}\"/" src-tauri/Cargo.toml

# Sync Cargo.lock
( cd src-tauri && cargo update --workspace --quiet )

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore(release): v${VERSION}"

git push -u origin "${BRANCH}"

PR_BODY=$(cat <<EOF
## Release v${VERSION}

このPRを main にマージすると \`release.yml\` workflow が起動して:

1. tag \`v${VERSION}\` を打つ
2. \`aarch64-apple-darwin\` 向けにビルド
3. \`.dmg\` / \`.app\` を draft Release にアップロード

マージ前に CI (Frontend / Rust cargo check) が pass していることを確認してください。
マージ後、Releases ページで draft release の本文 (自動生成) を確認して publish してください。
EOF
)

gh pr create \
  --base main \
  --head "${BRANCH}" \
  --title "chore(release): v${VERSION}" \
  --body "${PR_BODY}" \
  --draft

echo
echo "Draft PR created. After CI passes, mark it as ready for review and merge."
