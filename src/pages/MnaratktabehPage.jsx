import ShortSegmentsPage from "./ShortSegmentsPage";

export default function MnaratktabehPage() {
  return (
    <ShortSegmentsPage
      apiUrl="/api/content/mnarat_ktabeh?limit=200"
      title="منارات كتابية"
    />
  );
}