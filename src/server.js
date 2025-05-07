const path = require('path');
const fs = require('fs');

const port = 3000;

Bun.serve({
  port: port,
  fetch(req) {
    const url = new URL(req.url);
    // Adjust the base path to be the project root (one level up from src)
    const publicDir = path.join(__dirname, '..', 'public');
    let filePath = path.join(publicDir, url.pathname);

    if (url.pathname === '/') {
      filePath = path.join(publicDir, 'index.html');
    }

    try {
      const file = Bun.file(filePath);
      if (file) {
        return new Response(file);
      }
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }

    return new Response("File not found", { status: 404 });
  },
});
