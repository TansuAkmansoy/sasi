// Web derlemesini iPhone'da "Ana Ekrana Ekle" ile uygulama gibi açılacak hale getirir:
// manifest, apple-touch-icon ve tam ekran meta etiketleri eklenir.
const fs = require('fs');
const path = require('path');

const dist = process.argv[2] || 'dist';
const base = '/sasi/app/';
const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

for (const s of [180, 192, 512]) fs.copyFileSync(path.join('assets/pwa', `icon-${s}.png`), path.join(dist, `icon-${s}.png`));

fs.writeFileSync(
  path.join(dist, 'manifest.json'),
  JSON.stringify(
    {
      name: 'Sasi',
      short_name: 'Sasi',
      description: 'Villa rezervasyonları',
      lang: 'tr',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#F5FAF9',
      theme_color: '#138A7A',
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  ),
);

const head = [
  `<link rel="manifest" href="${base}manifest.json">`,
  `<link rel="apple-touch-icon" href="${base}icon-180.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Sasi">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="theme-color" content="#F5FAF9">',
  '<meta name="robots" content="noindex, nofollow">',
].join('\n    ');

html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
if (!/viewport-fit=cover/.test(html)) html = html.replace('</head>', '    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">\n  </head>');
html = html.replace(/<html lang="[^"]*"/, '<html lang="tr"').replace('</head>', `    ${head}\n  </head>`);
html = html.replace(/<title>[^<]*<\/title>/, '<title>Sasi</title>');
fs.writeFileSync(htmlPath, html);
console.log('PWA hazır:', htmlPath);
