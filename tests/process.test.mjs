/**
 * tests/process.test.mjs — 구조 복원 규칙과 리치 텍스트 변환 단위 테스트 (gamedata 불필요)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { richTextToHtml, stripRichText, parseStory } from '../src/lib/story-parser.mjs';

// scripts/process-data.mjs 는 import 시점에 gamedata 를 읽으므로 규칙 함수만 복제해 검증한다.
const scenePrefix = (sceneId) =>
  String(sceneId)
    .replace(/^scene_(ro\d_)?/, '')
    .replace(/_(enter|\d+)$/, '')
    .replace(/\d.*$/, '')
    .replace(/_+$/, '');

const parentOf = (choiceId, scenes) => {
  const base = choiceId.replace(/^choice_/, '').replace(/_\d+$/, '');
  return scenes.has(`scene_${base}_enter`) ? `scene_${base}_enter` : scenes.has(`scene_${base}`) ? `scene_${base}` : null;
};

test('장면 id 접두사 추출', () => {
  assert.equal(scenePrefix('scene_ro5_swpp_enter'), 'swpp');
  assert.equal(scenePrefix('scene_ro3_portal0201a_2'), 'portal');
  assert.equal(scenePrefix('scene_rest_enter'), 'rest');
  assert.equal(scenePrefix('scene_ro4_res1_3'), 'res');
  assert.equal(scenePrefix('scene_ro2_2_enter'), '');
  assert.equal(scenePrefix('scene_ro3_sacrifice1a_enter'), 'sacrifice');
});

test('선택지 → 부모 장면 규칙', () => {
  const scenes = new Set(['scene_ro4_res1_enter', 'scene_ro4_res1_1', 'scene_ro2_king', 'scene_ro2_king_1']);
  assert.equal(parentOf('choice_ro4_res1_2', scenes), 'scene_ro4_res1_enter');
  assert.equal(parentOf('choice_ro2_king_1', scenes), 'scene_ro2_king');
  assert.equal(parentOf('choice_ro9_none_1', scenes), null);
});

test('리치 텍스트 → HTML (get/lose 클래스, color)', () => {
  assert.equal(richTextToHtml('오리지늄각뿔 <@ro4.get>4</> 획득'), '오리지늄각뿔 <span class="rt rt-ro4-get">4</span> 획득');
  assert.equal(richTextToHtml('<@ro3.lose>HP -1</>'), '<span class="rt rt-ro3-lose">HP -1</span>');
  assert.equal(richTextToHtml('<color=#2fac78>x</color>'), '<span style="color:#2fac78">x</span>');
  assert.equal(richTextToHtml('a<b'), 'a&lt;b');
  assert.equal(stripRichText('<@ro4.get>4</> 획득'), '4 획득');
});

test('AVG 스크립트 파싱', () => {
  const lines = parseStory('[HEADER(key="t")] x\n[name="님프"]아파파파……\n나레이션\n[Decision(options="A;B", values="1;2")]\n[Predicate(references="1")]\n[name="틴맨"]분기');
  assert.equal(lines[1].type, 'dialogue');
  assert.equal(lines[1].speaker, '님프');
  assert.equal(lines[2].type, 'narration');
  assert.equal(lines[3].type, 'decision');
  assert.deepEqual(lines[5].branch, ['1']);
});
