const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000; // A porta que seu run-server.cmd usa
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "apostas.json");

// Garante que a pasta e o arquivo existam
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readJsonSafe() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); } 
  catch { return []; }
}

function writeJsonAtomic(obj) {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_FILE);
}

const server = http.createServer((req, res) => {
  const p = url.parse(req.url, true);

  // ROTA GET: Buscar apostas
  if (req.method === "GET" && p.pathname === "/api/visitas") {
    ensureDataFile();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(readJsonSafe()));
  }

  // ROTA POST: Salvar nova lista de apostas
  if (req.method === "POST" && p.pathname === "/api/visitas") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const novaLista = JSON.parse(body);
        ensureDataFile();
        writeJsonAtomic(novaLista);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Erro ao salvar" }));
      }
    });
    return;
  }

  // SERVIR ARQUIVOS ESTÁTICOS (index.html, CSS, etc)
  let filePath = path.join(PUBLIC_DIR, p.pathname === "/" ? "index.html" : p.pathname);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Arquivo não encontrado");
    } else {
      res.writeHead(200);
      res.end(content);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});