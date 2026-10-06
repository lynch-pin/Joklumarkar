# 아크나이츠 통합전략(IS) 리더 — 새 프로젝트 인수인계 문서

> **사용법**: 이 파일을 새 레포 루트에 `BRIEF.md` 로 두고, 새 Claude Code 세션에서
> `BRIEF.md 를 읽고 그대로 만들어줘. 막히는 부분은 물어보고, 데이터 수치는 직접 확인해서 검증해.`
> 라고 시작하면 된다.
>
> 이 문서의 모든 수치/경로는 2026-10-06 기준 **실제 데이터에서 확인한 값**이다. 추정이 섞인 부분은
> "추정"이라고 따로 표시했다. 새 세션은 섹션 9의 검증 스니펫을 먼저 돌려 현재 데이터와 맞는지 확인할 것.

---

## 0. 목표

아크나이츠 **통합전략(로그라이크, IS)** 의 비전투 콘텐츠를 게임과 비슷한 흐름으로 읽는 정적 사이트.

```
테마(통합전략 시즌) → 구역(zone) → 노드 종류 → 이벤트 장면 → 선택지 → 결과 장면(본문)
```

**핵심 인터랙션**: 노드를 누르면 상세 이벤트 장면(삽화 + 본문 + 선택지)이 뜨고,
선택지를 누르면 그 결과 장면의 텍스트가 펼쳐진다. 결과 장면에 또 선택지가 있으면 계속 따라 들어간다.
즉 **분기 트리를 클릭으로 탐색**하는 리더다. (전투 시뮬레이터나 맵 생성기가 아니다.)

비상업 팬사이트. 이미지는 **절대 레포에 커밋하지 않고 핫링크**한다.

---

## 1. 데이터 소스

### 1-1. 게임 데이터 (텍스트)

- 레포: `https://github.com/ArknightsAssets/ArknightsGamedata` (브랜치 `master`)
- 언어 폴더는 `ko_KR`/`zh_CN` 이 아니라 **`kr/` `cn/`** 이다. 스토리 스크립트 확장자는 `.asc` 가 아니라 **`.txt`**.
- 필요한 경로 (전부 합쳐 **약 47MB** — 전체 excel+story 를 받으면 600MB 이므로 `--no-cone` 으로 좁힐 것):

| 경로 | 크기 | 내용 |
|---|---|---|
| `kr/gamedata/excel/roguelike_topic_table.json` | 21MB | 테마/구역/노드/장면/선택지/유물/엔딩 전부 |
| `cn/gamedata/excel/roguelike_topic_table.json` | 23MB | 위와 같음 + rogue_6 (CN 전용) |
| `kr/gamedata/story/obt/rogue/` | 1.3MB | 결말기록(endbook)·월간분대기록(monthrecord)·도전 AVG 스크립트 |
| `kr/gamedata/story/obt/roguelike/` | 312KB | 테마별 진입/엔딩 컷신 AVG 스크립트 |
| `cn/gamedata/story/obt/rogue/`, `cn/.../roguelike/` | 1.5MB | CN 폴백용 |

섹션 11의 sync 스크립트를 **실제로 돌려서 검증했다**: 약 6초, `.git` 포함 58MB, 위 6개 경로만 정확히 체크아웃된다.

`gamedata/` 는 **반드시 `.gitignore`** 에 넣는다 (원작 데이터 재배포 안 함).

sync 스크립트는 아래 "11. 바로 쓸 수 있는 sync 스크립트" 참고.

### 1-2. 이미지 (핫링크)

- 베이스: `https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/`
- **커밋하지 않는다.** `<img src>` 로 바로 건다. `loading="lazy" decoding="async"` 필수.

