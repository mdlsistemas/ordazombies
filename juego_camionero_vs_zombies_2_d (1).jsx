import React, { useEffect, useRef, useState } from "react";

export default function JuegoCamioneroVsZombies() {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const gameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [status, setStatus] = useState("A/D o flechas para moverte, W/Espacio para saltar, clic para disparar. Si un zombie te toca, perdés.");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 1440;
    const H = 810;
    canvas.width = W;
    canvas.height = H;

    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    function playShotgun() {
      const ctxA = audioCtxRef.current;
      if (ctxA.state === "suspended") ctxA.resume();
      const now = ctxA.currentTime;
      const noise = ctxA.createBufferSource();
      const buffer = ctxA.createBuffer(1, 44100, 44100);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const gain = ctxA.createGain();
      gain.gain.setValueAtTime(1.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      noise.connect(gain);
      gain.connect(ctxA.destination);
      noise.start();
      noise.stop(now + 0.22);
    }

    function makePlatforms() {
      const list = [];
      const rows = [75, 170, 285, 405, 535, 660, 745];
      rows.forEach((y, row) => {
        const count = row === 3 ? 2 : 3;
        for (let i = 0; i < count; i++) {
          const w = row === 3 && i === 0 ? 780 : 230 + Math.floor(Math.random() * 190);
          const x = 20 + i * 450 + Math.floor(Math.random() * 120);
          if (x + w < W - 20) list.push({ x, y: y + Math.floor(Math.random() * 28), w, h: row === 3 ? 48 : 42 });
        }
      });
      list.push({ x: 270, y: 445, w: 850, h: 48 });
      return list;
    }

    let platforms = makePlatforms();
    const playerStart = { x: 620, y: 360 };

    function closestPlatformTo(x, y) {
      return platforms.reduce((best, p) => {
        const d = Math.hypot((p.x + p.w / 2) - x, p.y - y);
        return !best || d < best.d ? { p, d } : best;
      }, null)?.p;
    }

    function spawnWave(wave) {
      const zombies = [];
      const total = 4 + wave * 2;
      const usable = platforms.filter(p => p.y < 730 && p.w > 230);
      for (let i = 0; i < total; i++) {
        const pf = usable[Math.floor(Math.random() * usable.length)];
        const side = Math.random() > 0.5 ? 1 : -1;
        zombies.push({
          id: Date.now() + i + Math.random(),
          x: pf.x + 20 + Math.random() * Math.max(20, pf.w - 80),
          y: pf.y - 72,
          vx: side * (0.8 + wave * 0.08 + Math.random() * 0.35),
          vy: 0,
          w: 48,
          h: 72,
          hp: 2 + Math.floor(wave / 3),
          dead: false,
          platform: pf,
        });
      }
      return zombies;
    }

    gameRef.current = {
      player: { ...playerStart, vx: 0, vy: 0, w: 52, h: 78, facing: 1, onGround: false },
      bullets: [],
      zombies: [],
      particles: [],
      score: 0,
      over: false,
      win: false,
      mouse: { x: 730, y: 405 },
      wave: 1,
      nextWaveTimer: 0,
      platformsVersion: 1,
    };
    gameRef.current.zombies = spawnWave(1);

    function rects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    function platformUnder(ent) {
      for (const p of platforms) {
        if (ent.x + ent.w > p.x && ent.x < p.x + p.w && ent.y + ent.h <= p.y + 18 && ent.y + ent.h + ent.vy >= p.y) return p;
      }
      return null;
    }

    function drawBeam(p) {
      ctx.fillStyle = "#111"; ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
      ctx.fillStyle = "#970015"; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#c2182b"; ctx.fillRect(p.x + 18, p.y + 10, p.w - 36, p.h - 18);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.strokeRect(p.x + 18, p.y + 10, p.w - 36, p.h - 18);
      ctx.fillStyle = "#aaa";
      [[p.x+12,p.y+10],[p.x+p.w-12,p.y+10],[p.x+12,p.y+p.h-10],[p.x+p.w-12,p.y+p.h-10]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.stroke();});
    }

    function drawPlayer(pl) {
      ctx.save(); ctx.translate(pl.x + pl.w/2, pl.y + pl.h/2); ctx.scale(pl.facing, 1); ctx.translate(-pl.w/2, -pl.h/2);
      ctx.fillStyle = "#6b3a1e"; ctx.fillRect(15, 52, 11, 22); ctx.fillRect(31, 52, 11, 22);
      ctx.fillStyle = "#0d5e9c"; ctx.fillRect(14, 38, 30, 24);
      ctx.fillStyle = "#d22"; ctx.fillRect(10, 24, 34, 28);
      ctx.fillStyle = "#f2b07b"; ctx.fillRect(18, 10, 26, 24);
      ctx.fillStyle = "#4b2b18"; ctx.fillRect(15, 24, 28, 12); ctx.fillRect(18, 30, 22, 14);
      ctx.fillStyle = "#fff"; ctx.fillRect(14, 4, 30, 10); ctx.fillStyle = "#e21"; ctx.fillRect(28, 4, 16, 10); ctx.fillRect(38, 10, 18, 5);
      ctx.fillStyle = "#222"; ctx.fillRect(42, 34, 35, 8); ctx.fillStyle = "#999"; ctx.fillRect(55, 36, 30, 4);
      ctx.restore();
    }

    function drawZombie(z) {
      ctx.save(); ctx.translate(z.x + z.w/2, z.y + z.h/2); ctx.scale(z.vx >= 0 ? 1 : -1, 1); ctx.translate(-z.w/2, -z.h/2);
      ctx.fillStyle = "#ff86b6"; ctx.beginPath(); ctx.arc(24, 16, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(17, 14, 4, 0, Math.PI*2); ctx.arc(31, 15, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.fillRect(16, 25, 18, 4);
      ctx.fillStyle = "#ff86b6"; ctx.fillRect(13, 34, 26, 28); ctx.fillRect(3, 38, 22, 8); ctx.fillRect(30, 38, 24, 8);
      ctx.fillStyle = "#202040"; ctx.fillRect(13, 58, 11, 16); ctx.fillRect(29, 58, 11, 16);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(13, 34, 26, 28);
      ctx.restore();
    }

    function spawnBlood(x, y) {
      const g = gameRef.current;
      for (let i = 0; i < 34; i++) {
        g.particles.push({ x, y, vx: (Math.random()-0.5)*8, vy: (Math.random()-1)*8, life: 48, size: Math.random()*5+2 });
      }
    }

    function reset() {
      platforms = makePlatforms();
      const g = gameRef.current;
      const startPf = closestPlatformTo(700, 450);
      g.player = { x: startPf.x + startPf.w / 2 - 26, y: startPf.y - 78, vx: 0, vy: 0, w: 52, h: 78, facing: 1, onGround: false };
      g.bullets = [];
      g.particles = [];
      g.score = 0;
      g.over = false;
      g.win = false;
      g.wave = 1;
      g.nextWaveTimer = 0;
      g.platformsVersion++;
      g.zombies = spawnWave(1);
      setStatus("Mapa regenerado. Oleada 1 en marcha.");
    }

    reset();

    function update() {
      const g = gameRef.current, p = g.player, keys = keysRef.current;
      if (keys.r) reset();
      if (!g.over) {
        p.vx = 0;
        if (keys.ArrowLeft || keys.a) { p.vx = -4.6; p.facing = -1; }
        if (keys.ArrowRight || keys.d) { p.vx = 4.6; p.facing = 1; }
        if ((keys.ArrowUp || keys.w || keys[" "]) && p.onGround) { p.vy = -13; p.onGround = false; }
        p.vy += 0.55; p.x += p.vx; p.y += p.vy;
        const pp = platformUnder(p); if (pp) { p.y = pp.y - p.h; p.vy = 0; p.onGround = true; } else p.onGround = false;
        p.x = Math.max(0, Math.min(W-p.w, p.x));
        if (p.y > H) { g.over = true; setStatus("Caíste del mapa. Presioná R para reiniciar."); }

        g.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        g.bullets = g.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

        g.zombies.forEach(z => {
          if (z.dead) return;
          const dx = (p.x + p.w / 2) - (z.x + z.w / 2);
          const dy = p.y - z.y;
          const speed = 1.15 + g.wave * 0.08;
          z.vx = Math.sign(dx || 1) * speed;
          if (Math.abs(dx) < 75 && dy < -30 && Math.abs(dy) < 180 && Math.random() < 0.018) z.vy = -10;
          z.vy += 0.52;
          z.x += z.vx;
          z.y += z.vy;
          const zp = platformUnder(z);
          if (zp) { z.y = zp.y - z.h; z.vy = 0; z.platform = zp; }
          if (z.x < 0 || z.x + z.w > W) z.vx *= -1;
          if (z.y > H + 120) {
            const pf = closestPlatformTo(p.x, p.y) || platforms[0];
            z.x = pf.x + Math.random() * Math.max(20, pf.w - z.w);
            z.y = pf.y - z.h;
            z.vy = 0;
          }
          if (rects(z, p)) {
            g.over = true;
            setStatus("Te tocó un zombie. GAME OVER. Presioná R para reiniciar.");
          }
        });

        g.bullets.forEach(b => g.zombies.forEach(z => {
          if (!z.dead && rects({x:b.x,y:b.y,w:8,h:8}, z)) {
            b.life = 0; z.hp--;
            if (z.hp <= 0) {
              z.dead = true;
              g.score += 100;
              spawnBlood(z.x + z.w/2, z.y + z.h/2);
            }
          }
        }));

        g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; });
        g.particles = g.particles.filter(p => p.life > 0);

        if (g.zombies.every(z => z.dead)) {
          g.nextWaveTimer++;
          if (g.nextWaveTimer === 1) setStatus(`Oleada ${g.wave} superada. Regenerando vigas...`);
          if (g.nextWaveTimer > 80) {
            g.wave++;
            g.nextWaveTimer = 0;
            platforms = makePlatforms();
            const safe = closestPlatformTo(W/2, H/2);
            p.x = safe.x + safe.w/2 - p.w/2;
            p.y = safe.y - p.h;
            p.vx = 0; p.vy = 0;
            g.bullets = [];
            g.platformsVersion++;
            g.zombies = spawnWave(g.wave);
            setStatus(`Oleada ${g.wave}. Los zombies vienen por vos.`);
          }
        }
      }
    }

    function draw() {
      const g = gameRef.current;
      const grad = ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,"#12a8df"); grad.addColorStop(1,"#0095cf"); ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
      platforms.forEach(drawBeam);
      g.zombies.forEach(z => !z.dead && drawZombie(z));
      g.particles.forEach(p => { ctx.fillStyle = "#b30000"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); });
      g.bullets.forEach(b => { ctx.fillStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill(); });
      drawPlayer(g.player);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.mouse.x, g.mouse.y, 24, 0, Math.PI*2); ctx.moveTo(g.mouse.x-24,g.mouse.y); ctx.lineTo(g.mouse.x+24,g.mouse.y); ctx.moveTo(g.mouse.x,g.mouse.y-24); ctx.lineTo(g.mouse.x,g.mouse.y+24); ctx.stroke();
      ctx.fillStyle = "#111"; ctx.font = "bold 24px Arial";
      ctx.fillText(`OLEADA ${g.wave}   PUNTOS ${g.score}   ZOMBIES ${g.zombies.filter(z=>!z.dead).length}`, 24, 35);
      if (g.over) {
        ctx.fillStyle = "rgba(0,0,0,.58)"; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = "white"; ctx.font = "bold 58px Arial"; ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W/2, H/2);
        ctx.font = "28px Arial"; ctx.fillText(`Llegaste a la oleada ${g.wave} con ${g.score} puntos`, W/2, H/2 + 45);
        ctx.fillText("Presioná R para reiniciar", W/2, H/2 + 85);
        ctx.textAlign = "left";
      }
    }

    let raf; const loop = () => { update(); draw(); raf = requestAnimationFrame(loop); }; loop();
    const down = e => { keysRef.current[e.key] = true; if ([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault(); };
    const up = e => { keysRef.current[e.key] = false; };
    const move = e => { const r = canvas.getBoundingClientRect(); gameRef.current.mouse = { x: (e.clientX-r.left)*(W/r.width), y: (e.clientY-r.top)*(H/r.height) }; };
    const shoot = e => {
      const g = gameRef.current;
      if (g.over) return;
      playShotgun();
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX-r.left)*(W/r.width), my = (e.clientY-r.top)*(H/r.height);
      const p = g.player;
      const sx = p.x + p.w/2, sy = p.y + 38;
      const ang = Math.atan2(my-sy, mx-sx);
      for (let i = -1; i <= 1; i++) {
        const spread = ang + i * 0.08;
        g.bullets.push({ x:sx, y:sy, vx:Math.cos(spread)*12, vy:Math.sin(spread)*12, life:65 });
      }
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); canvas.addEventListener("mousemove", move); canvas.addEventListener("click", shoot);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); canvas.removeEventListener("mousemove", move); canvas.removeEventListener("click", shoot); };
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 p-4">
      <div className="text-white text-xl font-bold">Camionero vs Zombies Rosados</div>
      <div className="text-slate-300 text-sm">{status}</div>
      <canvas ref={canvasRef} className="w-full max-w-6xl rounded-2xl shadow-2xl border-4 border-slate-800 bg-sky-500" />
    </div>
  );
}
