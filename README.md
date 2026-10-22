# Potion Atelier · v1.0.0

**Kedai di ujung hujan.** Game meracik ramuan yang tenang: meja kayu, lentera hangat, buku resep dan enam racikan khayalan. Dibangun dengan Astra (`gpt-6-astra`), dengan pemeriksaan mekanik, permainan browser dan penerimaan terpisah oleh parent.

**Main langsung:** https://aichrisz.github.io/potion-atelier/
**Source:** https://github.com/aichrisz/potion-atelier

Dipublikasikan atas permintaan Abel. GitHub Pages hanya menyajikan tujuh berkas runtime; HTML mandiri tetap bisa dimainkan offline. Source rilis asli berada pada tag `v1.0.0`; dokumentasi publikasi terbaru berada di `main`. Lihat [catatan deployment](docs/deployment.md).

## Mainkan

- Buka `index.html` dari folder source, atau buka HTML mandiri `artifacts/Potion-Atelier.html` setelah menjalankan `npm run export`.
- HTML mandiri menyertakan seluruh CSS, JavaScript dan SVG. Tidak memerlukan file tetangga, internet, akun, backend, font eksternal atau tracker.
- Source ZIP lengkap dihasilkan oleh `npm run package` menjadi `artifacts/Potion-Atelier-source.zip`. Build tujuh file runtime berada di `dist/`.
- Untuk server lokal opsional: `npm start`, lalu kunjungi `http://127.0.0.1:4186`.

### Satu giliran

1. **Buka kedai.** Ada 180 detik **waktu aktif**; tidak ada pelanggan yang kedaluwarsa atau persediaan yang habis.
2. **Pilih tiga bahan berbeda** sesuai pesanan. Tombol bahan bisa dipilih ulang untuk membatalkan.
3. **Panaskan.** Penggeser mengatur besar api, bukan memalsukan suhu. Suhu berubah bertahap; angkat kuali ketika berada di pita sasaran. Minimal satu detik pemanasan aktif.
4. **Aduk.** Setelah diangkat, jarum bergerak bolak-balik. Botolkan ketika jarum berada di pita sasaran; minimal 0,25 detik pengadukan aktif.
5. **Periksa dan serahkan.** Botol menampilkan kualitas, rincian poin dan pembayaran yang akan diterima. Koin baru masuk ketika menekan **Serahkan ramuan**, bukan saat membotolkan.
6. Hasil akhir merangkum pesanan, kualitas, koin dan reputasi. **Giliran berikutnya** membuka toko kembali dengan statistik giliran yang bersih dan progres tersimpan.

Resep pertama: **Embun Tidur** — Lavender Bulan, Embun Kristal, Mint Perak; suhu 38–48°, adukan 35–55%. Setelan api besar mempercepat pemanasan, tetapi suhu dapat melewati sasaran. Tidak ada penalti uang untuk mengulang racikan; waktu giliran tetap berjalan.

### Enam resep

Awalnya **tiga resep** tersedia. Setiap giliran selesai membuka **satu resep lagi** sampai keenamnya terbuka. Resep yang baru terbuka menjadi pesanan pertama pada giliran berikutnya; pelanggan hanya memesan resep yang sudah tersedia. Urutan berikutnya berputar deterministik agar semua resep terbuka benar-benar bisa dimainkan.

- Embun Tidur — lavender, embun, mint; 38–48°; 35–55%.
- Kelopak Pulih — kelopak, embun, mint; 60–70°; 50–70%.
- Pijar Berani — jamur, kelopak, anis; 72–82°; 65–82%.
- Ingatan Bening — lavender, embun, anis; 45–55°; 25–45%.
- Senyum Senja — kelopak, anis, mint; 55–65°; 40–58%.
- Langkah Ringan — lavender, jamur, mint; 30–40°; 30–50%.

Nama lengkap bahan dan harga dasar tersedia dalam buku resep. Semua bahan dan efek ramuan adalah bagian dari dunia fiksi permainan.

### Kualitas dan reputasi

- Bahan yang tepat memberi 60 poin; bahan keliru memberi 0 poin.
- Suhu dan adukan masing-masing memberi hingga 20 poin berdasarkan jarak dari pita sasaran. Nilai akhir dibulatkan dan dibatasi 0–100.
- Kualitas di bawah 50 tidak dibayar. Selebihnya: `round(hargaDasar × (kualitas / 100)²)` koin virtual.
- Reputasi awal 50; kualitas ≥85 menambah 3, kualitas ≥50 menambah 1, selebihnya mengurangi 4; selalu dibatasi 0–100.
- Hanya ramuan yang diserahkan dihitung/dibayar. Botol yang belum diserahkan ketika waktu habis tidak dibayar. Aktivasi ganda tidak menggandakan pembayaran atau progres.

## Kontrol dan jeda

Mouse, tombol native dan sentuhan didukung. `Tab` berpindah kontrol; `Enter`/`Spasi` mengaktifkan tombol; panah/`Home`/`End` mengatur api. `P` atau `Esc` menjeda, termasuk ketika fokus berada pada kontrol bahan/api. Tidak ada pembajakan tombol native untuk meracik secara tersembunyi.

Kehilangan fokus atau meninggalkan tab menjeda permainan. Waktu, suhu dan jarum berhenti; **Lanjutkan** diperlukan secara eksplisit, tanpa mengejar waktu yang hilang. Pengaturan **Dekorasi** dan preferensi minim gerak perangkat mengurangi gerakan hiasan saja, bukan simulasi suhu atau indikator adukan. Hujan pada ilustrasi jendela merupakan gambar; kontrol dekorasi memengaruhi gelembung/api hias.

## Penyimpanan

