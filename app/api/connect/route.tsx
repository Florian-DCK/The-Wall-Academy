import { NextResponse } from 'next/server';
import { createSession } from '@/app/lib/session';

import { PrismaClient } from '../../generated/prisma-client/client';
const prisma = new PrismaClient();

export async function POST(request: Request) {
	try {
		const { id, password } = await request.json();

		if (!id || !password) {
			return NextResponse.json(
				{ message: 'id and password are required' },
				{ status: 400 }
			);
		}

		// La c'est pas super super sécurisé mais ça devrait aller
		const galleryInfo = await prisma.gallery.findFirst({
			where: { id: parseInt(id), password: password },
		});

		if (!galleryInfo) {
			return NextResponse.json(
				{ message: 'Gallery not found' },
				{ status: 404 }
			);
		} else {
			await createSession(id.toString());
			return NextResponse.json(
				{ message: 'Connected to the gallery', data: galleryInfo },
				{ status: 200 }
			);
		}
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: 'Error connecting to the gallery', error: errMsg },
			{ status: 500 }
		);
	}
}
