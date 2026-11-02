# Responsive verification — 2026-09-27

## Implemented

- Shared compact layout through 1400 CSS pixels, including landscape and tablets.
- Native horizontally scrollable navigation with the active destination brought into view.
- Separate header controls and content/footer flow; minimum 44px control targets.
- Fluid grids, wrapping headings and buttons, readable home copy in glass mode.
- Removed the mobile-only blocking notice.
- Safe-area offsets and viewport-fit; playground controls arranged horizontally.
- Live environment refresh on resize and reduced-motion changes.
- Static passive automaton under reduced motion; explicit playground remains interactive.
- Complete HRONRAD/BA4TIR glyph rendering on narrow screens; no simulation reset for height-only browser chrome changes.

## Verified in the Codex in-app browser

Final main-site matrix: 19 viewport sizes × 7 pages × 2 languages × 2 themes = 532 checks, zero failures.

Viewports (CSS pixels):
320×568, 375×667, 430×932, 667×375, 844×390, 768×1024,
1024×768, 1280×800, 1400×900, 639×360, 640×360, 800×600,
801×600, 980×720, 981×720, 1401×900, 1440×900, 1920×1080, 2560×1440.

Assertions: visible content remains within the viewport; no unintended visible horizontal overflow;
first content/heading does not overlap navigation; language button passes center-point hit testing.
Decorative aria-hidden collage elements were excluded from content-overflow assertions.

Final HAM matrix: first nine sizes above × 2 languages × 2 themes = 36 checks, zero failures.
No warning/error logs on the final HAM page.

Visual checks included phone home/explore/HAM, 320px English research and pixel explore,
768px English project grid, and 844×390 playground.

Interaction checks: entering playground, keyboard range increments reflected in all three displayed
values, reset returned layers/FPS/hue to 10/15/170, and returning restored the exploration page.
320px playground control centers were within the viewport and passed hit testing.

## Automated engine regressions

Run `node --test tests/ca-engine.test.cjs`.

Four tests pass: full glyph fitting, simulation preservation on height changes,
reduced-motion/suspension behavior, and orientation/unknown-glyph initialization.
JavaScript syntax checks and `git diff --check` pass.

## Pending acceptance

- Edge browser automation timed out; Edge verification is not claimed. Native Safari spot checks are recorded below.
- No physical iPhone, Android phone, or tablet was available for touch/safe-area/browser-chrome testing.
- Xcode simulator tooling is not installed.
- Safe-area and reduced-motion CSS are implemented; actual device setting and notch behavior require device checks.

Suggested device acceptance: open all eight pages, switch languages/themes, rotate in place,
scroll the navigation/footer to both ends, operate all playground sliders and reset/back,
and repeat with larger text and reduced motion enabled. Check browser back/forward and address-bar collapse.

These checks establish the tested layouts, not a guarantee of zero bugs on every browser/device.

## Follow-up: dynamic interactions and target sizes

- On 375×667, scrolled the full project page to the final application and footer; final CTA and footer links remained visible.
- Browser Back returned to Explore and Forward returned to GitHub, with the correct active navigation item and scroll position at the page start.
- Found and fixed undersized blog article links and short footer links. Both themes now pass the minimum 44×44px target check on the blog page.
- Added scroll padding for fixed navigation and bottom chrome, plus a 44px home-link target on the HAM page.
- Rotated/resized the active pixel playground through 320×568, 568×320, 1024×768 and 375×667. All five controls remained within bounds and passed center-point hit testing; the playground remained active and Back restored Explore.
- Edge extension remained unresponsive. A native-window fallback was interrupted by concurrent user interaction; no Edge compatibility pass is claimed.

## Native Safari responsive spot checks

Tested through Safari's native Responsive Design Mode on macOS (2026-09-27), using the local site at port 8765. This is desktop WebKit, not a physical iOS device.

- 375×667: Chinese home and English research; header, active navigation and text wrapping visually checked.
- 320×568: English research, both Explore themes, playground, and English HAM; navigation follows the active page and controls remain visible.
- 568×320: rotated an active playground; the canvas continued rendering and all five controls remained visible. FPS changed to 32 through native interaction; Reset restored 15, with layers/hue at 10/170; Back restored Explore.
- 768×1024: English project grid and Chinese HAM; two-column project cards, long titles, HAM call sign and footer visually checked.
- Theme/language changes and main-site → HAM → home navigation worked.

