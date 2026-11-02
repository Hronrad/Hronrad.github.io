# Hronrad.github.io

Static bilingual personal site. No build step is required.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/#ham> to preview the BA4TIR radio console. The legacy `/ham/` and `/ham/index.html` entries redirect to the same hash route.

The HAM page presents BA4TIR station identity, a single VFO tuning slider and CRT monitor, three SVG cartographic panels for OM92LC / CQ 24 / ITU 44, and the NJUHAM link. The CRT samples the global CA canvas and the hue slider, overlays Rule-30 static, and locks its station identification at 14.270 MHz. VFO tuning also reduces the existing glass-theme grain near resonance, restoring normal grain when leaving HAM. It does not receive or transmit RF.

Run regression checks with `node --test tests/*.test.cjs`.
