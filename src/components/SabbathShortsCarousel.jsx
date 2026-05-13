import ShortSegmentsCarousel from "./ShortSegmentsCarousel";

export default function SabbathShortsCarousel() {
  return (
    <ShortSegmentsCarousel
      title="سبت مبارك"
      perView={5}
      step={1}
      apiUrl="/api/content/sabbath-shorts?limit=48"
      linkTo="/sabbath-shorts"
      className="sabbath-shorts-section"
    />
  );
}