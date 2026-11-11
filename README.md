# LinguaQuest

Website belajar banyak bahasa dengan nuansa game. HTML + CSS + JavaScript vanilla (ES Modules), tanpa build tools.

## Struktur folder

```
linguaQuest/
├── index.html
├── assets/
│   ├── logo.svg        # logo resmi (favicon)
│   ├── icon-32.png
│   ├── icon-180.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── og-image.png    # pratinjau Open Graph (1200×630)
│   └── site.webmanifest
├── css/
│   └── main.css
├── js/
│   ├── app.js          # router & views
│   ├── state.js        # state + LocalStorage
│   ├── lessons.js      # pembangun sesi latihan
│   ├── exercises.js    # 6 tipe latihan
│   ├── ui.js           # helper UI, maskot, confetti
│   └── audio.js        # efek suara (Web Audio)
├── data/
│   ├── languages.js    # registry
│   └── en.js, ja.js, ko.js, zh.js, ar.js, es.js, fr.js, de.js
├── vendor/
│   ├── fonts/          # Baloo 2 + DM Sans (lokal, siap offline)
│   └── fontawesome/    # Font Awesome 6 Free (lokal, siap offline)
└── README.md
```

Semua aset visual (Font Awesome + font) disimpan lokal, jadi UI tetap tampil benar tanpa internet.

## Menjalankan

Karena memakai ES Modules, buka lewat server statis (bukan file://).

Termux / Linux:
```sh
cd linguaQuest
python3 -m http.server 8080
```
lalu buka http://localhost:8080

Atau dengan Node:
```sh
npx serve .
```

Progres disimpan di LocalStorage browser. Untuk reset, buka Pengaturan → Reset.