'use client';

import { useEffect, useState } from 'react';
import { SplitFlap } from 'react-split-flap';
import { useTranslations } from 'next-intl';

interface Event {
	id: string;
	name: string;
	url: string;
	start: string;
	end: string;
	remaining_tickets: number;
}

export default function EventBanner() {
	const [event, setEvent] = useState<Event | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const t = useTranslations('EventBanner');

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const response = await fetch('/api/events?test=true');
				if (!response.ok) {
					throw new Error('Failed to fetch events');
				}

				const data = await response.json();

				// Prendre le premier événement en cours
				if (data.events && data.events.length > 0) {
					setEvent(data.events[0]);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error');
				console.error('Error fetching events:', err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchEvents();
	}, []);

	if (isLoading || !event) {
		return null;
	}

	if (error) {
		return null;
	}

	// Formatter la date de l'événement
	const formatDateRange = () => {
		const startDate = new Date(event.start);
		const endDate = new Date(event.end);

		const startDay = startDate.getDate();
		const startMonth = startDate.getMonth();
		const endDay = endDate.getDate();
		const endMonth = endDate.getMonth();

		const monthName = (date: Date) =>
			date.toLocaleDateString('fr-FR', { month: 'long' });

		// Si même mois, afficher: "du jour au jour Mois"
		if (startMonth === endMonth) {
			return `${t('FROM')} ${startDay} ${t('TO')} ${endDay} ${monthName(
				startDate
			)}`;
		}

		// Sinon: "du jour Mois au jour Mois"
		return `${t('FROM')} ${startDay} ${monthName(startDate)} ${t(
			'TO'
		)} ${endDay} ${monthName(endDate)}`;
	};

	return (
		<div
			className={`fixed bottom-0 left-0 h-30 lg:flex justify-center items-center right-0 z-50 bg-linear-to-r from-secondary to-primary text-white`}>
			<div className="px-4 py-3 flex items-center justify-center gap-2 lg:gap-8 flex-col lg:flex-row">
				<div className="items-center gap-2 text-lg font-extrabold hidden md:flex">
					<span>{t('REMAINING')}</span>
					<SplitFlap
						value={String(event.remaining_tickets)}
						length={2}
						timing={200}
					/>
					<span>{t('PLACES')}</span>
				</div>

				<a
					href={event.url}
					target="_blank"
					rel="noopener noreferrer"
					className="px-6 py-2 bg-white text-orange-500 rounded-full text-xl lg:text-2xl font-bold hover:bg-opacity-90 transition whitespace-nowrap">
					{t('BOOK_NOW')}
				</a>

				<div className="text-lg font-extrabold whitespace-nowrap">
					{formatDateRange()}
				</div>
			</div>
		</div>
	);
}
