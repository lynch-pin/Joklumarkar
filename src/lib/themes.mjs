/**
 * src/lib/themes.mjs — 테마(통합전략 시즌)별 비주얼 정의.
 *
 * 게임 데이터에는 UI 색상 정보가 없으므로, 각 시즌의 무대·모티프에 맞춰 팔레트와 장식 키워드를 정의한다.
 *   rogue_1  크림슨 솔리테어 — 안개 속 고성·극장, 진홍 벨벳과 금박, 카드
 *   rogue_2  카이룰라 아버   — 이베리아 심해, 짙은 남색과 청록 빛, 시본
 *   rogue_3  은빛 서리 끝자락 — 사미 설원, 은빛·얼음빛, 폴다탈(나무 껍질 룬)
 *   rogue_4  영겁 기담       — 카즈델 영혼 용광로, 숯빛과 잉걸불의 주황
 *   rogue_5  기이한 계원     — 염국 산수 정원, 주홍 칠·옥빛·금박
 *   rogue_6  黑流树海 (CN)   — 검은 물길의 수해, 이끼빛
 * 실제 CSS 변수는 src/styles/global.css 의 [data-topic] 블록에서 선언하며, 여기서는 메타만 둔다.
 */
export const THEMES = {
  rogue_1: {
    short: '크림슨 솔리테어',
    motif: '극장 · 고성 · 카드',
    accent: '#c8273a',
    accent2: '#d9ad4b',
    ornament: '♠',
    heroGradient: 'linear-gradient(135deg, #2a0a10 0%, #5a1020 55%, #1a0a0c 100%)',
  },
  rogue_2: {
    short: '카이룰라 아버',
    motif: '심해 · 조류 · 시본',
    accent: '#22b8c9',
    accent2: '#5b8fe0',
    ornament: '≋',
    heroGradient: 'linear-gradient(160deg, #04121c 0%, #0b3650 55%, #03101a 100%)',
  },
  rogue_3: {
    short: '은빛 서리 끝자락',
    motif: '설원 · 서리 · 폴다탈',
    accent: '#9fd6ea',
    accent2: '#d6dee6',
    ornament: '❄',
    heroGradient: 'linear-gradient(160deg, #0c1a24 0%, #2a4a5e 55%, #0b141b 100%)',
  },
  rogue_4: {
    short: '영겁 기담',
    motif: '용광로 · 잉걸불 · 구상',
    accent: '#ff7a2f',
    accent2: '#ffb347',
    ornament: '✦',
    heroGradient: 'linear-gradient(160deg, #140e0b 0%, #4a2412 55%, #120c0a 100%)',
  },
  rogue_5: {
    short: '기이한 계원',
    motif: '산수 · 주홍 칠 · 옥',
    accent: '#d6402f',
    accent2: '#3a9a78',
    ornament: '卍',
    heroGradient: 'linear-gradient(160deg, #1a0e0c 0%, #5c1e18 50%, #12302a 100%)',
  },
  rogue_6: {
    short: '흑류수해',
    motif: '볼리바르 · 수해 · 검은 물길',
    accent: '#6fbf73',
    accent2: '#3f8a5a',
    ornament: '❦',
    heroGradient: 'linear-gradient(160deg, #0a110d 0%, #1d3a28 55%, #080d0a 100%)',
  },
};

export const themeOf = (topicId) => THEMES[topicId] ?? THEMES.rogue_4;

/**
 * 노드 종류 → 게임 UI 태그 아이콘(dungeon/img_tag_*) / 활성 아이콘(img_*_active) / 폴백(choicepic) 키.
 * 데이터에 없는 종류는 가장 가까운 아이콘으로 대체한다.
 */
export const NODE_ICON = {
  BATTLE_NORMAL: { tag: 'battle', active: 'battle' },
  BATTLE_ELITE: { tag: 'elite', active: 'elite' },
  BATTLE_BOSS: { tag: 'boss', active: 'boss' },
  BATTLE_SAVAGE: { tag: 'elite', active: 'elite' },
  FINAL: { tag: 'final_boss', active: 'boss' },
  REST: { tag: 'rest', active: 'rest' },
  INCIDENT: { tag: 'incident', active: 'incident' },
  TREASURE: { tag: 'treasure', active: 'treasure' },
  ENTERTAINMENT: { tag: 'entertainment', active: 'entertainment' },
  UNKNOWN: { tag: 'unknown', active: null, choice: 'unknown' },
  SHOP: { tag: 'shop', active: 'shop' },
  BATTLE_SHOP: { tag: 'shop', active: 'shop' },
  SCRAP_SHOP: { tag: 'shop', active: 'shop' },
  SACRIFICE: { tag: 'sacafri', active: null, choice: 'sacrifice' },
  EXPEDITION: { tag: 'exped', active: null, choice: 'adventure' },
  PORTAL: { tag: 'port', active: null, choice: 'teleport' },
  SPECIAL_ZONE: { tag: 'port_2', active: null, choice: 'teleport' },
  ALCHEMY: { tag: 'alchemy', active: null, choice: 'chaos_purify' },
  DUEL: { tag: 'duel', active: null, choice: 'duel' },
  WISH: { tag: null, active: null, choice: 'vision' },
  MISSION: { tag: null, active: null, choice: 'adventure' },
  STORY: { tag: null, active: null, dungeon: 'img_treasure_story' },
  STORY_HIDDEN: { tag: null, active: null, dungeon: 'img_hidden' },
  STASHED_RECRUIT: { tag: null, active: null, choice: 'recruit' },
  DOOR: { tag: null, active: null, choice: 'key' },
  EVACUATE: { tag: null, active: null, choice: 'leave' },
  EMPLOY: { tag: null, active: null, choice: 'member' },
  LIGHT: { tag: null, active: null, choice: 'vision' },
  EMPTY: { tag: 'unknown', active: null, choice: 'unknown' },
  // 가공 단계에서 추가하는 의사 종류
  START: { tag: null, active: null, choice: 'adventure' },
  ENDING: { tag: 'final_boss', active: 'boss' },
};

/** 노드 종류 한국어 폴백 이름 (nodeTypeData 에 없는 의사 종류용) */
export const NODE_PSEUDO = {
  START: { name: '탐험 시작', description: '탐험을 시작할 때 한 번 보게 되는 장면.' },
  ENDING: { name: '결말', description: '최종 구역·엔딩 직전에 나오는 장면.' },
};
