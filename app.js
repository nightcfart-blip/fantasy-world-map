/* ==================================================
   AETHER — V2.1
   CONSOLIDATED APPLICATION
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether;

    if (!A?.data || !A?.archive) {
        throw new Error("Aether data.js must load first.");
    }

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];

    const escape = value =>
        String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );

    const clone = A.utils.clone;

    const actions = new Map();
    const menuActions = new Map();
    const startupHooks = new Map();
    const pages = new Map();
    const subscribers = new Set();

    const state = {
        database: null,
        page: "menu",
        articleId: null,
        categoryId: null,
        search: "",
        articleSearch: "",
        includeDescendants: false,
        draft: null,
        dirty: false,
        saveTimer: null,
        resizeFrame: null,
        initialized: false,
        importing: false
    };

    let root;
    let menuRoot;
    let pageRoot;
    let notificationRoot;
    let dialog;
    let fileInput;


    /* ==================================================
       01 — SHARED INTERFACE COMPONENTS
       ================================================== */

    const icons = {

        arrow: `
            <path d="M5 19 19 5M5 5h14v14"/>
        `,

        back: `
            <path d="m12 5-7 7 7 7M5 12h14"/>
        `,

        plus: `
            <path d="M12 5v14M5 12h14"/>
        `,

        close: `
            <path d="m6 6 12 12M18 6 6 18"/>
        `,

        search: `
            <circle cx="10.5" cy="10.5" r="6.5"/>
            <path d="m16 16 5 5"/>
        `,

        chevron: `
            <path d="m9 5 7 7-7 7"/>
        `,

        more: `
            <circle cx="5" cy="12" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
        `,

        up: `
            <path d="m6 15 6-6 6 6"/>
        `,

        down: `
            <path d="m6 9 6 6 6-6"/>
        `,

        check: `
            <path d="m5 12 4 4L19 6"/>
        `,

        edit: `
            <path d="m4 16 12-12 4 4L8 20H4z"/>
        `,

        trash: `
            <path d="M4 7h16M9 7V4h6v3
                     M6 7l1 13h10l1-13"/>
        `

    };

    function icon(name, size = 20) {

        return `
            <svg
                width="${size}"
                height="${size}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                ${icons[name] || ""}
            </svg>
        `;

    }

    function button(
        label,
        action,
        id = "",
        className = "archive-button"
    ) {

        return `
            <button
                type="button"
                class="${escape(className)}"
                data-action="${escape(action)}"
                data-id="${escape(id)}"
            >
                ${escape(label)}
            </button>
        `;

    }

    function iconButton(
        symbol,
        action,
        id,
        label,
        extraClass = ""
    ) {

        return `
            <button
                type="button"
                class="archive-icon-button ${extraClass}"
                data-action="${escape(action)}"
                data-id="${escape(id)}"
                aria-label="${escape(label)}"
                title="${escape(label)}"
            >
                ${icon(symbol, 17)}
            </button>
        `;

    }

    function emptyState(title, description) {

        return `
            <div class="archive-empty">
                <div class="archive-empty-symbol">◇</div>
                <h3>${escape(title)}</h3>
                <p>${escape(description)}</p>
            </div>
        `;

    }

    function dateLabel(value) {

        const date = new Date(value);

        if (!Number.isFinite(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    }

    function register(map, name, handler) {

        if (
            typeof name !== "string" ||
            typeof handler !== "function"
        ) {
            throw new Error("Invalid Aether registration.");
        }

        map.set(name, handler);

    }


    /* ==================================================
       02 — NOTIFICATIONS
       ================================================== */

    function notify(
        title,
        message = "",
        error = false
    ) {

        const element = document.createElement("div");

        element.className =
            "aether-notification" +
            (error ? " is-error" : "");

        element.innerHTML = `
            <div class="notification-symbol"></div>

            <div class="notification-content">
                <h3 class="notification-title">
                    ${escape(title)}
                </h3>

                <p class="notification-message">
                    ${escape(message)}
                </p>
            </div>
        `;

        notificationRoot.append(element);

        while (notificationRoot.children.length > 3) {
            notificationRoot.firstElementChild.remove();
        }

        setTimeout(() => {

            element.classList.add("is-leaving");

            setTimeout(() => {
                element.remove();
            }, 450);

        }, error ? 6500 : 3500);

    }

    function report(error) {

        console.error(error);

        notify(
            "Something went wrong.",
            error?.message || String(error),
            true
        );

    }


    /* ==================================================
       03 — DATABASE MANAGEMENT
       ================================================== */

    function emit(moduleName = null) {

        for (const listener of subscribers) {

            try {

                listener(moduleName);

            } catch (error) {

                console.error(error);

            }

        }

    }

    function loadDatabase() {

        if (A.storage.exists()) {

            state.database = A.storage.load();

        } else {

            state.database = A.storage.save(
                A.data.create()
            );

        }

    }

    function getDatabase() {

        if (!state.database) {
            throw new Error("Database is not initialized.");
        }

        return clone(state.database);

    }

    function getModule(name) {

        const module = state.database?.modules[name];

        if (module === undefined) {
            throw new Error("Unknown module: " + name);
        }

        return clone(module);

    }

    function updateDatabase(updater, moduleName = null) {

        const candidate = getDatabase();

        const result = updater(candidate);

        if (result?.then) {
            throw new Error(
                "Database mutations must be synchronous."
            );
        }

        if (result === false) {
            return false;
        }

        state.database = A.storage.save(candidate);

        emit(moduleName);

        return true;

    }

    function updateModule(name, updater) {

        return updateDatabase(database => {

            if (
                !Object.prototype.hasOwnProperty.call(
                    database.modules,
                    name
                )
            ) {
                throw new Error("Unknown module: " + name);
            }

            return updater(
                database.modules[name]
            );

        }, name);

    }

    function replaceDatabase(database) {

        const prepared = A.data.prepare(database);

        if (state.database) {
            A.storage.createRecovery(state.database);
        }

        state.database = A.storage.save(prepared);

        emit();

    }


    /* ==================================================
       04 — CONTINUOUS OCEAN ARTWORK

       Layered SVG artwork shared by all five menu
       panels. No separate image downloads required.
       ================================================== */

    function artwork() {

        return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 1100"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >

            <defs>

                <linearGradient id="sea-base"
                    x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#0b111b"/>
                    <stop offset=".45" stop-color="#214a57"/>
                    <stop offset="1" stop-color="#0d1925"/>
                </linearGradient>

                <linearGradient id="sea-deep"
                    x1="0" y1="0" x2=".8" y2="1">
                    <stop offset="0" stop-color="#7baaab"/>
                    <stop offset=".28" stop-color="#326c79"/>
                    <stop offset=".7" stop-color="#17364d"/>
                    <stop offset="1" stop-color="#101b2b"/>
                </linearGradient>

                <linearGradient id="sea-light"
                    x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#d5e4d6"/>
                    <stop offset=".3" stop-color="#8abdbd"/>
                    <stop offset=".7" stop-color="#27606c"/>
                    <stop offset="1" stop-color="#132c40"/>
                </linearGradient>

                <linearGradient id="sea-gold"
                    x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#8b603c"/>
                    <stop offset=".35" stop-color="#f0d5a6"/>
                    <stop offset=".65" stop-color="#c68d5d"/>
                    <stop offset="1" stop-color="#79543d"/>
                </linearGradient>

                <radialGradient id="sea-glow">
                    <stop offset="0"
                        stop-color="#b4d6cc"
                        stop-opacity=".28"/>
                    <stop offset="1"
                        stop-color="#27606c"
                        stop-opacity="0"/>
                </radialGradient>

                <filter id="sea-grain">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency=".65"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                    <feColorMatrix type="saturate" values="0"/>
                </filter>

                <filter id="sea-shadow"
                    x="-20%" y="-20%"
                    width="140%" height="140%">
                    <feDropShadow
                        dx="0" dy="7" stdDeviation="8"
                        flood-color="#040b12"
                        flood-opacity=".6"
                    />
                </filter>

            </defs>

            <rect width="800" height="1100"
                fill="url(#sea-base)"/>

            <ellipse class="art-mist"
                cx="560" cy="250" rx="440" ry="380"
                fill="url(#sea-glow)"/>

            <!-- Distant flowing currents -->

            <g fill="none"
                stroke="#7baaab"
                stroke-width="1"
                opacity=".18">

                <path d="M-90 170C200 10 390 360 880 70"/>
                <path d="M-90 185C200 25 390 375 880 85"/>
                <path d="M-90 200C200 40 390 390 880 100"/>
                <path d="M-90 215C200 55 390 405 880 115"/>
                <path d="M-90 230C200 70 390 420 880 130"/>

                <path d="M-80 870C250 650 470 1100 900 760"/>
                <path d="M-80 885C250 665 470 1115 900 775"/>
                <path d="M-80 900C250 680 470 1130 900 790"/>

            </g>

            <!-- Upper ornamental crest -->

            <g class="art-wave-slow"
                filter="url(#sea-shadow)">

                <path
                    d="M-80 470
                       C100 540 240 380 360 270
                       C480 160 650 90 720 180
                       C775 255 695 330 630 290
                       C580 260 602 200 646 218
                       C605 140 485 220 445 330
                       C385 495 165 650-80 540Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)"
                    stroke-width="2.5"
                />

                <path
                    d="M-70 490
                       C180 570 320 330 440 240
                       C540 155 655 130 697 190
                       C738 246 683 294 643 267
                       C618 250 627 226 649 231
                       C610 186 515 235 475 320
                       C390 500 130 620-70 525Z"
                    fill="url(#sea-light)"
                    stroke="#b8c9b4"
                    stroke-width="1.4"
                />

                <path
                    d="M30 526
                       C260 495 300 350 460 252
                       C550 197 611 182 663 209
                       C565 174 493 300 443 372
                       C330 534 174 567 30 526Z"
                    fill="#18384c"
                    stroke="url(#sea-gold)"
                    stroke-width="1.5"
                />

            </g>

            <!-- Central rolling wave -->

            <g class="art-wave"
                filter="url(#sea-shadow)">

                <path
                    d="M-100 680
                       C60 580 145 610 260 680
                       C380 755 480 635 540 520
                       C605 395 725 360 795 445
                       C855 525 790 625 724 593
                       C665 565 685 500 725 516
                       C681 454 623 535 600 615
                       C555 800 380 880 220 810
                       C85 750 10 780-100 865Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)"
                    stroke-width="3"
                />

                <path
                    d="M-80 712
                       C70 628 170 675 275 725
                       C420 795 520 650 565 535
                       C620 410 750 400 780 470
                       C810 530 770 578 731 560
                       C706 550 712 527 733 530
                       C695 485 650 535 624 623
                       C550 850 390 837 250 778
                       C110 715 30 770-80 810Z"
                    fill="url(#sea-light)"
                    stroke="#d6c69f"
                    stroke-width="1.6"
                />

                <path
                    d="M-40 745
                       C140 655 260 860 440 760
                       C600 670 580 470 740 450
                       C610 500 665 680 480 795
                       C300 900 150 730-40 790Z"
                    fill="#235568"
                    stroke="url(#sea-gold)"
                    stroke-width="1.4"
                />

                <path
                    d="M-10 769
                       C180 710 285 855 445 788
                       C595 720 617 550 682 490"
                    fill="none"
                    stroke="#d2b389"
                    stroke-width="2"
                />

            </g>

            <!-- Lower curling waves -->

            <g class="art-wave-slow"
                filter="url(#sea-shadow)">

                <path
                    d="M-60 1100
                       C10 920 130 840 230 895
                       C310 940 270 1020 210 1005
                       C160 992 170 940 205 948
                       C160 910 105 960 110 1015
                       C120 1080 250 1060 360 980
                       C480 890 620 850 860 960
                       L860 1150Z"
                    fill="url(#sea-deep)"
                    stroke="url(#sea-gold)"
                    stroke-width="3"
                />

                <path
                    d="M-30 1100
                       C30 950 130 875 215 910
                       C275 935 250 995 215 982
                       C190 974 195 955 210 958
                       C145 920 100 1000 145 1040
                       C245 1110 400 935 560 935
                       C690 930 760 985 850 1020
                       L850 1150Z"
                    fill="url(#sea-light)"
                    stroke="#b9b997"
                    stroke-width="1.8"
                />

                <path
                    d="M30 1100
                       C110 1010 170 1130 320 1050
                       C510 940 650 980 840 1080"
                    fill="none"
                    stroke="url(#sea-gold)"
                    stroke-width="3"
                />

            </g>

            <!-- Ornamental current lines -->

            <g class="art-current"
                fill="none"
                stroke="#e6bd8b"
                stroke-width="1.2"
                opacity=".55">

                <path d="M-20 410C220 490 400 110 700 150"/>
                <path d="M0 650C220 520 390 880 590 550"/>
                <path d="M0 970C180 760 350 1100 800 880"/>

            </g>

            ${Array.from({ length: 45 }, (_, i) => {

                const x = (i * 173 + 39) % 800;
                const y = (i * 251 + 77) % 1100;
                const r = .6 + (i % 5) * .35;

                return `
                    <circle
                        class="art-particle"
                        cx="${x}"
                        cy="${y}"
                        r="${r}"
                        fill="${i % 3 ? "#9cc8c8" : "#e6bd8b"}"
                        style="animation-delay:-${i % 9}s"
                    />
                `;

            }).join("")}

            <rect
                width="800"
                height="1100"
                filter="url(#sea-grain)"
                opacity=".065"
                style="mix-blend-mode:soft-light"
            />

        </svg>
        `;

    }


    /* ==================================================
       05 — MAIN MENU
       ================================================== */

    function renderMenu() {

        menuRoot.innerHTML = `

            <div class="main-menu">

                <header class="menu-header">

                    <div class="brand">

                        <p class="brand-kicker">
                            ${escape(A.config.subtitle)}
                        </p>

                        <h1 class="brand-title">
                            ${escape(A.config.name)}.
                        </h1>

                    </div>

                    <div class="header-edition">

                        <span class="edition-number">
                            ${escape(A.config.edition)}
                        </span>

                        <span class="edition-label">
                            Worldbuilding
                        </span>

                    </div>

                </header>

                <div class="menu-composition">

                    <div class="menu-artwork">
                        ${artwork()}
                    </div>

                    ${A.menu.map(item => {

                        const enabled =
                            menuActions.has(item.id);

                        return `

                            <button
                                type="button"
                                class="menu-panel
                                    ${escape(item.className)}"
                                data-action="menu-select"
                                data-id="${escape(item.id)}"
                                aria-disabled="${!enabled}"
                            >

                                <div class="panel-top">

                                    <span class="panel-index">
                                        ${escape(item.index)}
                                    </span>

                                    <span class="panel-category">
                                        ${escape(item.category)}
                                    </span>

                                </div>

                                ${item.id === "archive" ? `
                                    <div class="hero-seal">
                                        <svg viewBox="0 0 80 80"
                                            fill="none"
                                            stroke="currentColor">

                                            <circle cx="40" cy="40"
                                                r="34"/>

                                            <circle cx="40" cy="40"
                                                r="28"
                                                opacity=".5"/>

                                            <path d="M40 12 68 40
                                                     40 68 12 40Z"/>

                                            <path d="M40 23 57 40
                                                     40 57 23 40Z"/>

                                            <circle cx="40" cy="40"
                                                r="6"/>

                                        </svg>
                                    </div>
                                ` : ""}

                                <div class="panel-bottom">

                                    <h2 class="panel-title">

                                        ${escape(item.title)}

                                        ${item.italicTitle ? `
                                            <em>
                                                ${escape(
                                                    item.italicTitle
                                                )}
                                            </em>
                                        ` : ""}

                                    </h2>

                                    <p class="panel-description">
                                        ${escape(item.description)}
                                    </p>

                                </div>

                                <span class="panel-arrow">
                                    ${icon(
                                        "arrow",
                                        item.id === "archive"
                                            ? 25
                                            : 15
                                    )}
                                </span>

                            </button>

                        `;

                    }).join("")}

                </div>

                <footer class="menu-footer">

                    <span class="footer-phrase">
                        ${escape(A.config.footer)}
                    </span>

                    <span class="footer-ornament">
                        <span class="footer-diamond"></span>
                    </span>

                    <span class="footer-version">
                        V${escape(A.config.version)}
                    </span>

                </footer>

            </div>

        `;

    }

    function showMenu() {

        flushDraft();

        closeDialog();

        state.page = "menu";
        state.articleId = null;
        state.draft = null;

        pageRoot.hidden = true;
        pageRoot.innerHTML = "";

        menuRoot.hidden = false;

    }

    function showPage(name) {

        const renderer = pages.get(name);

        if (!renderer) {
            throw new Error("Unknown page: " + name);
        }

        state.page = name;

        menuRoot.hidden = true;
        pageRoot.hidden = false;

        renderer();

    }


    /* ==================================================
       06 — IMPORT & EXPORT
       ================================================== */

    function exportWorld() {

        flushDraft();

        const database = getDatabase();

        const json = A.data.serialize(database);

        const blob = new Blob(
            [json],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download =
            A.data.backupFilename(database);

        document.body.append(link);

        link.click();

        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 30000);

        notify(
            "Preserved.",
            "Your world backup is ready."
        );

    }

    function importWorld() {

        if (state.importing) {
            return;
        }

        flushDraft();

        fileInput.value = "";
        fileInput.click();

    }

    async function handleImport(file) {

        if (!file || state.importing) {
            return;
        }

        state.importing = true;

        try {

            const text = await file.text();

            const database = A.data.deserialize(text);

            flushDraft();

            replaceDatabase(database);

            state.search = "";
            state.articleSearch = "";
            state.categoryId = null;
            state.articleId = null;
            state.draft = null;
            state.dirty = false;

            showMenu();

            notify(
                "Restored.",
                database.metadata.name +
                    " has been imported successfully."
            );

        } catch (error) {

            report(error);

        } finally {

            state.importing = false;
            fileInput.value = "";

        }

    }


    /* ==================================================
       07 — SHARED DIALOG ENGINE
       ================================================== */

    function openDialog({
        title,
        kicker = "",
        body = "",
        footer = "",
        tools = ""
    }) {

        dialog.innerHTML = `

            <div class="archive-dialog-inner">

                <header class="archive-dialog-header">

                    <div class="archive-dialog-title-row">

                        <span class="archive-eyebrow">
                            ${escape(kicker)}
                        </span>

                        ${iconButton(
                            "close",
                            "dialog-close",
                            "",
                            "Close"
                        )}

                    </div>

                    <h2>${escape(title)}</h2>

                    ${tools}

                </header>

                <div class="archive-dialog-body">
                    ${body}
                </div>

                ${footer ? `
                    <footer class="archive-dialog-footer">
                        ${footer}
                    </footer>
                ` : ""}

            </div>

        `;

        if (!dialog.open) {
            dialog.showModal();
        }

    }

    function closeDialog() {

        if (dialog?.open) {
            dialog.close();
        }

    }

    function formDialog({
        title,
        kicker,
        form,
        body,
        submit = "Save"
    }) {

        openDialog({

            title,
            kicker,

            body: `
                <form
                    id="archive-active-form"
                    data-form="${escape(form)}"
                >
                    ${body}
                </form>
            `,

            footer: `

                ${button(
                    "Cancel",
                    "dialog-close"
                )}

                <button
                    type="submit"
                    form="archive-active-form"
                    class="archive-button is-primary"
                >
                    ${escape(submit)}
                </button>

            `

        });

    }

    function field(
        label,
        name,
        value = "",
        placeholder = ""
    ) {

        return `

            <label class="archive-field-label"
                for="field-${escape(name)}">

                ${escape(label)}

            </label>

            <input
                id="field-${escape(name)}"
                class="archive-field"
                name="${escape(name)}"
                value="${escape(value)}"
                placeholder="${escape(placeholder)}"
                maxlength="250"
                autocomplete="off"
                required
            >

        `;

    }

    function confirmDialog(
        title,
        message,
        action,
        id
    ) {

        openDialog({

            title,
            kicker: "Confirmation",

            body: `
                <p style="line-height:1.8">
                    ${escape(message)}
                </p>
            `,

            footer: `

                ${button("Cancel", "dialog-close")}

                ${button(
                    "Delete",
                    action,
                    id,
                    "archive-button is-danger"
                )}

            `

        });

    }


    /* ==================================================
       08 — ARCHIVE PAGE
       ================================================== */

    function archiveOrnament() {

        return `

            <svg
                class="archive-ornament"
                viewBox="0 0 300 160"
                fill="none"
                aria-hidden="true"
            >

                <path
                    d="M-10 135
                       C80 150 120 10 205 35
                       C260 50 240 105 205 90
                       C175 75 200 55 212 65
                       C175 25 140 105 110 125
                       C70 155 20 150-10 135Z"
                    fill="#27606c"
                    stroke="#c68d5d"
                    stroke-width="1.5"
                />

                <path
                    d="M10 140
                       C95 125 125 35 200 48
                       C230 55 230 85 210 80
                       C180 65 165 110 130 130
                       C80 160 40 155 10 140Z"
                    fill="#7baaab"
                    stroke="#e6bd8b"
                />

                <path
                    d="M70 145
                       C150 120 150 50 215 55"
                    stroke="#e6bd8b"
                />

            </svg>

        `;

    }

    function renderArchive() {

        pageRoot.innerHTML = `

            <section class="archive-page">

                <div class="archive-container">

                    <div class="archive-topbar">

                        ${button(
                            "← Aether",
                            "home",
                            "",
                            "archive-back"
                        )}

                        <span class="archive-eyebrow">
                            01 / The Compendium
                        </span>

                    </div>

                    <header class="archive-heading">

                        ${archiveOrnament()}

                        <h1>The Archive.</h1>

                        <p>A record of your world</p>

                    </header>

                    <div class="archive-toolbar">

                        <label class="archive-search">

                            ${icon("search")}

                            <input
                                type="search"
                                id="archive-search"
                                placeholder="Find a category..."
                                value="${escape(state.search)}"
                                autocomplete="off"
                                aria-label="Find a category"
                            >

                        </label>

                        <button
                            type="button"
                            class="archive-add-main"
                            data-action="category-create"
                            aria-label="Create category"
                        >
                            ${icon("plus", 24)}
                        </button>

                    </div>

                    <div
                        id="archive-category-list"
                        class="archive-list"
                    ></div>

                    <footer class="archive-footer">
                        THE FRAGMENTS OF AN UNWRITTEN WORLD
                    </footer>

                </div>

            </section>

        `;

        renderCategoryList();

    }


    /* ==================================================
       09 — INDEXED CATEGORY RENDERING
       ================================================== */

    function renderCategoryList() {

        const target = $("#archive-category-list");

        if (!target) {
            return;
        }

        /*
           Read the archive once per rendering pass.
           Avoid repeatedly cloning the whole module.
        */

        const archive = A.archive.read();

        const children = new Map();
        const categoryMap = new Map();
        const counts = new Map();

        const expanded = new Set(
            archive.preferences.expanded
        );

        for (const category of archive.categories) {

            categoryMap.set(category.id, category);

            if (!children.has(category.parentId)) {
                children.set(category.parentId, []);
            }

            children.get(category.parentId).push(
                category
            );

        }

        for (const article of archive.articles) {

            counts.set(
                article.categoryId,
                (counts.get(article.categoryId) || 0) + 1
            );

        }

        const query =
            state.search.trim().toLocaleLowerCase();

        let visible = null;

        if (query) {

            visible = new Set();

            for (const category of archive.categories) {

                if (
                    !category.name
                        .toLocaleLowerCase()
                        .includes(query)
                ) {
                    continue;
                }

                let current = category;

                while (current) {

                    visible.add(current.id);

                    current = categoryMap.get(
                        current.parentId
                    );

                }

                const queue = [category.id];

                for (
                    let i = 0;
                    i < queue.length;
                    i++
                ) {

                    for (
                        const child of
                        children.get(queue[i]) || []
                    ) {

                        visible.add(child.id);
                        queue.push(child.id);

                    }

                }

            }

        }

        function renderNode(
            category,
            depth = 0,
            number = 0
        ) {

            if (
                visible &&
                !visible.has(category.id)
            ) {
                return "";
            }

            const nested =
                children.get(category.id) || [];

            const hasChildren = nested.length > 0;

            const isOpen =
                Boolean(query) ||
                expanded.has(category.id);

            return `

                <div class="archive-category
                    ${depth === 0 ? "is-root" : ""}">

                    <div class="archive-category-row">

                        ${depth === 0 ? `

                            <span
                                class="archive-category-number"
                            >
                                ${String(number).padStart(2, "0")}
                            </span>

                        ` : ""}

                        <button
                            type="button"
                            class="archive-category-name"
                            data-action="category-open"
                            data-id="${escape(category.id)}"
                        >
                            ${escape(category.name)}
                        </button>

                        ${counts.get(category.id) ? `

                            <span class="archive-category-count">
                                ${counts.get(category.id)}
                            </span>

                        ` : ""}

                        <div class="archive-category-actions">

                            ${iconButton(
                                "plus",
                                "category-create",
                                category.id,
                                "Add subcategory"
                            )}

                            ${iconButton(
                                "more",
                                "category-options",
                                category.id,
                                "Category options"
                            )}

                            ${hasChildren ? iconButton(
                                "chevron",
                                "category-toggle",
                                category.id,
                                isOpen ? "Collapse" : "Expand",
                                "archive-chevron" +
                                    (isOpen ? " is-open" : "")
                            ) : iconButton(
                                "arrow",
                                "category-open",
                                category.id,
                                "Open articles"
                            )}

                        </div>

                    </div>

                    ${hasChildren && isOpen ? `

                        <div class="archive-children">

                            ${nested.map(child =>
                                renderNode(
                                    child,
                                    depth + 1
                                )
                            ).join("")}

                        </div>

                    ` : ""}

                </div>

            `;

        }

        const roots = children.get(null) || [];

        const content = roots.map(
            (category, index) =>
                renderNode(category, 0, index + 1)
        ).join("");

        target.innerHTML = content || emptyState(

            query
                ? "No categories found."
                : "An unwritten world.",

            query
                ? "Try another category name."
                : "Create your first category to begin."

        );

    }


    /* ==================================================
       10 — CATEGORY MANAGEMENT
       ================================================== */

    function createCategoryDialog(parentId = null) {

        const parent = parentId
            ? A.archive.getCategory(parentId)
            : null;

        formDialog({

            title: parent
                ? "New subcategory."
                : "New category.",

            kicker: parent
                ? parent.name
                : "The Archive",

            form: "category-create",

            body: `

                <input
                    type="hidden"
                    name="parentId"
                    value="${escape(parentId || "")}"
                >

                ${field(
                    "Category name",
                    "name",
                    "",
                    "e.g. Occupations"
                )}

            `,

            submit: "Create"

        });

    }

    function categoryOptions(id) {

        const category = A.archive.getCategory(id);

        if (!category) {
            return;
        }

        openDialog({

            title: category.name,
            kicker: "Category management",

            body: `

                <div class="archive-action-list">

                    ${button(
                        "Rename category",
                        "category-rename",
                        id
                    )}

                    ${button(
                        "Add subcategory",
                        "category-create",
                        id
                    )}

                    ${button(
                        "Move to another category",
                        "category-move",
                        id
                    )}

                    ${button(
                        "Move up",
                        "category-up",
                        id
                    )}

                    ${button(
                        "Move down",
                        "category-down",
                        id
                    )}

                    ${button(
                        "Delete category",
                        "category-delete-confirm",
                        id,
                        "archive-button is-danger"
                    )}

                </div>

            `

        });

    }

    function renameCategoryDialog(id) {

        const category = A.archive.getCategory(id);

        if (!category) {
            return;
        }

        formDialog({

            title: "Rename category.",
            kicker: "Category management",
            form: "category-rename",

            body: `

                <input type="hidden"
                    name="id"
                    value="${escape(id)}">

                ${field(
                    "Category name",
                    "name",
                    category.name
                )}

            `

        });

    }

    function categorySelect(
        selected = null,
        excluded = new Set(),
        includeRoot = false
    ) {

        const archive = A.archive.read();

        const map = new Map(
            archive.categories.map(
                category => [category.id, category]
            )
        );

        function path(category) {

            const names = [];

            let current = category;

            while (current) {

                names.push(current.name);

                current = map.get(
                    current.parentId
                );

            }

            return names.reverse().join(" / ");

        }

        return `

            <select
                class="archive-field"
                name="categoryId"
                aria-label="Category"
            >

                ${includeRoot ? `
                    <option value=""
                        ${selected === null ? "selected" : ""}>
                        Main category
                    </option>
                ` : ""}

                ${archive.categories
                    .filter(category =>
                        !excluded.has(category.id)
                    )
                    .map(category => `

                        <option
                            value="${escape(category.id)}"
                            ${category.id === selected
                                ? "selected"
                                : ""}
                        >
                            ${escape(path(category))}
                        </option>

                    `).join("")}

            </select>

        `;

    }

    function moveCategoryDialog(id) {

        const category = A.archive.getCategory(id);

        if (!category) {
            return;
        }

        const excluded =
            A.archive.getDescendants(id);

        formDialog({

            title: "Move category.",
            kicker: category.name,
            form: "category-move",

            body: `

                <input
                    type="hidden"
                    name="id"
                    value="${escape(id)}"
                >

                <label class="archive-field-label">
                    New parent category
                </label>

                ${categorySelect(
                    category.parentId,
                    excluded,
                    true
                )}

            `,

            submit: "Move"

        });

    }


    /* ==================================================
       11 — ARTICLE COLLECTION POPUP
       ================================================== */

    function openCollection(
        id,
        preserveSearch = false
    ) {

        const category = A.archive.getCategory(id);

        if (!category) {
            return;
        }

        state.categoryId = id;

        if (!preserveSearch) {
            state.articleSearch = "";
            state.includeDescendants = false;
        }

        const archive = A.archive.read();

        const path = A.archive.getPath(id)
            .map(entry => entry.name)
            .join(" / ");

        openDialog({

            title: category.name,
            kicker: path,

            tools: `

                <div class="archive-collection-tools">

                    <label class="archive-search">

                        ${icon("search", 16)}

                        <input
                            id="collection-search"
                            type="search"
                            placeholder="Find an article..."
                            value="${escape(state.articleSearch)}"
                            aria-label="Search articles"
                        >

                    </label>

                    <select
                        id="collection-sort"
                        class="archive-select"
                        aria-label="Sort articles"
                    >

                        ${[
                            ["alphabetical", "Alphabetical"],
                            ["created", "Last added"],
                            ["edited", "Last edited"]
                        ].map(([value, label]) => `

                            <option
                                value="${value}"
                                ${archive.preferences.sort === value
                                    ? "selected"
                                    : ""}
                            >
                                ${label}
                            </option>

                        `).join("")}

                    </select>

                    <label style="
                        color:var(--aqua);
                        font-size:12px;
                        display:flex;
                        align-items:center;
                        gap:6px;
                    ">

                        <input
                            type="checkbox"
                            id="collection-descendants"
                            ${state.includeDescendants
                                ? "checked"
                                : ""}
                        >

                        Include subcategories

                    </label>

                </div>

            `,

            body: `
                <div id="collection-articles"></div>
            `,

            footer: `

                ${button(
                    "Close",
                    "dialog-close"
                )}

                ${button(
                    "+ New article",
                    "article-create",
                    id,
                    "archive-button is-primary"
                )}

            `

        });

        renderCollectionArticles();

    }

    function renderCollectionArticles() {

        const target = $("#collection-articles");

        if (!target) {
            return;
        }

        const sort =
            $("#collection-sort")?.value ||
            "alphabetical";

        const query = state.articleSearch
            .trim()
            .toLocaleLowerCase();

        const articles = A.archive.getArticles(
            state.categoryId,
            sort,
            state.includeDescendants
        ).filter(article => {

            if (!query) {
                return true;
            }

            return (
                article.name +
                " " +
                article.subtitle
            ).toLocaleLowerCase().includes(query);

        });

        target.innerHTML = articles.length

            ? articles.map(article => `

                <button
                    type="button"
                    class="archive-article-row"
                    data-action="article-open"
                    data-id="${escape(article.id)}"
                >

                    <span class="archive-article-row-content">

                        <strong>
                            ${escape(article.name)}
                        </strong>

                        ${article.subtitle ? `
                            <small>
                                ${escape(article.subtitle)}
                            </small>
                        ` : ""}

                        <small>
                            Edited ${escape(
                                dateLabel(article.updatedAt)
                            )}
                        </small>

                    </span>

                    ${icon("arrow", 17)}

                </button>

            `).join("")

            : emptyState(
                query
                    ? "No matching articles."
                    : "Nothing written yet.",

                query
                    ? "Try a different search."
                    : "Create an article to begin this collection."
            );

    }

    function createArticleDialog(categoryId) {

        formDialog({

            title: "New article.",
            kicker: "The Archive",
            form: "article-create",

            body: `

                <input
                    type="hidden"
                    name="categoryId"
                    value="${escape(categoryId)}"
                >

                ${field(
                    "Article name",
                    "name",
                    "",
                    "Untitled article"
                )}

            `,

            submit: "Create"

        });

    }


    /* ==================================================
       12 — ARTICLE PROFILE
       ================================================== */

    function openArticle(id) {

        flushDraft();

        const article = A.archive.getArticle(id);

        if (!article) {
            throw new Error("Article not found.");
        }

        closeDialog();

        state.articleId = id;
        state.categoryId = article.categoryId;

        state.draft = clone(article);
        state.dirty = false;

        showPage("article");

    }

    function renderArticle() {

        const article = state.draft;

        if (!article) {
            showPage("archive");
            return;
        }

        const path = A.archive.getPath(
            article.categoryId
        );

        pageRoot.innerHTML = `

            <section class="archive-page">

                <div class="archive-container archive-profile">

                    <div class="archive-topbar">

                        ${button(
                            "← Archive",
                            "article-back",
                            "",
                            "archive-back"
                        )}

                        <span class="archive-eyebrow">
                            Article / Profile
                        </span>

                        ${iconButton(
                            "more",
                            "article-options",
                            article.id,
                            "Article options"
                        )}

                    </div>

                    <div class="archive-profile-breadcrumb">

                        ${path.map(category => `

                            <button
                                type="button"
                                class="archive-back"
                                data-action="profile-category"
                                data-id="${escape(category.id)}"
                            >
                                ${escape(category.name)}
                            </button>

                        `).join("<span>/</span>")}

                    </div>

                    <textarea
                        class="archive-profile-title"
                        data-profile-field="name"
                        rows="1"
                        maxlength="250"
                        placeholder="Article name"
                        aria-label="Article name"
                    >${escape(article.name)}</textarea>

                    <input
                        class="archive-profile-subtitle"
                        data-profile-field="subtitle"
                        value="${escape(article.subtitle)}"
                        placeholder="Subtitle or epithet..."
                        aria-label="Article subtitle"
                    >

                    <div class="archive-profile-meta">

                        <span>
                            Created ${escape(
                                dateLabel(article.createdAt)
                            )}
                        </span>

                        <span id="article-save-status">
                            All changes saved
                        </span>

                    </div>

                    <div
                        id="article-blocks"
                        class="archive-profile-blocks"
                    ></div>

                    <button
                        type="button"
                        class="archive-add-block"
                        data-action="block-menu"
                    >

                        ${icon("plus", 17)}

                        Add content

                    </button>

                </div>

            </section>

        `;

        renderBlocks();

        scheduleResize();

    }


    /* ==================================================
       13 — ARTICLE CONTENT BLOCKS
       ================================================== */

    const blockLabels = {

        heading: "Heading",
        subheading: "Subheading",
        text: "Paragraph",
        information: "Information",
        quote: "Quote",
        divider: "Divider"

    };

    function blockTextarea(
        block,
        key,
        placeholder
    ) {

        return `

            <textarea
                rows="1"
                data-block-id="${escape(block.id)}"
                data-block-field="${escape(key)}"
                placeholder="${escape(placeholder)}"
                aria-label="${escape(placeholder)}"
            >${escape(block[key])}</textarea>

        `;

    }

    function renderBlock(block, index, total) {

        let content;

        switch (block.type) {

            case "heading":

                content = blockTextarea(
                    block,
                    "text",
                    "Heading"
                );

                break;

            case "subheading":

                content = blockTextarea(
                    block,
                    "text",
                    "Subheading"
                );

                break;

            case "information":

                content = `

                    <div class="archive-information-grid">

                        ${blockTextarea(
                            block,
                            "label",
                            "Label"
                        )}

                        ${blockTextarea(
                            block,
                            "text",
                            "Information"
                        )}

                    </div>

                `;

                break;

            case "quote":

                content = blockTextarea(
                    block,
                    "text",
                    "Write a quotation..."
                );

                break;

            case "divider":

                content = `
                    <div class="archive-block-divider"></div>
                `;

                break;

            default:

                content = blockTextarea(
                    block,
                    "text",
                    "Begin writing..."
                );

        }

        return `

            <section
                class="archive-block is-${escape(block.type)}"
                data-block-container="${escape(block.id)}"
            >

                <div class="archive-block-toolbar">

                    ${index > 0 ? iconButton(
                        "up",
                        "block-up",
                        block.id,
                        "Move block up"
                    ) : ""}

                    ${index < total - 1 ? iconButton(
                        "down",
                        "block-down",
                        block.id,
                        "Move block down"
                    ) : ""}

                    ${iconButton(
                        "close",
                        "block-delete",
                        block.id,
                        "Remove block"
                    )}

                </div>

                ${content}

            </section>

        `;

    }

    function renderBlocks() {

        const target = $("#article-blocks");

        if (!target || !state.draft) {
            return;
        }

        const blocks = state.draft.blocks;

        target.innerHTML = blocks.map(
            (block, index) =>
                renderBlock(
                    block,
                    index,
                    blocks.length
                )
        ).join("");

        scheduleResize();

    }

    function blockMenu() {

        openDialog({

            title: "Compose.",
            kicker: "Add article content",

            body: `

                <div class="archive-action-list">

                    ${A.archive.blockTypes.map(type =>

                        button(
                            blockLabels[type] || type,
                            "block-add",
                            type
                        )

                    ).join("")}

                </div>

            `

        });

    }

    function addBlock(type) {

        if (
            !state.draft ||
            !A.archive.blockTypes.includes(type)
        ) {
            return;
        }

        const block = {
            id: A.utils.id(),
            type,
            label: "",
            text: ""
        };

        state.draft.blocks.push(block);

        closeDialog();

        markDirty();

        renderBlocks();

        const container = $$(
            "[data-block-container]"
        ).find(element =>
            element.dataset.blockContainer === block.id
        );

        if (container) {

            container.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });

            container.querySelector("textarea")
                ?.focus({ preventScroll: true });

        }

    }

    function moveBlock(id, direction) {

        if (!state.draft) {
            return;
        }

        const blocks = state.draft.blocks;

        const index = blocks.findIndex(
            block => block.id === id
        );

        const target = index + direction;

        if (
            index < 0 ||
            target < 0 ||
            target >= blocks.length
        ) {
            return;
        }

        [blocks[index], blocks[target]] = [
            blocks[target],
            blocks[index]
        ];

        markDirty();

        renderBlocks();

    }

    function deleteBlock(id) {

        if (!state.draft) {
            return;
        }

        state.draft.blocks =
            state.draft.blocks.filter(
                block => block.id !== id
            );

        markDirty();

        renderBlocks();

    }


    /* ==================================================
       14 — ARTICLE MANAGEMENT
       ================================================== */

    function articleOptions() {

        if (!state.draft) {
            return;
        }

        openDialog({

            title: state.draft.name,
            kicker: "Article management",

            body: `

                <div class="archive-action-list">

                    ${button(
                        "Save changes",
                        "article-save"
                    )}

                    ${button(
                        "Move to another category",
                        "article-move"
                    )}

                    ${button(
                        "Delete article",
                        "article-delete-confirm",
                        state.articleId,
                        "archive-button is-danger"
                    )}

                </div>

            `

        });

    }

    function moveArticleDialog() {

        flushDraft();

        if (!state.draft) {
            return;
        }

        formDialog({

            title: "Move article.",
            kicker: state.draft.name,
            form: "article-move",

            body: `

                <label class="archive-field-label">
                    Destination category
                </label>

                ${categorySelect(
                    state.draft.categoryId
                )}

            `,

            submit: "Move"

        });

    }

    function returnToArchive(categoryId = null) {

        flushDraft();

        const id =
            categoryId ||
            state.draft?.categoryId ||
            state.categoryId;

        state.draft = null;
        state.articleId = null;

        showPage("archive");

        if (id && A.archive.getCategory(id)) {
            openCollection(id);
        }

    }


    /* ==================================================
       15 — DEBOUNCED AUTOSAVING
       ================================================== */

    function saveStatus(message) {

        const target = $("#article-save-status");

        if (target) {
            target.textContent = message;
        }

    }

    function markDirty() {

        if (!state.draft) {
            return;
        }

        state.dirty = true;

        saveStatus("Unsaved changes");

        clearTimeout(state.saveTimer);

        state.saveTimer = setTimeout(() => {

            try {

                flushDraft();

            } catch (error) {

                saveStatus("Not saved");

                report(error);

            }

        }, 650);

    }

    function flushDraft() {

        clearTimeout(state.saveTimer);

        state.saveTimer = null;

        if (!state.draft || !state.dirty) {
            return true;
        }

        const draft = clone(state.draft);

        draft.name = draft.name.trim();

        if (!draft.name) {

            saveStatus("Article name required");

            throw new Error(
                "The article must have a name before saving."
            );

        }

        draft.updatedAt = A.utils.now();

        /*
           All changed fields and blocks are saved in
           one transaction, rather than saving each
           keystroke independently.
        */

        updateModule("archive", archive => {

            const index = archive.articles.findIndex(
                article => article.id === draft.id
            );

            if (index < 0) {
                throw new Error("Article no longer exists.");
            }

            archive.articles[index] = draft;

        });

        state.draft.updatedAt = draft.updatedAt;
        state.dirty = false;

        saveStatus("All changes saved");

        return true;

    }


    /* ==================================================
       16 — AUTOMATIC TEXTAREA RESIZING
       ================================================== */

    const resizeQueue = new Set();

    function resizeTextarea(element) {

        if (!element?.isConnected) {
            return;
        }

        resizeQueue.add(element);

        if (state.resizeFrame !== null) {
            return;
        }

        state.resizeFrame = requestAnimationFrame(() => {

            state.resizeFrame = null;

            const elements = [...resizeQueue].filter(
                entry => entry.isConnected
            );

            resizeQueue.clear();

            /*
               Batch layout writes and reads to avoid
               unnecessary repeated browser reflows.
            */

            for (const entry of elements) {
                entry.style.height = "auto";
            }

            const heights = elements.map(
                entry => entry.scrollHeight
            );

            elements.forEach((entry, index) => {

                entry.style.height =
                    heights[index] + "px";

            });

        });

    }

    function scheduleResize() {

        for (const element of $$(
            ".archive-profile textarea",
            pageRoot
        )) {

            resizeTextarea(element);

        }

    }


    /* ==================================================
       17 — ACTION REGISTRATION
       ================================================== */

    const on = (name, handler) =>
        register(actions, name, handler);

    on("menu-select", ({ id }) => {

        const handler = menuActions.get(id);

        if (handler) {
            return handler();
        }

    });

    on("home", showMenu);

    on("dialog-close", closeDialog);


    /* Category actions */

    on("category-open", ({ id }) => {
        openCollection(id);
    });

    on("category-create", ({ id }) => {
        createCategoryDialog(id || null);
    });

    on("category-options", ({ id }) => {
        categoryOptions(id);
    });

    on("category-rename", ({ id }) => {
        renameCategoryDialog(id);
    });

    on("category-move", ({ id }) => {
        moveCategoryDialog(id);
    });

    on("category-toggle", ({ id }) => {

        A.archive.toggleExpanded(id);

        renderCategoryList();

    });

    on("category-up", ({ id }) => {

        A.archive.reorderCategory(id, -1);

        closeDialog();

        renderCategoryList();

    });

    on("category-down", ({ id }) => {

        A.archive.reorderCategory(id, 1);

        closeDialog();

        renderCategoryList();

    });

    on("category-delete-confirm", ({ id }) => {

        const category = A.archive.getCategory(id);

        if (!category) {
            return;
        }

        confirmDialog(

            "Delete category?",

            category.name +
            " and all of its subcategories and articles " +
            "will be permanently deleted.",

            "category-delete",
            id

        );

    });

    on("category-delete", ({ id }) => {

        A.archive.deleteCategory(id);

        closeDialog();

        renderCategoryList();

        notify(
            "Category removed.",
            "The Archive has been updated."
        );

    });


    /* Article actions */

    on("article-create", ({ id }) => {
        createArticleDialog(id);
    });

    on("article-open", ({ id }) => {
        openArticle(id);
    });

    on("article-back", () => {
        returnToArchive();
    });

    on("profile-category", ({ id }) => {
        returnToArchive(id);
    });

    on("article-options", articleOptions);

    on("article-move", moveArticleDialog);

    on("article-save", () => {

        flushDraft();

        closeDialog();

        notify(
            "Preserved.",
            "All article changes have been saved."
        );

    });

    on("article-delete-confirm", ({ id }) => {

        confirmDialog(

            "Delete article?",

            "This article and its content will be " +
            "permanently removed from the Archive.",

            "article-delete",
            id

        );

    });

    on("article-delete", ({ id }) => {

        const categoryId = state.draft?.categoryId;

        A.archive.deleteArticle(id);

        clearTimeout(state.saveTimer);

        state.draft = null;
        state.dirty = false;
        state.articleId = null;

        closeDialog();

        returnToArchive(categoryId);

        notify(
            "Article removed.",
            "The Archive has been updated."
        );

    });


    /* Content actions */

    on("block-menu", blockMenu);

    on("block-add", ({ id }) => {
        addBlock(id);
    });

    on("block-up", ({ id }) => {
        moveBlock(id, -1);
    });

    on("block-down", ({ id }) => {
        moveBlock(id, 1);
    });

    on("block-delete", ({ id }) => {
        deleteBlock(id);
    });


    /* ==================================================
       18 — FORM HANDLERS
       ================================================== */

    const forms = new Map();

    forms.set("category-create", values => {

        A.archive.createCategory(
            values.get("name"),
            values.get("parentId") || null
        );

        closeDialog();

        renderCategoryList();

    });

    forms.set("category-rename", values => {

        A.archive.renameCategory(
            values.get("id"),
            values.get("name")
        );

        closeDialog();

        renderCategoryList();

    });

    forms.set("category-move", values => {

        A.archive.moveCategory(
            values.get("id"),
            values.get("categoryId") || null
        );

        closeDialog();

        renderCategoryList();

    });

    forms.set("article-create", values => {

        const id = A.archive.createArticle(
            values.get("categoryId"),
            values.get("name")
        );

        openArticle(id);

    });

    forms.set("article-move", values => {

        const categoryId = values.get("categoryId");

        flushDraft();

        A.archive.updateArticle(
            state.articleId,
            { categoryId }
        );

        state.draft = A.archive.getArticle(
            state.articleId
        );

        state.categoryId = categoryId;

        closeDialog();

        renderArticle();

    });


    /* ==================================================
       19 — DELEGATED EVENT HANDLING
       ================================================== */

    let categorySearchFrame = null;
    let articleSearchFrame = null;

    function handleClick(event) {

        const element = event.target.closest(
            "[data-action]"
        );

        if (!element || element.disabled) {
            return;
        }

        if (
            element.getAttribute("aria-disabled") === "true"
        ) {
            return;
        }

        const handler = actions.get(
            element.dataset.action
        );

        if (!handler) {
            return;
        }

        try {

            const result = handler({

                id: element.dataset.id || "",
                element,
                event

            });

            if (result?.then) {
                result.catch(report);
            }

        } catch (error) {

            report(error);

        }

    }

    function handleSubmit(event) {

        const form = event.target;

        const handler = forms.get(
            form.dataset.form
        );

        if (!handler) {
            return;
        }

        event.preventDefault();

        try {

            const result = handler(
                new FormData(form),
                form
            );

            if (result?.then) {
                result.catch(report);
            }

        } catch (error) {

            report(error);

        }

    }

    function handleInput(event) {

        const element = event.target;

        if (element.id === "archive-search") {

            state.search = element.value;

            if (categorySearchFrame === null) {

                categorySearchFrame =
                    requestAnimationFrame(() => {

                        categorySearchFrame = null;

                        renderCategoryList();

                    });

            }

            return;

        }

        if (element.id === "collection-search") {

            state.articleSearch = element.value;

            if (articleSearchFrame === null) {

                articleSearchFrame =
                    requestAnimationFrame(() => {

                        articleSearchFrame = null;

                        renderCollectionArticles();

                    });

            }

            return;

        }

        if (!state.draft) {
            return;
        }

        const profileField =
            element.dataset.profileField;

        if (
            profileField === "name" ||
            profileField === "subtitle"
        ) {

            state.draft[profileField] = element.value;

            markDirty();

        }

        const blockId = element.dataset.blockId;
        const blockField = element.dataset.blockField;

        if (
            blockId &&
            ["label", "text"].includes(blockField)
        ) {

            const block = state.draft.blocks.find(
                entry => entry.id === blockId
            );

            if (block) {

                block[blockField] = element.value;

                markDirty();

            }

        }

        if (element.tagName === "TEXTAREA") {
            resizeTextarea(element);
        }

    }

    function handleChange(event) {

        const element = event.target;

        try {

            switch (element.id) {

                case "collection-sort":

                    A.archive.setSort(element.value);

                    renderCollectionArticles();

                    break;

                case "collection-descendants":

                    state.includeDescendants =
                        element.checked;

                    renderCollectionArticles();

                    break;

            }

        } catch (error) {

            report(error);

        }

    }

    function handleVisibility() {

        if (document.visibilityState === "hidden") {

            try {

                flushDraft();

            } catch (error) {

                console.error(error);

            }

        }

    }

    function bindEvents() {

        document.addEventListener(
            "click",
            handleClick
        );

        document.addEventListener(
            "submit",
            handleSubmit
        );

        document.addEventListener(
            "input",
            handleInput
        );

        document.addEventListener(
            "change",
            handleChange
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        );

        fileInput.addEventListener(
            "change",
            () => handleImport(fileInput.files[0])
        );

        dialog.addEventListener("click", event => {

            if (event.target !== dialog) {
                return;
            }

            const rect = dialog.getBoundingClientRect();

            const outside =
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom;

            if (outside) {
                closeDialog();
            }

        });

        window.addEventListener("resize", () => {

            if (state.page === "article") {
                scheduleResize();
            }

        });

        window.addEventListener("pagehide", () => {

            try {

                flushDraft();

            } catch (error) {

                console.error(error);

            }

        });

        window.addEventListener(
            "beforeunload",
            event => {

                if (!state.dirty) {
                    return;
                }

                try {

                    flushDraft();

                } catch {

                    event.preventDefault();
                    event.returnValue = "";

                }

            }
        );

    }


    /* ==================================================
       20 — APPLICATION FOUNDATION
       ================================================== */

    function createInterface() {

        root = $("#app");

        if (!root) {
            throw new Error("Missing application root.");
        }

        /*
           The menu owns the complete viewport.

           The Archive is an independent page layer.
           Existing HTML containers are consolidated
           here without requiring another HTML edit.
        */

        root.innerHTML = `

            <div
                id="aether-menu-root"
                style="height:100%;min-height:0"
            ></div>

            <div
                id="aether-page-root"
                hidden
            ></div>

        `;

        menuRoot = $("#aether-menu-root");
        pageRoot = $("#aether-page-root");

        notificationRoot =
            $("#notification-root") ||
            document.createElement("div");

        notificationRoot.id = "notification-root";

        notificationRoot.setAttribute(
            "role",
            "status"
        );

        notificationRoot.setAttribute(
            "aria-live",
            "polite"
        );

        if (!notificationRoot.isConnected) {
            document.body.append(notificationRoot);
        }

        dialog = document.createElement("dialog");

        dialog.id = "aether-dialog";
        dialog.className = "archive-dialog";

        document.body.append(dialog);

        fileInput =
            $("#backup-input") ||
            document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = ".json,application/json";
        fileInput.hidden = true;

        if (!fileInput.isConnected) {
            document.body.append(fileInput);
        }

    }


    /* ==================================================
       21 — MODULE REGISTRATION
       ================================================== */

    register(pages, "archive", renderArchive);
    register(pages, "article", renderArticle);

    register(menuActions, "archive", () => {
        showPage("archive");
    });

    register(menuActions, "export", exportWorld);
    register(menuActions, "import", importWorld);

    /*
       Collections and Settings remain reserved for
       future modules.

       Registering a menu handler automatically
       activates the corresponding menu panel.
    */


    /* ==================================================
       22 — PUBLIC APPLICATION API
       ================================================== */

    A.app = {

        getDatabase,
        getModule,

        updateDatabase,
        updateModule,
        replaceDatabase,

        save: flushDraft,

        exportWorld,
        importWorld,

        notify,
        report,

        escape,
        icon,
        button,
        iconButton,

        openDialog,
        closeDialog,

        openArchive() {

            flushDraft();

            closeDialog();

            showPage("archive");

        },

        openCollection,
        openArticle,

        showMenu,

        navigate(name) {

            flushDraft();

            closeDialog();

            if (name === "menu") {

                showMenu();

            } else {

                showPage(name);

            }

        },

        getPage() {
            return state.page;
        },

        getArticleId() {
            return state.articleId;
        },

        registerPage(name, renderer) {
            register(pages, name, renderer);
        },

        registerAction(name, handler) {
            register(actions, name, handler);
        },

        registerForm(name, handler) {
            register(forms, name, handler);
        },

        registerMenuAction(name, handler) {

            register(menuActions, name, handler);

            const item = A.menu.find(
                entry => entry.id === name
            );

            if (item) {
                item.enabled = true;
            }

            if (state.initialized) {
                renderMenu();
            }

        },

        registerStartup(name, handler) {
            register(startupHooks, name, handler);
        },

        subscribe(listener) {

            if (typeof listener !== "function") {
                throw new Error("Invalid subscriber.");
            }

            subscribers.add(listener);

            return () => {
                subscribers.delete(listener);
            };

        },

        refresh() {

            if (state.page === "menu") {

                renderMenu();

            } else if (state.page === "archive") {

                renderCategoryList();

            } else if (state.page === "article") {

                renderBlocks();

            } else {

                pages.get(state.page)?.();

            }

        }

    };


    /* ==================================================
       23 — APPLICATION STARTUP
       ================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }

        createInterface();

        try {

            loadDatabase();

            for (const handler of startupHooks.values()) {

                await handler(A.app);

            }

            for (const item of A.menu) {

                item.enabled =
                    menuActions.has(item.id);

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

                    <div class="archive-empty">

                        <div class="archive-empty-symbol">
                            ◇
                        </div>

                        <h3>
                            The world could not be opened.
                        </h3>

                        <p>
                            ${escape(error.message)}
                        </p>

                        <p style="margin-top:18px">
                            Existing saved data has not
                            been automatically reset.
                        </p>

                        <button
                            type="button"
                            id="aether-retry"
                            class="archive-button"
                            style="margin-top:20px"
                        >
                            Retry
                        </button>

                        <button
                            type="button"
                            id="aether-raw-backup"
                            class="archive-button"
                            style="margin-top:10px"
                        >
                            Preserve existing data
                        </button>

                    </div>

                </div>

            `;

            $("#aether-retry")?.addEventListener(
                "click",
                () => location.reload()
            );

            $("#aether-raw-backup")?.addEventListener(
                "click",
                () => {

                    try {

                        const raw = localStorage.getItem(
                            A.config.storageKey
                        );

                        if (raw === null) {
                            throw new Error(
                                "No existing database found."
                            );
                        }

                        const url = URL.createObjectURL(
                            new Blob(
                                [raw],
                                { type: "application/json" }
                            )
                        );

                        const link =
                            document.createElement("a");

                        link.href = url;

                        link.download =
                            "Aether-Recovery.json";

                        document.body.append(link);

                        link.click();

                        link.remove();

                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 30000);

                    } catch (backupError) {

                        report(backupError);

                    }

                }
            );

            report(error);

        }

    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        queueMicrotask(init);

    }


})();


/* ==================================================
   END — AETHER V2.1
   ==================================================

   FUTURE MODULE EXTENSION POINT

   New modules can be appended below without
   changing the existing application foundation.

   Example:

   Aether.app.registerPage(
       "collections",
       () => {
           // Render collection page.
       }
   );

   Aether.app.registerMenuAction(
       "collections",
       () => Aether.app.navigate("collections")
   );

   Aether.app.registerAction(
       "custom-action",
       ({ id, element, event }) => {
           // Handle an interaction.
       }
   );

   Aether.app.registerStartup(
       "custom-module",
       app => {
           // Initialize a module.
       }
   );

   ================================================== */
