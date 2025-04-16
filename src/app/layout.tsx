import './globals.css'; // Change from '../globals.css' to './globals.css'
import { Inter } from 'next/font/google';
import Layout from '../components/layout/Layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Draft Day Trades',
  description: 'Predict draft picks and compete with friends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}