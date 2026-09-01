import './globals.css';

export const metadata = {
  title: 'Kaapisoda',
  description: 'A retro pixel life RPG where real-world progress grows a 122-day personal kingdom.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
