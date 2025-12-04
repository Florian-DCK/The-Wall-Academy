import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const testMode = searchParams.get('test') === 'true';
	// 1. Récupération sécurisée du token et de l'ID d'organisation
	const token = process.env.EVENT_BRITE_TOKEN;
	const orgId = process.env.EVENT_BRITE_ORGANIZATION_ID;

	if (!token || !orgId) {
		return NextResponse.json(
			{ error: 'Configuration Error: Missing API Token or Organization ID' },
			{ status: 500 }
		);
	}

	// 2. Construction de l'URL de l'API Eventbrite avec les filtres
	const apiUrl = `${EVENTBRITE_API_URL}/organizations/${orgId}/events/?status=live&expand=ticket_classes`;

	try {
		// 3. Appel de l'API Eventbrite (côté serveur)
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				// Envoi sécurisé du token dans l'en-tête
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			cache: 'no-store',
		});

		if (!response.ok) {
			// Gérer les erreurs de l'API Eventbrite (ex: 404, 401)
			const errorData = await response.json();
			console.error('Eventbrite API Error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to fetch events from Eventbrite', details: errorData },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// 4. Filtrer les événements
		const now = new Date();
		let filteredEvents = data.events as unknown[];

		if (testMode) {
			// Mode test: prendre le dernier événement en date peu importe s'il est terminé
			filteredEvents.sort((a: unknown, b: unknown) => {
				const aData = a as Record<string, unknown>;
				const bData = b as Record<string, unknown>;
				const aEndData = aData.end as Record<string, string>;
				const bEndData = bData.end as Record<string, string>;
				const aEnd = new Date(aEndData.utc);
				const bEnd = new Date(bEndData.utc);
				return bEnd.getTime() - aEnd.getTime();
			});
			filteredEvents = filteredEvents.slice(0, 1);
		} else {
			// Mode normal: filtrer les événements qui sont actuellement en cours (pas terminés)
			filteredEvents = filteredEvents.filter((event: unknown) => {
				const e = event as Record<string, unknown>;
				const endData = e.end as Record<string, string>;
				const eventEnd = new Date(endData.utc);
				return eventEnd > now;
			});
		}

		// 5. Calcul de la disponibilité (Optionnel: pour alléger le client)
		const processedEvents = filteredEvents.map((event: unknown) => {
			const e = event as Record<string, unknown>;
			let remainingTickets = 0;

			const ticketClasses = e.ticket_classes as unknown[];
			if (ticketClasses) {
				remainingTickets = ticketClasses.reduce(
					(sum: number, ticketClass: unknown) => {
						const tc = ticketClass as Record<string, number>;
						const total = tc.quantity_total || 0;
						const sold = tc.quantity_sold || 0;
						return sum + (total - sold);
					},
					0
				);
			}

			const name = e.name as Record<string, string>;
			const start = e.start as Record<string, string>;
			const end = e.end as Record<string, string>;
			return {
				id: e.id,
				name: name.text,
				url: e.url,
				start: start.local,
				end: end.local,
				remaining_tickets: remainingTickets,
			};
		});

		// 6. Retour des données traitées au client
		return NextResponse.json({ events: processedEvents });
	} catch (error) {
		console.error('Server error during fetch:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
