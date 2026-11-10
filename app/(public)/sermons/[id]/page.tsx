import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SermonVideo } from "@/components/sections";
import { Container, Eyebrow, ExternalButton, TextLink } from "@/components/ui";
import { formatLong } from "@/lib/date";
import { getSermon } from "@/lib/queries";
import { preacherLabel } from "@/lib/sermons";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sermon = await getSermon((await params).id);
  return sermon ? { title: sermon.title, description: sermon.summary, openGraph: { type: "article", title: sermon.title, description: sermon.summary } } : {};
}

export default async function SermonPage({ params }: Props) {
  const sermon = await getSermon((await params).id);
  if (!sermon) notFound();

  return (
    <Container className="flex max-w-[860px] flex-col gap-6 py-9 sm:py-14">
      <TextLink href="/sermons">← 설교 목록</TextLink>
      <div className="flex flex-col gap-2">
        <Eyebrow>{formatLong(sermon.preachedOn)}</Eyebrow>
        <h1 className="m-0 text-[30px] leading-[1.3] font-bold">{sermon.title}</h1>
        <p className="m-0 text-ink-muted">{[sermon.scripture, preacherLabel(sermon.preacher)].filter(Boolean).join(" · ")}</p>
      </div>
      {sermon.videoUrl && <SermonVideo sermon={sermon} />}
      <p className="m-0 whitespace-pre-line">{sermon.summary}</p>
      <div>
        <ExternalButton href={sermon.videoUrl} fallback="[설교 영상 링크 등록 전]">
          영상 보기
        </ExternalButton>
      </div>
    </Container>
  );
}
