import { LegalPage, COMPANY } from '@/components/LegalPage';

export const metadata = { title: 'Syarat Layanan', description: `Syarat penggunaan chat dan konsultasi gratis ${COMPANY}.` };

export default function TermsPage() {
  return (
    <LegalPage title="Syarat Layanan">
      <p>Dengan mengirim pesan kepada {COMPANY} atau memesan konsultasi gratis, kakak menyetujui syarat berikut. (English summary at the end.)</p>

      <h2>Layanan</h2>
      <p>Kami menjawab pertanyaan seputar jualan online di marketplace Indonesia dan menawarkan konsultasi gratis dengan tim ahli kami. Balasan pertama sering dibuat oleh asisten virtual (AI); tim kami dapat mengambil alih chat kapan saja. Saran yang diberikan bersifat umum dan tidak menjamin hasil penjualan tertentu.</p>

      <h2>Konsultasi gratis</h2>
      <ul>
        <li>Konsultasi gratis, tanpa kewajiban membeli layanan kami.</li>
        <li>Jadwal dipilih dari waktu yang tersedia. Bila kakak berhalangan, mohon kabari kami agar waktunya bisa dipakai orang lain.</li>
        <li>Kami dapat mengubah atau membatalkan jadwal bila ada halangan, dan akan memberi tahu kakak.</li>
        <li>Harga dan paket layanan berbayar dijelaskan terpisah oleh tim kami sebelum kakak memutuskan.</li>
      </ul>

      <h2>Pesan informasi dan berhenti berlangganan</h2>
      <p>Kami dapat mengirim informasi layanan lewat WhatsApp kepada orang yang pernah menghubungi kami. Kami mengirimnya perlahan dan dalam jumlah terbatas. Kakak dapat berhenti kapan saja dengan membalas <b>STOP</b>.</p>

      <h2>Penggunaan yang wajar</h2>
      <p>Mohon tidak mengirim pesan yang melanggar hukum, menyerang pihak lain, atau berisi data sensitif seperti kata sandi, OTP, atau nomor kartu. Kami dapat menghentikan chat yang disalahgunakan.</p>

      <h2>Pembatasan tanggung jawab</h2>
      <p>Layanan chat disediakan apa adanya. Kami berusaha menjawab dengan benar, tetapi balasan otomatis dapat keliru; untuk keputusan penting mohon konfirmasi dengan tim kami. Layanan pihak ketiga (WhatsApp, Instagram, Messenger, Google) tunduk pada syarat mereka masing-masing.</p>

      <h2>Privasi</h2>
      <p>Penggunaan data kakak dijelaskan di Kebijakan Privasi kami.</p>

      <h2>Perubahan</h2>
      <p>Syarat ini dapat berubah; versi terbaru ditampilkan di halaman ini.</p>

      <h2>English summary</h2>
      <p>By messaging {COMPANY} or booking a free consultation you accept these terms. Our advice is general and does not guarantee results. The consultation is free with no obligation. We may send service information on WhatsApp slowly and in limited numbers; reply STOP to stop it at any time. Replies may be drafted by an AI assistant and a person can take over. Please do not send passwords, OTPs or card numbers. See our Privacy Policy for how data is used.</p>
    </LegalPage>
  );
}
