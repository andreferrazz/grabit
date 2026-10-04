#!/bin/bash
# Prepares a Claude Code cloud session (claude.ai/code, the mobile app) to build and
# test Grabit. Runs from the SessionStart hook in .claude/settings.json; does nothing
# on a developer machine. Every step is skipped when its result is already on disk,
# so a resumed session, or one restored from the environment cache, starts quickly.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"
exec >&2 # keep stdout out of the session context; progress goes to the hook log

as_root() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }

# Node: the image ships 20-22; package.json requires the version pinned in mise.toml.
node_version=$(sed -n 's/^node = "\(.*\)"/\1/p' mise.toml)
node_dir=/opt/node-$node_version
if [ ! -x "$node_dir/bin/node" ]; then
	echo "Installing Node $node_version"
	as_root mkdir -p "$node_dir"
	curl -fsSL "https://nodejs.org/dist/v$node_version/node-v$node_version-linux-x64.tar.xz" |
		as_root tar -xJ --strip-components=1 -C "$node_dir"
fi
export PATH="$node_dir/bin:$PATH"
# Commands Claude runs later in the session get the same PATH.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
	echo "export PATH=\"$node_dir/bin:\$PATH\"" >>"$CLAUDE_ENV_FILE"
fi

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
	echo "Installing npm dependencies"
	npm ci
fi

# The browser comes from cdn.playwright.dev, which the environment must allow (AGENTS.md).
if ! ls "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium-* >/dev/null 2>&1; then
	echo "Installing the test browser"
	npx playwright install --with-deps chromium ||
		echo "Could not install Chromium: end-to-end tests will not run in this session."
fi

# Test Postgres and mail catcher. Containers do not survive in the environment cache,
# so they start on every session; only the first one pulls the images.
if ! docker info >/dev/null 2>&1; then
	echo "Starting Docker"
	as_root service docker start >/dev/null 2>&1 ||
		(as_root nohup dockerd >/tmp/dockerd.log 2>&1 &)
	for _ in $(seq 30); do
		docker info >/dev/null 2>&1 && break
		sleep 1
	done
fi
npm run test:db || echo "Could not start the test services: run 'npm run test:db' by hand."
