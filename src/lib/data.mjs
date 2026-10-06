/**
 * src/lib/data.mjs — 가공된 src/data/*.json 로더 (빌드 타임 전용).
 * 파일이 없으면 `npm run prepare` 안내와 함께 실패한다.
 */
import fs from 'node:fs';
import path from 'node:path';

// Astro 빌드 시 dist/ 로 번들되므로 cwd(프로젝트 루트) 기준. DATA_DIR 로 재지정 가능
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'src', 'data');
const cache = new Map();

function loadJson(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const file = path.join(DATA_DIR, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`src/data/${rel} 이 없습니다. \`npm run prepare\` (= sync + process) 를 먼저 실행하세요.`);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache.set(rel, data);
  return data;
}

/** @returns {any} */
export const loadMeta = () => loadJson('meta.json');
/** @returns {any[]} */
export const loadTopics = () => loadJson('topics.json');
/** @returns {{ scenes: Record<string, any>, entries: string[], groups: any[] }} */
export const loadScenes = (topicId) => loadJson(`scenes/${topicId}.json`);
/** @returns {any[]} */
export const loadStages = (topicId) => loadJson(`stages/${topicId}.json`);
/** @returns {any[]} */
export const loadItems = (topicId) => loadJson(`items/${topicId}.json`);
/** @returns {Record<string, any>} id → 컷신(라인 포함) */
export const loadCutscenes = (topicId) => loadJson(`cutscenes/${topicId}.json`);
/** @returns {any[]} 전체 컷신 인덱스 (라인 없음) */
export const loadCutsceneIndex = () => loadJson('cutscenes-index.json');

export const topicById = (id) => loadTopics().find((t) => t.id === id) ?? null;

/** 기본 노출 테마: KR 테마 + 비공식 번역이 있는 CN 전용 테마 */
export const visibleTopics = () => loadTopics().filter((t) => !t.cnOnly || t.translated);

/** 선택지 type 라벨 */
export const CHOICE_TYPE_LABEL = {
  LEAVE: '떠나기',
  NEXT: '진행',
  NEXT_PROB: '진행 (확률)',
  TRADE: '교환',
  TRADE_PROB: '교환 (확률)',
  TRADE_PROB_SHOW: '교환 (확률)',
  SACRIFICE: '희생',
  SACRIFICE_TOTEM: '토템 희생',
  TELEPORT: '이동',
  EXPEDITION: '원정',
  EXPEDITION_ALL: '원정 (전원)',
  EXPEDITION_RETURN_ALL: '원정 복귀',
  WISH: '소원',
  WISH_ALL: '소원 (전원)',
  JUMP: '건너뛰기',
  JUMP_PROB: '건너뛰기 (확률)',
  GILD_COPPER: '주화 도금',
  GILD_COPPER_ALL: '주화 전부 도금',
  ITEM_REROLL: '다시 뽑기',
  ITEM_TOP_UP: '보충',
  USE_STASHED_TICKET: '모집권 사용',
  PACIFY_WRATH: '진정',
};

/** 아이템 type 라벨 */
export const ITEM_TYPE_LABEL = {
  RELIC: '소장품',
  BAND: '분대',
  CAPSULE: '캡슐',
  RECRUIT_TICKET: '모집권',
  UPGRADE_TICKET: '승급권',
  CUSTOM_TICKET: '특수 모집권',
  FRAGMENT: '구상',
  TOTEM: '토템',
  TOTEM_EFFECT: '토템 효과',
  WRATH: '분노',
  COPPER: '주화',
  COPPER_BUFF: '주화 효과',
  ACTIVE_TOOL: '도구',
  EXPLORE_TOOL: '탐험 도구',
  DICE_TYPE: '주사위',
  DISASTER_TYPE: '재앙',
  FEATURE: '특성',
  GOLD: '화폐',
  HP: '목표 HP',
  HPMAX: '최대 목표 HP',
  POPULATION: '편성 인원',
  SQUAD_CAPACITY: '분대 정원',
  SHIELD: '방어',
  EXP: '경험치',
  KEY_POINT: '열쇠',
  VISION: '시야',
  SAN_POINT: '이성',
  DICE_POINT: '주사위 포인트',
  PILL: '환약',
  BIGPILL: '큰 환약',
  LOCKED_TREASURE: '잠긴 보물',
  CHAOS: '혼돈',
  CHAOS_PURIFY: '혼돈 정화',
  CHAOS_LEVEL: '혼돈 단계',
  MAX_WEIGHT: '적재량',
  DISASTER: '재앙',
  ABSTRACT_DISASTER: '추상 재앙',
  DIVINATION_KIT: '점술 도구',
  SPECIAL_ZONE_AP: '특수 구역 행동력',
  COPPER_DRAW_NUM: '주화 뽑기 횟수',
  STASH_RECRUIT_LIMIT: '예비 모집 한도',
};

export const RARITY_LABEL = { NONE: '-', NORMAL: '일반', RARE: '희귀', SUPER_RARE: '초희귀', BORN: '초기' };
export const RARITY_LEVEL = { NONE: 0, NORMAL: 1, RARE: 2, SUPER_RARE: 3, BORN: 1 };

export const CUTSCENE_KIND_LABEL = {
  entry: '진입 컷신',
  ending: '엔딩 컷신',
  endbook: '결말 기록',
  monthrecord: '월간 분대 기록',
  challenge: '도전 기록',
  tutorial: '전투 중 대사',
  ref: '소개 영상 대본',
  other: '기타',
};
