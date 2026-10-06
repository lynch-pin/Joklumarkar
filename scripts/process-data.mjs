#!/usr/bin/env node
/**
 * scripts/process-data.mjs — roguelike_topic_table.json + AVG 스크립트 → src/data/*.json
 *
 * 페이지는 gamedata/ 를 직접 읽지 않고 여기서 만든 산출물만 읽는다.
 *
 *   src/data/meta.json              생성 시각, 데이터 커밋, 테마별 통계·분류 결과
 *   src/data/topics.json            테마 / 구역 / 노드 종류 / 엔딩 / 난이도 / 분대 (장면 본문 제외)
 *   src/data/scenes/<topic>.json    이벤트 장면 + 선택지 트리 (테마별로 쪼갬 — rogue_5 가 전체의 절반)
 *   src/data/stages/<topic>.json    전투 노드
 *   src/data/items/<topic>.json     유물·수집품
 *   src/data/cutscenes/<topic>.json AVG 컷신 (파싱된 라인 포함)
 *   src/data/cutscenes-index.json   컷신 인덱스 (라인 없음)
 *   src/data/search.json            장면 검색 인덱스
 *
 * 구조 복원 규칙(BRIEF 섹션 3):
 *   (a) 장면 → 선택지: choice_<X>_<n> 의 부모는 scene_<X>_enter 또는 scene_<X>
 *   (b) 선택지 → 결과 장면: nextSceneId
 *   (c) 진입 장면 = 어떤 선택지의 nextSceneId 로도 지목되지 않는 장면
 *   (d) 구역 → 노드 종류: rollNodeData (없으면 nodeTypeData 전체)
 *   (e) 장면 → 노드 종류: overrides → endingDetailList → 접두사 규칙 → INCIDENT(미분류)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { LOCALES, PRIMARY, loadExcelAll, storyRoot, gamedataRoot, readStory } from '../src/lib/i18n.mjs';
import {
  sceneImage,
  itemIcon,
  choiceIcon,
  nodeTagIcon,
  nodeActiveIcon,
  dungeonImage,
  topicKv,
  avgImage,
  rarityIcon,
  hasAssetIndex,
  ASSET_BASE,
} from '../src/lib/assets.mjs';
import { richTextToHtml, stripRichText, parseStoryWithMeta } from '../src/lib/story-parser.mjs';
import { NODE_ICON, NODE_PSEUDO } from '../src/lib/themes.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src', 'data');
const OVERRIDES = path.join(ROOT, 'overrides');

const log = (...a) => console.log('[process]', ...a);
const warn = (...a) => console.warn('[process] ⚠', ...a);

function readJson(file, fallback = {}) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}
function writeJson(rel, data) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
  const kb = Math.round(fs.statSync(file).size / 1024);
  log(`쓰기 ${rel} (${kb} KB)`);
}
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true });
/** CN 테이블은 일부 목록이 객체(dict)로 들어 있어 배열/객체 모두 배열로 */
const asList = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
const html = (t) => richTextToHtml(t ?? '');
const plain = (t) => stripRichText(t ?? '').trim();

// ---------------------------------------------------------------------------
// 장면 id → 접두사, 접두사 → 노드 종류 규칙
// ---------------------------------------------------------------------------

/** scene_ro5_portal0201a_2 → 'portal', scene_rest_enter → 'rest', scene_ro2_2_enter → '' */
export function scenePrefix(sceneId) {
  const base = String(sceneId)
    .replace(/^scene_(ro\d_)?/, '')
    .replace(/_(enter|\d+)$/, '');
  return base.replace(/\d.*$/, '').replace(/_+$/, '');
}

/**
 * 접두사 → 노드 종류 후보 목록 (앞에서부터 그 테마에 존재하는 종류를 고른다).
 * 테마에 없는 종류뿐이면 null 반환 → 미분류.
 */
