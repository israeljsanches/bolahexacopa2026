const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Conecte ao MongoDB usando a variável de ambiente que configuramos no Render
const client = new MongoClient(process.env.MONGO_URI);
let db;

// Função para garantir que o banco esteja conectado
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db("bolao_database"); // Nome do seu banco
    }
}

const server = http.createServer(async (req, res) => {
    const p = url.parse(req.url, true);
    await connectDB();

    // ROTA GET: Busca dados
    if (req.method === "GET") {
        if (p.pathname === "/api/visitas") {
            try {
                const data = await db.collection("apostas").find().toArray();
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify(data));
            } catch (err) { res.writeHead(500); return res.end(); }
        }
        
        // Servir o arquivo index.html principal
        let filePath = path.join(PUBLIC_DIR, p.pathname === "/" ? "index.html" : p.pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) { res.writeHead(404); res.end(); }
            else { res.writeHead(200); res.end(content); }
        });
        return;
    }

    // ROTA POST: Grava dados
    if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const data = JSON.parse(body);
                if (p.pathname === "/api/visitas") {
                    await db.collection("apostas").deleteMany({});
                    if (data.length > 0) await db.collection("apostas").insertMany(data);
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (err) { res.writeHead(500); res.end(); }
        });
        return;
    }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando!`));
