// 실행 중인 Node.js가 알려진 보안 취약점 수정 버전인지 점검한다.
//   npm run check:node            경고만 하고 계속 (개발 서버를 켤 때 자동 실행: predev)
//   npm run check:node -- --strict  수정 전 버전이면 종료 코드 1
import { checkNodeVersion } from "../lib/node-security.mjs";

const result = checkNodeVersion();
if (result.ok) {
  console.log(`✓ Node.js ${result.version}: 알려진 보안 패치가 적용된 버전입니다.`);
  process.exit(0);
}

for (const p of result.problems) {
  const how = p.fixed ? `${p.fixed} 이상으로 올려 주세요 (권장: 최신 LTS).` : "수정 버전이 공지된 줄(22·24·26)이 아닙니다. 최신 LTS로 바꿔 주세요.";
  console.warn(`! Node.js ${result.version}은(는) ${p.name}(${p.id}) 보안 패치 이전 버전입니다. ${how}`);
}
console.warn("  업데이트: https://nodejs.org 의 LTS 설치 파일, 또는 터미널에서 winget upgrade OpenJS.NodeJS.LTS");
process.exit(process.argv.includes("--strict") ? 1 : 0);
