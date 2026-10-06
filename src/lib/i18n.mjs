/**
 * src/lib/i18n.mjs
 * 게임 데이터 로케일 처리 (빌드 타임 전용, fs 로 gamedata/ 원본을 직접 읽는다).
 *
 *   - ko_KR(한국 서버) 우선, 없으면 zh_CN(중국 서버) 폴백.
 *   - ArknightsAssets/ArknightsGamedata 의 폴더명은 `kr/`, `cn/`.
 *   - scripts/sync-data.sh 가 `gamedata/repo/` 에 sparse-checkout 으로 받아 둔다.
 *
 * Astro 빌드 시 이 모듈은 dist/ 아래로 번들되므로 import.meta.url 이 아니라 cwd(프로젝트 루트) 기준으로 경로를 잡는다.
 */
import fs from 'node:fs';
import path from 'node:path';

/** 로케일 우선순위. 첫 번째가 주 언어. */
export const LOCALES = /** @type {const} */ (['ko_KR', 'zh_CN']);
export const PRIMARY = LOCALES[0];

/** 로케일 → gamedata 저장소 폴더명 */
export const LANG_DIRS = { ko_KR: 'kr', zh_CN: 'cn' };

/** 표시용 라벨 */
export const LOCALE_LABELS = { ko_KR: 'KR 서버', zh_CN: 'CN 서버' };

const PROJECT_ROOT = process.cwd();

/** gamedata 작업 폴더 (저장소 clone + 에셋 인덱스). GAMEDATA_DIR 로 재지정 가능 */
export function gamedataDir() {
  return process.env.GAMEDATA_DIR ? path.resolve(process.env.GAMEDATA_DIR) : path.join(PROJECT_ROOT, 'gamedata');
}

/** ArknightsGamedata clone 루트 (…/gamedata/repo) */
export function gamedataRoot() {
  return path.join(gamedataDir(), 'repo');
}

/** 로케일별 데이터 루트 (…/repo/kr/gamedata) */
export function langRoot(locale) {
  const dir = LANG_DIRS[locale];
  if (!dir) throw new Error(`알 수 없는 로케일: ${locale}`);
  return path.join(gamedataRoot(), dir, 'gamedata');
}

export function excelPath(locale, table) {
  return path.join(langRoot(locale), 'excel', `${table}.json`);
}

/** 스토리 스크립트 루트 (…/repo/kr/gamedata/story) */
export function storyRoot(locale) {
  return path.join(langRoot(locale), 'story');
}

export function hasLocale(locale) {
  return fs.existsSync(path.join(langRoot(locale), 'excel'));
}

const excelCache = new Map();

/** excel 테이블을 읽는다. 없으면 null. (프로세스 내 캐시) */
export function loadExcel(locale, table) {
  const key = `${locale}:${table}`;
  if (excelCache.has(key)) return excelCache.get(key);
  const file = excelPath(locale, table);
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  excelCache.set(key, data);
  return data;
}

/** 모든 로케일의 같은 테이블 → { ko_KR, zh_CN }. 둘 다 없으면 sync 안내와 함께 실패 */
export function loadExcelAll(table) {
  const out = {};
  for (const locale of LOCALES) out[locale] = loadExcel(locale, table);
  if (!out[PRIMARY] && !out[LOCALES[1]]) {
    throw new Error(`${table}.json 을 찾을 수 없습니다. 먼저 \`npm run sync\` 를 실행하세요. (검색 위치: ${gamedataRoot()})`);
  }
  return out;
}

/**
 * 스토리 스크립트 상대 경로(예: 'obt/roguelike/ro4/level_rogue4_entry')를 ko_KR 우선으로 읽는다.
 * @returns {{ text: string, locale: string, path: string } | null}
 */
export function readStory(rel) {
  for (const locale of LOCALES) {
    for (const ext of ['.txt', '.asc']) {
      const file = path.join(storyRoot(locale), `${rel}${ext}`);
      if (fs.existsSync(file)) return { text: fs.readFileSync(file, 'utf8'), locale, path: file };
    }
  }
  return null;
}

/** 로케일별 값 맵에서 우선순위대로 첫 유효값 */
export function pick(byLocale) {
  for (const locale of LOCALES) {
    const v = byLocale?.[locale];
    if (v !== undefined && v !== null && v !== '') return { value: v, locale };
  }
  return { value: null, locale: null };
}
