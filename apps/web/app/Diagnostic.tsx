'use client';
import {useEffect} from 'react';
// Marque la page comme démarrée et passe le badge de version au vert.
export default function Diagnostic() {
  useEffect(() => {
    document.documentElement.dataset.ready = '1';
    const v = document.getElementById('qx-ver');
    if (v) { v.textContent = v.textContent!.replace('JS ?', 'JS OK'); v.style.color = '#0a7a3a'; }
  }, []);
  return null;
}
