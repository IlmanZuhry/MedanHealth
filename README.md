# MedanHealth 

**Dashboard Spasial Persebaran Fasilitas Kesehatan Kota Medan**

MedanHealth adalah aplikasi WebGIS berbasis peta interaktif untuk melihat persebaran rumah sakit dan fasilitas kesehatan di Kota Medan, Sumatera Utara. Pengguna bisa mencari fasilitas, memfilter berdasarkan kategori, mengecek layanan IGD, dan mengetahui rumah sakit terdekat dari lokasi mereka.

Proyek ini mengangkat masalah spasial **distribusi aksesibilitas layanan kesehatan terhadap pemukiman Kota Medan**, dan terkait dengan:

- **SDG 11** – Kota dan Permukiman yang Berkelanjutan
- **SDG 9** – Industri, Inovasi, dan Infrastruktur

## Fitur

- **Peta interaktif** dengan 3 pilihan basemap: Peta Jalan (OSM), Peta Jalan (Esri), dan Citra Satelit (Esri).
- **Ringkasan KPI** jumlah fasilitas per kategori:
  - 🔴 RS Pemerintah / TNI
  - 🔵 RS Umum
  - 🟣 RS Khusus / RSIA
  - 🟢 Puskesmas / Klinik
- **Pencarian** berdasarkan nama fasilitas atau nama jalan.
- **Filter kategori** dan filter **IGD 24 Jam** (berdasarkan tag `emergency=yes` di OpenStreetMap).
- **Daftar lokasi interaktif**: klik item untuk terbang ke lokasi dan membuka popup detail (alamat, IGD, telepon, website, koordinat).
- **Deteksi lokasi pengguna** 📍: daftar otomatis diurutkan dari fasilitas terdekat, lengkap dengan garis jarak ke fasilitas terdekat.
- **Alat ukur jarak manual** 📏: klik beberapa titik di peta untuk menghitung total jarak.
- **Legenda peta** dan **tampilan responsif** (panel data bisa dibuka-tutup di perangkat mobile).

## Teknologi

| Komponen | Keterangan |
| --- | --- |
| HTML, CSS, JavaScript (vanilla) | Struktur, tampilan, dan logika aplikasi |
| [Leaflet 1.9.4](https://leafletjs.com/) | Library peta interaktif |
| OpenStreetMap & Esri | Sumber tile basemap |
| Plus Jakarta Sans | Font (Google Fonts) |
| GeoJSON | Format data fasilitas kesehatan |

Tidak butuh build tool, framework, maupun API key.

## Struktur Proyek

```
MedanHealth/
├── index.html        # Halaman utama dan layout dashboard
├── app.js            # Logika peta, filter, klasifikasi, dan perhitungan jarak
├── style.css         # Styling dashboard
└── data/
    └── RS.geojson    # Data titik fasilitas kesehatan (hasil Overpass Turbo)
```

## Menjalankan Secara Lokal

1. Clone repositori:

   ```bash
   git clone https://github.com/IlmanZuhry/MedanHealth.git
   cd MedanHealth
   ```

2. Jalankan web server lokal. Ini wajib karena `app.js` memuat `data/RS.geojson` lewat `fetch`, sehingga tidak bisa jalan jika `index.html` dibuka langsung (`file://`):

   ```bash
   # Python
   python -m http.server 8000

   # atau Node.js
   npx serve
   ```

3. Buka `http://localhost:8000` di browser.

> Fitur deteksi lokasi hanya berfungsi di `localhost` atau situs berprotokol **HTTPS**, dan butuh izin lokasi dari browser.

## Data

- **Sumber:** [OpenStreetMap](https://www.openstreetmap.org/) melalui [Overpass Turbo](https://overpass-turbo.eu/), berlisensi [ODbL](https://opendatacommons.org/licenses/odbl/).
- **Format:** GeoJSON `FeatureCollection` berisi titik (`Point`) fasilitas kesehatan, dengan atribut seperti `name`, `amenity`, `healthcare`, `emergency`, `addr:*`, `phone`, dan `website`.

### Klasifikasi Kategori

Kategori ditentukan otomatis di `app.js` berdasarkan tag `operator:type` dan kata kunci pada nama fasilitas (misalnya `rsud`, `rsup`, `puskesmas`, `klinik`, `rsia`). Karena berbasis kata kunci, hasilnya bisa meleset untuk nama yang tidak lazim.

### Memperbarui Data

1. Buka Overpass Turbo dan jalankan query untuk fasilitas kesehatan di area Kota Medan.
2. Ekspor hasilnya sebagai **GeoJSON**.
3. Timpa file `data/RS.geojson` dengan hasil ekspor tersebut.

## Catatan & Keterbatasan

- Jarak dihitung dengan rumus **Haversine** (garis lurus), bukan jarak tempuh lewat jalan.
- Kelengkapan data (alamat, telepon, status IGD) mengikuti kontribusi OpenStreetMap. Status "Tidak tercantum" berarti datanya belum diisi, bukan berarti layanan tidak ada.
- Informasi di aplikasi ini bersifat informatif. Untuk kondisi darurat, hubungi layanan darurat setempat.

## Kontribusi

Kontribusi sangat terbuka. Silakan fork repositori ini, buat branch baru, lalu ajukan pull request. Perbaikan data di OpenStreetMap juga ikut meningkatkan kualitas dashboard ini.

## Pembuat

**Ilman Zuhry** 