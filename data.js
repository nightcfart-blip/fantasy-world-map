/* ==================================================
   AETHER — V2.1
   CONSOLIDATED DATA FOUNDATION
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether = window.Aether || {};

    const extensions = new Map();
    const migrations = new Map();
    const validators = new Map();
    const normalizers = new Map();

    const archiveMigrations = new Map();

    const MODULE = "archive";

    const BLOCK_TYPES = [
        "heading",
        "subheading",
        "text",
        "information",
        "quote",
        "divider"
    ];

    const SORT_TYPES = [
        "alphabetical",
        "created",
        "edited"
    ];

    const blockTypeSet = new Set(BLOCK_TYPES);
    const sortTypeSet = new Set(SORT_TYPES);

    const collator = new Intl.Collator(undefined, {
        sensitivity: "base",
        numeric: true
    });


    /* ==================================================
       01 — APPLICATION CONFIGURATION
       ================================================== */

    A.config = {
        name: "Aether",
        version: "2.1",
        schemaVersion: 1,

        storageKey: "aether-worldbuilding",

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


    /* ==================================================
       02 — MAIN MENU
       ================================================== */

    A.menu = [
        {
            id: "archive",
            index: "01",
            category: "The Compendium",
            title: "World",
            italicTitle: "Archive.",
            description:
                "The fragments of an unwritten universe.",
            className: "panel-hero",
            enabled: false
        },
        {
            id: "collections",
            index: "02",
            category: "Curate",
            title: "Collections",
            description: "Gather the fragments.",
            className: "panel-collections",
            enabled: false
        },
        {
            id: "export",
            index: "03",
            category: "Save",
            title: "Preserve",
            description: "Keep what was created.",
            className: "panel-export",
            enabled: false
        },
        {
            id: "import",
            index: "04",
            category: "Import",
            title: "Restore",
            description: "Return to your world.",
            className: "panel-import",
            enabled: false
        },
        {
            id: "settings",
            index: "05",
            category: "Configure",
            title: "Settings",
            description: "Make it your own.",
            className: "panel-settings",
            enabled: false
        }
    ];


    /* ==================================================
       03 — SHARED UTILITIES
       ================================================== */

    const isObject = value =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

    const has = (object, key) =>
        Object.prototype.hasOwnProperty.call(
            object,
            key
        );

    const fail = message => {
        throw new Error(message);
    };

    const now = () =>
        new Date().toISOString();

    const uid = () => {

        if (globalThis.crypto?.randomUUID) {
            return globalThis.crypto.randomUUID();
        }

        return [
            Date.now().toString(36),
            Math.random().toString(36).slice(2),
            Math.random().toString(36).slice(2)
        ].join("-");

    };

    const clone = value =>
        JSON.parse(JSON.stringify(value));

    const validId = value =>
        typeof value === "string" &&
        value.length > 0;

    const validName = value =>
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.length <= 250;

    const validDate = value =>
        Number.isFinite(Date.parse(value));

    const cleanName = value => {

        const name = String(value ?? "").trim();

        if (!validName(name)) {
            fail(
                "Enter a name between 1 and 250 characters."
            );
        }

        return name;

    };

    const alphabetical = (a, b) =>
        collator.compare(a.name, b.name);

    const pad = value =>
        String(value).padStart(2, "0");

    function register(map, key, callback, message) {

        if (
            typeof key !== "string" ||
            typeof callback !== "function"
        ) {
            fail(message);
        }

        map.set(key, callback);

    }

    function swap(array, a, b) {

        if (
            a < 0 ||
            b < 0 ||
            a >= array.length ||
            b >= array.length
        ) {
            return false;
        }

        [array[a], array[b]] = [
            array[b],
            array[a]
        ];

        return true;

    }

    A.utils = {
        id: uid,
        now,
        clone
    };


    /* ==================================================
       04 — DATABASE FOUNDATION
       ================================================== */

    function initializeModules(database) {

        for (const [name, factory] of extensions) {

            if (!has(database.modules, name)) {

                Object.defineProperty(
                    database.modules,
                    name,
                    {
                        value: factory(),
                        writable: true,
                        enumerable: true,
                        configurable: true
                    }
                );

            }

        }

        for (const [name, normalize] of normalizers) {

            if (has(database.modules, name)) {

                database.modules[name] = normalize(
                    database.modules[name]
                );

            }

        }

        return database;

    }

    function createDatabase() {

        const timestamp = now();

        return initializeModules({
            format: "aether-world",

            schemaVersion: A.config.schemaVersion,
            appVersion: A.config.version,

            metadata: {
                id: uid(),
                name: "Untitled World",
                createdAt: timestamp,
                updatedAt: timestamp
            },

            modules: {}
        });

    }

    function normalizeDatabase(input) {

        if (
            !isObject(input) ||
            input.format !== "aether-world"
        ) {
            fail("Unrecognized Aether database.");
        }

        if (
            !Number.isInteger(input.schemaVersion) ||
            input.schemaVersion < 1
        ) {
            fail("Invalid schema version.");
        }

        if (
            input.schemaVersion >
            A.config.schemaVersion
        ) {
            fail(
                "This database requires a newer version."
            );
        }

        let database = clone(input);

        while (
            database.schemaVersion <
            A.config.schemaVersion
        ) {

            const version = database.schemaVersion;
            const migrate = migrations.get(version);

            if (!migrate) {
                fail("Missing database migration.");
            }

            database = migrate(database);

            if (!isObject(database)) {
                fail("Invalid database migration.");
            }

            database.schemaVersion = version + 1;

        }

        if (!isObject(database.modules)) {
            fail("Invalid database modules.");
        }

        return initializeModules(database);

    }

    function validateDatabase(database) {

        if (!isObject(database)) {
            fail("The database is invalid.");
        }

        if (database.format !== "aether-world") {
            fail("This is not an Aether database.");
        }

        if (
            !Number.isInteger(database.schemaVersion) ||
            database.schemaVersion < 1
        ) {
            fail("Invalid database schema.");
        }

        if (!isObject(database.metadata)) {
            fail("Database metadata is missing.");
        }

        if (
            !validId(database.metadata.id) ||
            !database.metadata.id.trim()
        ) {
            fail("The world identifier is missing.");
        }

        if (
            typeof database.metadata.name !== "string"
        ) {
            fail("The world name is invalid.");
        }

        if (!isObject(database.modules)) {
            fail("Database modules are invalid.");
        }

        return true;

    }

    function validateModules(database) {

        for (const [name, validate] of validators) {

            if (
                has(database.modules, name) &&
                validate(
                    database.modules[name],
                    database
                ) === false
            ) {
                fail("Invalid module: " + name);
            }

        }

        return true;

    }

    function prepareDatabase(input) {

        const database = A.data.normalize(input);

        A.data.validate(database);
        A.data.validateModules(database);

        return database;

    }


    /* ==================================================
       05 — PUBLIC DATABASE API
       ================================================== */

    A.data = {

        create: createDatabase,

        normalize: normalizeDatabase,

        validate: validateDatabase,

        validateModules,

        prepare: prepareDatabase,

        registerExtension(name, factory) {

            register(
                extensions,
                name,
                factory,
                "Invalid data extension."
            );

        },

        registerValidator(name, validator) {

            register(
                validators,
                name,
                validator,
                "Invalid module validator."
            );

        },

        registerNormalizer(name, normalizer) {

            register(
                normalizers,
                name,
                normalizer,
                "Invalid module normalizer."
            );

        },

        registerMigration(version, migrate) {

            if (
                !Number.isInteger(version) ||
                typeof migrate !== "function"
            ) {
                fail("Invalid migration.");
            }

            migrations.set(version, migrate);

        },


        /* JSON EXPORT */

        serialize(database) {

            const prepared = A.data.prepare(database);

            prepared.appVersion = A.config.version;
            prepared.exportedAt = now();

            return JSON.stringify(
                prepared,
                null,
                2
            );

        },


        /* JSON IMPORT */

        deserialize(text) {

            if (
                typeof text !== "string" ||
                !text.trim()
            ) {
                fail("The selected file is empty.");
            }

            let parsed;

            try {

                parsed = JSON.parse(
                    text.replace(/^\uFEFF/, "")
                );

            } catch {

                fail(
                    "The selected file is not valid JSON."
                );

            }

            return A.data.prepare(parsed);

        },


        /* BACKUP FILE NAME */

        backupFilename(database) {

            const name = (
                database.metadata.name ||
                "Untitled World"
            )
                .trim()
                .replace(
                    /[<>:"/\\|?*\u0000-\u001F]/g,
                    "-"
                )
                .replace(/\s+/g, "-")
                .slice(0, 70)
                || "Untitled-World";

            const date = new Date();

            const day = [
                date.getFullYear(),
                pad(date.getMonth() + 1),
                pad(date.getDate())
            ].join("-");

            const time = [
                pad(date.getHours()),
                pad(date.getMinutes()),
                pad(date.getSeconds())
            ].join("-");

            return `Aether-${name}-${day}_${time}.json`;

        }

    };


    /* ==================================================
       06 — DATABASE PERSISTENCE
       ================================================== */

    const STORAGE_KEY = A.config.storageKey;

    const RECOVERY_KEY =
        STORAGE_KEY + "-recovery";

    const exists = key =>
        localStorage.getItem(key) !== null;

    function loadDatabase(key, errorMessage) {

        const raw = localStorage.getItem(key);

        if (raw === null) {
            return null;
        }

        let parsed;

        try {

            parsed = JSON.parse(raw);

        } catch {

            fail(errorMessage);

        }

        return A.data.prepare(parsed);

    }

    A.storage = {

        exists() {
            return exists(STORAGE_KEY);
        },

        load() {

            return loadDatabase(
                STORAGE_KEY,
                "The locally saved database could not be read."
            );

        },

        save(database) {

            const prepared = A.data.prepare(database);

            prepared.appVersion = A.config.version;
            prepared.metadata.updatedAt = now();

            /*
               Persistence remains transactional.

               The application receives the replacement
               database only after localStorage succeeds.
            */

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(prepared)
            );

            return prepared;

        },

        createRecovery(database) {

            if (!database) {
                return false;
            }

            localStorage.setItem(
                RECOVERY_KEY,
                JSON.stringify(database)
            );

            return true;

        },

        loadRecovery() {

            return loadDatabase(
                RECOVERY_KEY,
                "The recovery database could not be read."
            );

        },

        hasRecovery() {
            return exists(RECOVERY_KEY);
        }

    };


    /* ==================================================
       07 — ARCHIVE DEFAULTS
       ================================================== */

    function createArchive() {

        return {
            version: 1,

            categories: [],
            articles: [],

            preferences: {
                sort: "alphabetical",
                expanded: []
            }
        };

    }

    function normalizeArchive(archive) {

        if (archive === undefined) {
            return createArchive();
        }

        if (!isObject(archive)) {
            fail("The Archive module is invalid.");
        }

        /*
           The complete database has already been cloned.

           No additional Archive clone is necessary.
        */

        archive.version ??= 1;

        if (
            !Number.isInteger(archive.version) ||
            archive.version < 1 ||
            archive.version > 1
        ) {
            fail("Unsupported Archive version.");
        }

        while (
            archiveMigrations.has(archive.version)
        ) {

            const version = archive.version;

            archiveMigrations.get(version)(archive);

            if (
                !Number.isInteger(archive.version) ||
                archive.version <= version
            ) {
                fail(
                    "Archive migration did not advance."
                );
            }

        }

        if (archive.preferences === undefined) {
            archive.preferences = {};
        }

        if (!isObject(archive.preferences)) {
            fail("Invalid Archive preferences.");
        }

        archive.preferences.sort ??= "alphabetical";
        archive.preferences.expanded ??= [];

        return archive;

    }


    /* ==================================================
       08 — ARCHIVE INDEXING
       ================================================== */

    /*
       Indexes are generated from the current data.

       They are not stored in JSON backups and cannot
       become stale across database replacements.
    */

    function indexById(items) {

        return new Map(
            items.map(item => [item.id, item])
        );

    }

    function groupBy(items, key) {

        const groups = new Map();

        for (const item of items) {

            const value = item[key];

            let group = groups.get(value);

            if (!group) {

                group = [];

                groups.set(value, group);

            }

            group.push(item);

        }

        return groups;

    }

    function createArchiveIndex(archive) {

        return {
            categories: indexById(
                archive.categories
            ),

            articles: indexById(
                archive.articles
            ),

            children: groupBy(
                archive.categories,
                "parentId"
            ),

            articlesByCategory: groupBy(
                archive.articles,
                "categoryId"
            ),

            expanded: new Set(
                archive.preferences.expanded
            )
        };

    }


    /* ==================================================
       09 — ARCHIVE VALIDATION
       ================================================== */

    function validateCategoryHierarchy(categoryMap) {

        /*
           Each category is resolved once.

           Shared ancestor chains are not repeatedly
           traversed for every individual category.
        */

        const resolved = new Set();

        for (const category of categoryMap.values()) {

            if (resolved.has(category.id)) {
                continue;
            }

            const visited = new Set();

            let current = category.id;

            while (
                current !== null &&
                !resolved.has(current)
            ) {

                if (
                    visited.has(current) ||
                    !categoryMap.has(current)
                ) {
                    fail("Invalid category hierarchy.");
                }

                visited.add(current);

                current = categoryMap.get(
                    current
                ).parentId;

            }

            for (const id of visited) {
                resolved.add(id);
            }

        }

    }

    function validateBlocks(blocks) {

        const ids = new Set();

        for (const block of blocks) {

            if (
                !isObject(block) ||
                !validId(block.id) ||
                ids.has(block.id) ||
                !blockTypeSet.has(block.type) ||
                typeof block.text !== "string" ||
                typeof block.label !== "string"
            ) {
                fail("Invalid article content block.");
            }

            ids.add(block.id);

        }

    }

    function validateArchive(archive) {

        if (
            !isObject(archive) ||
            archive.version !== 1 ||
            !Array.isArray(archive.categories) ||
            !Array.isArray(archive.articles)
        ) {
            fail("Invalid Archive structure.");
        }


        /* Categories */

        const categoryMap = new Map();

        for (const category of archive.categories) {

            if (
                !isObject(category) ||
                !validId(category.id) ||
                categoryMap.has(category.id) ||
                !validName(category.name) ||
                (
                    category.parentId !== null &&
                    typeof category.parentId !== "string"
                )
            ) {
                fail("Invalid or duplicate category.");
            }

            categoryMap.set(
                category.id,
                category
            );

        }

        validateCategoryHierarchy(categoryMap);


        /* Articles */

        const articleIds = new Set();

        for (const article of archive.articles) {

            if (
                !isObject(article) ||
                !validId(article.id) ||
                articleIds.has(article.id) ||
                !categoryMap.has(article.categoryId) ||
                !validName(article.name) ||
                typeof article.subtitle !== "string" ||
                !Array.isArray(article.blocks) ||
                !validDate(article.createdAt) ||
                !validDate(article.updatedAt)
            ) {
                fail("Invalid or duplicate article.");
            }

            articleIds.add(article.id);

            validateBlocks(article.blocks);

        }


        /* Preferences */

        const preferences = archive.preferences;

        if (
            !isObject(preferences) ||
            !sortTypeSet.has(preferences.sort) ||
            !Array.isArray(preferences.expanded) ||
            !preferences.expanded.every(
                id => typeof id === "string"
            )
        ) {
            fail("Invalid Archive preferences.");
        }

        return true;

    }


    /* ==================================================
       10 — REGISTER ARCHIVE MODULE
       ================================================== */

    A.data.registerExtension(
        MODULE,
        createArchive
    );

    A.data.registerNormalizer(
        MODULE,
        normalizeArchive
    );

    A.data.registerValidator(
        MODULE,
        validateArchive
    );


    /* ==================================================
       11 — ARCHIVE DATA ACCESS
       ================================================== */

    const read = () =>
        A.app.getModule(MODULE);

    const change = updater =>
        A.app.updateModule(MODULE, updater);

    function requireItem(items, id, message) {

        const item = items.find(
            entry => entry.id === id
        );

        if (!item) {
            fail(message);
        }

        return item;

    }

    const requireCategory = (archive, id) =>
        requireItem(
            archive.categories,
            id,
            "Category not found."
        );

    const requireArticle = (archive, id) =>
        requireItem(
            archive.articles,
            id,
            "Article not found."
        );

    const requireBlock = (article, id) =>
        requireItem(
            article.blocks,
            id,
            "Content block not found."
        );

    const touch = item => {
        item.updatedAt = now();
    };

    function expandCategory(archive, id) {

        if (
            id !== null &&
            !archive.preferences.expanded.includes(id)
        ) {
            archive.preferences.expanded.push(id);
        }

    }


    /* DESCENDANT TRAVERSAL */

    function descendants(archive, id) {

        const children = groupBy(
            archive.categories,
            "parentId"
        );

        const result = new Set([id]);

        const queue = [id];

        /*
           An index replaces Array.shift().

           Categories are grouped once instead of
           rescanning the entire array for every parent.
        */

        for (
            let cursor = 0;
            cursor < queue.length;
            cursor++
        ) {

            const parent = queue[cursor];

            const entries = children.get(parent);

            if (!entries) {
                continue;
            }

            for (const category of entries) {

                if (!result.has(category.id)) {

                    result.add(category.id);

                    queue.push(category.id);

                }

            }

        }

        return result;

    }


    /* SHARED ARTICLE MUTATION */

    function changeArticle(id, updater) {

        return change(archive => {

            const article = requireArticle(
                archive,
                id
            );

            const result = updater(
                article,
                archive
            );

            if (result !== false) {
                touch(article);
            }

        });

    }


    /* ==================================================
       12 — PUBLIC ARCHIVE API
       ================================================== */

    A.archive = {

        read,

        blockTypes: [...BLOCK_TYPES],


        /* OPTIONAL INDEX ACCESS */

        getIndex() {

            return createArchiveIndex(
                read()
            );

        },


        /* ----------------------------------------------
           CATEGORY LOOKUP
           ---------------------------------------------- */

        getCategory(id) {

            return read().categories.find(
                category => category.id === id
            ) || null;

        },

        getChildren(parentId = null) {

            return read().categories.filter(
                category =>
                    category.parentId === parentId
            );

        },

        getPath(id) {

            const map = indexById(
                read().categories
            );

            const path = [];
            const visited = new Set();

            let current = map.get(id);

            while (
                current &&
                !visited.has(current.id)
            ) {

                visited.add(current.id);

                path.push(current);

                current = map.get(
                    current.parentId
                );

            }

            return path.reverse();

        },

        getDescendants(id) {

            return descendants(
                read(),
                id
            );

        },


        /* ----------------------------------------------
           CREATE CATEGORY
           ---------------------------------------------- */

        createCategory(name, parentId = null) {

            const timestamp = now();

            const category = {
                id: uid(),
                name: cleanName(name),
                parentId,
                createdAt: timestamp,
                updatedAt: timestamp
            };

            change(archive => {

                if (parentId !== null) {

                    requireCategory(
                        archive,
                        parentId
                    );

                }

                archive.categories.push(category);

                expandCategory(
                    archive,
                    parentId
                );

            });

            return category.id;

        },


        /* RENAME CATEGORY */

        renameCategory(id, name) {

            const cleaned = cleanName(name);

            change(archive => {

                const category = requireCategory(
                    archive,
                    id
                );

                category.name = cleaned;

                touch(category);

            });

        },


        /* MOVE CATEGORY */

        moveCategory(id, parentId = null) {

            change(archive => {

                const category = requireCategory(
                    archive,
                    id
                );

                if (parentId !== null) {

                    requireCategory(
                        archive,
                        parentId
                    );

                    if (
                        descendants(
                            archive,
                            id
                        ).has(parentId)
                    ) {
                        fail(
                            "A category cannot contain itself."
                        );
                    }

                }

                category.parentId = parentId;

                touch(category);

                expandCategory(
                    archive,
                    parentId
                );

            });

        },


        /* REORDER CATEGORY */

        reorderCategory(id, direction) {

            change(archive => {

                const category = requireCategory(
                    archive,
                    id
                );

                const positions = [];

                for (
                    let i = 0;
                    i < archive.categories.length;
                    i++
                ) {

                    if (
                        archive.categories[i].parentId ===
                        category.parentId
                    ) {
                        positions.push(i);
                    }

                }

                const index = positions.findIndex(
                    position =>
                        archive.categories[position].id === id
                );

                const target = index + direction;

                if (
                    index < 0 ||
                    !Number.isInteger(target) ||
                    target < 0 ||
                    target >= positions.length
                ) {
                    return;
                }

                swap(
                    archive.categories,
                    positions[index],
                    positions[target]
                );

            });

        },


        /* DELETE CATEGORY & DESCENDANTS */

        deleteCategory(id) {

            change(archive => {

                requireCategory(archive, id);

                const removed = descendants(
                    archive,
                    id
                );

                archive.categories =
                    archive.categories.filter(
                        category =>
                            !removed.has(category.id)
                    );

                archive.articles =
                    archive.articles.filter(
                        article =>
                            !removed.has(article.categoryId)
                    );

                archive.preferences.expanded =
                    archive.preferences.expanded.filter(
                        categoryId =>
                            !removed.has(categoryId)
                    );

            });

        },


        /* ----------------------------------------------
           ARCHIVE PREFERENCES
           ---------------------------------------------- */

        toggleExpanded(id) {

            change(archive => {

                const expanded =
                    archive.preferences.expanded;

                if (expanded.includes(id)) {

                    archive.preferences.expanded =
                        expanded.filter(
                            entry => entry !== id
                        );

                } else {

                    expanded.push(id);

                }

            });

        },

        setSort(sort) {

            if (!sortTypeSet.has(sort)) {
                fail("Invalid Archive sort.");
            }

            change(archive => {
                archive.preferences.sort = sort;
            });

        },


        /* ----------------------------------------------
           ARTICLE LOOKUP
           ---------------------------------------------- */

        getArticle(id) {

            return read().articles.find(
                article => article.id === id
            ) || null;

        },

        getArticles(
            categoryId,
            sort,
            includeDescendants = false
        ) {

            const archive = read();

            if (sort === undefined) {
                sort = archive.preferences.sort;
            }

            let articles;

            if (includeDescendants) {

                const categories = descendants(
                    archive,
                    categoryId
                );

                articles = archive.articles.filter(
                    article =>
                        categories.has(article.categoryId)
                );

            } else {

                articles = archive.articles.filter(
                    article =>
                        article.categoryId === categoryId
                );

            }


            /* Date-based sorting */

            if (
                sort === "created" ||
                sort === "edited"
            ) {

                const key = sort === "created"
                    ? "createdAt"
                    : "updatedAt";

                /*
                   Parse each date once, rather than
                   repeatedly inside the sort comparator.
                */

                const dates = new Map(
                    articles.map(article => [
                        article.id,
                        Date.parse(article[key])
                    ])
                );

                return articles.sort(
                    (a, b) =>
                        dates.get(b.id) -
                        dates.get(a.id) ||
                        alphabetical(a, b)
                );

            }

            return articles.sort(alphabetical);

        },


        /* ----------------------------------------------
           CREATE ARTICLE
           ---------------------------------------------- */

        createArticle(categoryId, name) {

            const timestamp = now();

            const article = {
                id: uid(),
                categoryId,

                name: cleanName(name),
                subtitle: "",

                createdAt: timestamp,
                updatedAt: timestamp,

                blocks: []
            };

            change(archive => {

                requireCategory(
                    archive,
                    categoryId
                );

                archive.articles.push(article);

            });

            return article.id;

        },


        /* UPDATE ARTICLE */

        updateArticle(id, patch) {

            changeArticle(
                id,
                (article, archive) => {

                    if ("name" in patch) {

                        article.name = cleanName(
                            patch.name
                        );

                    }

                    if ("subtitle" in patch) {

                        article.subtitle = String(
                            patch.subtitle
                        );

                    }

                    if ("categoryId" in patch) {

                        requireCategory(
                            archive,
                            patch.categoryId
                        );

                        article.categoryId =
                            patch.categoryId;

                    }

                }
            );

        },


        /* DELETE ARTICLE */

        deleteArticle(id) {

            change(archive => {

                requireArticle(archive, id);

                archive.articles =
                    archive.articles.filter(
                        article => article.id !== id
                    );

            });

        },


        /* ----------------------------------------------
           CONTENT BLOCKS
           ---------------------------------------------- */

        addBlock(articleId, type) {

            if (!blockTypeSet.has(type)) {
                fail("Unknown content block.");
            }

            const block = {
                id: uid(),
                type,
                label: "",
                text: ""
            };

            changeArticle(
                articleId,
                article => {
                    article.blocks.push(block);
                }
            );

            return block.id;

        },


        /* UPDATE CONTENT BLOCK */

        updateBlock(articleId, blockId, patch) {

            changeArticle(
                articleId,
                article => {

                    const block = requireBlock(
                        article,
                        blockId
                    );

                    if ("text" in patch) {

                        block.text = String(
                            patch.text
                        );

                    }

                    if ("label" in patch) {

                        block.label = String(
                            patch.label
                        );

                    }

                }
            );

        },


        /* MOVE CONTENT BLOCK */

        moveBlock(articleId, blockId, direction) {

            changeArticle(
                articleId,
                article => {

                    const index =
                        article.blocks.findIndex(
                            block =>
                                block.id === blockId
                        );

                    const target = index + direction;

                    if (!Number.isInteger(target)) {
                        return false;
                    }

                    return swap(
                        article.blocks,
                        index,
                        target
                    );

                }
            );

        },


        /* DELETE CONTENT BLOCK */

        deleteBlock(articleId, blockId) {

            changeArticle(
                articleId,
                article => {

                    article.blocks =
                        article.blocks.filter(
                            block =>
                                block.id !== blockId
                        );

                }
            );

        }

    };


})();


/* ==================================================
   END — AETHER V2.1

   DATA FOUNDATION

   Future modules can be registered using:

   Aether.data.registerExtension(
       "moduleName",
       () => ({
           version: 1
       })
   );

   Aether.data.registerNormalizer(
       "moduleName",
       module => module
   );

   Aether.data.registerValidator(
       "moduleName",
       module => true
   );

   All mutations should continue to use:

   Aether.app.updateModule()

   ================================================== */
