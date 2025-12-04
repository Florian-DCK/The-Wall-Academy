import React, { useEffect, useMemo, useState } from 'react';
import { EmblaOptionsType } from 'embla-carousel';
import {
	PrevButton,
	NextButton,
	usePrevNextButtons,
} from './CarouselArrowButton';
import useEmblaCarousel from 'embla-carousel-react';

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
	const totalSlides = useMemo(
		() => items?.length ?? slides?.length ?? 0,
		[items?.length, slides?.length]
	);
	const highlightedIndex = useMemo(() => {
		if (!totalSlides) return 0;
		return selectedIndex;
	}, [selectedIndex, totalSlides]);

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
		emblaApi.on('select', onSelect);

		return () => {
			emblaApi.off('select', onSelect);
		};
	}, [emblaApi]);

	return (
		<section className="embla relative w-full">
			<div className="embla__viewport" ref={emblaRef}>
				<div className="embla__container ">
					{items
						? items.map((node, idx) => (
								<div
									className={`embla__slide transition-opacity duration-200 ${
										totalSlides && idx === highlightedIndex ? 'is-active' : ''
									}`}
									key={idx}>
									<div className="embla__slide__content">{node}</div>
								</div>
						  ))
						: (slides || []).map((index, idx) => (
								<div
									className={`embla__slide ${
										totalSlides && idx === highlightedIndex ? 'is-active' : ''
									}`}
									key={index}>
									<div className="embla__slide__number">{index + 1}</div>
								</div>
						  ))}
				</div>
			</div>

			<PrevButton
				className={
					'absolute left-0 lg:-left-40 transform -translate-y-1/2 top-1/2 text-secondary'
				}
				onClick={onPrevButtonClick}
				disabled={prevBtnDisabled}
				aria-label="Button previous Caroussel"
			/>
			<NextButton
				className={
					' border absolute right-0 lg:-right-40 transform -translate-y-1/2 top-1/2 text-secondary'
				}
				onClick={onNextButtonClick}
				disabled={nextBtnDisabled}
				aria-label="Button next Caroussel"
			/>
		</section>
	);
};

export default Carousel;
export { Carousel };
