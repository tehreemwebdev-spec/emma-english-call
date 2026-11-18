import './globals.css';
export const metadata = { title: 'Emma – Live English Speaking Tutor', description: 'Call Emma and practice speaking English live. She corrects your mistakes and explains in Hinglish.' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
