// 메뉴를 누르면 서버 조회가 끝나기 전에 바로 이 화면을 보여 준다 (사이드 메뉴는 그대로 남는다)
export default function PanelLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-line" />
      <div className="h-4 w-80 max-w-full rounded bg-line" />
      <div className="h-40 rounded-lg bg-line" />
      <span className="sr-only">불러오는 중입니다</span>
    </div>
  );
}
