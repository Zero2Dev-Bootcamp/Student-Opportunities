const path = require('path');
const fs = require('fs');

const port = 3000;

Bun.serve({
  port: port,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = path.join(__dirname, 'public', url.pathname);

    if (url.pathname === '/') {
      filePath = path.join(__dirname, 'public', 'index.html');
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

console.log(`Server listening at http://localhost:${port}`);
