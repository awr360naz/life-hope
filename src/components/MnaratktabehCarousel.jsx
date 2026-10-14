import ShortSegmentsCarousel from "./ShortSegmentsCarousel";

export default function MnaratktabehCarousel() {
  return (
    <ShortSegmentsCarousel
      title="منارات كتابية"
      perView={5}
      step={1}
      apiUrl="/api/content/mnarat_ktabeh?limit=48"
      linkTo="/mnarat_ktabeh"
      className="prophecies-section"
    />
  );
}
