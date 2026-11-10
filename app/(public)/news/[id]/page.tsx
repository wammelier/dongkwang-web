import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/PostArticle";
import { Container, TextLink } from "@/components/ui";
import { getPost } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).id);
  return post
    ? { title: post.title, description: post.summary, openGraph: { type: "article", title: post.title, description: post.summary, publishedTime: post.publishedAt } }
    : {};
}

// 임시 저장·게시 중단·기간 밖 글은 getPost가 null을 돌려주므로 주소를 알아도 404 (기획서 7장)
export default async function NewsDetailPage({ params }: Props) {
  const post = await getPost((await params).id);
  if (!post) notFound();

  return (
    <Container className="flex max-w-[860px] flex-col gap-6 py-9 sm:py-14">
      <TextLink href="/news">← 교회 소식</TextLink>
      <PostArticle post={post} />
    </Container>
  );
}
