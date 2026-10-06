/**
 * src/lib/assets.mjs — 이미지 에셋 URL 헬퍼.
 *
 * 이미지는 저장소에 넣지 않고 ArknightsAssets/ArknightsAssets 의 raw 파일을 핫링크한다.
 * 존재 여부는 scripts/sync-data.sh 가 만든 gamedata/asset-index.txt 로 확인한다
 * (인덱스가 없으면 검증 없이 URL 을 돌려준다).
 */
import fs from 'node:fs';
import path from 'node:path';
import { gamedataDir } from './i18n.mjs';

export const ASSET_BASE =
  process.env.ASSET_BASE ??
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets';

let index = null; // Set<상대 경로> | false(인덱스 없음)
function loadIndex() {
  if (index !== null) return index;
  const file = path.join(gamedataDir(), 'asset-index.txt');
  if (!fs.existsSync(file)) {
    index = false;
    return index;
  }
  index = new Set(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((p) => p.trim().replace(/^assets\/torappu\/dynamicassets\//, '')),
  );
  return index;
}

/** 인덱스가 있고 경로가 없으면 null, 아니면 URL */
export function assetUrl(relPath) {
  if (!relPath) return null;
  const idx = loadIndex();
  if (idx && !idx.has(relPath)) return null;
  return `${ASSET_BASE}/${relPath}`;
}

/** 인덱스 보유 여부 (빌드 로그용) */
export const hasAssetIndex = () => loadIndex() !== false;

const ROGUE_UI = 'arts/ui/rogueliketopic';

/** 이벤트 장면 삽화. avg/images → avg/backgrounds 순으로 시도 */
export function sceneImage(bgId) {
  if (!bgId) return null;
  const id = String(bgId).replace(/\.png$/i, '');
  return assetUrl(`avg/images/${id}.png`) ?? assetUrl(`avg/backgrounds/${id}.png`);
}

/** 유물·아이템 아이콘 */
export const itemIcon = (iconId) => (iconId ? assetUrl(`${ROGUE_UI}/itempic/${iconId}.png`) : null);

/** 선택지 기능 아이콘 (choicepic). `initial_reward_gold` 처럼 접두사가 붙은 변형은 기본형으로 폴백 */
export function choiceIcon(funcIconId) {
  if (!funcIconId) return null;
  const direct = assetUrl(`${ROGUE_UI}/choicepic/${funcIconId}.png`);
  if (direct) return direct;
  const stripped = String(funcIconId)
    .replace(/^initial_reward_/, '')
    .replace(/^(stashed_|sacrifice_|candle_)/, '')
    .replace(/_(drop|ap|zone)$/, '');
  if (stripped !== funcIconId) return assetUrl(`${ROGUE_UI}/choicepic/${stripped}.png`);
  return null;
}

/** 노드 종류 태그 아이콘 (dungeon/img_tag_*) */
export const nodeTagIcon = (tag) => (tag ? assetUrl(`${ROGUE_UI}/dungeon/img_tag_${tag}.png`) : null);
/** 노드 활성 아이콘 (dungeon/img_*_active) */
export const nodeActiveIcon = (key) => (key ? assetUrl(`${ROGUE_UI}/dungeon/img_${key}_active.png`) : null);
/** dungeon 폴더의 임의 이미지 */
export const dungeonImage = (name) => (name ? assetUrl(`${ROGUE_UI}/dungeon/${name}.png`) : null);
/** 전투 스테이지 맵 프리뷰 (arts/ui/stage/mappreviews/<stageId>.png) */
export const stageMapPreview = (stageId) => (stageId ? assetUrl(`arts/ui/stage/mappreviews/${stageId}.png`) : null);
/** 희귀도 띠 */
export const rarityIcon = (n) => assetUrl(`${ROGUE_UI}/rarity/rarity_${n}.png`);
/** 외부 버프 아이콘 */
export const outerBuffIcon = (id) => (id ? assetUrl(`${ROGUE_UI}/outerbufficon/${id}.png`) : null);
/** 테마 키 비주얼 (pic_rogue_N_KV1) */
export const topicKv = (topicId, n = 1) => assetUrl(`avg/images/pic_${topicId}_KV${n}.png`);
/** AVG 배경 / CG */
export const avgBackground = (image) => (image ? assetUrl(`avg/backgrounds/${image}.png`) : null);
export const avgImage = (image) => (image ? assetUrl(`avg/images/${image}.png`) : null);
