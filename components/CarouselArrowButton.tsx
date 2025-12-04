import React, {
	ComponentPropsWithRef,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { EmblaCarouselType } from 'embla-carousel';
import Image from 'next/image';

type UsePrevNextButtonsType = {
	prevBtnDisabled: boolean;
	nextBtnDisabled: boolean;
	onPrevButtonClick: () => void;
	onNextButtonClick: () => void;
};

export const usePrevNextButtons = (
	emblaApi: EmblaCarouselType | undefined
): UsePrevNextButtonsType => {
	const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
	const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

	const onPrevButtonClick = useCallback(() => {
		if (!emblaApi) return;
		emblaApi.scrollPrev();
	}, [emblaApi]);

	const onNextButtonClick = useCallback(() => {
		if (!emblaApi) return;
		emblaApi.scrollNext();
	}, [emblaApi]);

	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		setPrevBtnDisabled(!emblaApi.canScrollPrev());
		setNextBtnDisabled(!emblaApi.canScrollNext());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		// exécuter l'appel initial hors du cycle de rendu pour éviter l'avertissement ESLint
		const raf = requestAnimationFrame(() => onSelect(emblaApi));
		emblaApi.on('reInit', onSelect).on('select', onSelect);

		return () => {
			cancelAnimationFrame(raf);
			emblaApi.off('reInit', onSelect).off('select', onSelect);
		};
	}, [emblaApi, onSelect]);

	return {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	};
};

type PropType = ComponentPropsWithRef<'button'>;
const ButtonSize = 50;

export const PrevButton: React.FC<PropType> = (props) => {
	const { children, className = '', ...restProps } = props;

	const classes = ['embla__button', 'embla__button--prev', className]
		.filter(Boolean)
		.join(' ');

	return (
		<button className={classes} type="button" {...restProps}>
			<Image
				className="hover:rotate-90 transition transform duration-200"
				src={'/arrow_VV.png'}
				width={ButtonSize}
				height={ButtonSize}
				alt="Navigation Arrow"
			/>
			{children}
		</button>
	);
};

export const NextButton: React.FC<PropType> = (props) => {
	const { children, className = '', ...restProps } = props;

	const classes = ['embla__button', 'embla__button--next', className]
		.filter(Boolean)
		.join(' ');

	return (
		<button className={classes} type="button" {...restProps}>
			<Image
				className=" scale-x-[-1] hover:-rotate-90 transition transform duration-200"
				src={'/arrow_VV.png'}
				width={ButtonSize}
				height={ButtonSize}
				alt="Navigation Arrow"
			/>
			{children}
		</button>
	);
};
