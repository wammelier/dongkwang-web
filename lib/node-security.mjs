// Node.js 보안 패치 기준표. 수정 전 버전에서 실행 중이면 알려 준다.
// 개발 서버 시작 점검(scripts/check-node.mjs)과 관리자 대시보드가 같은 표를 쓴다.
//
// Node2Shell — CVE-2026-111497: Brotli 압축 해제 코드의 메모리 쓰기 오류(원격 코드 실행 가능). 2026-10-21 수정 공개.
// 영향: 공격자가 만든 Brotli 데이터를 푸는 코드(요청 본문, fetch로 받은 응답). 런타임 패치 말고는 완전한 우회책이 없다.
// 새 취약점이 공지되면 이 표에 줄을 더한다. fixed는 '줄(메이저)별 수정된 첫 버전'.

export const NODE_ADVISORIES = [
  { id: "CVE-2026-111497", name: "Node2Shell", fixed: { 22: "22.23.4", 24: "24.22.1", 26: "26.12.1" } },
];

/** "v26.1.0" → [26, 1, 0] */
const parse = (version) => version.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10) || 0);

/** a < b ? */
const older = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
};

/**
 * @param {string} [version] 기본은 지금 실행 중인 Node (process.version)
 * @returns {{ ok: boolean, version: string, problems: { id: string, name: string, fixed?: string, reason: "outdated" | "unsupported" }[] }}
 */
export function checkNodeVersion(version = process.version) {
  const v = parse(version);
  const problems = [];
  for (const advisory of NODE_ADVISORIES) {
    const fixed = advisory.fixed[v[0]];
    // 수정 버전이 공지된 줄(22·24·26)이 아니면 패치 여부를 보증할 수 없다 (종료된 줄·비LTS)
    if (!fixed) problems.push({ id: advisory.id, name: advisory.name, reason: "unsupported" });
    else if (older(v, parse(fixed))) problems.push({ id: advisory.id, name: advisory.name, fixed, reason: "outdated" });
  }
  return { ok: problems.length === 0, version, problems };
}
