import { LabPlacePageContent } from "@/app/_components/lab-place-page-content";

type PageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ year?: string; mode?: string; topic?: string }>;
};

export default async function LabPlacePage({ params, searchParams }: PageProps) {
  const { placeId } = await params;
  const query = await searchParams;
  const year = Number(query.year ?? "2025");

  return (
    <LabPlacePageContent
      placeId={decodeURIComponent(placeId)}
      initialYear={Number.isFinite(year) ? year : 2025}
      initialMode={query.mode ?? "activity"}
      initialTopic={query.topic}
    />
  );
}