One screenshot immediately after resizing the English research page showed text extending below a card boundary. After reload and another language toggle, the inspected card text and CTA fitted normally. This resize-time observation remains unisolated; these spot checks do not establish a zero-defect Safari pass or replace a full Safari layout matrix.

Exited Responsive Design Mode after testing and left the local homepage open in Safari.

## Follow-up: explicit footer and navigation requirements

- Added shared `responsive-shell.js` to both entry points. Overflowing compact navigation now has 48×56px left/right buttons, localized accessible names, boundary disabled states, and reduced-motion support. Swipe scrolling remains available.
- Both themes now fix the compact footer to the viewport bottom. Footer links wrap; ResizeObserver measures the actual footer height and reserves matching body/scroll padding. Decorative status/year text is hidden in this compact footer.
- Restored automatic card content minimum height and prevented flex children shrinking during WebKit resize reflow.
- New in-app browser matrix: 320×568, 375×667, 568×320, 768×1024, 1400×900 × seven routes × both themes × both languages = 140 checks. Assertions cover viewport-bottom footer alignment, sufficient body clearance, card-child containment and document horizontal overflow. Zero failures. HAM: same sizes × both themes × both languages = 20 checks, zero failures.
- Clicked the navigation right arrow repeatedly at 320px until the final scroll position (732.5px versus 732px rounded maximum); the right button became disabled. The left button enabled after the first click.
- Native Safari: repeated English research resize from 375px to 320px, scrolled through the first card, and visually verified the full paragraph and REPO button remain inside the card without reloading. This addresses the earlier observed resize overflow along that reproduction path; broader Safari coverage remains pending.
- At the final scroll position on current resources: main research content bottom 398.84px versus footer top 463px; HAM glass 398.91px versus 463px; HAM pixel 421.75px versus 508px. Final content remains accessible above the fixed footer.
- One old root URL was served from the test browser's previous cached document. Repeated that check with the current versioned page; do not count the stale document as current-code evidence.
- Engine regressions remain 4/4 passing; shared shell syntax and whitespace checks pass.

This is additional evidence for the specified interactions, not an all-browser/all-device completion claim.

### Superseding footer requirement: one line

The user requested hiding the ICP registration on mobile and keeping the footer to a single row. Compact layouts now hide that link, keep the remaining links on one row, and retain 44px minimum targets. This supersedes the wrapping-footer behavior above. Checked 320, 375, 430, 568, 768, 1024 and 1400px widths on main/HAM in both themes (28 cases): all visible links share one row, fit within the viewport, and the footer remains at the viewport bottom. Heights are 60px (pixel) and 61px (glass), before device safe-area insets. Native Safari at 320px also visually confirms the single row.

### Dynamic navigation regression

Found a persistent failure when resizing from wide layouts to 320px: existing page code revealed the active navigation item before arrow gutters reduced the available width, leaving the active item behind the right arrow. The shared shell now reveals the active item after its own geometry update, on resize, text/theme changes and route changes. Scroll events only update boundary button states so manual scrolling does not snap back to the active item.

Verified 48 transitions (320, 375, 639, 640, 800, 801, 980, 981, 1024, 1400, 1401, then 320px × both themes × both languages). No compact active-item clipping or missing overflow arrows remained. Manual left-arrow scrolling stayed at the new position. HAM transitions 1401→320→768→320 also retained the active item inside navigation bounds.

Both playground themes were checked at 320×568, 568×320, 844×390 and 375×667: all five controls remained within the viewport and passed center-point hit testing; footer and navigation arrows were hidden. Back restored the normal page.

Native Safari follow-up remains unresolved: after reload the arrow buttons were temporarily absent from both AX and screenshots, whereas earlier later observations showed them. The current shell passes the in-app tests, but its initialization timing in native Safari needs isolation before claiming the navigation requirement fully verified there.

### Shell initialization without animation-frame delivery

Safari Inspector confirmed `responsive-shell.js?v=20260927j` was loaded and both arrow buttons existed with click listeners. However, neither button had its localized aria-label, the body lacked `nav-overflow`, and the root lacked `--shell-footer`: the first scheduled update had not run. No shell exception was listed in the console (only unrelated favicon/userscript sourcemap 404s).

The shell now runs its first update synchronously and batches subsequent updates with a zero-delay task instead of requestAnimationFrame. Added `tests/responsive-shell.test.cjs` to exercise essential controls before fonts/frames arrive, manual-scroll retention/boundaries, and active-item reveal after text growth/width changes. All seven shell/engine tests pass.