| 용도 | 경로 패턴 | 상태 |
|---|---|---|
| 이벤트 장면 삽화 | `avg/images/<background>.png` | rogue_1~4 확보 (36/48/40/48종, 누락 1) |
| 일부 장면 배경 (일반 AVG 배경 id) | `avg/backgrounds/<background>.png` | 폴백으로 시도 |
| 유물·아이템 아이콘 | `arts/ui/rogueliketopic/itempic/<iconId>.png` | 1,349개 |
| 선택지 아이콘 | `arts/ui/rogueliketopic/choicepic/<funcIconId>.png` | 26종 (전부 확보) |
| 노드 종류 태그 아이콘 | `arts/ui/rogueliketopic/dungeon/img_tag_<종류>.png` | 15종 + 노드 배경/커넥터 |
| 노드 활성 아이콘 | `arts/ui/rogueliketopic/dungeon/img_<battle|elite|boss|rest|shop|incident|treasure|entertainment>_active.png` | 확보 |
| 엔딩 배경 | `avg/images/<ending.bgId>.png` | 확보 |
| 외부 버프 아이콘 | `arts/ui/rogueliketopic/outerbufficon/` | 47개 |

`choicepic` 전체 목록 (= `choice.displayData.funcIconId` 와 1:1):
`adventure battle chaos chaos_purify dice disaster duel fragment gold hp hpmax key leave member population recruit relic sacrifice sacrifice_totem san shield teleport totem unknown vision weight`

`dungeon/img_tag_*` 전체 목록:
`alchemy battle boss duel elite entertainment exped final_boss incident port port_2 rest sacafri shop treasure unknown`

> 이미지 존재 여부를 빌드 때 확인하고 싶으면, 기존 프로젝트처럼 **에셋 경로 인덱스**를 만들어 두면 좋다.
> `git clone --filter=tree:0 --no-checkout` 후 `git ls-tree -r --name-only HEAD` 로 경로 목록만 받는 방식
> (수 GB 레포를 내려받지 않고 파일 목록만 얻는다).

---

## 2. 테이블 구조 — `roguelike_topic_table.json`

최상위: `topics` / `constant` / `details` / `modules` / `customizeData`

### 2-1. `topics[topicId]`

KR 5개 / CN 6개.

| topicId | KR 이름 | 비고 |
|---|---|---|
| rogue_1 | 팬텀 & 크림슨 솔리테어 | |
| rogue_2 | 미즈키 & 카이룰라 아버 | |
| rogue_3 | 탐험가의 은빛 서리 끝자락 | |
| rogue_4 | 살카즈의 영겁 기담 | |
| rogue_5 | 쉐이의 기이한 계원 | **이미지 미확보** (섹션 3) |
| rogue_6 | 沉沦者的黑流树海 | **CN 전용** (KR 텍스트 없음, 이미지 없음) |

### 2-2. `details[topicId]` 중 쓸 것

| 필드 | rogue_1 / 2 / 3 / 4 / 5 | 내용 |
|---|---|---|
| `zones` | 10 / 7 / 337 / 21 / 15 | 구역. `name`, `description`(진입 문구), `endingDescription`, `backgroundId`, `zoneIconId` |
| `nodeTypeData` | 9 / 13 / 14 / 16 / 18 | 노드 종류. **키가 곧 종류**(`BATTLE_NORMAL`,`INCIDENT`,`REST`,`SHOP`,`TREASURE`,`ENTERTAINMENT`,`UNKNOWN`,`WISH`,`SACRIFICE`,`EXPEDITION`,`BATTLE_SHOP`,`PORTAL`,`ALCHEMY`,`DUEL`,`STORY`,`STORY_HIDDEN` …), 값은 `{name, description}` |
| `rollNodeData` | {} / {} / {} / 20 / 8 | **구역별 등장 노드 종류**. `zone_3.groups = {BATTLE_NORMAL:…, INCIDENT:…, DUEL:…}` |
| `choiceScenes` | 172 / 227 / 381 / 328 / 1387 | 이벤트 장면 |
| `choices` | 152 / 271 / 923 / 357 / 1788 | 선택지 |
| `stages` | 90 / 97 / 99 / 127 / 178 | 전투 노드. `name`, `description`, `eliteDesc`, `isBoss` |
| `endings` | 4 / 4 / 5 / 5 / 5 | 엔딩. `name`, `desc`, `bgId`, `icons[]` |
| `items` | 342 / 366 / 486 / 561 / 3788 | 유물·수집품·모집권. `name`, `usage`, `description`, `iconId`, `rarity`, `type` |
| `archiveComp` | — | `relic / capsule / trap / chat / endbook / buff / totem / chaos / fragment / disaster / wrath / copper` 아카이브. `chat` 은 월간분대기록 AVG 로 연결 |
| `subTypeData` | — | 장면 세부 분류 (rogue_3·5 만 `subTypeId` 를 실제로 씀) |

