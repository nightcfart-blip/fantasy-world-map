
/* =====================================================
   COMPENDIUM — DATABASE ENGINE
   Version 1
   ===================================================== */

window.WorldData = (() => {

    "use strict";

    const DATABASE_NAME = "compendium-worldbuilding";
    const STORE_NAME = "archive";
    const RECORD_KEY = "main";
    const FORMAT = "compendium-archive";

    let schemaVersion = 1;
    let connection = null;
    let current = null;
    let initialized = false;

    let writeQueue = Promise.resolve();

    const migrations = new Map();
    const collections = new Map();
    const validators = new Map();
    const listeners = new Set();


    /* 01 — UTILITIES */

    const clone = value =>
        JSON.parse(JSON.stringify(value));

    const now = () =>
        new Date().toISOString();

    const uid = () =>
        globalThis.crypto?.randomUUID?.() ||
        Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2) + "-" +
        Math.random().toString(36).slice(2);

    const isObject = value =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

    function fail(message) {
        throw new Error(message);
    }


    /* 02 — DEFAULT ARCHIVE */

    function defaults() {
        return {
            format: FORMAT,
            schemaVersion,

            archiveId: uid(),
            createdAt: now(),
            updatedAt: now(),

            settings: {
                archiveName: "Compendium.",
                description:
                    "A record of things yet to exist.",
                menuImages: {}
            },

            categories: [],
            articles: [],

            extensions: {}
        };
    }


    /* 03 — EXTENSION REGISTRATION */

    function registerCollection(name, factory) {

        if (initialized) {
            fail("Register collections before initialization.");
        }

        if (
            !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) ||
            ["constructor", "prototype", "__proto__"]
                .includes(name) ||
            Object.hasOwn(defaults(), name)
        ) {
            fail("Invalid collection name.");
        }

        if (typeof factory !== "function") {
            fail("Collection factory must be a function.");
        }

        collections.set(name, factory);
    }

    function registerMigration(version, migrate) {

        if (initialized) {
            fail("Register migrations before initialization.");
        }

        if (
            !Number.isInteger(version) ||
            version < 2 ||
            typeof migrate !== "function"
        ) {
            fail("Invalid migration.");
        }

        migrations.set(version, migrate);

        schemaVersion = Math.max(
            schemaVersion,
            version
        );
    }

    function registerValidator(name, validator) {
        validators.set(name, validator);
    }


    /* 04 — NORMALIZATION */

    function normalize(source) {

        if (!isObject(source)) {
            fail("Invalid archive.");
        }

        let data = clone(source);

        /*
           Compatibility with the earlier Worlds V1
           backup format.
        */

        if (
            data.format === "worlds-archive" &&
            data.schemaVersion === 1
        ) {
            data.format = FORMAT;
        }

        if (data.format !== FORMAT) {
            fail("Unrecognized archive format.");
        }

        if (
            !Number.isInteger(data.schemaVersion) ||
            data.schemaVersion < 1
        ) {
            fail("Invalid archive version.");
        }

        if (data.schemaVersion > schemaVersion) {
            fail(
                "This archive requires a newer application version."
            );
        }

        while (data.schemaVersion < schemaVersion) {

            const next = data.schemaVersion + 1;
            const migration = migrations.get(next);

            if (!migration) {
                fail("Missing migration for version " + next);
            }

            data = migration(data) || data;
            data.schemaVersion = next;
        }

        const base = defaults();

        data = {
            ...base,
            ...data,

            settings: {
                ...base.settings,
                ...(isObject(data.settings)
                    ? data.settings
                    : {})
            }
        };

        if (!isObject(data.settings.menuImages)) {
            data.settings.menuImages = {};
        }

        if (
            typeof data.settings.archiveName !== "string" ||
            !data.settings.archiveName.trim()
        ) {
            data.settings.archiveName = base.settings.archiveName;
        }

        if (!isObject(data.extensions)) {
            data.extensions = {};
        }

        for (const [name, factory] of collections) {

            if (!Object.hasOwn(data, name)) {
                data[name] = factory();
            }
        }

        validate(data);

        return data;
    }


    /* 05 — VALIDATION */

    function validate(data) {

        if (
            !Array.isArray(data.categories) ||
            !Array.isArray(data.articles)
        ) {
            fail("Invalid archive collections.");
        }

        const categoryMap = new Map();
        const articleIds = new Set();

        for (const category of data.categories) {

            if (
                !isObject(category) ||
                typeof category.id !== "string" ||
                !category.id ||
                typeof category.name !== "string" ||
                !category.name.trim() ||
                categoryMap.has(category.id)
            ) {
                fail("Invalid or duplicate category.");
            }

            categoryMap.set(category.id, category);
        }

        for (const category of data.categories) {

            const visited = new Set([category.id]);

            let parentId = category.parentId;

            while (parentId !== null) {

                if (!categoryMap.has(parentId)) {
                    fail("A category has a missing parent.");
                }

                if (visited.has(parentId)) {
                    fail("Circular category relationship.");
                }

                visited.add(parentId);

                parentId =
                    categoryMap.get(parentId).parentId;
            }
        }

        for (const article of data.articles) {

            if (
                !isObject(article) ||
                typeof article.id !== "string" ||
                !article.id ||
                typeof article.title !== "string" ||
                !article.title.trim() ||
                articleIds.has(article.id) ||
                !categoryMap.has(article.categoryId) ||
                !Array.isArray(article.blocks)
            ) {
                fail("Invalid or duplicate article.");
            }

            articleIds.add(article.id);

            const blockIds = new Set();

            for (const block of article.blocks) {

                if (
                    !isObject(block) ||
                    typeof block.id !== "string" ||
                    typeof block.type !== "string" ||
                    blockIds.has(block.id)
                ) {
                    fail("Invalid content block.");
                }

                blockIds.add(block.id);
            }
        }

        for (const validator of validators.values()) {
            validator(data);
        }

        return true;
    }


    /* 06 — INDEXEDDB CONNECTION */

    function openDatabase() {

        return new Promise((resolve, reject) => {

            if (!window.indexedDB) {
                reject(new Error(
                    "IndexedDB is unavailable in this browser."
                ));
                return;
            }

            const request = indexedDB.open(
                DATABASE_NAME,
                1
            );

            request.onupgradeneeded = () => {

                const db = request.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };

            request.onblocked = () => {
                reject(new Error(
                    "Database is blocked by another open tab."
                ));
            };
        });
    }

    function readRecord() {

        return new Promise((resolve, reject) => {

            const transaction = connection.transaction(
                STORE_NAME,
                "readonly"
            );

            const request = transaction
                .objectStore(STORE_NAME)
                .get(RECORD_KEY);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    function writeRecord(data) {

        return new Promise((resolve, reject) => {

            const transaction = connection.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME)
                .put(data, RECORD_KEY);

            transaction.oncomplete = () => resolve();

            transaction.onerror = () => {
                reject(
                    transaction.error ||
                    new Error("Database write failed.")
                );
            };

            transaction.onabort = () => {
                reject(
                    transaction.error ||
                    new Error("Database write aborted.")
                );
            };
        });
    }


    /* 07 — INITIALIZATION */

    async function init() {

        if (initialized) return get();

        connection = await openDatabase();

        const stored = await readRecord();

        let source = stored;

        /*
           Recover the earlier Worlds localStorage archive
           if this is the first IndexedDB initialization.
        */

        if (!source) {

            try {
                const legacy = localStorage.getItem(
                    "worlds.personal.archive"
                );

                if (legacy) {
                    source = JSON.parse(legacy);
                }
            } catch (error) {
                throw new Error(
                    "Earlier archive could not be read: " +
                    error.message
                );
            }
        }

        const candidate = normalize(
            source || defaults()
        );

        await writeRecord(candidate);

        current = candidate;
        initialized = true;

        connection.onversionchange = () => {
            connection.close();
        };

        return get();
    }


    /* 08 — TRANSACTIONS */

    function get() {

        if (!initialized) {
            fail("Database is not initialized.");
        }

        return clone(current);
    }

    function select(reader) {

        if (!initialized) {
            fail("Database is not initialized.");
        }

        const result = reader(current);

        return result === undefined
            ? undefined
            : clone(result);
    }

    function enqueue(operation) {

        const pending = writeQueue.then(operation);

        writeQueue = pending.catch(() => {});

        return pending;
    }

    async function commit(candidate) {

        const data = normalize(candidate);

        data.updatedAt = now();

        try {
            await writeRecord(data);
        } catch (error) {
            fail(
                "Saving failed. Browser storage may be full " +
                "or unavailable. Export a backup if possible."
            );
        }

        current = data;

        for (const listener of listeners) {

            try {
                listener();
            } catch (error) {
                console.error(error);
            }
        }

        return true;
    }

    function update(mutator) {

        return enqueue(async () => {

            const draft = get();

            const result = mutator(draft);

            if (result?.then) {
                fail("Database mutators must be synchronous.");
            }

            await commit(draft);

            return result;
        });
    }

    function subscribe(listener) {
        listeners.add(listener);

        return () => listeners.delete(listener);
    }


    /* 09 — CATEGORIES */

    function category(id) {
        return select(data =>
            data.categories.find(c => c.id === id)
        );
    }

    function categories() {
        return select(data => data.categories);
    }

    function children(parentId = null) {

        return select(data =>
            data.categories
                .filter(c => c.parentId === parentId)
                .sort((a, b) =>
                    a.name.localeCompare(b.name)
                )
        );
    }

    function descendants(id) {

        const all = categories();
        const result = [];
        const queue = [id];

        while (queue.length) {

            const parent = queue.shift();

            for (const item of all) {

                if (item.parentId === parent) {
                    result.push(item.id);
                    queue.push(item.id);
                }
            }
        }

        return result;
    }

    function categoryPath(id) {

        const map = new Map(
            categories().map(c => [c.id, c])
        );

        const path = [];

        let item = map.get(id);

        while (item) {
            path.unshift(item);
            item = map.get(item.parentId);
        }

        return path;
    }

    async function createCategory(name, parentId = null) {

        name = String(name).trim();

        if (!name) {
            fail("Enter a category name.");
        }

        const item = {
            id: uid(),
            name,
            parentId,
            createdAt: now(),
            updatedAt: now()
        };

        await update(data => {
            data.categories.push(item);
        });

        return clone(item);
    }

    function updateCategory(id, changes) {

        return update(data => {

            const item = data.categories.find(
                c => c.id === id
            );

            if (!item) fail("Category not found.");

            if (changes.name !== undefined) {
                item.name = String(changes.name).trim();
            }

            if (changes.parentId !== undefined) {
                item.parentId = changes.parentId;
            }

            item.updatedAt = now();
        });
    }

    function deleteCategory(id) {

        return update(data => {

            const ids = new Set([id]);

            let changed = true;

            while (changed) {

                changed = false;

                for (const item of data.categories) {

                    if (
                        ids.has(item.parentId) &&
                        !ids.has(item.id)
                    ) {
                        ids.add(item.id);
                        changed = true;
                    }
                }
            }

            data.categories = data.categories.filter(
                c => !ids.has(c.id)
            );

            data.articles = data.articles.filter(
                a => !ids.has(a.categoryId)
            );
        });
    }


    /* 10 — ARTICLES */

    function article(id) {

        return select(data =>
            data.articles.find(a => a.id === id)
        );
    }

    function articles() {
        return select(data => data.articles);
    }

    function listArticles(categoryId = null, nested = false) {

        if (categoryId === null) {
            return articles();
        }

        const ids = new Set([
            categoryId,
            ...(nested ? descendants(categoryId) : [])
        ]);

        return select(data =>
            data.articles.filter(a =>
                ids.has(a.categoryId)
            )
        );
    }

    function newArticle(categoryId, title = "") {

        return {
            id: uid(),
            categoryId,
            title: String(title).trim(),
            subtitle: "",
            banner: "",
            blocks: [],
            createdAt: now(),
            updatedAt: now()
        };
    }

    function saveArticle(article) {

        const item = clone(article);

        item.title = String(item.title || "").trim();

        if (!item.title) {
            fail("The article needs a title.");
        }

        return update(data => {

            const index = data.articles.findIndex(
                a => a.id === item.id
            );

            item.updatedAt = now();

            if (index === -1) {

                data.articles.push(item);

            } else {

                data.articles[index] = {
                    ...data.articles[index],
                    ...item
                };
            }
        });
    }

    function deleteArticle(id) {

        return update(data => {

            data.articles = data.articles.filter(
                a => a.id !== id
            );
        });
    }


    /* 11 — SETTINGS */

    function settings() {
        return select(data => data.settings);
    }

    function saveSettings(changes) {

        const patch = clone(changes);

        return update(data => {

            data.settings = {
                ...data.settings,
                ...patch
            };
        });
    }


    /* 12 — BACKUPS */

    function exportArchive() {

        const backup = get();

        backup.exportedAt = now();

        return JSON.stringify(backup, null, 2);
    }

    function inspectBackup(text) {

        let parsed;

        try {
            parsed = JSON.parse(text);
        } catch {
            fail("This file is not valid JSON.");
        }

        return normalize(parsed);
    }

    function importArchive(text) {

        const candidate = inspectBackup(text);

        return enqueue(() => commit(candidate));
    }

    async function rawRecovery() {

        if (connection) {

            const record = await readRecord();

            if (record) {
                return JSON.stringify(record, null, 2);
            }
        }

        return localStorage.getItem(
            "worlds.personal.archive"
        );
    }

    function flush() {
        return writeQueue;
    }


    /* 13 — PUBLIC DATABASE API */

    return {
        init,
        get,
        select,
        update,
        subscribe,
        flush,

        clone,
        uid,
        now,

        registerCollection,
        registerMigration,
        registerValidator,

        category,
        categories,
        children,
        descendants,
        categoryPath,

        createCategory,
        updateCategory,
        deleteCategory,

        article,
        articles,
        listArticles,
        newArticle,
        saveArticle,
        deleteArticle,

        settings,
        saveSettings,

        exportArchive,
        inspectBackup,
        importArchive,
        rawRecovery,

        get version() {
            return schemaVersion;
        }
    };

})();


/* =====================================================
   PERMANENT EXTENSION POINT

   APPEND FUTURE DATA COLLECTIONS, VALIDATORS
   AND VERSION MIGRATIONS BELOW THIS LINE.

   Example:

   WorldData.registerCollection(
       "relationships",
       () => []
   );

   WorldData.registerMigration(2, data => {
       data.relationships ??= [];
       return data;
   });

   ===================================================== */
