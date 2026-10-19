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
#   index_repo <이름> <레포 URL> <브랜치> <출력 파일> <ls-tree 경로...>
index_repo() {
  local name="$1" repo="$2" ref="$3" out="$4"; shift 4
  local dir="$GAMEDATA_DIR/assets-index-$name"
  if [[ ! -d "$dir/.git" ]]; then
    rm -rf "$dir"
    retry 4 git clone --filter=tree:0 --depth 1 --no-checkout --branch "$ref" "$repo" "$dir"
  else
    retry 4 git -C "$dir" fetch --depth 1 origin "$ref"
    git -C "$dir" update-ref HEAD FETCH_HEAD
  fi
  git -C "$dir" ls-tree -r --name-only HEAD -- "$@" > "$out"
  echo "[sync] 에셋 인덱스 $name: $(wc -l < "$out") 개 경로 ($(git -C "$dir" log -1 --format=%cs))"
}
# 기존 clone 디렉터리 이름 호환 (assets-index-repo → assets-index-aa)
[[ -d "$GAMEDATA_DIR/assets-index-repo/.git" && ! -d "$GAMEDATA_DIR/assets-index-aa" ]] && mv "$GAMEDATA_DIR/assets-index-repo" "$GAMEDATA_DIR/assets-index-aa"

# 1) ArknightsAssets: 노드 UI 등. 2025-04 이후 갱신 없음
index_repo aa "$ASSETS_REPO" "$ASSETS_REF" "$ASSET_INDEX" \
  assets/torappu/dynamicassets/avg/images \
  assets/torappu/dynamicassets/avg/backgrounds \
  assets/torappu/dynamicassets/arts/ui/rogueliketopic \
  assets/torappu/dynamicassets/arts/ui/stage/mappreviews
# 2) akgcc/arkdata: 같은 경로 구조, 최신 삽화·아이템 아이콘
index_repo akgcc "${ASSETS2_REPO:-https://github.com/akgcc/arkdata}" "${ASSETS2_REF:-main}" "$GAMEDATA_DIR/asset-index-akgcc.txt" \
  assets/torappu/dynamicassets/avg/images \
  assets/torappu/dynamicassets/avg/backgrounds \
  assets/torappu/dynamicassets/arts/ui/rogueliketopic
# 3) fexli/ArknightsResource: 맵 프리뷰·소장품 아이콘 (평탄한 폴더)
index_repo fexli "${ASSETS3_REPO:-https://github.com/fexli/ArknightsResource}" "${ASSETS3_REF:-main}" "$GAMEDATA_DIR/asset-index-fexli.txt" \
  mapreview rogueitem
du -sh "$GAMEDATA_DIR"
