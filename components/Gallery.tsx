'use client';
import { useEffect } from 'react';
import React from 'react';

import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import Image from 'next/image';

type props = {
	childrens?: React.ReactNode;
	galleryID: string;
	images: Array<{
		largeURL: string;
		thumbnailURL: string;
		width: number;
		height: number;
	}>;
};

const normalizeGalleryId = (rawId: string) => {
	const trimmed = rawId.trim();
	if (/^[A-Za-z][\w:-]*$/.test(trimmed)) {
		return trimmed;
	}

	const sanitized = trimmed.replace(/[^A-Za-z0-9_-]+/g, '-') || 'gallery';
	return `pswp-${sanitized}`;
};

const Gallery: React.FC<props> = ({ galleryID, images }) => {
	const normalizedGalleryId = normalizeGalleryId(galleryID);
	useEffect(() => {
		const lightbox = new PhotoSwipeLightbox({
			gallery: '#' + normalizedGalleryId,
			children: 'a',
			pswpModule: () => import('photoswipe'),
		});
		lightbox.on('uiRegister', function () {
			const pswp = lightbox.pswp;
			if (!pswp?.ui?.registerElement) return;
			pswp.ui.registerElement({
				name: 'download-button',
				order: 8,
				isButton: true,
				tagName: 'a',

				// SVG with outline
				html: {
					isCustomSVG: true,
					inner:
						'<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
					outlineID: 'pswp__icn-download',
				},
				onInit: (el, pswp) => {
					el.setAttribute('download', '');
					el.setAttribute('target', '_blank');
					el.setAttribute('rel', 'noopener');

					pswp.on('change', () => {
						console.log('change');
						const src = pswp.currSlide?.data?.src;
						if (src) {
							if (el instanceof HTMLAnchorElement) {
								el.href = src;
							} else {
								el.setAttribute('href', src);
							}
						}
					});
				},
			});
		});
		lightbox.init();

		return () => {
			lightbox.destroy();
		};
	}, [normalizedGalleryId]);
	return (
		<div
			id={normalizedGalleryId}
			className={
				'pswp-gallery grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-10 p-20'
			}>
			{images.map((image, index) => (
				<a
					href={image.largeURL}
					data-pswp-width={image.width}
					data-pswp-height={image.height}
					key={galleryID + '-' + index}
					target="_blank"
					rel="noreferrer"
					className="block">
					<div className="relative w-full h-40 sm:h-48 md:h-56 lg:h-64">
						<Image
							src={image.thumbnailURL}
							alt=""
							fill
							className="object-cover rounded-md"
							unoptimized
							loading="lazy"
						/>
					</div>
				</a>
			))}
		</div>
	);
};

export default Gallery;
