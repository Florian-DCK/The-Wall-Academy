'use client';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@/i18n/routing';
import React, { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
// Highlight wrapper pour le bouton Gallery
const Highlight = ({ children }: { children: React.ReactNode }) => (
	<span className="text-white">{children}</span>
);
import type { EmblaOptionsType } from 'embla-carousel';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	Sparkles,
	Trophy,
	Video,
	Star,
	Users,
	Award,
	MessageSquare,
	Focus,
} from 'lucide-react';
import NakedLogo from '@/components/NakedLogo';
import BraboLogo from '@/components/BraboLogo';
import TaoLogo from '@/components/TaoLogo';
import FoodMakerLogo from '@/components/FoodMakerLogo';
import HilariousLogo from '@/components/HilariousLogo';
import { useScrollAnimation } from '../lib/useScrollAnimation';
import Link from 'next/link';
gsap.registerPlugin(ScrollTrigger);

const Carousel = dynamic(() => import('@/components/Carousel'), {
	ssr: false,
	loading: () => (
		<div className="flex h-full w-full items-center justify-center bg-black/10 text-white/70">
			Chargement...
		</div>
	),
});

const Testimony = dynamic(() => import('@/components/Testimony'));

const WhatIsItem = dynamic(() => import('@/components/WhatIsItem'));

