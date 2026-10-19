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

/**
 * 이미지 소스 목록 (앞에서부터 찾는다).
 *  - aa     ArknightsAssets: 노드 UI(dungeon/choicepic) 등 옛 에셋. 2025-04 이후 갱신이 멈춰 IS5·IS6 이미지는 없다
 *  - akgcc  akgcc/arkdata: 같은 torappu 경로 구조. 삽화(avg/images)·배경·아이템 아이콘(itempic)을 최신까지 보유
 *  - fexli  fexli/ArknightsResource: 평탄한 폴더 구조. 맵 프리뷰(mapreview/)·소장품 아이콘(rogueitem/)
 * 각 소스는 scripts/sync-data.sh 가 만든 경로 인덱스(gamedata/<index>)로 존재 여부를 확인한다.
 * 인덱스 조회는 대소문자를 무시한다 (pic_rogue_6_KV1 vs pic_rogue_6_kv1).
 */
const STRIP = 'assets/torappu/dynamicassets/';
const SOURCES = [
  { name: 'aa', base: ASSET_BASE, index: 'asset-index.txt', strip: STRIP },
  { name: 'akgcc', base: 'https://raw.githubusercontent.com/akgcc/arkdata/main/assets/torappu/dynamicassets', index: 'asset-index-akgcc.txt', strip: STRIP },
  {
    name: 'fexli',
    base: 'https://raw.githubusercontent.com/fexli/ArknightsResource/main',
    index: 'asset-index-fexli.txt',
    strip: '',
    // torappu 상대 경로 → fexli 폴더 이름
    rewrite: (rel) => {
      if (rel.startsWith('arts/ui/stage/mappreviews/')) return rel.replace('arts/ui/stage/mappreviews/', 'mapreview/');
      if (rel.startsWith('arts/ui/rogueliketopic/itempic/')) return rel.replace('arts/ui/rogueliketopic/itempic/', 'rogueitem/');
      return null;
    },
  },
];

const indexes = new Map(); // name → Map<소문자 경로, 실제 경로> | false(인덱스 없음)
function indexOf(src) {
  if (indexes.has(src.name)) return indexes.get(src.name);
  const file = path.join(gamedataDir(), src.index);
  let idx = false;
  if (fs.existsSync(file)) {
    idx = new Map();
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const p = line.trim();
      if (!p) continue;
      const rel = src.strip && p.startsWith(src.strip) ? p.slice(src.strip.length) : p;
      idx.set(rel.toLowerCase(), rel);
    }
  }
  indexes.set(src.name, idx);
  return idx;
}

/** 어느 소스든 경로가 있으면 그 URL, 아무 데도 없으면 null. 인덱스가 하나도 없으면 검증 없이 기본 소스 URL */
export function assetUrl(relPath) {
  if (!relPath) return null;
  let anyIndex = false;
  for (const src of SOURCES) {
    const idx = indexOf(src);
    if (!idx) continue;
    anyIndex = true;
    const rel = src.rewrite ? src.rewrite(relPath) : relPath;
    if (!rel) continue;
    const hit = idx.get(rel.toLowerCase());
    if (hit) return `${src.base}/${hit}`;
  }
  return anyIndex ? null : `${ASSET_BASE}/${relPath}`;
}

/** 인덱스 보유 여부 (빌드 로그용) */
export const hasAssetIndex = () => SOURCES.some((s) => indexOf(s) !== false);
/** 소스별 인덱스 크기 (빌드 로그용) */
export const assetIndexSizes = () => Object.fromEntries(SOURCES.map((s) => [s.name, indexOf(s) ? indexOf(s).size : 0]));

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