const PREFIX_RULES = [
  [/^startbuff$/, ['START']],
  [/^(fin|end|final)$/, ['ENDING']],
  [/^(boss|bossa|bossb|bossc|bosslokk|portalboss)$/, ['BATTLE_BOSS']],
  [/^(rest|camp|spring)$/, ['REST']],
  [/^ent$/, ['ENTERTAINMENT']],
  [/^sacrifice$/, ['SACRIFICE']],
  [/^wish$/, ['WISH']],
  [/^(expedition|exped|ex|scout|up)$/, ['EXPEDITION']],
  [/^(portal|eportal|nportal|teleport|portalsample|portalcopper)$/, ['PORTAL']],
  [/^(heaven|sky)$/, ['SPECIAL_ZONE', 'PORTAL']],
  [/^(duel|sala|candle)$/, ['DUEL']],
  [/^(trade|exchange|market|marketsp|shop|chest)$/, ['SHOP', 'BATTLE_SHOP', 'SCRAP_SHOP']],
  [/^(gild|copper)$/, ['ALCHEMY']],
  [/^(treasure|pick|relic)$/, ['TREASURE', 'INCIDENT']],
  [/^(ticket)$/, ['STASHED_RECRUIT', 'INCIDENT']],
  [/^(rec|recruit|hire|toband)$/, ['EMPLOY', 'INCIDENT']],
  [/^(task|taskreward)$/, ['MISSION', 'INCIDENT']],
  [/^(story|month)$/, ['STORY', 'INCIDENT']],
  [/^(evacuate)$/, ['EVACUATE']],
  [/^(bat)$/, ['BATTLE_NORMAL']],
  [/^(normal|side|res|incident)$/, ['INCIDENT']],
];

