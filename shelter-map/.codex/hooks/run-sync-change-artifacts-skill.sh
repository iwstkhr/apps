#!/usr/bin/env bash
# Remind Codex to keep related artifacts synchronized after relevant apply_patch edits.
set -euo pipefail

input=$(cat)

if [[ $(jq -r '.tool_name // empty' <<<"$input") != "apply_patch" ]]; then
  echo '{}'
  exit 0
fi

patch=$(jq -r '.tool_input.command // empty' <<<"$input")
if [[ -z "$patch" ]]; then
  echo '{}'
  exit 0
fi

paths=$(
  sed -nE \
    -e 's/^\*\*\* (Add|Update|Delete) File: (.*)$/\2/p' \
    -e 's/^\*\*\* Move to: (.*)$/\1/p' \
    <<<"$patch" \
    | sed 's#^\./##' \
    | sort -u
)

if [[ -z "$paths" ]]; then
  echo '{}'
  exit 0
fi

is_test_file() {
  [[ "$1" == *.test.ts ]] || [[ "$1" == *.test.tsx ]]
}

is_fixture_or_setup() {
  [[ "$1" == app/test/* ]]
}

is_skill_or_checklist_artifact() {
  [[ "$1" == README.md ]] \
    || [[ "$1" == .github/workflows/* ]] \
    || [[ "$1" == .agents/skills/sync-change-artifacts/* ]] \
    || [[ "$1" == .codex/hooks.json ]] \
    || [[ "$1" == .codex/hooks/* ]]
}

is_implementation_code() {
  [[ "$1" == app/* ]] && ! is_test_file "$1" && ! is_fixture_or_setup "$1"
}

is_build_or_tooling_config() {
  case "$1" in
    package.json | package-lock.json | vite.config.ts | react-router.config.ts | biome.json | .mise.toml | mise.toml | tsconfig.json)
      return 0
      ;;
    scripts/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

relevant_paths=""
while IFS= read -r file_path; do
  [[ -n "$file_path" ]] || continue

  if is_test_file "$file_path" \
    || is_fixture_or_setup "$file_path" \
    || is_skill_or_checklist_artifact "$file_path"; then
    continue
  fi

  if is_implementation_code "$file_path" || is_build_or_tooling_config "$file_path"; then
    relevant_paths+="- \`$file_path\`"$'\n'
  fi
done <<<"$paths"

if [[ -z "$relevant_paths" ]]; then
  echo '{}'
  exit 0
fi

message=$(cat <<EOF
コード変更を検出しました。

$relevant_paths
\`.agents/skills/sync-change-artifacts/SKILL.md\` を今すぐ読み、適用タイミング表に従って、今回必要な関連成果物だけを同じ作業単位に含めてください。

- テストコード更新
- GitHub Actions 更新
- ドキュメント更新

作業完了前にスキルの確認チェックリストも満たしてください。
EOF
)

jq -n --arg ctx "$message" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
