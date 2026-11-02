/**
 * ham/ham-console.js
 * BA4TIR 同源元胞噪点 CRT 信号监视器引擎 (与全局 #bg-canvas & #hueSlider 实时耦合)
 */
(function () {
  let rafId = null;
  let isRunning = false;

  const TARGET_FREQ = 14270; // 目标谐振频率 14.270 MHz
  let currentFreq = 14195;

  // 低分辨率元胞像素缓冲 (形成复古显像管颗粒感)
  const CRT_W = 230;
  const CRT_H = 125;
  let caRow = new Uint8Array(CRT_W);
  for (let i = 0; i < CRT_W; i++) caRow[i] = Math.random() > 0.5 ? 1 : 0;

  const offscreen = document.createElement("canvas");
  offscreen.width = CRT_W;
  offscreen.height = CRT_H;
  const offCtx = offscreen.getContext("2d");

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }

  function getActiveHue() {
    const hueSlider = document.getElementById("hueSlider");
    const parsed = hueSlider ? parseInt(hueSlider.value, 10) : 170;
    return Number.isFinite(parsed) ? parsed : 170;
  }

  function updateReadoutUI() {
    const freqStr = (currentFreq / 1000).toFixed(3) + " MHz";
    const vfd = document.getElementById("ham-vfd-digits");
    const osdFreq = document.getElementById("crt-freq-osd");
    const osdStatus = document.getElementById("crt-status-osd");
    const shell = document.getElementById("ham-console-root");
    const lockLed = document.getElementById("ham-lock-led");

    if (vfd) vfd.textContent = freqStr;
    if (osdFreq) osdFreq.textContent = freqStr;

    const isLocked = Math.abs(currentFreq - TARGET_FREQ) <= 8;
    const isEn = document.documentElement.lang === "en";

    if (osdStatus) {
      if (isLocked) {
        osdStatus.textContent = isEn
          ? "CARRIER LOCKED // DE BA4TIR · OM92LC"
          : "CARRIER LOCKED // 载波已锁定 · BA4TIR";
        osdStatus.style.color = "#ffb703";
      } else {
        osdStatus.textContent = isEn
          ? "CA-STATIC // COUPLED DEMODULATION"
          : "CA-STATIC // 元胞噪点解调中";
        osdStatus.style.color = "#00f5d4";
      }
    }

    if (shell) shell.classList.toggle("is-carrier-locked", isLocked);
    if (lockLed) lockLed.classList.toggle("is-locked", isLocked);
    if (isRunning) {
      const detune = Math.min(1, Math.abs(currentFreq - TARGET_FREQ) / 55);
      document.body.style.setProperty("--ham-background-noise", (0.01 + detune * 0.11).toFixed(3));
    }
  }

  function renderLoop(timestamp) {
    if (!isRunning) return;

    const crtCanvas = document.getElementById("ham-crt-canvas");
    if (!crtCanvas) return;
    const crtCtx = crtCanvas.getContext("2d");

    const detune = Math.min(1, Math.abs(currentFreq - TARGET_FREQ) / 55);
    const signalStrength = Math.max(0, 1 - detune);
    const hue = getActiveHue();
    const [cr, cg, cb] = hslToRgb(hue, 85, 60);

    // 1. 生成与背景同色系的 Rule-30 元胞自动机噪点矩阵
    const imgData = offCtx.createImageData(CRT_W, CRT_H);
    const data = imgData.data;
    const noiseDensity = 0.05 + detune * 0.58;
    const syncBarY = Math.floor((timestamp * 0.06) % CRT_H);

    for (let y = 0; y < CRT_H; y++) {
      const nextRow = new Uint8Array(CRT_W);
      const isSyncBand = detune > 0.15 && Math.abs(y - syncBarY) < 6;

      for (let x = 0; x < CRT_W; x++) {
        const left = caRow[(x - 1 + CRT_W) % CRT_W];
        const center = caRow[x];
        const right = caRow[(x + 1) % CRT_W];
        nextRow[x] = left ^ (center | right);
        if (Math.random() < 0.07) nextRow[x] ^= 1;

        const idx = (y * CRT_W + x) * 4;
        const showStatic = Math.random() < noiseDensity || isSyncBand;

        if (showStatic && nextRow[x]) {
          const boost = isSyncBand ? 1.25 : 0.85;
          data[idx] = Math.min(255, cr * boost);
          data[idx + 1] = Math.min(255, cg * boost);
          data[idx + 2] = Math.min(255, cb * boost);
          data[idx + 3] = 255;
        } else {
          data[idx] = 4;
          data[idx + 1] = 10;
          data[idx + 2] = 14;
          data[idx + 3] = 255;
        }
      }
      caRow = nextRow;
    }

    offCtx.putImageData(imgData, 0, 0);
    crtCtx.imageSmoothingEnabled = false;
    crtCtx.drawImage(offscreen, 0, 0, crtCanvas.width, crtCanvas.height);

    // 2. 实时叠合宿主页面的 #bg-canvas (全局 CA.js 元胞自动机实时画面)
    const bgCanvas = document.getElementById("bg-canvas");
    if (bgCanvas && bgCanvas.width > 0 && bgCanvas.height > 0) {
      try {
        crtCtx.save();
        crtCtx.globalAlpha = 0.18 + detune * 0.28;
        crtCtx.globalCompositeOperation = "screen";
        crtCtx.drawImage(bgCanvas, 0, 0, crtCanvas.width, crtCanvas.height);
        crtCtx.restore();
      } catch (e) {}
    }

    // 3. 绘制几何电台测绘准星与谐振驻波
    const w = crtCanvas.width;
    const h = crtCanvas.height;
    const cx = w / 2;
    const cy = h / 2 + 6;

    crtCtx.save();
    crtCtx.strokeStyle = signalStrength > 0.82 ? "#ffb703" : `rgb(${cr}, ${cg}, ${cb})`;
    crtCtx.globalAlpha = 0.3 + signalStrength * 0.7;
    crtCtx.lineWidth = 1.5;

    // 外圈刻度环与十字准星
    crtCtx.beginPath();
    crtCtx.arc(cx, cy, 52, 0, Math.PI * 2);
    crtCtx.stroke();

    crtCtx.beginPath();
    crtCtx.setLineDash([3, 4]);
    crtCtx.arc(cx, cy, 74, 0, Math.PI * 2);
    crtCtx.stroke();
    crtCtx.setLineDash([]);

    crtCtx.beginPath();
    crtCtx.moveTo(cx - 88, cy);
    crtCtx.lineTo(cx + 88, cy);
    crtCtx.moveTo(cx, cy - 64);
    crtCtx.lineTo(cx, cy + 64);
    crtCtx.stroke();

    // 实时双谐波包络波形
    crtCtx.beginPath();
    crtCtx.lineWidth = 2;
    for (let x = 28; x < w - 28; x += 3) {
      const norm = (x - 28) / (w - 56);
      const windowEnv = Math.sin(norm * Math.PI);
      const carrier =
        Math.sin(x * 0.065 - timestamp * 0.009) * (12 + signalStrength * 20) * windowEnv;
      const noiseJitter = (Math.random() - 0.5) * detune * 28;
      const y = cy + carrier + noiseJitter;
      if (x === 28) crtCtx.moveTo(x, y);
      else crtCtx.lineTo(x, y);
    }
    crtCtx.stroke();

    // 锁定时浮现 BA4TIR 几何台标参数
    if (signalStrength > 0.65) {
      crtCtx.fillStyle = "#ffb703";
      crtCtx.font = "bold 14px monospace";
      crtCtx.textAlign = "center";
      crtCtx.fillText("DE BA4TIR // NANJING · OM92LC", cx, cy - 60);

      crtCtx.fillStyle = "#00f5d4";
      crtCtx.font = "11px monospace";
      crtCtx.fillText("CQ ZONE 24 · ITU ZONE 44 · 73!", cx, cy + 74);
    }
    crtCtx.restore();

    rafId = requestAnimationFrame(renderLoop);
  }

  function bindEvents() {
    const tuningSlider = document.getElementById("ham-tuning-slider");
    const quickLockBtn = document.getElementById("ham-quick-lock");
    const langBtn = document.getElementById("lang-btn");

    if (tuningSlider && !tuningSlider.dataset.bound) {
      tuningSlider.dataset.bound = "true";
      tuningSlider.addEventListener("input", (e) => {
        currentFreq = parseInt(e.target.value, 10);
        updateReadoutUI();
      });
    }

    if (quickLockBtn && !quickLockBtn.dataset.bound) {
      quickLockBtn.dataset.bound = "true";
      quickLockBtn.addEventListener("click", () => {
        currentFreq = TARGET_FREQ;
        if (tuningSlider) tuningSlider.value = String(TARGET_FREQ);
        updateReadoutUI();
      });
    }

    if (langBtn && !langBtn.dataset.hamBound) {
      langBtn.dataset.hamBound = "true";
      langBtn.addEventListener("click", () => {
        setTimeout(updateReadoutUI, 30);
      });
    }
  }

  function mountHamConsole() {
    if (isRunning) return;
    const root = document.getElementById("ham-console-root");
    if (!root) return;
    isRunning = true;
    document.body.classList.toggle("ham-noise-coupled", true);
    bindEvents();
    updateReadoutUI();
    rafId = requestAnimationFrame(renderLoop);
  }

  function unmountHamConsole() {
    isRunning = false;
    document.body.classList.toggle("ham-noise-coupled", false);
    document.body.style.removeProperty("--ham-background-noise");
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function checkRoute() {
    const pageHam = document.getElementById("page-ham");
    const hash = window.location.hash.toLowerCase();
    const isVisible =
      hash === "#ham" || (pageHam && pageHam.classList.contains("active"));

    if (isVisible) {
      mountHamConsole();
    } else {
      unmountHamConsole();
    }
  }

  window.addEventListener("hashchange", checkRoute);
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkRoute, 50);
    const pageHam = document.getElementById("page-ham");
    if (pageHam && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(checkRoute);
      observer.observe(pageHam, { attributes: true, attributeFilter: ["class"] });
    }
  });

  window.HamConsole = { mount: mountHamConsole, unmount: unmountHamConsole, checkRoute };
})();
