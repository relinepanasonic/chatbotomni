import { LegalPage, COMPANY, SITE } from '@/components/LegalPage';

export const metadata = { title: 'Kebijakan Privasi', description: `Bagaimana ${COMPANY} memakai dan melindungi data chat dan jadwal.` };

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi">
      <p>Kebijakan ini menjelaskan data apa yang {COMPANY} kumpulkan saat kakak menghubungi kami lewat WhatsApp, Instagram, atau Facebook Messenger, atau memesan konsultasi gratis, dan bagaimana data itu dipakai. (English summary at the end.)</p>

      <h2>Data yang kami terima</h2>
      <ul>
        <li>Isi pesan yang kakak kirim kepada kami, termasuk gambar atau berkas yang kakak lampirkan.</li>
        <li>Nama profil dan pengenal akun: nomor WhatsApp, atau ID akun Instagram atau Facebook kakak. Kami tidak mendapat kata sandi kakak.</li>
        <li>Informasi yang kakak sebutkan sendiri, misalnya nama, nama toko, marketplace, dan kebutuhan.</li>
        <li>Data jadwal: waktu konsultasi yang dipilih dan tautan Google Meet.</li>
        <li>Dari iklan: pesan pertama yang dikirim dari iklan kami, untuk mengetahui iklan mana yang membawa kakak.</li>
      </ul>

      <h2>Untuk apa data dipakai</h2>
      <ul>
        <li>Menjawab pertanyaan kakak, oleh tim kami dan asisten virtual (AI).</li>
        <li>Menjadwalkan konsultasi gratis, mengirim tautan Meet dan pengingat.</li>
        <li>Mengirim informasi layanan kami lewat WhatsApp. Setiap pesan berisi cara berhenti: kakak cukup membalas <b>STOP</b>, dan kakak tidak akan dikirimi pesan informasi lagi.</li>
        <li>Memperbaiki layanan kami, misalnya statistik jumlah chat dan waktu balasan.</li>
      </ul>
      <p>Kami tidak menjual data kakak dan tidak memakainya untuk iklan pihak lain.</p>

      <h2>Asisten virtual (AI)</h2>
      <p>Pesan kakak dapat dikirim ke penyedia model AI (Anthropic dan Google) agar asisten kami dapat menulis balasan. Kami hanya mengirim isi percakapan yang diperlukan untuk menjawab. Asisten akan mengakui bahwa ia asisten virtual bila ditanya, dan tim kami dapat mengambil alih chat kapan saja.</p>

      <h2>Data dari Google (Kalender)</h2>
      <p>Untuk menjadwalkan konsultasi, tim kami menghubungkan kalender Google milik tim kami sendiri. Kami memakai izin kalender hanya untuk melihat waktu sibuk dan membuat acara konsultasi dengan tautan Google Meet. Kami tidak mengakses kalender atau data Google pribadi kakak.</p>
      <p>Penggunaan informasi yang diterima dari Google API mengikuti <a className="font-semibold text-brand-dark underline" href="https://developers.google.com/terms/api-services-user-data-policy">Kebijakan Data Pengguna Layanan Google API</a>, termasuk persyaratan Penggunaan Terbatas.</p>

      <h2>Data dari Meta (Instagram dan Messenger)</h2>
      <p>Pesan Instagram dan Messenger kakak diterima lewat platform resmi Meta, dan hanya dipakai untuk membalas kakak. Meta hanya mengizinkan kami membalas dalam 24 jam setelah pesan terakhir kakak.</p>

      <h2>Penyimpanan dan keamanan</h2>
      <p>Data disimpan di layanan basis data tepercaya dengan akses terbatas pada tim kami, dan dikirim melalui koneksi terenkripsi (HTTPS). Gambar yang kakak kirim disimpan di penyimpanan pribadi. Kami menyimpan percakapan selama diperlukan untuk melayani kakak dan sebagai catatan bisnis, kecuali kakak meminta penghapusan.</p>

      <h2>Hak kakak</h2>
      <p>Kakak dapat meminta salinan data, perbaikan, atau penghapusan data kakak kapan saja, dan berhenti menerima pesan informasi dengan membalas STOP. Cara meminta penghapusan ada di halaman <a className="font-semibold text-brand-dark underline" href={`${SITE}/data-deletion`}>Penghapusan Data</a>.</p>

      <h2>Menghubungi kami</h2>
      <p>Pertanyaan tentang privasi dapat disampaikan lewat chat WhatsApp, Instagram, atau Facebook {COMPANY}. Kami akan menanggapi dalam waktu yang wajar.</p>

      <h2>Perubahan</h2>
      <p>Bila kebijakan ini berubah, versi terbaru akan ditampilkan di halaman ini beserta tanggal pembaruannya.</p>

      <h2>English summary</h2>
      <p>{COMPANY} receives the messages you send us on WhatsApp, Instagram and Facebook Messenger (with your name and account ID, never your password) and the details you choose to share, such as your shop and needs. We use them to answer you, to book a free consultation with our experts (via our own Google Calendar and Google Meet), and to send service information on WhatsApp, which you can stop at any time by replying STOP. Messages may be processed by AI providers (Anthropic and Google) to draft replies. We do not sell your data. Our use of Google user data follows the Google API Services User Data Policy, including the Limited Use requirements. To ask for a copy or the deletion of your data, see the Data Deletion page.</p>
    </LegalPage>
  );
}
