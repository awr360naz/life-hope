import ShortSegmentsPage from "./ShortSegmentsPage";

export default function SabbathShortsPage() {
  return (
    <ShortSegmentsPage
      apiUrl="/api/content/sabbath-shorts?limit=200"
      title="سبت مبارك"
    />
  );
}