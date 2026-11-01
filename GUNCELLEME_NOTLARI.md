# Sasi — Güncelleme notları

Durum: **Bekliyor**. Kullanıcı "uygula" diyene kadar koda dokunulmaz.

## Sürüm 1.1 için istenenler (1 Kasım 2026)

### 1. Rezervasyon bilgilendirme yazısı (WhatsApp)
- Rezervasyon alınınca misafire ya da acenteye gönderilecek bir yazı hazırlanır.
- İçerik:
  - villa kullanım bilgileri
  - rezervasyon koşulları
  - ödenecek tutar ve ödeme planı
  - giriş/çıkış saatleri
  - evcil hayvan kuralları
  - iptal prosedürü
- Uygulamadan tek dokunuşla WhatsApp'ta paylaşılır.

### 2. Hold (opsiyon) 24 veya 48 saat
- Rezervasyon talep edildiğinde tarihler 24 ya da 48 saat **hold**'a alınır. Hızlı seçim: "24 saat" / "48 saat".
- Şu anki opsiyon gün bazlı; bunun yerine saat bazlı bir bitiş zamanı kullanılacak.
- Olumlu sonuç gelince hold onaylanır ve tarihler takvimde kesin olarak kapanır.

### 3. Rezervasyona eklenen ekstra ücretler
- **Evcil hayvan ücreti:** evcil hayvan gelecekse girilir.
- **Ekstra temizlik ücreti:** konaklama 5 günden kısaysa girilir.
- Bu tutarlar değişken olduğu için her rezervasyonda elle girilir.
- Ekstralar toplam ücrete eklenir ve bilgilendirme yazısında görünür.

### 4. Kiralama şartları şablonu
- Acenteye ya da misafire gönderilecek standart bir metin olacak. İçeriği:
  - iptal prosedürü
  - ön ödeme ve ödeme koşulları
  - giriş/çıkış saatleri
  - evcil hayvan prosedürü
- Metin Ayarlar'dan düzenlenebilir.
- Rezervasyona özel bilgiler (misafir, villa, tarihler, tutarlar, ekstralar) metne otomatik yerleşir.

### 5. Parça parça ödemeler
- Ödemeler bazen parça parça geliyor; her parça elle girilecek.
- Bu, v1.0'daki "Ödeme ekle" listesiyle zaten yapılabiliyor. Bilgilendirme yazısındaki ödeme planıyla bağlantısı kurulacak.

### 6. Takvim: Google Takvim görünümü
- Takvim bölümü Google Takvim'e benzer bir düzende olacak.

### 7. Ayrı ücret hesaplama modülü
- Rezervasyondan bağımsız bir hesaplama ekranı olacak.
- Girilenler: villa, tarihler, evcil hayvan, ekstralar.
- Çıktı:
  - toplam ücret
  - yukarıdaki prosedüre göre hangi tarihte ne kadar ödeme alınacağı (ön ödeme, ara ödemeler, kalan)
- Hesaplanan sonuç tek dokunuşla rezervasyona çevrilebilir veya bilgilendirme yazısına eklenebilir.

## Uygulamadan önce netleşmesi gerekenler
1. **Ön ödeme:** rezervasyonda yüzde kaç alınıyor, kalan ödeme girişten kaç gün önce isteniyor? Bu oranlar villaya veya acenteye göre değişiyor mu?
2. **İptal kuralları:** girişten kaç gün öncesine kadar iptalde ne kadar iade ediliyor (kademeler)?
3. **Evcil hayvan ücreti:** gecelik mi, tek seferlik mi? Ek depozito var mı?
4. **Temizlik ücreti:** "5 günden kısa" 5 geceden az konaklama mı demek?
5. **Yazının dili:** Türkçe mi, İngilizce mi, ikisi birden mi? Villa başına ayrı kullanım bilgisi (adres, Wi-Fi, havuz kuralları vb.) olacak mı?
6. **Google Takvim:** yalnızca görünüm mü isteniyor (ay/hafta ızgarası, renkli etkinlikler), yoksa rezervasyonların telefondaki Google Takvim'e de düşmesi mi?
7. **Hold süresi dolunca:** şu anki gibi hatırlatma gelip kararı sen mi vereceksin, yoksa tarihler kendiliğinden mi boşalacak?