In-app browser refresh checks at 320, 375, 568, 768, 1400, 1401, then 320px confirm localized arrows, active-item visibility, viewport-bottom footer and reserved clearance. No warning/error logs were captured.

Native Safari verification of this last change is pending: AX reads, screenshots and rebinding to the existing app timed out repeatedly. The app inventory still reports Safari running; it was not restarted or force-quit. This is not a verified native Safari pass.

### Horizontal safe-area audit

Code inspection found that arrow gutters and the compact footer did not account for horizontal safe-area insets, despite viewport-fit=cover. Both now honor left/right safe areas; compact content spacing uses the larger inset to keep text clear of landscape cutouts. Tested with a temporary copy of the current page and explicit 44px left/right CSS safe-area variables at 568, 667, 844 and 932px widths in both themes. All eight checks kept arrows, navigation, active link, footer links and the content panel inside the simulated safe region. This is an inset simulation, not physical-device evidence. The temporary fixture was removed. A normal 320×568 regression retained visible arrows and the 61px single-line footer at viewport bottom with all links fitting.

Native Safari's AX interface was retried on this goal continuation and still timed out. Latest native-browser acceptance and actual-device chrome/notch behavior remain unverified.

## HAM station paper collage

Added semantic station parameter papers for GRID OM92LC, CQ 24 and ITU 44, with taped/torn paper styling and a two-row phone composition. Added the user's role as head of the Nanjing University Amateur Radio Association to Chinese and English introductions. Verified 320×568, 375×812, 568×320, 768×1024, 1024×768, 1400×900 and 1440×1000 in both languages/themes (28 combinations): parameter values and role text present, rotated papers within viewport, no document horizontal overflow. Visually inspected glass mobile/desktop and 320px English pixel mode. Corrected the old pixel HAM top margin; final phone panel starts 28px below navigation. JS syntax and diff whitespace checks pass. No new native Safari pass is claimed.

User-directed visual revision: replaced bright white/lime/lavender sheets with charcoal, muted olive and worn gray stock. Reduced group maximum width from 1050px to 590px; phone layout now uses one compact row, about 137px tall at 375px width. Kept torn edges, dark tape/staple details and offset printing. Verified 320, 375, 568, 768, 1024 and 1440px widths in both themes (12 cases), with no horizontal overflow or paper escaping the viewport. This supersedes the earlier bright/two-row composition.

## Visual regression recovery — 2026-09-27

- Root cause: commit `6faaf50` applied flattening content overrides up to 1400px, hiding PROFILE collage and replacing per-page materials. The live responsive stylesheet checksum matched local, ruling out a missing deployment asset.
- Scoped content reflow to 800px, retaining the 1400px navigation/footer shell. Restored page-specific materials, PROFILE blur, layered shadows, scattered placement, collage, and desktop outline headings.
- Removed browser-name/coarse-pointer automatic visual downgrade; reduced-motion still disables motion and heavy effects. Canvas retains its separate mobile performance profile.
- Browser checked all eight routes at 375, 800, 1024, 1280, 1440px: exactly one visible panel and no horizontal document overflow in 40 checks.
- At 1280px, computed PROFILE cards have blur(24px), original layered shadows and distinct rotations; collage is visible.

### Portrait-only mobile layout

- Every width-based mobile media query in styles.css, glass-theme.css, mobile-narrow.css and ham/ham.css now requires portrait orientation. Both JavaScript mobile layout checks use the same orientation constraint.
- Final browser matrix: 390×844, 844×390, 768×1024, 1024×768, 1280×900, across all eight routes (40 checks): no document horizontal overflow; exactly one visible panel.
- PROFILE collage and blur remain visible in both orientations. At 844×390 and 1024×768 the mobile-env class is absent.

## HAM monograph replacement — 2026-11-02

This revision supersedes the earlier rack-console design and its CW/audio/NOAA checks. It implements the replacement specification in `ai_studio_code (1).txt`.

