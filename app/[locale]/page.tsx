'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function Home() {
	const t = useTranslations('HomePage');
	const router = useRouter();
	const [galleries, setGalleries] = useState<
		Array<{ id: number; title: string }>
	>([]);
	const [selectedId, setSelectedId] = useState('');

	useEffect(() => {
		fetch('/api/gallery')
			.then((response) => response.json())
			.then((data) => {
				if (data && data.data) {
					setGalleries(data.data);
				}
			})
			.catch((error) => {
				console.error('Error fetching galleries:', error);
			});
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);
		const dataObj = Object.fromEntries(fd.entries());

		// Affiche les valeurs récupérées (pour debug)
		console.log('Form values:', dataObj);

		fetch('/api/connect', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(dataObj),
		})
			.then(async (response) => {
				const json = await response.json().catch(() => null);
				if (response.ok) {
					router.push(`/gallery?page=1`);
				} else {
					alert(t('errorMessage'));
					throw new Error('API error');
				}
			})
			.catch((err) => {
				console.error('Request failed:', err);
			});
	};

	return (
		<main className="flex flex-col justify-center items-center h-full">
			<h1 className="font-bold text-5xl text-center text-[#e5783a]">
				{t.rich('title', {
					br: () => <br />,
				})}
			</h1>
			<form className="mt-10" onSubmit={handleSubmit}>
				<div className="flex gap-6">
					<div className="grid gap-2">
						<Select value={selectedId} onValueChange={(v) => setSelectedId(v)}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={t('selectPlaceholder')} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{galleries.length === 0 ? (
										<div className="flex justify-center p-4">
											<Spinner />
										</div>
									) : (
										galleries.map((gallery) => (
											<SelectItem
												key={gallery.id}
												value={gallery.id.toString()}>
												{gallery.title}
											</SelectItem>
										))
									)}
								</SelectGroup>
							</SelectContent>
						</Select>
						{/* Champ caché pour inclure la valeur du Select dans FormData */}
						<input type="hidden" name="id" value={selectedId} />
					</div>
					<div className="grid gap-2">
						<Input
							id="password"
							name="password"
							type="password"
							placeholder={t('passwordPlaceholder')}
							required
						/>
					</div>
					<Button>{t('buttonSubmit')}</Button>
				</div>
			</form>
		</main>
	);
}
