import React, { useEffect, useMemo, useState } from "react";
import { EmblaOptionsType } from "embla-carousel";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "./CarouselArrowButton";
import useEmblaCarousel from "embla-carousel-react";

type PropType = {
  // new: items can be an array of React nodes (e.g. <Testimony />)
  items?: React.ReactNode[];
  // backward compat: still accept slides (numbers)
  slides?: number[];
  options?: EmblaOptionsType;
};

const Carousel: React.FC<PropType> = (props) => {
  const { items, slides, options } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const totalSlides = useMemo(
    () => items?.length ?? slides?.length ?? 0,
    [items?.length, slides?.length]
  );
  const highlightedIndex = useMemo(() => {
    if (!totalSlides) return 0;
    if (isMobile) return selectedIndex;
    return (selectedIndex + 1) % totalSlides;
  }, [selectedIndex, totalSlides, isMobile]);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => {
      window.removeEventListener("resize", updateIsMobile);
    };
  }, []);

  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());

    onSelect();
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="embla relative w-full">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {items
            ? items.map((node, idx) => (
                <div
                  className={`embla__slide ${
                    totalSlides && idx === highlightedIndex ? "is-active" : ""
                  }`}
                  key={idx}
                >
                  <div className="embla__slide__content">{node}</div>
                </div>
              ))
            : (slides || []).map((index, idx) => (
                <div
                  className={`embla__slide ${
                    totalSlides && idx === highlightedIndex ? "is-active" : ""
                  }`}
                  key={index}
                >
                  <div className="embla__slide__number">{index + 1}</div>
                </div>
              ))}
        </div>
      </div>

      <PrevButton
        className={
          "absolute left-0 transform -translate-y-1/2 top-1/2 text-secondary"
        }
        onClick={onPrevButtonClick}
        disabled={prevBtnDisabled}
      />
      <NextButton
        className={
          " border absolute right-0 transform -translate-y-1/2 top-1/2 text-secondary"
        }
        onClick={onNextButtonClick}
        disabled={nextBtnDisabled}
      />
    </section>
  );
};

export default Carousel;
export { Carousel };
