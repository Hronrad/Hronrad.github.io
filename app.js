(function () {
    const DEFAULT_AUTOMATA_SETTINGS = {
        statesCount: 10,
        fps: 15,
        exploreHue: 170
    };
    const MAX_BGM_VOLUME = 0.1;
    const AUDIO_TRACKS = [
        "assets/BGM/Scott Lloyd Shelly - Overworld Day.mp3",
        "assets/BGM/claire.mp3",
        "assets/BGM/gym.mp3"
    ];
    const PAGE_THEMES = {
        home: { cssHue: 210, cssSaturation: "100%", controlSaturation: "55%", cssLightness: "50%", caHue: 210 },
        intro: { cssHue: 210, cssSaturation: "100%", controlSaturation: "55%", cssLightness: "50%", caHue: 210 },
        research: { cssHue: 210, cssSaturation: "100%", controlSaturation: "55%", cssLightness: "50%", caHue: 210 },
        media: { cssHue: 285, cssSaturation: "100%", controlSaturation: "60%", cssLightness: "50%", caHue: 285 },
        github: { cssHue: 28, cssSaturation: "100%", controlSaturation: "60%", cssLightness: "50%", caHue: 28 },
        explore: { cssHue: 170, cssSaturation: "100%", controlSaturation: "60%", cssLightness: "42%", caHue: 170 }
    };

    const state = {
        currentTrackIndex: 0,
        hasHomeIntroUnlocked: false,
        hasAutomataReachedEvolve: false,
        hasPlayedHomeIntro: false,
        isAutomataPlayground: false,
        isPlayingBGM: false,
        isGlassTheme: false,
        lastGliderSpawnAt: 0,
        playgroundHue: DEFAULT_AUTOMATA_SETTINGS.exploreHue,
        currentLang: "zh"
    };
    let uiAudioContext;

    function setCssTheme(hue, saturation, controlSaturation, lightness) {
        document.documentElement.style.setProperty("--theme-hue", String(hue));
        document.documentElement.style.setProperty("--theme-saturation", saturation);
        document.documentElement.style.setProperty("--theme-control-saturation", controlSaturation);
        document.documentElement.style.setProperty("--theme-lightness", lightness);
    }

    function setBGMIndicator(isPlaying) {
        const icon = document.getElementById("bgm-icon");
        const text = document.getElementById("bgm-text");

        if (icon) {
            icon.alt = isPlaying ? "BGM on" : "BGM off";
        }

        if (text) {
            text.innerText = isPlaying ? "AUDIO: ON" : "AUDIO: OFF";
        }
    }

    function loadCurrentTrack() {
        const audio = document.getElementById("bgm-audio");
        if (!AUDIO_TRACKS.length) {
            return;
        }
        audio.src = AUDIO_TRACKS[state.currentTrackIndex];
        audio.load();
    }

    function playCurrentTrack() {
        const audio = document.getElementById("bgm-audio");
        audio.volume = Math.min(audio.volume || MAX_BGM_VOLUME, MAX_BGM_VOLUME);

        return audio.play().then(() => {
            state.isPlayingBGM = true;
            setBGMIndicator(true);
        }).catch(() => {
            state.isPlayingBGM = false;
            setBGMIndicator(false);
        });
    }

    function playNextTrack() {
        if (!AUDIO_TRACKS.length) {
            return Promise.resolve();
        }

        state.currentTrackIndex = (state.currentTrackIndex + 1) % AUDIO_TRACKS.length;
        loadCurrentTrack();
        return playCurrentTrack();
    }

    function showPage(hash) {
        if (state.isAutomataPlayground) {
            exitAutomataPlayground();
        }

        document.querySelectorAll(".page-panel").forEach((panel) => panel.classList.remove("active"));
        document.querySelectorAll(".nav-list a").forEach((link) => link.classList.remove("active"));
        document.body.classList.toggle("home-page", hash === "home");
        document.body.classList.toggle("profile-page", hash === "intro");

        const targetPage = document.getElementById(`page-${hash}`);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        const activeNav = document.querySelector(`.nav-list a[href="#${hash}"]`);
        if (activeNav) {
            activeNav.classList.add("active");
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function enterAutomataPlayground() {
        state.isAutomataPlayground = true;
        state.lastGliderSpawnAt = 0;
        document.body.classList.add("automata-playground");
    }

    function exitAutomataPlayground() {
        state.isAutomataPlayground = false;
        document.body.classList.remove("automata-playground");
    }

    function applyPageTheme(hash, engine) {
        const theme = PAGE_THEMES[hash] || PAGE_THEMES.home;
        setCssTheme(theme.cssHue, theme.cssSaturation, theme.controlSaturation, theme.cssLightness);
        if (hash === "explore" && state.isAutomataPlayground) {
            setCssTheme(state.playgroundHue, theme.cssSaturation, theme.controlSaturation, theme.cssLightness);
            engine.setThemeHue(state.playgroundHue);
            return;
        }
        engine.setThemeHue(theme.caHue);
    }

    function playUiSelectSound() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return;
        }

        if (!uiAudioContext) {
            uiAudioContext = new AudioContextClass();
        }

        if (uiAudioContext.state === "suspended") {
            uiAudioContext.resume().catch(() => {});
        }

        const now = uiAudioContext.currentTime;
        const masterGain = uiAudioContext.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.exponentialRampToValueAtTime(0.028, now + 0.008);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        masterGain.connect(uiAudioContext.destination);

        const lead = uiAudioContext.createOscillator();
        lead.type = "square";
        lead.frequency.setValueAtTime(1046.5, now);
        lead.frequency.setValueAtTime(1568, now + 0.055);

        const harmony = uiAudioContext.createOscillator();
        const harmonyGain = uiAudioContext.createGain();
        harmony.type = "square";
        harmony.frequency.setValueAtTime(523.25, now);
        harmony.frequency.setValueAtTime(784, now + 0.055);
        harmonyGain.gain.setValueAtTime(0.35, now);

        lead.connect(masterGain);
        harmony.connect(harmonyGain);
        harmonyGain.connect(masterGain);

        lead.start(now);
        harmony.start(now);
        lead.stop(now + 0.1);
        harmony.stop(now + 0.1);
    }

    function markHomeIntroPending(hash) {
        const homePage = document.getElementById("page-home");
        if (!homePage) {
            return;
        }

        if (hash === "home" && !state.hasPlayedHomeIntro && !state.hasHomeIntroUnlocked) {
            homePage.classList.add("pending-reveal");
            return;
        }

        homePage.classList.remove("pending-reveal");
    }

    function playHomeIntroRevealOnce(hash) {
        const homePage = document.getElementById("page-home");
        if (!homePage || hash !== "home" || state.hasPlayedHomeIntro || !state.hasHomeIntroUnlocked) {
            return;
        }

        state.hasPlayedHomeIntro = true;
        homePage.classList.remove("pending-reveal");
        homePage.classList.add("initial-reveal");
        window.setTimeout(() => {
            homePage.classList.remove("initial-reveal");
        }, 1100);
    }

    function unlockHomeIntroReveal(hash) {
        if (state.hasHomeIntroUnlocked) {
            return;
        }

        state.hasHomeIntroUnlocked = true;
        markHomeIntroPending(hash);
        playHomeIntroRevealOnce(hash);
    }

    function toggleBGM() {
        const audio = document.getElementById("bgm-audio");
        audio.volume = Math.min(audio.volume || MAX_BGM_VOLUME, MAX_BGM_VOLUME);

        if (state.isPlayingBGM) {
            audio.pause();
            state.isPlayingBGM = false;
            setBGMIndicator(false);
        } else {
            playCurrentTrack();
        }
    }

    function applyLanguage(lang) {
        const translations = window.TRANSLATIONS[lang];
        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            if (translations[key]) {
                if (element.id === "explore-back-btn") {
                    element.setAttribute("data-label", translations[key]);
                    element.setAttribute("aria-label", translations[key]);
                    element.innerText = "";
                    return;
                }
                element.innerText = translations[key];
            }
        });
        document.querySelectorAll("[data-i18n-html]").forEach((element) => {
            const key = element.getAttribute("data-i18n-html");
            if (translations[key]) {
                element.innerHTML = translations[key];
            }
        });

        document.getElementById("lang-btn").innerText = lang === "zh" ? "English" : "中文";
        syncThemeToggleCopy();
        syncGlassThemePresentation();
    }

    function syncGlassThemePresentation() {
        const translations = window.TRANSLATIONS[state.currentLang];
        const siteTitle = document.getElementById("site-title-text");
        const siteSubtitle = document.getElementById("site-subtitle-text");
        const langButton = document.getElementById("lang-btn");

        if (state.isGlassTheme) {
            siteTitle.innerText = "HRONRAD";
            siteSubtitle.innerText = "";
            langButton.innerText = state.currentLang === "zh" ? "[ ENGLISH ]" : "[ 中文 ]";
        } else {
            siteTitle.innerText = translations.site_title;
            siteSubtitle.innerText = translations.site_subtitle;
            langButton.innerText = state.currentLang === "zh" ? "English" : "中文";
        }

        document.querySelectorAll(".nav-list a").forEach((link) => {
            const targetKey = state.isGlassTheme
                ? link.getAttribute("data-glass-i18n")
                : link.getAttribute("data-i18n");

            if (targetKey && translations[targetKey]) {
                link.innerText = translations[targetKey];
            }
        });

        document.querySelectorAll(".btn-black").forEach((button) => {
            if (state.isGlassTheme) {
                const nextLabel = button.innerText.replace(/\s*>\s*$/, "");
                button.setAttribute("data-glass-label", nextLabel);
                button.innerText = "";
                return;
            }

            button.removeAttribute("data-glass-label");
        });
    }

    function toggleLang() {
        state.currentLang = state.currentLang === "zh" ? "en" : "zh";
        applyLanguage(state.currentLang);
    }

    function bindPageRouting(engine) {
        window.addEventListener("hashchange", () => {
            const hash = window.location.hash.replace("#", "") || "home";
            showPage(hash);
            applyPageTheme(hash, engine);
            markHomeIntroPending(hash);
            playHomeIntroRevealOnce(hash);
        });

        const initialHash = window.location.hash.replace("#", "") || "home";
        showPage(initialHash);
        applyPageTheme(initialHash, engine);
        markHomeIntroPending(initialHash);
        playHomeIntroRevealOnce(initialHash);
    }

    function bindAutomataPhaseEvents() {
        window.addEventListener("ca-phase-change", (event) => {
            if (event.detail.currentPhase !== "EVOLVE") {
                return;
            }

            state.hasAutomataReachedEvolve = true;
            const currentHash = window.location.hash.replace("#", "") || "home";
            unlockHomeIntroReveal(currentHash);
        });
    }

    function bindAudioControls() {
        const audio = document.getElementById("bgm-audio");
        const bgmToggle = document.getElementById("bgm-toggle");

        audio.volume = MAX_BGM_VOLUME;
        loadCurrentTrack();
        setBGMIndicator(false);

        bgmToggle.addEventListener("click", toggleBGM);
        bgmToggle.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleBGM();
            }
        });
        audio.addEventListener("ended", () => {
            playNextTrack();
        });
    }

    function bindLanguageControls() {
        document.getElementById("lang-btn").addEventListener("click", toggleLang);
    }

    function bindAutomataControls(engine) {
        const statesSlider = document.getElementById("statesSlider");
        const fpsSlider = document.getElementById("fpsSlider");
        const statesValue = document.getElementById("valStates");
        const fpsValue = document.getElementById("valFps");

        statesSlider.addEventListener("input", (event) => {
            const nextValue = parseInt(event.target.value, 10);
            engine.setStatesCount(nextValue);
            statesValue.innerText = String(nextValue);
        });

        fpsSlider.addEventListener("input", (event) => {
            const nextValue = parseInt(event.target.value, 10);
            engine.setFps(nextValue);
            fpsValue.innerText = String(nextValue);
        });
    }

    function syncThemeToggleCopy() {
        const themeToggle = document.getElementById("theme-mode-toggle");
        if (!themeToggle) {
            return;
        }

        const nextKey = state.isGlassTheme ? "btn_theme_mode_off" : "btn_theme_mode_on";
        const text = window.TRANSLATIONS[state.currentLang][nextKey];
        themeToggle.setAttribute("data-i18n", nextKey);
        themeToggle.innerText = text;
    }

    function resetAutomataToDefaults(engine) {
        const statesSlider = document.getElementById("statesSlider");
        const fpsSlider = document.getElementById("fpsSlider");
        const hueSlider = document.getElementById("hueSlider");
        const statesValue = document.getElementById("valStates");
        const fpsValue = document.getElementById("valFps");
        const hueValue = document.getElementById("valHue");

        state.playgroundHue = DEFAULT_AUTOMATA_SETTINGS.exploreHue;

        statesSlider.value = String(DEFAULT_AUTOMATA_SETTINGS.statesCount);
        fpsSlider.value = String(DEFAULT_AUTOMATA_SETTINGS.fps);
        hueSlider.value = String(DEFAULT_AUTOMATA_SETTINGS.exploreHue);

        statesValue.innerText = String(DEFAULT_AUTOMATA_SETTINGS.statesCount);
        fpsValue.innerText = String(DEFAULT_AUTOMATA_SETTINGS.fps);
        hueValue.innerText = String(DEFAULT_AUTOMATA_SETTINGS.exploreHue);

        engine.reset({
            statesCount: DEFAULT_AUTOMATA_SETTINGS.statesCount,
            fps: DEFAULT_AUTOMATA_SETTINGS.fps,
            themeHue: DEFAULT_AUTOMATA_SETTINGS.exploreHue
        });

        const currentHash = window.location.hash.replace("#", "") || "home";
        applyPageTheme(currentHash, engine);
    }

    function bindPlaygroundUi(engine) {
        const hueSlider = document.getElementById("hueSlider");
        const hueValue = document.getElementById("valHue");
        const resetButton = document.getElementById("resetAutomataBtn");
        const themeToggle = document.getElementById("theme-mode-toggle");

        hueSlider.addEventListener("input", (event) => {
            const nextHue = parseInt(event.target.value, 10);
            state.playgroundHue = nextHue;
            hueValue.innerText = String(nextHue);
            setCssTheme(nextHue, PAGE_THEMES.explore.cssSaturation, PAGE_THEMES.explore.controlSaturation, PAGE_THEMES.explore.cssLightness);
            if (state.isAutomataPlayground) {
                engine.setThemeHue(nextHue);
            }
        });

        resetButton.addEventListener("click", () => {
            resetAutomataToDefaults(engine);
        });

        themeToggle.addEventListener("click", () => {
            state.isGlassTheme = !state.isGlassTheme;
            if (state.isGlassTheme && state.isAutomataPlayground) {
                exitAutomataPlayground();
            }
            document.body.classList.toggle("glass-mode", state.isGlassTheme);
            applyLanguage(state.currentLang);
            applyPageTheme(window.location.hash.replace("#", "") || "home", engine);
        });
    }

    function bindPlaygroundControls(engine) {
        const startButton = document.getElementById("explore-automata-start");
        const backButton = document.getElementById("explore-back-btn");
        const canvas = document.getElementById("bg-canvas");

        startButton.addEventListener("click", (event) => {
            event.preventDefault();
            enterAutomataPlayground();
            setCssTheme(
                state.playgroundHue,
                PAGE_THEMES.explore.cssSaturation,
                PAGE_THEMES.explore.controlSaturation,
                PAGE_THEMES.explore.cssLightness
            );
            engine.setThemeHue(state.playgroundHue);
        });

        backButton.addEventListener("click", () => {
            exitAutomataPlayground();
            showPage("explore");
            applyPageTheme("explore", engine);
        });

        canvas.addEventListener("click", (event) => {
            if (!state.isAutomataPlayground) {
                return;
            }

            const now = Date.now();
            if (now - state.lastGliderSpawnAt < 1000) {
                return;
            }

            if (engine.spawnRandomGliderAtClientPoint(event.clientX, event.clientY)) {
                state.lastGliderSpawnAt = now;
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && state.isAutomataPlayground) {
                exitAutomataPlayground();
            }
        });
    }

    function bindUiButtonSounds() {
        document.addEventListener("click", (event) => {
            const trigger = event.target.closest("button, .btn-black, .bgm-btn, .nav-list a");
            if (!trigger) {
                return;
            }
            playUiSelectSound();
        });
    }

    function bindGlassGlowEffects() {
        const glowTargets = document.querySelectorAll(".pixel-card, #page-home, #page-intro, #page-research");

        glowTargets.forEach((target) => {
            target.addEventListener("mousemove", (event) => {
                const rect = target.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                target.style.setProperty("--glass-glow-x", `${x}px`);
                target.style.setProperty("--glass-glow-y", `${y}px`);
            });
        });

        const collage1 = document.querySelector('.glass-collage-card-1');
        const collage2 = document.querySelector('.glass-collage-card-2');
        const energyCard = document.querySelector('.glass-energy-card');
        const introPage = document.getElementById('page-intro');
        
        window.addEventListener('scroll', () => {
            if (!state.isGlassTheme || !introPage.classList.contains('active')) return;
            const scrollY = window.scrollY;
            if(collage1) collage1.style.transform = `translateY(${scrollY * -0.15}px) rotate(4deg)`;
            if(collage2) collage2.style.transform = `translateY(${scrollY * -0.05}px) rotate(-3deg)`;
            if(energyCard) energyCard.style.transform = `translate(-50%, -50%) rotate(${scrollY * 0.15}deg)`;
        });
    }

    function init() {
        const audio = document.getElementById("bgm-audio");
        const canvas = document.getElementById("bg-canvas");
        const footerYear = document.getElementById("glass-footer-year");
        const engine = new window.CAEngine(canvas, {
            statesCount: DEFAULT_AUTOMATA_SETTINGS.statesCount,
            fps: DEFAULT_AUTOMATA_SETTINGS.fps,
            word: "HRONRAD",
            themeHue: 210
        });

        if (footerYear) {
            footerYear.innerText = `(C) ${new Date().getFullYear()} HRONRAD`;
        }

        bindPageRouting(engine);
        bindAudioControls();
        bindLanguageControls();
        bindAutomataControls(engine);
        bindPlaygroundUi(engine);
        bindPlaygroundControls(engine);
        bindAutomataPhaseEvents();
        bindUiButtonSounds();
        bindGlassGlowEffects();
        applyLanguage(state.currentLang);
        engine.start();
        window.setTimeout(() => {
            const currentHash = window.location.hash.replace("#", "") || "home";
            unlockHomeIntroReveal(currentHash);
        }, 5000);
        audio.volume = MAX_BGM_VOLUME;
        playCurrentTrack();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