**장면 (`choiceScenes[sceneId]`)**
```json
{
  "id": "scene_ro4_res1_3",
  "title": "의혹 해소",
  "description": "“어떻게 그럴 수가?” 리치는 놀라 외치더니 …",
  "background": "pic_rogue_4_3",
  "titleIcon": null,
  "subTypeId": 0,
  "useHiddenMusic": false
}
```

**선택지 (`choices[choiceId]`)**
```json
{
  "id": "choice_ro4_res1_1",
  "title": "산크타가 살카즈를 죽였다",
  "description": "오리지늄각뿔 <@ro4.get>4</> 획득",
  "lockedCoverDesc": null,
  "type": "TRADE",
  "nextSceneId": "scene_ro4_res1_1",
  "displayData": { "type": "NORMAL", "costHintType": "NONE", "effectHintType": "NONE",
                   "funcIconId": "gold", "itemId": "rogue_4_gold", "taskId": null },
  "forceShowWhenOnlyLeave": false
}
```
`type` 값: `LEAVE NEXT NEXT_PROB TRADE TRADE_PROB TRADE_PROB_SHOW SACRIFICE TELEPORT EXPEDITION WISH_ALL`
(`_PROB` = 확률 분기. 확률값 자체는 테이블에 없고 문구로만 표현된다.)

**리치 텍스트**: 본문·선택지·아이템 설명에 `<color=#2fac78>…</color>`, `<@ro4.get>4</>`, `<@ro3.lose>…</>` 태그가 섞여 있다
(총 8천여 개). 기존 프로젝트의 `richTextToHtml()` 이 `<@xx.yy>` 와 `<color=…>` 를 둘 다 처리하므로 그대로 가져다 쓰면 된다.

---

## 3. 구조 복원 규칙 ★ 가장 중요한 부분

게임 데이터에 **장면→선택지 목록 필드가 없다.** 아래 규칙으로 복원한다. 모두 실제로 검증했다.

### (a) 장면 → 선택지 : id 규칙으로 100% 복원됨

`choice_<X>_<n>` 의 부모 장면은 `scene_<X>_enter` 또는 `scene_<X>`.

```
choice_ro4_res1_2  →  부모 scene_ro4_res1_enter,  결과 scene_ro4_res1_2
```

검증 결과 (`choice_leave` 공용 선택지 제외):

| 테마 | 선택지 수 | 부모 장면 매칭 | 실패 |
|---|---|---|---|
| rogue_1 | 152 | 151 | 0 |
| rogue_2 | 271 | 270 | 0 |
| rogue_3 | 923 | 922 | 0 |
| rogue_4 | 357 | 356 | 0 |
| rogue_5 | 1788 | 1787 | 0 |

규칙:
```js
const base = choiceId.replace(/^choice_/, '').replace(/_\d+$/, '');
const parent = scenes[`scene_${base}_enter`] ? `scene_${base}_enter` : `scene_${base}`;
```
**단, 이건 규칙 기반 복원이므로 선택지 "표시 순서"는 id 끝 숫자 순으로 정렬해 쓴다.**
빌드 때 매칭 실패 건수를 로그로 찍고, 실패분은 `overrides/scene-choices.json` 으로 수동 보정할 수 있게 열어 둘 것.

### (b) 선택지 → 결과 장면 : `nextSceneId` (명시 필드)

rogue_4 기준 357개 중 296개가 `nextSceneId` 보유, 그 296개 전부 실재하는 장면을 가리킨다.
`nextSceneId` 가 없으면 그 선택지가 분기의 끝(이탈/종료).

