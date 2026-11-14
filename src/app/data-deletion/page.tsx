import { LegalPage, COMPANY } from '@/components/LegalPage';

export const metadata = { title: 'Penghapusan Data', description: `Cara meminta penghapusan data di ${COMPANY}.` };

export default function DataDeletionPage() {
  return (
    <LegalPage title="Penghapusan Data">
      <p>Kakak berhak meminta data kakak dihapus dari sistem kami. Halaman ini menjelaskan caranya. (English below.)</p>

      <h2>Cara meminta penghapusan</h2>
      <ol className="space-y-1">
        <li>Kirim pesan <b>&ldquo;Hapus data saya&rdquo;</b> lewat chat yang sama yang kakak pakai untuk menghubungi kami (WhatsApp, Instagram, atau Facebook Messenger {COMPANY}).</li>
        <li>Tim kami akan memastikan permintaan ini benar dari kakak, lalu menghapus percakapan, nama, dan data jadwal kakak dari sistem kami.</li>
        <li>Kakak mendapat konfirmasi di chat yang sama. Penghapusan selesai paling lambat 30 hari sejak permintaan.</li>
      </ol>

      <h2>Yang dihapus</h2>
      <ul>
        <li>Isi percakapan dan gambar atau berkas yang kakak kirim.</li>
        <li>Nama profil, pengenal akun, dan informasi yang kakak sebutkan.</li>
        <li>Jadwal konsultasi dan acara di kalender kami.</li>
      </ul>
      <p>Data yang wajib kami simpan menurut hukum (misalnya catatan transaksi bila kakak sudah menjadi klien) tetap disimpan sebatas yang diwajibkan.</p>

      <h2>Berhenti menerima pesan</h2>
      <p>Untuk berhenti menerima pesan informasi saja, tanpa menghapus data, balas <b>STOP</b> kapan saja.</p>

      <h2>English</h2>
      <p>To have your data deleted, message &ldquo;Delete my data&rdquo; in the same chat you used to contact {COMPANY} (WhatsApp, Instagram or Facebook Messenger). We confirm the request is yours, then delete your conversation, name and booking data, and confirm in the same chat within 30 days. Data we are legally required to keep stays only as long as required. To stop information messages only, reply STOP.</p>
    </LegalPage>
  );
}
