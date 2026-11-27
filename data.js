
/* =========================================================
   AETHER — V2.2
   CONSOLIDATED DATA & STORAGE FOUNDATION
   ========================================================= */

(() => {

    "use strict";

    const A = window.Aether = window.Aether || {};

    const VERSION = 2;
    const LEGACY_KEY = "aether-worldbuilding";
    const DB_NAME = "aether-worldbuilding";
    const STORE = "worlds";
    const MAIN = "main";
    const RECOVERY = "recovery";

    const extensions = new Map();
    const migrations = new Map();
    const normalizers = new Map();
    const validators = new Map();

    const now = () => new Date().toISOString();
    const uid = () => crypto.randomUUID();
    const clone = value => structuredClone(value);

    const object = value =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

    const array = value =>
        Array.isArray(value) ? value : [];

    const string = (value, fallback = "") =>
        typeof value === "string" ? value : fallback;

    const date = value =>
        Number.isFinite(Date.parse(value)) ? value : now();

    const fail = message => {
        throw new Error(message);
    };

    /* =====================================================
       01 — APPLICATION CONFIGURATION
       ===================================================== */

    A.config = {
        name: "Aether",
        version: "2.2",
        schemaVersion: VERSION,
        storageKey: LEGACY_KEY,
        subtitle: "A world in the making",
        footer: "Every world begins somewhere",
        edition: "Vol. I"
    };

    A.palette = {
        ink: "#0f1217",
        ocean: "#27606c",
        aqua: "#7baaab",
        shell: "#c68d5d",
        gold: "#e6bd8b",
        ivory: "#eee5d6",
        midnight: "#102435",
        deepOcean: "#17434f",
        paleAqua: "#b9d7d3"
    };

    A.menu = [
        {
            id: "archive",
            index: "01",
            category: "The Compendium",
            title: "World",
            italicTitle: "Archive.",
            description: "The fragments of an unwritten universe.",
            className: "panel-hero",
            enabled: true
        },
        {
            id: "collections",
            index: "02",
            category: "Curate",
            title: "Collections",
            description: "Gather the fragments.",
            className: "panel-collections",
            enabled: true
        },
        {
            id: "export",
            index: "03",
            category: "Save",
            title: "Preserve",
            description: "Keep what was created.",
            className: "panel-export",
            enabled: true
        },
        {
            id: "import",
            index: "04",
            category: "Import",
            title: "Restore",
            description: "Return to your world.",
            className: "panel-import",
            enabled: true
        },
        {
            id: "settings",
            index: "05",
            category: "Configure",
            title: "Settings",
            description: "Make it your own.",
            className: "panel-settings",
            enabled: true
        }
    ];

    /* =====================================================
       02 — DEFAULT APPEARANCE
       ===================================================== */

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

    const BLOCK_TYPES = [
        "heading",
        "subheading",
        "text",
        "quote",
        "bullet",
        "numbered",
        "information",
        "informationGrid",
        "columns2",
        "columns3",
        "table",
        "divider",
        "collapse",
        "spacer",
        "image",
        "gallery",
        "banner",
        "frame",
        "callout",
        "reference",
        "preview",
        "related",
        "subarticles"
    ];

    const SORT_TYPES = [
        "original",
        "alphabetical",
        "reverse",
        "created",
        "edited",
        "manual"
    ];

    /* =====================================================
       03 — EMPTY DATABASE
       ===================================================== */

    function createArchive() {

        return {
            categories: [],
            articles: [],
            folders: [],
            presets: [],

            preferences: {
                expanded: [],
                sort: "original",
                includeDescendants: false
            }
        };

    }

    function createDatabase() {

        const database = {
            format: "aether-worldbuilding",
            schemaVersion: VERSION,
            appVersion: A.config.version,

            id: uid(),

            createdAt: now(),
            updatedAt: now(),

            modules: {
                archive: createArchive()
            }
        };

        initializeModules(database);

        return database;

    }

    /* =====================================================
       04 — EXTENSIBLE MODULE SYSTEM
       ===================================================== */

    function initializeModules(database) {

        for (const [name, definition] of extensions) {

            if (database.modules[name] === undefined) {

                database.modules[name] =
                    clone(definition.create());

            }

        }

        return database;

    }

    function registerExtension(name, definition) {

        if (
            typeof name !== "string" ||
            !name.trim() ||
            ["archive", "__proto__", "constructor", "prototype"]
                .includes(name)
        ) {
            fail("Invalid extension name.");
        }

        const factory =
            typeof definition === "function"
                ? definition
                : definition?.create;

        if (typeof factory !== "function") {
            fail("Extensions require a create function.");
        }

        extensions.set(name, {
            ...(object(definition) ? definition : {}),
            create: factory
        });

    }

    function registerMigration(version, callback) {

        if (!Number.isInteger(version) ||
            typeof callback !== "function") {
            fail("Invalid database migration.");
        }

        migrations.set(version, callback);

    }

    function registerNormalizer(name, callback) {

        if (typeof callback !== "function") {
            fail("Invalid normalizer.");
        }

        normalizers.set(name, callback);

    }

    function registerValidator(name, callback) {

        if (typeof callback !== "function") {
            fail("Invalid validator.");
        }

        validators.set(name, callback);

    }

    /* =====================================================
       05 — NORMALIZATION
       ===================================================== */

    function normalizeCategory(category) {

        if (!object(category)) {
            fail("Invalid category entry.");
        }

        return {
            ...category,

            id: category.id || uid(),

            name: string(
                category.name,
                string(category.title)
            ).trim(),

            parentId: category.parentId || null,

            createdAt: date(category.createdAt),

            updatedAt: date(
                category.updatedAt || category.createdAt
            )
        };

    }

    function normalizeBlock(block) {

        if (!object(block)) {
            fail("Invalid article content block.");
        }

        const typeAliases = {
            paragraph: "text",
            field: "information"
        };

        const type =
            typeAliases[block.type] ||
            string(block.type, "text");

        const result = {
            ...block,

            id: block.id || uid(),

            type,

            text: string(
                block.text,
                string(block.content, string(block.value))
            ),

            label: string(
                block.label,
                string(block.heading)
            ),

            rich: object(block.rich)
                ? clone(block.rich)
                : {},

            style: object(block.style)
                ? clone(block.style)
                : {},

            images: array(block.images).map(image => {

                if (typeof image === "string") {
                    return {
                        src: image,
                        caption: ""
                    };
                }

                return {
                    ...image,
                    src: string(image?.src),
                    caption: string(image?.caption)
                };

            }),

            references: array(block.references).map(ref => {

                if (typeof ref === "string") {
                    return {
                        id: ref,
                        name: "",
                        mode: "preview"
                    };
                }

                return {
                    ...ref,
                    id: string(ref?.id),
                    name: string(ref?.name),
                    mode: ref?.mode === "direct"
                        ? "direct"
                        : "preview"
                };

            })
        };

        if (
            !result.images.length &&
            typeof block.src === "string" &&
            block.src
        ) {
            result.images.push({
                src: block.src,
                caption: string(block.caption)
            });
        }

        if (
            type === "table" ||
            type === "informationGrid"
        ) {

            const rows = array(block.rows);

            result.rows = rows.length
                ? rows.map(row =>
                    array(row).map(cell =>
                        String(cell ?? "")
                    )
                )
                : [["", ""], ["", ""]];

            const width = Math.max(
                1,
                ...result.rows.map(row => row.length)
            );

            result.rows.forEach(row => {

                while (row.length < width) {
                    row.push("");
                }

            });

        }

        if (
            type === "columns2" ||
            type === "columns3"
        ) {

            const count = type === "columns2" ? 2 : 3;

            result.columns = Array.from(
                {length: count},
                (_, i) => string(block.columns?.[i])
            );

            result.columns.forEach((value, i) => {

                const key = "column" + i;

                if (result[key] === undefined) {
                    result[key] = value;
                }

            });

        }

        if (type === "divider") {
            result.variant = block.variant || "ornamental";
        }

        if (type === "spacer") {

            result.height = Number.isFinite(Number(block.height))
                ? Number(block.height)
                : 24;

        }

        return result;

    }

    function normalizeAppearance(value, article = {}) {

        const appearance = {
            ...DEFAULT_APPEARANCE,
            ...(object(value) ? value : {})
        };

        if (!appearance.banner && typeof article.banner === "string") {
            appearance.banner = article.banner;
        }

        return appearance;

    }

    function normalizeArticle(article, index) {

        if (!object(article)) {
            fail("Invalid article entry.");
        }

        return {
            ...article,

            id: article.id || uid(),

            name: string(
                article.name,
                string(article.title)
            ).trim(),

            subtitle: string(article.subtitle),

            categoryId: article.categoryId || null,

            parentArticleId: article.parentArticleId || null,

            folderId: article.folderId || null,

            order: Number.isFinite(Number(article.order))
                && article.order != null
                ? Number(article.order)
                : index,

            blocks: array(article.blocks)
                .map(normalizeBlock),

            appearance: normalizeAppearance(
                article.appearance,
                article
            ),

            createdAt: date(article.createdAt),

            updatedAt: date(
                article.updatedAt || article.createdAt
            )
        };

    }

    function normalizeFolder(folder) {

        if (!object(folder)) {
            fail("Invalid article folder.");
        }

        return {
            ...folder,

            id: folder.id || uid(),

            name: string(folder.name).trim(),

            parentArticleId: folder.parentArticleId || null,

            createdAt: date(folder.createdAt),

            updatedAt: date(
                folder.updatedAt || folder.createdAt
            )
        };

    }

    function normalizePreset(preset) {

        if (!object(preset)) {
            fail("Invalid appearance preset.");
        }

        return {
            ...preset,

            id: preset.id || uid(),

            name: string(preset.name).trim(),

            appearance: normalizeAppearance(
                preset.appearance
            ),

            createdAt: date(preset.createdAt)
        };

    }

    function normalizeArchive(archive) {

        if (!object(archive)) {
            fail("Invalid archive module.");
        }

        const preferences = object(archive.preferences)
            ? archive.preferences
            : {};

        return {
            ...archive,

            categories: array(archive.categories)
                .map(normalizeCategory),

            articles: array(archive.articles)
                .map(normalizeArticle),

            folders: array(archive.folders)
                .map(normalizeFolder),

            presets: array(archive.presets)
                .map(normalizePreset),

            preferences: {
                ...preferences,

                expanded: [
                    ...new Set(
                        array(preferences.expanded)
                    )
                ],

                sort: SORT_TYPES.includes(preferences.sort)
                    ? preferences.sort
                    : "original",

                includeDescendants:
                    Boolean(preferences.includeDescendants)
            }
        };

    }

    /* =====================================================
       06 — VERSION MIGRATION
       ===================================================== */

    registerMigration(2, database => {

        database.modules.archive =
            normalizeArchive(database.modules.archive);

        database.modules.archive.preferences.sort =
            "original";

        database.schemaVersion = 2;

        return database;

    });

    function unwrapBackup(input) {

        if (!object(input)) {
            fail("The backup is not a valid database.");
        }

        if (object(input.database)) {
            return input.database;
        }

        if (object(input.data?.modules)) {
            return input.data;
        }

        if (object(input.world?.modules)) {
            return input.world;
        }

        return input;

    }

    function normalizeDatabase(input) {

        const source = clone(unwrapBackup(input));

        if (!object(source.modules)) {

            if (
                Array.isArray(source.categories) &&
                Array.isArray(source.articles)
            ) {

                source.modules = {
                    archive: {
                        categories: source.categories,
                        articles: source.articles,
                        folders: source.folders || [],
                        presets: source.presets || [],
                        preferences: source.preferences || {}
                    }
                };

            } else {

                fail("This file does not contain an Aether archive.");

            }

        }

        if (!object(source.modules.archive)) {
            fail("The archive module is missing.");
        }

        const version = Number(
            source.schemaVersion ??
            source.meta?.schemaVersion ??
            1
        );

        if (!Number.isInteger(version) || version < 1) {
            fail("Invalid backup version.");
        }

        if (version > VERSION) {

            fail(
                "This backup was created by a newer version of Aether."
            );

        }

        let database = {
            ...source,

            schemaVersion: version,

            id: source.id || source.worldId || uid(),

            createdAt: date(source.createdAt),

            updatedAt: date(
                source.updatedAt || source.createdAt
            )
        };

        while (database.schemaVersion < VERSION) {

            const next = database.schemaVersion + 1;
            const migrate = migrations.get(next);

            if (!migrate) {
                fail("Missing migration for version " + next);
            }

            database = migrate(database) || database;
            database.schemaVersion = next;

        }

        database.format = "aether-worldbuilding";
        database.appVersion = A.config.version;

        database.modules.archive =
            normalizeArchive(database.modules.archive);

        initializeModules(database);

        for (const [name, definition] of extensions) {

            if (typeof definition.normalize === "function") {

                database.modules[name] =
                    definition.normalize(
                        database.modules[name],
                        database
                    ) ?? database.modules[name];

            }

        }

        for (const callback of normalizers.values()) {
            callback(database);
        }

        return database;

    }

    /* =====================================================
       07 — DATABASE VALIDATION
       ===================================================== */

    function validateId(id, label) {

        if (
            typeof id !== "string" ||
            !/^[a-zA-Z0-9_-]+$/.test(id)
        ) {
            fail("Invalid " + label + " ID.");
        }

    }

    function validateName(name, label) {

        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.length > 250
        ) {
            fail("Invalid " + label + " name.");
        }

    }

    function indexItems(items, label) {

        const index = new Map();

        for (const item of items) {

            validateId(item.id, label);

            if (index.has(item.id)) {
                fail("Duplicate " + label + " ID: " + item.id);
            }

            index.set(item.id, item);

        }

        return index;

    }

    function validateHierarchy(items, parentKey, label) {

        const completed = new Set();

        for (const item of items.values()) {

            const path = new Set();

            let current = item;

            while (current) {

                if (completed.has(current.id)) break;

                if (path.has(current.id)) {

                    fail(
                        "Circular " + label +
                        " relationship detected."
                    );

                }

                path.add(current.id);

                const parentId = current[parentKey];

                if (!parentId) break;

                current = items.get(parentId);

                if (!current) {
                    fail("Missing parent " + label + ".");
                }

            }

            path.forEach(id => completed.add(id));

        }

    }

    function validateBlocks(blocks) {

        if (!Array.isArray(blocks)) {
            fail("Invalid article content.");
        }

        indexItems(blocks, "block");

        for (const block of blocks) {

            if (
                typeof block.type !== "string" ||
                !block.type.trim()
            ) {
                fail("Invalid block type.");
            }

            if (!object(block.rich)) {
                fail("Invalid rich text content.");
            }

            for (const value of Object.values(block.rich)) {

                if (typeof value !== "string") {
                    fail("Invalid formatted text.");
                }

            }

            if (!object(block.style)) {
                fail("Invalid block appearance.");
            }

        }

    }

    function validateArchive(archive) {

        const categories =
            indexItems(archive.categories, "category");

        const articles =
            indexItems(archive.articles, "article");

        const folders =
            indexItems(archive.folders, "folder");

        indexItems(archive.presets, "preset");

        for (const category of categories.values()) {

            validateName(category.name, "category");

            if (
                category.parentId &&
                !categories.has(category.parentId)
            ) {
                fail("A category has a missing parent.");
            }

        }

        validateHierarchy(
            categories,
            "parentId",
            "category"
        );

        for (const article of articles.values()) {

            validateName(article.name, "article");

            if (!categories.has(article.categoryId)) {
                fail("An article has a missing category.");
            }

            if (article.parentArticleId) {

                const parent =
                    articles.get(article.parentArticleId);

                if (!parent) {
                    fail("A subarticle has a missing parent.");
                }

                if (parent.categoryId !== article.categoryId) {

                    fail(
                        "Subarticles must belong to their parent's category."
                    );

                }

            }

            if (article.folderId) {

                const folder = folders.get(article.folderId);

                if (!folder) {
                    fail("An article has a missing folder.");
                }

                if (
                    folder.parentArticleId !==
                    article.parentArticleId
                ) {
                    fail("Invalid article folder relationship.");
                }

            }

            validateBlocks(article.blocks);

        }

        validateHierarchy(
            articles,
            "parentArticleId",
            "article"
        );

        for (const folder of folders.values()) {

            validateName(folder.name, "folder");

            if (!articles.has(folder.parentArticleId)) {
                fail("A folder has a missing parent article.");
            }

        }

        for (const preset of archive.presets) {

            validateName(preset.name, "preset");

        }

        return true;

    }

    function validateDatabase(database) {

        if (!object(database)) {
            fail("Invalid database.");
        }

        if (database.schemaVersion !== VERSION) {
            fail("Unsupported database version.");
        }

        if (!object(database.modules)) {
            fail("Database modules are missing.");
        }

        validateArchive(database.modules.archive);

        for (const [name, definition] of extensions) {

            if (typeof definition.validate === "function") {

                const result = definition.validate(
                    database.modules[name],
                    database
                );

                if (result === false) {
                    fail("Invalid module: " + name);
                }

            }

        }

        for (const [name, callback] of validators) {

            if (callback(database) === false) {
                fail("Validation failed: " + name);
            }

        }

        return true;

    }

    function prepareDatabase(input) {

        const database = normalizeDatabase(input);

        validateDatabase(database);

        return database;

    }

    /* =====================================================
       08 — INDEXEDDB CONNECTION
       ===================================================== */

    let connectionPromise = null;

    function connect() {

        if (connectionPromise) {
            return connectionPromise;
        }

        connectionPromise = new Promise((resolve, reject) => {

            if (!window.indexedDB) {

                reject(
                    new Error("IndexedDB is unavailable.")
                );

                return;

            }

            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {

                const db = request.result;

                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
                }

            };

            request.onsuccess = () => {

                const db = request.result;

                db.onversionchange = () => {
                    db.close();
                    connectionPromise = null;
                };

                resolve(db);

            };

            request.onerror = () => {

                reject(
                    request.error ||
                    new Error("Storage could not be opened.")
                );

            };

            request.onblocked = () => {

                reject(
                    new Error(
                        "Storage is blocked by another open Aether tab."
                    )
                );

            };

        }).catch(error => {

            connectionPromise = null;
            throw error;

        });

        return connectionPromise;

    }

    async function readRecord(key) {

        const db = await connect();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE,
                "readonly"
            );

            const request =
                transaction.objectStore(STORE).get(key);

            let result = null;

            request.onsuccess = () => {
                result = request.result ?? null;
            };

            transaction.oncomplete = () => resolve(result);

            transaction.onerror = () =>
                reject(transaction.error);

            transaction.onabort = () =>
                reject(
                    transaction.error ||
                    new Error("Storage read aborted.")
                );

        });

    }

    async function writeRecord(key, value) {

        const db = await connect();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE,
                "readwrite"
            );

            transaction.objectStore(STORE).put(
                value,
                key
            );

            transaction.oncomplete = () => resolve(value);

            transaction.onerror = () => {

                reject(
                    transaction.error ||
                    new Error("Storage write failed.")
                );

            };

            transaction.onabort = () => {

                reject(
                    transaction.error ||
                    new Error("Storage write aborted.")
                );

            };

        });

    }

    /* =====================================================
       09 — PERSISTENCE & LEGACY MIGRATION
       ===================================================== */

    function readLegacy() {

        return localStorage.getItem(LEGACY_KEY);

    }

    async function load() {

        const existing = await readRecord(MAIN);

        if (existing !== null) {

            return prepareDatabase(existing);

        }

        const legacy = readLegacy();

        if (legacy !== null) {

            let parsed;

            try {

                parsed = JSON.parse(legacy);

            } catch {

                fail(
                    "The existing world could not be read. " +
                    "Your original data has been retained."
                );

            }

            const prepared = prepareDatabase(parsed);

            // Preserve the original before migration.

            await writeRecord(RECOVERY, parsed);

            await writeRecord(MAIN, prepared);

            // The original localStorage entry is deliberately
            // retained as an additional migration safeguard.

            return prepared;

        }

        return null;

    }

    async function save(database) {

        const prepared = prepareDatabase(database);

        prepared.updatedAt = now();

        await writeRecord(MAIN, prepared);

        return clone(prepared);

    }

    async function createRecovery(database) {

        if (!database) {
            fail("No world available for recovery.");
        }

        await writeRecord(
            RECOVERY,
            clone(database)
        );

        return true;

    }

    async function rawRecovery() {

        try {

            const recovery = await readRecord(RECOVERY);

            if (recovery !== null) return recovery;

            const current = await readRecord(MAIN);

            if (current !== null) return current;

        } catch (error) {

            console.error(error);

        }

        return localStorage.getItem(
            LEGACY_KEY + "-recovery"
        ) || readLegacy();

    }

    async function exists() {

        return (
            await readRecord(MAIN) !== null ||
            readLegacy() !== null
        );

    }

    async function estimate() {

        if (!navigator.storage?.estimate) {
            return null;
        }

        return navigator.storage.estimate();

    }

    /* =====================================================
       10 — BACKUP FORMAT
       ===================================================== */

    function serialize(database) {

        const prepared = prepareDatabase(database);

        return JSON.stringify(
            {
                ...prepared,
                exportedAt: now()
            },
            null,
            2
        );

    }

    function deserialize(input) {

        let parsed;

        try {

            parsed = typeof input === "string"
                ? JSON.parse(input)
                : clone(input);

        } catch {

            fail("This file is not valid JSON.");

        }

        return prepareDatabase(parsed);

    }

    function backupFilename() {

        const timestamp = now()
            .replace(/[:.]/g, "-")
            .slice(0, 19);

        return `Aether-V2.2-${timestamp}.json`;

    }

    function inspectBackup(input) {

        const database = deserialize(input);
        const archive = database.modules.archive;

        return {
            schemaVersion: database.schemaVersion,
            appVersion: database.appVersion,

            categories: archive.categories.length,
            articles: archive.articles.length,
            folders: archive.folders.length,
            presets: archive.presets.length,

            modules: Object.keys(database.modules),

            createdAt: database.createdAt,
            updatedAt: database.updatedAt
        };

    }

    /* =====================================================
       11 — ARCHIVE UTILITIES
       ===================================================== */

    function createArchiveIndex(archive) {

        const categories = new Map(
            archive.categories.map(c => [c.id, c])
        );

        const articles = new Map(
            archive.articles.map(a => [a.id, a])
        );

        const folders = new Map(
            archive.folders.map(f => [f.id, f])
        );

        const categoryChildren = new Map();
        const articleChildren = new Map();
        const categoryArticles = new Map();
        const folderArticles = new Map();

        function add(map, key, value) {

            if (!map.has(key)) {
                map.set(key, []);
            }

            map.get(key).push(value);

        }

        archive.categories.forEach(category => {

            add(
                categoryChildren,
                category.parentId,
                category
            );

        });

        archive.articles.forEach(article => {

            add(
                articleChildren,
                article.parentArticleId,
                article
            );

            add(
                categoryArticles,
                article.categoryId,
                article
            );

            if (article.folderId) {

                add(
                    folderArticles,
                    article.folderId,
                    article
                );

            }

        });

        return {
            categories,
            articles,
            folders,
            categoryChildren,
            articleChildren,
            categoryArticles,
            folderArticles
        };

    }

    function descendants(items, id, parentKey) {

        const result = new Set([id]);

        let changed = true;

        while (changed) {

            changed = false;

            for (const item of items) {

                if (
                    result.has(item[parentKey]) &&
                    !result.has(item.id)
                ) {

                    result.add(item.id);
                    changed = true;

                }

            }

        }

        return [...result];

    }

    function categoryPath(archive, id) {

        const result = [];
        const seen = new Set();

        const index = new Map(
            archive.categories.map(c => [c.id, c])
        );

        while (id && !seen.has(id)) {

            seen.add(id);

            const category = index.get(id);

            if (!category) break;

            result.unshift(category);

            id = category.parentId;

        }

        return result;

    }

    /* =====================================================
       12 — PUBLIC DATA API
       ===================================================== */

    A.data = {

        create: createDatabase,

        prepare: prepareDatabase,

        normalize: normalizeDatabase,

        validate: validateDatabase,

        serialize,

        deserialize,

        inspectBackup,

        backupFilename,

        registerExtension,

        registerMigration,

        registerNormalizer,

        registerValidator,

        createArchive,

        createArchiveIndex,

        categoryPath,

        categoryDescendants(archive, id) {

            return descendants(
                archive.categories,
                id,
                "parentId"
            );

        },

        articleDescendants(archive, id) {

            return descendants(
                archive.articles,
                id,
                "parentArticleId"
            );

        },

        defaultAppearance() {
            return clone(DEFAULT_APPEARANCE);
        },

        defaultBlockStyle() {
            return clone(DEFAULT_STYLE);
        },

        blockTypes: [...BLOCK_TYPES],

        sortTypes: [...SORT_TYPES],

        uid,

        now,

        clone,

        get schemaVersion() {
            return VERSION;
        }

    };

    A.storage = {

        connect,

        load,

        save,

        exists,

        createRecovery,

        rawRecovery,

        estimate

    };

})();

/* =========================================================
   END — AETHER V2.2 DATA FOUNDATION

   FUTURE EXTENSIONS MAY BE APPENDED BELOW.

   Example:

   Aether.data.registerExtension("characters", {
       create: () => ({
           entries: [],
           preferences: {}
       })
   });

   Existing modules are preserved when new modules are added.
   ========================================================= */
