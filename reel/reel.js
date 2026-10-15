// Renders the Instagram reel frame by frame on a virtual clock.
// usage: node reel.js <outDir> [test]
const { chromium } = require('playwright');
const fs = require('fs');
const SP = __dirname + '/..';
const OUT = process.argv[2];
const TEST = process.argv[3] === 'test';
const FPS = 24, DT = 1000 / FPS;
fs.mkdirSync(OUT, { recursive: true });

const OVERLAY_CSS = `
.top,.tabs,.dock,#side,#dpanel,.banner,.bayctl,footer,.toast,.tip{display:none!important}
.wrap{padding:0!important;max-width:none!important}
.bay{position:fixed!important;inset:0!important;height:100%!important;border-radius:0!important;border:0!important}
#reel{position:fixed;inset:0;z-index:50;pointer-events:none;font-family:"Noto Sans Gujarati",sans-serif;color:#fff}
#reel .topband{position:absolute;left:0;right:0;top:0;height:250px;background:linear-gradient(#0b0f14f2 55%,#0b0f1400)}
#reel .botband{position:absolute;left:0;right:0;bottom:0;height:330px;background:linear-gradient(#0b0f1400,#0b0f14f5 38%)}
#reel .brand{position:absolute;left:22px;top:20px;display:flex;gap:8px;align-items:center;font:800 17px "Baloo Bhai 2",sans-serif;color:#ffb27a}
#reel .brand i{display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff7a22}
#reel .head{position:absolute;left:22px;right:22px;top:58px;display:flex;gap:16px;align-items:center}
#reel .badge{flex:none;width:98px;height:98px;border-radius:26px;display:grid;place-items:center;font:800 60px "Baloo Bhai 2",sans-serif;color:#fff;box-shadow:0 8px 24px #0008,inset 0 -6px 0 #0004;transition:background .3s}
#reel .ht{min-width:0}
#reel .ht b{display:block;font:800 38px/1.1 "Baloo Bhai 2",sans-serif}
#reel .ht span{display:block;font:700 20px/1.3 "Noto Sans Gujarati",sans-serif;color:#ffd2a8;margin-top:4px}
#reel .path{position:absolute;left:18px;right:18px;bottom:150px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:700 15.5px "Noto Sans Gujarati",sans-serif}
#reel .path span{padding:4px 10px;border-radius:999px;background:#ffffff1a;border:1.5px solid #ffffff40}
#reel .path span.on{background:#ff6a00;border-color:#ffb27a}
#reel .path span.off{opacity:.38;text-decoration:line-through}
#reel .path i{font-style:normal;color:#ffb27a}
#reel .stats{position:absolute;left:18px;right:130px;bottom:62px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#reel .stats div{background:#ffffff14;border:1px solid #ffffff2a;border-radius:14px;padding:6px 8px;text-align:center}
#reel .stats small{display:block;font:700 12px "Noto Sans Gujarati",sans-serif;color:#c9d2da}
#reel .stats b{font:700 23px "JetBrains Mono",monospace}
#reel .gate{position:absolute;right:16px;bottom:56px;width:104px;height:104px}
#reel .foot{position:absolute;left:0;right:0;bottom:18px;text-align:center;font:700 14px "Noto Sans Gujarati",sans-serif;color:#c9d2da}
#reel .pop{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(var(--sc,1));padding:12px 22px;border-radius:20px;background:#0b0f14e6;border:3px solid #ff7a22;font:800 30px "Baloo Bhai 2",sans-serif;white-space:nowrap;opacity:var(--op,0)}
#reel .card{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:14px;padding:30px;background:#0b0f14d9;opacity:var(--cop,0)}
#reel .card b{font:800 46px/1.12 "Baloo Bhai 2",sans-serif}
#reel .card b em{font-style:normal;color:#ff7a22}
#reel .card span{font:700 22px/1.45 "Noto Sans Gujarati",sans-serif;color:#ffd2a8}
#reel .card .chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}
#reel .card .chips u{text-decoration:none;font:800 30px "Baloo Bhai 2",sans-serif;width:58px;height:58px;border-radius:16px;display:grid;place-items:center}
`;
const OVERLAY_HTML = `<div id="reel">
 <div class="topband"></div><div class="botband"></div>
 <div class="brand"><i></i>સિંક્રોમેશ ગિયરબોક્સ · 3D</div>
 <div class="head"><div class="badge" id="rBadge">N</div><div class="ht"><b id="rT"></b><span id="rS"></span></div></div>
 <div class="path" id="rPath"></div>
 <div class="stats"><div><small>એન્જિન</small><b id="rE">0</b></div><div><small>આઉટપુટ શાફ્ટ</small><b id="rO">0</b></div><div><small>ઝડપ km/h</small><b id="rV">0</b></div></div>
 <svg class="gate" viewBox="0 -6 220 212"><path d="M50 40V160M110 40V160M170 40V160M50 100H170" stroke="#ffffff38" stroke-width="18" stroke-linecap="round" fill="none"/>
  <g font-family="Baloo Bhai 2" font-weight="800" font-size="24" fill="#c9d2da" text-anchor="middle"><text x="50" y="22">1</text><text x="110" y="22">3</text><text x="170" y="22">5</text><text x="50" y="196">2</text><text x="110" y="196">4</text><text x="170" y="196">R</text></g>
  <circle id="rKnob" cx="110" cy="100" r="19" fill="#ff7a22" stroke="#fff" stroke-width="4"/></svg>
 <div class="foot">Govt ITI મણિનગર · @ashish_9978</div>
 <div class="pop" id="rPop"></div>
 <div class="card" id="rCard"></div>
</div>`;

