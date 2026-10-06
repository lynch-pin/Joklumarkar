#!/usr/bin/env bash
# scripts/sync-data.sh — 통합전략 리더용 데이터 동기화 (약 47MB)
# ArknightsGamedata 레포에서 roguelike 관련 경로만 sparse-checkout 으로 받는다.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAMEDATA_DIR="${GAMEDATA_DIR:-$ROOT_DIR/gamedata}"
GAMEDATA_REPO="${GAMEDATA_REPO:-https://github.com/ArknightsAssets/ArknightsGamedata}"
GAMEDATA_REF="${GAMEDATA_REF:-master}"
ASSETS_REPO="${ASSETS_REPO:-https://github.com/ArknightsAssets/ArknightsAssets}"
ASSETS_REF="${ASSETS_REF:-cn}"
ASSET_INDEX="${ASSET_INDEX:-$ROOT_DIR/gamedata/asset-index.txt}"
export GIT_LFS_SKIP_SMUDGE=1

# 네트워크 오류 대비 지수 백오프 재시도
retry() { local n="$1"; shift; local d=2 i
  for ((i=1;i<=n;i++)); do "$@" && return 0; ((i==n)) && return 1
    echo "[sync] 실패($i/$n) ${d}s 후 재시도" >&2; sleep "$d"; d=$((d*2)); done; }

mkdir -p "$ROOT_DIR/gamedata"
REPO_DIR="$GAMEDATA_DIR/repo"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  rm -rf "$REPO_DIR"
  retry 4 git clone --depth 1 --filter=blob:none --sparse --branch "$GAMEDATA_REF" \
    "$GAMEDATA_REPO" "$REPO_DIR"
fi

# cone 모드로는 파일 단위를 못 고르므로 --no-cone 으로 패턴을 직접 지정한다
git -C "$REPO_DIR" sparse-checkout set --no-cone \
  '/kr/gamedata/excel/roguelike_topic_table.json' \
  '/cn/gamedata/excel/roguelike_topic_table.json' \
  '/kr/gamedata/story/obt/rogue/**' \
  '/kr/gamedata/story/obt/roguelike/**' \
  '/cn/gamedata/story/obt/rogue/**' \
  '/cn/gamedata/story/obt/roguelike/**'

retry 4 git -C "$REPO_DIR" fetch --depth 1 origin "$GAMEDATA_REF"
git -C "$REPO_DIR" reset --hard --quiet FETCH_HEAD
git -C "$REPO_DIR" sparse-checkout reapply

# 받아진 파일이 비면 git 버전 문제 → cone 모드 폴백 (용량 큼)
if [[ ! -s "$REPO_DIR/kr/gamedata/excel/roguelike_topic_table.json" ]]; then
  echo "[sync] no-cone 체크아웃이 비어 있음 → cone 모드 폴백" >&2
  git -C "$REPO_DIR" sparse-checkout set kr/gamedata/excel cn/gamedata/excel \
    kr/gamedata/story/obt/rogue kr/gamedata/story/obt/roguelike \
    cn/gamedata/story/obt/rogue cn/gamedata/story/obt/roguelike
fi
echo "[sync] gamedata 완료: $(git -C "$REPO_DIR" rev-parse --short HEAD)"

# 에셋 경로 인덱스: 파일 목록만 받아 이미지 존재 여부 검사에 쓴다 (수 GB 레포를 받지 않음)
ASSET_DIR="$GAMEDATA_DIR/assets-index-repo"
if [[ ! -d "$ASSET_DIR/.git" ]]; then
  rm -rf "$ASSET_DIR"
  retry 4 git clone --filter=tree:0 --depth 1 --no-checkout --branch "$ASSETS_REF" "$ASSETS_REPO" "$ASSET_DIR"
else
  retry 4 git -C "$ASSET_DIR" fetch --depth 1 origin "$ASSETS_REF"
  git -C "$ASSET_DIR" update-ref HEAD FETCH_HEAD
fi
git -C "$ASSET_DIR" ls-tree -r --name-only HEAD -- \
  assets/torappu/dynamicassets/avg/images \
  assets/torappu/dynamicassets/avg/backgrounds \
  assets/torappu/dynamicassets/arts/ui/rogueliketopic \
  assets/torappu/dynamicassets/arts/ui/stage/mappreviews \
  > "$ASSET_INDEX"
echo "[sync] 에셋 인덱스: $(wc -l < "$ASSET_INDEX") 개 경로"
du -sh "$GAMEDATA_DIR"
