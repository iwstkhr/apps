#!/usr/bin/env bash
# Trigger sync-change-artifacts skill after relevant code edits.
set -euo pipefail

input=$(cat)

file_path=$(
  echo "$input" | jq -r '
    .tool_input.path //
    .tool_input.file_path //
    .input.path //
    .arguments.path //
    empty
  '
)

if [[ -z "$file_path" ]]; then
  echo '{}'
  exit 0
fi

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
    || [[ "$1" == .cursor/skills/sync-change-artifacts/* ]]
}

is_implementation_code() {
  [[ "$1" == app/* ]] && ! is_test_file "$1" && ! is_fixture_or_setup "$1"
}

is_build_or_tooling_config() {
  case "$1" in
    package.json | package-lock.json | vite.config.ts | react-router.config.ts | biome.json | .mise.toml | tsconfig.json)
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

if is_test_file "$file_path" || is_fixture_or_setup "$file_path" || is_skill_or_checklist_artifact "$file_path"; then
  echo '{}'
  exit 0
fi

if ! is_implementation_code "$file_path" && ! is_build_or_tooling_config "$file_path"; then
  echo '{}'
  exit 0
fi

message=$(cat <<EOF
コード変更を検出しました（\`$file_path\`）。

\`.cursor/skills/sync-change-artifacts/SKILL.md\` スキルを**今すぐ読み**、手順に従って関連成果物を同じ作業単位に含めてください。

- テストコード更新
- GitHub Actions 更新
- ドキュメント更新

スキルの「適用タイミング」表に従い、今回の変更に必要な項目だけ実施してください。作業完了前にスキルの確認チェックリストも満たしてください。
EOF
)

jq -n --arg ctx "$message" '{ "additional_context": $ctx }'
