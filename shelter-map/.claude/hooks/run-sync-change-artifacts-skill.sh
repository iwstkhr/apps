#!/usr/bin/env bash
# Remind Claude to keep related artifacts synchronized after relevant file edits.
set -euo pipefail

input=$(cat)

file_path=$(
  jq -r '
    .tool_input.file_path //
    .tool_response.filePath //
    empty
  ' <<<"$input"
)

if [[ -z "$file_path" ]]; then
  echo '{}'
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
file_path="${file_path#"$repo_root"/}"
file_path="${file_path#./}"

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
    || [[ "$1" == .claude/settings.json ]] \
    || [[ "$1" == .claude/hooks/* ]]
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

if is_test_file "$file_path" \
  || is_fixture_or_setup "$file_path" \
  || is_skill_or_checklist_artifact "$file_path"; then
  echo '{}'
  exit 0
fi

if ! is_implementation_code "$file_path" && ! is_build_or_tooling_config "$file_path"; then
  echo '{}'
  exit 0
fi

message=$(cat <<EOF
コード変更を検出しました。

- \`$file_path\`

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
