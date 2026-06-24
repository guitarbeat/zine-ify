#!/usr/bin/env bash
set -euo pipefail

LAYOUT_FILES=(
  src/components/UI/UIManager.js
  src/utils/snapGrid.js
  src/styles/layout.css
  index.html
)

restore_layout() {
  git checkout replit-layout -- "${LAYOUT_FILES[@]}" 2>/dev/null || true
  if ! git diff --quiet HEAD -- "${LAYOUT_FILES[@]}" 2>/dev/null; then
    git add "${LAYOUT_FILES[@]}"
    git commit -m "Restore replit layout files"
  fi
}

log() {
  printf '[merge-all] %s\n' "$*"
}

merged=0
skipped=0
failed=0

while IFS= read -r branch; do
  short="${branch#origin/}"

  if [[ "$short" == "replit-agent" ]]; then
    log "skip replit-agent (layout already applied)"
    skipped=$((skipped + 1))
    continue
  fi

  if git merge-base --is-ancestor "$branch" HEAD 2>/dev/null; then
    log "skip $short (already merged)"
    skipped=$((skipped + 1))
    continue
  fi

  restore_layout

  log "merging $short ..."
  if git merge "$branch" --no-edit -m "Merge branch '$short' into merge-all-branches"; then
    restore_layout
    merged=$((merged + 1))
    continue
  fi

  log "conflicts in $short — auto-resolving"
  conflicted=()
  while IFS= read -r file; do
    [[ -n "$file" ]] && conflicted+=("$file")
  done < <(git diff --name-only --diff-filter=U)

  if ((${#conflicted[@]} == 0)); then
    log "no conflicted files listed for $short — aborting"
    git merge --abort 2>/dev/null || true
    failed=$((failed + 1))
    continue
  fi

  for file in "${conflicted[@]}"; do
    is_layout=false
    for layout in "${LAYOUT_FILES[@]}"; do
      if [[ "$file" == "$layout" ]]; then
        is_layout=true
        break
      fi
    done

    if $is_layout; then
      git checkout replit-layout -- "$file" 2>/dev/null || git checkout --ours -- "$file"
    else
      git checkout --theirs -- "$file" 2>/dev/null || git checkout --ours -- "$file"
    fi
  done

  restore_layout
  git add -A
  if git commit --no-edit -m "Merge branch '$short' into merge-all-branches (auto-resolved)"; then
    merged=$((merged + 1))
  else
    log "FAILED $short — aborting merge"
    git merge --abort 2>/dev/null || true
    failed=$((failed + 1))
  fi
done < <(git branch -r | grep -v HEAD | sed 's/^ *//')

log "done: merged=$merged skipped=$skipped failed=$failed"