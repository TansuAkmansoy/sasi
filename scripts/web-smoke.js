// Web derlemesini gerçek tarayıcıda açar, örnek verilerle gezinir ve hataları log'a yazar.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// GitHub Pages gibi: dosya yoksa 404.html (uygulamanın iç sayfaları için)
const root = process.argv[3] || 'site';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/sasi/, '');
  let f = path.join(root, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(root, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(8080);

(async () => {
  const url = process.argv[2] || 'http://localhost:8080/sasi/app/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  page.on('dialog', (d) => d.accept());
  const step = async (name, fn) => {
    try {
      await fn();
      console.log('OK  ', name);
    } catch (e) {
      console.log('FAIL', name, '-', e.message.split('\n')[0]);
      const txt = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
      console.log('     sayfa:', page.url(), '|', txt);
    }
  };
  await step('açılış ekranı', async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('Örnek verilerle dene').waitFor({ timeout: 20000 });
  });
  await step('kurulum bağlantısı alanları doldurur', async () => {
    await page.goto(url + '#u=https%3A%2F%2Fornek.supabase.co&k=sb_publishable_ORNEK', { waitUntil: 'networkidle' });
    await page.getByText('Bağlantı bilgileri hazır').waitFor({ timeout: 10000 });
    await page.goto(url, { waitUntil: 'networkidle' });
  });
  await step('örnek verilerle takvim', async () => {
    await page.getByText('Örnek verilerle dene').click();
    await page.getByText('Villa çizelgesi').waitFor({ timeout: 20000 });
  });
  await step('rezervasyon detayı', async () => {
    await page.goto(url + 'rezervasyonlar', { waitUntil: 'networkidle' });
    await page.getByText('Mehmet Yılmaz').first().click();
    await page.getByText('Değişiklik geçmişi').waitFor({ timeout: 10000 });
  });
  await step('mesaj ekranı', async () => {
    await page.getByText('Mesaj / WhatsApp').click();
    await page.getByText('Onay + şartlar').waitFor({ timeout: 10000 });
    await page.goBack();
  });
  await step('ücret hesapla', async () => {
    await page.goto(url + 'hesapla', { waitUntil: 'networkidle' });
    await page.getByText('Tarihleri seç').first().waitFor({ timeout: 10000 });
  });
  await step('ayarlar ve takvim aktarımı (web uyarısı)', async () => {
    await page.goto(url + 'takvim-aktarim', { waitUntil: 'networkidle' });
    await page.getByText('yalnızca Android').waitFor({ timeout: 10000 });
  });
  console.log('Hatalar (' + errors.length + '):');
  for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e);
  await browser.close();
  server.close();
})();
