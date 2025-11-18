'use client';
import React from 'react';
import { Button } from '@/components/ui/button';

type HeaderProps = {
	isConnected?: boolean;
};

const Header: React.FC<HeaderProps> = ({ isConnected = false }) => {
	return (
		<header className="flex items-center justify-between py-3 px-5 border-b border-gray-200 bg-white">
			<div className="flex items-center gap-3">
				<h1 className="m-0 text-lg font-bold">The Wall Academy Galerie</h1>
			</div>

			<div className="flex items-center gap-3">
				{isConnected ? (
					<div className="text-sm text-gray-900">{'Profil'}</div>
				) : (
					<Button
						className="cursor-pointer"
						variant={'outline'}
						onClick={() => {
							window.location.href = '/';
						}}>
						Sélectionner un autre album
					</Button>
				)}
			</div>
		</header>
	);
};

export default Header;