const Home = () => {
	const t = useTranslations('Home');
	const lang = useLocale();
	const [isMenuOpen, setIsMenuOpen] = React.useState(false);

	const slideInLeftRef = useScrollAnimation({
		type: 'slideInLeft',
		duration: 1,
	}) as React.RefCallback<HTMLHeadingElement | null>;
	const slideInRightRef = useScrollAnimation({
		type: 'slideInRight',
		duration: 1,
	});
	const fadeInUpRef = useScrollAnimation({ type: 'fadeInUp', duration: 1 });

	const OPTIONS: EmblaOptionsType = {
		containScroll: false,
		loop: true,
		align: 'center',
	};
	const BrandSize = 150;
	const WhatIsItems = [
		{
			icon: Sparkles,
			title: 'atelierTitle',
			description: 'atelierDescription',
		},
		{
			icon: Trophy,
			title: 'wallTitle',
			description: 'wallDescription',
		},
		{
			icon: Video,
			title: 'videoTitle',
			description: 'videoDescription',
		},
		{
			icon: Star,
			title: 'experienceTitle',
			description: 'experienceDescription',
		},
		{
			icon: Users,
			title: 'smallGroupTitle',
			description: 'smallGroupDescription',
		},
		{
			icon: Award,
			title: 'staffTitle',
			description: 'staffDescription',
		},
		{
			icon: MessageSquare,
			title: 'coachingTitle',
			description: 'coachingDescription',
		},
		{
			icon: Focus,
			title: 'concentrationTitle',
			description: 'concentrationDescription',
		},
	];
	const testimonyChunks = {
		br: () => <br />,
	};
	const testimonys = [
		{
			key: 't1',
			image: '/stage_01.jpeg',
			testimony: t.rich('Carousel.captionChris', testimonyChunks),
			author: 'Chris U12',
		},
		{
			key: 't2',
			image: '/stage_02.jpeg',
			testimony: t.rich('Carousel.captionThomas', testimonyChunks),
			author: 'Thomas U14',
		},
		{
			key: 't3',
			image: '/stage_03.jpeg',
			testimony: t.rich('Carousel.captionCamille', testimonyChunks),
			author: 'Camille U15',
		},
		{
			key: 't4',
			image: '/stage_04.jpeg',
			testimony: t.rich('Carousel.captionCeline', testimonyChunks),
			author: 'Céline U16',
		},
		{
			key: 't5',
			image: '/stage_05.jpeg',
			testimony: t.rich('Carousel.captionHugo', testimonyChunks),
			author: 'Hugo U16',
		},
		{
			key: 't6',
			image: '/stage_06.jpeg',
			testimony: t.rich('Carousel.captionSarah', testimonyChunks),
			author: 'Sarah U16',
		},
	].map((item) => (
		<Testimony
			key={item.key}
			image={item.image}
			testimony={item.testimony}
			author={item.author}
		/>
	));
	const chunks = {
		br: () => <br />,
		highlight: (chunks: ReactNode) => (
			<span className="highlight">{chunks}</span>
		),
		strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
		faded: (chunks: ReactNode) => (
			<span className="text-gray-400">{chunks}</span>
		),
		small: (chunks: ReactNode) => (
			<small className="text-sm font-medium leading-tight block">
				{chunks}
			</small>
		),
	};

	useGSAP(() => {
		const items = gsap.utils.toArray<HTMLElement>('.whatIsItem');
		items.forEach((item) => {
			gsap.from(item, {
				scrollTrigger: {
					trigger: item,
					start: 'top 80%',
					end: 'bottom 20%',
					toggleActions: 'play none none reverse',
				},
				y: 50,
				opacity: 0,
				duration: 0.8,
				ease: 'power3.out',
			});
		});

		ScrollTrigger.create({
			trigger: '#whatIs',
			start: 'top+=80 top',
			end: () => {
				const list = document.getElementById('whatIsList');
				const title = document.getElementById('whatIsTitlePin');
				if (!list || !title) {
					return '+=0';
				}
				const distance = list.offsetHeight - title.offsetHeight;
				return `+=${Math.max(distance, 0)}`;
			},
			pin: '#whatIsTitlePin',
			pinSpacing: false,
			invalidateOnRefresh: true,
		});
	}, []);

	return (
		<main className="overflow-x-hidden">
			<section id="landing" className="h-screen bg-black grid grid-cols-2">
				<Image
					ref={fadeInUpRef}
					src={'/brandLogo.png'}
					alt={'The wall academy logo'}
					width={400}
					height={400}
					className="absolute top-8 left-10 w-20 lg:w-40 h-auto object-contain z-10"
				/>
				<div className="flex items-center lg:justify-end">
					<div className="relative h-full w-full overflow-hidden">
						<Image
							src="/vincent-vanasch-left-side.jpeg"
							alt="Vincent Vanasch"
							fill
							className="object-cover object-right z-5"
							priority
						/>
					</div>
				</div>
				<div className="flex flex-col justify-center gap-5">
					<h1
						ref={slideInLeftRef}
						className="text-3xl lg:text-8xl font-extrabold uppercase leading-6 lg:leading-18 text-white">
						{t.rich('title', {
							br: () => <br />,
							highlight: (chunks) => (
								<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
									{chunks}
								</span>
							),
						})}
					</h1>
					<div
						className={'flex flex-col w-20 lg:w-fit items-center gap-1 ml-2'}>
						<Image
							src={'/signature_VV.png'}
							alt="Signature of Vincent Vanasch"
							width={120}
							height={60}
							className="w-full aspect-120-60"
						/>
						<p className="italic uppercase text-xs lg:text-sm">
							Vincent Vanasch <strong>#21</strong>
						</p>
					</div>
				</div>
				<button
					type="button"
					className="absolute top-8 right-6 z-20 inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
					onClick={() => setIsMenuOpen((prev) => !prev)}
					aria-expanded={isMenuOpen}
					aria-controls="home-navigation">
					{isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
				</button>
				<nav
					id="home-navigation"
					className="absolute top-8 right-10 hidden gap-4 items-center md:flex">
					{SUPPORTED_LOCALES.filter((item) => item !== lang).map((item, i) => (
						<Link
							key={i}
							href={`/${item}`}
							className={'uppercase text-sm font-bold hover:underline'}>
							{item}
						</Link>
					))}
					<a href={`/${lang}/gallery`} className="ml-2">
						<Button
							className="rounded-full px-6 py-3 text-sm font-heading tracking-[0.12em] uppercase shadow-[0_20px_45px_rgba(241,90,36,0.35)] bg-gradient-to-r from-[#ff8218] via-[#f15a24] to-[#c3200f] text-white hover:brightness-110 active:scale-95 border-none"
							variant="default">
							<Highlight>Gallery</Highlight>
						</Button>
					</a>
					<a href={`/${lang}/about`} className="ml-2">
						<Button
							className="rounded-full px-6 py-3 text-sm font-heading tracking-[0.12em] uppercase shadow-[0_20px_45px_rgba(241,90,36,0.35)] bg-transparent from-[#ff8218] via-[#f15a24] to-[#c3200f] text-white hover:brightness-110 active:scale-95 border-none"
							variant="default">
							<Highlight>About</Highlight>
						</Button>
					</a>
				</nav>
				{isMenuOpen ? (
					<>
						<button
							type="button"
							className="fixed inset-0 z-10 bg-black/60 md:hidden"
							aria-label="Close menu"
							onClick={() => setIsMenuOpen(false)}
						/>
						<div className="absolute top-20 left-6 right-6 z-20 rounded-3xl border border-white/10 bg-black/80 px-6 py-5 text-white shadow-[0_25px_60px_rgba(0,0,0,0.55)] md:hidden">
							<nav className="flex flex-col items-center gap-3 text-xs font-heading tracking-[0.3em] uppercase">
								{SUPPORTED_LOCALES.filter((item) => item !== lang).map(
									(item, i) => (
										<a
											key={i}
											href={`/${item}`}
											className="w-full rounded-full border border-white/15 px-4 py-3 text-center text-white/80 transition hover:border-white/40 hover:text-white"
											onClick={() => setIsMenuOpen(false)}>
											{item}
										</a>
									)
								)}
								<a
									href={`/${lang}/gallery`}
									className="w-full"
									onClick={() => setIsMenuOpen(false)}>
									<Button
										className="w-full rounded-full px-6 py-3 text-sm font-heading tracking-[0.12em] uppercase shadow-[0_20px_45px_rgba(241,90,36,0.35)] bg-gradient-to-r from-[#ff8218] via-[#f15a24] to-[#c3200f] text-white hover:brightness-110 active:scale-95 border-none"
										variant="default">
										<Highlight>Gallery</Highlight>
									</Button>
								</a>
							</nav>
						</div>
					</>
				) : null}
			</section>
			<section
				id="mainCTA"
				className="min-h-screen bg-[#fdfcff] overflow-hidden text-black grid grid-cols-1 gap-8 lg:grid-cols-2 items-center-safe">
				<div className="order-2 flex flex-col overflow-hidden gap-8 lg:order-1">
					<h2
						ref={slideInRightRef}
						className={
							' text-3xl lg:text-4xl text-center lg:text-right font-extrabold uppercase'
						}>
						{t.rich('headline1', chunks)}
					</h2>
					<p
						ref={fadeInUpRef}
						className={' text-center lg:text-right text-2xl lg:text-3xl'}>
						{t.rich('description1', chunks)}
					</p>
					<Button
						className={
							'w-fit self-center-safe lg:self-end  text-lg font-bold shadow-none tracking-tight'
						}>
						{t('CTA')}
					</Button>
				</div>
				<div className="order-1 relative  flex h-96 lg:h-full flex-col justify-center bg-[rgb(253, 253, 253)] lg:order-2">
					<Image
						src={'/naked_VV.png'}
						alt={'Vincent Vanasch X Naked'}
						fill
						sizes="(max-width: 1024px) 100vw, 50vw"
						className={'object-contain'}
						priority
					/>
					<p
						className={
							'absolute top-20 -right-10 text-xs lg:text-base lg:top-25 lg:-right-5 transform-gpu -rotate-90 italic backdrop-blur-sm bg-black/40 px-2 py-1 rounded'
						}>
						Energized by <strong>NAKED</strong>
					</p>
				</div>
			</section>
			<section
				id="testimony"
				className="h-screen bg-white text-black grid-cols-2 flex items-center justify-center relative">
				<Carousel items={testimonys} options={OPTIONS} />
				<h2
					ref={slideInRightRef}
					className="absolute top-5 right-5 lg:top-20 lg:right-20 text-4xl text-right font-extrabold leading-7 uppercase backdrop-blur-md bg-white/20 px-4 py-2 rounded">
					{t.rich('testimonyCatchphrase', chunks)}
				</h2>
			</section>
			<section
				id="whatIs"
				className="min-h-screen mx-auto max-w-7xl py-20 px-6 lg:px-10 text-black">
				<div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<div className="relative">
						<div
							id="whatIsTitlePin"
							className="sticky top-0 lg:top-15 z-10 bg-white py-4 items-center flex w-full justify-end ">
							<Image
								className="shrink-0 h-full w-auto"
								src={'/casque_bauer.png'}
								width={100}
								height={100}
								alt="Casque Bauer"
							/>
							<h2 className="text-3xl font-extrabold uppercase text-right [&_div]:-mb-1">
								{t.rich('WhatIs.title', chunks)}
							</h2>
						</div>
					</div>
					<div id="whatIsList" className="relative z-0">
						<ul className="flex flex-col gap-20">
							{WhatIsItems.map((item, i) => (
								<WhatIsItem
									key={i}
									icon={item.icon}
									title={item.title}
									description={item.description}
									className={i % 2 === 1 ? 'ml-20' : ''}
								/>
							))}
						</ul>
					</div>
				</div>
			</section>
			<section
				id="campCTA"
				className="min-h-screen overflow-hidden text-black grid grid-cols-1 gap-8 lg:grid-cols-2 items-center-safe">
				<div className="order-2 flex flex-col overflow-hidden gap-8 lg:order-1 mb-10">
					<h2
						ref={slideInLeftRef}
						className={
							'text-3xl lg:text-4xl text-left ml-5 lg:ml-0 lg:text-right font-extrabold uppercase'
						}>
						{t.rich('headline2', chunks)}
					</h2>
					<p
						ref={fadeInUpRef}
						className={
							'text-left mx-5 lg:mx-0 lg:text-right text-2xl lg:text-3xl font-extrabold uppercase [&_div]:mb-0'
						}>
						{t.rich('description2', chunks)}
					</p>
					<Button
						className={
							'w-fit self-left-safe ml-5 lg:ml-0 lg:self-end text-lg font-bold shadow-none tracking-tight'
						}>
						{t('CTA')}
					</Button>
				</div>
				<div className="order-1 relative flex h-96 lg:h-full flex-col justify-center bg-[rgb(253, 253, 253)] lg:order-2">
					<Image
						src={'/tao_VV.jpeg'}
						alt={'Vincent Vanasch X Naked'}
						fill
						sizes="(max-width: 1024px) 100vw, 50vw"
						className={'object-cover'}
					/>
					<p
						className={
							'absolute top-20 -right-10 text-xs lg:text-base lg:top-25 lg:-right-5 transform-gpu -rotate-90 italic backdrop-blur-sm bg-black/40 px-2 py-1 rounded'
						}>
						Energized by <strong>TAO</strong>
					</p>
				</div>
			</section>
			<section id="video" className="w-full h-fit px-0 mt-10">
				<div className="relative w-full h-96 lg:h-[calc(100vh/1.2)] overflow-hidden">
					<iframe
						className="absolute top-0 left-0 w-full h-full"
						src="https://www.youtube.com/embed/dTm5ax1g5uE"
						title="YouTube video player"
						frameBorder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen></iframe>
				</div>
			</section>
			<section id="footer" className="bg-black min-h-screen pb-40">
				<div className={'grid h-dvh lg:h-full grid-cols-2'}>
					<div className="flex flex-col justify-center gap-5">
						<h3
							ref={slideInRightRef}
							className="text-3xl lg:text-8xl text-right font-extrabold uppercase leading-6 lg:leading-18 text-white">
							{t.rich('Footer.title', {
								br: () => <br />,
								highlight: (chunks) => (
									<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
										{chunks}
									</span>
								),
							})}
						</h3>
						<div
							className={'flex flex-col w-fit ml-auto items-center gap-1 mr-2'}>
							<Image
								src={'/signature_VV.png'}
								alt="Signature of Vincent Vanasch"
								width={120}
								height={60}
								className="w-full aspect-120-60"
							/>
							<p className="italic uppercase text-sm">
								Vincent Vanasch <strong>#21</strong>
							</p>
						</div>
					</div>
					<div className="flex items-center lg:justify-end">
						<div className="relative h-full w-full overflow-hidden">
							<Image
								src="/vincent_vanasch_footerBanner.jpeg"
								alt="Vincent Vanasch"
								fill
								className="object-cover object-left"
								priority
							/>
						</div>
					</div>
				</div>

				<div className="mt-10 flex flex-col items-center gap-8">
					<div className="flex flex-col items-center gap-4">
						<span className="uppercase text-sm text-white/70 tracking-[0.3em]">
							Follow me
						</span>
						<ul className="flex flex-wrap items-center justify-center gap-8 text-white/90">
							<li>
								<a
									href="https://twitter.com/vincvanasch21?lang=fr"
									target="_blank">
									<svg
										className="size-10 fill-white"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 640 640">
										<path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z" />
									</svg>
								</a>
							</li>
							<li>
								<a
									href="https://www.instagram.com/vincvanasch21/?hl=fr"
									target="_blank">
									<svg
										className="size-10 fill-white"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 640 640">
										<path d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z" />
									</svg>
								</a>
							</li>
							<li>
								<a
									href="https://www.facebook.com/VincentVanasch21/?locale=fr_FR"
									target="_blank">
									<svg
										className="size-10 fill-white"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 640 640">
										<path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L258.2 544L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96z" />
									</svg>
								</a>
							</li>
						</ul>
					</div>

					<div className="w-full">
						<ul className="grid grid-cols-1 gap-8 opacity-60 text-white sm:grid-cols-2 lg:flex lg:flex-row lg:gap-10 lg:w-fit lg:mx-auto">
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<NakedLogo width={BrandSize / 1.4} height={BrandSize / 1.4} />
								</div>
							</li>
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<BraboLogo width={BrandSize / 1.4} height={BrandSize / 1.4} />
								</div>
							</li>
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<TaoLogo width={BrandSize / 1.8} height={BrandSize / 1.8} />
								</div>
							</li>
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<FoodMakerLogo
										width={BrandSize / 1.8}
										height={BrandSize / 1.8}
									/>
								</div>
							</li>
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<div className="relative h-16 w-40 lg:h-24 lg:w-44">
										<Image
											src={'/hockey_player_logo.png'}
											alt={'Hockey Player'}
											fill
											className="object-contain"
											sizes="(max-width: 1024px) 160px, 176px"
											priority
										/>
									</div>
								</div>
							</li>
							<li>
								<div className="flex h-24 w-full items-center justify-center">
									<HilariousLogo
										width={BrandSize / 1.4}
										height={BrandSize / 1.4}
									/>
								</div>
							</li>
						</ul>
					</div>
				</div>
				<p className="justify-center text-center opacity-60">
					Made with 🧡 by Hilarious © 2025
				</p>
			</section>
		</main>
	);
};

export default Home;
