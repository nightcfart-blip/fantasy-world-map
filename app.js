
/* ==================================================
   AETHER
   APPLICATION
   V1.1 — MAIN MENU
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether;

    const pages = new Map();

    const actions = new Map();

    const events = new Map();


    /* ==================================================
       01 — MODULAR APPLICATION CORE
       ================================================== */

    A.app = {

        currentPage: null,

        database: null,

        registerPage(name, renderer) {

            pages.set(name, renderer);

        },

        registerAction(name, handler) {

            actions.set(name, handler);

        },

        hasAction(name) {

            return actions.has(name);

        },

        runAction(name, payload) {

            const handler = actions.get(name);

            if (handler) {

                return handler(payload);

            }

        },

        navigate(name, payload = {}) {

            const renderer = pages.get(name);

            if (!renderer) return false;

            const root =
                document.getElementById("app");

            if (!root) return false;

            this.emit(
                "page:leave",
                this.currentPage
            );

            root.replaceChildren();

            this.currentPage = name;

            renderer(root, payload);

            this.emit("page:enter", name);

            return true;

        },

        on(name, handler) {

            if (!events.has(name)) {

                events.set(name, new Set());

            }

            events.get(name).add(handler);

            return () => {

                events.get(name)?.delete(handler);

            };

        },

        emit(name, payload) {

            for (
                const handler
                of events.get(name) || []
            ) {

                handler(payload);

            }

        },

        start() {

            this.database = A.data.create();

            this.navigate("menu");

        }

    };


    /* ==================================================
       02 — DOM UTILITIES
       ================================================== */

    function element(tag, className, text) {

        const node =
            document.createElement(tag);

        if (className) {

            node.className = className;

        }

        if (text !== undefined) {

            node.textContent = text;

        }

        return node;

    }


    /* ==================================================
       03 — ORNAMENTAL ARTWORK
       ================================================== */

    A.art = {};


    /*
       Deterministic random generator.
       The artwork remains consistent
       between page visits.
    */

    function seededRandom(seed) {

        let state = seed >>> 0;

        return () => {

            state = (
                Math.imul(1664525, state) +
                1013904223
            ) >>> 0;

            return state / 4294967296;

        };

    }


    /* SVG DEFINITIONS */

    function artworkDefinitions() {

        return `

        <defs>

            <linearGradient
                id="art-background"
                x1="0%" y1="0%"
                x2="85%" y2="100%">

                <stop offset="0%"
                      stop-color="#0b131e"/>

                <stop offset="32%"
                      stop-color="#193b4a"/>

                <stop offset="62%"
                      stop-color="#10232f"/>

                <stop offset="100%"
                      stop-color="#0b141c"/>

            </linearGradient>


            <radialGradient id="art-atmosphere">

                <stop offset="0%"
                      stop-color="#7baaab"
                      stop-opacity=".48"/>

                <stop offset="48%"
                      stop-color="#27606c"
                      stop-opacity=".24"/>

                <stop offset="100%"
                      stop-color="#27606c"
                      stop-opacity="0"/>

            </radialGradient>


            <linearGradient
                id="art-deep"
                x1="0%" y1="0%"
                x2="65%" y2="100%">

                <stop offset="0%"
                      stop-color="#9fc7c7"/>

                <stop offset="20%"
                      stop-color="#467e8c"/>

                <stop offset="45%"
                      stop-color="#24566b"/>

                <stop offset="72%"
                      stop-color="#18394e"/>

                <stop offset="100%"
                      stop-color="#0b1d30"/>

            </linearGradient>


            <linearGradient
                id="art-jade"
                x1="0%" y1="0%"
                x2="80%" y2="100%">

                <stop offset="0%"
                      stop-color="#d2e6d9"/>

                <stop offset="22%"
                      stop-color="#8dbab6"/>

                <stop offset="48%"
                      stop-color="#4a8d90"/>

                <stop offset="76%"
                      stop-color="#27606c"/>

                <stop offset="100%"
                      stop-color="#143740"/>

            </linearGradient>


            <linearGradient
                id="art-silk"
                x1="0%" y1="0%"
                x2="70%" y2="100%">

                <stop offset="0%"
                      stop-color="#dce8d8"/>

                <stop offset="28%"
                      stop-color="#aacac6"/>

                <stop offset="58%"
                      stop-color="#7baaab"/>

                <stop offset="100%"
                      stop-color="#3a6e7c"/>

            </linearGradient>


            <linearGradient
                id="art-foam"
                x1="0%" y1="0%"
                x2="60%" y2="100%">

                <stop offset="0%"
                      stop-color="#f2e5c8"/>

                <stop offset="25%"
                      stop-color="#c4ded6"/>

                <stop offset="65%"
                      stop-color="#8ebcbf"/>

                <stop offset="100%"
                      stop-color="#467c8b"/>

            </linearGradient>


            <linearGradient
                id="art-gold"
                x1="0%" y1="0%"
                x2="100%" y2="80%">

                <stop offset="0%"
                      stop-color="#806047"/>

                <stop offset="22%"
                      stop-color="#e6bd8b"/>

                <stop offset="42%"
                      stop-color="#f1dfb7"/>

                <stop offset="60%"
                      stop-color="#b58251"/>

                <stop offset="80%"
                      stop-color="#e6bd8b"/>

                <stop offset="100%"
                      stop-color="#74543b"/>

            </linearGradient>


            <linearGradient
                id="art-reflection"
                x1="0%" y1="0%"
                x2="100%" y2="100%">

                <stop offset="0%"
                      stop-color="#e1f3eb"
                      stop-opacity=".85"/>

                <stop offset="45%"
                      stop-color="#a2cfce"
                      stop-opacity=".25"/>

                <stop offset="100%"
                      stop-color="#7baaab"
                      stop-opacity="0"/>

            </linearGradient>


            <filter
                id="art-shadow"
                x="-35%" y="-35%"
                width="170%" height="180%">

                <feDropShadow
                    dx="0"
                    dy="9"
                    stdDeviation="9"
                    flood-color="#030b13"
                    flood-opacity=".65"/>

            </filter>


            <filter
                id="art-small-shadow"
                x="-30%" y="-30%"
                width="160%" height="170%">

                <feDropShadow
                    dx="1"
                    dy="3"
                    stdDeviation="2.5"
                    flood-color="#08121c"
                    flood-opacity=".65"/>

            </filter>


            <filter id="art-glow">

                <feGaussianBlur stdDeviation="3"/>

            </filter>


            <filter id="art-grain">

                <feTurbulence
                    type="fractalNoise"
                    baseFrequency=".72"
                    numOctaves="3"
                    stitchTiles="stitch"
                    seed="14"/>

                <feColorMatrix
                    type="saturate"
                    values="0"/>

            </filter>

        </defs>

        `;

    }


    /* ==================================================
       04 — HAND-SHAPED WAVE FORMS

       Different silhouettes, not repeated
       identical decorative icons.
       ================================================== */


    /* A — TALL CURLING CREST */

    function crest() {

        return `

        <g filter="url(#art-shadow)"
           stroke-linejoin="round"
           stroke-linecap="round">

            <path
                d="
                M -60 285
                C 20 250 85 290 155 245
                C 225 200 206 116 280 57
                C 331 17 407 17 448 62
                C 476 94 466 138 431 155
                C 403 169 370 155 366 129
                C 361 106 380 89 401 98
                C 418 106 416 126 400 131
                C 431 143 450 108 430 85
                C 402 51 344 70 329 115
                C 310 172 364 210 418 209
                C 490 209 525 154 590 163
                C 550 197 549 252 480 288
                C 365 348 257 274 153 310
                C 65 340 -5 329 -60 285 Z"

                fill="url(#art-deep)"
                stroke="url(#art-gold)"
                stroke-width="2.4"/>


            <path
                d="
                M -40 286
                C 77 309 142 262 198 225
                C 251 188 244 104 303 61
                C 356 23 419 38 441 80
                C 407 51 361 63 332 94
                C 287 143 314 208 362 236
                C 416 267 486 239 537 201
                C 501 270 425 297 344 280
                C 235 256 167 306 74 314
                C 24 318 -10 308 -40 286 Z"

                fill="url(#art-jade)"
                stroke="url(#art-gold)"
                stroke-width="1.6"/>


            <path
                d="
                M 58 294
                C 151 274 217 230 249 167
                C 268 129 272 90 314 65
                C 348 44 387 42 414 63
                C 375 48 329 82 311 119
                C 284 178 319 240 375 259
                C 263 237 197 302 104 311 Z"

                fill="url(#art-silk)"
                stroke="url(#art-gold)"
                stroke-width="1.2"/>


            <path
                d="
                M 252 157
                C 245 131 253 110 276 98
                C 264 72 283 49 309 49
                C 311 20 348 9 371 27
                C 399 7 433 27 432 49
                C 460 46 476 70 467 91
                C 455 110 432 107 428 88
                C 423 72 407 69 393 75
                C 371 86 373 111 388 119
                C 400 125 409 115 405 106
                C 430 114 419 143 396 145
                C 356 148 344 106 364 79
                C 325 90 301 120 298 157
                C 295 187 308 206 328 226
                C 290 211 260 189 252 157 Z"

                fill="url(#art-foam)"
                stroke="url(#art-gold)"
                stroke-width="1.7"
                filter="url(#art-small-shadow)"/>


            <path
                d="
                M 8 301
                C 115 331 183 261 260 263
                C 337 265 403 320 487 269"

                fill="none"
                stroke="url(#art-gold)"
                stroke-width="2"/>


            <path
                d="
                M 35 283
                C 127 286 207 227 233 165
                M 285 77
                C 319 46 362 39 396 50
                M 324 163
                C 326 219 389 253 441 239"

                fill="none"
                stroke="url(#art-reflection)"
                stroke-width="3.5"/>


            <path
                d="
                M 80 307
                C 174 286 211 258 277 275
                S 407 320 489 283"

                fill="none"
                stroke="#b9d7d3"
                stroke-width=".9"
                opacity=".65"/>

        </g>

        `;

    }


    /* B — LONG SILK CURRENT */

    function silkCurrent() {

        return `

        <g filter="url(#art-shadow)"
           stroke-linecap="round"
           stroke-linejoin="round">

            <path
                d="
                M -80 220
                C 32 130 103 263 211 185
                C 301 120 322 42 433 61
                C 493 71 507 136 463 161
                C 430 181 391 156 402 128
                C 410 108 435 112 440 131
                C 465 106 438 87 412 94
                C 344 112 345 216 253 256
                C 131 309 60 213 -80 260 Z"

                fill="url(#art-deep)"
                stroke="url(#art-gold)"
                stroke-width="2.2"/>


            <path
                d="
                M -65 225
                C 42 168 105 266 224 205
                C 310 161 324 84 397 76
                C 435 71 463 90 463 112
                C 442 89 407 105 385 139
                C 333 223 299 264 206 267
                C 99 271 39 217 -65 245 Z"

                fill="url(#art-jade)"
                stroke="url(#art-gold)"
                stroke-width="1.5"/>


            <path
                d="
                M -30 228
                C 67 211 131 270 227 232
                C 311 199 340 111 389 98
                C 350 139 352 223 272 256
                C 156 303 83 234 -30 249 Z"

                fill="url(#art-silk)"
                stroke="url(#art-gold)"
                stroke-width="1.2"/>


            <path
                d="
                M 242 191
                C 225 158 242 127 269 124
                C 263 96 287 80 308 91
                C 320 58 354 58 371 77
                C 337 77 326 103 335 124
                C 342 143 363 141 371 127
                C 378 160 343 177 320 155
                C 300 138 312 111 291 113
                C 260 116 260 161 281 181
                C 264 193 251 195 242 191 Z"

                fill="url(#art-foam)"
                stroke="url(#art-gold)"
                stroke-width="1.5"/>


            <path
                d="
                M -50 260
                C 60 220 145 315 266 269
                C 339 241 379 168 417 170"

                fill="none"
                stroke="url(#art-gold)"
                stroke-width="2.2"/>


            <path
                d="
                M 4 231
                C 84 214 157 275 239 232
                C 312 194 328 129 370 112"

                fill="none"
                stroke="#d2e6d9"
                stroke-width="1.5"
                opacity=".75"/>

        </g>

        `;

    }


    /* C — CIRCULAR ORNAMENTAL WHORL */

    function whorl() {

        return `

        <g filter="url(#art-shadow)"
           stroke-linejoin="round"
           stroke-linecap="round">

            <path
                d="
                M 40 210
                C -25 120 35 15 130 12
                C 218 9 273 87 251 157
                C 230 226 153 248 102 205
                C 61 170 70 113 111 96
                C 148 80 187 109 178 143
                C 171 167 145 172 133 154
                C 163 158 165 119 138 119
                C 103 120 98 165 129 186
                C 173 215 224 177 216 128
                C 208 70 140 52 93 81
                C 40 114 49 185 98 224
                C 148 263 216 253 270 224
                C 218 300 99 289 40 210 Z"

                fill="url(#art-deep)"
                stroke="url(#art-gold)"
                stroke-width="2"/>


            <path
                d="
                M 48 202
                C 3 130 41 42 122 28
                C 186 17 240 68 241 124
                C 215 63 157 52 111 70
                C 47 95 47 164 79 205
                C 124 260 204 266 257 239
                C 192 290 95 267 48 202 Z"

                fill="url(#art-jade)"
                stroke="url(#art-gold)"
                stroke-width="1.4"/>


            <path
                d="
                M 99 77
                C 71 59 87 29 109 34
                C 120 9 153 13 163 35
                C 192 21 216 42 209 65
                C 200 85 177 83 174 64
                C 167 43 140 48 137 69
                C 132 91 154 99 167 91
                C 151 117 115 109 99 77 Z"

                fill="url(#art-foam)"
                stroke="url(#art-gold)"
                stroke-width="1.5"/>


            <path
                d="
                M 61 185
                C 22 106 92 39 157 52
                M 89 229
                C 147 270 216 251 244 236"

                fill="none"
                stroke="#d4e5d7"
                stroke-width="1.7"
                opacity=".7"/>

        </g>

        `;

    }


    /* D — LOW BREAKING WAVE */

    function breaker() {

        return `

        <g filter="url(#art-shadow)"
           stroke-linejoin="round"
           stroke-linecap="round">

            <path
                d="
                M -30 190
                C 47 232 100 176 142 116
                C 175 69 230 37 282 66
                C 318 86 315 125 286 139
                C 260 152 238 135 244 113
                C 251 94 275 98 276 116
                C 295 95 270 80 245 90
                C 196 109 203 177 263 191
                C 335 209 366 139 431 151
                C 393 182 392 228 330 248
                C 245 275 178 226 103 252
                C 45 272 -4 239 -30 190 Z"

                fill="url(#art-deep)"
                stroke="url(#art-gold)"
                stroke-width="2.2"/>


            <path
                d="
                M -13 209
                C 78 238 123 162 160 117
                C 198 71 245 52 283 83
                C 234 64 191 117 186 156
                C 179 209 243 237 297 221
                C 352 204 371 175 400 169
                C 360 230 307 258 236 236
                C 159 213 91 269 -13 209 Z"

                fill="url(#art-jade)"
                stroke="url(#art-gold)"
                stroke-width="1.4"/>


            <path
                d="
                M 120 166
                C 107 142 123 114 145 116
                C 136 89 159 66 181 76
                C 186 44 221 35 241 57
                C 268 44 295 63 287 85
                C 277 104 257 96 252 80
                C 232 65 207 85 209 107
                C 209 124 226 137 240 126
                C 238 155 202 160 186 137
                C 168 116 181 99 162 106
                C 142 114 142 145 157 160
                C 144 172 131 175 120 166 Z"

                fill="url(#art-foam)"
                stroke="url(#art-gold)"
                stroke-width="1.5"/>


            <path
                d="
                M 12 235
                C 88 263 154 210 225 238
                S 346 254 382 214"

                fill="none"
                stroke="url(#art-gold)"
                stroke-width="1.7"/>

        </g>

        `;

    }


    /* ==================================================
       05 — COMPOSITION AND ATMOSPHERE
       ================================================== */

    function placeWave(
        artwork,
        x,
        y,
        scale,
        rotation,
        opacity,
        delay,
        slow = false
    ) {

        return `

            <g transform="
                translate(${x} ${y})
                rotate(${rotation})
                scale(${scale})
            " opacity="${opacity}">

                <g class="${
                    slow
                        ? "art-wave-slow"
                        : "art-wave"
                }"
                style="animation-delay:${delay}s">

                    ${artwork}

                </g>

            </g>

        `;

    }


    function fineCurrents() {

        let result = "";

        for (let i = 0; i < 15; i++) {

            const offset = i * 8;

            result += `

                <path

                    d="
                    M -120 ${310 + offset}
                    C 140 ${90 + offset}
                      250 ${490 + offset}
                      470 ${270 + offset}
                    S 800 ${140 + offset}
                      1050 ${360 + offset}
                    "

                    fill="none"

                    stroke="${
                        i % 4 === 0
                            ? "#e6bd8b"
                            : "#7baaab"
                    }"

                    stroke-width="${
                        i % 4 === 0 ? 1.2 : .7
                    }"

                    opacity="${
                        i % 4 === 0 ? .28 : .14
                    }"

                />

            `;

        }

        return result;

    }


    function particles() {

        const random = seededRandom(441);

        let result = "";

        for (let i = 0; i < 100; i++) {

            const x =
                (random() * 900).toFixed(2);

            const y =
                (random() * 1100).toFixed(2);

            const radius =
                (.4 + random() * 2.2).toFixed(2);

            const delay =
                (-random() * 9).toFixed(2);

            const color =
                i % 4 === 0
                    ? "#e6bd8b"
                    : "#b9d7d3";

            result += `

                <circle

                    class="art-particle"

                    cx="${x}"
                    cy="${y}"
                    r="${radius}"

                    fill="${color}"

                    style="
                        animation-delay:${delay}s
                    "

                    opacity=".4"

                />

            `;

        }

        return result;

    }


    function foamDroplets() {

        const random = seededRandom(97);

        let result = "";

        for (let i = 0; i < 35; i++) {

            const x = 290 + random() * 540;

            const y =
                105 +
                Math.sin(x * .012) * 75 +
                random() * 100;

            const rx = .7 + random() * 4;

            const ry = rx * .55;

            result += `

                <ellipse

                    cx="${x}"
                    cy="${y}"
                    rx="${rx}"
                    ry="${ry}"

                    transform="
                        rotate(-35 ${x} ${y})
                    "

                    fill="url(#art-foam)"

                    stroke="url(#art-gold)"

                    stroke-width=".5"

                    opacity=".55"

                />

            `;

        }

        return result;

    }


    /* MAIN CONTINUOUS SVG PAINTING */

    A.art.create = function () {

        return `

        <svg

            xmlns="http://www.w3.org/2000/svg"

            viewBox="0 0 900 1100"

            preserveAspectRatio="xMidYMid slice"

            aria-hidden="true"

        >

            ${artworkDefinitions()}


            <!-- Deep atmospheric foundation -->

            <rect

                width="900"
                height="1100"

                fill="url(#art-background)"

            />


            <g class="art-mist">

                <ellipse

                    cx="660"
                    cy="260"

                    rx="440"
                    ry="350"

                    fill="url(#art-atmosphere)"

                />

                <ellipse

                    cx="110"
                    cy="790"

                    rx="430"
                    ry="380"

                    fill="url(#art-atmosphere)"

                />

            </g>


            <!-- Distant fine currents -->

            <g opacity=".8">

                ${fineCurrents()}

                <g transform="
                    translate(900 1100)
                    rotate(180)
                ">

                    ${fineCurrents()}

                </g>

            </g>


            <!-- Distant ornamental forms -->

            ${placeWave(
                silkCurrent(),
                -100, 40,
                1.3, -17,
                .28, -8, true
            )}

            ${placeWave(
                whorl(),
                630, 390,
                1.1, 20,
                .38, -4, true
            )}


            <!-- Main sweeping composition -->

            ${placeWave(
                silkCurrent(),
                -200, 370,
                1.9, -30,
                .95, -3
            )}

            ${placeWave(
                crest(),
                80, 110,
                1.65, -13,
                1, -7, true
            )}

            ${placeWave(
                breaker(),
                510, 325,
                1.05, 24,
                .9, -5
            )}


            <!-- Central descending current -->

            ${placeWave(
                silkCurrent(),
                920, 470,
                1.55, 152,
                .88, -10, true
            )}

            ${placeWave(
                whorl(),
                -70, 510,
                1.25, -22,
                .9, -6
            )}


            <!-- Lower foreground forms -->

            ${placeWave(
                breaker(),
                140, 730,
                1.6, -25,
                .98, -2
            )}

            ${placeWave(
                crest(),
                920, 1020,
                1.1, 173,
                .86, -11, true
            )}

            ${placeWave(
                silkCurrent(),
                -140, 930,
                1.6, -9,
                .82, -4
            )}


            <!-- Long illuminated threads -->

            <g

                fill="none"

                stroke="url(#art-gold)"

                stroke-linecap="round"

            >

                <path

                    class="art-current"

                    d="
                    M -80 420
                    C 120 210 360 540 620 330
                    S 900 220 1020 340
                    "

                    stroke-width="1.6"

                    opacity=".65"

                />

                <path

                    d="
                    M -100 690
                    C 160 870 340 440 610 620
                    S 860 760 1000 530
                    "

                    stroke-width="1.1"

                    opacity=".6"

                />

                <path

                    class="art-current"

                    d="
                    M -80 1010
                    C 130 870 290 1080 530 880
                    S 800 760 990 860
                    "

                    stroke-width="1.4"

                    opacity=".6"

                />

            </g>


            <!-- Suspended water and gold dust -->

            ${foamDroplets()}

            ${particles()}


            <!-- Soft atmospheric light -->

            <ellipse

                cx="730"
                cy="160"

                rx="240"
                ry="160"

                fill="url(#art-atmosphere)"

                opacity=".25"

            />


            <!-- Fine paper / pigment grain -->

            <rect

                width="900"
                height="1100"

                filter="url(#art-grain)"

                opacity=".065"

                style="mix-blend-mode:soft-light"

            />

        </svg>

        `;

    };


    /* ==================================================
       06 — MENU ORNAMENTS
       ================================================== */

    function arrowIcon() {

        return `

            <svg

                viewBox="0 0 24 24"

                width="100%"
                height="100%"

                fill="none"

                aria-hidden="true"

            >

                <path

                    d="M5 19L19 5M7 5H19V17"

                    stroke="currentColor"

                    stroke-width="1.1"

                    stroke-linecap="round"

                    stroke-linejoin="round"

                />

            </svg>

        `;

    }


    function ornamentalSeal() {

        return `

            <svg

                viewBox="0 0 80 80"

                fill="none"

                stroke="currentColor"

                aria-hidden="true"

            >

                <circle
                    cx="40" cy="40"
                    r="37"
                    stroke-width=".7"/>

                <circle
                    cx="40" cy="40"
                    r="32"
                    stroke-width=".5"/>

                <path

                    d="
                    M40 8
                    L72 40
                    L40 72
                    L8 40 Z
                    "

                    stroke-width=".6"

                />

                <path

                    d="
                    M17 46
                    C30 52 35 27 48 29
                    C60 31 57 45 48 43
                    C43 42 44 35 49 36
                    C36 29 38 54 23 54
                    "

                    stroke-width="1.2"

                />

                <path

                    d="
                    M24 59
                    C38 48 50 62 61 48
                    M19 22
                    H61
                    "

                    stroke-width=".7"

                />

                <circle
                    cx="40" cy="16"
                    r="1.5"
                    fill="currentColor"/>

            </svg>

        `;

    }


    /* ==================================================
       07 — MENU HEADER
       ================================================== */

    function createHeader() {

        const header =
            element("header", "menu-header");

        const brand =
            element("div", "brand");

        brand.append(

            element(
                "p",
                "brand-kicker",
                A.config.subtitle
            ),

            element(
                "h1",
                "brand-title",
                A.config.name + "."
            )

        );

        const edition =
            element("div", "header-edition");

        edition.append(

            element(
                "span",
                "edition-number",
                A.config.edition
            ),

            element(
                "span",
                "edition-label",
                "Worldbuilding"
            )

        );

        header.append(brand, edition);

        return header;

    }


    /* ==================================================
       08 — INDIVIDUAL MENU PANELS
       ================================================== */

    function createPanel(item) {

        const panel = element(

            "button",

            "menu-panel " + item.className

        );

        panel.type = "button";

        panel.dataset.action = item.id;

        const available =
            item.enabled ||
            A.app.hasAction(item.id);

        panel.setAttribute(

            "aria-disabled",

            String(!available)

        );

        panel.setAttribute(

            "aria-label",

            item.title +
            (
                item.italicTitle
                    ? " " + item.italicTitle
                    : ""
            ) +
            (
                available
                    ? ""
                    : " — not available yet"
            )

        );


        /* Upper editorial label */

        const top =
            element("div", "panel-top");

        top.append(

            element(
                "span",
                "panel-index",
                item.index + " /"
            ),

            element(
                "span",
                "panel-category",
                item.category
            )

        );


        /* Lower title and description */

        const bottom =
            element("div", "panel-bottom");

        const title =
            element(
                "h2",
                "panel-title",
                item.title
            );

        if (item.italicTitle) {

            title.append(

                element(
                    "em",
                    "",
                    item.italicTitle
                )

            );

        }

        bottom.append(

            title,

            element(
                "p",
                "panel-description",
                item.description
            )

        );


        /* Decorative arrow */

        const arrow =
            element("span", "panel-arrow");

        arrow.innerHTML = arrowIcon();


        panel.append(top, bottom, arrow);


        /* Hero-specific ornamental seal */

        if (item.id === "archive") {

            const seal =
                element("div", "hero-seal");

            seal.innerHTML =
                ornamentalSeal();

            panel.append(seal);

        }


        /*
           Actions can be registered by
           future modules without editing
           this function.
        */

        panel.addEventListener("click", () => {

            if (A.app.hasAction(item.id)) {

                A.app.runAction(item.id);

            }

        });

        return panel;

    }


    /* ==================================================
       09 — MENU FOOTER
       ================================================== */

    function createFooter() {

        const footer =
            element("footer", "menu-footer");

        const phrase =
            element(
                "span",
                "footer-phrase",
                A.config.footer
            );

        const ornament =
            element("div", "footer-ornament");

        ornament.append(

            element(
                "span",
                "footer-diamond"
            )

        );

        const version =
            element(
                "span",
                "footer-version",
                "V" + A.config.version
            );

        footer.append(

            phrase,

            ornament,

            version

        );

        return footer;

    }


    /* ==================================================
       10 — MAIN MENU PAGE
       ================================================== */

    A.app.registerPage("menu", root => {

        const menu =
            element("main", "main-menu");

        const composition =
            element(
                "section",
                "menu-composition"
            );

        composition.setAttribute(

            "aria-label",

            "Main menu"

        );


        /*
           One SVG behind every panel.
           No independent background images.
        */

        const artwork =
            element("div", "menu-artwork");

        artwork.innerHTML =
            A.art.create();

        composition.append(artwork);


        for (const item of A.menu) {

            composition.append(

                createPanel(item)

            );

        }


        menu.append(

            createHeader(),

            composition,

            createFooter()

        );

        root.append(menu);

    });


    /* ==================================================
       11 — APPLICATION STARTUP

       DOMContentLoaded runs after the entire
       script, including appended modules.
       ================================================== */

    if (document.readyState === "loading") {

        document.addEventListener(

            "DOMContentLoaded",

            () => A.app.start(),

            { once: true }

        );

    } else {

        queueMicrotask(
            () => A.app.start()
        );

    }


})();


