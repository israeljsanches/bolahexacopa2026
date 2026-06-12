const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "apostas.json");
const GABARITO_FILE = path.join(DATA_DIR, "gabarito.json");

const server = http.createServer((req, res) => {
    const p = url.parse(req.url, true);

    // ROTA GET: Buscar dados
    if (req.method === "GET") {
        if (p.pathname === "/api/visitas") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(fs.readFileSync(DATA_FILE, "utf-8"));
        }
        if (p.pathname === "/api/gabarito") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(fs.readFileSync(GABARITO_FILE, "utf-8"));
        }
        let filePath = path.join(PUBLIC_DIR, p.pathname === "/" ? "index.html" : p.pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) { res.writeHead(404); res.end(); }
            else { res.writeHead(200); res.end(content); }
        });
        return;
    }

    // ROTA POST: Salvar ou Processar
    if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const data = body ? JSON.parse(body) : null;
                
                if (p.pathname === "/api/visitas") {
                    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
                } else if (p.pathname === "/api/gabarito") {
                    fs.writeFileSync(GABARITO_FILE, JSON.stringify(data, null, 2));
                } else if (p.pathname === "/api/processar") {
                    const apostadores = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
                    const gabarito = JSON.parse(fs.readFileSync(GABARITO_FILE, "utf-8"));
                    
                    apostadores.forEach(ap => {
                        let totalPontos = 0;
                        if (ap.palpites) {
                            Object.keys(ap.palpites).forEach(mId => {
                                if (gabarito[mId]) {
                                    const pA = Number(ap.palpites[mId].goalsA);
                                    const pB = Number(ap.palpites[mId].goalsB);
                                    const gA = Number(gabarito[mId].realA);
                                    const gB = Number(gabarito[mId].realB);
                                    
                                    if (pA === gA && pB === gB) totalPontos += 10;
                                    else if (Math.sign(pA - pB) === Math.sign(gA - gB)) totalPontos += 5;
                                }
                            });
                        }
                        ap.pontos = totalPontos;
                    });
                    fs.writeFileSync(DATA_FILE, JSON.stringify(apostadores, null, 2));
                    console.log("Ranking processado com sucesso!");
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (err) {
                console.error("Erro no POST:", err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando em http://localhost:${PORT}`));