- The HAM main node matches the supplied HTML structure, SVG paths, text and attributes; only trailing source whitespace was normalized. The CRT JavaScript is copied verbatim from the supplied code. Both languages contain precisely the 15 supplied HAM translation keys and values. No new DOM node or translation key was introduced.
- The supplied CSS was retained, with a final HAM-scoped compatibility block. Literal source CSS left the host glass panel absolutely positioned at (0,0), under the fixed navigation, and let the nonwrapping cartography title overflow on phones. The compatibility block resets only HAM positioning, preserves fixed-sidebar clearance, and allows constrained content to wrap. It also restores visible keyboard focus on the tuning slider.
- `node --test tests/*.test.cjs`: 11 tests pass (four CA, three shared shell, four replacement-HAM tests). HAM checks cover the three SVG panels, exact friend-link copy, one CRT/slider, removal of obsolete modules, initial 14.195 MHz and resonance at 14.270 MHz, language updates, background sampling, hue changes, and animation lifecycle. The removed station-notes lookup was removed from `app.js` so shared initialization remains safe.
- Playwright Chromium tested 320×568, 375×812, 568×320, 768×1024, 1024×768 and 1440×1000 in both languages/themes: 24 HAM layouts, with no horizontal document overflow, no navigation overlap and one active animation loop. The single slider, single canvas, three SVG panels, Chinese-only association description and exact VISIT/访问 labels were asserted in every layout. After making the narrow cartography title use a full row, eight additional 320/375px language/theme checks confirmed full available title width and no overflow.
- A further 56 checks covered the seven other routes at 375×812 and 1440×1000, in both languages/themes. Every route retained one visible panel and zero HAM animation frames. Browser interactions confirmed quick lock, keyboard tuning, translated lock status, hue-dependent rendering and the legacy `/ham/` redirect. Leaving HAM stopped CRT background sampling. No JavaScript page errors occurred.
- The inherited glass PROFILE collage overflow remains 386px in a 375px viewport in both languages, matching the independent original-HEAD comparison recorded in the prior work. No unrelated layout was modified.
- All seven other main-section source blocks and all non-HAM dictionary entries match the pre-revision snapshot. Checksums of `CA.js`, `styles.css`, `glass-theme.css`, `mobile-narrow.css` and `responsive-shell.js` are unchanged.

These are Chromium and simulated-browser checks; no native Safari or physical-device acceptance is claimed.

## HAM grain refinements — 2026-11-02

- Reduced the three cartographic SVG backgrounds from 0.82 to 0.35 opacity, and hover opacity from 1 to 0.45. Text and SVG geometry are unchanged.
- A small HAM-only CSS/JavaScript bridge now maps the existing VFO detuning to the existing glass-theme full-screen grain layer: 0.12 when far from 14.270 MHz, falling to 0.01 at resonance. Both the slider and quick-lock button update it. Leaving HAM removes the temporary class/property, restoring the original 0.12 grain. Existing theme/phone/reduced-motion display rules remain in effect; the CA engine and shared styles are unchanged.
- All 12 Node tests pass, including a new lifecycle regression for monotonic noise reduction, route-exit cleanup, inactive language changes and remounting at the retained VFO setting.
- Focused Chromium checks confirmed all three normal SVG opacities, hover opacity, falling full-screen grain near resonance, the 0.01 locked value and 0.12 restoration outside HAM. The 375px layout retained no horizontal overflow. No JavaScript page errors were recorded.

## LivePhoto entry and compact LAB — 2026-11-02

- Added a lowercase `livephoto` shortcut on the lower side of Home, pointing to `https://livephoto.hronrad.cn` in a new tab with `noopener noreferrer`. Desktop positioning clears the language switch; phone layouts place it after the introduction, aligned to the side. It is hidden on all other routes.
- Added the same destination as the third LAB card with Chinese and English descriptions. LAB padding reduced from 64px to 22px; at 1440×1000 Chinese glass mode, the old 864×389px first card became a 321×226px card in a three-column layout. Typography, button size and heading spacing were reduced locally to LAB. Only the automata card retains the small PLAYGROUND tag.
- Playwright Chromium verified Home and LAB at 320×568, 375×812, 568×320, 768×1024, 1024×768 and 1440×1000, in both languages/themes: 48 checks, zero failures or JavaScript page errors. Checks cover shortcut center-point hit testing, destination/target/rel, home-only visibility, three LAB cards, card-content containment and document overflow. Additional route transitions confirmed the shortcut stays hidden elsewhere.
- All 12 existing Node tests pass. External destination availability was not established from this environment; URL verification above refers to the local link configuration.

## LAB title restoration and LivePhoto edge ticket — 2026-11-02