const GCOL = { N: '#64748b', 1: '#e11d48', 2: '#ea580c', 3: '#c49000', 4: '#16a34a', 5: '#2563eb' };
const SPOT = { N: [110, 100], 1: [50, 40], 2: [50, 160], 3: [110, 40], 4: [110, 160], 5: [170, 40] };
const CHAIN = g => g === 'N'
  ? [['એન્જિન', 1], ['ઇનપુટ શાફ્ટ', 1], ['કાઉન્ટર શાફ્ટ', 1], ['બધા ગિયર (છૂટા)', 1], ['સ્લીવ', 0], ['આઉટપુટ શાફ્ટ', 0], ['વ્હીલ', 0]]
  : g === '4'
    ? [['એન્જિન', 1], ['ઇનપુટ શાફ્ટ', 1], ['3–4 સ્લીવ', 1], ['આઉટપુટ શાફ્ટ', 1], ['વ્હીલ', 1]]
    : [['એન્જિન', 1], ['ઇનપુટ શાફ્ટ', 1], ['કાઉન્ટર શાફ્ટ', 1], ['ગિયર ' + g, 1], [(+g <= 2 ? '1–2' : g === '3' ? '3–4' : '5–R') + ' સ્લીવ', 1], ['આઉટપુટ શાફ્ટ', 1], ['વ્હીલ', 1]];
