'use client';
'use client';

import Image from 'next/image';
import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
	Award,
	BookOpen,
	ChevronRight,
	Menu,
	Shield,
	Sparkles,
	Trophy,
	Users,
	X,
} from 'lucide-react';
import Link from 'next/link';

const Highlight = ({ children }: { children: React.ReactNode }) => (
	<span className="text-white">{children}</span>
);

const About = () => {
	const lang = useLocale();
	const t = useTranslations('AboutPage');
	const [isMenuOpen, setIsMenuOpen] = React.useState(false);
	const mottoRefs = React.useRef<HTMLSpanElement[]>([]);
	const richText = {
		strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
	};

	const highlights = [
		{
			title: 'highlights.items.0.title',
			body: 'highlights.items.0.body',
			icon: Shield,
		},
		{
			title: 'highlights.items.1.title',
			body: 'highlights.items.1.body',
			icon: Trophy,
		},
		{
			title: 'highlights.items.2.title',
			body: 'highlights.items.2.body',
			icon: Award,
		},
		{
			title: 'highlights.items.3.title',
			body: 'highlights.items.3.body',
			icon: Users,
		},
	];

	const clubs = [
		{
			club: 'clubs.items.0.name',
			details: 'clubs.items.0.detail',
			link: 'https://whitehockey.be/',
		},
		{
			club: 'clubs.items.1.name',
			details: 'clubs.items.1.detail',
			link: 'https://www.lepingouin.be/',
		},
		{
			club: 'clubs.items.2.name',
			details: 'clubs.items.2.detail',
			link: 'https://www.mywadu.be/',
		},
		{
			club: 'clubs.items.3.name',
			details: 'clubs.items.3.detail',
			link: 'https://www.hcoranje-rood.nl/',
		},
		{
			club: 'clubs.items.4.name',
			details: 'clubs.items.4.detail',
			link: 'https://www.mywadu.be/',
		},
		{
			club: 'clubs.items.5.name',
			details: 'clubs.items.5.detail',
			link: 'https://www.rot-weiss-koeln.de/',
		},
		{
			club: 'clubs.items.6.name',
			details: 'clubs.items.6.detail',
			link: 'https://oree.be/',
		},
		{
			club: 'clubs.items.7.name',
			details: 'clubs.items.7.detail',
			link: 'https://soormahockeyclub.com/',
		},
	];

	const olympicHighlights = [
		t('story.olympics.0'),
		t('story.olympics.1'),
		t('story.olympics.2'),
		t('story.olympics.3'),
	];

	const mottos = [t('hero.mottos.0'), t('hero.mottos.1')];

	useGSAP(() => {
		const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
		mottoRefs.current.forEach((el) => {
			if (!el) {
				return;
			}
			tl.set(el, { autoAlpha: 0 });
			tl.to(el, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }).to(
				el,
				{ autoAlpha: 0, duration: 0.9, ease: 'power2.in' },
				'+=2.4'
			);
		});
	}, []);

	return (
		<main className="overflow-x-hidden text-black bg-white">
			<section
				id="about-hero"
				className="relative min-h-screen bg-black text-white grid grid-cols-1 lg:grid-cols-2">
				<Link href="/" className="absolute top-6 left-6 z-10">
					<Image
						src={'/brandLogo.png'}
						alt={t('hero.logoAlt')}
						width={400}
						height={400}
						className="w-16 lg:w-28 h-auto object-contain"
					/>
				</Link>
				<div className="relative flex flex-col justify-center gap-6 px-6 py-24 lg:px-16">
					<div className="flex flex-col gap-6">
						<h1 className="text-4xl lg:text-7xl font-extrabold uppercase leading-[0.9]">
								{t('hero.titleFirst')}
								<br />
								<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
									{t('hero.titleLast')}
								</span>
							</h1>
						<div className="flex flex-col gap-2">
							{mottos.map((motto, index) => (
								<span
									key={motto}
									ref={(el) => {
										if (el) {
											mottoRefs.current[index] = el;
										}
									}}
									className="text-left text-xs lg:text-sm font-semibold uppercase tracking-[0.25em] text-white/70 opacity-0">
									{motto}
								</span>
							))}
						</div>
					</div>
					<p className="text-lg lg:text-2xl text-white/80 max-w-xl">
						{t.rich('hero.subtitle', richText)}
					</p>
					<div className="flex flex-wrap items-center gap-4">
						<a
							href="#story"
							className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 hover:text-white">
							<span>{t('hero.discover')}</span>
							<ChevronRight className="size-4" />
						</a>
					</div>
				</div>
				<div className="relative min-h-[50vh] lg:min-h-screen">
					<Image
						src="/vincent-vanasch-left-side.jpeg"
						alt={t('hero.portraitAlt')}
						fill
						className="object-cover object-right"
						priority
					/>
					<div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
				</div>

				<button
					type="button"
					className="absolute top-8 right-6 z-20 inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
					onClick={() => setIsMenuOpen((prev) => !prev)}
					aria-expanded={isMenuOpen}
					aria-controls="about-navigation">
					{isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
				</button>
				<nav
					id="about-navigation"
					className="absolute top-8 right-10 hidden gap-4 items-center md:flex">
					{SUPPORTED_LOCALES.filter((item) => item !== lang).map((item) => (
						<a
							key={item}
							href={`/${item}/about`}
							className="uppercase text-sm font-bold text-white hover:underline">
							{item}
						</a>
					))}
					<a href={`/${lang}/gallery`} className="ml-2">
						<Button
							className="rounded-full px-6 py-3 text-sm font-heading tracking-[0.12em] uppercase shadow-[0_20px_45px_rgba(241,90,36,0.35)] bg-gradient-to-r from-[#ff8218] via-[#f15a24] to-[#c3200f] text-white hover:brightness-110 active:scale-95 border-none"
							variant="default">
							<Highlight>{t('hero.galleryCta')}</Highlight>
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
									(item) => (
										<a
											key={item}
											href={`/${item}/about`}
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
										<Highlight>{t('hero.galleryCta')}</Highlight>
									</Button>
								</a>
							</nav>
						</div>
					</>
				) : null}
			</section>

			<section id="story" className="bg-[#fdfcff] py-20">
				<div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 lg:px-10">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
						<h2 className="text-3xl lg:text-5xl font-extrabold uppercase">
						{t('story.titleLine1')}
						<br />
						<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
							{t('story.titleLine2')}
						</span>
					</h2>
						<p className="max-w-xl text-lg text-black/70">
						{t('story.intro')}
					</p>
					</div>
					<div className="grid gap-8 lg:grid-cols-2">
						<p className="text-xl leading-relaxed">
							{t.rich('story.body', richText)}
						</p>
						<div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
							<p className="text-sm font-semibold uppercase tracking-[0.3em] text-black/40">
						{t('story.olympicsTitle')}
					</p>
							<ul className="mt-6 space-y-4 text-lg font-semibold">
								{olympicHighlights.map((item) => (
									<li
										key={item}
										className="flex items-center gap-3 text-black/80">
										<Sparkles className="size-5 text-secondary" />
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			<section id="highlights" className="py-20">
				<div className="mx-auto max-w-6xl px-6 lg:px-10">
					<div className="flex flex-col gap-10">
						<h2 className="text-3xl lg:text-5xl font-extrabold uppercase">
						{t('highlights.titleLine1')}
						<br />
						<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
							{t('highlights.titleLine2')}
						</span>
					</h2>
						<ul className="flex flex-col gap-14">
							{highlights.map((item, index) => {
								const Icon = item.icon;
								return (
									<li
										key={t(item.title)}
										className={`whatIsItem ${index % 2 === 1 ? 'ml-20' : ''}`}>
										<div className="whatIsItemHeader flex gap-4">
											<Icon className="size-7 icon-gradient" />
											<h3 className="whatIsItemTitle text-xl font-bold mb-2">
												{t(item.title)}
											</h3>
										</div>
										<p className="whatIsItemDescription text-black">
											{t(item.body)}
										</p>
										<hr className="w-1/3 mt-4 border-2 rounded-full" />
									</li>
								);
							})}
						</ul>
					</div>
				</div>
			</section>

			<section id="clubs" className="bg-black py-20 text-white">
				<div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 lg:px-10">
					<div className="flex flex-col gap-4">
						<h2 className="text-3xl lg:text-5xl font-extrabold uppercase">
						{t('clubs.titleLine1')}
						<br />
						<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
							{t('clubs.titleLine2')}
						</span>
					</h2>
					</div>
					<div className="relative">
						<div className="absolute left-3 top-0 h-full w-px bg-linear-to-b from-secondary/70 via-white/30 to-transparent" />
						<ul className="flex flex-col gap-10 pl-12">
							{clubs.map((club) => (
								<li key={t(club.club)} className="relative">
									<span className="absolute -left-[2.7rem] top-2 size-3 rounded-full bg-secondary shadow-[0_0_0_6px_rgba(241,90,36,0.2)]" />
									<div className="flex flex-col gap-2 border-b border-white/10 pb-8">
										<h3 className="text-2xl font-extrabold uppercase tracking-wide">
											{t(club.club)}
										</h3>
										<p className="text-sm text-white/70 max-w-2xl">
											{t(club.details)}
										</p>
										<a
											href={club.link}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 hover:text-white">
											<span>{t('clubs.linkLabel')}</span>
											<ChevronRight className="size-4" />
										</a>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section id="book" className="py-20">
				<div className="mx-auto max-w-6xl px-6 lg:px-10">
					<div className="grid gap-10">
						<div>
							<div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start text-right">
								<div>
									<h2 className="mt-4 text-3xl lg:text-4xl font-extrabold uppercase">
								{t('book.titleLine1')}
								<br />
								<span className="bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
									{t('book.titleLine2')}
								</span>
							</h2>
									<p className="mt-6 text-base leading-relaxed text-black/70">
								{t('book.paragraph1')}
							</p>
									<p className="mt-4 text-base leading-relaxed text-black/70">
								{t('book.paragraph2')}
							</p>
									<a
										href="https://www.fr.fnac.be/a18158813/V-Vanasch-The-wall-la-biographie-autorisee-du-meilleur-gardien-de-hock?"
										target="_blank"
										rel="noreferrer"
										className="mt-6 inline-flex items-center gap-3 rounded-full border border-black/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30">
										<BookOpen className="size-4" />
										{t('book.cta')}
									</a>
								</div>
								<div className="flex items-center justify-center">
									<Image
										src="/TheWall.png"
										alt={t('book.coverAlt')}
										width={520}
										height={740}
										className="h-auto w-full max-w-md object-contain"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
};

export default About;
