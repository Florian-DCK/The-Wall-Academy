import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../generated/prisma-client/client';

const prisma = new PrismaClient();
// GET /api/gallery

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const galleryParam = url.searchParams.get('gallery');

		// If a gallery query param is provided, try to return that specific gallery
		if (galleryParam) {
			// Try numeric id first
			const maybeId = Number(galleryParam);
			let galleryResult = null;

			if (!Number.isNaN(maybeId) && Number.isFinite(maybeId)) {
				galleryResult = await prisma.gallery.findUnique({
					where: { id: Math.trunc(maybeId) },
					select: { id: true, title: true, createdAt: true },
				});
			} else {
				// Fallback: search by title (case-sensitive). Adjust if you need case-insensitive.
				galleryResult = await prisma.gallery.findFirst({
					where: { title: galleryParam },
					select: { id: true, title: true, createdAt: true },
				});
			}

			if (!galleryResult) {
				return NextResponse.json(
					{ message: 'Gallery not found', gallery: galleryParam },
					{ status: 404 }
				);
			}

			return NextResponse.json(
				{ message: 'Gallery fetched successfully', data: galleryResult },
				{ status: 200 }
			);
		}

		// Otherwise return the list of galleries
		const galleries = await prisma.gallery.findMany({
			select: {
				id: true,
				title: true,
				createdAt: true,
			},
		});
		return NextResponse.json(
			{ message: 'Galleries fetched successfully', data: galleries },
			{ status: 200 }
		);
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: 'Error fetching galleries', error: errMsg },
			{ status: 500 }
		);
	}
}

// POST /api/gallery
export async function POST() {
	return NextResponse.json({ message: 'not implemented' }, { status: 501 });
}