const INFO = {
  N: ['ન્યૂટ્રલ', 'ગિયર ફરે છે, પણ આઉટપુટ શાફ્ટ ઊભો'],
  1: ['પહેલો ગિયર', '3.78 : 1 · સૌથી વધુ ટૉર્ક'],
  2: ['બીજો ગિયર', '2.09 : 1 · ઝડપ વધે'],
  3: ['ત્રીજો ગિયર', '1.51 : 1'],
  4: ['ચોથો ગિયર', '1 : 1 · ડાયરેક્ટ, કાઉન્ટર ખાલી ફરે'],
  5: ['પાંચમો ગિયર', '0.84 : 1 · ઓવરડ્રાઇવ, ઇંધણ બચે'],
};

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await p.route(/three\.min\.js|OrbitControls\.js/, r => r.fulfill({ path: r.request().url().includes('Orbit') ? SP + '/cdn/pkg/package/examples/js/controls/OrbitControls.js' : SP + '/cdn/pkg/package/build/three.min.js', contentType: 'application/javascript' }));
  // virtual clock: the app only advances when we say so
  await p.addInitScript(() => { let vt = 0; const q = []; performance.now = () => vt; window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.__adv = ms => { vt += ms; const c = q.splice(0); c.forEach(f => f(vt)); }; });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/reel.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.addStyleTag({ content: OVERLAY_CSS });
  await p.evaluate(h => { document.body.insertAdjacentHTML('beforeend', h); }, OVERLAY_HTML);
  await p.evaluate(() => { for (let i = 0; i < 30; i++) window.__adv(16); });
  await p.evaluate(() => { document.getElementById('cFlow').click(); });   // power-flow arrows on
  await p.waitForTimeout(300);

  let frame = 0, t = 0; const log = [];
  let camA = .5;
  async function setHead(g) {
    await p.evaluate(([g, col, t, s, chain]) => {
      const B = document.getElementById('rBadge'); B.textContent = g; B.style.background = col;
      document.getElementById('rT').textContent = t; document.getElementById('rS').textContent = s;
      document.getElementById('rPath').innerHTML = chain.map(([n, on], i) => (i ? '<i>➜</i>' : '') + '<span class="' + (on ? 'on' : 'off') + '">' + n + '</span>').join('');
    }, [g, GCOL[g], INFO[g][0], INFO[g][1], CHAIN(g)]);
  }
  async function step(n, fx) {
    for (let k = 0; k < n; k++) {
      const st = await p.evaluate(([dt, a, fx]) => {
        const S = window.__sg, s = S.s, cam = S.camera, tg = S.controls.target;
        // slow orbit around the gearbox
        const R = 15.5, h = 4.6; tg.set(-.4, -.55, 0); if (cam.fov !== 46) { cam.fov = 46; cam.updateProjectionMatrix(); }
        cam.position.set(tg.x + R * Math.sin(a), tg.y + h, tg.z + R * Math.cos(a));
        window.__adv(dt);
        document.getElementById('rE').textContent = Math.round(s.E);
        document.getElementById('rO').textContent = Math.round(Math.abs(s.v * 40));
        document.getElementById('rV').textContent = Math.round(Math.abs(s.v));
        const k = document.getElementById('rKnob'); k.setAttribute('cx', s.knob.x); k.setAttribute('cy', s.knob.y);
        const P = document.getElementById('rPop'), C = document.getElementById('rCard');
        if (fx) { P.textContent = fx.pop || ''; P.style.setProperty('--op', fx.pop ? fx.po : 0); P.style.setProperty('--sc', fx.ps || 1);
          if (fx.card !== undefined) C.innerHTML = fx.card; C.style.setProperty('--cop', fx.co || 0); }
        return { E: s.E, th: s.th, I: s.I, gear: s.gear, p: s.p };
      }, [DT, camA, fx ? fx(k / n) : null]);
      log.push(st);
      camA += 0.0009;
      if (!TEST || [0, Math.floor(n / 2)].includes(k)) await p.screenshot({ path: `${OUT}/f${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
      frame++; t += DT;
    }
  }
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const sec = s => Math.round(s * FPS);
  const kb = p.keyboard;

  // ---- intro card over a running engine in neutral
  await setHead('N');
  const intro = '<b>N થી 5 ગિયર<br><em>પાવર ક્યાંથી ક્યાં જાય?</em></b><span>સિંક્રોમેશ ગિયરબોક્સ · 3D સિમ્યુલેટર</span><div class="chips">' + ['N', 1, 2, 3, 4, 5].map(g => '<u style="background:' + GCOL[g] + '">' + g + '</u>').join('') + '</div>';
  await step(sec(2.6), x => ({ card: intro, co: x < .8 ? 1 : 1 - (x - .8) / .2 }));
  // ---- neutral
  await step(sec(4.4), x => ({ card: '', co: 0, pop: 'ન્યૂટ્રલ: આઉટપુટ સુધી પાવર નથી', po: x > .12 && x < .7 ? 1 : 0 }));
  // ---- gears 1..5
  for (const g of ['1', '2', '3', '4', '5']) {
    await kb.up('ArrowUp');
    await kb.down(' ');
    await step(sec(.45), x => ({ pop: 'ક્લચ દબાવો ⬇', po: 1, ps: 1 }));
    await kb.press(g);
    await setHead(g);
    let n = 0;
    while (n < sec(1.4)) { await step(1, () => ({ pop: 'ગિયર ' + g + ' · સિંક્રો ઝડપ મેળવે', po: 1 })); n++; if (log[log.length - 1].gear === g && n > sec(.35)) break; }
    await kb.up(' ');
    await kb.down('ArrowUp');
    await step(sec(g === '5' ? 4.6 : 3.9), x => ({ pop: 'ગિયર ' + g + ' ✓', po: x < .18 ? 1 : 0, ps: 1 + .15 * (1 - ease(x / .18)) }));
  }
  await kb.up('ArrowUp');
  // ---- outro
  const outro = '<b>ગિયરબોક્સ હવે<br><em>સમજાઈ ગયું?</em></b><span>આખો 3D સિમ્યુલેટર, ડેમો, થિયરી અને MCQ<br>ગુજરાતીમાં, મફત · લિંક બાયોમાં 🔗</span><span>ફોલો કરો · શેર કરો</span>';
  await step(sec(3.2), x => ({ card: outro, co: ease(x / .2) }));

  fs.writeFileSync(OUT + '/log.json', JSON.stringify({ fps: FPS, frames: frame, log }));
  console.log('frames', frame, 'errors', errs);
  await b.close();
})();
