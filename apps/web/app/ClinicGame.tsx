'use client';
import {useEffect, useRef, useState} from 'react';
import {WORLD, START, ZONES, OCCLUDERS, charHeight, moveWithCollisions, nearestZone, pointInPolygon, findPath} from './clinicWorld.mjs';

// Moteur 2,5D : décor peint (clinic.webp) + sprites prérendus, rendu Canvas 2D.
// - Profondeur : échelle du personnage selon y, tri du peintre sur la ligne de sol.
// - Occultation : les meubles devant le personnage sont redessinés depuis le décor, masqués au pixel près.
// - Animation pilotée par la distance parcourue (pas de glissement des pieds).
// - Caméra qui suit le joueur ; clavier, croix directionnelle et toucher-pour-aller.

type Dir = 'back' | 'front' | 'right';
type Pt = {x: number; y: number};
type Occ = {base: number; canvas: HTMLCanvasElement; x: number; y: number};

const DIRS: Dir[] = ['back', 'front', 'right'];
const FRAMES = 6;
// Géométrie des sprites normalisés (96 × 160, pieds à y = 154, silhouette de 146 px).
const SPR = {w: 96, h: 160, foot: 154, body: 146};
const KEYMAP: Record<string, Pt> = {
  ArrowUp: {x: 0, y: -1}, w: {x: 0, y: -1}, z: {x: 0, y: -1},
  ArrowDown: {x: 0, y: 1}, s: {x: 0, y: 1},
  ArrowLeft: {x: -1, y: 0}, a: {x: -1, y: 0}, q: {x: -1, y: 0},
  ArrowRight: {x: 1, y: 0}, d: {x: 1, y: 0},
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

// Prépare chaque occultant : découpe du décor limitée au polygone et, si besoin, à une clé de couleur.
function buildOccluders(bg: HTMLImageElement): Occ[] {
  const full = document.createElement('canvas');
  full.width = WORLD.width; full.height = WORLD.height;
  const fctx = full.getContext('2d', {willReadFrequently: true})!;
  fctx.drawImage(bg, 0, 0, WORLD.width, WORLD.height);
  return OCCLUDERS.map(o => {
    const xs = o.poly.map(p => p[0]), ys = o.poly.map(p => p[1]);
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
    const w = Math.ceil(Math.max(...xs)) - x, h = Math.ceil(Math.max(...ys)) - y;
    const data = fctx.getImageData(x, y, w, h), px = data.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4, r = px[k], g = px[k + 1], b = px[k + 2];
      let keep = pointInPolygon(x + i + 0.5, y + j + 0.5, o.poly);
      if (keep && o.key === 'green') keep = g > r + 6 && g > b - 4;
      if (keep && o.key === 'dark') keep = r + g + b < 200;
      if (keep && o.key === 'rope') keep = (b > r + 35 && b > g + 5) || r + g + b < 200;
      if (!keep) px[k + 3] = 0;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.putImageData(data, 0, 0);
    return {base: o.base, canvas: c, x, y};
  });
}

export default function ClinicGame({options, onAnswer}: {options: string[]; onAnswer: (s: string) => void}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const keys = useRef(new Set<string>());
  const player = useRef({pos: {...START} as Pt, dir: 'back' as Dir, flip: false, dist: 0, moving: false, target: null as Pt | null, path: [] as Pt[], stuck: 0});
  const optionsRef = useRef(options);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [near, setNear] = useState(-1);
  const nearRef = useRef(-1);
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/game-assets/';

  useEffect(() => { optionsRef.current = options; }, [options]);

  const interact = () => {
    const i = nearRef.current, opts = optionsRef.current;
    if (i < 0 || i >= opts.length) return;
    onAnswer(opts[i]);
    Object.assign(player.current, {pos: {...START}, dir: 'back', target: null, path: [], dist: 0});
  };
  // Déplacement tactile : chemin calculé une fois, puis suivi point par point.
  function walkTo(target: Pt) {
    const p = player.current, path = findPath(p.pos, target) as Pt[];
    p.path = path; p.target = path.length ? path[path.length - 1] : null; p.stuck = 0;
  }
  const interactRef = useRef(interact);
  interactRef.current = interact;

  useEffect(() => {
    let cancelled = false, raf = 0, last = 0, done = 0;
    const cleanupRef = {current: () => {}};
    const sprites: Record<Dir, HTMLImageElement[]> = {back: [], front: [], right: []};
    const track = <T,>(p: Promise<T>) => p.then(v => { if (!cancelled) setProgress(++done / 19); return v; });

    const assets = Promise.all([
      track(loadImage(base + 'clinic.webp')),
      ...DIRS.flatMap(d => Array.from({length: FRAMES}, (_, i) => track(loadImage(`${base}${d}-${i}.png`)).then(img => { sprites[d][i] = img; }))),
    ]);

    assets.then(([bg]) => {
      if (cancelled) return;
      const occluders = buildOccluders(bg as HTMLImageElement);
      setStatus('ready');
      const canvas = canvasRef.current!, stage = stageRef.current!, ctx = canvas.getContext('2d')!;
      let cw = 0, ch = 0, scale = 1, camX = 0, camY = 0, dpr = 1;

      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = stage.clientWidth; ch = stage.clientHeight;
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
        scale = Math.max(cw / WORLD.width, ch / WORLD.height);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(stage);

      const toWorld = (cx: number, cy: number): Pt => ({x: (cx + camX) / scale, y: (cy + camY) / scale});
      const onPointer = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        walkTo(toWorld(e.clientX - r.left, e.clientY - r.top));
      };
      canvas.addEventListener('pointerdown', onPointer);

      const drawPlayer = (p: typeof player.current, frame: number) => {
        const {x, y} = p.pos, hgt = charHeight(y), k = hgt / SPR.body;
        const img = sprites[p.dir][frame];
        const w = SPR.w * k, h = SPR.h * k, top = y - SPR.foot * k;
        // Reflet sur le sol ciré.
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.translate(x, y);
        ctx.scale(p.flip ? -1 : 1, -0.55);
        ctx.drawImage(img, -w / 2, -(SPR.foot * k), w, h);
        ctx.restore();
        // Ombre de contact : noyau dense sous les pieds + halo diffus.
        for (const [rx, a] of [[0.24, 0.22], [0.13, 0.38]] as const) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, hgt * rx);
          g.addColorStop(0, `rgba(8,14,32,${a})`);
          g.addColorStop(1, 'rgba(8,14,32,0)');
          ctx.save();
          ctx.translate(x, y); ctx.scale(1, 0.26); ctx.translate(-x, -y);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, hgt * rx, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.save();
        if (p.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
        ctx.drawImage(img, x - w / 2, top, w, h);
        ctx.restore();
      };

      const tick = (t: number) => {
        const dt = Math.min(0.05, (t - (last || t)) / 1000);
        last = t;
        const p = player.current;
        // Intention de déplacement : clavier/croix en priorité, sinon cible tactile.
        let ix = 0, iy = 0;
        keys.current.forEach(k => { const v = KEYMAP[k] || KEYMAP[k.toLowerCase()]; if (v) { ix += v.x; iy += v.y; } });
        if (ix || iy) { p.target = null; p.path = []; }
        else if (p.path.length) {
          const w = p.path[0], dx = w.x - p.pos.x, dy = (w.y - p.pos.y) / 0.6;
          if (Math.hypot(dx, dy) < 3) { p.path.shift(); if (!p.path.length) p.target = null; } else { ix = dx; iy = dy; }
        }
        const len = Math.hypot(ix, iy);
        p.moving = false;
        if (len > 0) {
          ix /= len; iy /= len;
          const hgt = charHeight(p.pos.y), speed = hgt * 1.25 * dt;
          const next = moveWithCollisions(p.pos, ix * speed, iy * speed * 0.6);
          const moved = Math.hypot(next.x - p.pos.x, (next.y - p.pos.y) / 0.6);
          if (moved > 0.01) {
            p.moving = true;
            p.dist += moved;
            p.stuck = 0;
          } else if (p.path.length && (p.stuck += dt) > 0.4) { p.path = []; p.target = null; }
          p.pos = next;
          if (Math.abs(ix) > Math.abs(iy) * 0.9) { p.dir = 'right'; p.flip = ix < 0; }
          else { p.dir = iy > 0 ? 'front' : 'back'; p.flip = false; }
        }
        // Une image toutes les 0,14 hauteur de corps parcourue : les pas restent collés au sol.
        const frame = p.moving ? Math.floor(p.dist / (charHeight(p.pos.y) * 0.14)) % FRAMES : 0;

        const n = nearestZone(p.pos, optionsRef.current.length);
        if (n !== nearRef.current) { nearRef.current = n; setNear(n); }

        // Caméra : suit le joueur, bornée au décor.
        const vw = WORLD.width * scale, vh = WORLD.height * scale;
        const tx = Math.max(0, Math.min(vw - cw, p.pos.x * scale - cw / 2));
        const ty = Math.max(0, Math.min(vh - ch, (p.pos.y - 90) * scale - ch / 2));
        camX += (tx - camX) * Math.min(1, dt * 6); camY += (ty - camY) * Math.min(1, dt * 6);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, cw, ch);
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr, -camY * dpr);
        ctx.drawImage(bg as HTMLImageElement, 0, 0, WORLD.width, WORLD.height);

        // Marqueurs de zones au sol.
        optionsRef.current.slice(0, ZONES.length).forEach((_, i) => {
          const z = ZONES[i], active = i === n, pulse = 0.5 + 0.5 * Math.sin(t / 300);
          ctx.save();
          ctx.translate(z.x, z.y); ctx.scale(1, 0.3);
          ctx.strokeStyle = active ? `rgba(120,230,255,${0.7 + 0.3 * pulse})` : 'rgba(90,190,255,.55)';
          ctx.lineWidth = active ? 5 : 3;
          ctx.shadowColor = '#3cc8ff'; ctx.shadowBlur = active ? 18 : 8;
          ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        });
        if (p.target) {
          ctx.save(); ctx.translate(p.target.x, p.target.y); ctx.scale(1, 0.3);
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }

        drawPlayer(p, frame);
        // Tri du peintre : tout occultant dont la ligne de sol est devant les pieds est redessiné par-dessus.
        for (const o of occluders) if (o.base > p.pos.y) ctx.drawImage(o.canvas, o.x, o.y);

        // Étiquettes DOM positionnées sans re-rendu React.
        labelRefs.current.forEach((el, i) => {
          if (!el) return;
          const z = ZONES[i];
          el.style.transform = `translate(${z.x * scale - camX}px, ${(z.y - charHeight(z.y) - 14) * scale - camY}px) translate(-50%, -100%)`;
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanupRef.current = () => { ro.disconnect(); canvas.removeEventListener('pointerdown', onPointer); };
    }).catch(() => { if (!cancelled) setStatus('error'); });

    return () => { cancelled = true; cancelAnimationFrame(raf); cleanupRef.current(); };
  }, [base]);

  useEffect(() => {
    const valid = (k: string) => k in KEYMAP || k.toLowerCase() in KEYMAP;
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (valid(e.key)) { e.preventDefault(); keys.current.add(e.key); }
      else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && nearRef.current >= 0 && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); interactRef.current(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);

  const goTo = (i: number) => walkTo({x: ZONES[i].x, y: ZONES[i].y});
  const hold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(key); },
    onPointerUp: () => keys.current.delete(key),
    onPointerCancel: () => keys.current.delete(key),
    onLostPointerCapture: () => keys.current.delete(key),
  });

  return <section className="clinic-game">
    <div ref={stageRef} className="clinic-stage" aria-label="Clinique 2,5D — déplace le personnage jusqu'à une zone de réponse">
      <canvas ref={canvasRef} className="clinic-canvas"/>
      {status === 'ready' && options.slice(0, ZONES.length).map((o, i) =>
        <button key={o} ref={el => { labelRefs.current[i] = el; }} className={'clinic-zone' + (near === i ? ' active' : '')} onClick={() => goTo(i)}>
          <small>{ZONES[i].label}</small>{o}
        </button>)}
      {status === 'loading' && <div className="clinic-loading" role="status">Chargement de la clinique… {Math.round(progress * 100)} %</div>}
      {status === 'error' && <div className="clinic-loading" role="alert">Les ressources graphiques n'ont pas pu être chargées. Les réponses restent disponibles sous le jeu.</div>}
    </div>
    <div className="clinic-controls">
      <div className="clinic-pad">
        <button aria-label="Haut" className="up" {...hold('ArrowUp')}>▲</button>
        <button aria-label="Gauche" className="left" {...hold('ArrowLeft')}>◀</button>
        <button aria-label="Bas" className="down" {...hold('ArrowDown')}>▼</button>
        <button aria-label="Droite" className="right" {...hold('ArrowRight')}>▶</button>
      </div>
      <button className="clinic-act" disabled={near < 0} onClick={interact}>Interagir</button>
    </div>
    <p className="clinic-hint">{near < 0 ? 'Touchez le sol ou utilisez les flèches / ZQSD pour rejoindre un poste.' : `Zone ${ZONES[near].label} : « ${options[near]} » — appuyez sur Interagir ou E.`}</p>
  </section>;
}
