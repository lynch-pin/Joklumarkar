# overrides/

`scripts/process-data.mjs` 가 병합하는 수동 보정 데이터. 게임 데이터에 없는 구조를 규칙으로 복원하는 과정에서
틀린 부분을 사람이 고칠 수 있게 분리해 두었다. 빌드 로그(`npm run process`)에 보정 대상 후보가 출력된다.

## scene-node.json — 장면 → 노드 종류

어떤 이벤트가 어떤 노드(우연한 만남 / 안전한 곳 / 흥미진진 …)에서 뜨는지는 서버가 가중치로 뽑기 때문에
테이블에 없다. 가공 단계에서 다음 순서로 결정한다.

1. 이 파일의 장면 id 지정 (`"scene_ro4_rest1_enter": "REST"`)
2. 이 파일의 접두사 지정 (`"prefix:swpp": "INCIDENT"`)
3. `endingDetailList` 에 적힌 `eventType` (엔딩 상세에 쓰이는 일부 장면만)
4. 장면 id 접두사 규칙 (`rest*` → REST, `ent*` → ENTERTAINMENT …; `scripts/process-data.mjs` 의 `PREFIX_RULES`)
5. 못 맞추면 `INCIDENT` 로 두고 "미분류"로 센다

접두사는 장면 id 에서 `scene_` 과 `roN_` 을 떼고 끝의 `_enter` / `_숫자` 를 뗀 다음, 첫 숫자 앞까지다.
(`scene_ro5_swpp_enter` → `swpp`, `scene_ro3_portal0201a_2` → `portal`)

값은 그 테마 `nodeTypeData` 의 키(`BATTLE_NORMAL`, `INCIDENT`, `REST`, …) 또는 의사 종류 `START`(탐험 시작 장면) / `ENDING`(엔딩 직전 장면).

## scene-choices.json — 장면 → 선택지

`choice_<X>_<n>` 의 부모 장면은 `scene_<X>_enter` 또는 `scene_<X>` 라는 규칙으로 복원한다(현재 실패 0건).
규칙이 깨진 선택지가 생기면 로그에 `[process] 부모 장면 미매칭` 으로 나오므로 여기에 적는다.

```json
{ "rogue_4": { "scene_ro4_xxx_enter": ["choice_ro4_xxx_1", "choice_ro4_xxx_2"] } }
```
