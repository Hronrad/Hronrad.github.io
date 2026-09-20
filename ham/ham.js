(function () {
    const copy = {
        zh: {
            site_subtitle: "的主页",
            nav_home: "首页",
            nav_intro: "简介",
            nav_github: "Github",
            nav_research: "科研",
            nav_ham: "业余无线电",
            glass_nav_home: "[ MANIFESTO ]",
            glass_nav_intro: "[ PROFILE ]",
            glass_nav_github: "[ ARCHIVE ]",
            glass_nav_research: "[ RESEARCH ]",
            glass_nav_ham: "[ HAM ]",
            ham_title: "业余无线电",
            ham_callsign_label: "电台呼号",
            ham_location: "中国 · 南京",
            ham_intro: "我是业余无线电爱好者 Hronrad，电台呼号为 BA4TIR。业余无线电让我通过电波探索传播、通信技术与世界各地的连接。欢迎通过 QRZ 查看我的电台资料。",
            btn_qrz: "QRZ 资料 >",
            mode_pixel: "MODE: PIXEL",
            mode_glass: "MODE: GLASS"
        },
        en: {
            site_subtitle: "Homepage",
            nav_home: "Home",
            nav_intro: "About",
            nav_github: "GitHub",
            nav_research: "Research",
            nav_ham: "Ham Radio",
            glass_nav_home: "[ MANIFESTO ]",
            glass_nav_intro: "[ PROFILE ]",
            glass_nav_github: "[ ARCHIVE ]",
            glass_nav_research: "[ RESEARCH ]",
            glass_nav_ham: "[ HAM ]",
            ham_title: "Ham Radio",
            ham_callsign_label: "Call sign",
            ham_location: "Nanjing · China",
            ham_intro: "I am Hronrad, an amateur radio operator with the call sign BA4TIR. Ham radio lets me explore propagation, communications technology, and connections across the world through radio. Visit QRZ for my station profile.",
            btn_qrz: "VIEW ON QRZ >",
            mode_pixel: "MODE: PIXEL",
            mode_glass: "MODE: GLASS"
        }
    };

    const state = { lang: "zh", glass: true };
    let engine;

    function applyCopy() {
        const translations = copy[state.lang];
        document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";

        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.getAttribute("data-i18n");
            if (translations[key]) element.innerText = translations[key];
        });

        document.querySelectorAll(".nav-list a").forEach((link) => {
            const key = state.glass
                ? link.getAttribute("data-glass-i18n")
                : link.getAttribute("data-i18n");
            if (key && translations[key]) link.innerText = translations[key];
        });

        const title = document.querySelector("#page-ham > h1");
        if (title) title.setAttribute("data-outline-text", title.innerText.trim());

        document.getElementById("lang-btn").innerText = state.lang === "zh" ? "English" : "中文";
        document.getElementById("ham-mode-toggle").innerText = state.glass
            ? translations.mode_pixel
            : translations.mode_glass;

        const qrzButton = document.querySelector("#page-ham .btn-black");
        if (qrzButton) {
            qrzButton.setAttribute("data-glass-label", translations.btn_qrz.replace(/\s*>\s*$/, ""));
            qrzButton.innerText = state.glass ? "" : translations.btn_qrz;
        }
    }

    function toggleLanguage() {
        state.lang = state.lang === "zh" ? "en" : "zh";
        applyCopy();
    }

    function toggleMode() {
        state.glass = !state.glass;
        document.body.classList.toggle("glass-mode", state.glass);
        applyCopy();
    }

    function init() {
        const canvas = document.getElementById("bg-canvas");
        const footerYear = document.getElementById("glass-footer-year");
        const isNarrow = window.matchMedia("(max-width: 800px)").matches;
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        document.body.classList.toggle("mobile-env", isNarrow);
        document.body.classList.toggle("low-effects", isNarrow || prefersReducedMotion);

        if (footerYear) footerYear.innerText = `(C) ${new Date().getFullYear()} HRONRAD`;
        document.getElementById("lang-btn").addEventListener("click", toggleLanguage);
        document.getElementById("ham-mode-toggle").addEventListener("click", toggleMode);
        applyCopy();

        if (window.CAEngine && canvas) {
            try {
                engine = new window.CAEngine(canvas, {
                    statesCount: 10,
                    fps: prefersReducedMotion ? 5 : 12,
                    word: "BA4TIR",
                    themeHue: 190,
                    performanceProfile: {
                        isSafari: false,
                        isIOSDevice: false,
                        isTouchMobile: isNarrow,
                        prefersReducedMotion,
                        useLowEffects: isNarrow || prefersReducedMotion
                    }
                });
                engine.start();
            } catch (error) {
                console.warn("Background animation unavailable.", error);
            }
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
