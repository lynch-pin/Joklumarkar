// /search.json — 정적 검색 색인 (src/data/search.json 을 그대로 내보낸다)
import fs from 'node:fs';
import path from 'node:path';

export function GET() {
  const file = path.resolve(process.cwd(), 'src', 'data', 'search.json');
  const body = fs.readFileSync(file, 'utf8');
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
