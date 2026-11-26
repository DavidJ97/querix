'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import ClinicGame from './ClinicGame';

// Choix du rendu : vraie 3D (par défaut) ou décor 2,5D. Même moteur décisionnel derrière.
const Clinic3D = dynamic(() => import('./Clinic3D'), {ssr: false, loading: () => <p className="c3d-hint">Chargement de la 3D…</p>});

export default function GameView(props: {options: string[]; onAnswer: (s: string) => void}) {
  const [view, setView] = useState<'3d' | '25d'>('3d');
  return <div className="game-view">
    <div className="game-switch" role="group" aria-label="Type de rendu">
      <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button>
      <button aria-pressed={view === '25d'} onClick={() => setView('25d')}>2,5D</button>
    </div>
    {view === '3d' ? <Clinic3D {...props}/> : <ClinicGame {...props}/>}
  </div>;
}