- Restored the original LAB h1 declaration verbatim from HEAD, including its original type scale and rotated composition. The compact three-card layout remains.
- Replaced the small inset Home shortcut with a translucent glass ticket, including a bilingual introduction and destination URL. In glass mode it meets the viewport's right boundary; desktop pixel mode uses the left boundary to avoid the right controls. Phone and short pixel-landscape layouts keep it in document flow, flush with the right boundary after the introduction. No horizontal page gutter remains between the ticket and its docking edge.
- Chromium checked Home/LAB at 320×568, 375×812, 568×320, 844×390, 1024×600, 768×1024, 1024×768 and 1440×1000 in both languages/themes: 64 checks, zero failures or JavaScript errors. Assertions verify an edge coordinate within 1px of the viewport, center-point hit testing, nonempty translated introduction, translucent background, destination and home-only visibility, LAB card containment and no horizontal overflow.
- The original title source block comparison, all 12 Node tests and diff whitespace checks pass. Desktop glass ticket was measured at right=1440px in a 1440px viewport, with blur(16px) and background alpha 0.52.

### Corrected LAB title visibility and LivePhoto typography

The preceding title source comparison did not establish visual visibility. A later shared fallback changed the LAB heading from absolute to relative positioning while retaining its offset and rotation, placing the title behind the cards. That earlier title acceptance is superseded by this correction.

- Removed positioning from the typography fallback. Retained the original LAB Inter/sans-serif family, 900 weight and desktop size range; corrected its right offset and reserved a separate gutter beside the compact cards. Short landscape layouts place the same heading horizontally above the cards; portrait retains the existing mobile layout.
- Removed the LivePhoto ticket's URL row and its separator. The ticket now inherits the active theme's font instead of including PixelFont as a fallback in glass mode. The edge placement, bilingual introduction and link destination remain.
- Chromium checked Home and LAB across eight viewport sizes, both themes and both languages (64 cases): no page errors, horizontal overflow, title/card overlap or ticket hit-test failures. Title checks now include visible text, original glass family/weight, viewport containment and nine unobscured points in the text region. Screenshots were inspected for desktop Chinese/English, phone Chinese and short-landscape English. A visible-text font audit of glass Home and LAB found no PixelFont usage. All 12 existing Node tests and diff whitespace checks pass.

### LAB outline requirement and Home playground shortcut

- The user clarified that LAB must use hollow white lettering. The preceding solid-white title treatment is superseded. LAB now has a transparent text fill and a 3.5px white stroke matching the other desktop page titles; portrait screens use a 1.5px stroke. Removed LAB from the solid-text fallback and duplicate outline pseudo-element groups so its interior stays transparent in glass mode.
- Home now groups LivePhoto and a bilingual background-interaction button in the same translucent edge rail. Both it and LAB's Start bind to the same playground handler. The Home entry changes the route to `#explore`, opens the existing pure background mode directly, and hides the Home rail. It uses the existing hue, canvas interaction, controls and exit behavior.
- Chromium exercised eight sizes in both languages/themes (32 combinations): Home mouse/Enter activation, hidden edge rail in playground mode, actual successful glider injection, Escape exit, and equivalent LAB entry state. A narrow landscape pixel-navigation overlap was found on the original LAB button; scoped its alignment to the right and repeated all four 568×320 language/theme cases successfully. Desktop Back-button exit and browser-history return to Home also pass. No JavaScript page errors occurred.
- Compared RESEARCH and LAB at 1440×1000: both use Inter/sans-serif at weight 900, transparent fill and a 3.5px white stroke. LAB keeps the outline under simulated Safari classes and uses a thinner white outline on portrait phones. Inspected desktop/phone screenshots in both languages. All 12 existing Node tests, JavaScript syntax checks and diff whitespace checks pass.

### Final association biography and pre-push check

- Updated the Chinese HAM introduction verbatim to the user's founding-association/first-president wording, synchronized the English biography, and bumped the translation cache version. The HTML fallback matches the Chinese dictionary.
- Re-ran all 12 Node tests, syntax checks for all five JavaScript entry files and diff whitespace checks successfully. Chromium verified the exact biographies at 375×812 and 1440×1000 in both languages/themes (eight HAM layouts), no horizontal overflow, three SVG panels and working 14.270 MHz lock. Rechecked the hollow LAB heading and Home's direct playground entry/Escape exit at both sizes; no page errors occurred. Inspected the updated phone HAM screenshot.
