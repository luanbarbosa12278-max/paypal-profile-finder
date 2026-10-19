const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'public', 'index.html');

function decode(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name)=["']([^"']+)["']/i);
    const value = tag.match(/\bcontent=["']([^"']*)["']/i);
    if (name && value && name[1].toLowerCase() === key.toLowerCase()) return decode(value[1]);
  }
  return '';
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  const match = url.pathname.match(/^\/api\/profile\/([a-zA-Z0-9]{1,20})$/);
  if (req.method === 'GET' && match) {
    const username = match[1];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('https://www.paypal.me/' + encodeURIComponent(username), {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
      });
      clearTimeout(timer);
      if (!response.ok) {
        return send(res, 200, { found: false, title: 'Perfil não confirmado', message: 'O PayPal não forneceu uma página pública acessível. Isso não prova que a conta não existe.' });
      }

      const finalUrl = new URL(response.url);
      if (!['paypal.me', 'www.paypal.me'].includes(finalUrl.hostname)) {
        return send(res, 200, { found: false, title: 'Página não confirmada', message: 'O redirecionamento não permitiu confirmar o perfil.' });
      }

      const html = (await response.text()).slice(0, 2000000);
      const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = (meta(html, 'og:title') || (titleTag ? titleTag[1] : '')).replace(/<[^>]+>/g, '').trim();
      const photo = meta(html, 'og:image') || meta(html, 'twitter:image');
      const description = meta(html, 'og:description') || meta(html, 'description');

      if (!title && !photo && !description) {
        return send(res, 200, { found: false, title: 'Perfil não confirmado', message: 'A página não expôs metadados públicos suficientes.' });
      }

      const displayName = title.replace(/\s*[|–-]\s*PayPal.*$/i, '').trim() || username;
      let photoUrl = '';
      try {
        const imageUrl = new URL(photo, finalUrl);
        if (imageUrl.protocol === 'https:' && (imageUrl.hostname === 'paypalobjects.com' || imageUrl.hostname.endsWith('.paypalobjects.com') || imageUrl.hostname.endsWith('.paypal.com'))) {
          photoUrl = imageUrl.href;
        }
      } catch {}

      return send(res, 200, {
        found: true,
        username,
        displayName,
        photoUrl,
        message: 'Dados disponíveis na página pública; podem estar incompletos.'
      });
    } catch {
      clearTimeout(timer);
      return send(res, 200, { found: false, title: 'Consulta indisponível', message: 'Não foi possível consultar a página agora. Isso não prova que a conta não existe.' });
    }
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    fs.readFile(INDEX, (error, data) => {
      if (error) {
        res.writeHead(500);
        return res.end('index.html não encontrado');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('Server running on port ' + PORT));
