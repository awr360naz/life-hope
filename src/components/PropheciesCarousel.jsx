import ShortSegmentsCarousel from "./ShortSegmentsCarousel";

export default function PropheciesCarousel() {
  return (
    <ShortSegmentsCarousel
      title="نبؤات"
      perView={5}
      step={1}
      apiUrl="/api/content/prophecies?limit=48"
      linkTo="/prophecies"
      className="prophecies-section"
    />
  );
}