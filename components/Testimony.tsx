import Image from 'next/image';
import { ReactNode } from 'react';

interface TestimonyProps {
	image: string;
	testimony: ReactNode;
	author: string;
	// optional fixed width for the image container (pixels or tailwind size)
	imageWidth?: number;
	imageHeight?: number;
}

const Testimony: React.FC<TestimonyProps> = ({
	image,
	testimony,
	author,
	imageWidth = 374,
	imageHeight = 450,
}) => {
	return (
		<div className="flex flex-col gap-6  w-fit items-start">
			<div
				className="relative shrink-0 overflow-hidden rounded-md border border-gray-200"
				style={{ width: imageWidth, height: imageHeight }}>
				<Image src={image} alt={author} fill style={{ objectFit: 'cover' }} />
			</div>

			<div className="flex-1 flex flex-col justify-between">
				<p className="text-sm italic text-gray-700 leading-relaxed">
					{testimony}
				</p>

				<div className="mt-6 flex items-center justify-between">
					<div className="flex-1 border-t border-gray-300" />
					<p className="ml-4 text-right text-sm font-medium text-gray-700">
						{author}
					</p>
				</div>
			</div>
		</div>
	);
};

export default Testimony;
