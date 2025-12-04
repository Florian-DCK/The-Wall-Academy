import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type AnimationType =
	| 'slideInLeft'
	| 'slideInRight'
	| 'fadeInUp'
	| 'fadeInDown'
	| 'scaleIn';

interface UseScrollAnimationProps {
	type?: AnimationType;
	duration?: number;
	delay?: number;
	stagger?: number;
}

const animationConfigs = {
	slideInLeft: { x: -100, opacity: 0 },
	slideInRight: { x: 100, opacity: 0 },
	fadeInUp: { y: 30, opacity: 0 },
	fadeInDown: { y: -30, opacity: 0 },
	scaleIn: { scale: 0.95, opacity: 0 },
};

export const useScrollAnimation = ({
	type = 'fadeInUp',
	duration = 0.6,
	delay = 0,
	stagger = 0,
}: UseScrollAnimationProps = {}) => {
	const elementsRef = useRef<HTMLElement[]>([]);

	useEffect(() => {
		const elements = elementsRef.current;
		if (elements.length === 0) return;

		const config = animationConfigs[type];

		elements.forEach((element, index) => {
			gsap.fromTo(
				element,
				{ ...config },
				{
					...Object.keys(config).reduce((acc, key) => {
						if (key === 'x' || key === 'y') acc[key] = 0;
						else if (key === 'opacity') acc[key] = 1;
						else if (key === 'scale') acc[key] = 1;
						return acc;
					}, {} as Record<string, number>),
					duration,
					delay: delay + index * stagger,
					scrollTrigger: {
						trigger: element,
						start: 'top 80%',
						toggleActions: 'play none none none',
					},
				}
			);
		});

		return () => {
			ScrollTrigger.getAll().forEach((trigger) => {
				if (elements.includes(trigger.trigger as HTMLElement)) {
					trigger.kill();
				}
			});
		};
	}, [type, duration, delay, stagger]);

	const ref = useCallback((element: HTMLElement | null) => {
		if (element) {
			if (!elementsRef.current.includes(element)) {
				elementsRef.current.push(element);
			}
		}
	}, []);

	return ref;
};
