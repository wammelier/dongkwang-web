import { describe, expect, it } from "vitest";
import { checkNodeVersion } from "@/lib/node-security.mjs";

describe("Node.js 보안 패치 점검 (Node2Shell, CVE-2026-111497)", () => {
  it("수정 전 버전은 취약으로 본다 (줄마다 기준이 다르다)", () => {
    for (const v of ["v22.23.3", "v22.11.0", "v24.22.0", "v24.21.0", "v26.1.0", "v26.12.0"]) {
      const r = checkNodeVersion(v);
      expect(r.ok, v).toBe(false);
      expect(r.problems[0]).toMatchObject({ name: "Node2Shell", reason: "outdated" });
    }
  });

  it("수정된 버전과 그 이후 버전은 통과한다", () => {
    for (const v of ["v22.23.4", "v24.22.1", "v24.22.2", "v26.12.1", "v26.13.0", "v26.20.0"]) expect(checkNodeVersion(v).ok, v).toBe(true);
  });

  it("권장 수정 버전을 알려 준다", () => {
    expect(checkNodeVersion("v26.1.0").problems[0].fixed).toBe("26.12.1");
    expect(checkNodeVersion("v24.0.0").problems[0].fixed).toBe("24.22.1");
  });

  it("수정 버전이 공지되지 않은 줄(종료·비LTS)은 보증할 수 없어 취약으로 본다", () => {
    for (const v of ["v20.19.0", "v25.9.0", "v23.11.1"]) {
      const r = checkNodeVersion(v);
      expect(r.ok, v).toBe(false);
      expect(r.problems[0].reason).toBe("unsupported");
    }
  });

  it("지금 실행 중인 버전을 기본으로 점검한다", () => {
    expect(checkNodeVersion().version).toBe(process.version);
  });
});
