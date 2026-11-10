import { Button, Container } from "@/components/ui";

export function NotFoundContent() {
  return (
    <Container className="flex flex-col items-start gap-4 py-24">
      <p className="m-0 text-sm font-medium text-label">페이지를 찾을 수 없습니다</p>
      <h1 className="m-0 text-[30px] font-bold">찾으시는 내용이 없거나 아직 공개되지 않았습니다</h1>
      <p className="m-0 text-ink-muted">주소를 다시 확인하시거나 메인에서 찾아보세요.</p>
      <div className="mt-2 flex gap-3">
        <Button href="/">메인으로</Button>
        <Button href="/visit" variant="outline">처음 오셨나요</Button>
      </div>
    </Container>
  );
}
