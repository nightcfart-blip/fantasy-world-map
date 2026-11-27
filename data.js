
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
