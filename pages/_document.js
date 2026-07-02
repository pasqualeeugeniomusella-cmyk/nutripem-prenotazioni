import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="it">
      <Head>
        {/* Icona per la home di iPhone/iPad */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Nome che appare sotto l'icona sulla home */}
        <meta name="apple-mobile-web-app-title" content="NutriPEM-Prenotazioni" />
        <meta name="application-name" content="NutriPEM-Prenotazioni" />
        {/* Comportamento app a tutto schermo quando salvata sulla home */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#1a2338" />
        {/* Favicon per la scheda del browser */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        {/* Manifest per Android / installazione */}
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
