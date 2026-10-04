import localFont from 'next/font/local';
import './globals.css';

const montserrat = localFont({
    src: [
        {path: './fonts/Montserrat-Regular.woff2', weight: '400', style: 'normal'},
        {path: './fonts/Montserrat-Medium.woff2', weight: '500', style: 'normal'},
        {path: './fonts/Montserrat-SemiBold.woff2', weight: '600', style: 'normal'},
        {path: './fonts/Montserrat-Bold.woff2', weight: '700', style: 'normal'}
    ],
    display: 'swap',
    variable: '--font-montserrat'
});

export const metadata = {
    title: 'DisplayHub',
    description: "DisplayHub, une solution de gestion d'affichage dynamique."
};

export const viewport = {
    initialScale: 1,
    width: 'device-width',
    maximumScale: 1
};

export default function RootLayout({children}) {
    return (
        <html lang="fr">
        <body className={montserrat.className}>{children}</body>
        </html>
    );
}
