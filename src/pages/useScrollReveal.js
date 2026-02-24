import { useEffect, useRef, useState } from "react";

export default function useScrollReveal() {
  const ref = useRef(null);
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const element = ref.current;
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const inView =
            rect.top < window.innerHeight && rect.bottom > 0;

          if (inView) {
            setAnimateKey(prev => prev + 1); 
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return [ref, animateKey];
}