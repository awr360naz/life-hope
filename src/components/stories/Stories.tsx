import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { StoriesResponse, Story } from "../../pages/src/story";
import StoryViewer from "./StoryViewer.tsx";
import "./stories.css";

type StoriesProps = {
  apiUrl?: string;
};

export default function Stories({
  apiUrl = "/api/content/stories",
}: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const json =
        (await response.json()) as StoriesResponse;

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error || "تعذّر تحميل الستوريات",
        );
      }

      setStories(json.items ?? []);
    } catch (error) {
      console.error("Load stories error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "تعذّر تحميل الستوريات",
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  if (loading) {
    return (
      <section
        className="stories-section"
        aria-label="الستوريات"
      >
        <div className="stories-loading">
          جاري تحميل الستوريات...
        </div>
      </section>
    );
  }

  if (error || stories.length === 0) {
    return null;
  }

  return (
    <>
      <section
        className="stories-section"
        aria-label="الستوريات"
      >
        <div className="stories-list">
          {stories.map((story, index) => (
            <button
              key={story.id}
              type="button"
              className="story-circle-button"
              onClick={() => setActiveIndex(index)}
              aria-label={
                story.title
                  ? `فتح ستوري ${story.title}`
                  : "فتح الستوري"
              }
            >
              <span className="story-circle-ring">
                <span className="story-circle-inner">
                  {story.media_type === "image" ? (
                    <img
                      src={story.media_url}
                      alt={story.title || "ستوري"}
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={story.media_url}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}
                </span>
              </span>

              <span className="story-circle-title">
                {story.title || "جديد"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}