### (c) 진입 장면 = 어떤 선택지의 `nextSceneId` 로도 지목되지 않는 장면

rogue_4 기준 89개. **이벤트 목록에 카드로 노출할 단위가 바로 이것**이다.
(나머지는 전부 어떤 선택지의 결과 화면.)

### (d) 구역 → 노드 종류 : `rollNodeData`

rogue_4·5 만 있다 (`zone_3.groups` 에 그 구역에서 등장하는 노드 종류 키가 들어 있음).
rogue_1~3 은 비어 있으므로 **그 테마는 `nodeTypeData` 전체를 구역 공통으로** 보여 주면 된다.

### (e) 장면 → 노드 종류 : **데이터에 없음 → 접두사 휴리스틱 + overrides** (추정)

어떤 이벤트가 어떤 노드에서 뜨는지는 서버가 가중치로 뽑기 때문에 테이블에 없다.
다만 장면 id 접두사가 의미를 담고 있다:

```
rest*      → REST            ent*       → ENTERTAINMENT
sacrifice* → SACRIFICE       rec*/recruit* → 모집
relic*     → 유물 관련        exchange*  → 상점/교환
eportal*   → PORTAL          duel*      → DUEL
fin*/end*  → 엔딩 직전        normal*/side* → INCIDENT
```

구현 방침:
1. 키워드 → 노드 종류 매핑 테이블을 코드에 두고 접두사로 1차 분류
2. 못 맞춘 장면은 `INCIDENT`(우연한 만남)로 떨어뜨리고
3. `overrides/scene-node.json` 으로 사람이 고칠 수 있게 한다 (기존 프로젝트의 overrides 방식과 동일)
4. **빌드 로그에 "자동 분류 N개 / 미분류 M개"를 반드시 출력**해서 보정 대상을 알 수 있게 할 것

> 사용자에게 이 부분은 **추정 분류**라고 UI에도 작게 표시하는 게 정직하다.

---

## 4. 알려진 한계 (사용자와 이미 합의됨)

1. **rogue_5 이미지 전무** — `pic_rogue_5_*`, `rogue_5_*` 아이콘이 미러(ArknightsAssets `cn`/`us`/`jp` 브랜치)에 전부 404.
   텍스트는 KR에 완전(장면 1,387개, 10만 자). → **텍스트 + 플레이스홀더로 렌더**하고, sync 때 자동 반영되게 둔다.
2. **rogue_6 (沉沦者的黑流树海)** — CN 전용, 한국어 없음 + 이미지 없음. 기본은 숨기고 "CN 서버" 토글로만 노출 권장.
3. **실제 맵(노드 배치)은 재현 불가** — 런타임 생성. 구역 구성·노드 종류·전투 스테이지 목록까지가 한계.
   게임 같은 맵 그래프를 원하면 **가상의 레이아웃**(구역 안에 노드 종류를 격자로 배치)으로 만들어야 한다.
4. **구역 지도 배경(`rogue_4_map_1`)·구역 아이콘(`icon_zone_1`) 이미지 없음** — 미러에 없다(여러 경로 확인). 구역 헤더는 장면 삽화 중 하나나 단색으로 처리.
5. **이벤트 출현 확률·조건 없음** — `_PROB` 선택지의 확률값, 노드별 이벤트 풀 가중치는 데이터에 없다.
6. **아이템 아이콘 일부 누락** — rogue_1~4 에서 테마당 60~160개가 미러에 없음(342→280, 561→402 등). 폴백 아이콘 필요.

---

## 5. 산출 데이터 설계 (제안)

`scripts/process-data.mjs` 가 `src/data/` 로 뱉는다. 페이지는 gamedata 를 직접 읽지 않는다.

