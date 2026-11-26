import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'Quérix', description: 'Formation et aide aux protocoles' };
export default function Layout({children}:{children:ReactNode}) {return <html lang="fr-CA"><body>{children}</body></html>}