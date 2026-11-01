// Kullanma kılavuzu için web sürümünden örnek verilerle ekran görüntüleri alır.
// Kullanım: node scripts/ekran-goruntusu.js <site klasörü> <çıktı klasörü>
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'site';
const out = process.argv[3] || 'shots';
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' };
const server = http
  .createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/sasi/, '');
    let f = path.join(root, p);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(root, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  })
  .listen(8080);

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const lbl = (d) => `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`;

(async () => {
  const base = 'http://localhost:8080/sasi/';
  const app = base + 'app/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss());
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name, fn) => {
    try {
      await fn();
      await wait(700);
      await page.screenshot({ path: path.join(out, name + '.png') });
      console.log('OK  ', name);
    } catch (e) {
      console.log('FAIL', name, '-', e.message.split('\n')[0]);
    }
  };
  const go = async (p, text) => {
    await page.goto(app + p, { waitUntil: 'networkidle' });
    if (text) await page.getByText(text).first().waitFor({ timeout: 15000 });
  };
  const scrollTo = async (text) => {
    await page.getByText(text, { exact: true }).first().scrollIntoViewIfNeeded();
    await page.getByText(text, { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.mouse.wheel(0, -90);
  };

  await shot('01-kurulum', () => go('', 'Örnek verilerle dene'));
  await page.getByText('Örnek verilerle dene').click();
  await page.getByText('Villa çizelgesi').waitFor({ timeout: 20000 });
  await shot('02-takvim-ay', async () => {});
  await shot('03-gun-listesi', () => scrollTo('Bu aydaki konaklamalar (5)').catch(() => page.mouse.wheel(0, 650)));
  await shot('04-cizelge', async () => {
    await go('', 'Villa çizelgesi');
    await page.getByText('Villa çizelgesi').click();
  });
  await shot('05-ay-yil', async () => {
    await go('', 'Villa çizelgesi');
    await page.getByLabel('Ay ve yıl seç').first().click();
    await page.getByText('Ay ve yıl seç').last().waitFor();
  });
  await shot('06-bugun', () => go('bugun', 'Bugün'));
  await shot('07-kayitlar', () => go('rezervasyonlar', 'Yaklaşan'));
  await shot('08-arsiv', () => go('arsiv', 'Tamamlanan'));
  await shot('09-rezervasyon', async () => {
    await go('rezervasyonlar', 'Mehmet Yılmaz');
    await page.getByText('Mehmet Yılmaz').first().click();
    await page.getByText('Değişiklik geçmişi').waitFor();
  });
  await shot('10-rezervasyon-ucret', () => scrollTo('FİYAT').catch(() => scrollTo('Fiyat')));
  await shot('11-rezervasyon-odeme', () => scrollTo('ÖDEMELER').catch(() => scrollTo('Ödemeler')));
  await shot('12-mesaj', async () => {
    await page.getByText('Mesaj / WhatsApp').first().scrollIntoViewIfNeeded();
    await page.getByText('Mesaj / WhatsApp').first().click();
    await page.getByText('Onay + şartlar').waitFor();
  });
  await shot('13-hold', async () => {
    await go('rezervasyonlar', 'Yaklaşan');
    await page.getByText('Hold', { exact: true }).first().click();
    await page.getByText('Sophie Taylor').first().click();
    await page.getByText('Onayla, tarihleri kapat').waitFor();
  });
  await shot('14-yeni-hold', () => go('rezervasyon/yeni', 'Hold süresi'));
  await shot('15-tarih-secici', async () => {
    await page.getByText('Tarihleri seç').first().click();
    await page.getByText('Giriş gününe dokun').waitFor();
  });
  await shot('16-ay-yil-tekerlek', async () => {
    await page.getByLabel('Ay ve yıl seç').last().click();
    await page.getByText('Günleri göster').waitFor();
  });
  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  const d2 = new Date(now.getFullYear(), now.getMonth() + 1, 14);
  await shot('17-hesapla', async () => {
    await go('hesapla', 'Tarihleri seç');
    await page.getByText('Villa Seascape').first().click();
    await page.getByText('Tarihleri seç').first().click();
    await page.getByLabel('Sonraki ay').last().click();
    await page.getByLabel(lbl(d1), { exact: true }).click();
    await page.getByLabel(lbl(d2), { exact: true }).click();
    await page.getByText('Tamam', { exact: true }).last().click();
    await page.getByText('Toplam (brüt)').waitFor();
    await page.getByText('Evcil hayvan', { exact: true }).first().click();
  });
  await shot('18-hesapla-plan', async () => {
    await page.getByText('Biz alırız').click().catch(() => {});
    await page.getByText('%30').click().catch(() => {});
    await page.getByText('2', { exact: true }).last().click().catch(() => {});
    await scrollTo('ÖDEME PLANI').catch(() => scrollTo('Ödeme planı'));
  });
  await shot('19-ayarlar', () => go('ayarlar', 'Fiyat ve kayıt'));
  await shot('20-fiyatlar', () => go('fiyatlar', 'Aylık fiyatlar'));
  await shot('21-metinler', () => go('metinler', 'Bu sezonun ücretleri'));
  await shot('22-paylasim', () => go('paylasim', 'Yeni bağlantı'));
  await shot('23-musteri-sayfasi', async () => {
    await page.goto(base + '#demo=1&m=m&t=x', { waitUntil: 'networkidle' });
    await page.getByText('Müsaitlik takvimi').waitFor();
  });
  await shot('24-yonetici-sayfasi', async () => {
    await page.goto(base + '#demo=1&m=a&t=x', { waitUntil: 'networkidle' });
    await page.getByText('Sasi · Kayıtlar').waitFor();
  });
  await browser.close();
  server.close();
})();
