# Instagram reel: N → 1 → 2 → 3 → 4 → 5

`gearbox-reel-N-to-5.mp4`: 1080×1920, 24 fps, 36.6 s, H.264 + AAC (engine sound).

How it was made:

1. `index.html` is copied to `reel/reel.html` with `window.__sg={camera,controls,root,THREE,get s(){return s;}};` added before the last `})();` and `data-theme="dark"` on `<html>`.
2. `node reel.js frames` drives the simulator on a virtual clock (exact 24 fps), presses clutch / gear / accelerator, and saves every frame with the Gujarati overlay.
3. `python3 audio.py frames/log.json engine.wav` builds the engine sound from the logged rpm.
4. `ffmpeg -framerate 24 -i frames/f%05d.jpg -i engine.wav -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -shortest gearbox-reel-N-to-5.mp4`
