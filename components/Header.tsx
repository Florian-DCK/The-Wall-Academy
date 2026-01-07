'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

type HeaderProps = {
	isConnected?: boolean;
};

const Header: React.FC<HeaderProps> = ({ isConnected = false }) => {
	const t = useTranslations('Header');
	const [isMenuOpen, setIsMenuOpen] = React.useState(false);

	const handleToggleMenu = () => setIsMenuOpen((prev) => !prev);

	const locales = [
		{ code: 'en', label: 'EN' },
		{ code: 'fr', label: 'FR' },
		{ code: 'nl', label: 'NL' },
	];
	const locale = useLocale(); // from next-intl or your own context
	const pathname = usePathname();
	const isHome = pathname === `/${locale}`;
	const buildLocalizedPath = (nextLocale: string) => {
		if (!pathname) {
			return `/${nextLocale}`;
		}

		const segments = pathname.split('/').filter(Boolean);
		if (segments.length === 0) {
			return `/${nextLocale}`;
		}

		segments[0] = nextLocale;
		return `/${segments.join('/')}`;
	};

	return (
		<header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/85 backdrop-blur-2xl">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
				<Link href="/" className="flex items-center gap-4">
					<span className="relative flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff8218] via-[#f15a24] to-[#c3200f] shadow-[0_15px_45px_rgba(241,90,36,0.45)]">
						<Image
							src="/brandLogo.png"
							alt="Brand Logo"
							width={40}
							height={40}
							className="object-contain"
						/>
					</span>
					<div className="leading-tight hidden lg:block">
						<p className="text-xs uppercase tracking-[0.4em] text-white/70">
							The Wall Academy
						</p>
						<span className="font-heading text-2xl text-white">Gallery</span>
					</div>
				</Link>

				<button
					type="button"
					className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
					onClick={handleToggleMenu}
					aria-expanded={isMenuOpen}
					aria-controls="header-navigation">
					<Menu className="size-5" />
				</button>

				<div
					id="header-navigation"
					className={cn(
						'ml-auto hidden flex-col items-center gap-5 rounded-3xl border border-white/10 bg-[#070a12]/90 px-6 py-5 text-white shadow-[0_25px_60px_rgba(0,0,0,0.55)] md:flex md:flex-row md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none'
					)}>
					<nav className="flex items-center gap-4 text-xs font-heading tracking-[0.3em] uppercase md:gap-6">
						{locales.map((locale) => (
							<Link
								key={locale.code}
								href={buildLocalizedPath(locale.code)}
								className="rounded-full border border-white/15 px-4 py-2 text-white/80 transition hover:border-white/40 hover:text-white">
								{locale.label}
							</Link>
						))}
					</nav>
					<div className="flex items-center gap-3">
						{isHome ? (
							''
						) : (
							<Button className="w-full md:w-auto" asChild>
								<Link href="/gallery">{t('connect')}</Link>
							</Button>
						)}
					</div>
				</div>
			</div>
			{isMenuOpen ? (
				<div className="md:hidden">
					<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 sm:px-6">
						<nav className="flex flex-col gap-3 text-xs font-heading tracking-[0.3em] uppercase">
							{locales.map((locale) => (
								<Link
									key={locale.code}
									href={buildLocalizedPath(locale.code)}
									className="rounded-full border border-white/15 px-4 py-3 text-center text-white/80 transition hover:border-white/40 hover:text-white"
									onClick={() => setIsMenuOpen(false)}>
									{locale.label}
								</Link>
							))}
						</nav>
						{isHome ? null : (
							<Button className="w-full" asChild>
								<Link href="/gallery" onClick={() => setIsMenuOpen(false)}>
									{t('connect')}
								</Link>
							</Button>
						)}
					</div>
				</div>
			) : null}
		</header>
	);
};

export default Header;