```jsonc
// src/data/topics.json
[{ "id":"rogue_1", "name":"팬텀 & 크림슨 솔리테어", "locale":"ko_KR",
   "zones":[{ "id":"zone_1","name":"…","description":"…","endingDescription":"…",
              "nodeTypes":["BATTLE_NORMAL","INCIDENT","REST"] }],
   "nodeTypes":{ "INCIDENT":{ "name":"우연한 만남","description":"…","icon":"<url>","sceneCount":42 } },
   "counts":{ "scenes":172,"entryScenes":64,"choices":152,"stages":90,"endings":4 } }]

// src/data/scenes/<topicId>.json   ← 테마별로 쪼갠다 (rogue_5 는 1387장면)
{ "scene_ro4_res1_enter": {
    "id":"…", "title":"…", "html":"<p>…</p>",      // 리치텍스트 변환 완료
    "image":"https://…/avg/images/pic_rogue_4_3.png",
    "nodeType":"INCIDENT", "nodeTypeSource":"prefix|override",
    "isEntry":true, "zoneHint":null,
    "choices":[{ "id":"…","title":"…","descHtml":"…","type":"TRADE",
                 "icon":"https://…/choicepic/gold.png","itemId":"rogue_4_gold",
                 "next":"scene_ro4_res1_1" }] } }

// src/data/cutscenes.json  — AVG 스크립트 250편 인덱스 (진입/엔딩/endbook/monthrecord/challenge)
// src/data/items.json      — 유물·수집품 (아이콘 + usage)
```

---

## 6. 페이지 구성 (제안)

```
/                       테마 5(+1)장 카드
/is/<topic>             구역 목록 + 노드 종류 그리드 + 테마 통계
/is/<topic>/<zone>      그 구역의 노드 종류 → 종류별 이벤트 장면 카드
/is/<topic>/node/<type> 노드 종류별 전체 이벤트 목록 (구역 횡단)
/is/<topic>/scene/<id>  이벤트 상세 — 삽화 + 본문 + 선택지 + 결과 트리
/is/<topic>/stages      전투 노드 목록 (이름 + 설명 + 보스 여부)
/is/<topic>/endings     엔딩 5종 + 엔딩 컷신 리더
/is/<topic>/cutscene/<id>  AVG 리더 (진입/엔딩/월간기록/결말기록)
/is/<topic>/items       유물·수집품
```

**이벤트 상세 화면의 핵심 동작**:
- 진입 장면 본문 + 선택지 버튼들
- 선택지를 누르면 그 **결과 장면이 아래로 펼쳐진다**(`<details>` 중첩 또는 JS로 스택 쌓기)
- 결과 장면에 또 선택지가 있으면 반복 → 전체 분기를 한 화면에서 따라갈 수 있게
- "전부 펼치기 / 접기" 버튼, 선택지 아이콘(`choicepic`) 표시, `LEAVE` 는 회색 처리
- 선택지 효과 문구의 `<@ro4.get>` 는 초록, `<@ro4.lose>` 는 붉은 계열로

---

## 7. 기술 스택 / 기존 프로젝트에서 가져올 것

기존 자매 프로젝트: `https://github.com/lynch-pin/Furnaceside-Fables` (같은 사람 소유, Astro 정적 사이트, GitHub Pages 배포)

그대로 복사해 쓸 수 있는 파일:

| 파일 | 쓸모 |
|---|---|
| `scripts/sync-data.sh` | sparse-checkout + 재시도 + 에셋 인덱스 생성. 경로만 좁히면 됨 |
| `src/lib/story-parser.mjs` | AVG `.txt` 파서. 컷신 리더에 그대로 쓴다. `richTextToHtml` 도 여기 있음 |
| `src/lib/i18n.mjs` | KR 우선 + CN 폴백 로더. **`PROJECT_ROOT` 는 반드시 `process.cwd()` 기준**(Astro 빌드 시 `import.meta.url` 깨짐) |
| `src/lib/data.mjs` | `src/data/*.json` 로더 |
| `src/lib/scope.mjs` | JS로 만든 노드에 Astro 스코프 스타일(`data-astro-cid-*`) 입히기 — **JS로 DOM 만들 거면 필수** |
| `src/styles/global.css` | jellybeans(vim) 팔레트 다크/라이트, `.card`, `.shortcuts`, `.badge` 등 |
| `.github/workflows/deploy.yml` | GitHub Pages 배포 (push to main + 주 1회 cron) |

