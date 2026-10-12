import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('out');
let html;
try { html = await readFile(path.join(root, 'index.html'), 'utf8'); }
catch { console.error('Сначала выполните npm run build.'); process.exit(1); }
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (html.match(/src="(\/[^"/]+)\/_next\//)?.[1] || '');
const mime = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (basePath && pathname === '/') { response.writeHead(302, { Location: `${basePath}/` }); response.end(); return; }
    if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) { response.writeHead(404); response.end(); return; }
    const relative = pathname.slice(basePath.length).replace(/^\/+/, '');
    let file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Страница не найдена'); }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Nefesh: http://localhost:${process.env.PORT || 3000}${basePath}/`));