function classifyByPrefix(prefix, nodeTypeKeys) {
  for (const [re, candidates] of PREFIX_RULES) {
    if (!re.test(prefix)) continue;
    for (const c of candidates) {
      if (c === 'START' || c === 'ENDING' || nodeTypeKeys.has(c)) return c;
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 테마 로드 (KR 우선, 테마 단위로 CN 폴백)
// ---------------------------------------------------------------------------

const tables = loadExcelAll('roguelike_topic_table');
const sceneNodeOverrides = readJson(path.join(OVERRIDES, 'scene-node.json'));
const sceneChoiceOverrides = readJson(path.join(OVERRIDES, 'scene-choices.json'));

const topicIds = new Set();
for (const locale of LOCALES) for (const id of Object.keys(tables[locale]?.topics ?? {})) topicIds.add(id);

/** 테마 하나의 { topic, detail, locale } — KR 에 있으면 KR 전체, 없으면 CN 전체 (언어를 섞지 않는다) */
function pickTopic(id) {
  for (const locale of LOCALES) {
    const t = tables[locale];
    if (t?.topics?.[id] && t?.details?.[id]) {
      return { topic: t.topics[id], detail: t.details[id], locale, cnName: tables.zh_CN?.topics?.[id]?.name ?? null };
    }
  }
  return null;
}

const meta = {
  generatedAt: new Date().toISOString(),
  gamedataCommit: (() => {
    try {
      return execSync('git rev-parse --short HEAD', { cwd: gamedataRoot(), encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  })(),
  assetBase: ASSET_BASE,
  assetIndex: hasAssetIndex(),
  // 게임 UI 조각 (노드 배경·커넥터 등). 페이지가 gamedata/ 를 읽지 않도록 여기서 URL 로 확정한다.
  ui: {
    nodeBkg: dungeonImage('img_node_bkg'),
    nodeBkgBlur: dungeonImage('img_node_bkg_blur'),
    nodeBkgSelectable: dungeonImage('img_node_bkg_selectable'),
    connector: dungeonImage('img_connector') ?? dungeonImage('noalphasplit/img_connector'),
    connectorBlur: dungeonImage('img_connector_blur'),
    cursor: dungeonImage('img_cursor'),
    zoneDesc: dungeonImage('img_zone_desc'),
    hiddenLine: dungeonImage('hidden_line'),
    lockedLine: dungeonImage('locked_line'),
    fightIcon: dungeonImage('fight_icon'),
    next: dungeonImage('img_next'),
    focus: dungeonImage('img_focus'),
    rarity: [0, 1, 2, 3, 4, 5].map((i) => rarityIcon(i)),
    choiceLeave: choiceIcon('leave'),
    choiceUnknown: choiceIcon('unknown'),
  },
  topics: {},
};

const topicsOut = [];
const cutsceneIndex = [];
const searchIndex = [];

// 스토리 파일 전체 목록 (로케일별) — 컷신 수집용
function listStoryFiles(locale, relDir) {
  const dir = path.join(storyRoot(locale), relDir);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(txt|asc)$/.test(ent.name)) out.push(path.relative(storyRoot(locale), p).replace(/\\/g, '/').replace(/\.(txt|asc)$/, ''));
    }
  };
  walk(dir);
  return out.sort(naturalSort);
}

for (const topicId of [...topicIds].sort(naturalSort)) {
  const picked = pickTopic(topicId);
  if (!picked) continue;
  const { topic, detail, locale, cnName } = picked;
  const n = Number(topicId.replace(/\D/g, ''));
  const cnOnly = locale !== PRIMARY;
  log(`\n=== ${topicId} ${topic.name} (${locale}${cnOnly ? ', CN 전용' : ''}) ===`);

  const nodeTypeData = detail.nodeTypeData ?? {};
  const nodeTypeKeys = new Set(Object.keys(nodeTypeData));
  const scenes = detail.choiceScenes ?? {};
  const choices = detail.choices ?? {};
  const items = detail.items ?? {};

  // ---- (a) 장면 → 선택지 --------------------------------------------------
  const sceneChoices = new Map(); // sceneId → choiceId[]
  const unmatched = [];
  const overrideChoices = sceneChoiceOverrides[topicId] ?? {};
  const overriddenChoiceIds = new Set(Object.values(overrideChoices).flat());
  for (const [sceneId, ids] of Object.entries(overrideChoices)) {
    if (!scenes[sceneId]) warn(`scene-choices.json: ${topicId}/${sceneId} 장면 없음`);
    else sceneChoices.set(sceneId, [...ids]);
  }
  for (const choiceId of Object.keys(choices)) {
    if (choiceId === 'choice_leave' || overriddenChoiceIds.has(choiceId)) continue;
    if (!choiceId.startsWith('choice_')) {
      unmatched.push(choiceId);
      continue;
    }
    const base = choiceId.replace(/^choice_/, '').replace(/_\d+$/, '');
    const parent = scenes[`scene_${base}_enter`] ? `scene_${base}_enter` : scenes[`scene_${base}`] ? `scene_${base}` : null;
    if (!parent) {
      unmatched.push(choiceId);
      continue;
    }
    if (!sceneChoices.has(parent)) sceneChoices.set(parent, []);
    sceneChoices.get(parent).push(choiceId);
  }
  // 표시 순서는 id 끝 숫자 순
  for (const ids of sceneChoices.values()) ids.sort(naturalSort);
  if (unmatched.length) warn(`부모 장면 미매칭 ${unmatched.length}건 → overrides/scene-choices.json 으로 보정:`, unmatched.slice(0, 10).join(', '));

  // ---- (b) nextSceneId 검증, (c) 진입 장면 -------------------------------
  const reached = new Set();
  let dangling = 0;
  for (const c of Object.values(choices)) {
    if (!c.nextSceneId) continue;
    if (scenes[c.nextSceneId]) reached.add(c.nextSceneId);
    else dangling++;
  }
  if (dangling) warn(`존재하지 않는 nextSceneId ${dangling}건`);

  // ---- (e) 장면 → 노드 종류 ----------------------------------------------
  const nodeOverride = sceneNodeOverrides[topicId] ?? {};
  const edlType = new Map();
  for (const e of asList(detail.endingDetailList)) {
    if (e.choiceSceneId && e.eventType && e.eventType !== 'NONE') edlType.set(e.choiceSceneId, e.eventType);
  }
  const classify = (sceneId) => {
    const prefix = scenePrefix(sceneId);
    if (nodeOverride[sceneId]) return { type: nodeOverride[sceneId], source: 'override' };
    if (nodeOverride[`prefix:${prefix}`]) return { type: nodeOverride[`prefix:${prefix}`], source: 'override' };
    if (edlType.has(sceneId) && (nodeTypeKeys.has(edlType.get(sceneId)) || edlType.get(sceneId) in NODE_PSEUDO)) {
      return { type: edlType.get(sceneId), source: 'data' };
    }
    const byPrefix = classifyByPrefix(prefix, nodeTypeKeys);
    if (byPrefix) return { type: byPrefix, source: 'prefix' };
    return { type: 'INCIDENT', source: 'default' };
  };

  // 결과 장면은 자신을 가리키는 선택지의 부모(진입 장면)와 같은 종류로 맞춘다 — 트리 전체가 한 노드에서 벌어지므로.
  // 먼저 진입 장면을 분류하고, 결과 장면은 부모를 따라간다 (부모가 여럿이면 첫 번째).
  const parentOf = new Map(); // 결과 sceneId → 부모 sceneId
  for (const [sceneId, ids] of sceneChoices) {
    for (const cid of ids) {
      const next = choices[cid]?.nextSceneId;
      if (next && scenes[next] && !parentOf.has(next) && next !== sceneId) parentOf.set(next, sceneId);
    }
  }
  const rootOf = (sceneId) => {
    let cur = sceneId;
    const seen = new Set();
    while (parentOf.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = parentOf.get(cur);
    }
    return cur;
  };

  const classStats = { override: 0, data: 0, prefix: 0, default: 0, inherited: 0 };
  const unclassifiedPrefixes = new Map();
  const sceneOut = {};
  let imgFound = 0;
  let imgMissing = 0;
  const missingBg = new Set();

  for (const [sceneId, s] of Object.entries(scenes)) {
    const isEntry = !reached.has(sceneId);
    let cls;
    const root = rootOf(sceneId);
    if (root !== sceneId && !nodeOverride[sceneId]) {
      cls = { ...classify(root), inherited: true };
      classStats.inherited++;
    } else {
      cls = classify(sceneId);
      classStats[cls.source]++;
      if (cls.source === 'default') {
        const p = scenePrefix(sceneId) || '(없음)';
        unclassifiedPrefixes.set(p, (unclassifiedPrefixes.get(p) ?? 0) + 1);
      }
    }
    const image = sceneImage(s.background);
    if (s.background) {
      if (image) imgFound++;
      else {
        imgMissing++;
        missingBg.add(s.background);
      }
    }

    const choiceList = (sceneChoices.get(sceneId) ?? []).map((cid) => {
      const c = choices[cid];
      const dd = c.displayData ?? {};
      const item = dd.itemId ? items[dd.itemId] : null;
      return {
        id: cid,
        title: c.title ?? '',
        descHtml: html(c.description),
        lockedHtml: c.lockedCoverDesc ? html(c.lockedCoverDesc) : null,
        type: c.type,
        isLeave: c.type === 'LEAVE',
        isProb: /_PROB/.test(c.type ?? ''),
        icon: choiceIcon(dd.funcIconId ?? c.icon) ?? null,
        iconId: dd.funcIconId ?? c.icon ?? null,
        item: item ? { id: item.id, name: item.name, icon: itemIcon(item.iconId), rarity: item.rarity, type: item.type } : null,
        next: c.nextSceneId && scenes[c.nextSceneId] ? c.nextSceneId : null,
      };
    });

    const text = plain(s.description);
    sceneOut[sceneId] = {
      id: sceneId,
      title: s.title ?? '',
      html: html(s.description),
      image,
      imageId: s.background ?? null,
      nodeType: cls.type,
      nodeTypeSource: cls.inherited ? 'inherited' : cls.source,
      isEntry,
      parent: parentOf.get(sceneId) ?? null,
      prefix: scenePrefix(sceneId),
      choices: choiceList,
    };
    if (isEntry) {
      searchIndex.push({ t: topicId, id: sceneId, title: s.title ?? '', type: cls.type, text: text.slice(0, 160) });
    }
  }

  const entries = Object.keys(sceneOut)
    .filter((id) => sceneOut[id].isEntry)
    .sort(naturalSort);

  // 같은 제목·접두사의 진입 장면(rogue_5 '둥근 하늘 네모난 땅' 472개 등)은 한 묶음으로
  const groupMap = new Map();
  for (const id of entries) {
    const s = sceneOut[id];
    const key = `${s.nodeType}|${s.prefix}|${s.title}`;
    if (!groupMap.has(key)) groupMap.set(key, { key, title: s.title, prefix: s.prefix, nodeType: s.nodeType, ids: [] });
    groupMap.get(key).ids.push(id);
  }
  const groups = [...groupMap.values()];

  log(`장면 ${Object.keys(scenes).length} / 선택지 ${Object.keys(choices).length} / 진입 장면 ${entries.length} / 묶음 ${groups.length}`);
  log(
    `노드 종류 분류 — 수동 ${classStats.override}, 데이터 ${classStats.data}, 접두사 ${classStats.prefix}, 미분류(INCIDENT) ${classStats.default}, 결과 장면 상속 ${classStats.inherited}`,
  );
  if (unclassifiedPrefixes.size) {
    log(
      '  미분류 접두사:',
      [...unclassifiedPrefixes.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}(${c})`)
        .join(' '),
    );
  }
  log(`삽화 ${imgFound} 있음 / ${imgMissing} 없음${missingBg.size ? ` (${[...missingBg].slice(0, 5).join(', ')}${missingBg.size > 5 ? ' …' : ''})` : ''}`);

  // ---- 노드 종류 (nodeTypeData + 의사 종류) -------------------------------
  const nodeTypes = {};
  const sceneCountByType = {};
  const entryCountByType = {};
  for (const s of Object.values(sceneOut)) {
    sceneCountByType[s.nodeType] = (sceneCountByType[s.nodeType] ?? 0) + 1;
    if (s.isEntry) entryCountByType[s.nodeType] = (entryCountByType[s.nodeType] ?? 0) + 1;
  }
  const iconFor = (key) => {
    const def = NODE_ICON[key] ?? NODE_ICON.UNKNOWN;
    return {
      tag: nodeTagIcon(def.tag) ?? (def.dungeon ? dungeonImage(def.dungeon) : null) ?? choiceIcon(def.choice) ?? nodeTagIcon('unknown'),
      active: nodeActiveIcon(def.active) ?? null,
      // 타일 중앙 글리프: 활성 아이콘 → dungeon 이미지 → 선택지 아이콘(choicepic) 순
      glyph: nodeActiveIcon(def.active) ?? (def.dungeon ? dungeonImage(def.dungeon) : null) ?? choiceIcon(def.choice) ?? null,
      glyphKind: nodeActiveIcon(def.active) ? 'active' : def.dungeon && dungeonImage(def.dungeon) ? 'dungeon' : choiceIcon(def.choice) ? 'choice' : null,
    };
  };
  for (const [key, v] of Object.entries(nodeTypeData)) {
    nodeTypes[key] = { key, name: v.name, description: v.description ?? '', ...iconFor(key), sceneCount: sceneCountByType[key] ?? 0, entryCount: entryCountByType[key] ?? 0 };
  }
  for (const [key, v] of Object.entries(NODE_PSEUDO)) {
    if (sceneCountByType[key]) nodeTypes[key] = { key, ...v, ...iconFor(key), sceneCount: sceneCountByType[key], entryCount: entryCountByType[key] ?? 0, pseudo: true };
  }

  // ---- 구역 (d) ------------------------------------------------------------
  // 번호 구역(zone_N)이 본 구역. 그 외(포탈·변형·하늘 구역 등)는 이름별로 묶어 특수 구역으로 두되,
  // rollNodeData 가 있으면 노드 종류를 합쳐서 기록한다.
  const roll = detail.rollNodeData ?? {};
  const allZones = Object.values(detail.zones ?? {});
  const zoneNodeTypes = (z) => (roll[z.id] ? Object.keys(roll[z.id].groups ?? {}) : Object.keys(nodeTypeData));
  const toZone = (z) => ({
    id: z.id,
    name: z.name,
    description: z.description ?? '',
    endingDescription: z.endingDescription ?? '',
    buffDescription: z.buffDescription ?? null,
    isHidden: Boolean(z.isHiddenZone),
    nodeTypes: zoneNodeTypes(z),
    nodeTypesSource: roll[z.id] ? 'data' : 'all',
    ids: [z.id],
    count: 1,
    isSpecial: false,
  });
  const zones = allZones
    .filter((z) => /^zone_\d+$/.test(z.id))
    .sort((a, b) => naturalSort(a.id, b.id))
    .map(toZone);
  const specialMap = new Map();
  for (const z of allZones.filter((z) => !/^zone_\d+$/.test(z.id)).sort((a, b) => naturalSort(a.id, b.id))) {
    const key = z.name;
    if (!specialMap.has(key)) specialMap.set(key, { ...toZone(z), isSpecial: true, nodeTypes: [] });
    const g = specialMap.get(key);
    if (g.ids[0] !== z.id) {
      g.ids.push(z.id);
      g.count++;
    }
    if (roll[z.id]) for (const k of Object.keys(roll[z.id].groups ?? {})) if (!g.nodeTypes.includes(k)) g.nodeTypes.push(k);
    if (roll[z.id]) g.nodeTypesSource = 'data';
  }
  for (const g of specialMap.values()) if (!g.nodeTypes.length) g.nodeTypes = Object.keys(nodeTypeData);
  const specialZones = [...specialMap.values()];
  log(`구역 ${zones.length} + 특수 구역 ${allZones.length - zones.length}개 → ${specialZones.length}묶음, rollNodeData ${Object.keys(roll).length ? '있음' : '없음(전체 종류 공통)'}`);

  // ---- 엔딩 + 결말기록 -------------------------------------------------------
  const endbooks = detail.archiveComp?.endbook?.endbook ?? {};
  const endings = Object.values(detail.endings ?? {})
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || naturalSort(a.id, b.id))
    .map((e) => {
      const eb = Object.values(endbooks).find((b) => b.endingId === e.id) ?? null;
      return {
        id: e.id,
        name: e.name,
        desc: e.desc ?? '',
        image: avgImage(e.bgId),
        bgId: e.bgId,
        bossIconId: e.bossIconId ?? null,
        endbookId: eb?.endId ?? null,
        cutsceneId: eb?.avgId ? eb.avgId.toLowerCase().replace(/^obt\//, 'obt/') : null,
        records: (eb?.clientEndbookItemDatas ?? []).map((r) => ({
          id: r.endBookId,
          name: r.endbookName,
          unlockDesc: r.unlockDesc ?? '',
          cutsceneId: r.textId ? r.textId.toLowerCase() : null,
        })),
      };
    });
  const failEndings = Object.values(detail.failEndings ?? {}).map((e) => ({ id: e.id, name: e.name, desc: e.desc ?? '' }));

  // ---- 난이도 / 분대 / 월간 분대 --------------------------------------------
  const difficulties = asList(detail.difficulties)
    .slice()
    .sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0))
    .map((d) => ({ grade: d.grade, name: d.name, subName: d.subName ?? '', ruleDesc: d.ruleDesc ?? '', color: d.color ?? null, mode: d.modeDifficulty }));
  const bands = Object.values(items)
    .filter((i) => i.type === 'BAND')
    .map((i) => ({ id: i.id, name: i.name, usage: plain(i.usage), icon: itemIcon(i.iconId) }));
  const monthSquads = Object.values(detail.monthSquad ?? {})
    .sort((a, b) => naturalSort(a.id, b.id))
    .map((m) => ({ id: m.id, chatId: m.chatId ?? null, name: m.teamName, subName: m.teamSubName ?? m.teamFlavorDesc ?? '', desc: m.teamDes ?? '', color: m.teamColor ? `#${m.teamColor}` : null, month: m.teamMonth, year: m.teamYear }));

  // ---- 전투 노드 -----------------------------------------------------------
  const stages = Object.values(detail.stages ?? {})
    .sort((a, b) => naturalSort(a.id, b.id))
    .map((s) => ({
      id: s.id,
      code: (s.code ?? '').trim(),
      name: s.name,
      description: plain(s.description),
      eliteDesc: s.eliteDesc ? plain(s.eliteDesc) : null,
      isBoss: Boolean(s.isBoss),
      isElite: Boolean(s.isElite),
      difficulty: s.difficulty ?? null,
    }));

  // ---- 아이템 -------------------------------------------------------------
  let itemIconFound = 0;
  const itemsOut = Object.values(items)
    .sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0) || naturalSort(a.id, b.id))
    .map((i) => {
      const icon = itemIcon(i.iconId);
      if (icon) itemIconFound++;
      return {
        id: i.id,
        name: i.name,
        descHtml: i.description ? html(i.description) : null,
        usageHtml: i.usage ? html(i.usage) : null,
        icon,
        rarity: i.rarity ?? 'NONE',
        type: i.type,
        subType: i.subType && i.subType !== 'NONE' ? i.subType : null,
        unlockCondDesc: i.unlockCondDesc ?? null,
        canSacrifice: Boolean(i.canSacrifice),
      };
    });
  log(`전투 ${stages.length} / 아이템 ${itemsOut.length} (아이콘 ${itemIconFound} 있음) / 엔딩 ${endings.length}`);

  // ---- 컷신 (AVG 스크립트) --------------------------------------------------
  // 제목 조회표: textId 경로(소문자) → 메타
  const titleByPath = new Map();
  for (const e of endings) {
    if (e.cutsceneId) titleByPath.set(e.cutsceneId, { kind: 'ending', title: e.name, subtitle: '엔딩 컷신', endingId: e.id, sort: 20 });
    e.records.forEach((r, i) => {
      if (r.cutsceneId) titleByPath.set(r.cutsceneId, { kind: 'endbook', title: r.name, subtitle: `결말 기록 · ${e.name}`, endingId: e.id, unlockDesc: r.unlockDesc, sort: 30 + i });
    });
  }
  const chats = detail.archiveComp?.chat?.chat ?? {};
  for (const [chatId, c] of Object.entries(chats)) {
    const squad = monthSquads.find((m) => m.chatId === chatId);
    (c.chatItemList ?? []).forEach((it, i) => {
      if (!it.chatStoryId) return;
      const zone = allZones.find((z) => z.id === it.chatZoneId);
      titleByPath.set(it.chatStoryId.toLowerCase(), {
        kind: 'monthrecord',
        title: squad ? `${squad.name} ${i + 1}` : `${chatId} ${i + 1}`,
        subtitle: `${squad ? `${squad.year}.${squad.month} 월간 분대 · ` : ''}${it.floor ? `${it.floor}층` : ''}${zone ? ` ${zone.name}` : ''}`,
        desc: it.chatDesc ?? '',
        squadId: squad?.id ?? null,
        sort: 40 + i,
      });
    });
  }
  for (const ch of Object.values(detail.challenges ?? {})) {
    // 도전 모드 AVG: challengeStoryId 류 필드가 있으면 연결
    for (const [k, v] of Object.entries(ch)) {
      if (typeof v === 'string' && /obt\/rogue/i.test(v)) titleByPath.set(v.toLowerCase(), { kind: 'challenge', title: ch.challengeName ?? k, subtitle: `도전 · ${ch.challengeGroupName ?? ''}`, sort: 50 });
    }
  }

  const cutscenes = {};
  const storyRels = new Set();
  for (const locale of LOCALES) {
    for (const rel of listStoryFiles(locale, `obt/roguelike/ro${n}`)) storyRels.add(rel);
    for (const rel of listStoryFiles(locale, `obt/rogue/${topicId}`)) storyRels.add(rel);
    if (n === 1) for (const rel of listStoryFiles(locale, 'obt/rogue')) if (/^obt\/rogue\/month_chat_rogue_1_/.test(rel)) storyRels.add(rel);
  }
  for (const rel of [...storyRels].sort(naturalSort)) {
    const found = readStory(rel);
    if (!found) continue;
    const parsed = parseStoryWithMeta(found.text);
    const file = path.basename(rel);
    const metaHit = titleByPath.get(rel.toLowerCase());
    let kind = metaHit?.kind ?? 'other';
    let title = metaHit?.title ?? null;
    let subtitle = metaHit?.subtitle ?? '';
    let sort = metaHit?.sort ?? 90;
    if (!metaHit) {
      if (/_entry$/.test(file)) {
        kind = 'entry';
        title = `${topic.name} — 진입`;
        subtitle = '탐험 시작 컷신';
        sort = 10;
      } else if (/_ending_(\d+)$/.test(file)) {
        kind = 'ending';
        const k = file.match(/_ending_(\d+)$/)[1];
        title = endings[Number(k) - 1]?.name ?? `엔딩 ${k}`;
        sort = 20 + Number(k);
      } else if (/^tutorial_/.test(file)) {
        kind = 'tutorial';
        title = `전투 중 대사 ${file.replace(/^tutorial_rogue\d_/, '')}`;
        sort = 60;
      } else if (/^ref_/.test(file)) {
        kind = 'ref';
        title = /dlc(\d)/.test(file) ? `소개 영상 대본 (DLC ${file.match(/dlc(\d)/)[1]})` : '소개 영상 대본';
        sort = 70;
      } else if (/endbook/i.test(rel)) {
        kind = 'endbook';
        title = file;
        sort = 35;
      } else if (/monthrecord|month_chat/i.test(rel)) {
        kind = 'monthrecord';
        title = file;
        sort = 45;
      } else if (/challenge/i.test(rel)) {
        kind = 'challenge';
        const k = file.match(/_(\d+)$/)?.[1] ?? '';
        title = `도전 기록 ${k}`;
        subtitle = '도전 모드 중 발견하는 기록';
        sort = 50 + Number(k || 0);
      } else title = parsed.header || file;
    }
    const id = rel.toLowerCase().replace(/^obt\//, '').replace(/[^a-z0-9]+/g, '-');
    const lines = parsed.lines.filter((l) => l.type !== 'header');
    const chars = lines.reduce((a, l) => a + (l.text?.length ?? 0), 0);
    const entry = { id, topicId, kind, title, subtitle, desc: metaHit?.desc ?? null, unlockDesc: metaHit?.unlockDesc ?? null, endingId: metaHit?.endingId ?? null, squadId: metaHit?.squadId ?? null, rel, locale: found.locale, sort, lineCount: lines.length, chars };
    cutscenes[id] = { ...entry, lines };
    cutsceneIndex.push(entry);
  }
  const kindCount = {};
  for (const c of Object.values(cutscenes)) kindCount[c.kind] = (kindCount[c.kind] ?? 0) + 1;
  log(`컷신 ${Object.keys(cutscenes).length}편`, JSON.stringify(kindCount));

  // ---- 산출 ---------------------------------------------------------------
  const counts = {
    zones: zones.length,
    zonesAll: allZones.length,
    nodeTypes: Object.keys(nodeTypeData).length,
    scenes: Object.keys(scenes).length,
    entryScenes: entries.length,
    groups: groups.length,
    choices: Object.keys(choices).length,
    stages: stages.length,
    endings: endings.length,
    items: itemsOut.length,
    cutscenes: Object.keys(cutscenes).length,
    imagesFound: imgFound,
    imagesMissing: imgMissing,
  };
  const kv = topicKv(topicId, 1);
  topicsOut.push({
    id: topicId,
    index: n,
    name: topic.name,
    nameCn: cnName,
    locale,
    cnOnly,
    lineText: topic.lineText ?? '',
    kv,
    hasImages: imgFound > 0,
    zones,
    specialZones,
    nodeTypes,
    endings,
    failEndings,
    difficulties,
    bands,
    monthSquads,
    counts,
    classification: classStats,
  });
  meta.topics[topicId] = { name: topic.name, locale, counts, classification: classStats, unmatchedChoices: unmatched.length, danglingNext: dangling };

  writeJson(`scenes/${topicId}.json`, { scenes: sceneOut, entries, groups });
  writeJson(`stages/${topicId}.json`, stages);
  writeJson(`items/${topicId}.json`, itemsOut);
  writeJson(`cutscenes/${topicId}.json`, cutscenes);
}

meta.counts = {
  topics: topicsOut.length,
  scenes: topicsOut.reduce((a, t) => a + t.counts.scenes, 0),
  entryScenes: topicsOut.reduce((a, t) => a + t.counts.entryScenes, 0),
  choices: topicsOut.reduce((a, t) => a + t.counts.choices, 0),
  stages: topicsOut.reduce((a, t) => a + t.counts.stages, 0),
  items: topicsOut.reduce((a, t) => a + t.counts.items, 0),
  endings: topicsOut.reduce((a, t) => a + t.counts.endings, 0),
  cutscenes: cutsceneIndex.length,
};

writeJson('topics.json', topicsOut);
writeJson('cutscenes-index.json', cutsceneIndex);
writeJson('search.json', searchIndex);
writeJson('meta.json', meta);
log('\n완료', JSON.stringify(meta.counts));
