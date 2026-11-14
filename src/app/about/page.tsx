import { LegalPage, COMPANY } from '@/components/LegalPage';

export const metadata = { title: `Tentang ${COMPANY}`, description: 'Layanan chat dan konsultasi gratis untuk penjual online di Indonesia.' };

export default function AboutPage() {
  return (
    <LegalPage title={`Tentang ${COMPANY}`}>
      <p>{COMPANY} (Professor Online) membantu penjual online di Indonesia menaikkan penjualan di marketplace seperti Shopee, TikTok Shop, Tokopedia, dan Lazada: pengelolaan toko, optimasi produk, serta iklan marketplace dan Meta Ads.</p>
      <h2>Chat dengan kami</h2>
      <p>Kakak bisa menghubungi kami lewat WhatsApp, Instagram, dan Facebook Messenger. Asisten virtual kami menjawab pertanyaan seputar jualan online dan membantu menjadwalkan konsultasi.</p>
      <h2>Konsultasi gratis</h2>
      <p>Setiap calon klien bisa memesan konsultasi gratis dengan tim ahli kami lewat Google Meet, di waktu yang dipilih sendiri. Jadwal ditambahkan ke kalender kami, dan kakak menerima tautan Meet serta pengingat satu jam sebelumnya.</p>
      <h2>Sistem chat ini</h2>
      <p>Situs ini adalah dasbor internal tim kami untuk membalas chat, menjadwalkan konsultasi, dan mengirim informasi. Halaman yang dibuka tanpa login hanya halaman ini, Kebijakan Privasi, Syarat Layanan, dan Penghapusan Data.</p>
    </LegalPage>
  );
}
