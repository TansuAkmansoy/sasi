# Sasi — Güncelleme notları

Durum: 1.1 uygulandı. **1.2 bekliyor** — "uygula" denmeden koda dokunulmaz.

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

## Verilen kararlar (1 Kasım 2026)
- Ön ödemeyi acenteler alır; bazen biz alırız, o zaman elle girilir.
- Girişten 1 ay öncesine kadar iptal edilebilir.
- Evcil hayvan ücreti tek seferliktir; tutar her sezon değişir (Ayarlar → Ücretler ve metinler).
- 5 geceden az konaklamada "kısa konaklama ücreti" alınır.
- Yazılar Türkçe; üç villa aynı standartta, tek kullanım metni yeterli.
- Görünüm Google Takvim'e benzesin; istenirse rezervasyon Google Takvim'e eklenebilsin.
- Hold süresi dolunca karar kullanıcıda; hold'lar takvimde farklı renkte (turuncu, kesik çizgi).

## Uygulamadan önce sorulan sorular (yanıtlandı)
1. **Ön ödeme:** rezervasyonda yüzde kaç alınıyor, kalan ödeme girişten kaç gün önce isteniyor? Bu oranlar villaya veya acenteye göre değişiyor mu?
2. **İptal kuralları:** girişten kaç gün öncesine kadar iptalde ne kadar iade ediliyor (kademeler)?
3. **Evcil hayvan ücreti:** gecelik mi, tek seferlik mi? Ek depozito var mı?
4. **Temizlik ücreti:** "5 günden kısa" 5 geceden az konaklama mı demek?
5. **Yazının dili:** Türkçe mi, İngilizce mi, ikisi birden mi? Villa başına ayrı kullanım bilgisi (adres, Wi-Fi, havuz kuralları vb.) olacak mı?
6. **Google Takvim:** yalnızca görünüm mü isteniyor (ay/hafta ızgarası, renkli etkinlikler), yoksa rezervasyonların telefondaki Google Takvim'e de düşmesi mi?
7. **Hold süresi dolunca:** şu anki gibi hatırlatma gelip kararı sen mi vereceksin, yoksa tarihler kendiliğinden mi boşalacak?

## 1.1'de yapılanlar
- Yeni rezervasyon varsayılan olarak **Hold** açılır; 24 saat / 48 saat / tarih seçilir. Bitişten 2 saat önce ve bitişte bildirim gelir. Kayıt ekranında "Onayla, tarihleri kapat", "+24/+48 saat uzat" ve "Bırak" düğmeleri var.
- Hold'lar takvimde turuncu ve kesik çizgili görünür; "Bugün" ekranında "Açık hold'lar" listelenir.
- Ücret: konaklama ücreti + evcil hayvan ücreti (tek sefer) + kısa konaklama ücreti (5 geceden az) = brüt. Varsayılan ücretler Ayarlar'dan gelir, her rezervasyonda değiştirilebilir.
- **Mesaj / WhatsApp** ekranı: "Hold bilgisi", "Onay + şartlar" ve "Sadece şartlar" metinleri rezervasyon bilgileriyle dolar; düzenlenip WhatsApp'tan gönderilir.
- **Ayarlar → Ücretler ve metinler**: sezon ücretleri, giriş/çıkış saatleri, iptal süresi, kiralama şartları, villa kullanım bilgileri ve iki mesaj şablonu.
- **Ücret hesapla** ekranı: villa + tarih + evcil hayvan + kanal → toplam, komisyon, net, son iptal tarihi ve ödeme planı (ön ödeme, kalan ödeme vadesi, 1–4 parça). "Bu bilgilerle hold aç" ve "Teklifi paylaş" düğmeleri var.
- Takvim: Google Takvim tarzı **ay görünümü** (villa renkleri, gün seçince o günün listesi); eski villa çizelgesi de duruyor.
- Her rezervasyonda **Google Takvim** düğmesi: etkinlik Google Takvim'e eklenir.
- Veritabanı: `supabase/guncelleme-1.1.sql` (bir kez çalıştırılır).

## Sürüm 1.2 için istenenler (1 Kasım 2026)

### 1. Tarih seçicide oklar yerinde dursun
- Takvimde ay değiştirirken ayın hafta sayısına göre (4, 5 ya da 6 satır) pencere yükselip alçalıyor; ileri/geri okları yer değiştiriyor.
- Pencere yüksekliği sabit olacak (her ay 6 satır yer ayrılır). Oklar hep aynı yerde kalır.

### 2. Hızlı ay/yıl seçimi
- Ay adına (örn. "Şubat 2027") dokununca kaydırmalı bir seçici açılır. Ay ve yıl çevrilerek istenen tarihe hızlıca gidilir.
- Tarih seçicide ve takvim sekmesinde geçerli olur.

### 3. Yeni uygulama ikonu
- Kullanıcının gönderdiği logo (`assets/sasi-logo.pdf`): yeşilden maviye geçişli ev simgesi ve "sasi" yazısı.
- Uygulama ikonu, açılış ekranı ve giriş ekranı bu logoyla değişecek.

### 4. Güncel döviz kurları
- Uygulama güncel kurları takip eder.
- Verilen bir fiyat güncel kurla diğer para birimlerine (TL, Euro, Sterlin, Dolar) çevrilerek gösterilir.

### 5. Önerilen ücret ve anlaşılan ücret
- Aylık fiyatlardan hesaplanan (önerilen) ücret ile müşteriyle anlaşılan ücret farklı olabilir.
- Anlaşılan ücret rezervasyonda kalıcı olarak saklanır; fiyat listesi sonradan değişse de değişmez.
- Önerilen ücret de bilgi olarak saklanır ve ikisi arasındaki fark gösterilir.

### Verilen kararlar (1 Kasım 2026)
- Kur kaynağı: TCMB günlük kurları.
- Kur karşılıkları hem ücret hesaplama hem rezervasyon ekranında görünür.
- Rezervasyon günündeki kur kayda yazılır ve görünür.
- İkonda yalnızca ev simgesi kullanılır; "sasi" yazısı giriş ekranında kalır.
- Uygulama renkleri logodaki yeşil-mavi geçişe göre güncellenir.

### Sorulan sorular (yanıtlandı)
1. Kur kaynağı: TCMB (Merkez Bankası) günlük kurları mı, yoksa gün içi piyasa kurları mı?
2. Kur karşılıkları nerede görünsün: ücret hesaplama ekranında, rezervasyon ekranında, ikisinde de mi?
3. Rezervasyon yapıldığı günün kuru rezervasyona kaydedilsin mi (sonradan "o gün kaç TL ediyordu" görebilmek için)?
4. Uygulama ikonunda yalnızca ev simgesi mi kullanılsın? Küçük boyutta "sasi" yazısı okunmaz; yazı giriş ekranında kalır.
5. Uygulamanın renkleri logodaki yeşil-mavi geçişe göre güncellensin mi?
