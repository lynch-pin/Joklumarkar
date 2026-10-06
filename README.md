# Aegir — 아크나이츠 통합전략 이벤트 리더

아크나이츠(明日方舟) **통합전략(로그라이크, IS)** 의 비전투 콘텐츠를 게임 흐름대로 읽는 정적 사이트.
비상업적 팬 사이트. [Astro](https://astro.build) · GitHub Pages · `aegir.lone-trail.com`.

```
테마(시즌) → 구역 → 노드 종류 → 이벤트 장면 → 선택지 → 결과 장면
```

노드를 고르면 이벤트 장면(삽화 + 본문 + 선택지)이 뜨고, 선택지를 누르면 결과 장면이 아래로 펼쳐진다.
분기 트리를 클릭으로 탐색하는 리더이지, 전투 시뮬레이터나 맵 생성기가 아니다.

## 빠른 시작

```bash
npm install        # prepare 훅: sync(게임 데이터 sparse-checkout ~60MB) → process(가공)
npm run dev        # http://localhost:4321
npm run build      # dist/
npm test
```

데이터만 다시 받거나 가공하려면 `npm run sync` / `npm run process`.
`process` 로그에 테마별 장면·선택지 수, 부모 장면 매칭 실패, 노드 종류 분류(데이터/접두사/미분류) 결과, 삽화 유무가 찍힌다.

## 구조

```
scripts/
  sync-data.sh         ArknightsGamedata 의 roguelike 경로 6개만 sparse-checkout (gamedata/repo) + ArknightsAssets 파일 목록(gamedata/asset-index.txt)
  process-data.mjs     roguelike_topic_table.json + AVG 스크립트 → src/data/*.json
src/
  lib/i18n.mjs         kr 우선 → cn 폴백 (테마 단위), 경로 헬퍼
  lib/assets.mjs       이미지 핫링크 URL + 에셋 인덱스로 존재 검사
  lib/story-parser.mjs AVG 스크립트 파서, richTextToHtml (<@ro4.get> → 초록, <@ro4.lose> → 붉은색)
  lib/themes.mjs       테마별 모티프·팔레트 메타, 노드 종류 → 게임 UI 아이콘 매핑
  lib/data.mjs         src/data 로더 + 라벨 테이블
  components/
    SceneTree / SceneNode   이벤트 분기 트리 (선택지 클릭 → 결과 펼치기, 같은 장면은 한 번만 그리고 점프)
    NodeMap                 구역의 노드 종류를 게임 맵처럼 늘어놓은 가상 레이아웃 (img_node_bkg + img_tag_*)
    SceneCard / TopicHero / StoryReader
  pages/
    /                          테마 카드 (CN 전용 테마는 접힘)
    /is/<topic>                구역(가상 노드 맵) + 노드 종류 + 난이도 + 분대
    /is/<topic>/zone/<zone>    구역 상세 → 종류별 이벤트 카드
    /is/<topic>/node/<type>    노드 종류별 이벤트 전체
    /is/<topic>/events         이벤트 전체 (종류·제목 필터)
    /is/<topic>/scene/<id>     이벤트 상세 (핵심 화면)
    /is/<topic>/stages         전투 노드
    /is/<topic>/endings        엔딩 + 결말 기록
    /is/<topic>/cutscenes, /cutscene/<id>   AVG 컷신·기록 리더
    /is/<topic>/items, /items/<type>        소장품·아이템
    /search                    장면 제목·본문 검색 (클라이언트, /search.json)
overrides/                 수동 보정 (scene-node.json, scene-choices.json) — overrides/README.md
public/CNAME               커스텀 도메인
.github/workflows/deploy.yml  main push / 매주 월 09:00 KST 자동 배포
```

## 데이터 복원 규칙 (요약)

게임 데이터에는 장면→선택지 목록이 없다. 다음 규칙으로 복원한다 (자세한 내용은 `BRIEF.md`, `overrides/README.md`).

- 선택지 `choice_<X>_<n>` 의 부모 장면은 `scene_<X>_enter` 또는 `scene_<X>` — 전 테마 매칭 실패 0건
- 선택지 → 결과 장면은 `nextSceneId`
- 진입 장면 = 어떤 선택지의 `nextSceneId` 로도 지목되지 않는 장면 (이벤트 카드 단위)
- 구역 → 노드 종류는 `rollNodeData` (IS4·IS5만 있음, 나머지는 테마 전체 종류 공통)
- 장면 → 노드 종류는 데이터에 없음: `endingDetailList.eventType` → 장면 id 접두사 규칙 → 미분류는 INCIDENT. UI 에 "추정" 표시

## 알려진 한계

- IS5(쉐이의 기이한 계원)·IS6(CN 전용)은 에셋 미러에 이미지가 없어 텍스트 + 플레이스홀더로 보여 준다. 미러에 올라오면 sync 때 자동 반영된다.
- 실제 맵 배치, 이벤트 출현 확률, 확률 분기 수치는 데이터에 없어 재현하지 않는다.
- 구역 지도 배경·구역 아이콘 이미지는 미러에 없어 테마 그라데이션으로 대신한다.
- 이미지는 전부 핫링크이며 저장소에 커밋하지 않는다. 원작 데이터(`gamedata/`)와 가공 산출물(`src/data/`)도 커밋하지 않는다.

## 규칙

- 주석은 한국어, 커밋 메시지는 영어
- 데이터 가공에서 수작업 보정이 필요한 건 전부 `overrides/*.json`
- Astro `output: 'static'`, `build.format: 'directory'`, 다크 모드, 오른쪽 아래 "맨 위로"
