// @ts-check
import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // GitHub Pages 정적 배포 + 커스텀 도메인
  site: 'https://aegir.lone-trail.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // /is/rogue_4/scene/xxx/index.html 형태로 출력 (GitHub Pages 디렉터리 라우팅과 호환)
    format: 'directory',
  },
  vite: {
    server: {
      // 빌드 시 gamedata/ 는 fs 로만 읽으므로 Vite 감시 대상에서 제외
      watch: { ignored: ['**/gamedata/**'] },
    },
  },
});
