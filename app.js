
/* =====================================================
   COMPENDIUM — APPLICATION ENGINE
   Version 1
   ===================================================== */

window.WorldApp = (() => {

    "use strict";

    const DB = window.WorldData;

    const pages = new Map();
    const actions = new Map();
    const forms = new Map();
    const inputHandlers = new Map();
    const uploadHandlers = new Map();
    const blockTypes = new Map();
    const menuItems = new Map();
    const startupHooks = new Map();

    const state = {
        route: { page: "home", id: null },
        collapsed: new Set(),
        categorySearch: "",
        library: null,
        draft: null,
        dirty: false,
        busy: false
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];


    /* 01 — UTILITIES */

    function esc(value = "") {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeImage(value) {

        const source = String(value || "");

        return /^data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/
            .test(source)
            ? esc(source)
            : "";
    }

    function dateLabel(value) {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown date";
        }

        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function pathLabel(id) {

        return DB.categoryPath(id)
            .map(c => c.name)
            .join(" / ");
    }

    function button(
        label,
        action,
        id = "",
        css = "btn",
        description = ""
    ) {

        return `
            <button type="button"
                class="${esc(css)}"
                data-action="${esc(action)}"
                data-id="${esc(id)}"
                aria-label="${esc(description || label)}"
                title="${esc(description || label)}">
                ${esc(label)}
            </button>
        `;
    }

    function toast(message, error = false) {

        const element = document.createElement("div");

        element.className =
            "toast" + (error ? " error" : "");

        element.textContent = message;

        $("#toast-root").appendChild(element);

        setTimeout(() => element.remove(), 4200);
    }

    function report(error) {

        console.error(error);

        toast(
            error.message || "Something went wrong.",
            true
        );
    }

    function downloadText(text, filename) {

        const blob = new Blob(
            [text],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 10000);
    }


    /* 02 — IMAGE PROCESSING */

    async function prepareImage(file) {

        if (!file || !file.type.startsWith("image/")) {
            throw new Error("Select an image file.");
        }

        const url = URL.createObjectURL(file);

        try {

            const image = await new Promise(
                (resolve, reject) => {

                    const img = new Image();

                    img.onload = () => resolve(img);

                    img.onerror = () => reject(
                        new Error("Unsupported image format.")
                    );

                    img.src = url;
                }
            );

            const max = 1600;

            const scale = Math.min(
                1,
                max / Math.max(
                    image.naturalWidth,
                    image.naturalHeight
                )
            );

            const canvas = document.createElement("canvas");

            canvas.width = Math.max(
                1,
                Math.round(image.naturalWidth * scale)
            );

            canvas.height = Math.max(
                1,
                Math.round(image.naturalHeight * scale)
            );

            const ctx = canvas.getContext("2d");

            if (!ctx) {
                throw new Error("Image processing unavailable.");
            }

            ctx.drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            return canvas.toDataURL("image/webp", .82);

        } finally {

            URL.revokeObjectURL(url);
        }
    }


    /* 03 — MODULE REGISTRATION */

    function registerPage(name, renderer) {
        pages.set(name, renderer);
    }

    function registerAction(name, handler) {
        actions.set(name, handler);
    }

    function registerForm(name, handler) {
        forms.set(name, handler);
    }

    function registerInput(name, handler) {
        inputHandlers.set(name, handler);
    }

    function registerUpload(name, handler) {
        uploadHandlers.set(name, handler);
    }

    function registerBlock(type, definition) {
        blockTypes.set(type, definition);
    }

    function registerMenu(item) {
        menuItems.set(item.id, item);
    }

    function registerStartup(name, handler) {
        startupHooks.set(name, handler);
    }


    /* 04 — NAVIGATION */

    function routeHash(route) {

        return "#/" +
            encodeURIComponent(route.page) +
            (route.id
                ? "/" + encodeURIComponent(route.id)
                : "");
    }

    function parseRoute() {

        try {

            const parts = location.hash
                .replace(/^#\/?/, "")
                .split("/")
                .map(decodeURIComponent);

            return {
                page: pages.has(parts[0])
                    ? parts[0]
                    : "home",

                id: parts[1] || null
            };

        } catch {

            return {
                page: "home",
                id: null
            };
        }
    }

    function canLeave() {

        return !state.dirty ||
            confirm("Discard unsaved article changes?");
    }

    function navigate(page, id = null) {

        if (!pages.has(page)) {
            throw new Error("Page is not registered.");
        }

        if (!canLeave()) return false;

        state.dirty = false;
        state.draft = null;

        closeModal();

        state.route = { page, id };

        history.pushState(
            null,
            "",
            routeHash(state.route)
        );

        render();

        window.scrollTo(0, 0);

        return true;
    }

    function renderHeader() {

        const settings = DB.settings();

        $("#app-header").innerHTML = `

            <button class="brand"
                data-action="navigate"
                data-id="home">
                ${esc(settings.archiveName)}
            </button>

            <div class="row">

                <span class="status-dot"></span>

                <span class="eyebrow">
                    Local archive
                </span>

                ${button(
                    "⌂",
                    "navigate",
                    "home",
                    "icon-btn",
                    "Main menu"
                )}

            </div>
        `;

        $("#app-footer").innerHTML = `

            <span>Compendium / V${DB.version}</span>

            <span>Personal world archive</span>
        `;
    }

    function render() {

        renderHeader();

        const renderer =
            pages.get(state.route.page) ||
            pages.get("home");

        $("#app-view").innerHTML =
            renderer(state.route);
    }


    /* 05 — MODALS */

    let previousFocus = null;

    function openModal(title, kicker, body) {

        if (!$("#modal-root .modal")) {
            previousFocus = document.activeElement;
        }

        $("#modal-root").innerHTML = `

            <div class="modal-overlay"
                data-action="overlay-close">

                <section class="modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title">

                    <header class="modal-header">

                        <div class="row">

                            <div style="flex:1;min-width:0">

                                <div class="eyebrow">
                                    ${esc(kicker)}
                                </div>

                                <h2 class="modal-title"
                                    id="modal-title">
                                    ${esc(title)}
                                </h2>

                            </div>

                            ${button(
                                "×",
                                "close-modal",
                                "",
                                "icon-btn",
                                "Close window"
                            )}

                        </div>

                    </header>

                    <div class="modal-body">
                        ${body}
                    </div>

                </section>

            </div>
        `;

        document.body.classList.add("modal-open");

        $("#app").inert = true;

        $("#modal-root .icon-btn")?.focus();
    }

    function closeModal() {

        $("#modal-root").innerHTML = "";

        document.body.classList.remove("modal-open");

        $("#app").inert = false;

        state.library = null;

        if (previousFocus?.isConnected) {
            previousFocus.focus();
        }

        previousFocus = null;
    }


    /* 06 — ORIGINAL DECORATIVE ARTWORK */

    function artwork(type) {

        if (type === "hero") {

            const petals = Array.from(
                { length: 16 },
                (_, i) => `

                    <ellipse
                        cx="150"
                        cy="150"
                        rx="29"
                        ry="112"
                        transform="rotate(${i * 22.5} 150 150)"
                        fill="#7baaab"
                        fill-opacity=".11"
                        stroke="#a4c9c7"
                        stroke-opacity=".42"
                        stroke-width=".7"/>

                    <ellipse
                        cx="150"
                        cy="150"
                        rx="12"
                        ry="105"
                        transform="rotate(${i * 22.5} 150 150)"
                        fill="none"
                        stroke="#e6bd8b"
                        stroke-opacity=".13"
                        stroke-width=".6"/>
                `
            ).join("");

            return `

                <svg viewBox="0 0 360 480"
                    preserveAspectRatio="xMidYMid slice"
                    xmlns="http://www.w3.org/2000/svg">

                    <defs>

                        <linearGradient id="heroGradient"
                            x1="0" y1="0" x2="1" y2="1">

                            <stop stop-color="#0f1217"/>

                            <stop offset="1"
                                stop-color="#27606c"/>

                        </linearGradient>

                        <radialGradient id="flowerGlow">

                            <stop stop-color="#e6bd8b"
                                stop-opacity=".65"/>

                            <stop offset="1"
                                stop-color="#7baaab"
                                stop-opacity="0"/>

                        </radialGradient>

                    </defs>

                    <rect width="360"
                        height="480"
                        fill="url(#heroGradient)"/>

                    <g transform="translate(-25,-15)">
                        ${petals}

                        <circle cx="150" cy="150" r="70"
                            fill="url(#flowerGlow)"/>
                    </g>

                    <g transform="translate(190,300) scale(.55)">
                        ${petals}

                        <circle cx="150" cy="150" r="55"
                            fill="url(#flowerGlow)"/>
                    </g>

                    <path d="M125 210 Q230 310 240 480"
                        fill="none"
                        stroke="#7baaab"
                        stroke-opacity=".4"/>

                    <path d="M240 420 Q95 360 75 280"
                        fill="none"
                        stroke="#7baaab"
                        stroke-opacity=".3"/>

                    ${Array.from(
                        { length: 45 },
                        (_, i) => `

                            <circle
                                cx="${(i * 73 + 19) % 360}"
                                cy="${(i * 97 + 31) % 480}"
                                r="${i % 3 === 0 ? 1.5 : .7}"
                                fill="#e6bd8b"
                                opacity=".25"/>
                        `
                    ).join("")}

                </svg>
            `;
        }

        if (type === "save") {

            return `

                <svg viewBox="0 0 400 250"
                    preserveAspectRatio="xMidYMid slice">

                    <rect width="400" height="250"
                        fill="#27606c"/>

                    ${Array.from(
                        { length: 22 },
                        (_, i) => `

                            <path
                                d="M-20 ${i * 11}
                                Q100 ${i * 11 - 65}
                                210 ${i * 11 + 15}
                                T430 ${i * 11 - 15}"

                                fill="none"
                                stroke="#7baaab"
                                stroke-width="${i % 3 + 1}"
                                opacity=".25"/>
                        `
                    ).join("")}

                </svg>
            `;
        }

        if (type === "restore") {

            return `

                <svg viewBox="0 0 400 250"
                    preserveAspectRatio="xMidYMid slice">

                    <rect width="400" height="250"
                        fill="#34555c"/>

                    <circle cx="310" cy="60" r="32"
                        fill="#e6bd8b"
                        opacity=".55"/>

                    <path d="M0 170 L90 45 L180 155
                        L270 80 L400 165 V250 H0Z"
                        fill="#7baaab"
                        opacity=".4"/>

                    <path d="M0 200 L135 100 L220 185
                        L325 125 L400 190 V250 H0Z"
                        fill="#17313d"/>

                    <path d="M0 230 Q100 170 210 220
                        T400 195 V250 H0Z"
                        fill="#0f1217"/>

                </svg>
            `;
        }

        if (type === "index") {

            return `

                <svg viewBox="0 0 400 250"
                    preserveAspectRatio="xMidYMid slice">

                    <rect width="400" height="250"
                        fill="#17343d"/>

                    ${Array.from(
                        { length: 10 },
                        (_, i) => `

                            <circle cx="290" cy="100"
                                r="${20 + i * 12}"
                                fill="none"
                                stroke="#e6bd8b"
                                stroke-width=".7"
                                opacity=".35"/>
                        `
                    ).join("")}

                    ${Array.from(
                        { length: 12 },
                        (_, i) => `

                            <path d="M290 100 L290 -40"
                                transform="rotate(${i * 30} 290 100)"
                                stroke="#e6bd8b"
                                stroke-width=".6"
                                opacity=".35"/>
                        `
                    ).join("")}

                </svg>
            `;
        }

        return `

            <svg viewBox="0 0 400 250"
                preserveAspectRatio="xMidYMid slice">

                <rect width="400" height="250"
                    fill="#17343d"/>

                <g transform="translate(260,55)">

                    <ellipse rx="80" ry="40"
                        fill="#7baaab"
                        fill-opacity=".35"
                        stroke="#b5d2cd"
                        stroke-opacity=".7"/>

                    ${Array.from(
                        { length: 15 },
                        (_, i) => `

                            <path
                                d="M${-65 + i * 9} 15
                                Q${-90 + i * 10} 90
                                ${-40 + i * 8} 120
                                T${-90 + i * 12} 220"

                                fill="none"
                                stroke="${i % 2
                                    ? "#e6bd8b"
                                    : "#7baaab"}"
                                stroke-width=".9"
                                opacity=".6"/>
                        `
                    ).join("")}

                </g>

            </svg>
        `;
    }


    /* 07 — MAIN MENU */

    function renderHome() {

        const settings = DB.settings();

        const panels = [...menuItems.values()]
            .sort((a, b) =>
                (a.order || 0) - (b.order || 0)
            )
            .map((item, index) => {

                const image = safeImage(
                    settings.menuImages[item.id]
                );

                const art = image
                    ? `<img src="${image}" alt="">`
                    : artwork(item.style);

                if (item.hero) {

                    return `

                        <button class="menu-panel hero"
                            style="--delay:${index * 75}ms"
                            data-action="${esc(item.action)}"
                            data-id="${esc(item.target || "")}">

                            <div class="hero-art">
                                ${art}
                            </div>

                            <div class="hero-copy">

                                <div class="panel-kicker">
                                    ${esc(item.kicker)}
                                </div>

                                <div class="panel-title">
                                    ${esc(item.title)}
                                </div>

                                <div class="panel-description">
                                    ${esc(item.description)}
                                </div>

                                <span class="panel-arrow">
                                    ↗
                                </span>

                            </div>

                        </button>
                    `;
                }

                return `

                    <button class="menu-panel"
                        style="--delay:${index * 75}ms"
                        data-action="${esc(item.action)}"
                        data-id="${esc(item.target || "")}">

                        <div class="panel-art">
                            ${art}
                        </div>

                        <div class="panel-kicker">
                            ${esc(item.kicker)}
                        </div>

                        <div class="panel-bottom">

                            <div class="panel-title">
                                ${esc(item.title)}
                            </div>

                            <div class="panel-description">
                                ${esc(item.description)}
                            </div>

                        </div>

                    </button>
                `;
            }).join("");

        return `

            <section class="home-intro">

                <div class="eyebrow">
                    The worldbuilding project
                </div>

                <h1 class="home-title">
                    ${esc(settings.archiveName)}
                </h1>

                <p class="home-description">
                    ${esc(settings.description)}
                </p>

            </section>

            <section class="menu-grid">
                ${panels}
            </section>

            <p class="home-note">
                A place for everything that does not yet exist.
            </p>
        `;
    }


    /* 08 — CATEGORY TREE */

    function renderTree() {

        const categories = DB.categories();

        const counts = DB.select(data => {

            const result = {};

            for (const article of data.articles) {
                result[article.categoryId] =
                    (result[article.categoryId] || 0) + 1;
            }

            return result;
        });

        const childMap = new Map();
        const categoryMap = new Map();

        for (const category of categories) {

            categoryMap.set(category.id, category);

            if (!childMap.has(category.parentId)) {
                childMap.set(category.parentId, []);
            }

            childMap.get(category.parentId).push(category);
        }

        for (const list of childMap.values()) {
            list.sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        const query = state.categorySearch
            .trim()
            .toLowerCase();

        const visible = new Set();

        if (query) {

            for (const category of categories) {

                if (
                    category.name.toLowerCase().includes(query)
                ) {

                    let current = category;

                    while (current) {
                        visible.add(current.id);

                        current = categoryMap.get(
                            current.parentId
                        );
                    }

                    const queue = [category.id];

                    while (queue.length) {

                        const id = queue.shift();

                        visible.add(id);

                        for (
                            const child of
                            childMap.get(id) || []
                        ) {
                            queue.push(child.id);
                        }
                    }
                }
            }
        }

        function branch(parentId, depth = 0) {

            const children =
                childMap.get(parentId) || [];

            return children
                .filter(c => !query || visible.has(c.id))
                .map((category, index) => {

                    const nested =
                        childMap.get(category.id) || [];

                    const collapsed =
                        state.collapsed.has(category.id) &&
                        !query;

                    return `

                        <div class="category-node">

                            <div class="category-row">

                                <span class="category-number">
                                    ${String(index + 1)
                                        .padStart(2, "0")}
                                </span>

                                <button class="category-name"
                                    data-action="open-library"
                                    data-id="${esc(category.id)}">
                                    ${esc(category.name)}
                                </button>

                                <span class="category-count">
                                    ${counts[category.id] || 0}
                                </span>

                                ${button(
                                    "+",
                                    "add-category",
                                    category.id,
                                    "icon-btn",
                                    "Add subcategory"
                                )}

                                ${button(
                                    "···",
                                    "edit-category",
                                    category.id,
                                    "icon-btn",
                                    "Edit category"
                                )}

                                ${nested.length
                                    ? button(
                                        collapsed ? "›" : "⌄",
                                        "toggle-category",
                                        category.id,
                                        "icon-btn",
                                        collapsed
                                            ? "Expand"
                                            : "Collapse"
                                    )
                                    : ""}

                            </div>

                            ${nested.length && !collapsed
                                ? `
                                    <div class="category-children">
                                        ${branch(
                                            category.id,
                                            depth + 1
                                        )}
                                    </div>
                                `
                                : ""}

                        </div>
                    `;
                }).join("");
        }

        return branch(null) ||

            `<div class="empty-state">
                No categories found.
            </div>`;
    }

    function renderArchive() {

        return `

            <section class="sheet">

                <div class="eyebrow">
                    01 / The collection
                </div>

                <h1 class="page-title">
                    The Archive.
                </h1>

                <p class="page-description">
                    A living collection of everything
                    within your imagined world.
                </p>

                <div class="page-toolbar">

                    <input
                        data-input="category-search"
                        placeholder="Find a category..."
                        value="${esc(state.categorySearch)}">

                    ${button(
                        "+ Category",
                        "add-category",
                        "",
                        "btn primary"
                    )}

                </div>

                <div id="category-tree">
                    ${renderTree()}
                </div>

            </section>
        `;
    }

    function categoryOptions(selected, excluded = []) {

        return DB.categories()
            .filter(c => !excluded.includes(c.id))
            .map(c => ({
                ...c,
                path: pathLabel(c.id)
            }))
            .sort((a, b) =>
                a.path.localeCompare(b.path)
            )
            .map(c => `

                <option value="${esc(c.id)}"
                    ${c.id === selected ? "selected" : ""}>
                    ${esc(c.path)}
                </option>

            `).join("");
    }

    function categoryDialog(parentId = null, editId = null) {

        const existing = editId
            ? DB.category(editId)
            : null;

        const excluded = existing
            ? [existing.id, ...DB.descendants(existing.id)]
            : [];

        const selected = existing
            ? existing.parentId
            : parentId;

        openModal(
            existing ? "Edit category." : "New category.",
            "Archive structure",

            `

                <form data-form="category"
                    data-id="${esc(editId || "")}">

                    <div class="stack">

                        <div class="field">

                            <label>Category name</label>

                            <input name="name"
                                required
                                maxlength="150"
                                placeholder="e.g. Occupations"
                                value="${esc(existing?.name || "")}">

                        </div>

                        <div class="field">

                            <label>Parent category</label>

                            <select name="parentId">

                                <option value="">
                                    Main category
                                </option>

                                ${categoryOptions(
                                    selected,
                                    excluded
                                )}

                            </select>

                        </div>

                    </div>

                    <div class="modal-actions">

                        <button type="submit"
                            class="btn primary">
                            Save category
                        </button>

                        ${existing
                            ? button(
                                "Delete",
                                "delete-category",
                                existing.id,
                                "btn danger"
                            )
                            : ""}

                    </div>

                </form>
            `
        );
    }


    /* 09 — ARTICLE LIBRARY */

    function sortedArticles(items, sort, query = "") {

        const search = query.trim().toLowerCase();

        const result = items.filter(article => {

            if (!search) return true;

            return [
                article.title,
                article.subtitle,
                pathLabel(article.categoryId),

                ...article.blocks.map(block =>
                    [
                        block.text,
                        block.label,
                        block.value,
                        block.caption
                    ].filter(Boolean).join(" ")
                )

            ].join(" ").toLowerCase().includes(search);
        });

        if (sort === "created") {

            result.sort((a, b) =>
                String(b.createdAt)
                    .localeCompare(String(a.createdAt))
            );

        } else if (sort === "edited") {

            result.sort((a, b) =>
                String(b.updatedAt)
                    .localeCompare(String(a.updatedAt))
            );

        } else if (sort === "za") {

            result.sort((a, b) =>
                b.title.localeCompare(a.title)
            );

        } else {

            result.sort((a, b) =>
                a.title.localeCompare(b.title)
            );
        }

        return result;
    }

    function sortOptions(selected = "az") {

        return [
            ["az", "Alphabetical A–Z"],
            ["za", "Alphabetical Z–A"],
            ["created", "Recently added"],
            ["edited", "Recently edited"]

        ].map(([value, label]) => `

            <option value="${value}"
                ${value === selected ? "selected" : ""}>
                ${label}
            </option>

        `).join("");
    }

    function articleRows(items) {

        if (!items.length) {

            return `
                <div class="empty-state">
                    No articles found.
                </div>
            `;
        }

        return items.map(article => `

            <button class="article-list-item"
                data-action="open-article"
                data-id="${esc(article.id)}">

                <div>

                    <div class="article-list-title">
                        ${esc(article.title)}
                    </div>

                    <div class="article-list-meta">
                        ${esc(pathLabel(article.categoryId))}
                        · ${esc(dateLabel(article.updatedAt))}
                    </div>

                </div>

                <span class="muted">↗</span>

            </button>

        `).join("");
    }

    function openLibrary(id) {

        const category = DB.category(id);

        if (!category) return;

        openModal(
            category.name + ".",
            pathLabel(id),

            `

                <div class="library-toolbar">

                    <input id="library-search"
                        data-input="library-filter"
                        placeholder="Search articles...">

                    <select id="library-sort"
                        data-input="library-filter">
                        ${sortOptions()}
                    </select>

                    ${button(
                        "+ Article",
                        "new-article",
                        id,
                        "btn primary"
                    )}

                </div>

                <label class="row"
                    style="margin-bottom:15px">

                    <input type="checkbox"
                        id="library-nested"
                        data-input="library-filter">

                    <span class="muted">
                        Include subcategories
                    </span>

                </label>

                <div id="library-results"
                    class="article-list">
                </div>
            `
        );

        state.library = {
            categoryId: id
        };

        refreshLibrary();
    }

    function refreshLibrary() {

        if (!state.library || !$("#library-results")) {
            return;
        }

        const items = DB.listArticles(
            state.library.categoryId,
            $("#library-nested").checked
        );

        $("#library-results").innerHTML = articleRows(
            sortedArticles(
                items,
                $("#library-sort").value,
                $("#library-search").value
            )
        );
    }

    function newArticleDialog(categoryId) {

        openModal(
            "New article.",
            pathLabel(categoryId),

            `

                <form data-form="new-article"
                    data-id="${esc(categoryId)}">

                    <div class="field">

                        <label>Article title</label>

                        <input name="title"
                            required
                            maxlength="250"
                            placeholder="Name your creation">

                    </div>

                    <div class="modal-actions">

                        <button type="submit"
                            class="btn primary">
                            Compose article
                        </button>

                    </div>

                </form>
            `
        );
    }


    /* 10 — CONTENT BLOCK ENGINE */

    function blockInput(
        block,
        key,
        placeholder,
        multiline = false
    ) {

        const attributes = `
            data-input="block-value"
            data-block="${esc(block.id)}"
            data-key="${esc(key)}"
            placeholder="${esc(placeholder)}"
        `;

        return multiline

            ? `<textarea ${attributes}>${esc(
                block[key] || ""
            )}</textarea>`

            : `<input ${attributes}
                value="${esc(block[key] || "")}">`;
    }

    function renderBlock(block) {

        const definition = blockTypes.get(block.type);

        return `

            <div class="content-block">

                ${definition

                    ? definition.render(block)

                    : `<p class="muted">
                        Unsupported block:
                        ${esc(block.type)}.
                        Its data is preserved.
                    </p>`}

            </div>
        `;
    }

    function editorBlock(block, index) {

        const definition = blockTypes.get(block.type);

        return `

            <section class="editor-block">

                <div class="editor-block-toolbar">

                    <span class="eyebrow">
                        ${String(index + 1).padStart(2, "0")}
                        / ${esc(definition?.label || block.type)}
                    </span>

                    <span class="spacer"></span>

                    ${button(
                        "↑",
                        "block-up",
                        block.id,
                        "icon-btn",
                        "Move block up"
                    )}

                    ${button(
                        "↓",
                        "block-down",
                        block.id,
                        "icon-btn",
                        "Move block down"
                    )}

                    ${button(
                        "×",
                        "block-delete",
                        block.id,
                        "icon-btn",
                        "Delete block"
                    )}

                </div>

                ${definition

                    ? definition.editor(block)

                    : `<p class="muted">
                        This block requires another module.
                        Its contents will be preserved.
                    </p>`}

            </section>
        `;
    }

    function refreshEditorBlocks() {

        if (!state.draft || !$("#editor-blocks")) {
            return;
        }

        $("#editor-blocks").innerHTML =
            state.draft.blocks
                .map(editorBlock)
                .join("");
    }

    function addBlock(type) {

        const definition = blockTypes.get(type);

        if (!state.draft || !definition) return;

        state.draft.blocks.push({
            ...definition.create(),
            id: DB.uid(),
            type
        });

        state.dirty = true;

        refreshEditorBlocks();

        $("#editor-blocks .editor-block:last-child")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
    }

    function moveBlock(id, direction) {

        const blocks = state.draft?.blocks;

        if (!blocks) return;

        const index = blocks.findIndex(
            block => block.id === id
        );

        const next = index + direction;

        if (
            index < 0 ||
            next < 0 ||
            next >= blocks.length
        ) return;

        [blocks[index], blocks[next]] =
            [blocks[next], blocks[index]];

        state.dirty = true;

        refreshEditorBlocks();
    }


    /* 11 — ARTICLE READER */

    function renderArticle(route) {

        const article = DB.article(route.id);

        if (!article) {

            return `

                <section class="sheet">

                    <div class="empty-state">
                        Article not found.
                    </div>

                    ${button(
                        "Return to archive",
                        "navigate",
                        "archive"
                    )}

                </section>
            `;
        }

        const banner = safeImage(article.banner);

        return `

            <article class="sheet">

                <div class="row wrap"
                    style="margin-bottom:22px">

                    ${button(
                        "← Archive",
                        "return-library",
                        article.categoryId
                    )}

                    <span class="spacer"></span>

                    ${button(
                        "Edit article",
                        "edit-article",
                        article.id,
                        "btn gold"
                    )}

                </div>

                ${banner
                    ? `
                        <div class="article-banner">
                            <img src="${banner}" alt="">
                        </div>
                    `
                    : ""}

                <header class="article-heading">

                    <div class="eyebrow">
                        ${esc(pathLabel(article.categoryId))}
                    </div>

                    <h1 class="page-title">
                        ${esc(article.title)}
                    </h1>

                    ${article.subtitle
                        ? `
                            <p class="article-subtitle">
                                ${esc(article.subtitle)}
                            </p>
                        `
                        : ""}

                </header>

                <div class="section-line"></div>

                <div class="article-content">

                    ${article.blocks.length

                        ? article.blocks
                            .map(renderBlock)
                            .join("")

                        : `<div class="empty-state">
                            An unwritten page.
                        </div>`}

                </div>

                <div class="settings-section row wrap">

                    <span class="eyebrow">
                        Edited ${esc(dateLabel(article.updatedAt))}
                    </span>

                    <span class="spacer"></span>

                    ${button(
                        "Delete article",
                        "delete-article",
                        article.id,
                        "btn danger"
                    )}

                </div>

            </article>
        `;
    }


    /* 12 — ARTICLE EDITOR */

    function renderEditor(route) {

        if (
            !state.draft ||
            state.draft.id !== route.id
        ) {

            state.draft = DB.article(route.id);
        }

        const draft = state.draft;

        if (!draft) {

            return `
                <section class="sheet">
                    <div class="empty-state">
                        Article draft not found.
                    </div>
                </section>
            `;
        }

        const banner = safeImage(draft.banner);

        return `

            <section class="sheet">

                <div class="eyebrow">
                    Article composition
                </div>

                <h1 class="page-title">
                    Compose.
                </h1>

                <div class="stack"
                    style="margin:26px 0">

                    <div class="field">

                        <label>Title</label>

                        <input data-input="article-value"
                            data-key="title"
                            value="${esc(draft.title)}">

                    </div>

                    <div class="field">

                        <label>Subtitle — optional</label>

                        <input data-input="article-value"
                            data-key="subtitle"
                            value="${esc(draft.subtitle)}">

                    </div>

                    <div class="field">

                        <label>Category</label>

                        <select data-input="article-value"
                            data-key="categoryId">

                            ${categoryOptions(draft.categoryId)}

                        </select>

                    </div>

                    <div class="field">

                        <label>Banner — optional</label>

                        <div id="banner-preview">

                            ${banner
                                ? `<img class="editor-preview"
                                    src="${banner}" alt="">`
                                : ""}

                        </div>

                        <input type="file"
                            accept="image/*"
                            data-upload="banner">

                        ${button(
                            "Remove banner",
                            "remove-banner"
                        )}

                    </div>

                </div>

                <div id="editor-blocks">

                    ${draft.blocks
                        .map(editorBlock)
                        .join("")}

                </div>

                <div class="add-block-panel">

                    <div class="eyebrow">
                        Add content block
                    </div>

                    <div class="block-options">

                        ${[...blockTypes].map(
                            ([type, definition]) =>
                                button(
                                    "+ " + definition.label,
                                    "add-block",
                                    type
                                )
                        ).join("")}

                    </div>

                </div>

                <div class="editor-actions">

                    ${button(
                        "Cancel",
                        "cancel-editor"
                    )}

                    ${button(
                        "Save article",
                        "save-article",
                        "",
                        "btn primary"
                    )}

                </div>

            </section>
        `;
    }

    function startNewArticle(categoryId, title) {

        if (!canLeave()) return;

        const draft = DB.newArticle(
            categoryId,
            title
        );

        closeModal();

        state.draft = draft;
        state.dirty = true;

        state.route = {
            page: "editor",
            id: draft.id
        };

        history.pushState(
            null,
            "",
            routeHash(state.route)
        );

        render();

        window.scrollTo(0, 0);
    }


    /* 13 — INDEX */

    function renderIndex() {

        const stats = DB.select(data => ({

            articles: data.articles.length,

            categories: data.categories.length,

            blocks: data.articles.reduce(
                (sum, article) =>
                    sum + article.blocks.length,
                0
            )
        }));

        return `

            <section class="sheet">

                <div class="eyebrow">
                    04 / Overview
                </div>

                <h1 class="page-title">
                    The Index.
                </h1>

                <p class="page-description">
                    Explore the complete collection.
                </p>

                <div class="stat-grid">

                    ${[
                        ["Articles", stats.articles],
                        ["Categories", stats.categories],
                        ["Content blocks", stats.blocks]

                    ].map(([label, value]) => `

                        <div class="stat-card">

                            <div class="stat-value">
                                ${value}
                            </div>

                            <div class="eyebrow">
                                ${label}
                            </div>

                        </div>

                    `).join("")}

                </div>

                <div class="library-toolbar">

                    <input id="index-search"
                        data-input="index-filter"
                        placeholder="Search all articles...">

                    <select id="index-sort"
                        data-input="index-filter">
                        ${sortOptions()}
                    </select>

                </div>

                <div id="index-results"
                    class="article-list">

                    ${articleRows(
                        sortedArticles(
                            DB.articles(),
                            "az"
                        )
                    )}

                </div>

            </section>
        `;
    }

    function refreshIndex() {

        if (!$("#index-results")) return;

        $("#index-results").innerHTML = articleRows(
            sortedArticles(
                DB.articles(),
                $("#index-sort").value,
                $("#index-search").value
            )
        );
    }


    /* 14 — SETTINGS */

    function renderSettings() {

        const settings = DB.settings();

        return `

            <section class="sheet">

                <div class="eyebrow">
                    05 / Personalization
                </div>

                <h1 class="page-title">
                    Settings.
                </h1>

                <form data-form="settings"
                    class="settings-section stack">

                    <div class="field">

                        <label>Archive name</label>

                        <input name="archiveName"
                            required
                            maxlength="100"
                            value="${esc(settings.archiveName)}">

                    </div>

                    <div class="field">

                        <label>Archive description</label>

                        <input name="description"
                            value="${esc(settings.description)}">

                    </div>

                    <button type="submit"
                        class="btn primary">
                        Save settings
                    </button>

                </form>

                <section class="settings-section">

                    <h2>Menu artwork.</h2>

                    <p class="page-description">
                        Replace the decorative artwork with
                        images from your device.
                    </p>

                    ${[...menuItems.values()].map(item => {

                        const image = safeImage(
                            settings.menuImages[item.id]
                        );

                        return `

                            <div class="settings-image-row">

                                ${image
                                    ? `<img src="${image}" alt="">`
                                    : ""}

                                <div class="stack"
                                    style="flex:1;min-width:0">

                                    <span>
                                        ${esc(item.title)}
                                    </span>

                                    <input type="file"
                                        accept="image/*"
                                        data-upload="menu-image"
                                        data-id="${esc(item.id)}">

                                    ${button(
                                        "Restore default artwork",
                                        "reset-menu-image",
                                        item.id
                                    )}

                                </div>

                            </div>
                        `;
                    }).join("")}

                </section>

                <section class="settings-section">

                    <h2>Archive preservation.</h2>

                    <p class="page-description">
                        Your data is stored in this browser
                        using IndexedDB. Export regular
                        backups to preserve your archive.
                    </p>

                    <div class="modal-actions">

                        ${button(
                            "Export backup",
                            "export",
                            "",
                            "btn primary"
                        )}

                        ${button(
                            "Import backup",
                            "import"
                        )}

                        ${button(
                            "Request persistent storage",
                            "persist-storage"
                        )}

                    </div>

                </section>

            </section>
        `;
    }


    /* 15 — BACKUP INTERFACE */

    async function exportBackup() {

        await DB.flush();

        const name = DB.settings().archiveName
            .replace(/[^a-zA-Z0-9_-]+/g, "-");

        downloadText(
            DB.exportArchive(),
            name + "-" +
                new Date().toISOString().slice(0, 10) +
                ".json"
        );

        toast("Backup prepared.");
    }

    async function importBackup(file) {

        if (!file) return;

        if (!canLeave()) return;

        const text = await file.text();

        const incoming = DB.inspectBackup(text);

        const approved = confirm(

            "Restore this archive?\n\n" +

            "Name: " +
            incoming.settings.archiveName + "\n" +

            "Categories: " +
            incoming.categories.length + "\n" +

            "Articles: " +
            incoming.articles.length + "\n\n" +

            "This will replace the current archive. " +
            "Export your existing archive first if necessary."
        );

        if (!approved) return;

        await DB.importArchive(text);

        state.dirty = false;
        state.draft = null;
        state.collapsed.clear();
        state.categorySearch = "";

        navigate("home");

        toast("Archive restored successfully.");
    }


    /* 16 — PAGE REGISTRATION */

    registerPage("home", renderHome);
    registerPage("archive", renderArchive);
    registerPage("article", renderArticle);
    registerPage("editor", renderEditor);
    registerPage("index", renderIndex);
    registerPage("settings", renderSettings);


    /* 17 — MENU REGISTRATION */

    registerMenu({
        id: "archive",
        order: 1,
        hero: true,
        style: "hero",
        kicker: "01 / The collection",
        title: "The World Archive.",
        description:
            "Everything imagined, preserved in one place.",
        action: "navigate",
        target: "archive"
    });

    registerMenu({
        id: "save",
        order: 2,
        style: "save",
        kicker: "02 / Preservation",
        title: "Save archive.",
        description: "Preserve your world.",
        action: "export"
    });

    registerMenu({
        id: "restore",
        order: 3,
        style: "restore",
        kicker: "03 / Restoration",
        title: "Import archive.",
        description: "Continue an existing collection.",
        action: "import"
    });

    registerMenu({
        id: "index",
        order: 4,
        style: "index",
        kicker: "04 / Overview",
        title: "The Index.",
        description: "Explore everything.",
        action: "navigate",
        target: "index"
    });

    registerMenu({
        id: "settings",
        order: 5,
        style: "settings",
        kicker: "05 / Personalization",
        title: "Settings.",
        description: "Make the archive yours.",
        action: "navigate",
        target: "settings"
    });


    /* 18 — CONTENT BLOCK REGISTRATION */

    registerBlock("heading", {

        label: "Heading",

        create: () => ({
            text: ""
        }),

        render: block => `
            <h2 class="content-heading">
                ${esc(block.text)}
            </h2>
        `,

        editor: block =>
            blockInput(
                block,
                "text",
                "Section heading"
            )
    });

    registerBlock("subheading", {

        label: "Subheading",

        create: () => ({
            text: ""
        }),

        render: block => `
            <h3 class="content-subheading">
                ${esc(block.text)}
            </h3>
        `,

        editor: block =>
            blockInput(
                block,
                "text",
                "Subheading"
            )
    });

    registerBlock("paragraph", {

        label: "Paragraph",

        create: () => ({
            text: ""
        }),

        render: block =>
            `<div class="content-paragraph">${esc(
                block.text
            )}</div>`,

        editor: block =>
            blockInput(
                block,
                "text",
                "Write something...",
                true
            )
    });

    registerBlock("field", {

        label: "Information field",

        create: () => ({
            label: "",
            value: ""
        }),

        render: block => `

            <div class="content-field">

                <span>${esc(block.label)}</span>

                <span>${esc(block.value)}</span>

            </div>
        `,

        editor: block => `

            <div class="stack">

                ${blockInput(
                    block,
                    "label",
                    "Label — e.g. Classification"
                )}

                ${blockInput(
                    block,
                    "value",
                    "Value — e.g. Artisan",
                    true
                )}

            </div>
        `
    });

    registerBlock("quote", {

        label: "Quote",

        create: () => ({
            text: ""
        }),

        render: block =>
            `<blockquote class="content-quote">${esc(
                block.text
            )}</blockquote>`,

        editor: block =>
            blockInput(
                block,
                "text",
                "Quotation...",
                true
            )
    });

    registerBlock("divider", {

        label: "Divider",

        create: () => ({}),

        render: () =>
            `<hr class="content-divider">`,

        editor: () =>
            `<hr class="content-divider">`
    });

    registerBlock("image", {

        label: "Image",

        create: () => ({
            source: "",
            caption: ""
        }),

        render: block => `

            ${safeImage(block.source)

                ? `<img class="content-image"
                    src="${safeImage(block.source)}"
                    alt="${esc(block.caption)}">`

                : ""}

            ${block.caption

                ? `<div class="image-caption">
                    ${esc(block.caption)}
                </div>`

                : ""}
        `,

        editor: block => `

            <div class="stack">

                ${safeImage(block.source)

                    ? `<img class="editor-preview"
                        src="${safeImage(block.source)}"
                        alt="">`

                    : ""}

                <input type="file"
                    accept="image/*"
                    data-upload="block-image"
                    data-id="${esc(block.id)}">

                ${blockInput(
                    block,
                    "caption",
                    "Optional image caption"
                )}

            </div>
        `
    });


    /* 19 — ACTION REGISTRATION */

    registerAction("navigate", ({ id }) =>
        navigate(id)
    );

    registerAction("close-modal", closeModal);

    registerAction("overlay-close", ({ event, element }) => {

        if (event.target === element) {
            closeModal();
        }
    });

    registerAction("add-category", ({ id }) =>
        categoryDialog(id || null)
    );

    registerAction("edit-category", ({ id }) =>
        categoryDialog(null, id)
    );

    registerAction("toggle-category", ({ id }) => {

        if (state.collapsed.has(id)) {
            state.collapsed.delete(id);
        } else {
            state.collapsed.add(id);
        }

        $("#category-tree").innerHTML = renderTree();
    });

    registerAction("delete-category", async ({ id }) => {

        const category = DB.category(id);

        if (!category) return;

        const subCount = DB.descendants(id).length;
        const articleCount = DB.listArticles(id, true).length;

        if (!confirm(

            `Delete "${category.name}"?\n\n` +

            `${subCount} subcategories and ` +
            `${articleCount} articles will also be deleted.`

        )) return;

        await DB.deleteCategory(id);

        closeModal();
        render();

        toast("Category deleted.");
    });

    registerAction("open-library", ({ id }) =>
        openLibrary(id)
    );

    registerAction("return-library", ({ id }) => {

        if (navigate("archive")) {
            openLibrary(id);
        }
    });

    registerAction("new-article", ({ id }) =>
        newArticleDialog(id)
    );

    registerAction("open-article", ({ id }) =>
        navigate("article", id)
    );

    registerAction("edit-article", ({ id }) =>
        navigate("editor", id)
    );

    registerAction("delete-article", async ({ id }) => {

        const article = DB.article(id);

        if (!article) return;

        if (!confirm(
            `Permanently delete "${article.title}"?`
        )) return;

        await DB.deleteArticle(id);

        navigate("archive");

        openLibrary(article.categoryId);

        toast("Article deleted.");
    });

    registerAction("add-block", ({ id }) =>
        addBlock(id)
    );

    registerAction("block-up", ({ id }) =>
        moveBlock(id, -1)
    );

    registerAction("block-down", ({ id }) =>
        moveBlock(id, 1)
    );

    registerAction("block-delete", ({ id }) => {

        if (!state.draft) return;

        if (!confirm("Remove this content block?")) {
            return;
        }

        state.draft.blocks =
            state.draft.blocks.filter(
                block => block.id !== id
            );

        state.dirty = true;

        refreshEditorBlocks();
    });

    registerAction("remove-banner", () => {

        if (!state.draft) return;

        state.draft.banner = "";
        state.dirty = true;

        $("#banner-preview").innerHTML = "";
    });

    registerAction("cancel-editor", () => {

        if (!state.draft) return;

        const existing = DB.article(state.draft.id);
        const categoryId = state.draft.categoryId;

        if (existing) {

            navigate("article", existing.id);

        } else {

            if (navigate("archive")) {
                openLibrary(categoryId);
            }
        }
    });

    registerAction("save-article", async () => {

        if (!state.draft) return;

        const draft = DB.clone(state.draft);

        await DB.saveArticle(draft);

        state.dirty = false;

        navigate("article", draft.id);

        toast("Article saved.");
    });

    registerAction("export", exportBackup);

    registerAction("import", () => {
        $("#backup-input").click();
    });

    registerAction("reset-menu-image", async ({ id }) => {

        const images = DB.settings().menuImages;

        delete images[id];

        await DB.saveSettings({
            menuImages: images
        });

        render();

        toast("Default artwork restored.");
    });

    registerAction("persist-storage", async () => {

        if (!navigator.storage?.persist) {

            toast(
                "Persistent storage is unavailable in this browser.",
                true
            );

            return;
        }

        const granted = await navigator.storage.persist();

        toast(
            granted

                ? "Persistent storage granted."

                : "Persistent storage was not granted. Keep backups.",

            !granted
        );
    });


    /* 20 — FORM REGISTRATION */

    registerForm("category", async ({ form, values }) => {

        const name = String(values.get("name") || "");

        const parentId =
            values.get("parentId") || null;

        if (form.dataset.id) {

            await DB.updateCategory(
                form.dataset.id,
                { name, parentId }
            );

        } else {

            await DB.createCategory(
                name,
                parentId
            );
        }

        if (parentId) {
            state.collapsed.delete(parentId);
        }

        closeModal();
        render();

        toast("Category saved.");
    });

    registerForm("new-article", ({ form, values }) => {

        const title = String(
            values.get("title") || ""
        ).trim();

        if (!title) {
            throw new Error("Enter an article title.");
        }

        startNewArticle(
            form.dataset.id,
            title
        );
    });

    registerForm("settings", async ({ values }) => {

        await DB.saveSettings({

            archiveName: String(
                values.get("archiveName") || ""
            ).trim() || "Compendium.",

            description: String(
                values.get("description") || ""
            )
        });

        render();

        toast("Settings saved.");
    });


    /* 21 — INPUT REGISTRATION */

    registerInput("category-search", ({ element }) => {

        state.categorySearch = element.value;

        $("#category-tree").innerHTML = renderTree();
    });

    registerInput("library-filter", refreshLibrary);

    registerInput("index-filter", refreshIndex);

    registerInput("article-value", ({ element }) => {

        if (!state.draft) return;

        const key = element.dataset.key;

        if (
            !["title", "subtitle", "categoryId"]
                .includes(key)
        ) return;

        state.draft[key] = element.value;

        state.dirty = true;
    });

    registerInput("block-value", ({ element }) => {

        if (!state.draft) return;

        const block = state.draft.blocks.find(
            item => item.id === element.dataset.block
        );

        const key = element.dataset.key;

        if (
            !block ||
            !key ||
            ["id", "type", "__proto__", "constructor", "prototype"]
                .includes(key)
        ) return;

        block[key] = element.value;

        state.dirty = true;
    });


    /* 22 — UPLOAD REGISTRATION */

    registerUpload("banner", async ({ file }) => {

        const draft = state.draft;

        if (!draft) return;

        const image = await prepareImage(file);

        if (state.draft !== draft) return;

        draft.banner = image;

        state.dirty = true;

        $("#banner-preview").innerHTML = `

            <img class="editor-preview"
                src="${safeImage(image)}"
                alt="">
        `;
    });

    registerUpload("block-image", async ({ file, id }) => {

        const draft = state.draft;

        if (!draft) return;

        const image = await prepareImage(file);

        if (state.draft !== draft) return;

        const block = draft.blocks.find(
            item => item.id === id
        );

        if (!block) return;

        block.source = image;

        state.dirty = true;

        refreshEditorBlocks();
    });

    registerUpload("menu-image", async ({ file, id }) => {

        const image = await prepareImage(file);

        const images = DB.settings().menuImages;

        images[id] = image;

        await DB.saveSettings({
            menuImages: images
        });

        if (state.route.page === "settings") {
            render();
        }

        toast("Menu artwork saved.");
    });


    /* 23 — GLOBAL EVENT ENGINE */

    async function runExclusive(handler, context) {

        if (state.busy) return;

        state.busy = true;

        const element = context.element;

        const canDisable =
            element instanceof HTMLButtonElement;

        if (canDisable) {
            element.disabled = true;
        }

        try {

            await handler(context);

        } catch (error) {

            report(error);

        } finally {

            state.busy = false;

            if (canDisable && element.isConnected) {
                element.disabled = false;
            }
        }
    }

    function bindEvents() {

        document.addEventListener("click", event => {

            const element =
                event.target.closest("[data-action]");

            if (!element || element.disabled) return;

            const handler = actions.get(
                element.dataset.action
            );

            if (!handler) return;

            runExclusive(handler, {
                element,
                event,
                id: element.dataset.id || ""
            });
        });

        document.addEventListener("submit", event => {

            const form = event.target;

            const handler = forms.get(
                form.dataset.form
            );

            if (!handler) return;

            event.preventDefault();

            runExclusive(handler, {
                form,
                element: event.submitter,
                event,
                values: new FormData(form)
            });
        });

        function handleInput(event) {

            const element = event.target;

            const handler = inputHandlers.get(
                element.dataset.input
            );

            if (!handler) return;

            try {

                handler({
                    element,
                    event,
                    value: element.value
                });

            } catch (error) {

                report(error);
            }
        }

        document.addEventListener(
            "input",
            handleInput
        );

        document.addEventListener(
            "change",
            handleInput
        );

        document.addEventListener("change", event => {

            const element = event.target;

            if (element.id === "backup-input") {

                const file = element.files?.[0];

                element.value = "";

                if (file) {

                    runExclusive(
                        () => importBackup(file),
                        { element, event }
                    );
                }

                return;
            }

            const handler = uploadHandlers.get(
                element.dataset.upload
            );

            const file = element.files?.[0];

            if (!handler || !file) return;

            element.value = "";

            runExclusive(handler, {
                file,
                element,
                event,
                id: element.dataset.id || ""
            });
        });

        document.addEventListener("keydown", event => {

            const modal = $("#modal-root .modal");

            if (!modal) return;

            if (
                event.key === "Escape" &&
                !state.busy
            ) {
                closeModal();
                return;
            }

            if (event.key !== "Tab") return;

            const focusable = $$(
                "button:not(:disabled), input, select, textarea, [tabindex='0']",
                modal
            ).filter(element =>
                !element.hidden &&
                element.getClientRects().length
            );

            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {

                event.preventDefault();
                last.focus();

            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {

                event.preventDefault();
                first.focus();
            }
        });

        window.addEventListener("popstate", () => {

            if (state.busy || !canLeave()) {

                history.pushState(
                    null,
                    "",
                    routeHash(state.route)
                );

                return;
            }

            state.dirty = false;
            state.draft = null;

            closeModal();

            state.route = parseRoute();

            render();
        });

        window.addEventListener("beforeunload", event => {

            if (!state.dirty && !state.busy) return;

            event.preventDefault();

            event.returnValue = "";
        });
    }


    /* 24 — INITIALIZATION */

    async function init() {

        try {

            await DB.init();

            for (const hook of startupHooks.values()) {
                await hook();
            }

            state.route = parseRoute();

            bindEvents();

            render();

        } catch (error) {

            console.error(error);

            $("#app-view").innerHTML = `

                <section class="sheet stack">

                    <div class="eyebrow">
                        Archive recovery
                    </div>

                    <h1 class="page-title">
                        Archive unavailable.
                    </h1>

                    <p class="page-description">
                        ${esc(error.message)}
                    </p>

                    <p class="muted">
                        Existing archive data has not
                        been intentionally erased.
                    </p>

                    <button id="recovery-export"
                        class="btn primary">
                        Export recovery data
                    </button>

                </section>
            `;

            $("#recovery-export").onclick = async () => {

                try {

                    const raw = await DB.rawRecovery();

                    if (!raw) {

                        toast(
                            "No recovery data found.",
                            true
                        );

                        return;
                    }

                    downloadText(
                        raw,
                        "compendium-recovery.json"
                    );

                } catch (error) {

                    report(error);
                }
            };
        }
    }


    /* 25 — PUBLIC MODULE API */

    return {

        registerPage,
        registerAction,
        registerForm,
        registerInput,
        registerUpload,
        registerBlock,
        registerMenu,
        registerStartup,

        navigate,
        render,

        openModal,
        closeModal,
        openLibrary,

        toast,
        report,

        esc,
        button,
        safeImage,
        prepareImage,
        blockInput,
        pathLabel,
        dateLabel,
        categoryOptions,

        getRoute: () => ({
            ...state.route
        }),

        init
    };

})();


/* =====================================================
   APPLICATION STARTUP

   All appended modules are registered before
   DOMContentLoaded initializes the application.
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    WorldApp.init();
});


/* =====================================================
   PERMANENT EXTENSION POINT

   APPEND ALL FUTURE APPLICATION MODULES BELOW.

   Do not add another initialization function.
   Do not replace the existing event engine.

   ===================================================== */

