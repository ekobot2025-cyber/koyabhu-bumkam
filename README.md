# KOYABHU BUMKam
### Sistem Informasi Manajemen Usaha Peternakan Ayam Petelur dan Keuangan Berbasis Web

Aplikasi web terpadu untuk Badan Usaha Milik Kampung (BUMKam) KOYABHU di Distrik Sentani Timur, Kabupaten Jayapura, Papua.

Aplikasi ini menerapkan prinsip inti: **"INPUT SEKALI, DATA TERINTEGRASI"**, menghubungkan:
```
AKTIVITAS PETERNAKAN
        ↓
PRODUKSI TELUR
        ↓
PENJUALAN TELUR
        ↓
TRANSAKSI KEUANGAN
        ↓
BUKU KAS
        ↓
PUSAT LAPORAN & HASIL USAHA (SURPLUS/DEFISIT)
```

---

## Fitur Utama

1. **Dashboard Eksekutif**:
   - **KPI Keuangan**: Saldo Kas Terkini, Total Pemasukan, Total Pengeluaran, Hasil Usaha (Surplus / Defisit).
   - **KPI Peternakan**: Populasi Ayam Hidup, Kematian Ayam (Mortalitas), Produksi Telur Harian, Total Telur Terjual, Produktivitas Ayam (%).
   - **Visualisasi Interaktif**: Grafik Tren Penjualan Telur, Perbandingan Kas Masuk vs Keluar, Diagram Komposisi Pengeluaran, Tren Mortalitas.
   - **Peringatan Operasional Rule-Based**: Notifikasi otomatis saat kematian ayam meningkat, belum ada recording hari ini, saldo kas rendah, atau pengeluaran melebihi pendapatan.
   - **Filter Periode**: Hari Ini, 7 Hari, 30 Hari, Bulan Ini, Tahun Ini, dan Rentang Tanggal Kustom.

2. **Modul Penjualan Telur**:
   - Penomoran otomatis `PJL-YYYYMM-XXXX`.
   - Input butir atau rak (1 rak = 30 butir) dengan perhitungan total otomatis.
   - Status **Lunas** otomatis menambah kas di Buku Kas.
   - Status **Belum Lunas** tercatat sebagai piutang tanpa menambah kas hingga dilunasi.
   - Cetak Bukti Nota Transaksi Penjualan resmi BUMKam KOYABHU.
   - Pembatalan transaksi (VOID) dengan audit log dan koreksi saldo otomatis.

3. **Modul Keuangan (Buku Kas)**:
   - Arus kas terpadu (bebas entri ganda).
   - Menampilkan Saldo Awal, Total Kas Masuk, Total Kas Keluar, dan Saldo Akhir.
   - Tabel Buku Kas dengan saldo berjalan (*running balance*).
   - Entri kas manual untuk setoran modal awal atau penyesuaian kas fisik.

4. **Modul Pemasukan Lainnya**:
   - Penomoran otomatis `PMK-YYYYMM-XXXX`.
   - Pencatatan bantuan pemerintah, penjualan pupuk/kotoran ayam, penjualan ayam afkir, dan pendapatan lain.
   - Otomatis terintegrasi ke Buku Kas dan Laporan.

5. **Modul Pengeluaran Operasional**:
   - Penomoran otomatis `PNG-YYYYMM-XXXX`.
   - Kategori biaya: Pakan, Vaksin, Vitamin/Obat, Pemeliharaan Kandang, Transportasi, Listrik/Air, Tenaga Kerja, Peralatan, Administrasi, dll.
   - Manajemen penambahan kategori pengeluaran dinamis.
   - Otomatis mengurangi kas dan masuk ke Laporan Hasil Usaha.

6. **Recording Ayam & Produksi Telur**:
   - Pencatatan harian: Populasi Awal, Ayam Masuk, Ayam Mati, Ayam Afkir.
   - Formula otomatis: `Populasi Akhir = Populasi Awal + Masuk - Mati - Afkir`.
   - Populasi awal otomatis mengambil dari populasi akhir hari sebelumnya.
   - Produksi telur (telur baik vs telur rusak) dan konsumsi pakan harian.
   - Ringkasan sisa stok telur siap jual di gudang peternakan.

7. **Pusat Laporan & Hasil Usaha**:
   - **Laporan Hasil Usaha (Laba/Rugi Sederhana BUMKam)**: Struktur resmi Pendapatan vs Biaya Operasional = Surplus / Defisit.
   - **Laporan Penjualan Telur**: Rekapitulasi butir dan omset.
   - **Laporan Arus Kas (Buku Kas)**: Rincian transaksi dan mutasi saldo.
   - **Laporan Pengeluaran**: Pengelompokan kategori dan persentase biaya.
   - **Laporan Pemasukan**: Total penerimaan kas.
   - **Laporan Recording Ayam**: Rekap harian populasi dan mortalitas.
   - Format cetak resmi (Kop Surat BUMKam KOYABHU) dan ekspor Excel (CSV).

8. **Pengaturan, Keamanan & Data**:
   - Profil BUMKam (Nama, Alamat di Sentani Timur, No HP, Email, Saldo Awal).
   - Profil Pengguna & Ganti Kata Sandi.
   - Cadangkan (Backup) Database ke file JSON terenkripsi.
   - Pulihkan (Restore) Database dari file cadangan.
   - Muat Ulang Data Demo Realistis (1.200 ayam layer, 14 hari transaksi).
   - Audit Trail: Jejak lengkap siapa yang membuat, mengubah, atau membatalkan data.

---

## Akun Pengguna Bawaan (Default Login)

| Role | Username | Password | Keterangan |
|------|----------|----------|------------|
| **Ketua BUMKam (Admin)** | `admin` | `admin123` | Akses penuh seluruh modul keuangan, operasional, laporan & sistem |
| **Petugas Kandang** | `petugas` | `petugas123` | Akses khusus modul Recording Ayam & Produksi Telur |

---

## Cara Menjalankan Aplikasi

### 1. Menjalankan Mode Pengembangan Lokal:
```bash
npm run dev
```
- Frontend berjalan pada: `http://localhost:5173` (atau port yang dialokasikan)
- Backend API berjalan pada: `http://localhost:5000`

### 2. Membangun dan Menjalankan Mode Produksi:
```bash
npm run build
npm start
```
- Server Express melayani antarmuka terpadu dan API pada: `http://localhost:5000`

### 3. Menjalankan Pengujian Fungsional Otomatis:
```bash
npm test
```
(Menguji 18 asersi otomatis dari 5 Test Case inti dan aturan bisnis).

---

## Penerbitan ke Vercel (Deployment via GitHub)

Aplikasi telah dikonfigurasi penuh dengan berkas `vercel.json` dan serverless entrypoint `api/index.js`:

1. **Push repositori ini ke GitHub**:
   ```bash
   git add .
   git commit -m "Publish KOYABHU BUMKam"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
2. **Impor ke Vercel**:
   - Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub.
   - Klik **"Add New..."** → **"Project"**.
   - Pilih repositori `koyabhu-bumkam` yang telah dipush.
   - Framework preset otomatis terdeteksi: **Vite**.
   - Klik **"Deploy"**.
3. Aplikasi akan langsung aktif secara publik dengan domain `https://<nama-proyek>.vercel.app`.