/* ==================================================

   FUTURE FEATURE MODULES

   Append all new application modules below.

   Example:

   Aether.app.registerPage(
       "archive",
       (root) => {
           // Render the archive here.
       }
   );

   Aether.app.registerAction(
       "archive",
       () => {
           Aether.app.navigate("archive");
       }
   );

   No modifications to the menu renderer
   are required to activate the archive.

   ================================================== */


/* ==================================================
   V1.2 — IMPORT, EXPORT & AUTOSAVE
   ================================================== */

(() => {

    "use strict";

    const A = window.Aether;


    /* ==================================================
       01 — NOTIFICATION SYSTEM
       ================================================== */

    A.notify = function (

        title,
        message = "",
        type = "success",
        duration = 3500

    ) {

        const root =
            document.getElementById(
                "notification-root"
            );

        if (!root) return;

        /*
           Only one notification is shown
           at a time.
        */

        root.replaceChildren();


        const notification =
            document.createElement("div");

        notification.className =
            "aether-notification";

        if (type === "error") {

            notification.classList.add(
                "is-error"
            );

        }


        const symbol =
            document.createElement("span");

        symbol.className =
            "notification-symbol";

        symbol.setAttribute(
            "aria-hidden",
            "true"
        );


        const content =
            document.createElement("div");

        content.className =
            "notification-content";


        const heading =
            document.createElement("p");

        heading.className =
            "notification-title";

        heading.textContent = title;


        const description =
            document.createElement("p");

        description.className =
            "notification-message";

        description.textContent = message;


        content.append(
            heading,
            description
        );

        notification.append(
            symbol,
            content
        );

        root.append(notification);


        setTimeout(() => {

            notification.classList.add(
                "is-leaving"
            );

            setTimeout(() => {

                notification.remove();

            }, 450);

        }, duration);

    };


    /* ==================================================
       02 — CENTRALIZED SAVE SYSTEM
       ================================================== */

    let saveTimer = null;

    let dirty = false;

    let storageProtected = false;

    let importInProgress = false;


    A.app.save = function (
        options = {}
    ) {

        const silent =
            options.silent !== false;

        clearTimeout(saveTimer);

        saveTimer = null;


        if (!this.database) {

            return false;

        }


        /*
           If an existing database failed to load,
           do not overwrite it automatically.
        */

        if (storageProtected) {

            if (!silent) {

                A.notify(

                    "Storage protected",

                    "The previous database could not be loaded. Restore a valid backup first.",

                    "error",

                    6000

                );

            }

            return false;

        }


        try {

            const saved =
                A.storage.save(
                    this.database
                );

            /*
               Keep the current database reference
               intact during ordinary saves.
            */

            this.database.metadata.updatedAt =
                saved.metadata.updatedAt;

            this.database.appVersion =
                saved.appVersion;

            dirty = false;


            this.emit(

                "database:saved",

                this.database

            );


            if (!silent) {

                A.notify(

                    "Preserved",

                    "Your world has been saved locally."

                );

            }

            return true;

        } catch (error) {

            console.error(
                "Aether save error:",
                error
            );

            dirty = true;

            A.notify(

                "Unable to save",

                "Local storage may be full or unavailable. Export a backup to preserve your work.",

                "error",

                6500

            );

            return false;

        }

    };


    /* ==================================================
       03 — AUTOMATIC SAVING

       Future modules call markDirty()
       after modifying the database.
       ================================================== */

    A.app.markDirty = function () {

        dirty = true;

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {

            this.save({

                silent: true

            });

        }, 400);

        this.emit(

            "database:changed",

            this.database

        );

    };


    A.app.isDirty = function () {

        return dirty;

    };


    A.app.flushSave = function () {

        if (!dirty) {

            return true;

        }

        return this.save({

            silent: true

        });

    };


    /* ==================================================
       04 — DATABASE MODULE ACCESS
       ================================================== */

    A.app.getModule = function (name) {

        if (!this.database) {

            throw new Error(
                "The database has not been initialized."
            );

        }

        if (
            !Object.prototype.hasOwnProperty.call(
                this.database.modules,
                name
            )
        ) {

            throw new Error(
                "Unknown database module: " + name
            );

        }

        return this.database.modules[name];

    };


    /*
       A safe centralized way for future
       modules to modify their data.
    */

    A.app.updateModule = function (

        name,
        updater

    ) {

        if (
            typeof updater !== "function"
        ) {

            throw new Error(
                "A module updater must be a function."
            );

        }

        const current =
            this.getModule(name);

        const draft =
            A.utils.clone(current);

        const result =
            updater(draft);

        if (
            result &&
            typeof result.then === "function"
        ) {

            throw new Error(
                "Module updates must be synchronous."
            );

        }

        const next =

            result === undefined

                ? draft

                : result;


        const candidate =
            A.utils.clone(
                this.database
            );

        candidate.modules[name] = next;

        A.data.validate(candidate);

        A.data.validateModules(candidate);


        this.database.modules[name] =
            next;

        this.markDirty();

        return next;

    };


    /* ==================================================
       05 — EXPORT

       Direct JSON download.
       No new page or custom dialog.
       ================================================== */

    A.app.exportDatabase = function () {

        if (!this.database) {

            A.notify(

                "Nothing to preserve",

                "No world database is currently loaded.",

                "error"

            );

            return false;

        }


        try {

            /*
               Attempt to save pending changes.

               Even if local storage is unavailable,
               exporting can still preserve the
               current in-memory database.
            */

            this.flushSave();


            const serialized =
                A.data.serialize(
                    this.database
                );


            const filename =
                A.data.backupFilename(
                    this.database
                );


            const blob = new Blob(

                [serialized],

                {

                    type:
                        "application/json;charset=utf-8"

                }

            );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");

            link.href = url;

            link.download = filename;

            link.style.display = "none";


            document.body.append(link);

            link.click();

            link.remove();


            /*
               Delay URL cleanup for mobile browsers.
            */

            setTimeout(() => {

                URL.revokeObjectURL(url);

            }, 60000);


            A.notify(

                "Backup prepared",

                "Your world has been exported as a JSON file."

            );


            this.emit(

                "database:exported",

                {

                    filename,

                    exportedAt:
                        A.utils.now()

                }

            );

            return true;

        } catch (error) {

            console.error(
                "Aether export error:",
                error
            );

            A.notify(

                "Export failed",

                error.message ||
                "The backup could not be created.",

                "error",

                5500

            );

            return false;

        }

    };


    /* ==================================================
       06 — IMPORT

       Validate first.
       Preserve previous database.
       Replace only after successful storage.
       ================================================== */

    A.app.importDatabase = async function (
        file
    ) {

        if (!file) return false;

        if (importInProgress) {

            return false;

        }

        importInProgress = true;


        try {

            /*
               Basic protection against
               accidentally selecting huge files.
            */

            const MAX_FILE_SIZE =
                50 * 1024 * 1024;

            if (
                file.size > MAX_FILE_SIZE
            ) {

                throw new Error(

                    "The selected backup exceeds the 50 MB import limit."

                );

            }


            /* READ FILE */

            const text =
                await file.text();


            /* VALIDATE AND MIGRATE */

            const imported =
                A.data.deserialize(text);


            /*
               All validation happens before
               modifying the current database.
            */


            /* PRESERVE CURRENT DATABASE */

            if (storageProtected) {

                /*
                   Keep the original unreadable
                   database as a raw recovery copy.
                */

                const original =
                    localStorage.getItem(
                        A.config.storageKey
                    );

                if (original !== null) {

                    localStorage.setItem(

                        A.config.storageKey +
                        "-recovery",

                        original

                    );

                }

            } else if (this.database) {

                A.storage.createRecovery(
                    this.database
                );

            }


            /* SAVE IMPORTED DATABASE */

            const saved =
                A.storage.save(imported);


            /*
               The import has now been validated
               and successfully persisted.
            */

            clearTimeout(saveTimer);

            saveTimer = null;

            dirty = false;

            storageProtected = false;

            this.database = saved;


        } catch (error) {

            console.error(
                "Aether import error:",
                error
            );

            A.notify(

                "Restore failed",

                error.message ||
                "The selected database could not be restored.",

                "error",

                6500

            );

            importInProgress = false;

            return false;

        }


        importInProgress = false;


        /*
           Notify future modules that the entire
           database has been replaced.
        */

        try {

            this.emit(

                "database:replaced",

                this.database

            );

            this.navigate("menu");

        } catch (error) {

            console.error(

                "Database restored, but interface refresh failed:",

                error

            );

            A.notify(

                "World restored",

                "The database was saved. Reload the page to refresh the interface.",

                "success",

                5500

            );

            return true;

        }


        A.notify(

            "World restored",

            this.database.metadata.name +
            " has been successfully restored."

        );

        return true;

    };


    /* ==================================================
       07 — NATIVE FILE PICKER
       ================================================== */

    let fileInput = null;


    function createFileInput() {

        if (fileInput) {

            return fileInput;

        }


        fileInput =
            document.createElement("input");

        fileInput.type = "file";

        fileInput.accept =
            ".json,application/json";

        fileInput.multiple = false;

        fileInput.className =
            "aether-file-input";

        fileInput.tabIndex = -1;

        fileInput.setAttribute(

            "aria-hidden",

            "true"

        );


        fileInput.addEventListener(

            "change",

            async () => {

                const file =
                    fileInput.files?.[0];

                /*
                   Reset selection so the same
                   file can be selected again.
                */

                fileInput.value = "";

                if (!file) return;

                await A.app.importDatabase(
                    file
                );

            }

        );


        document.body.append(
            fileInput
        );

        return fileInput;

    }


    A.app.openImportPicker = function () {

        if (importInProgress) return;

        const input =
            createFileInput();

        input.value = "";

        /*
           This is called directly from the
           user's button click, maintaining
           mobile browser user activation.
        */

        input.click();

    };


    /* ==================================================
       08 — REGISTER MENU ACTIONS

       No modifications to the original
       menu renderer are necessary.
       ================================================== */

    A.app.registerAction(

        "export",

        () => {

            A.app.exportDatabase();

        }

    );


    A.app.registerAction(

        "import",

        () => {

            A.app.openImportPicker();

        }

    );


    /* ==================================================
       09 — RECOVERY FOUNDATION

       Reserved for a future recovery/settings
       interface. No additional menu button yet.
       ================================================== */

    A.app.restoreRecovery = function () {

        try {

            const recovery =
                A.storage.loadRecovery();

            if (!recovery) {

                throw new Error(
                    "No recovery copy is available."
                );

            }

            const saved =
                A.storage.save(recovery);

            clearTimeout(saveTimer);

            saveTimer = null;

            this.database = saved;

            storageProtected = false;

            dirty = false;

        } catch (error) {

            A.notify(

                "Recovery failed",

                error.message,

                "error"

            );

            return false;

        }

        this.emit(

            "database:replaced",

            this.database

        );

        this.navigate("menu");

        A.notify(

            "World recovered",

            "The previous database has been restored."

        );

        return true;

    };


    /* ==================================================
       10 — EXTENDED APPLICATION STARTUP

       Replaces the behavior of the original
       start() function without editing it.
       ================================================== */

    A.app.start = function () {

        let startupError = null;


        try {

            const existing =
                A.storage.load();

            if (existing) {

                this.database = existing;

            } else {

                this.database =
                    A.data.create();

            }

        } catch (error) {

            console.error(

                "Aether startup storage error:",

                error

            );

            /*
               Do not destroy an unreadable
               existing database.
            */

            storageProtected = true;

            this.database =
                A.data.create();

            startupError = error;

        }


        this.navigate("menu");


        if (startupError) {

            A.notify(

                "Storage unavailable",

                "The existing database could not be loaded. Restore a valid backup before saving.",

                "error",

                7000

            );

        } else {

            /*
               Persist the initialized database,
               including any newly registered modules.
            */

            this.save({

                silent: true

            });

        }


        this.emit(

            "database:ready",

            this.database

        );

    };


    /* ==================================================
       11 — MOBILE LIFECYCLE SAVING

       Save pending changes when the user
       switches apps or leaves the website.
       ================================================== */

    document.addEventListener(

        "visibilitychange",

        () => {

            if (
                document.visibilityState === "hidden"
            ) {

                A.app.flushSave();

            }

        }

    );


    window.addEventListener(

        "pagehide",

        () => {

            A.app.flushSave();

        }

    );


})();


/* ==================================================
   END V1.2 — IMPORT, EXPORT & AUTOSAVE

   Append future application modules below.

   Available interfaces:

   Aether.app.save()
   Aether.app.markDirty()
   Aether.app.flushSave()

   Aether.app.getModule(name)
   Aether.app.updateModule(name, updater)

   Aether.app.exportDatabase()
   Aether.app.importDatabase(file)

   Aether.app.restoreRecovery()

   Aether.notify(title, message, type)

   Database events:

   database:ready
   database:changed
   database:saved
   database:replaced
   database:exported

   ================================================== */
