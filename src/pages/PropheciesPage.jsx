import ShortSegmentsPage from "./ShortSegmentsPage";

export default function PropheciesPage() {
  return (
    <ShortSegmentsPage
      apiUrl="/api/content/prophecies?limit=200"
      title="نبؤات"
    />
  );
}