프로젝트 규칙(동일하게 유지):
- **주석은 한국어, 커밋 메시지는 영어**
- 모델 식별자(Opus/Claude 등)는 커밋 메시지·코드 주석·PR 본문에 쓰지 않는다
- 이미지는 전부 핫링크, 사이트를 무겁게 만들지 않는다 (전신 일러스트류 금지)
- Astro `output: 'static'`, `build.format: 'directory'`
- 다크모드 지원, 오른쪽 아래 "맨 위로" 버튼
- 데이터 가공 단계에서 수작업 보정이 필요한 건 전부 `overrides/*.json` 으로 분리

---

## 8. 작업 순서

1. `npm create astro` + 기존 레포에서 위 파일 복사 → `gamedata/` `.gitignore`
2. `scripts/sync-data.sh` 경로를 roguelike 전용으로 좁혀서 동기화 (약 47MB)
3. `scripts/process-data.mjs`:
   - 테마/구역/노드종류/전투/엔딩/아이템 추출 (KR 우선, CN 폴백)
   - 장면↔선택지 복원 (섹션 3-a) + 매칭 실패 로그
   - 진입 장면 판정 (섹션 3-c)
   - 장면→노드종류 접두사 분류 + `overrides/scene-node.json`
   - 이미지 URL 생성 + 에셋 인덱스로 존재 여부 검사, 없으면 `null`
4. 페이지 구현 (섹션 6) — 이벤트 상세 화면을 **가장 먼저** 만들어 사용자에게 보여 주고 피드백 받을 것
5. 컷신 리더 (story-parser 재사용)
6. 검색(장면 제목/본문), 테마·노드종류 필터
7. GitHub Pages 배포

**사용자 확인이 필요한 지점** (진행 중 물어볼 것):
- 구역→노드→이벤트를 "가상 맵" 형태로 그릴지, 목록/카드로 갈지
- rogue_5(이미지 없음)·rogue_6(CN 전용)을 기본 노출할지
- 도메인 (기존은 `fables.lone-trail.com`)

---

## 9. 검증 스니펫 (새 세션에서 먼저 돌려 볼 것)

```bash
# 테마별 규모
python3 - <<'EOF'
import json
d=json.load(open('gamedata/kr/gamedata/excel/roguelike_topic_table.json'))
for t,v in d['details'].items():
    print(t, d['topics'][t]['name'],
          '| zones',len(v['zones']), '| nodeTypes',len(v['nodeTypeData']),
          '| scenes',len(v['choiceScenes']), '| choices',len(v['choices']),
          '| stages',len(v['stages']), '| items',len(v['items']),
          '| rollNodeData',len(v.get('rollNodeData') or {}))
EOF
```

```bash
# 장면↔선택지 복원률 + 진입 장면 수
python3 - <<'EOF'
import json,re
d=json.load(open('gamedata/kr/gamedata/excel/roguelike_topic_table.json'))
for t,v in d['details'].items():
    sc,ch=v['choiceScenes'],v['choices']
    hit=miss=0
    for cid in ch:
        if cid=='choice_leave': continue
        b=re.sub(r'_\d+$','',cid[len('choice_'):])
        hit += ('scene_'+b+'_enter' in sc or 'scene_'+b in sc)
        miss += not ('scene_'+b+'_enter' in sc or 'scene_'+b in sc)
    reach={c['nextSceneId'] for c in ch.values() if c.get('nextSceneId')}
    print(t,'부모매칭',hit,'실패',miss,'| 진입장면',len([s for s in sc if s not in reach]))
EOF
```

```bash
# 이미지 존재 확인 (단건)
curl -s -o /dev/null -w "%{http_code}\n" -r 0-50 \
  "https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/avg/images/pic_rogue_4_1.png"
# 206 → 있음, 404 → 없음.  pic_rogue_5_1.png 는 현재 404 (섹션 4-1)
```

---

## 10. 데이터 규모 (KR 기준, 작업량 감)

