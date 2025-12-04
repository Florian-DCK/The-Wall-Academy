import localFont from 'next/font/local';

// Note: Vous devrez télécharger les fichiers de police et les placer
// dans un dossier, par exemple /public/fonts/
export const proximaNova = localFont({
	src: [
		{
			path: '../public/fonts/Proxima Nova Light.ttf',
			weight: '300',
			style: 'normal',
		},
		{
			path: '../public/fonts/Proxima Nova Regular.ttf',
			weight: '400',
			style: 'normal',
		},
		{
			path: '../public/fonts/Proxima Nova Semibold.ttf',
			weight: '700',
			style: 'normal',
		},
		{
			path: '../public/fonts/Proxima Nova Extraold.ttf',
			weight: '800',
			style: 'normal',
		},
	],
	variable: '--font-body', // Crée une variable CSS
});
