
/* ==================================================
   AETHER
   DATA FOUNDATION
   V1.1
   ================================================== */

(() => {

    "use strict";

    const Aether = window.Aether =
        window.Aether || {};

    const migrations = new Map();

    const extensions = new Map();


    /* 01 — APPLICATION CONFIGURATION */

    Aether.config = {

        name: "Aether",

        version: "1.1",

        schemaVersion: 1,

        storageKey: "aether-worldbuilding",

        subtitle: "A world in the making",

        footer: "Every world begins somewhere",

        edition: "Vol. I"

    };


    /* 02 — COLOUR PALETTE */

    Aether.palette = {

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


    /* 03 — MENU CONFIGURATION */

    Aether.menu = [

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


    /* 04 — DATA UTILITIES */

    Aether.utils = {

        id() {

            if (
                window.crypto &&
                typeof crypto.randomUUID === "function"
            ) {

                return crypto.randomUUID();

            }

            return (
                Date.now().toString(36) +
                "-" +
                Math.random().toString(36).slice(2)
            );

        },

        now() {

            return new Date().toISOString();

        },

        clone(value) {

            return JSON.parse(
                JSON.stringify(value)
            );

        }

    };


    /* 05 — EXTENSIBLE DATABASE */

    Aether.data = {

        registerExtension(name, factory) {

            if (
                typeof name !== "string" ||
                typeof factory !== "function"
            ) {

                throw new Error(
                    "Invalid data extension."
                );

            }

            extensions.set(name, factory);

        },

        create() {

            const database = {

                format: "aether-world",

                schemaVersion:
                    Aether.config.schemaVersion,

                appVersion:
                    Aether.config.version,

                metadata: {

                    id: Aether.utils.id(),

                    name: "Untitled World",

                    createdAt: Aether.utils.now(),

                    updatedAt: Aether.utils.now()

                },

                modules: {}

            };

            for (
                const [name, factory]
                of extensions
            ) {

                database.modules[name] = factory();

            }

            return database;

        },

        registerMigration(version, migrate) {

            if (
                !Number.isInteger(version) ||
                typeof migrate !== "function"
            ) {

                throw new Error(
                    "Invalid migration."
                );

            }

            migrations.set(version, migrate);

        },

        normalize(input) {

            if (
                !input ||
                typeof input !== "object" ||
                input.format !== "aether-world"
            ) {

                throw new Error(
                    "Unrecognized Aether database."
                );

            }

            let database =
                Aether.utils.clone(input);

            if (
                !Number.isInteger(
                    database.schemaVersion
                ) ||
                database.schemaVersion < 1
            ) {

                throw new Error(
                    "Invalid schema version."
                );

            }

            if (
                database.schemaVersion >
                Aether.config.schemaVersion
            ) {

                throw new Error(
                    "This database requires a newer version."
                );

            }

            while (
                database.schemaVersion <
                Aether.config.schemaVersion
            ) {

                const currentVersion =
                    database.schemaVersion;

                const migrate =
                    migrations.get(currentVersion);

                if (!migrate) {

                    throw new Error(
                        "Missing database migration."
                    );

                }

                database = migrate(database);

                database.schemaVersion =
                    currentVersion + 1;

            }

            if (
                !database.modules ||
                typeof database.modules !== "object" ||
                Array.isArray(database.modules)
            ) {

                throw new Error(
                    "Invalid database modules."
                );

            }

            for (
                const [name, factory]
                of extensions
            ) {

                if (
                    !Object.prototype.hasOwnProperty.call(
                        database.modules,
                        name
                    )
                ) {

                    database.modules[name] = factory();

                }

            }

            return database;

        }

    };


})();


/* ==================================================
   FUTURE DATA MODULES

   Append data extensions and migrations here.

   Example:

   Aether.data.registerExtension(
       "archive",
       () => ({
           categories: [],
           articles: []
       })
   );

   ================================================== */


/* ==================================================
   V1.2 — DATABASE PERSISTENCE
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether;


    /* 01 — VERSION */

    A.config.version = "1.2";

    /*
       Schema remains at version 1.

       Adding import/export does not change
       the existing database structure.
    */


    /* 02 — STORAGE CONFIGURATION */

    const STORAGE_KEY =
        A.config.storageKey;

    const RECOVERY_KEY =
        STORAGE_KEY + "-recovery";


    /* 03 — DATABASE VALIDATION */

    A.data.validate = function (database) {

        if (
            !database ||
            typeof database !== "object" ||
            Array.isArray(database)
        ) {

            throw new Error(
                "The database is invalid."
            );

        }

        if (
            database.format !== "aether-world"
        ) {

            throw new Error(
                "This is not an Aether database."
            );

        }

        if (
            !Number.isInteger(
                database.schemaVersion
            ) ||
            database.schemaVersion < 1
        ) {

            throw new Error(
                "Invalid database schema."
            );

        }

        if (
            !database.metadata ||
            typeof database.metadata !== "object" ||
            Array.isArray(database.metadata)
        ) {

            throw new Error(
                "Database metadata is missing."
            );

        }

        if (
            typeof database.metadata.id !== "string" ||
            !database.metadata.id.trim()
        ) {

            throw new Error(
                "The world identifier is missing."
            );

        }

        if (
            typeof database.metadata.name !== "string"
        ) {

            throw new Error(
                "The world name is invalid."
            );

        }

        if (
            !database.modules ||
            typeof database.modules !== "object" ||
            Array.isArray(database.modules)
        ) {

            throw new Error(
                "Database modules are invalid."
            );

        }

        return true;

    };


    /* 04 — MODULE VALIDATORS */

    const moduleValidators = new Map();

    A.data.registerValidator = function (
        name,
        validator
    ) {

        if (
            typeof name !== "string" ||
            typeof validator !== "function"
        ) {

            throw new Error(
                "Invalid module validator."
            );

        }

        moduleValidators.set(
            name,
            validator
        );

    };


    A.data.validateModules = function (database) {

        for (
            const [name, validator]
            of moduleValidators
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    database.modules,
                    name
                )
            ) {

                const valid = validator(
                    database.modules[name],
                    database
                );

                if (valid === false) {

                    throw new Error(
                        "Invalid module: " + name
                    );

                }

            }

        }

        return true;

    };


    /* 05 — DATABASE PREPARATION */

    A.data.prepare = function (input) {

        const database =
            A.data.normalize(input);

        A.data.validate(database);

        A.data.validateModules(database);

        return database;

    };


    /* 06 — LOCAL STORAGE */

    A.storage = {


        /* CHECK EXISTING DATABASE */

        exists() {

            return localStorage.getItem(
                STORAGE_KEY
            ) !== null;

        },


        /* LOAD DATABASE */

        load() {

            const raw = localStorage.getItem(
                STORAGE_KEY
            );

            if (raw === null) {

                return null;

            }

            let parsed;

            try {

                parsed = JSON.parse(raw);

            } catch {

                throw new Error(
                    "The locally saved database could not be read."
                );

            }

            return A.data.prepare(parsed);

        },


        /* SAVE DATABASE */

        save(database) {

            const prepared =
                A.data.prepare(database);

            prepared.appVersion =
                A.config.version;

            prepared.metadata.updatedAt =
                A.utils.now();

            const serialized =
                JSON.stringify(prepared);

            /*
               setItem either succeeds or throws.
               The in-memory database is not replaced
               until this operation succeeds.
            */

            localStorage.setItem(
                STORAGE_KEY,
                serialized
            );

            return prepared;

        },


        /* CREATE RECOVERY COPY */

        createRecovery(database) {

            if (!database) return false;

            const serialized =
                JSON.stringify(database);

            localStorage.setItem(
                RECOVERY_KEY,
                serialized
            );

            return true;

        },


        /* READ RECOVERY COPY */

        loadRecovery() {

            const raw = localStorage.getItem(
                RECOVERY_KEY
            );

            if (raw === null) {

                return null;

            }

            return A.data.prepare(
                JSON.parse(raw)
            );

        },


        /* CHECK RECOVERY AVAILABILITY */

        hasRecovery() {

            return localStorage.getItem(
                RECOVERY_KEY
            ) !== null;

        }

    };


    /* 07 — EXPORT FORMAT */

    A.data.serialize = function (database) {

        const prepared =
            A.data.prepare(database);

        prepared.appVersion =
            A.config.version;

        prepared.exportedAt =
            A.utils.now();

        return JSON.stringify(
            prepared,
            null,
            2
        );

    };


    /* 08 — IMPORT FORMAT */

    A.data.deserialize = function (text) {

        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            throw new Error(
                "The selected file is empty."
            );

        }

        let parsed;

        try {

            /*
               Remove optional UTF-8 BOM.
            */

            parsed = JSON.parse(
                text.replace(/^\uFEFF/, "")
            );

        } catch {

            throw new Error(
                "The selected file is not valid JSON."
            );

        }

        return A.data.prepare(parsed);

    };


    /* 09 — BACKUP FILE NAME */

    A.data.backupFilename = function (database) {

        const worldName = (

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


        const now = new Date();

        const date = [

            now.getFullYear(),

            String(
                now.getMonth() + 1
            ).padStart(2, "0"),

            String(
                now.getDate()
            ).padStart(2, "0")

        ].join("-");


        const time = [

            String(
                now.getHours()
            ).padStart(2, "0"),

            String(
                now.getMinutes()
            ).padStart(2, "0"),

            String(
                now.getSeconds()
            ).padStart(2, "0")

        ].join("-");


        return (

            "Aether-" +

            worldName +

            "-" +

            date +

            "_" +

            time +

            ".json"

        );

    };


})();


