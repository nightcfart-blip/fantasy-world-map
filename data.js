
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
