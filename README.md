# Sasi — villa rezervasyon takvimi

Kalkan/Kaş'taki villaların (Villa Poyraz, Villa Seascape, Villa Shipahoy) rezervasyonlarını yöneten Android uygulaması.

- **Çifte satış yok:** aynı villada çakışan tarih veritabanı seviyesinde reddedilir. Aynı gün devir serbesttir (çıkış 10:00, giriş 16:00).
- **Opsiyon:** bitiş tarihi olan geçici rezervasyondur. Bitişten bir gün önce ve bitiş günü bildirim gelir. Süre dolunca sen karar verene kadar tarihler kapalı kalır.
- **Fiyat:** her villa için her ayın haftalık ücreti girilir; gece ücreti = haftalık / 7. Tarih değişince toplam kendiliğinden hesaplanır.
- **Arşiv:** konaklama bitince kayıt "onayını bekliyor" olur. Son düzeltmelerden sonra "Konaklamayı tamamla" ile arşive alınır. Arşivdeki kayıt da düzenlenebilir.
- **Paylaşım:** iki tür bağlantı vardır. Ortak yönetici bağlantısı tüm kayıtları salt okunur gösterir (iPhone dahil, uygulama gerekmez). Müşteri bağlantısı yalnızca dolu/boş günleri Türkçe ve İngilizce gösterir.
- Para birimleri: TL, Euro, Sterlin, Dolar. Toplamlar her para birimi için ayrı tutulur.

## Kurulum (bir kerelik)

### 1. Supabase veritabanı
1. Supabase panelinde projeyi aç → **SQL Editor** → **New query**.
2. `supabase/parca1.sql`, `parca2.sql`, `parca3.sql` dosyalarını sırayla, her biri ayrı sorguda çalıştır (telefondan kopyalamada uzun dosya yarım kalabiliyor). Bilgisayardan tek seferde `kurulum.sql` de olur.
3. **Authentication → Users → Add user → Create new user**: kendi e-postanı ve bir şifre gir, **Auto Confirm User** işaretli olsun.
4. **Authentication → Sign In / Providers** (ya da *Settings*): **Allow new users to sign up** seçeneğini **kapat**. Böylece uygulamaya senden başka kimse hesap açamaz.
5. **Project Settings → API Keys** (ya da üstteki **Connect** düğmesi): *Project URL* ve **anon / publishable** anahtarını kopyala. `service_role` / `secret` anahtarını asla kullanma.

### 1b. Sürüm 1.1 güncellemesi
Daha önce kurulum yaptıysan SQL Editor'de `supabase/guncelleme-1.1.sql` dosyasını bir kez çalıştır. (Yeni kurulumda `kurulum.sql` bunu içerir.)

### 1c. Sürüm 1.2 güncellemesi
SQL Editor'de `supabase/guncelleme-1.2.sql` dosyasını bir kez çalıştır.

### 1d. Sürüm 1.3 güncellemesi
SQL Editor'de `supabase/guncelleme-1.3.sql` dosyasını bir kez çalıştır.

### 2. Paylaşım sayfası ve web sürümü (GitHub Pages)
Repo → **Settings → Pages** → *Source*: **GitHub Actions**. Her güncellemede `web.yml` iş akışı paylaşım sayfasını (`https://tansuakmansoy.github.io/sasi/`) ve uygulamanın web sürümünü (`https://tansuakmansoy.github.io/sasi/app/`) yayınlar.

### 3. Uygulama
1. Repo → **Actions → Android APK**: her güncellemede APK kendiliğinden derlenir. İlk derleme yaklaşık 15 dakika sürer.
2. Repo → **Releases** → en üstteki sürümden **sasi.apk** dosyasını telefona indirip kur.
3. Uygulamayı ilk açışta proje adresini ve anahtarı yapıştır, sonra 1.3'te oluşturduğun e-posta ve şifreyle giriş yap.
4. **Ayarlar → Villalar ve aylık fiyatlar** bölümünden aylık haftalık ücretleri, **Ayarlar → Acenteler** bölümünden acenteleri gir.
5. **Ayarlar → Paylaşım bağlantıları**: ortak yönetici için **Yönetici**, müşteriler için **Müsaitlik** bağlantısı oluştur. Bir bağlantıyı iptal ettiğin anda çalışmaz hale gelir.

Supabase kurulumunu yapmadan denemek için ilk ekrandaki **Örnek verilerle dene** seçeneğini kullanabilirsin.

## Geliştirme
- `npm test`: fiyat, çakışma ve ödeme hesaplarının testleri
- `supabase/kurulum.sql`: şema, çakışma kısıtı (`no_overlap`), değişiklik geçmişi, RLS, `save_reservation` ve `share_view` fonksiyonları
- `docs/index.html`: paylaşım sayfası. Bağlantının `#` kısmı sunucuya gönderilmez. `#demo=1&m=a` ile örnek yönetici görünümü açılır.
