
/* =========================================================
   AETHER — V2.2
   EDITORIAL ARCHIVE & ARTICLE COMPOSER
   ========================================================= */

(() => {

    "use strict";

    const A = window.Aether;

    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => [...root.querySelectorAll(s)];

    const esc = value => String(value ?? "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]
    );

    const clone = value => structuredClone(value);
    const uid = () => crypto.randomUUID();
    const now = () => new Date().toISOString();

    const actions = new Map();
    const forms = new Map();
    const pages = new Map();
    const menuActions = new Map();
    const startupHooks = new Map();
    const subscribers = new Set();
    const customBlocks = new Map();

    const state = {
        database: null,
        page: "menu",
        categoryId: null,
        articleId: null,
        draft: null,
        editing: false,
        dirty: false,
        revision: 0,
        saveTimer: null,
        saveQueue: Promise.resolve(),
        search: "",
        collectionSearch: "",
        sort: "original",
        descendants: false,
        expandedArticles: new Set(),
        expandedFolders: new Set(),
        history: [],
        imageCallback: null,
        selection: null,
        activeEditor: null,
        mention: null,
        initialized: false
    };

    let menuRoot;
    let pageRoot;
    let dialog;
    let notifications;

    /* =====================================================
       01 — CONSTANTS
       ===================================================== */

    const FONTS = {
        editorial: '"Cormorant Garamond", Georgia, serif',
        modern: '"Jost", Arial, sans-serif',
        classical: '"Libre Baskerville", Georgia, serif',
        monumental: '"Cinzel", Georgia, serif',
        historical: '"IM Fell English", Georgia, serif',
        handwritten: '"Great Vibes", cursive',
        monospace: '"JetBrains Mono", monospace'
    };

    const FONT_NAMES = {
        editorial: "Cormorant",
        modern: "Jost",
        classical: "Baskerville",
        monumental: "Cinzel",
        historical: "IM Fell English",
        handwritten: "Great Vibes",
        monospace: "JetBrains Mono"
    };

    const BLOCK_GROUPS = {
        Writing: {
            heading: "Heading",
            subheading: "Subheading",
            text: "Rich text",
            quote: "Quotation",
            bullet: "Bullet list",
            numbered: "Numbered list"
        },
        Structure: {
            information: "Information row",
            informationGrid: "Information grid",
            columns2: "Two columns",
            columns3: "Three columns",
            table: "Table",
            divider: "Divider",
            collapse: "Collapsible section",
            spacer: "Spacer"
        },
        Visuals: {
            image: "Image",
            gallery: "Gallery",
            banner: "Banner",
            frame: "Decorative frame",
            callout: "Callout"
        },
        Connections: {
            reference: "Article reference",
            preview: "Article preview",
            related: "Related articles",
            subarticles: "Subarticle list"
        }
    };

    const BLOCK_LABELS = Object.assign(
        {},
        ...Object.values(BLOCK_GROUPS)
    );

    const DEFAULT_APPEARANCE = {
        font: "modern",
        textColor: "#d0dedc",
        accent: "#e6bd8b",
        background: "",
        backgroundImage: "",
        banner: "",
        bannerHeight: 220,
        bannerFade: 70,
        titleFont: "editorial",
        titleSize: 48,
        titleWeight: 400,
        titleAlign: "left",
        titleColor: "#e6bd8b",
        subtitleFont: "editorial",
        subtitleSize: 22,
        subtitleColor: "#7baaab",
        width: "normal",
        divider: "ornamental",
        showDates: false,
        showBreadcrumb: true,
        showBacklinks: true
    };

    const DEFAULT_STYLE = {
        font: "",
        size: 0,
        weight: 0,
        color: "",
        highlight: "",
        align: "",
        italic: false,
        underline: false,
        strike: false,
        shadow: false,
        shadowColor: "#000000",
        shadowBlur: 8,
        letterSpacing: 0,
        lineHeight: 1.65,
        padding: 0,
        margin: 10,
        border: false,
        uppercase: false,
        smallCaps: false
    };

    /* =====================================================
       02 — SHARED UI
       ===================================================== */

    const ICONS = {
        arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
        back: '<path d="m12 5-7 7 7 7M5 12h14"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
        chevron: '<path d="m9 5 7 7-7 7"/>',
        more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
        up: '<path d="m6 15 6-6 6 6"/>',
        down: '<path d="m6 9 6 6 6-6"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        edit: '<path d="m4 16 12-12 4 4L8 20H4z"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
        folder: '<path d="M3 6h7l2 3h9v11H3z"/>',
        file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5"/>',
        link: '<path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M13 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
        book: '<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2z"/>'
    };

    function icon(name, size = 18) {
        return `<svg width="${size}" height="${size}"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">${ICONS[name] || ""}</svg>`;
    }

    function button(label, action, id = "", css = "archive-button") {
        return `<button type="button" class="${esc(css)}"
            data-action="${esc(action)}"
            data-id="${esc(id)}">${esc(label)}</button>`;
    }

    function iconButton(symbol, action, id = "", label = "", css = "") {
        return `<button type="button"
            class="archive-icon-button ${esc(css)}"
            data-action="${esc(action)}"
            data-id="${esc(id)}"
            aria-label="${esc(label || symbol)}"
            title="${esc(label || symbol)}">
            ${icon(symbol, 17)}
        </button>`;
    }

    function empty(title, description = "") {
        return `<div class="archive-empty">
            <div class="archive-empty-symbol">◇</div>
            <h3>${esc(title)}</h3>
            <p>${esc(description)}</p>
        </div>`;
    }

    function dateLabel(value) {
        const date = new Date(value);
        return Number.isFinite(date.getTime())
            ? date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric"
            })
            : "";
    }

    function field(label, name, value = "", type = "text", extra = "") {
        return `<label class="ae-form-field">
            <span>${esc(label)}</span>
            <input class="archive-field"
                type="${esc(type)}"
                name="${esc(name)}"
                value="${esc(value)}" ${extra}>
        </label>`;
    }

    function select(label, name, options, value) {
        return `<label class="ae-form-field">
            <span>${esc(label)}</span>
            <select class="archive-field" name="${esc(name)}">
                ${options.map(([v, l]) => `
                    <option value="${esc(v)}"
                        ${String(v) === String(value) ? "selected" : ""}>
                        ${esc(l)}
                    </option>
                `).join("")}
            </select>
        </label>`;
    }

    function checkbox(label, name, checked) {
        return `<label class="ae-checkbox">
            <input type="checkbox" name="${esc(name)}"
                ${checked ? "checked" : ""}>
            <span>${esc(label)}</span>
        </label>`;
    }

    function hidden(name, value) {
        return `<input type="hidden"
            name="${esc(name)}" value="${esc(value)}">`;
    }

    function fontSelect(name, value, inherit = false) {
        return select("Typeface", name, [
            ...(inherit ? [["", "Inherit"]] : []),
            ...Object.entries(FONT_NAMES)
        ], value);
    }

    function notify(title, message = "", error = false) {
        const node = document.createElement("div");
        node.className = "aether-notification" +
            (error ? " is-error" : "");

        node.innerHTML = `
            <div class="notification-symbol"></div>
            <div class="notification-content">
                <h3 class="notification-title">${esc(title)}</h3>
                <p class="notification-message">${esc(message)}</p>
            </div>`;

        notifications.append(node);

        while (notifications.children.length > 3) {
            notifications.firstElementChild.remove();
        }

        setTimeout(() => {
            node.classList.add("is-leaving");
            setTimeout(() => node.remove(), 450);
        }, error ? 6500 : 3000);
    }

    function report(error) {
        console.error(error);
        notify("Something went wrong.",
            error?.message || String(error), true);
    }

    function openDialog({
        title,
        kicker = "",
        body = "",
        tools = "",
        footer = "",
        css = ""
    }) {
        dialog.className = `archive-dialog ${css}`;

        dialog.innerHTML = `
            <div class="archive-dialog-inner">
                <header class="archive-dialog-header">
                    <div class="archive-dialog-title-row">
                        <span class="archive-eyebrow">${esc(kicker)}</span>
                        ${iconButton("close", "dialog-close", "", "Close")}
                    </div>
                    <h2>${esc(title)}</h2>
                    ${tools}
                </header>
                <div class="archive-dialog-body">${body}</div>
                ${footer ? `
                    <footer class="archive-dialog-footer">
                        ${footer}
                    </footer>` : ""}
            </div>`;

        if (!dialog.open) dialog.showModal();
    }

    function closeDialog() {
        if (dialog.open) dialog.close();
    }

    function formDialog({
        title,
        kicker = "",
        form,
        body,
        submit = "Save",
        css = ""
    }) {
        openDialog({
            title,
            kicker,
            css,
            body: `<form id="archive-active-form"
                data-form="${esc(form)}">${body}</form>`,
            footer: `
                ${button("Cancel", "dialog-close")}
                <button type="submit"
                    form="archive-active-form"
                    class="archive-button is-primary">
                    ${esc(submit)}
                </button>`
        });
    }

    function confirmDialog(title, message, action, id) {
        openDialog({
            title,
            kicker: "Confirmation",
            body: `<p>${esc(message)}</p>`,
            footer: button("Cancel", "dialog-close") +
                button("Delete", action, id,
                    "archive-button is-danger")
        });
    }

    /* =====================================================
       03 — DATABASE & PERSISTENCE

       V2.2 data.js supplies asynchronous IndexedDB storage.
       ===================================================== */

    function getDatabase() {
        if (!state.database) throw new Error("Archive not initialized.");
        return clone(state.database);
    }

    function getModule(name) {
        return clone(state.database.modules[name]);
    }

    function archive() {
        return state.database.modules.archive;
    }

    function emit(name) {
        subscribers.forEach(listener => {
            try { listener(name); }
            catch (error) { console.error(error); }
        });
    }

    function updateDatabase(updater, moduleName = null) {
        const operation = state.saveQueue.catch(() => {}).then(async () => {
            const candidate = getDatabase();
            const result = updater(candidate);

            if (result?.then) {
                throw new Error("Database mutations must be synchronous.");
            }

            if (result === false) return false;

            const saved = await A.storage.save(candidate);
            state.database = saved || candidate;
            emit(moduleName);

            return true;
        });

        state.saveQueue = operation;
        return operation;
    }

    function updateModule(name, updater) {
        return updateDatabase(db => {
            if (!db.modules[name]) {
                throw new Error("Unknown module: " + name);
            }
            return updater(db.modules[name]);
        }, name);
    }

    async function mutate(updater) {
        return updateModule("archive", updater);
    }

    async function replaceDatabase(database) {
        await state.saveQueue.catch(() => {});
        const prepared = A.data.prepare(database);

        if (state.database) {
            await A.storage.createRecovery(state.database);
        }

        state.database = await A.storage.save(prepared) || prepared;
        emit(null);
    }

    function getCategory(id) {
        return archive().categories.find(c => c.id === id);
    }

    function getArticle(id) {
        return archive().articles.find(a => a.id === id);
    }

    function categoryPath(id) {
        const path = [];
        const visited = new Set();

        while (id && !visited.has(id)) {
            visited.add(id);
            const category = getCategory(id);
            if (!category) break;
            path.unshift(category);
            id = category.parentId;
        }

        return path;
    }

    function categoryDescendants(id) {
        const result = new Set([id]);
        let changed = true;

        while (changed) {
            changed = false;
            archive().categories.forEach(category => {
                if (result.has(category.parentId) &&
                    !result.has(category.id)) {
                    result.add(category.id);
                    changed = true;
                }
            });
        }

        return result;
    }

    function articleDescendants(id) {
        const result = new Set([id]);
        let changed = true;

        while (changed) {
            changed = false;

            archive().articles.forEach(article => {
                if (result.has(article.parentArticleId) &&
                    !result.has(article.id)) {
                    result.add(article.id);
                    changed = true;
                }
            });
        }

        return result;
    }

    function appearance(article) {
        return {
            ...DEFAULT_APPEARANCE,
            ...(article.appearance || {})
        };
    }

    function markDirty() {
        if (!state.draft) return;

        state.dirty = true;
        state.revision++;
        saveStatus("Saving…");

        clearTimeout(state.saveTimer);

        state.saveTimer = setTimeout(() => {
            flushDraft().catch(report);
        }, 650);
    }

    function saveStatus(message) {
        const target = $("#article-save-status");
        if (target) target.textContent = message;
    }

    async function flushDraft() {
        clearTimeout(state.saveTimer);

        if (!state.draft || !state.dirty) {
            await state.saveQueue;
            return;
        }

        const draft = clone(state.draft);
        const revision = state.revision;

        draft.name = draft.name.trim();

        if (!draft.name) {
            saveStatus("Name required");
            throw new Error("The article requires a name.");
        }

        draft.updatedAt = now();

        try {
            await mutate(data => {
                const index = data.articles.findIndex(a => a.id === draft.id);

                if (index < 0) throw new Error("Article no longer exists.");

                data.articles[index] = draft;
            });

            if (state.draft?.id === draft.id &&
                state.revision === revision) {

                state.dirty = false;
                state.draft.updatedAt = draft.updatedAt;
                saveStatus("All changes saved");
            }

        } catch (error) {
            saveStatus("Not saved");
            throw error;
        }
    }

    /* =====================================================
       04 — SAFE CONTENT & STYLE RENDERING
       ===================================================== */

    function safeColor(value, fallback = "") {
        return /^#[0-9a-f]{6}$/i.test(value || "")
            ? value : fallback;
    }

    function number(value, min, max, fallback) {
        const n = Number(value);
        return Number.isFinite(n)
            ? Math.min(max, Math.max(min, n))
            : fallback;
    }

    function safeImage(value) {
        return /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=\s]+$/i
            .test(value || "") ? value : "";
    }

    function cleanHTML(html) {
        const template = document.createElement("template");
        template.innerHTML = String(html || "");

        const allowed = new Set([
            "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
            "SPAN", "P", "DIV", "BR", "UL", "OL", "LI",
            "SUB", "SUP", "FONT"
        ]);

        function clean(node) {
            for (const child of [...node.childNodes]) {
                if (child.nodeType === Node.COMMENT_NODE) {
                    child.remove();
                    continue;
                }

                if (child.nodeType !== Node.ELEMENT_NODE) continue;

                if (["SCRIPT", "STYLE", "IFRAME", "OBJECT",
                     "SVG", "IMG", "LINK", "META"].includes(child.tagName)) {
                    child.remove();
                    continue;
                }

                clean(child);

                if (!allowed.has(child.tagName)) {
                    child.replaceWith(...child.childNodes);
                    continue;
                }

                const style = child.style;
                const accepted = {};

                for (const property of [
                    "color", "background-color", "font-family",
                    "font-size", "font-weight", "font-style",
                    "text-decoration", "text-align",
                    "letter-spacing", "text-shadow",
                    "font-variant", "text-transform"
                ]) {
                    const value = style.getPropertyValue(property);

                    if (value && !/url|expression|var\(/i.test(value)) {
                        accepted[property] = value;
                    }
                }

                const ref = child.getAttribute("data-ref");
                const mode = child.getAttribute("data-ref-mode");

                const oldColor = child.getAttribute("color");
                const oldFace = child.getAttribute("face");

                [...child.attributes].forEach(attr => {
                    child.removeAttribute(attr.name);
                });

                Object.entries(accepted).forEach(([key, value]) => {
                    child.style.setProperty(key, value);
                });

                if (oldColor) child.style.color = oldColor;
                if (oldFace) child.style.fontFamily = oldFace;

                if (ref && /^[a-zA-Z0-9_-]+$/.test(ref)) {
                    child.dataset.ref = ref;
                    child.dataset.refMode =
                        mode === "direct" ? "direct" : "preview";
                    child.className = "ae-mention";
                    child.contentEditable = "false";
                }
            }
        }

        clean(template.content);
        return template.innerHTML;
    }

    function plainHTML(text) {
        return esc(text || "").replace(/\n/g, "<br>");
    }

    function richValue(block, key = "text") {
        return block.rich?.[key] !== undefined
            ? cleanHTML(block.rich[key])
            : plainHTML(block[key]);
    }

    function resolveReferences(html) {
        const template = document.createElement("template");
        template.innerHTML = cleanHTML(html);

        template.content.querySelectorAll("[data-ref]").forEach(node => {
            const article = getArticle(node.dataset.ref);

            if (!article) {
                node.classList.add("is-unresolved");
                node.title = "Referenced article no longer exists";
                return;
            }

            node.textContent = article.name;
            node.dataset.action = "mention-open";
            node.dataset.id = article.id;
            node.setAttribute("role", "link");
            node.tabIndex = 0;
        });

        return template.innerHTML;
    }

    function styleString(style = {}) {
        const s = { ...DEFAULT_STYLE, ...style };
        const result = [];

        if (FONTS[s.font]) result.push(`font-family:${FONTS[s.font]}`);
        if (s.size) result.push(`font-size:${number(s.size, 10, 100, 16)}px`);
        if (s.weight) result.push(`font-weight:${number(s.weight, 100, 900, 400)}`);
        if (safeColor(s.color)) result.push(`color:${s.color}`);
        if (safeColor(s.highlight)) result.push(`background-color:${s.highlight}`);

        if (["left", "center", "right", "justify"].includes(s.align)) {
            result.push(`text-align:${s.align}`);
        }

        if (s.italic) result.push("font-style:italic");

        const decoration = [
            s.underline ? "underline" : "",
            s.strike ? "line-through" : ""
        ].filter(Boolean).join(" ");

        if (decoration) result.push(`text-decoration:${decoration}`);

        if (s.shadow) {
            result.push(`text-shadow:0 2px ${number(s.shadowBlur, 0, 40, 8)}px ${safeColor(s.shadowColor, "#000000")}`);
        }

        if (s.uppercase) result.push("text-transform:uppercase");
        if (s.smallCaps) result.push("font-variant:small-caps");

        result.push(`letter-spacing:${number(s.letterSpacing, -2, 12, 0)}px`);
        result.push(`line-height:${number(s.lineHeight, 1, 3, 1.65)}`);
        result.push(`padding:${number(s.padding, 0, 40, 0)}px`);
        result.push(`margin-block:${number(s.margin, 0, 60, 10)}px`);

        if (s.border) result.push("border:1px solid var(--ae-accent)");

        return result.join(";");
    }

    /* =====================================================
       05 — MAIN MENU & OCEAN ARTWORK
       ===================================================== */

    function artwork() {
        return `<svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 1100"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true">

            <defs>
                <linearGradient id="sea-base" x2="1" y2="1">
                    <stop stop-color="#0b111b"/>
                    <stop offset=".45" stop-color="#214a57"/>
                    <stop offset="1" stop-color="#0d1925"/>
                </linearGradient>

                <linearGradient id="sea-deep" x2=".8" y2="1">
                    <stop stop-color="#7baaab"/>
                    <stop offset=".28" stop-color="#326c79"/>
                    <stop offset=".7" stop-color="#17364d"/>
                    <stop offset="1" stop-color="#101b2b"/>
                </linearGradient>

                <linearGradient id="sea-light" x2="1" y2="1">
                    <stop stop-color="#d5e4d6"/>
                    <stop offset=".3" stop-color="#8abdbd"/>
                    <stop offset=".7" stop-color="#27606c"/>
                    <stop offset="1" stop-color="#132c40"/>
                </linearGradient>

                <linearGradient id="sea-gold">
                    <stop stop-color="#8b603c"/>
                    <stop offset=".35" stop-color="#f0d5a6"/>
                    <stop offset=".65" stop-color="#c68d5d"/>
                    <stop offset="1" stop-color="#79543d"/>
                </linearGradient>

                <radialGradient id="sea-glow">
                    <stop stop-color="#b4d6cc" stop-opacity=".28"/>
                    <stop offset="1" stop-color="#27606c" stop-opacity="0"/>
                </radialGradient>

                <filter id="sea-grain">
                    <feTurbulence type="fractalNoise"
                        baseFrequency=".65" numOctaves="3"
                        stitchTiles="stitch"/>
                    <feColorMatrix type="saturate" values="0"/>
                </filter>

                <filter id="sea-shadow" x="-20%" y="-20%"
                    width="140%" height="140%">
                    <feDropShadow dx="0" dy="7"
                        stdDeviation="8"
                        flood-color="#040b12"
                        flood-opacity=".6"/>
                </filter>
            </defs>

            <rect width="800" height="1100" fill="url(#sea-base)"/>

            <ellipse class="art-mist"
                cx="560" cy="250" rx="440" ry="380"
                fill="url(#sea-glow)"/>

            <g fill="none" stroke="#7baaab" opacity=".18">
                ${Array.from({length: 5}, (_, i) =>
                    `<path d="M-90 ${170+i*15}
                    C200 ${10+i*15} 390 ${360+i*15} 880 ${70+i*15}"/>`
                ).join("")}
                ${Array.from({length: 3}, (_, i) =>
                    `<path d="M-80 ${870+i*15}
                    C250 ${650+i*15} 470 ${1100+i*15} 900 ${760+i*15}"/>`
                ).join("")}
            </g>

            <g class="art-wave-slow" filter="url(#sea-shadow)">
                <path d="M-80 470 C100 540 240 380 360 270
                    C480 160 650 90 720 180
                    C775 255 695 330 630 290
                    C580 260 602 200 646 218
                    C605 140 485 220 445 330
                    C385 495 165 650-80 540Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)" stroke-width="2.5"/>

                <path d="M-70 490 C180 570 320 330 440 240
                    C540 155 655 130 697 190
                    C738 246 683 294 643 267
                    C618 250 627 226 649 231
                    C610 186 515 235 475 320
                    C390 500 130 620-70 525Z"
                    fill="url(#sea-light)"
                    stroke="#b8c9b4" stroke-width="1.4"/>

                <path d="M30 526 C260 495 300 350 460 252
                    C550 197 611 182 663 209
                    C565 174 493 300 443 372
                    C330 534 174 567 30 526Z"
                    fill="#18384c" stroke="url(#sea-gold)"/>
            </g>

            <g class="art-wave" filter="url(#sea-shadow)">
                <path d="M-100 680 C60 580 145 610 260 680
                    C380 755 480 635 540 520
                    C605 395 725 360 795 445
                    C855 525 790 625 724 593
                    C665 565 685 500 725 516
                    C681 454 623 535 600 615
                    C555 800 380 880 220 810
                    C85 750 10 780-100 865Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)" stroke-width="3"/>

                <path d="M-80 712 C70 628 170 675 275 725
                    C420 795 520 650 565 535
                    C620 410 750 400 780 470
                    C790 530 770 578 731 560
                    C706 550 712 527 733 530
                    C695 485 650 535 624 623
                    C550 850 390 837 250 778
                    C110 715 30 770-80 810Z"
                    fill="url(#sea-light)"
                    stroke="#d6c69f" stroke-width="1.6"/>

                <path d="M-40 745 C180 710 285 855 445 788
                    C595 720 617 550 682 490"
                    fill="none" stroke="#d2b389" stroke-width="2"/>
            </g>

            <g class="art-wave-slow" filter="url(#sea-shadow)">
                <path d="M-60 1100 C10 920 130 840 230 895
                    C310 940 270 1020 210 1005
                    C160 992 170 960 205 948
                    C160 910 105 960 110 1015
                    C124 1080 250 1060 360 980
                    C480 890 620 850 860 960 L860 1150Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)" stroke-width="3"/>

                <path d="M-30 1100 C30 950 130 875 215 910
                    C275 935 250 995 210 958
                    C190 974 195 955 210 958
                    C145 920 100 1000 145 1040
                    C245 1110 400 935 560 935
                    C690 930 760 985 850 1020 L850 1150Z"
                    fill="url(#sea-light)" stroke="#b9b997"/>
            </g>

            <g class="art-current" fill="none"
                stroke="#e6bd8b" opacity=".55">
                <path d="M-20 410C220 490 400 110 700 150"/>
                <path d="M0 650C220 520 390 880 590 550"/>
                <path d="M0 970C180 760 350 1100 800 880"/>
            </g>

            ${Array.from({length: 45}, (_, i) =>
                `<circle class="art-particle"
                    cx="${(i*173+39)%800}"
                    cy="${(i*251+77)%1100}"
                    r="${.6+(i%5)*.35}"
                    fill="${i%3 ? "#9cc8c8" : "#e6bd8b"}"
                    style="animation-delay:-${i%9}s"/>`
            ).join("")}

            <rect width="800" height="1100"
                filter="url(#sea-grain)" opacity=".065"
                style="mix-blend-mode:soft-light"/>
        </svg>`;
    }

    function renderMenu() {
        menuRoot.innerHTML = `
            <div class="main-menu">
                <header class="menu-header">
                    <div class="brand">
                        <p class="brand-kicker">${esc(A.config.subtitle)}</p>
                        <h1 class="brand-title">${esc(A.config.name)}.</h1>
                    </div>
                    <div class="header-edition">
                        <span class="edition-number">${esc(A.config.edition)}</span>
                        <span class="edition-label">Worldbuilding</span>
                    </div>
                </header>

                <div class="menu-composition">
                    <div class="menu-artwork">${artwork()}</div>

                    ${A.menu.map(item => `
                        <button type="button"
                            class="menu-panel ${esc(item.className)}"
                            data-action="menu-select"
                            data-id="${esc(item.id)}"
                            aria-disabled="${!menuActions.has(item.id)}">

                            <div class="panel-top">
                                <span class="panel-index">${esc(item.index)}</span>
                                <span class="panel-category">${esc(item.category)}</span>
                            </div>

                            ${item.id === "archive" ? `
                                <div class="hero-seal">
                                    <svg viewBox="0 0 80 80"
                                        fill="none" stroke="currentColor">
                                        <circle cx="40" cy="40" r="34"/>
                                        <circle cx="40" cy="40" r="28" opacity=".5"/>
                                        <path d="M40 12 68 40 40 68 12 40Z"/>
                                        <path d="M40 23 57 40 40 57 23 40Z"/>
                                        <circle cx="40" cy="40" r="6"/>
                                    </svg>
                                </div>` : ""}

                            <div class="panel-bottom">
                                <h2 class="panel-title">
                                    ${esc(item.title)}
                                    ${item.italicTitle
                                        ? `<em>${esc(item.italicTitle)}</em>`
                                        : ""}
                                </h2>
                                <p class="panel-description">
                                    ${esc(item.description)}
                                </p>
                            </div>

                            <span class="panel-arrow">
                                ${icon("arrow", item.id === "archive" ? 25 : 15)}
                            </span>
                        </button>
                    `).join("")}
                </div>

                <footer class="menu-footer">
                    <span class="footer-phrase">${esc(A.config.footer)}</span>
                    <span class="footer-ornament">
                        <span class="footer-diamond"></span>
                    </span>
                    <span class="footer-version">V2.2</span>
                </footer>
            </div>`;
    }

    async function showMenu() {
        await flushDraft();
        closeDialog();

        state.page = "menu";
        state.draft = null;
        state.articleId = null;
        state.history = [];

        pageRoot.hidden = true;
        pageRoot.innerHTML = "";
        menuRoot.hidden = false;

        renderMenu();
    }

    function showPage(name) {
        const renderer = pages.get(name);
        if (!renderer) throw new Error("Unknown page: " + name);

        state.page = name;
        menuRoot.hidden = true;
        pageRoot.hidden = false;
        renderer();
    }

    /* =====================================================
       06 — IMPORT & EXPORT
       ===================================================== */

    function downloadJSON(json, filename) {
        const url = URL.createObjectURL(
            new Blob([json], {type: "application/json"})
        );

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;

        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    async function exportWorld() {
        await flushDraft();

        const database = getDatabase();

        downloadJSON(
            A.data.serialize(database),
            A.data.backupFilename(database)
        );

        notify("Preserved.", "Your world backup is ready.");
    }

    async function importWorld() {
        await flushDraft();

        const input = $("#backup-input");
        input.value = "";
        input.click();
    }

    async function handleImport(file) {
        if (!file) return;

        const database = A.data.deserialize(await file.text());

        if (!confirm(
            "Replace the current world with this backup? " +
            "The existing world will be retained as a recovery copy."
        )) return;

        await flushDraft();
        await replaceDatabase(database);

        state.draft = null;
        state.dirty = false;
        state.articleId = null;
        state.categoryId = null;
        state.search = "";
        state.history = [];

        await showMenu();

        notify("Restored.", "Your world has been imported.");
    }

    /* =====================================================
       07 — MAIN ARCHIVE
       ===================================================== */

    function archiveOrnament() {
        return `<svg class="archive-ornament"
            viewBox="0 0 300 160" fill="none">
            <path d="M-10 135 C80 150 120 10 205 35
                C260 50 240 105 205 90
                C175 75 200 55 212 65
                C175 25 140 105 110 125
                C70 155 20 150-10 135Z"
                fill="#27606c" stroke="#c68d5d" stroke-width="1.5"/>
            <path d="M10 140 C95 125 125 35 200 48
                C230 55 230 85 210 80
                C180 65 165 90 180 95
                C130 140 55 150 10 140Z"
                fill="#7baaab" stroke="#e6bd8b"/>
            <path d="M70 145 C120 140 140 60 215 55"
                stroke="#e6bd8b"/>
        </svg>`;
    }

    function renderArchive() {
        pageRoot.innerHTML = `
            <section class="archive-page">
                <div class="archive-container">
                    <div class="archive-topbar">
                        ${button("← Aether", "home", "", "archive-back")}
                        <span class="archive-eyebrow">01 / The Compendium</span>
                    </div>

                    <header class="archive-heading">
                        ${archiveOrnament()}
                        <h1>The Archive.</h1>
                        <p>A record of your world</p>
                    </header>

                    <div class="archive-toolbar">
                        <label class="archive-search">
                            ${icon("search")}
                            <input type="search"
                                id="archive-search"
                                value="${esc(state.search)}"
                                placeholder="Find a category...">
                        </label>

                        <button class="archive-add-main"
                            data-action="category-create"
                            aria-label="Create category">
                            ${icon("plus", 24)}
                        </button>
                    </div>

                    <div id="archive-category-list"
                        class="archive-list"></div>

                    <footer class="archive-footer">
                        THE FRAGMENTS OF AN UNWRITTEN WORLD
                    </footer>
                </div>
            </section>`;

        renderCategoryList();
    }

    function renderCategoryList() {
        const target = $("#archive-category-list");
        if (!target) return;

        const data = archive();
        const expanded = new Set(data.preferences.expanded || []);
        const query = state.search.trim().toLowerCase();

        let visible = null;

        if (query) {
            visible = new Set();

            data.categories.filter(c =>
                c.name.toLowerCase().includes(query)
            ).forEach(c => {
                categoryPath(c.id).forEach(p => visible.add(p.id));
                categoryDescendants(c.id).forEach(id => visible.add(id));
            });
        }

        function node(category, depth = 0, index = 0) {
            if (visible && !visible.has(category.id)) return "";

            const children = data.categories.filter(c =>
                c.parentId === category.id
            );

            const count = data.articles.filter(a =>
                a.categoryId === category.id
            ).length;

            const open = Boolean(query) || expanded.has(category.id);

            return `<div class="archive-category ${depth === 0 ? "is-root" : ""}">
                <div class="archive-category-row">
                    ${depth === 0 ? `
                        <span class="archive-category-number">
                            ${String(index+1).padStart(2, "0")}
                        </span>` : ""}

                    ${button(category.name, "category-open",
                        category.id, "archive-category-name")}

                    ${count ? `<span class="archive-category-count">${count}</span>` : ""}

                    <div class="archive-category-actions">
                        ${iconButton("plus", "category-create",
                            category.id, "Add subcategory")}
                        ${iconButton("more", "category-options",
                            category.id, "Category options")}

                        ${children.length
                            ? iconButton("chevron", "category-toggle",
                                category.id, "Expand",
                                "archive-chevron" + (open ? " is-open" : ""))
                            : iconButton("arrow", "category-open",
                                category.id, "Open articles")}
                    </div>
                </div>

                ${children.length && open ? `
                    <div class="archive-children">
                        ${children.map(c => node(c, depth+1)).join("")}
                    </div>` : ""}
            </div>`;
        }

        target.innerHTML = data.categories
            .filter(c => !c.parentId)
            .map((c, i) => node(c, 0, i))
            .join("") || empty(
                query ? "No categories found." : "An unwritten world.",
                query ? "Try another name." : "Create your first category."
            );
    }

    function categoryOptionsHTML(selected, exclude = new Set(), root = false) {
        return [
            ...(root ? [["", "Main category"]] : []),
            ...archive().categories
                .filter(c => !exclude.has(c.id))
                .map(c => [
                    c.id,
                    categoryPath(c.id).map(p => p.name).join(" / ")
                ])
        ];
    }

    function categoryCreate(parentId = "") {
        formDialog({
            title: parentId ? "New subcategory." : "New category.",
            kicker: getCategory(parentId)?.name || "The Archive",
            form: "category-create",
            body: hidden("parentId", parentId) +
                field("Category name", "name", "", "text", "required"),
            submit: "Create"
        });
    }

    function categoryOptions(id) {
        const c = getCategory(id);
        if (!c) return;

        openDialog({
            title: c.name,
            kicker: "Category management",
            body: `<div class="archive-action-list">
                ${button("Rename category", "category-rename", id)}
                ${button("Add subcategory", "category-create", id)}
                ${button("Move to another category", "category-move", id)}
                ${button("Move up", "category-up", id)}
                ${button("Move down", "category-down", id)}
                ${button("Delete category", "category-delete-confirm",
                    id, "archive-button is-danger")}
            </div>`
        });
    }

    async function reorderCategory(id, direction) {
        await mutate(data => {
            const c = data.categories.find(c => c.id === id);
            if (!c) return;

            const siblings = data.categories.filter(x =>
                x.parentId === c.parentId
            );

            const index = siblings.findIndex(x => x.id === id);
            const other = siblings[index + direction];
            if (!other) return;

            const a = data.categories.indexOf(c);
            const b = data.categories.indexOf(other);

            [data.categories[a], data.categories[b]] =
                [data.categories[b], data.categories[a]];
        });

        closeDialog();
        renderCategoryList();
    }

    /* =====================================================
       08 — COMPACT ARTICLE COLLECTION
       ===================================================== */

    function openCollection(id, preserve = false) {
        const category = getCategory(id);
        if (!category) return;

        state.categoryId = id;

        if (!preserve) {
            state.collectionSearch = "";
            state.descendants = false;
            state.sort = "original";
        }

        openDialog({
            title: category.name,
            kicker: categoryPath(id).map(c => c.name).join(" / "),
            css: "ae-collection-dialog",

            tools: `<div class="ae-collection-controls">
                <div class="ae-collection-search-row">
                    <label class="archive-search">
                        ${icon("search", 16)}
                        <input id="collection-search"
                            type="search"
                            placeholder="Find article..."
                            value="${esc(state.collectionSearch)}">
                    </label>

                    <select id="collection-sort" class="archive-select">
                        ${[
                            ["original", "Original order"],
                            ["alphabetical", "A–Z"],
                            ["reverse", "Z–A"],
                            ["created", "Recently added"],
                            ["edited", "Recently edited"],
                            ["manual", "Manual order"]
                        ].map(([v,l]) => `
                            <option value="${v}"
                                ${state.sort === v ? "selected" : ""}>
                                ${l}
                            </option>`).join("")}
                    </select>
                </div>

                <label class="ae-checkbox">
                    <input type="checkbox"
                        id="collection-descendants"
                        ${state.descendants ? "checked" : ""}>
                    Include subcategories
                </label>
            </div>`,

            body: `<div id="collection-articles"
                class="ae-article-tree"></div>`,

            footer: `
                <span id="collection-count" class="ae-count"></span>
                ${button("+ New article", "article-create",
                    id, "archive-button is-primary")}`
        });

        renderCollection();
    }

    function sortedArticles(items) {
        const result = [...items];

        const original = (a, b) =>
            String(a.createdAt).localeCompare(String(b.createdAt));

        switch (state.sort) {
            case "alphabetical":
                return result.sort((a,b) => a.name.localeCompare(b.name));
            case "reverse":
                return result.sort((a,b) => b.name.localeCompare(a.name));
            case "created":
                return result.sort((a,b) => original(b,a));
            case "edited":
                return result.sort((a,b) =>
                    String(b.updatedAt).localeCompare(String(a.updatedAt)));
            case "manual":
                return result.sort((a,b) =>
                    (a.order ?? 0) - (b.order ?? 0) || original(a,b));
            default:
                return result.sort(original);
        }
    }

    function renderCollection() {
        const target = $("#collection-articles");
        if (!target) return;

        const ids = state.descendants
            ? categoryDescendants(state.categoryId)
            : new Set([state.categoryId]);

        const all = archive().articles.filter(a => ids.has(a.categoryId));
        const map = new Map(all.map(a => [a.id, a]));
        const folders = archive().folders || [];
        const query = state.collectionSearch.trim().toLowerCase();

        const visible = new Set();

        if (query) {
            all.filter(a =>
                `${a.name} ${a.subtitle || ""}`.toLowerCase().includes(query)
            ).forEach(a => {
                let current = a;
                const seen = new Set();

                while (current && !seen.has(current.id)) {
                    seen.add(current.id);
                    visible.add(current.id);
                    current = map.get(current.parentArticleId);
                }
            });
        }

        function articleNode(article, depth = 0, index = 0, visited = new Set()) {
            if (visited.has(article.id)) return "";
            if (query && !visible.has(article.id)) return "";

            const nextVisited = new Set(visited);
            nextVisited.add(article.id);

            const childArticles = sortedArticles(all.filter(a =>
                a.parentArticleId === article.id && !a.folderId
            ));

            const childFolders = folders.filter(f =>
                f.parentArticleId === article.id
            );

            const hasChildren = childArticles.length || childFolders.length;
            const open = Boolean(query) || state.expandedArticles.has(article.id);

            return `<div class="ae-tree-node">
                <div class="ae-tree-row">
                    ${hasChildren
                        ? iconButton("chevron", "article-toggle", article.id,
                            "Expand", "archive-chevron" + (open ? " is-open" : ""))
                        : `<span class="ae-tree-marker">${depth ? "·" :
                            String(index+1).padStart(2,"0")}</span>`}

                    ${button(article.name, "article-open", article.id,
                        "ae-tree-name")}

                    <div class="ae-tree-actions">
                        ${iconButton("plus", "article-add-child-menu",
                            article.id, "Add subordinate content")}
                        ${iconButton("more", "collection-article-options",
                            article.id, "Article options")}
                    </div>
                </div>

                ${hasChildren && open ? `
                    <div class="ae-tree-children">
                        ${childFolders.map(f =>
                            folderNode(f, depth+1, nextVisited)
                        ).join("")}
                        ${childArticles.map((a,i) =>
                            articleNode(a, depth+1, i, nextVisited)
                        ).join("")}
                    </div>` : ""}
            </div>`;
        }

        function folderNode(folder, depth, visited) {
            const children = sortedArticles(all.filter(a =>
                a.folderId === folder.id
            ));

            const open = Boolean(query) || state.expandedFolders.has(folder.id);

            if (query && !children.some(a => visible.has(a.id))) return "";

            return `<div class="ae-tree-folder">
                <div class="ae-tree-row">
                    ${iconButton("chevron", "folder-toggle", folder.id,
                        "Expand folder", "archive-chevron" + (open ? " is-open" : ""))}
                    <span class="ae-folder-icon">${icon("folder", 15)}</span>
                    ${button(folder.name, "folder-toggle",
                        folder.id, "ae-tree-name is-folder")}
                    ${iconButton("plus", "folder-add-article", folder.id, "New article")}
                    ${iconButton("more", "folder-options", folder.id, "Folder options")}
                </div>
                ${open ? `<div class="ae-tree-children">
                    ${children.map((a,i) =>
                        articleNode(a, depth+1, i, visited)
                    ).join("")}
                </div>` : ""}
            </div>`;
        }

        const roots = sortedArticles(all.filter(a =>
            !a.parentArticleId || !map.has(a.parentArticleId)
        ));

        target.innerHTML = roots.map((a,i) =>
            articleNode(a, 0, i)
        ).join("") || empty("Nothing written yet.", "Create an article to begin.");

        const count = $("#collection-count");
        if (count) count.textContent = `${all.length} articles`;
    }

    function createArticleDialog(categoryId, parentId = "", folderId = "") {
        formDialog({
            title: parentId ? "New subarticle." : "New article.",
            kicker: getArticle(parentId)?.name || getCategory(categoryId)?.name,
            form: "article-create",
            body:
                hidden("categoryId", categoryId) +
                hidden("parentArticleId", parentId) +
                hidden("folderId", folderId) +
                field("Article name", "name", "", "text", "required"),
            submit: "Create"
        });
    }

    function childMenu(id) {
        const article = getArticle(id);
        if (!article) return;

        openDialog({
            title: article.name,
            kicker: "Add subordinate content",
            body: `<div class="archive-action-list">
                ${button("New subarticle", "article-create-child", id)}
                ${button("New subcategory / folder", "folder-create", id)}
                ${button("Return to collection", "collection-return")}
            </div>`
        });
    }

    function collectionArticleOptions(id) {
        const article = getArticle(id);
        if (!article) return;

        openDialog({
            title: article.name,
            kicker: "Article management",
            body: `<div class="archive-action-list">
                ${button("Open article", "article-open", id)}
                ${button("Rename", "article-rename", id)}
                ${button("Add subordinate content", "article-add-child-menu", id)}
                ${button("Move article", "article-move", id)}
                ${button("Move up", "article-up", id)}
                ${button("Move down", "article-down", id)}
                ${button("Delete article", "article-delete-confirm", id,
                    "archive-button is-danger")}
                ${button("Return to collection", "collection-return")}
            </div>`
        });
    }

    async function reorderArticle(id, direction) {
        await mutate(data => {
            const article = data.articles.find(a => a.id === id);
            if (!article) return;

            const siblings = data.articles.filter(a =>
                a.categoryId === article.categoryId &&
                a.parentArticleId === article.parentArticleId &&
                a.folderId === article.folderId
            ).sort((a,b) => (a.order || 0) - (b.order || 0));

            const index = siblings.findIndex(a => a.id === id);
            const next = index + direction;

            if (next < 0 || next >= siblings.length) return;

            [siblings[index], siblings[next]] =
                [siblings[next], siblings[index]];

            siblings.forEach((a,i) => a.order = i);
        });

        state.sort = "manual";
        openCollection(state.categoryId, true);
    }

    /* =====================================================
       09 — ARTICLE NAVIGATION
       ===================================================== */

    async function openArticle(id, edit = false, recordHistory = true) {
        await flushDraft();

        const article = getArticle(id);
        if (!article) throw new Error("Article not found.");

        if (recordHistory && state.articleId && state.articleId !== id) {
            state.history.push(state.articleId);
        }

        closeDialog();

        state.articleId = id;
        state.categoryId = article.categoryId;
        state.draft = clone(article);
        state.editing = edit;
        state.dirty = false;
        state.selection = null;
        state.activeEditor = null;

        showPage("article");
    }

    async function articleBack() {
        await flushDraft();

        while (state.history.length) {
            const id = state.history.pop();

            if (getArticle(id)) {
                await openArticle(id, false, false);
                return;
            }
        }

        await returnToArchive();
    }

    async function returnToArchive(categoryId = state.categoryId) {
        await flushDraft();

        state.draft = null;
        state.articleId = null;
        state.history = [];
        state.editing = false;

        closeDialog();
        showPage("archive");

        if (getCategory(categoryId)) openCollection(categoryId, true);
    }

    async function toggleEdit() {
        if (state.editing) await flushDraft();

        state.editing = !state.editing;
        state.selection = null;
        state.activeEditor = null;

        renderArticle();
    }

    /* =====================================================
       10 — ARTICLE READING & EDITING MODES
       ===================================================== */

    function renderArticle() {
        const article = state.draft;
        if (!article) return showPage("archive");

        const theme = appearance(article);
        const editing = state.editing;

        const pageStyle = [
            `--ae-accent:${safeColor(theme.accent,"#e6bd8b")}`,
            `--ae-text:${safeColor(theme.textColor,"#d0dedc")}`,
            `--ae-font:${FONTS[theme.font] || FONTS.modern}`,
            safeColor(theme.background)
                ? `background-color:${theme.background};background-image:none`
                : "",
            safeImage(theme.backgroundImage)
                ? `background-image:linear-gradient(#0f1217cc,#0f1217ee),url('${theme.backgroundImage}');background-size:cover;background-attachment:fixed`
                : ""
        ].join(";");

        const titleStyle = [
            `font-family:${FONTS[theme.titleFont] || FONTS.editorial}`,
            `font-size:${number(theme.titleSize,20,100,48)}px`,
            `font-weight:${number(theme.titleWeight,100,900,400)}`,
            `color:${safeColor(theme.titleColor,"#e6bd8b")}`,
            `text-align:${["left","center","right"].includes(theme.titleAlign)
                ? theme.titleAlign : "left"}`
        ].join(";");

        const subtitleStyle = [
            `font-family:${FONTS[theme.subtitleFont] || FONTS.editorial}`,
            `font-size:${number(theme.subtitleSize,12,60,22)}px`,
            `color:${safeColor(theme.subtitleColor,"#7baaab")}`,
            `text-align:${["left","center","right"].includes(theme.titleAlign)
                ? theme.titleAlign : "left"}`
        ].join(";");

        pageRoot.innerHTML = `
            <section class="archive-page ae-article-page
                ${editing ? "is-editing" : "is-reading"}"
                style="${esc(pageStyle)}">

                <div class="ae-article-shell ae-width-${esc(theme.width)}">

                    <nav class="ae-article-topbar">
                        ${button("← Back", "article-back", "", "archive-back")}

                        <span class="archive-eyebrow">
                            ${editing ? "COMPOSER" : "THE ARCHIVE"}
                        </span>

                        <div class="ae-topbar-actions">
                            ${iconButton(editing ? "check" : "edit",
                                "article-edit-toggle", "",
                                editing ? "Finish editing" : "Edit article")}
                            ${iconButton("more", "article-options",
                                article.id, "Article options")}
                        </div>
                    </nav>

                    ${safeImage(theme.banner) ? `
                        <div class="ae-article-banner"
                            style="height:${number(theme.bannerHeight,80,600,220)}px">
                            <img src="${esc(theme.banner)}" alt="">
                            <div class="ae-banner-fade"
                                style="height:${number(theme.bannerFade,0,100,70)}%"></div>
                        </div>` : ""}

                    <div class="ae-article-content">

                        ${theme.showBreadcrumb ? `
                            <div class="ae-breadcrumb">
                                ${categoryPath(article.categoryId).map(c =>
                                    button(c.name, "profile-category",
                                        c.id, "archive-back")
                                ).join("<span>/</span>")}

                                ${article.parentArticleId &&
                                  getArticle(article.parentArticleId) ? `
                                    <span>/</span>
                                    ${button(getArticle(article.parentArticleId).name,
                                        "article-open", article.parentArticleId,
                                        "archive-back")}
                                ` : ""}
                            </div>` : ""}

                        <header class="ae-article-heading">

                            ${editing ? `
                                <textarea rows="1"
                                    class="ae-title-input"
                                    data-profile-field="name"
                                    style="${esc(titleStyle)}"
                                    placeholder="Article title">${esc(article.name)}</textarea>

                                <input class="ae-subtitle-input"
                                    data-profile-field="subtitle"
                                    style="${esc(subtitleStyle)}"
                                    value="${esc(article.subtitle || "")}"
                                    placeholder="Subtitle or epithet...">
                            ` : `
                                <h1 style="${esc(titleStyle)}">${esc(article.name)}</h1>
                                ${article.subtitle ? `
                                    <p class="ae-article-subtitle"
                                        style="${esc(subtitleStyle)}">
                                        ${esc(article.subtitle)}
                                    </p>` : ""}
                            `}

                            <div class="ae-title-divider
                                ae-divider-${esc(theme.divider)}">
                                <span>◇</span>
                            </div>

                            ${theme.showDates || editing ? `
                                <div class="ae-article-meta">
                                    ${theme.showDates ? `
                                        <span>Created ${dateLabel(article.createdAt)}</span>
                                    ` : ""}
                                    ${editing ? `
                                        <span id="article-save-status">
                                            ${state.dirty ? "Unsaved changes" : "All changes saved"}
                                        </span>` : ""}
                                </div>` : ""}
                        </header>

                        ${editing ? renderComposerToolbar() : ""}

                        <div id="article-blocks" class="ae-article-blocks"></div>

                        ${editing ? `
                            <button class="ae-add-content"
                                data-action="block-menu">
                                ${icon("plus")} Add content
                            </button>` : ""}

                        ${!editing && !article.blocks.length
                            ? `<div class="ae-unwritten">
                                <span>◇</span>
                                <p>This page is yet to be written.</p>
                                ${button("Begin writing", "article-edit-toggle")}
                            </div>` : ""}

                        ${!editing && theme.showBacklinks
                            ? renderBacklinks(article.id) : ""}

                        ${!editing ? renderSubarticles(article.id) : ""}

                    </div>
                </div>
            </section>`;

        renderBlocks();
        resizeTextareas();
    }

    function renderComposerToolbar() {
        return `<div class="ae-composer-toolbar">

            <div class="ae-composer-top">
                <span class="archive-eyebrow">ARTICLE COMPOSER</span>
                ${button("Appearance", "appearance-menu", "", "ae-tool")}
            </div>

            <div class="ae-format-row">
                <select data-format-select="fontName" aria-label="Font">
                    <option value="">Font</option>
                    ${Object.entries(FONT_NAMES).map(([key,label]) =>
                        `<option value="${esc(FONTS[key])}">${esc(label)}</option>`
                    ).join("")}
                </select>

                <select data-format-select="fontSize" aria-label="Text size">
                    <option value="">Size</option>
                    ${[1,2,3,4,5,6,7].map((n,i) =>
                        `<option value="${n}">${[10,13,16,18,24,32,48][i]} px</option>`
                    ).join("")}
                </select>

                <input type="color"
                    data-format-select="foreColor"
                    value="#e6bd8b" aria-label="Text color">

                <input type="color"
                    data-format-select="hiliteColor"
                    value="#27606c" aria-label="Highlight color">
            </div>

            <div class="ae-format-row">
                ${[
                    ["B","bold"],
                    ["I","italic"],
                    ["U","underline"],
                    ["S","strikeThrough"],
                    ["≡","justifyLeft"],
                    ["≡ C","justifyCenter"],
                    ["≡ R","justifyRight"],
                    ["☰","justifyFull"],
                    ["• List","insertUnorderedList"],
                    ["1. List","insertOrderedList"],
                    ["↶","undo"],
                    ["↷","redo"],
                    ["Clear","removeFormat"]
                ].map(([label,command]) =>
                    button(label,"format-command",command,"ae-tool")
                ).join("")}

                ${button("Effects","inline-effects","","ae-tool")}
                ${button("@ Link","mention-picker","","ae-tool")}
            </div>

        </div>`;
    }

    /* =====================================================
       11 — CONTENT BLOCK SYSTEM
       ===================================================== */

    function newBlock(type) {
        const block = {
            id: uid(),
            type,
            text: "",
            label: "",
            rich: {},
            style: {},
            images: [],
            references: []
        };

        if (type === "columns2" || type === "columns3") {
            block.columns = Array.from(
                {length: type === "columns2" ? 2 : 3},
                () => ""
            );
        }

        if (type === "table" || type === "informationGrid") {
            block.rows = [["", ""], ["", ""]];
        }

        if (type === "spacer") block.height = 24;
        if (type === "collapse") block.label = "Section";
        if (type === "divider") block.variant = "ornamental";

        const custom = customBlocks.get(type);

        return custom?.create
            ? {...block, ...custom.create()}
            : block;
    }

    function getBlock(id) {
        return state.draft?.blocks.find(b => b.id === id);
    }

    function richEditor(block, key = "text", placeholder = "Begin writing...") {
        return `<div class="ae-rich-editor"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            data-rich-id="${esc(block.id)}"
            data-rich-key="${esc(key)}"
            data-placeholder="${esc(placeholder)}"
            spellcheck="true">${richValue(block,key)}</div>`;
    }

    function richReader(block, key = "text") {
        return `<div class="ae-rich-reader">
            ${resolveReferences(richValue(block,key))}
        </div>`;
    }

    function richContent(block, key, placeholder) {
        return state.editing
            ? richEditor(block,key,placeholder)
            : richReader(block,key);
    }

    function blockInput(block, key, placeholder = "") {
        return `<input class="ae-block-input"
            data-block-id="${esc(block.id)}"
            data-block-field="${esc(key)}"
            value="${esc(block[key] || "")}"
            placeholder="${esc(placeholder)}">`;
    }

    function renderBlock(block, index, total) {
        const editing = state.editing;
        const custom = customBlocks.get(block.type);
        let content = "";

        if (custom) {
            content = editing
                ? custom.editor(block)
                : custom.render(block);

        } else {

            switch (block.type) {

                case "heading":
                case "subheading":
                case "text":
                case "quote":
                case "frame":
                case "callout":
                    content = richContent(block, "text",
                        BLOCK_LABELS[block.type]);
                    break;

                case "bullet":
                case "numbered":
                    if (editing) {
                        content = richEditor(block, "text",
                            "One list item per line...");
                    } else {
                        const tag = block.type === "bullet" ? "ul" : "ol";
                        const lines = String(block.text || "").split(/\n/);

                        content = `<${tag}>${lines.filter(Boolean)
                            .map(line => `<li>${esc(line)}</li>`)
                            .join("")}</${tag}>`;
                    }
                    break;

                case "information":
                    content = `<div class="ae-information-row">
                        <div>${editing
                            ? blockInput(block,"label","Label")
                            : esc(block.label)}</div>
                        ${richContent(block,"text","Information")}
                    </div>`;
                    break;

                case "columns2":
                case "columns3": {
                    const count = block.type === "columns2" ? 2 : 3;

                    content = `<div class="ae-columns ae-columns-${count}">
                        ${Array.from({length:count},(_,i) =>
                            `<div class="ae-column">
                                ${richContent(block,`column${i}`,
                                    `Column ${i+1}`)}
                            </div>`
                        ).join("")}
                    </div>`;
                    break;
                }

                case "table":
                case "informationGrid":
                    content = renderTable(block);
                    break;

                case "divider":
                    content = `<div class="ae-content-divider
                        ae-divider-${esc(block.variant || "ornamental")}">
                        <span>◇</span>
                    </div>`;

                    if (editing) {
                        content += `<select class="ae-block-select"
                            data-block-id="${esc(block.id)}"
                            data-block-field="variant">
                            ${["plain","ornamental","glowing","double"]
                                .map(v => `<option value="${v}"
                                    ${block.variant === v ? "selected" : ""}>
                                    ${v}</option>`).join("")}
                        </select>`;
                    }
                    break;

                case "spacer":
                    content = `<div style="height:${number(block.height,4,200,24)}px"></div>`;

                    if (editing) {
                        content += `<input type="range"
                            min="4" max="200"
                            value="${number(block.height,4,200,24)}"
                            data-block-id="${esc(block.id)}"
                            data-block-field="height">`;
                    }
                    break;

                case "collapse":
                    content = editing
                        ? blockInput(block,"label","Section title") +
                            richEditor(block,"text","Section content")
                        : `<details class="ae-collapsible">
                            <summary>${esc(block.label || "Section")}</summary>
                            ${richReader(block,"text")}
                        </details>`;
                    break;

                case "image":
                case "banner":
                case "gallery":
                    content = renderImages(block);
                    break;

                case "reference":
                case "preview":
                case "related":
                    content = renderReferenceBlock(block);
                    break;

                case "subarticles":
                    content = renderSubarticles(state.articleId, true);
                    break;

                default:
                    content = richContent(block,"text","Content");
            }
        }

        return `<section class="ae-block ae-block-${esc(block.type)}"
            data-block-container="${esc(block.id)}">

            ${editing ? `
                <div class="ae-block-toolbar">
                    <span class="ae-block-label">
                        ${esc(BLOCK_LABELS[block.type] || block.type)}
                    </span>

                    <div class="ae-block-tools">
                        ${iconButton("settings","block-style",block.id,"Appearance")}
                        ${iconButton("copy","block-duplicate",block.id,"Duplicate")}
                        ${index > 0
                            ? iconButton("up","block-up",block.id,"Move up") : ""}
                        ${index < total-1
                            ? iconButton("down","block-down",block.id,"Move down") : ""}
                        ${iconButton("close","block-delete",block.id,"Remove")}
                    </div>
                </div>` : ""}

            <div class="ae-block-content"
                style="${esc(styleString(block.style))}">
                ${content}
            </div>

        </section>`;
    }

    function renderBlocks() {
        const target = $("#article-blocks");
        if (!target || !state.draft) return;

        target.innerHTML = state.draft.blocks.map((block,index) =>
            renderBlock(block,index,state.draft.blocks.length)
        ).join("");

        state.selection = null;
        state.activeEditor = null;
    }

    function blockMenu() {
        openDialog({
            title: "Compose.",
            kicker: "Add article content",
            css: "ae-block-menu-dialog",
            body: Object.entries(BLOCK_GROUPS).map(([group,types]) =>
                `<section class="ae-block-menu-group">
                    <h3>${esc(group)}</h3>
                    <div class="ae-block-menu-grid">
                        ${Object.entries(types).map(([type,label]) =>
                            button(label,"block-add",type,"ae-block-choice")
                        ).join("")}
                    </div>
                </section>`
            ).join("") +
            [...customBlocks.entries()].map(([type,config]) =>
                button(config.label || type,"block-add",type)
            ).join("")
        });
    }

    function addBlock(type) {
        if (!state.draft || !state.editing) return;

        const block = newBlock(type);
        state.draft.blocks.push(block);

        closeDialog();
        markDirty();
        renderBlocks();

        const element = $$("[data-block-container]").find(
            e => e.dataset.blockContainer === block.id
        );

        element?.scrollIntoView({behavior:"smooth",block:"nearest"});
    }

    function moveBlock(id,direction) {
        const blocks = state.draft.blocks;
        const index = blocks.findIndex(b => b.id === id);
        const target = index + direction;

        if (index < 0 || target < 0 || target >= blocks.length) return;

        [blocks[index],blocks[target]] = [blocks[target],blocks[index]];

        markDirty();
        renderBlocks();
    }

    function duplicateBlock(id) {
        const index = state.draft.blocks.findIndex(b => b.id === id);
        if (index < 0) return;

        const copy = clone(state.draft.blocks[index]);
        copy.id = uid();

        state.draft.blocks.splice(index+1,0,copy);

        markDirty();
        renderBlocks();
    }

    /* =====================================================
       12 — TABLES & INFORMATION GRIDS
       ===================================================== */

    function renderTable(block) {
        const rows = block.rows || [["",""],["",""]];
        const editing = state.editing;

        return `<div class="ae-table-wrapper">
            <table class="ae-content-table
                ${block.type === "informationGrid" ? "is-information" : ""}">
                <tbody>
                    ${rows.map((row,r) => `
                        <tr>
                            ${row.map((cell,c) => `
                                <td>
                                    ${editing ? `
                                        <textarea rows="2"
                                            data-table-id="${esc(block.id)}"
                                            data-row="${r}"
                                            data-column="${c}"
                                            placeholder="…">${esc(cell)}</textarea>
                                    ` : esc(cell).replace(/\n/g,"<br>")}
                                </td>`).join("")}
                        </tr>`).join("")}
                </tbody>
            </table>

            ${editing ? `<div class="ae-table-tools">
                ${button("+ Row","table-add-row",block.id,"ae-tool")}
                ${button("− Row","table-remove-row",block.id,"ae-tool")}
                ${button("+ Column","table-add-column",block.id,"ae-tool")}
                ${button("− Column","table-remove-column",block.id,"ae-tool")}
            </div>` : ""}
        </div>`;
    }

    function modifyTable(id,operation) {
        const block = getBlock(id);
        if (!block) return;

        block.rows ||= [["",""],["",""]];

        const rows = block.rows;
        const width = rows[0]?.length || 2;

        if (operation === "add-row" && rows.length < 100) {
            rows.push(Array(width).fill(""));
        }

        if (operation === "remove-row" && rows.length > 1) rows.pop();

        if (operation === "add-column" && width < 12) {
            rows.forEach(row => row.push(""));
        }

        if (operation === "remove-column" && width > 1) {
            rows.forEach(row => row.pop());
        }

        markDirty();
        renderBlocks();
    }

    /* =====================================================
       13 — IMAGE UPLOADS & GALLERIES
       ===================================================== */

    async function prepareImage(file) {
        if (!file?.type.startsWith("image/")) {
            throw new Error("Please select an image.");
        }

        const url = URL.createObjectURL(file);

        try {
            const image = new Image();
            image.src = url;
            await image.decode();

            const scale = Math.min(
                1,
                1800 / Math.max(image.width,image.height)
            );

            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1,Math.round(image.width*scale));
            canvas.height = Math.max(1,Math.round(image.height*scale));

            const context = canvas.getContext("2d");
            context.drawImage(image,0,0,canvas.width,canvas.height);

            const result = canvas.toDataURL("image/webp",.84);

            if (!safeImage(result)) {
                throw new Error("Image could not be processed.");
            }

            return result;

        } finally {
            URL.revokeObjectURL(url);
        }
    }

    function chooseImage(callback,multiple = false) {
        state.imageCallback = callback;

        const input = $("#image-input");
        input.multiple = multiple;
        input.value = "";
        input.click();
    }

    function renderImages(block) {
        const images = (block.images || []).filter(i => safeImage(i.src));

        return `<div class="ae-image-block
            ${block.type === "gallery" ? "ae-gallery" : ""}">

            ${images.map((image,i) => `
                <figure>
                    <img src="${esc(image.src)}"
                        alt="${esc(image.caption || "")}"
                        loading="lazy">

                    ${state.editing ? `
                        <input class="ae-block-input"
                            data-image-caption="${esc(block.id)}"
                            data-image-index="${i}"
                            value="${esc(image.caption || "")}"
                            placeholder="Image caption...">

                        ${button("Remove image","image-remove",
                            `${block.id}:${i}`,"ae-tool")}
                    ` : image.caption
                        ? `<figcaption>${esc(image.caption)}</figcaption>`
                        : ""}
                </figure>`).join("")}

            ${state.editing ? button(
                block.type === "gallery" ? "+ Add images" : "Choose image",
                "image-add",block.id,"ae-add-image"
            ) : ""}
        </div>`;
    }

    function addImages(id) {
        const articleId = state.articleId;
        const block = getBlock(id);
        if (!block) return;

        chooseImage(async files => {
            if (state.articleId !== articleId) return;

            const current = getBlock(id);
            if (!current) return;

            const images = files.map(src => ({src,caption:""}));

            current.images = current.type === "gallery"
                ? [...(current.images || []),...images]
                : images.slice(0,1);

            markDirty();
            renderBlocks();
        },block.type === "gallery");
    }

    /* =====================================================
       14 — RICH TEXT FORMATTING
       ===================================================== */

    function rememberSelection() {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.commonAncestorContainer;

        const element = node.nodeType === Node.ELEMENT_NODE
            ? node : node.parentElement;

        const editor = element?.closest(".ae-rich-editor");

        if (!editor) return;

        state.activeEditor = editor;
        state.selection = range.cloneRange();
    }

    function restoreSelection() {
        if (!state.activeEditor?.isConnected ||
            !state.selection?.startContainer.isConnected) {
            return false;
        }

        state.activeEditor.focus({preventScroll:true});

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(state.selection);

        return true;
    }

    function syncEditor(editor) {
        if (!editor?.isConnected) return;

        const block = getBlock(editor.dataset.richId);
        if (!block) return;

        const key = editor.dataset.richKey;

        block.rich ||= {};
        block.rich[key] = cleanHTML(editor.innerHTML);
        block[key] = editor.innerText;

        markDirty();
    }

    function formatCommand(command,value = null) {
        if (!restoreSelection()) {
            notify("Select some text.",
                "Tap inside a content block before formatting.");
            return;
        }

        document.execCommand("styleWithCSS",false,true);
        document.execCommand(command,false,value);

        syncEditor(state.activeEditor);
        rememberSelection();
    }

    function inlineEffects() {
        if (!state.selection || state.selection.collapsed) {
            notify("Select text first.",
                "Highlight the words you want to customize.");
            return;
        }

        formDialog({
            title: "Text effects.",
            kicker: "Selected text",
            form: "inline-effects",
            body:
                fontSelect("font","",true) +
                field("Font size (0 = inherit)","size",0,"number",
                    'min="0" max="100"') +
                select("Weight","weight",[
                    ["0","Inherit"],["300","Light"],["400","Regular"],
                    ["500","Medium"],["600","Semibold"],["700","Bold"]
                ],"0") +
                field("Text color (optional)","color","") +
                field("Highlight (optional)","highlight","") +
                field("Letter spacing","letterSpacing",0,"number",
                    'min="-2" max="12" step=".1"') +
                checkbox("Text shadow","shadow",false) +
                field("Shadow color","shadowColor","#000000","color") +
                field("Shadow blur","shadowBlur",8,"number",'min="0" max="40"') +
                checkbox("Small caps","smallCaps",false) +
                checkbox("Uppercase","uppercase",false)
        });
    }

    function applyInlineEffects(values) {
        closeDialog();

        if (!restoreSelection()) return;

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const span = document.createElement("span");

        const style = readStyle(values);
        const css = styleString(style)
            .split(";")
            .filter(s => !/^(padding|margin-block|line-height):/.test(s))
            .join(";");

        span.setAttribute("style",css);
        span.append(range.extractContents());
        range.insertNode(span);

        range.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(range);

        syncEditor(state.activeEditor);
        rememberSelection();
    }

    /* =====================================================
       15 — BLOCK APPEARANCE
       ===================================================== */

    function readStyle(values) {
        return {
            font: values.get("font") || "",
            size: Number(values.get("size") || 0),
            weight: Number(values.get("weight") || 0),
            color: safeColor(values.get("color")),
            highlight: safeColor(values.get("highlight")),
            align: values.get("align") || "",
            italic: values.has("italic"),
            underline: values.has("underline"),
            strike: values.has("strike"),
            shadow: values.has("shadow"),
            shadowColor: safeColor(values.get("shadowColor"),"#000000"),
            shadowBlur: Number(values.get("shadowBlur") || 8),
            letterSpacing: Number(values.get("letterSpacing") || 0),
            lineHeight: Number(values.get("lineHeight") || 1.65),
            padding: Number(values.get("padding") || 0),
            margin: Number(values.get("margin") || 0),
            border: values.has("border"),
            uppercase: values.has("uppercase"),
            smallCaps: values.has("smallCaps")
        };
    }

    function blockStyleDialog(id) {
        const block = getBlock(id);
        if (!block) return;

        const s = {...DEFAULT_STYLE,...block.style};

        formDialog({
            title: "Block appearance.",
            kicker: BLOCK_LABELS[block.type],
            form: "block-style",
            css: "ae-style-dialog",
            body:
                hidden("id",id) +
                fontSelect("font",s.font,true) +
                `<div class="ae-form-grid">` +
                field("Size (0 = default)","size",s.size,"number",
                    'min="0" max="100"') +
                select("Weight","weight",[
                    ["0","Default"],["300","Light"],["400","Regular"],
                    ["500","Medium"],["600","Semibold"],["700","Bold"]
                ],s.weight) +
                field("Text HEX color","color",s.color) +
                field("Background HEX","highlight",s.highlight) +
                `</div>` +
                select("Alignment","align",[
                    ["","Default"],["left","Left"],["center","Center"],
                    ["right","Right"],["justify","Justified"]
                ],s.align) +
                `<div class="ae-checkbox-grid">` +
                checkbox("Italic","italic",s.italic) +
                checkbox("Underline","underline",s.underline) +
                checkbox("Strikethrough","strike",s.strike) +
                checkbox("Small caps","smallCaps",s.smallCaps) +
                checkbox("Uppercase","uppercase",s.uppercase) +
                checkbox("Border","border",s.border) +
                checkbox("Shadow / glow","shadow",s.shadow) +
                `</div><div class="ae-form-grid">` +
                field("Shadow color","shadowColor",s.shadowColor,"color") +
                field("Shadow blur","shadowBlur",s.shadowBlur,"number",
                    'min="0" max="40"') +
                field("Letter spacing","letterSpacing",s.letterSpacing,"number",
                    'min="-2" max="12" step=".1"') +
                field("Line height","lineHeight",s.lineHeight,"number",
                    'min="1" max="3" step=".1"') +
                field("Inner spacing","padding",s.padding,"number",
                    'min="0" max="40"') +
                field("Outer spacing","margin",s.margin,"number",
                    'min="0" max="60"') +
                `</div>`
        });
    }

    /* =====================================================
       16 — ARTICLE MENTIONS
       ===================================================== */

    function detectMention(editor) {
        const selection = window.getSelection();

        if (!selection?.rangeCount || !selection.isCollapsed) {
            removeMentionSuggestions();
            return;
        }

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        if (node.nodeType !== Node.TEXT_NODE) {
            removeMentionSuggestions();
            return;
        }

        const before = node.textContent.slice(0,range.startOffset);
        const match = before.match(/(?:^|\s)@([^@\n]{0,60})$/);

        if (!match) {
            removeMentionSuggestions();
            return;
        }

        const replacement = range.cloneRange();

        replacement.setStart(
            node,
            range.startOffset - match[1].length - 1
        );

        state.mention = {
            editor,
            range: replacement,
            query: match[1]
        };

        renderMentionSuggestions();
    }

    function removeMentionSuggestions() {
        $("#ae-mention-suggestions")?.remove();
        state.mention = null;
    }

    function renderMentionSuggestions() {
        $("#ae-mention-suggestions")?.remove();

        const mention = state.mention;
        if (!mention?.editor.isConnected) return;

        const query = mention.query.toLowerCase();

        const articles = archive().articles.filter(a =>
            a.id !== state.articleId &&
            a.name.toLowerCase().includes(query)
        ).slice(0,8);

        const panel = document.createElement("div");
        panel.id = "ae-mention-suggestions";
        panel.className = "ae-mention-suggestions";

        panel.innerHTML = `
            <div class="ae-mention-heading">
                LINK AN ARTICLE
                ${iconButton("close","mention-dismiss","","Dismiss")}
            </div>
            ${articles.length ? articles.map(a => `
                <button class="ae-mention-result"
                    data-action="mention-insert"
                    data-id="${esc(a.id)}">
                    <strong>${esc(a.name)}</strong>
                    <small>${esc(categoryPath(a.categoryId)
                        .map(c => c.name).join(" / "))}</small>
                </button>`).join("")
                : `<p>No matching articles.</p>`}`;

        mention.editor.after(panel);
    }

    function insertMention(id,mode = "preview") {
        const article = getArticle(id);
        const mention = state.mention;

        if (!article || !mention?.editor.isConnected ||
            !mention.range.startContainer.isConnected) return;

        const editor = mention.editor;
        const range = mention.range;

        editor.focus({preventScroll:true});

        range.deleteContents();

        const span = document.createElement("span");
        span.className = "ae-mention";
        span.dataset.ref = article.id;
        span.dataset.refMode = mode;
        span.contentEditable = "false";
        span.textContent = article.name;

        range.insertNode(span);

        const space = document.createTextNode("\u00a0");
        span.after(space);

        range.setStartAfter(space);
        range.collapse(true);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        removeMentionSuggestions();

        state.activeEditor = editor;
        syncEditor(editor);
        rememberSelection();
    }

    function mentionPicker() {
        if (!state.activeEditor?.isConnected || !state.selection) {
            notify("Choose a content block.",
                "Tap where you want to insert a reference.");
            return;
        }

        state.mention = {
            editor: state.activeEditor,
            range: state.selection.cloneRange(),
            query: ""
        };

        articlePicker("mention-picker-select");
    }

    function articlePicker(action,id = "") {
        openDialog({
            title: "Connect.",
            kicker: "Select an article",
            css: "ae-reference-picker",
            tools: `<label class="archive-search">
                ${icon("search",16)}
                <input type="search"
                    id="reference-search"
                    placeholder="Search all articles..."
                    data-picker-action="${esc(action)}"
                    data-picker-id="${esc(id)}">
            </label>`,
            body: `<div id="reference-results"></div>`
        });

        renderReferenceResults("",action,id);
    }

    function renderReferenceResults(query,action,id) {
        const target = $("#reference-results");
        if (!target) return;

        const articles = archive().articles.filter(a =>
            a.id !== state.articleId &&
            a.name.toLowerCase().includes(query.toLowerCase())
        );

        target.innerHTML = articles.map(a => `
            <div class="ae-reference-result">
                <div>
                    <strong>${esc(a.name)}</strong>
                    <small>${esc(categoryPath(a.categoryId)
                        .map(c => c.name).join(" / "))}</small>
                </div>
                ${button("Preview",action,`${id}|${a.id}|preview`,"ae-tool")}
                ${button("Direct",action,`${id}|${a.id}|direct`,"ae-tool")}
            </div>`).join("") || empty("No articles found.");
    }

    /* =====================================================
       17 — REFERENCES, PREVIEWS & BACKLINKS
       ===================================================== */

    function articleExcerpt(article) {
        const block = article.blocks.find(b =>
            ["text","quote","callout","frame"].includes(b.type)
        );

        return String(block?.text || article.subtitle || "")
            .slice(0,320);
    }

    function articlePreview(id) {
        const article = getArticle(id);
        if (!article) return;

        const theme = appearance(article);

        openDialog({
            title: article.name,
            kicker: categoryPath(article.categoryId)
                .map(c => c.name).join(" / "),
            css: "ae-article-preview",
            body: `
                ${safeImage(theme.banner) ? `
                    <img class="ae-preview-banner"
                        src="${esc(theme.banner)}" alt="">
                ` : ""}

                ${article.subtitle ? `
                    <p class="ae-preview-subtitle">
                        ${esc(article.subtitle)}
                    </p>` : ""}

                <p class="ae-preview-excerpt">
                    ${esc(articleExcerpt(article) || "An unwritten page.")}
                </p>`,

            footer:
                button("Close","dialog-close") +
                button("Open article","article-open",id,
                    "archive-button is-primary")
        });
    }

    function referenceIds(article) {
        const result = new Set();

        for (const block of article.blocks || []) {

            for (const html of Object.values(block.rich || {})) {
                const template = document.createElement("template");
                template.innerHTML = cleanHTML(html);

                template.content.querySelectorAll("[data-ref]")
                    .forEach(node => result.add(node.dataset.ref));
            }

            for (const ref of block.references || []) {
                if (ref.id) result.add(ref.id);
            }
        }

        return result;
    }

    function renderBacklinks(id) {
        const article = getArticle(id) || state.draft;
        if (!article) return "";

        const outgoing = [...referenceIds(article)]
            .map(getArticle).filter(Boolean);

        const incoming = archive().articles.filter(a =>
            a.id !== id && referenceIds(a).has(id)
        );

        if (!outgoing.length && !incoming.length) return "";

        function group(title,articles) {
            if (!articles.length) return "";

            return `<section class="ae-backlink-group">
                <h4>${esc(title)} <span>${articles.length}</span></h4>
                <div class="ae-link-chips">
                    ${articles.map(a =>
                        button(a.name,"article-preview",a.id,"ae-link-chip")
                    ).join("")}
                </div>
            </section>`;
        }

        return `<aside class="ae-backlinks">
            <span class="archive-eyebrow">CONNECTIONS</span>
            ${group("References",outgoing)}
            ${group("Referenced by",incoming)}
        </aside>`;
    }

    function renderReferenceBlock(block) {
        const references = block.references || [];

        return `<div class="ae-reference-block">

            ${references.map((ref,i) => {
                const article = getArticle(ref.id);

                return `<div class="ae-reference-card">
                    ${article ? `
                        ${button(article.name,
                            ref.mode === "direct" ? "article-open" : "article-preview",
                            article.id,"ae-reference-title")}

                        ${block.type === "preview"
                            ? `<p>${esc(articleExcerpt(article))}</p>`
                            : ""}
                    ` : `<span class="is-unresolved">
                        ${esc(ref.name || "Missing article")}
                    </span>`}

                    ${state.editing
                        ? iconButton("close","reference-remove",
                            `${block.id}:${i}`,"Remove reference")
                        : ""}
                </div>`;
            }).join("")}

            ${state.editing
                ? button("+ Select article","reference-add",
                    block.id,"ae-tool")
                : ""}
        </div>`;
    }

    function renderSubarticles(id,embedded = false) {
        const children = archive().articles.filter(a =>
            a.parentArticleId === id
        );

        if (!children.length) {
            return embedded ? `<p class="ae-muted">No subarticles.</p>` : "";
        }

        return `<section class="ae-subarticles">
            <span class="archive-eyebrow">SUBARTICLES</span>
            ${sortedArticles(children).map(a => `
                <div class="ae-subarticle-row">
                    ${icon("file",15)}
                    ${button(a.name,"article-open",a.id,"ae-tree-name")}
                </div>`).join("")}
        </section>`;
    }

    /* =====================================================
       18 — INDIVIDUAL ARTICLE APPEARANCE
       ===================================================== */

    function appearanceMenu() {
        openDialog({
            title: "Appearance.",
            kicker: state.draft.name,
            body: `<div class="archive-action-list">
                ${button("Typography & colors","appearance-typography")}
                ${button("Banner & background","appearance-images")}
                ${button("Layout & metadata","appearance-layout")}
                ${button("Save as appearance preset","preset-save")}
                ${button("Apply appearance preset","preset-list")}
                ${button("Reset appearance","appearance-reset")}
            </div>`
        });
    }

    function typographyDialog() {
        const t = appearance(state.draft);

        formDialog({
            title: "Typography.",
            kicker: "Article appearance",
            form: "appearance-typography",
            body:
                select("Body font","font",Object.entries(FONT_NAMES),t.font) +
                field("Body text color","textColor",t.textColor,"color") +
                field("Accent color","accent",t.accent,"color") +

                `<h3 class="ae-form-heading">Title</h3>` +

                select("Title font","titleFont",
                    Object.entries(FONT_NAMES),t.titleFont) +

                `<div class="ae-form-grid">` +
                field("Title size","titleSize",t.titleSize,"number",
                    'min="20" max="100"') +
                field("Title color","titleColor",t.titleColor,"color") +
                `</div>` +

                select("Title weight","titleWeight",[
                    ["300","Light"],["400","Regular"],["500","Medium"],
                    ["600","Semibold"],["700","Bold"]
                ],t.titleWeight) +

                select("Title alignment","titleAlign",[
                    ["left","Left"],["center","Center"],["right","Right"]
                ],t.titleAlign) +

                `<h3 class="ae-form-heading">Subtitle</h3>` +

                select("Subtitle font","subtitleFont",
                    Object.entries(FONT_NAMES),t.subtitleFont) +

                field("Subtitle size","subtitleSize",t.subtitleSize,"number",
                    'min="12" max="60"') +

                field("Subtitle color","subtitleColor",t.subtitleColor,"color")
        });
    }

    function appearanceImages() {
        const t = appearance(state.draft);

        formDialog({
            title: "Atmosphere.",
            kicker: "Banner & background",
            form: "appearance-images",
            body: `
                ${safeImage(t.banner)
                    ? `<img class="ae-preview-banner" src="${esc(t.banner)}" alt="">`
                    : ""}

                <div class="ae-form-grid">
                    ${button("Choose banner","appearance-image-upload","banner")}
                    ${button("Remove banner","appearance-image-remove","banner")}
                </div>

                ${field("Banner height","bannerHeight",t.bannerHeight,
                    "number",'min="80" max="600"')}

                ${field("Banner fade (%)","bannerFade",t.bannerFade,
                    "number",'min="0" max="100"')}

                ${field("Background HEX (blank = default)",
                    "background",t.background)}

                ${safeImage(t.backgroundImage)
                    ? `<img class="ae-preview-banner"
                        src="${esc(t.backgroundImage)}" alt="">`
                    : ""}

                <div class="ae-form-grid">
                    ${button("Background image","appearance-image-upload",
                        "backgroundImage")}
                    ${button("Remove image","appearance-image-remove",
                        "backgroundImage")}
                </div>`
        });
    }

    function appearanceLayout() {
        const t = appearance(state.draft);

        formDialog({
            title: "Composition.",
            kicker: "Article layout",
            form: "appearance-layout",
            body:
                select("Content width","width",[
                    ["narrow","Narrow"],["normal","Normal"],["wide","Wide"]
                ],t.width) +

                select("Title divider","divider",[
                    ["plain","Plain"],["ornamental","Ornamental"],
                    ["glowing","Glowing"],["double","Double"],
                    ["none","Hidden"]
                ],t.divider) +

                checkbox("Show creation date","showDates",t.showDates) +
                checkbox("Show category path","showBreadcrumb",t.showBreadcrumb) +
                checkbox("Show article connections","showBacklinks",t.showBacklinks)
        });
    }

    function setAppearance(patch,rerender = true) {
        state.draft.appearance = {
            ...appearance(state.draft),
            ...patch
        };

        markDirty();

        if (rerender) {
            closeDialog();
            renderArticle();
        }
    }

    function presetList() {
        const presets = archive().presets || [];

        openDialog({
            title: "Presets.",
            kicker: "Reusable article appearances",
            body: presets.map(p => `
                <div class="ae-preset-row">
                    ${button(p.name,"preset-apply",p.id,"ae-tree-name")}
                    ${iconButton("trash","preset-delete",p.id,"Delete preset")}
                </div>`).join("") || empty(
                    "No presets yet.",
                    "Save an article's appearance to reuse it."
                )
        });
    }

    /* =====================================================
       19 — ARTICLE MANAGEMENT
       ===================================================== */

    function articleOptions() {
        const article = state.draft;
        if (!article) return;

        openDialog({
            title: article.name,
            kicker: "Article management",
            body: `<div class="archive-action-list">
                ${button(state.editing ? "Finish editing" : "Edit article",
                    "article-edit-toggle")}
                ${button("Save changes","article-save")}
                ${button("Appearance & layout","appearance-menu")}
                ${button("Add subordinate content","article-add-child-menu",article.id)}
                ${button("Move article","article-move",article.id)}
                ${button("Duplicate article","article-duplicate",article.id)}
                ${button("Delete article","article-delete-confirm",article.id,
                    "archive-button is-danger")}
            </div>`
        });
    }

    function moveArticleDialog(id) {
        const article = getArticle(id);
        if (!article) return;

        const excluded = articleDescendants(id);

        formDialog({
            title: "Move article.",
            kicker: article.name,
            form: "article-move",
            body:
                hidden("id",id) +
                select("Destination category","categoryId",
                    categoryOptionsHTML(article.categoryId),
                    article.categoryId) +

                select("Parent article","parentArticleId",[
                    ["","None — top level"],
                    ...archive().articles.filter(a => !excluded.has(a.id))
                        .map(a => [
                            a.id,
                            `${a.name} — ${getCategory(a.categoryId)?.name || ""}`
                        ])
                ],article.parentArticleId || "") +

                select("Folder","folderId",[
                    ["","None"],
                    ...(archive().folders || []).filter(f =>
                        !excluded.has(f.parentArticleId)
                    ).map(f => [
                        f.id,
                        `${getArticle(f.parentArticleId)?.name || ""} / ${f.name}`
                    ])
                ],article.folderId || ""),
            submit: "Move"
        });
    }

    /* =====================================================
       20 — GLOBAL INDEX & SETTINGS
       ===================================================== */

    function renderIndex() {
        pageRoot.innerHTML = `
            <section class="archive-page">
                <div class="archive-container">
                    <div class="archive-topbar">
                        ${button("← Aether","home","","archive-back")}
                        <span class="archive-eyebrow">THE WORLD INDEX</span>
                    </div>

                    <header class="archive-heading">
                        <h1>Collections.</h1>
                        <p>Every fragment, connected.</p>
                    </header>

                    <div class="ae-index-stats">
                        <div><strong>${archive().articles.length}</strong>Articles</div>
                        <div><strong>${archive().categories.length}</strong>Categories</div>
                        <div><strong>${archive().articles.reduce(
                            (sum,a) => sum+referenceIds(a).size,0
                        )}</strong>Connections</div>
                    </div>

                    <label class="archive-search">
                        ${icon("search")}
                        <input type="search" id="global-search"
                            placeholder="Search your world...">
                    </label>

                    <div id="global-results"></div>
                </div>
            </section>`;

        renderIndexResults("");
    }

    function renderIndexResults(query) {
        const target = $("#global-results");
        if (!target) return;

        query = query.toLowerCase();

        target.innerHTML = [...archive().articles]
            .sort((a,b) => a.name.localeCompare(b.name))
            .filter(a => [
                a.name,a.subtitle,
                ...a.blocks.map(b => b.text || "")
            ].join(" ").toLowerCase().includes(query))
            .map(a => `<div class="ae-index-result">
                ${button(a.name,"article-open",a.id,"ae-tree-name")}
                <small>${esc(categoryPath(a.categoryId)
                    .map(c => c.name).join(" / "))}</small>
            </div>`).join("") || empty("No articles found.");
    }

    function renderSettings() {
        pageRoot.innerHTML = `
            <section class="archive-page">
                <div class="archive-container">
                    <div class="archive-topbar">
                        ${button("← Aether","home","","archive-back")}
                        <span class="archive-eyebrow">SYSTEM</span>
                    </div>

                    <header class="archive-heading">
                        <h1>Settings.</h1>
                        <p>Preserve your world</p>
                    </header>

                    <div class="ae-settings-section">
                        <h3>Archive storage</h3>
                        <p>IndexedDB · Local device</p>
                        ${button("Request persistent storage","storage-persist")}
                        ${button("Export world","world-export")}
                        ${button("Import world","world-import")}
                    </div>

                    <div class="ae-settings-section">
                        <h3>Appearance presets</h3>
                        <p>${(archive().presets || []).length} saved presets</p>
                        ${button("Manage presets","preset-list")}
                    </div>

                    <div class="ae-settings-section">
                        <h3>Aether V2.2</h3>
                        <p>Editorial Archive & Article Composer</p>
                    </div>
                </div>
            </section>`;
    }

    /* =====================================================
       21 — ACTION REGISTRATION
       ===================================================== */

    const on = (name,handler) => actions.set(name,handler);
    const form = (name,handler) => forms.set(name,handler);

    on("home",showMenu);
    on("dialog-close",closeDialog);

    on("menu-select",({id}) => menuActions.get(id)?.());

    on("world-export",exportWorld);
    on("world-import",importWorld);

    on("category-open",({id}) => openCollection(id));
    on("category-create",({id}) => categoryCreate(id));
    on("category-options",({id}) => categoryOptions(id));

    on("category-toggle",async ({id}) => {
        await mutate(data => {
            const set = new Set(data.preferences.expanded || []);
            set.has(id) ? set.delete(id) : set.add(id);
            data.preferences.expanded = [...set];
        });
        renderCategoryList();
    });

    on("category-rename",({id}) => {
        const c = getCategory(id);
        if (!c) return;

        formDialog({
            title:"Rename category.",
            form:"category-rename",
            body:hidden("id",id)+field("Name","name",c.name,"text","required")
        });
    });

    on("category-move",({id}) => {
        const c = getCategory(id);
        if (!c) return;

        formDialog({
            title:"Move category.",
            form:"category-move",
            body:hidden("id",id)+select(
                "Parent category","parentId",
                categoryOptionsHTML(c.parentId,categoryDescendants(id),true),
                c.parentId || ""
            )
        });
    });

    on("category-up",({id}) => reorderCategory(id,-1));
    on("category-down",({id}) => reorderCategory(id,1));

    on("category-delete-confirm",({id}) => {
        confirmDialog(
            "Delete category?",
            "This category, its descendants and all contained articles will be deleted.",
            "category-delete",id
        );
    });

    on("category-delete",async ({id}) => {
        const ids = categoryDescendants(id);

        await mutate(data => {
            const articles = new Set(data.articles
                .filter(a => ids.has(a.categoryId)).map(a => a.id));

            data.categories = data.categories.filter(c => !ids.has(c.id));
            data.articles = data.articles.filter(a => !articles.has(a.id));
            data.folders = (data.folders || []).filter(f =>
                !articles.has(f.parentArticleId));

            data.preferences.expanded =
                (data.preferences.expanded || []).filter(id => !ids.has(id));
        });

        closeDialog();
        renderCategoryList();
    });

    on("article-open",({id}) => openArticle(id));
    on("article-back",articleBack);

    on("profile-category",({id}) => returnToArchive(id));

    on("article-edit-toggle",() => {
        closeDialog();
        return toggleEdit();
    });

    on("article-options",articleOptions);
    on("article-create",({id}) => createArticleDialog(id));

    on("article-create-child",({id}) => {
        const a = getArticle(id);
        if (a) createArticleDialog(a.categoryId,id);
    });

    on("article-add-child-menu",({id}) => childMenu(id));

    on("article-toggle",({id}) => {
        state.expandedArticles.has(id)
            ? state.expandedArticles.delete(id)
            : state.expandedArticles.add(id);

        renderCollection();
    });

    on("collection-return",() => openCollection(state.categoryId,true));

    on("collection-article-options",({id}) => collectionArticleOptions(id));

    on("article-up",({id}) => reorderArticle(id,-1));
    on("article-down",({id}) => reorderArticle(id,1));

    on("article-rename",({id}) => {
        const a = getArticle(id);
        if (!a) return;

        formDialog({
            title:"Rename article.",
            form:"article-rename",
            body:hidden("id",id)+field("Name","name",a.name,"text","required")
        });
    });

    on("article-move",async ({id}) => {
        await flushDraft();
        moveArticleDialog(id || state.articleId);
    });

    on("article-save",async () => {
        await flushDraft();
        closeDialog();
        notify("Preserved.","All article changes saved.");
    });

    on("article-delete-confirm",({id}) => {
        confirmDialog(
            "Delete article?",
            "This article and all subordinate articles and folders will be deleted. Existing references will remain marked as unresolved.",
            "article-delete",id
        );
    });

    on("article-delete",async ({id}) => {
        const ids = articleDescendants(id);

        if (ids.has(state.articleId)) {
            clearTimeout(state.saveTimer);
            state.draft = null;
            state.dirty = false;
            state.articleId = null;
        }

        await mutate(data => {
            data.articles = data.articles.filter(a => !ids.has(a.id));
            data.folders = (data.folders || []).filter(f =>
                !ids.has(f.parentArticleId));
        });

        await returnToArchive();
        notify("Article removed.");
    });

    on("article-duplicate",async ({id}) => {
        await flushDraft();

        const article = getArticle(id);
        if (!article) return;

        const copy = clone(article);
        copy.id = uid();
        copy.name += " — Copy";
        copy.createdAt = now();
        copy.updatedAt = now();
        copy.order = Date.now();

        copy.blocks.forEach(b => b.id = uid());

        await mutate(data => data.articles.push(copy));
        await openArticle(copy.id,true);
    });

    on("folder-create",({id}) => {
        formDialog({
            title:"New subcategory.",
            kicker:getArticle(id)?.name,
            form:"folder-create",
            body:hidden("parentArticleId",id)+
                field("Folder name","name","","text","required"),
            submit:"Create"
        });
    });

    on("folder-toggle",({id}) => {
        state.expandedFolders.has(id)
            ? state.expandedFolders.delete(id)
            : state.expandedFolders.add(id);

        renderCollection();
    });

    on("folder-add-article",({id}) => {
        const folder = (archive().folders || []).find(f => f.id === id);
        const parent = getArticle(folder?.parentArticleId);

        if (folder && parent) {
            createArticleDialog(parent.categoryId,parent.id,folder.id);
        }
    });

    on("folder-options",({id}) => {
        const folder = (archive().folders || []).find(f => f.id === id);
        if (!folder) return;

        openDialog({
            title:folder.name,
            kicker:"Subcategory management",
            body:`<div class="archive-action-list">
                ${button("Rename folder","folder-rename",id)}
                ${button("Add article","folder-add-article",id)}
                ${button("Remove folder","folder-delete-confirm",id)}
                ${button("Return to collection","collection-return")}
            </div>`
        });
    });

    on("folder-rename",({id}) => {
        const f = archive().folders.find(f => f.id === id);
        if (!f) return;

        formDialog({
            title:"Rename folder.",
            form:"folder-rename",
            body:hidden("id",id)+field("Name","name",f.name,"text","required")
        });
    });

    on("folder-delete-confirm",({id}) => {
        confirmDialog(
            "Remove folder?",
            "Articles inside this folder will remain as direct subarticles.",
            "folder-delete",id
        );
    });

    on("folder-delete",async ({id}) => {
        await mutate(data => {
            data.folders = data.folders.filter(f => f.id !== id);

            data.articles.forEach(a => {
                if (a.folderId === id) a.folderId = null;
            });
        });

        openCollection(state.categoryId,true);
    });

    on("block-menu",blockMenu);
    on("block-add",({id}) => addBlock(id));
    on("block-up",({id}) => moveBlock(id,-1));
    on("block-down",({id}) => moveBlock(id,1));
    on("block-duplicate",({id}) => duplicateBlock(id));
    on("block-style",({id}) => blockStyleDialog(id));

    on("block-delete",({id}) => {
        if (!confirm("Remove this content block?")) return;

        state.draft.blocks = state.draft.blocks.filter(b => b.id !== id);

        markDirty();
        renderBlocks();
    });

    ["add-row","remove-row","add-column","remove-column"]
        .forEach(operation => {
            on("table-"+operation,({id}) => modifyTable(id,operation));
        });

    on("image-add",({id}) => addImages(id));

    on("image-remove",({id}) => {
        const [blockId,index] = id.split(":");
        const block = getBlock(blockId);

        if (!block) return;

        block.images.splice(Number(index),1);

        markDirty();
        renderBlocks();
    });

    on("format-command",({id}) => formatCommand(id));
    on("inline-effects",inlineEffects);

    on("mention-picker",mentionPicker);
    on("mention-dismiss",removeMentionSuggestions);
    on("mention-insert",({id}) => insertMention(id));

    on("mention-picker-select",({id}) => {
        const [,articleId,mode] = id.split("|");
        closeDialog();
        insertMention(articleId,mode);
    });

    on("mention-open",({id,element}) => {
        if (state.editing) return;

        return element.dataset.refMode === "direct"
            ? openArticle(id)
            : articlePreview(id);
    });

    on("article-preview",({id}) => articlePreview(id));

    on("reference-add",({id}) => articlePicker("reference-select",id));

    on("reference-select",({id}) => {
        const [blockId,articleId,mode] = id.split("|");

        const block = getBlock(blockId);
        const article = getArticle(articleId);

        if (!block || !article) return;

        block.references ||= [];

        if (!block.references.some(r => r.id === articleId)) {
            block.references.push({
                id:articleId,
                name:article.name,
                mode
            });
        }

        closeDialog();
        markDirty();
        renderBlocks();
    });

    on("reference-remove",({id}) => {
        const [blockId,index] = id.split(":");
        const block = getBlock(blockId);
        if (!block) return;

        block.references.splice(Number(index),1);
        markDirty();
        renderBlocks();
    });

    on("appearance-menu",appearanceMenu);
    on("appearance-typography",typographyDialog);
    on("appearance-images",appearanceImages);
    on("appearance-layout",appearanceLayout);

    on("appearance-image-upload",({id}) => {
        const articleId = state.articleId;

        chooseImage(async files => {
            if (state.articleId !== articleId) return;
            setAppearance({[id]:files[0]},false);
            appearanceImages();
        });
    });

    on("appearance-image-remove",({id}) => {
        setAppearance({[id]:""},false);
        appearanceImages();
    });

    on("appearance-reset",() => {
        if (!confirm("Reset this article's appearance?")) return;

        state.draft.appearance = {...DEFAULT_APPEARANCE};

        closeDialog();
        markDirty();
        renderArticle();
    });

    on("preset-save",() => {
        formDialog({
            title:"Save appearance.",
            kicker:"Reusable preset",
            form:"preset-save",
            body:field("Preset name","name","","text","required")
        });
    });

    on("preset-list",presetList);

    on("preset-apply",({id}) => {
        if (!state.draft) {
            notify("Open an article first.");
            return;
        }

        const preset = (archive().presets || []).find(p => p.id === id);
        if (preset) setAppearance(clone(preset.appearance));
    });

    on("preset-delete",async ({id}) => {
        if (!confirm("Delete this appearance preset?")) return;

        await mutate(data => {
            data.presets = data.presets.filter(p => p.id !== id);
        });

        presetList();
    });

    on("storage-persist",async () => {
        const granted = await navigator.storage?.persist?.();

        notify(
            granted ? "Persistent storage enabled." : "Storage unchanged.",
            granted
                ? "The browser granted persistent storage."
                : "Continue exporting regular backups."
        );
    });

    /* =====================================================
       22 — FORM HANDLERS
       ===================================================== */

    function requiredName(values) {
        const name = String(values.get("name") || "").trim();

        if (!name) throw new Error("A name is required.");
        if (name.length > 250) throw new Error("Name is too long.");

        return name;
    }

    form("category-create",async values => {
        const name = requiredName(values);

        await mutate(data => {
            const parentId = values.get("parentId") || null;

            data.categories.push({
                id:uid(),
                name,
                parentId,
                createdAt:now(),
                updatedAt:now()
            });

            if (parentId) {
                data.preferences.expanded = [...new Set([
                    ...(data.preferences.expanded || []),
                    parentId
                ])];
            }
        });

        closeDialog();
        renderCategoryList();
    });

    form("category-rename",async values => {
        const name = requiredName(values);

        await mutate(data => {
            const category = data.categories.find(c =>
                c.id === values.get("id"));

            if (category) {
                category.name = name;
                category.updatedAt = now();
            }
        });

        closeDialog();
        renderCategoryList();
    });

    form("category-move",async values => {
        const id = values.get("id");
        const parentId = values.get("parentId") || null;

        if (categoryDescendants(id).has(parentId)) {
            throw new Error("A category cannot contain itself.");
        }

        await mutate(data => {
            const category = data.categories.find(c => c.id === id);
            if (category) category.parentId = parentId;
        });

        closeDialog();
        renderCategoryList();
    });

    form("article-create",async values => {
        await flushDraft();

        const article = {
            id:uid(),
            name:requiredName(values),
            subtitle:"",
            categoryId:values.get("categoryId"),
            parentArticleId:values.get("parentArticleId") || null,
            folderId:values.get("folderId") || null,
            order:Date.now(),
            blocks:[],
            appearance:{...DEFAULT_APPEARANCE},
            createdAt:now(),
            updatedAt:now()
        };

        await mutate(data => data.articles.push(article));

        if (article.parentArticleId) {
            state.expandedArticles.add(article.parentArticleId);
        }

        if (article.folderId) {
            state.expandedFolders.add(article.folderId);
        }

        await openArticle(article.id,true);
    });

    form("article-rename",async values => {
        const id = values.get("id");
        const name = requiredName(values);

        await flushDraft();

        await mutate(data => {
            const a = data.articles.find(a => a.id === id);
            if (a) {
                a.name = name;
                a.updatedAt = now();
            }
        });

        if (state.articleId === id) {
            state.draft = clone(getArticle(id));
            closeDialog();
            renderArticle();
        } else {
            openCollection(state.categoryId,true);
        }
    });

    form("article-move",async values => {
        await flushDraft();

        const id = values.get("id");
        const folderId = values.get("folderId") || null;
        let parentId = values.get("parentArticleId") || null;
        let categoryId = values.get("categoryId");

        if (folderId) {
            const folder = archive().folders.find(f => f.id === folderId);
            if (!folder) throw new Error("Folder not found.");

            parentId = folder.parentArticleId;
        }

        if (parentId) {
            const parent = getArticle(parentId);
            if (!parent) throw new Error("Parent article not found.");

            categoryId = parent.categoryId;
        }

        const descendants = articleDescendants(id);

        if (descendants.has(parentId)) {
            throw new Error("An article cannot contain itself.");
        }

        await mutate(data => {
            data.articles.forEach(a => {
                if (descendants.has(a.id)) a.categoryId = categoryId;

                if (a.id === id) {
                    a.parentArticleId = parentId;
                    a.folderId = folderId;
                    a.updatedAt = now();
                }
            });
        });

        if (state.articleId === id) {
            state.draft = clone(getArticle(id));
            state.categoryId = categoryId;

            closeDialog();
            renderArticle();
        } else {
            openCollection(state.categoryId,true);
        }
    });

    form("folder-create",async values => {
        const parentId = values.get("parentArticleId");

        const folder = {
            id:uid(),
            name:requiredName(values),
            parentArticleId:parentId,
            createdAt:now()
        };

        await mutate(data => {
            data.folders ||= [];
            data.folders.push(folder);
        });

        state.expandedArticles.add(parentId);
        state.expandedFolders.add(folder.id);

        closeDialog();

        if (state.page === "article") renderArticle();
        else openCollection(state.categoryId,true);
    });

    form("folder-rename",async values => {
        const name = requiredName(values);

        await mutate(data => {
            const folder = data.folders.find(f => f.id === values.get("id"));
            if (folder) folder.name = name;
        });

        openCollection(state.categoryId,true);
    });

    form("block-style",values => {
        const block = getBlock(values.get("id"));
        if (!block) return;

        block.style = readStyle(values);

        closeDialog();
        markDirty();
        renderBlocks();
    });

    form("inline-effects",applyInlineEffects);

    form("appearance-typography",values => {
        const patch = Object.fromEntries(values);

        patch.titleSize = Number(patch.titleSize);
        patch.subtitleSize = Number(patch.subtitleSize);
        patch.titleWeight = Number(patch.titleWeight);

        setAppearance(patch);
    });

    form("appearance-images",values => {
        setAppearance({
            bannerHeight:Number(values.get("bannerHeight")),
            bannerFade:Number(values.get("bannerFade")),
            background:safeColor(values.get("background"))
        });
    });

    form("appearance-layout",values => {
        setAppearance({
            width:values.get("width"),
            divider:values.get("divider"),
            showDates:values.has("showDates"),
            showBreadcrumb:values.has("showBreadcrumb"),
            showBacklinks:values.has("showBacklinks")
        });
    });

    form("preset-save",async values => {
        const preset = {
            id:uid(),
            name:requiredName(values),
            appearance:appearance(state.draft),
            createdAt:now()
        };

        await mutate(data => {
            data.presets ||= [];
            data.presets.push(preset);
        });

        closeDialog();
        notify("Appearance preserved.","Your preset is ready to reuse.");
    });

    /* =====================================================
       23 — DELEGATED EVENTS
       ===================================================== */

    function resizeTextareas() {
        $$(".ae-title-input").forEach(element => {
            element.style.height = "auto";
            element.style.height = element.scrollHeight+"px";
        });
    }

    function handleInput(event) {
        const element = event.target;

        switch (element.id) {
            case "archive-search":
                state.search = element.value;
                renderCategoryList();
                return;

            case "collection-search":
                state.collectionSearch = element.value;
                renderCollection();
                return;

            case "global-search":
                renderIndexResults(element.value);
                return;

            case "reference-search":
                renderReferenceResults(
                    element.value,
                    element.dataset.pickerAction,
                    element.dataset.pickerId
                );
                return;
        }

        if (!state.draft || !state.editing) return;

        if (element.dataset.profileField) {
            state.draft[element.dataset.profileField] = element.value;
            markDirty();
            resizeTextareas();
            return;
        }

        const editor = element.closest(".ae-rich-editor");

        if (editor) {
            syncEditor(editor);
            rememberSelection();

            if (!event.isComposing) detectMention(editor);
            return;
        }

        if (element.dataset.blockId) {
            const block = getBlock(element.dataset.blockId);
            if (!block) return;

            block[element.dataset.blockField] = element.value;
            markDirty();
        }

        if (element.dataset.tableId) {
            const block = getBlock(element.dataset.tableId);

            if (block) {
                block.rows[Number(element.dataset.row)]
                    [Number(element.dataset.column)] = element.value;

                markDirty();
            }
        }

        if (element.dataset.imageCaption) {
            const block = getBlock(element.dataset.imageCaption);

            if (block) {
                block.images[Number(element.dataset.imageIndex)]
                    .caption = element.value;

                markDirty();
            }
        }
    }

    function handleChange(event) {
        const element = event.target;

        if (element.id === "collection-sort") {
            state.sort = element.value;
            renderCollection();
        }

        if (element.id === "collection-descendants") {
            state.descendants = element.checked;
            renderCollection();
        }

        if (element.dataset.formatSelect && element.value) {
            formatCommand(element.dataset.formatSelect,element.value);
        }

        if (element.dataset.blockId && element.tagName === "SELECT") {
            renderBlocks();
        }

        if (element.dataset.blockField === "height") {
            renderBlocks();
        }
    }

    let actionBusy = false;

    async function handleClick(event) {
        const element = event.target.closest("[data-action]");

        if (!element || element.disabled ||
            element.getAttribute("aria-disabled") === "true") return;

        const handler = actions.get(element.dataset.action);
        if (!handler || actionBusy) return;

        event.preventDefault();

        actionBusy = true;

        try {
            await handler({
                id:element.dataset.id || "",
                element,
                event
            });
        } catch (error) {
            report(error);
        } finally {
            actionBusy = false;
        }
    }

    async function handleSubmit(event) {
        const handler = forms.get(event.target.dataset.form);
        if (!handler) return;

        event.preventDefault();

        if (actionBusy) return;
        actionBusy = true;

        try {
            await handler(new FormData(event.target),event.target);
        } catch (error) {
            report(error);
        } finally {
            actionBusy = false;
        }
    }

    function bindEvents() {
        document.addEventListener("click",handleClick);
        document.addEventListener("submit",handleSubmit);
        document.addEventListener("input",handleInput);
        document.addEventListener("change",handleChange);

        document.addEventListener("selectionchange",rememberSelection);

        document.addEventListener("pointerdown",event => {
            if (event.target.closest(
                ".ae-composer-toolbar,.ae-mention-suggestions"
            )) {
                rememberSelection();

                if (event.target.closest("button")) {
                    event.preventDefault();
                }
            }
        });

        document.addEventListener("paste",event => {
            const editor = event.target.closest(".ae-rich-editor");
            if (!editor) return;

            event.preventDefault();

            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText",false,text);

            syncEditor(editor);
        });

        document.addEventListener("keydown",event => {
            if (event.key === "Enter" &&
                event.target.matches('[role="link"][data-action]')) {
                event.preventDefault();
                event.target.click();
            }

            if (event.key === "Escape") {
                removeMentionSuggestions();
            }
        });

        $("#backup-input").addEventListener("change",event => {
            handleImport(event.target.files[0]).catch(report);
        });

        $("#image-input").addEventListener("change",async event => {
            const callback = state.imageCallback;
            state.imageCallback = null;

            if (!callback || !event.target.files.length) return;

            try {
                const images = [];

                for (const file of event.target.files) {
                    images.push(await prepareImage(file));
                }

                await callback(images);
            } catch (error) {
                report(error);
            }
        });

        dialog.addEventListener("click",event => {
            if (event.target !== dialog) return;

            const rect = dialog.getBoundingClientRect();

            if (event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom) {
                closeDialog();
            }
        });

        window.addEventListener("resize",resizeTextareas);

        document.addEventListener("visibilitychange",() => {
            if (document.visibilityState === "hidden") {
                flushDraft().catch(console.error);
            }
        });

        window.addEventListener("pagehide",() => {
            flushDraft().catch(console.error);
        });

        window.addEventListener("beforeunload",event => {
            if (state.dirty) {
                event.preventDefault();
                event.returnValue = "";
            }
        });
    }

    /* =====================================================
       24 — MODULE REGISTRATION
       ===================================================== */

    pages.set("archive",renderArchive);
    pages.set("article",renderArticle);
    pages.set("collections",renderIndex);
    pages.set("settings",renderSettings);

    menuActions.set("archive",() => showPage("archive"));
    menuActions.set("collections",() => showPage("collections"));
    menuActions.set("settings",() => showPage("settings"));
    menuActions.set("export",exportWorld);
    menuActions.set("import",importWorld);

    /* =====================================================
       25 — PUBLIC APPLICATION API

       Future modules can be appended after this file.
       ===================================================== */

    A.app = {
        getDatabase,
        getModule,
        updateDatabase,
        updateModule,
        replaceDatabase,

        save:flushDraft,
        exportWorld,
        importWorld,

        notify,
        report,

        escape:esc,
        icon,
        button,
        iconButton,

        openDialog,
        closeDialog,
        formDialog,

        openArticle,
        openCollection,
        articlePreview,

        getCategory,
        getArticle,
        categoryPath,
        referenceIds,

        prepareImage,
        safeImage,
        cleanHTML,

        showMenu,

        async openArchive() {
            await flushDraft();
            closeDialog();
            showPage("archive");
        },

        async navigate(name) {
            await flushDraft();
            closeDialog();

            if (name === "menu") await showMenu();
            else showPage(name);
        },

        getPage() {
            return state.page;
        },

        getArticleId() {
            return state.articleId;
        },

        registerPage(name,renderer) {
            pages.set(name,renderer);
        },

        registerAction(name,handler) {
            actions.set(name,handler);
        },

        registerForm(name,handler) {
            forms.set(name,handler);
        },

        registerBlock(name,config) {
            customBlocks.set(name,config);
        },

        registerMenuAction(name,handler) {
            menuActions.set(name,handler);
            if (state.initialized) renderMenu();
        },

        registerStartup(name,handler) {
            startupHooks.set(name,handler);
        },

        subscribe(listener) {
            subscribers.add(listener);
            return () => subscribers.delete(listener);
        },

        refresh() {
            if (state.page === "menu") renderMenu();
            else pages.get(state.page)?.();
        }
    };

    /* =====================================================
       26 — STARTUP
       ===================================================== */

    async function init() {
        if (state.initialized) return;

        menuRoot = $("#aether-menu-root");
        pageRoot = $("#aether-page-root");
        dialog = $("#aether-dialog");
        notifications = $("#notification-root");

        try {
            state.database = await A.storage.load();

            if (!state.database) {
                state.database = await A.storage.save(A.data.create());
            }

            for (const handler of startupHooks.values()) {
                await handler(A.app);
            }

            bindEvents();
            renderMenu();

            state.initialized = true;

        } catch (error) {
            console.error(error);

            menuRoot.innerHTML = `
                <div class="archive-container">
                    <header class="archive-heading">
                        <h1>Aether.</h1>
                    </header>

                    ${empty(
                        "The world could not be opened.",
                        error.message
                    )}

                    <p>Existing saved data has not been automatically reset.</p>

                    <button id="aether-retry" class="archive-button">
                        Retry
                    </button>

                    <button id="aether-recovery" class="archive-button">
                        Preserve existing data
                    </button>
                </div>`;

            $("#aether-retry")?.addEventListener("click",() => location.reload());

            $("#aether-recovery")?.addEventListener("click",async () => {
                try {
                    const raw = await A.storage.rawRecovery();

                    if (!raw) throw new Error("No recovery data available.");

                    downloadJSON(
                        typeof raw === "string"
                            ? raw : JSON.stringify(raw,null,2),
                        "Aether-Recovery.json"
                    );
                } catch (error) {
                    report(error);
                }
            });

            report(error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded",init,{once:true});
    } else {
        queueMicrotask(init);
    }

})();

/* =========================================================
   END — AETHER V2.2

   FUTURE MODULE EXTENSION POINT

   Aether.app.registerPage(...)
   Aether.app.registerAction(...)
   Aether.app.registerForm(...)
   Aether.app.registerBlock(...)
   Aether.app.registerMenuAction(...)
   Aether.app.registerStartup(...)

   Additional modules may be appended below.
   ========================================================= */