/* ==================================================
   END V1.2 — DATABASE PERSISTENCE

   Future data modules can be appended below.
   ================================================== */


/* ==================================================
   V2.0 — WORLD ARCHIVE DATA MODULE
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether;

    A.config.version = "2.0";

    const MODULE = "archive";

    const BLOCK_TYPES = [
        "heading",
        "subheading",
        "text",
        "information",
        "quote",
        "divider"
    ];


    /* ==================================================
       01 — UTILITIES
       ================================================== */

    const now = () => new Date().toISOString();

    const uid = () => {

        if (globalThis.crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2) +
            "-" +
            Math.random().toString(36).slice(2)
        );

    };

    const isObject = value => (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

    const validName = value => (
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.length <= 250
    );

    function cleanName(value) {

        const name = String(value ?? "").trim();

        if (!validName(name)) {

            throw new Error(
                "Enter a name between 1 and 250 characters."
            );

        }

        return name;

    }


    /* ==================================================
       02 — MODULE DEFAULTS
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


    /* ==================================================
       03 — MODULE MIGRATIONS
       ================================================== */

    const migrations = new Map();

    function normalizeArchive(input) {

        if (input === undefined) {

            return createArchive();

        }

        if (!isObject(input)) {

            throw new Error(
                "The Archive module is invalid."
            );

        }

        const archive = A.utils.clone(input);

        if (archive.version === undefined) {
            archive.version = 1;
        }

        if (
            !Number.isInteger(archive.version) ||
            archive.version < 1 ||
            archive.version > 1
        ) {

            throw new Error(
                "Unsupported Archive version."
            );

        }

        while (migrations.has(archive.version)) {

            const migrate =
                migrations.get(archive.version);

            const oldVersion = archive.version;

            migrate(archive);

            if (archive.version <= oldVersion) {

                throw new Error(
                    "Archive migration did not advance."
                );

            }

        }

        if (archive.preferences === undefined) {

            archive.preferences = {};

        }

        if (!isObject(archive.preferences)) {

            throw new Error(
                "Invalid Archive preferences."
            );

        }

        archive.preferences.sort ??=
            "alphabetical";

        archive.preferences.expanded ??= [];

        return archive;

    }


    /* ==================================================
       04 — DATA VALIDATION
       ================================================== */

    function validateArchive(archive) {

        if (
            !isObject(archive) ||
            archive.version !== 1 ||
            !Array.isArray(archive.categories) ||
            !Array.isArray(archive.articles)
        ) {

            throw new Error(
                "Invalid Archive structure."
            );

        }

        const categoryMap = new Map();

        for (const category of archive.categories) {

            if (
                !isObject(category) ||
                typeof category.id !== "string" ||
                !category.id ||
                categoryMap.has(category.id) ||
                !validName(category.name) ||
                (
                    category.parentId !== null &&
                    typeof category.parentId !== "string"
                )
            ) {

                throw new Error(
                    "Invalid or duplicate category."
                );

            }

            categoryMap.set(
                category.id,
                category
            );

        }


        /* VERIFY CATEGORY HIERARCHY */

        for (const category of archive.categories) {

            const visited = new Set([
                category.id
            ]);

            let parentId = category.parentId;

            while (parentId !== null) {

                if (
                    visited.has(parentId) ||
                    !categoryMap.has(parentId)
                ) {

                    throw new Error(
                        "Invalid category hierarchy."
                    );

                }

                visited.add(parentId);

                parentId =
                    categoryMap.get(parentId).parentId;

            }

        }


        /* VERIFY ARTICLES */

        const articleIds = new Set();

        for (const article of archive.articles) {

            if (
                !isObject(article) ||
                typeof article.id !== "string" ||
                !article.id ||
                articleIds.has(article.id) ||
                !categoryMap.has(article.categoryId) ||
                !validName(article.name) ||
                typeof article.subtitle !== "string" ||
                !Array.isArray(article.blocks) ||
                !Number.isFinite(
                    Date.parse(article.createdAt)
                ) ||
                !Number.isFinite(
                    Date.parse(article.updatedAt)
                )
            ) {

                throw new Error(
                    "Invalid or duplicate article."
                );

            }

            articleIds.add(article.id);

            const blockIds = new Set();

            for (const block of article.blocks) {

                if (
                    !isObject(block) ||
                    typeof block.id !== "string" ||
                    !block.id ||
                    blockIds.has(block.id) ||
                    !BLOCK_TYPES.includes(block.type) ||
                    typeof block.text !== "string" ||
                    typeof block.label !== "string"
                ) {

                    throw new Error(
                        "Invalid article content block."
                    );

                }

                blockIds.add(block.id);

            }

        }


        /* VERIFY PREFERENCES */

        if (
            !isObject(archive.preferences) ||
            ![
                "alphabetical",
                "created",
                "edited"
            ].includes(archive.preferences.sort) ||
            !Array.isArray(
                archive.preferences.expanded
            ) ||
            !archive.preferences.expanded.every(
                id => typeof id === "string"
            )
        ) {

            throw new Error(
                "Invalid Archive preferences."
            );

        }

        return true;

    }


    /* ==================================================
       05 — INTEGRATE WITH EXISTING DATABASE
       ================================================== */

    const originalNormalize =
        A.data.normalize.bind(A.data);

    A.data.normalize = function (input) {

        const database =
            originalNormalize(input);

        database.modules[MODULE] =
            normalizeArchive(
                database.modules[MODULE]
            );

        return database;

    };


    const originalCreate =
        A.data.create.bind(A.data);

    A.data.create = function (...args) {

        const database =
            originalCreate(...args);

        database.modules[MODULE] =
            normalizeArchive(
                database.modules[MODULE]
            );

        return database;

    };


    A.data.registerValidator(
        MODULE,
        validateArchive
    );


    /* ==================================================
       06 — ARCHIVE DATA ACCESS
       ================================================== */

    const read = () => A.app.getModule(MODULE);

    const change = updater => (
        A.app.updateModule(
            MODULE,
            updater
        )
    );

    function requireCategory(archive, id) {

        const category =
            archive.categories.find(
                item => item.id === id
            );

        if (!category) {

            throw new Error(
                "Category not found."
            );

        }

        return category;

    }

    function requireArticle(archive, id) {

        const article =
            archive.articles.find(
                item => item.id === id
            );

        if (!article) {

            throw new Error(
                "Article not found."
            );

        }

        return article;

    }


    /* FIND ALL DESCENDANTS */

    function descendants(archive, id) {

        const result = new Set([id]);

        const queue = [id];

        while (queue.length) {

            const parentId = queue.shift();

            for (const category of archive.categories) {

                if (
                    category.parentId === parentId &&
                    !result.has(category.id)
                ) {

                    result.add(category.id);

                    queue.push(category.id);

                }

            }

        }

        return result;

    }


    /* ==================================================
       07 — PUBLIC ARCHIVE API
       ================================================== */

    A.archive = {

        read,

        blockTypes: [...BLOCK_TYPES],


        /* CATEGORY LOOKUP */

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

            const archive = read();

            const map = new Map(
                archive.categories.map(
                    category => [
                        category.id,
                        category
                    ]
                )
            );

            const path = [];

            let current = map.get(id);

            while (current) {

                path.unshift(current);

                current = map.get(
                    current.parentId
                );

            }

            return path;

        },


        getDescendants(id) {

            return descendants(
                read(),
                id
            );

        },


        /* CREATE CATEGORY */

        createCategory(name, parentId = null) {

            const category = {

                id: uid(),

                name: cleanName(name),

                parentId,

                createdAt: now(),

                updatedAt: now()

            };

            change(archive => {

                if (parentId !== null) {

                    requireCategory(
                        archive,
                        parentId
                    );

                }

                archive.categories.push(category);

                if (
                    parentId !== null &&
                    !archive.preferences.expanded
                        .includes(parentId)
                ) {

                    archive.preferences.expanded
                        .push(parentId);

                }

            });

            return category.id;

        },


        /* RENAME CATEGORY */

        renameCategory(id, name) {

            change(archive => {

                const category =
                    requireCategory(archive, id);

                category.name =
                    cleanName(name);

                category.updatedAt = now();

            });

        },


        /* MOVE CATEGORY */

        moveCategory(id, parentId = null) {

            change(archive => {

                const category =
                    requireCategory(archive, id);

                if (parentId !== null) {

                    requireCategory(
                        archive,
                        parentId
                    );

                }

                const excluded =
                    descendants(archive, id);

                if (excluded.has(parentId)) {

                    throw new Error(
                        "A category cannot contain itself."
                    );

                }

                category.parentId = parentId;

                category.updatedAt = now();

                if (
                    parentId !== null &&
                    !archive.preferences.expanded
                        .includes(parentId)
                ) {

                    archive.preferences.expanded
                        .push(parentId);

                }

            });

        },


        /* REORDER CATEGORY */

        reorderCategory(id, direction) {

            change(archive => {

                const category =
                    requireCategory(archive, id);

                const siblings =
                    archive.categories.filter(
                        item =>
                            item.parentId ===
                            category.parentId
                    );

                const index =
                    siblings.findIndex(
                        item => item.id === id
                    );

                const target =
                    siblings[index + direction];

                if (!target) return;

                const a =
                    archive.categories.indexOf(
                        category
                    );

                const b =
                    archive.categories.indexOf(
                        target
                    );

                [
                    archive.categories[a],
                    archive.categories[b]
                ] = [
                    archive.categories[b],
                    archive.categories[a]
                ];

            });

        },


        /* DELETE CATEGORY AND DESCENDANTS */

        deleteCategory(id) {

            change(archive => {

                requireCategory(archive, id);

                const removed =
                    descendants(archive, id);

                archive.categories =
                    archive.categories.filter(
                        category =>
                            !removed.has(category.id)
                    );

                archive.articles =
                    archive.articles.filter(
                        article =>
                            !removed.has(
                                article.categoryId
                            )
                    );

                archive.preferences.expanded =
                    archive.preferences.expanded
                        .filter(
                            item => !removed.has(item)
                        );

            });

        },


        /* EXPANSION PREFERENCES */

        toggleExpanded(id) {

            change(archive => {

                const expanded =
                    archive.preferences.expanded;

                if (expanded.includes(id)) {

                    archive.preferences.expanded =
                        expanded.filter(
                            item => item !== id
                        );

                } else {

                    expanded.push(id);

                }

            });

        },


        setSort(sort) {

            change(archive => {

                archive.preferences.sort = sort;

            });

        },


        /* ARTICLE LOOKUP */

        getArticle(id) {

            return read().articles.find(
                article => article.id === id
            ) || null;

        },


        getArticles(
            categoryId,
            sort = read().preferences.sort,
            includeDescendants = false
        ) {

            const archive = read();

            const categories =
                includeDescendants
                    ? descendants(
                        archive,
                        categoryId
                    )
                    : new Set([categoryId]);

            const articles =
                archive.articles.filter(
                    article =>
                        categories.has(
                            article.categoryId
                        )
                );

            const alphabetical = (a,b) => (
                a.name.localeCompare(
                    b.name,
                    undefined,
                    {
                        sensitivity: "base",
                        numeric: true
                    }
                )
            );

            if (sort === "created") {

                return articles.sort(
                    (a,b) =>
                        Date.parse(b.createdAt) -
                        Date.parse(a.createdAt) ||
                        alphabetical(a,b)
                );

            }

            if (sort === "edited") {

                return articles.sort(
                    (a,b) =>
                        Date.parse(b.updatedAt) -
                        Date.parse(a.updatedAt) ||
                        alphabetical(a,b)
                );

            }

            return articles.sort(alphabetical);

        },


        /* CREATE ARTICLE */

        createArticle(categoryId, name) {

            const article = {

                id: uid(),

                categoryId,

                name: cleanName(name),

                subtitle: "",

                createdAt: now(),

                updatedAt: now(),

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

            change(archive => {

                const article =
                    requireArticle(archive, id);

                if ("name" in patch) {

                    article.name =
                        cleanName(patch.name);

                }

                if ("subtitle" in patch) {

                    article.subtitle =
                        String(patch.subtitle);

                }

                if ("categoryId" in patch) {

                    requireCategory(
                        archive,
                        patch.categoryId
                    );

                    article.categoryId =
                        patch.categoryId;

                }

                article.updatedAt = now();

            });

        },


        deleteArticle(id) {

            change(archive => {

                requireArticle(archive, id);

                archive.articles =
                    archive.articles.filter(
                        article => article.id !== id
                    );

            });

        },


        /* CONTENT BLOCKS */

        addBlock(articleId, type) {

            if (!BLOCK_TYPES.includes(type)) {

                throw new Error(
                    "Unknown content block."
                );

            }

            const block = {

                id: uid(),

                type,

                label: "",

                text: ""

            };

            change(archive => {

                const article =
                    requireArticle(
                        archive,
                        articleId
                    );

                article.blocks.push(block);

                article.updatedAt = now();

            });

            return block.id;

        },


        updateBlock(articleId, blockId, patch) {

            change(archive => {

                const article =
                    requireArticle(
                        archive,
                        articleId
                    );

                const block =
                    article.blocks.find(
                        item => item.id === blockId
                    );

                if (!block) {

                    throw new Error(
                        "Content block not found."
                    );

                }

                if ("text" in patch) {

                    block.text =
                        String(patch.text);

                }

                if ("label" in patch) {

                    block.label =
                        String(patch.label);

                }

                article.updatedAt = now();

            });

        },


        moveBlock(articleId, blockId, direction) {

            change(archive => {

                const article =
                    requireArticle(
                        archive,
                        articleId
                    );

                const index =
                    article.blocks.findIndex(
                        block => block.id === blockId
                    );

                const target = index + direction;

                if (
                    index < 0 ||
                    target < 0 ||
                    target >= article.blocks.length
                ) return;

                [
                    article.blocks[index],
                    article.blocks[target]
                ] = [
                    article.blocks[target],
                    article.blocks[index]
                ];

                article.updatedAt = now();

            });

        },


        deleteBlock(articleId, blockId) {

            change(archive => {

                const article =
                    requireArticle(
                        archive,
                        articleId
                    );

                article.blocks =
                    article.blocks.filter(
                        block => block.id !== blockId
                    );

                article.updatedAt = now();

            });

        }

    };


})();


/* ==================================================
   END V2.0 — WORLD ARCHIVE DATA

   Future modules may be appended below.

   Aether.archive is the public data interface.
   All mutations use the V1.2 persistence system.

   ================================================== */
