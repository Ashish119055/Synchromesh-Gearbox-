# Builds the reel's engine soundtrack from the per-frame log the renderer wrote.
# usage: python3 audio.py frames/log.json out.wav
import json, sys, wave
import numpy as np

log = json.load(open(sys.argv[1]))
fps, rows = log['fps'], log['log']
SR = 44100
n = int(len(rows) / fps * SR)
t_frame = np.arange(len(rows)) / fps
t = np.arange(n) / SR
E = np.interp(t, t_frame, [r['E'] for r in rows])
TH = np.interp(t, t_frame, [r['th'] for r in rows])
I = np.interp(t, t_frame, [abs(r['I']) for r in rows])

# engine: 4-cylinder firing frequency = rpm / 30, rich in harmonics, brighter with throttle
f0 = np.maximum(E, 300) / 30.0
ph = 2 * np.pi * np.cumsum(f0) / SR
eng = np.zeros(n)
for k in range(1, 11):
    eng += np.sin(k * ph + k * 0.7) * (1.0 / k) * (0.35 + 0.65 * TH) ** (0.3 * (k - 1))
eng += 0.25 * np.sin(0.5 * ph)                      # low uneven firing rumble
rng = np.random.default_rng(7)
noise = np.convolve(rng.standard_normal(n), np.ones(30) / 30, mode='same')
eng = eng * (0.55 + 0.45 * TH) + noise * (0.15 + 0.35 * TH)

# gear whine from the input-gear mesh (18 teeth)
wf = I / 60 * 18
whine = 0.05 * np.sin(2 * np.pi * np.cumsum(wf) / SR) * np.clip(I / 3000, 0, 1)

# clunk when a gear locks in
clunk = np.zeros(n)
prev = rows[0]['gear']
for i, r in enumerate(rows):
    if r['gear'] and r['gear'] != prev:
        s0 = int(i / fps * SR); L = int(0.18 * SR); tt = np.arange(L) / SR
        thump = np.sin(2 * np.pi * 95 * tt) * np.exp(-tt * 28) + 0.5 * rng.standard_normal(L) * np.exp(-tt * 90)
        clunk[s0:s0 + L] += thump[:max(0, min(L, n - s0))]
    prev = r['gear']

mix = 0.5 * eng / np.max(np.abs(eng)) + whine + 0.55 * clunk
fade = np.minimum(1, np.minimum(t / 0.6, (t[-1] - t) / 1.2))
mix *= np.clip(fade, 0, 1)
mix = mix / np.max(np.abs(mix)) * 0.85
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', sys.argv[2], round(n / SR, 2), 's')