- 이벤트 장면 **2,495개** / 선택지 **3,491개** / 장면 본문 **약 23만 자**
- 전투 노드 591개 (이름 + 설명)
- 유물·수집품 5,543개
- 엔딩 23종, AVG 컷신 스크립트 **250편** (진입·엔딩·결말기록 20·월간분대기록 24·도전 13 등)
- 테마별 장면 수(괄호는 진입 장면 = 이벤트 카드로 노출할 단위):
  rogue_1 172(64) / rogue_2 227(70) / rogue_3 381(145) / rogue_4 328(89) / **rogue_5 1,387(749)**

→ rogue_5 가 전체의 절반 이상이므로 **장면 데이터는 테마별 JSON 파일로 쪼갤 것**. 한 덩어리로 만들면 페이지가 무거워진다.

---

## 11. 바로 쓸 수 있는 sync 스크립트

```bash
#!/usr/bin/env bash
# scripts/sync-data.sh — 통합전략 리더용 데이터 동기화 (약 47MB)
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAMEDATA_DIR="${GAMEDATA_DIR:-$ROOT_DIR/gamedata}"
GAMEDATA_REPO="${GAMEDATA_REPO:-https://github.com/ArknightsAssets/ArknightsGamedata}"
GAMEDATA_REF="${GAMEDATA_REF:-master}"
export GIT_LFS_SKIP_SMUDGE=1

retry() { local n="$1"; shift; local d=2 i
  for ((i=1;i<=n;i++)); do "$@" && return 0; ((i==n)) && return 1
    echo "[sync] 실패($i/$n) ${d}s 후 재시도" >&2; sleep "$d"; d=$((d*2)); done; }

if [[ ! -d "$GAMEDATA_DIR/.git" ]]; then
  rm -rf "$GAMEDATA_DIR"
  retry 4 git clone --depth 1 --filter=blob:none --sparse --branch "$GAMEDATA_REF" \
    "$GAMEDATA_REPO" "$GAMEDATA_DIR"
fi

# cone 모드로는 파일 단위를 못 고르므로 --no-cone 으로 패턴을 직접 지정한다
git -C "$GAMEDATA_DIR" sparse-checkout set --no-cone \
  '/kr/gamedata/excel/roguelike_topic_table.json' \
  '/cn/gamedata/excel/roguelike_topic_table.json' \
  '/kr/gamedata/story/obt/rogue/**' \
  '/kr/gamedata/story/obt/roguelike/**' \
  '/cn/gamedata/story/obt/rogue/**' \
  '/cn/gamedata/story/obt/roguelike/**'

retry 4 git -C "$GAMEDATA_DIR" fetch --depth 1 origin "$GAMEDATA_REF"
git -C "$GAMEDATA_DIR" reset --hard --quiet FETCH_HEAD
git -C "$GAMEDATA_DIR" sparse-checkout reapply
echo "[sync] 완료: $(git -C "$GAMEDATA_DIR" rev-parse --short HEAD)"
du -sh "$GAMEDATA_DIR"
```

> **검증 완료** (git 2.x, 2026-10-06): 약 6초, `gamedata/` 58MB(.git 포함), 위 6개 경로만 받아진다.
> 혹시 받아진 파일이 비면 git 버전 문제이므로 cone 모드(`kr/gamedata/excel` 디렉터리 통째)로
> 떨어뜨리고 용량(600MB)을 감수하는 폴백을 둘 것.

---

## 12. 완료 기준 체크리스트

- [ ] `npm run sync && npm run process && npm run build` 가 한 번에 통과
- [ ] 장면↔선택지 매칭 실패 0건 (로그로 확인)
- [ ] rogue_1~4 이벤트 상세에서 삽화가 보이고, 선택지를 누르면 결과 본문이 펼쳐짐
- [ ] rogue_5 는 이미지 없이도 레이아웃이 깨지지 않음 (플레이스홀더)
- [ ] 노드 종류 자동 분류 결과와 미분류 수를 빌드 로그에 출력
- [ ] 모바일 폭에서 가로 스크롤 없음, 다크모드 정상
- [ ] 이미지가 레포에 하나도 커밋되지 않음