Key khusus proyek: `potion-atelier.progress.v1`. Progres disimpan **hanya setelah giliran selesai**, mencakup jumlah giliran, koin total/rekor, kualitas terbaik dan reputasi. Racikan/giliran aktif tidak dilanjutkan sesudah reload. Selama halaman tetap terbuka, progres tetap tersedia meski penyimpanan browser ditolak; UI menjelaskan mode sesi saja.

Data JSON dibatasi ukurannya, menggunakan schema versi dan whitelist integer terbatas. Data rusak, terlalu besar, salah tipe atau di luar batas tidak bisa membuka resep palsu, merusak hitungan atau disisipkan sebagai HTML. Profil berasal dari penyimpanan origin browser: file mandiri, folder source dan server lokal dapat memiliki penyimpanan yang berbeda. Browser yang memblokir penyimpanan `file://` tetap bisa memainkan game, tanpa jaminan progres lintas sesi.

## Arsitektur

```text
Kontrol native / lifecycle browser
              │
              ▼
 app.js — event, satu clock aktif, fokus, storage
              │ perintah + delta waktu
              ▼
 engine.js — aturan murni, resep, kualitas, transaksi, progres
              │ snapshot/profile terpisah
              ▼
 view.js — DOM/SVG stabil, angka, target, buku resep
```

`engine.js` tidak bergantung pada DOM, animasi, storage atau jaringan. Tahap `ingredients → heating → stirring → bottled → serve` berjalan hanya pada fase `running`; fase lainnya `ready`, `paused`, `results`. Input tidak sah ditolak tanpa mutasi domain. Penyelesaian giliran memiliki satu batas transaksi yang memperbarui profil tepat sekali.

Pemanasan memakai integrasi Newton analitis per delta aktif, dibatasi suhu 20–100. Jarum adalah gelombang segitiga 0–100–0 dengan periode 2,4 detik aktif. Delta besar dijepit ke sisa waktu, bukan menambahkan frame fiktif. Controller hanya mempertahankan satu rantai `requestAnimationFrame` saat bermain dan menghentikannya pada menu/jeda/hasil. View mempertahankan elemen kontrol agar fokus keyboard tidak terhapus oleh render.

API yang sama tersedia untuk browser dan CommonJS: `Engine.create({profile, seed})`, lalu `startShift`, `pause`, `resume`, `step(seconds)`, `toggleIngredient(id)`, `resetBrew`, `setHeat(power)`, `advance`, `snapshot`, `profile`. `seed` diterima tetapi tidak digunakan karena urutan pelanggan/resep deterministik, bukan acak. Tabel konten immutable dan snapshot/profil detached; tidak ada mutable live-game test hook.

## Reproduksi dan pengujian

Runtime tanpa dependensi. Node **20+**/npm diperlukan untuk tooling dan pengujian (host verifikasi: Node26.7.0, npm11.19.0); **Python 3** diperlukan untuk `npm run package`. Dev dependency dipin: `@playwright/test` **1.64.1**, `axe-core` **4.14.0**. Instalasi tanpa lifecycle scripts:

```sh
npm ci --ignore-scripts
npm run verify
npm run package
```

`verify` menjalankan pemeriksaan syntax/allowlist, build, ekspor, unit, Playwright, play-through tambahan untuk **source + dist + HTML offline**, matriks edge dan audit dependensi online dengan timeout terbatas. Pada penerimaan lokal awal, pemeriksaan permainan lulus tetapi endpoint audit online timeout; hasil nol temuan saat itu berasal dari cache. **Pada preflight publikasi 2026-10-22, audit online berhasil (exit 0), dengan nol kerentanan yang dilaporkan.** Bukti baru ini tidak mengubah riwayat keterbatasan audit lokal sebelumnya. Untuk mengulang dengan cache yang tersedia, gunakan `npm run verify:offline`; opsi itu sengaja diberi nama berbeda agar tidak menyamarkan freshness. Hasil parent: **17unit + 9Playwright**, tanpa skipped/flaky; **12edge scenarios** dan ketiga varian runtime lulus. `test:manual` adalah nama harness otomatis tambahan, **bukan** bukti acceptance manual manusia. Log parent berada di `artifacts/acceptance/` dan `artifacts/parent/`; ringkasan Playwright di `artifacts/playwright-results.json`.

Chromium host ini memakai `/root/.hermes/tools/chromium-1208/chrome-linux/chrome`. Untuk mesin lain, set `CHROMIUM_PATH` ke browser Chromium yang tersedia. Jika memakai unduhan Playwright:

```sh
npx playwright install chromium
export CHROMIUM_PATH="$(node -p "require('@playwright/test').chromium.executablePath()")"
npm run verify
```

Playwright diserialkan agar tidak berebut output/server. Helper memakai root repo, bukan current working directory. Server loopback hanya menyajikan tujuh file runtime; private paths, source tooling dan symlink ditolak. Builder memeriksa setiap leluhur output sebelum menulis. Ini pengamanan checkout lokal, bukan sandbox terhadap penyerang yang sudah memiliki akses tulis konkuren ke filesystem proses.

## Batas verifikasi

Cakupan nyata meliputi Chromium headless, emulasi sentuh, keyboard native, ukuran 320–1440, file offline, penyimpanan bermasalah, lifecycle yang disimulasikan dan axe WCAG/best-practice. Safari/Firefox, perangkat sentuh fisik dan pengujian pembaca layar manual belum dijalankan. Axe tidak membuktikan kesetaraan penuh permainan berwaktu bagi pembaca layar. Riwayat RED/GREEN dan perbedaan antara TDD awal, regresi parent serta perluasan coverage dicatat jujur dalam `docs/tdd-evidence.md`.
