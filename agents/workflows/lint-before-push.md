---
description: How to ensure lint passes before git push
---

# Pre-Push Lint Workflow

This project has a git pre-push hook that automatically runs `npm run lint` before allowing pushes.

## How It Works

1. When you run `git push`, the pre-push hook executes
2. It runs `npm run lint` to check for errors
3. If lint fails, the push is blocked with an error message
4. If lint passes, the push proceeds normally

## Manual Check

// turbo
Run lint manually before pushing:
```bash
npm run lint
```

## Fixing Lint Errors

// turbo
If lint fails, fix the errors automatically where possible:
```bash
npm run lint:fix
```

Then review any remaining errors and fix them manually.

## Bypassing the Hook (Emergency Only)

If you absolutely must push without lint passing (not recommended):
```bash
git push --no-verify
```

## Re-installing the Hook

If the hook gets removed, recreate it:
```bash
cp .git/hooks/pre-push.sample .git/hooks/pre-push
# Then edit with the lint check content
```

Or ensure the pre-push file exists at `.git/hooks/pre-push` with executable permissions:
```bash
chmod +x .git/hooks/pre-push
```