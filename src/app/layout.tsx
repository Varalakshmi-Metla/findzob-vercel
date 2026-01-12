import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import FirebaseDebug from '@/components/FirebaseDebug';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', fallback: ['system-ui', 'arial'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', fallback: ['system-ui', 'arial'], display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.findzob.com';
const siteName = 'FindZob';
const siteDescription = 'Your smart job search and resume management assistant with Z Agent (Human Agent).';
const siteLocale = 'en_IN';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'job search',
    'AI resume builder',
    'FindZob',
    'interview preparation',
    'hot jobs',
    'career assistant',
  ],
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: siteName,
    description: siteDescription,
    siteName,
    locale: siteLocale,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDescription,
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to Firebase services */}
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        {/* DNS prefetch for faster initial connection */}
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://securetoken.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased`}>
        <Script src="https://pay.google.com/gp/p/js/pay.js" strategy="lazyOnload" />
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
            {/* Firebase debug widget hidden in frontend by default. Use explicit env var to show in non-production if needed */}
            {process.env.NEXT_PUBLIC_SHOW_FIREBASE_DEBUG === 'true' && process.env.NODE_ENV !== 'production' ? <FirebaseDebug /> : null}
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
