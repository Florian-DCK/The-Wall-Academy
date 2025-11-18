import path from 'node:path';
import { promises as fs } from 'node:fs';

import imageSize from 'image-size';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { PrismaClient } from '../../generated/prisma-client/client';
import { decrypt } from '@/app/lib/session';

const prisma = new PrismaClient();
const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|bmp|tiff)$/i;
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const PAGE_SIZE = 20;

type ImagePayload = {
	largeURL: string;
	thumbnailURL: string;
	width: number;
	height: number;
};

const resolveFolderPath = (storedPath: string) => {
	const normalized = storedPath.trim();
	if (!normalized) {
		return null;
	}
	return path.isAbsolute(normalized)
		? path.normalize(normalized)
		: path.normalize(path.join(PUBLIC_ROOT, normalized));
};

const buildImageUrl = (galleryId: number, fileName: string) =>
	`/api/images?galleryId=${galleryId}&file=${encodeURIComponent(fileName)}`;

const getMimeType = (filePath: string) => {
	switch (path.extname(filePath).toLowerCase()) {
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.gif':
			return 'image/gif';
		case '.webp':
			return 'image/webp';
		case '.bmp':
			return 'image/bmp';
		case '.tiff':
		case '.tif':
			return 'image/tiff';
		default:
			return 'application/octet-stream';
	}
};

async function listImages(folderPath: string, galleryId: number) {
	const files = await fs.readdir(folderPath);
	const images: ImagePayload[] = [];

	for (const file of files) {
		if (!IMAGE_EXT.test(file)) {
			continue;
		}
		const absoluteFile = path.join(folderPath, file);
		const stat = await fs.stat(absoluteFile);
		if (!stat.isFile()) {
			continue;
		}

		let dimensions;
		try {
			const fileBuffer = await fs.readFile(absoluteFile);
			dimensions = imageSize(fileBuffer);
		} catch (error) {
			console.error('Failed to read image dimensions', error);
			continue;
		}

		const width = dimensions.width ?? 0;
		const height = dimensions.height ?? 0;
		if (!width || !height) {
			continue;
		}

		const url = buildImageUrl(galleryId, file);
		images.push({
			largeURL: url,
			thumbnailURL: url,
			width,
			height,
		});
	}

	return images;
}

const assertFileWithinFolder = (folderPath: string, fileName: string) => {
	if (!fileName || fileName.includes('..') || /[\\/]/.test(fileName)) {
		return null;
	}
	const absolutePath = path.normalize(path.join(folderPath, fileName));
	const folderWithSep = folderPath.endsWith(path.sep)
		? folderPath
		: folderPath + path.sep;
	if (!absolutePath.toLowerCase().startsWith(folderWithSep.toLowerCase())) {
		return null;
	}
	return absolutePath;
};

const serveImageFile = async (folderPath: string, fileName: string) => {
	const targetFile = assertFileWithinFolder(folderPath, fileName);
	if (!targetFile) {
		return NextResponse.json({ message: 'Invalid file path' }, { status: 400 });
	}

	const stat = await fs.stat(targetFile).catch(() => null);
	if (!stat || !stat.isFile()) {
		return NextResponse.json({ message: 'Image not found' }, { status: 404 });
	}

	const buffer = await fs.readFile(targetFile);
	return new NextResponse(buffer, {
		headers: {
			'Content-Type': getMimeType(targetFile),
			'Cache-Control': 'public, max-age=60',
		},
	});
};

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const galleryParam =
			url.searchParams.get('galleryId') ?? url.searchParams.get('gallery');
		const pageParam = url.searchParams.get('page');
		const page = pageParam ? Number(pageParam) : 1;

		if (!galleryParam) {
			return NextResponse.json(
				{ message: 'galleryId query parameter is required' },
				{ status: 400 }
			);
		}

		const galleryId = Number(galleryParam);
		if (!Number.isFinite(galleryId) || galleryId <= 0) {
			return NextResponse.json(
				{ message: 'galleryId must be a positive number' },
				{ status: 400 }
			);
		}

		if (!Number.isFinite(page) || page <= 0) {
			return NextResponse.json(
				{ message: 'page must be a positive number' },
				{ status: 400 }
			);
		}

		const cookieStore = await cookies();
		const sessionToken = cookieStore.get('session')?.value;
		if (!sessionToken) {
			return NextResponse.json(
				{ message: 'Not authenticated' },
				{ status: 401 }
			);
		}

		const payload = await decrypt(sessionToken);
		const sessionGalleryId = payload?.GalleryId
			? Number(payload.GalleryId)
			: null;
		if (!sessionGalleryId || sessionGalleryId !== galleryId) {
			return NextResponse.json(
				{ message: 'Forbidden for this gallery' },
				{ status: 403 }
			);
		}

		const galleryRecord = await prisma.gallery.findUnique({
			where: { id: galleryId },
			select: { id: true, photosPath: true },
		});

		if (!galleryRecord) {
			return NextResponse.json(
				{ message: 'Gallery not found', galleryId },
				{ status: 404 }
			);
		}

		if (!galleryRecord.photosPath) {
			return NextResponse.json(
				{ message: 'Gallery has no photo directory configured' },
				{ status: 422 }
			);
		}

		const folderPath = resolveFolderPath(galleryRecord.photosPath);
		if (!folderPath) {
			return NextResponse.json(
				{ message: 'Stored path is invalid' },
				{ status: 422 }
			);
		}

		const normalizedFolderPath = path.normalize(folderPath);
		const folderStat = await fs.stat(normalizedFolderPath).catch(() => null);
		if (!folderStat || !folderStat.isDirectory()) {
			return NextResponse.json(
				{
					message: 'Gallery directory does not exist',
					path: galleryRecord.photosPath,
				},
				{ status: 404 }
			);
		}

		const fileName = url.searchParams.get('file');
		if (fileName) {
			return serveImageFile(normalizedFolderPath, fileName);
		}

		const images = await listImages(normalizedFolderPath, galleryId);
		const startIndex = (page - 1) * PAGE_SIZE;
		const paginatedImages = images.slice(startIndex, startIndex + PAGE_SIZE);
		const total = images.length;
		const totalPages = Math.ceil(total / PAGE_SIZE);
		return NextResponse.json(
			{
				message: 'Images fetched successfully',
				data: paginatedImages,
				pagination: {
					page,
					pageSize: PAGE_SIZE,
					total,
					totalPages,
					hasNext: startIndex + PAGE_SIZE < total,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: 'Unable to fetch images', error: errMsg },
			{ status: 500 }
		);
	}
}
