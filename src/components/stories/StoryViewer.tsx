import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Story } from "../../pages/src/story.ts";

type StoryViewerProps = {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
};

const IMAGE_DURATION = 5000;

export default function StoryViewer({
  stories,
  initialIndex,
  onClose,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] =
    useState(initialIndex);

  const [progress, setProgress] = useState(0);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const currentStory = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex >= stories.length - 1) {
      onClose();
      return;
    }

    setCurrentIndex((value) => value + 1);
  }, [currentIndex, stories.length, onClose]);

  const goPrevious = useCallback(() => {
    if (currentIndex <= 0) {
      setProgress(0);
      return;
    }

    setCurrentIndex((value) => value - 1);
  }, [currentIndex]);

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    if (!currentStory) return;

    if (currentStory.media_type !== "image") {
      return;
    }

    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;

      const nextProgress = Math.min(
        100,
        (elapsed / IMAGE_DURATION) * 100,
      );

      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(intervalId);
        goNext();
      }
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentStory, goNext]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
if (event.key === "ArrowRight") {
  goNext();
}

if (event.key === "ArrowLeft") {
  goPrevious();
}
    }

    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [goNext, goPrevious, onClose]);

  if (!currentStory) {
    return null;
  }

  function handleVideoTimeUpdate() {
    const video = videoRef.current;

    if (!video || !video.duration) {
      return;
    }

    setProgress(
      Math.min(
        100,
        (video.currentTime / video.duration) * 100,
      ),
    );
  }

  return (
    <div
      className="story-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="عارض الستوريات"
    >
      <div className="story-viewer">
        <div className="story-progress-group">
          {stories.map((story, index) => {
            let width = 0;

            if (index < currentIndex) {
              width = 100;
            } else if (index === currentIndex) {
              width = progress;
            }

            return (
              <span
                key={story.id}
                className="story-progress-track"
              >
                <span
                  className="story-progress-value"
                  style={{
                    width: `${width}%`,
                  }}
                />
              </span>
            );
          })}
        </div>

        <div className="story-viewer-header">
          <div>
            {currentStory.title && (
              <strong>{currentStory.title}</strong>
            )}
          </div>

         <button
  type="button"
  className="story-close-button"
  onPointerDown={(event) => {
    event.stopPropagation();
  }}
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }}
  aria-label="إغلاق الستوري"
>
  ×
</button>
        </div>

<button
  type="button"
  className="story-navigation-area story-navigation-previous"
  onClick={goPrevious}
  onMouseUp={(event) => event.currentTarget.blur()}
  aria-label="الستوري السابقة"
  tabIndex={-1}
/>

<button
  type="button"
  className="story-navigation-area story-navigation-next"
  onClick={goNext}
  onMouseUp={(event) => event.currentTarget.blur()}
  aria-label="الستوري التالية"
  tabIndex={-1}
/>

        <div className="story-media-container">
          {currentStory.media_type === "image" ? (
            <img
              src={currentStory.media_url}
              alt={currentStory.title || "ستوري"}
              className="story-viewer-media"
            />
          ) : (
            <video
              ref={videoRef}
              key={currentStory.id}
              src={currentStory.media_url}
              className="story-viewer-media"
              autoPlay
              playsInline
              controls={false}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={goNext}
              onError={goNext}
            />
          )}
        </div>
        {currentStory.link_url && (
          <button
            type="button"
            className="story-link-button"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              const url = currentStory.link_url;

              if (!url) return;

              if (
                url.startsWith("http://") ||
                url.startsWith("https://")
              ) {
                window.open(
                  url,
                  "_blank",
                  "noopener,noreferrer",
                );
              } else {
                window.location.href = url;
              }
            }}
          >
            <span aria-hidden="true">🔗</span>

            {currentStory.link_text || "شاهد الحلقة"}
          </button>
        )}
        {currentStory.caption && (
          <div className="story-caption">
            {currentStory.caption}
          </div>
        )}
        
      </div>
    </div>
  );
}