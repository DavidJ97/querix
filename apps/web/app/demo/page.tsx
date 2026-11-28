'use client';
import dynamic from 'next/dynamic';

// Démo de faisabilité du rendu réaliste (éclairage Blender/Cycles précalculé). Le jeu principal n'est pas modifié.
const DemoScene = dynamic(() => import('./DemoScene'), {ssr: false});
export default function DemoPage() { return <DemoScene/>; }
