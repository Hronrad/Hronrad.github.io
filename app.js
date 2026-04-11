(function () {
    const MAX_BGM_VOLUME = 0.1;
    const BGM_ICONS = {
        on: "assets/soundon.jpeg",
        off: "assets/soundoff.jpeg"
    };

    const state = {
        isPlayingBGM: false,
        currentLang: "zh"
    };

    function setBGMIcon(isPlaying) {
        const icon = document.getElementById("bgm-icon");
        icon.src = isPlaying ? BGM_ICONS.on : BGM_ICONS.off;
    }

    function showPage(hash) {
        document.querySelectorAll(".page-panel").forEach((panel) => panel.classList.remove("active"));
        document.querySelectorAll(".nav-list a").forEach((link) => link.classList.remove("active"));

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

    function toggleBGM() {
        const audio = document.getElementById("bgm-audio");
        audio.volume = Math.min(audio.volume || MAX_BGM_VOLUME, MAX_BGM_VOLUME);

        if (state.isPlayingBGM) {
            audio.pause();
            state.isPlayingBGM = false;
            setBGMIcon(false);
        } else {
            audio.play().then(() => {
                state.isPlayingBGM = true;
                setBGMIcon(true);
            }).catch(() => {
                state.isPlayingBGM = false;
                setBGMIcon(false);
            });
        }
    }

    function applyLanguage(lang) {
        const translations = window.TRANSLATIONS[lang];
        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            if (translations[key]) {
                element.innerText = translations[key];
            }
        });

        document.getElementById("lang-btn").innerText = lang === "zh" ? "English" : "中文";
    }

    function toggleLang() {
        state.currentLang = state.currentLang === "zh" ? "en" : "zh";
        applyLanguage(state.currentLang);
    }

    function bindPageRouting() {
        window.addEventListener("hashchange", () => {
            const hash = window.location.hash.replace("#", "") || "home";
            showPage(hash);
        });

        showPage(window.location.hash.replace("#", "") || "home");
    }

    function bindAudioControls() {
        const audio = document.getElementById("bgm-audio");
        const bgmToggle = document.getElementById("bgm-toggle");

        audio.volume = MAX_BGM_VOLUME;
        setBGMIcon(true);

        bgmToggle.addEventListener("click", toggleBGM);
        bgmToggle.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleBGM();
            }
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

    function init() {
        const audio = document.getElementById("bgm-audio");
        const canvas = document.getElementById("bg-canvas");
        const engine = new window.CAEngine(canvas, {
            statesCount: 10,
            fps: 15,
            word: "HRONRAD"
        });

        bindPageRouting();
        bindAudioControls();
        bindLanguageControls();
        bindAutomataControls(engine);
        applyLanguage(state.currentLang);
        engine.start();
        audio.volume = MAX_BGM_VOLUME;
        audio.play().then(() => {
            state.isPlayingBGM = true;
            setBGMIcon(true);
        }).catch(() => {
            state.isPlayingBGM = false;
            setBGMIcon(false);
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
