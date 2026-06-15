const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const client = new MongoClient(process.env.MONGO_URI);
let db;

// Conecta UMA VEZ antes de ligar o servidor
async function start() {
    try {
        await client.connect();
        db = client.db("bolao_database");
        console.log("Conectado ao MongoDB!");
        
        server.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando!`));
    } catch (err) {
        console.error("ERRO CRÍTICO NA CONEXÃO:", err);
    }
}

const server = http.createServer(async (req, res) => {
    const p = url.parse(req.url, true);
    
    // ROTA GET
    if (req.method === "GET") {
        if (p.pathname === "/api/visitas") {
            try {
                const data = await db.collection("apostas").find().toArray();
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify(data));
            } catch (e) { res.writeHead(500); return res.end(); }
        }
        // ... (resto do seu código de servir arquivos)
    }
    // ... (seu resto do código POST)
});

start(); // Inicia o processo
