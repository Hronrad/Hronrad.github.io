/* Shared mobile navigation and measured fixed-footer clearance. */
(() => {
    const nav = document.getElementById('left-sidebar');
    if (!nav) return;
    const compact = matchMedia('(orientation: portrait) and (max-width: 1400px)');
    const buttons = [-1, 1].map(direction => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `nav-scroll-arrow nav-scroll-${direction < 0 ? 'previous' : 'next'}`;
        button.textContent = direction < 0 ? '‹' : '›';
        button.setAttribute('aria-controls', nav.id);
        button.addEventListener('click', () => {
            nav.scrollBy({ left: direction * Math.max(100, nav.clientWidth * 0.75),
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
        nav.after(button);
        return button;
    });
    let pending = false;
    let revealActive = false;
    function schedule(reveal = false) {
        revealActive ||= reveal;
        if (pending) return;
        pending = true;
        // Shell controls must initialize even when WebKit defers animation frames.
        // Coalesce layout notifications without tying essential UI to animation.
        setTimeout(() => {
            pending = false;
            const reveal = revealActive;
            revealActive = false;
            update(reveal);
        }, 0);
    }
    function update(reveal) {
        const fullWidth = nav.clientWidth + (document.body.classList.contains('nav-overflow') ? 96 : 0);
        const overflow = compact.matches && nav.scrollWidth > fullWidth + 1;
        const changed = document.body.classList.contains('nav-overflow') !== overflow;
        document.body.classList.toggle('nav-overflow', overflow);
        if (compact.matches && (reveal || changed)) {
            const active = nav.querySelector('a.active, a[aria-current="page"]');
            if (active) {
                const viewport = nav.getBoundingClientRect();
                const item = active.getBoundingClientRect();
                if (item.left < viewport.left + 12 || item.right > viewport.right - 12) {
                    nav.scrollBy({ left: item.left - viewport.left - (viewport.width - item.width) / 2, behavior: 'auto' });
                }
            }
        }
        const english = document.documentElement.lang.startsWith('en');
        buttons[0].setAttribute('aria-label', english ? 'Scroll navigation left' : '向左滚动导航');
        buttons[1].setAttribute('aria-label', english ? 'Scroll navigation right' : '向右滚动导航');
        buttons[0].disabled = nav.scrollLeft <= 1;
        buttons[1].disabled = nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 1;
        const footer = document.querySelector(document.body.classList.contains('glass-mode') ? '.glass-footer' : '.sys-status-bar');
        const height = compact.matches && !document.body.classList.contains('automata-playground') ? footer?.getBoundingClientRect().height || 0 : 0;
        document.documentElement.style.setProperty('--shell-footer', `${Math.ceil(height)}px`);
    }
    nav.addEventListener('scroll', () => schedule(), { passive: true });
    window.addEventListener('resize', () => schedule(true));
    window.addEventListener('hashchange', () => schedule(true));
    new MutationObserver(() => schedule(true)).observe(nav, { childList: true, subtree: true });
    new MutationObserver(() => schedule(true)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const observer = new ResizeObserver(() => schedule(true));
    [nav, nav.querySelector('.nav-list')].filter(Boolean).forEach(el => observer.observe(el));
    const footerObserver = new ResizeObserver(() => schedule());
    document.querySelectorAll('.glass-footer, .sys-status-bar').forEach(el => footerObserver.observe(el));
    document.fonts.ready.then(() => schedule(true));
    update(true);
})();
