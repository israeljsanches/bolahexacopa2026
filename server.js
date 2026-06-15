const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function start() {
    try {
        await client.connect();
        db = client.db("bolao_database");
        console.log("Conectado ao MongoDB!");
        server.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando!`));
    } catch (err) { console.error("ERRO CRÍTICO NA CONEXÃO:", err); }
}

const server = http.createServer(async (req, res) => {
    const p = url.parse(req.url, true);

    // --- MÉTODOS GET ---
    if (req.method === "GET") {
        if (p.pathname === "/api/visitas") {
            const data = await db.collection("apostas").find().toArray();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(data));
        }
        if (p.pathname === "/api/gabarito") {
            const data = await db.collection("gabarito").findOne({ _id: "atual" });
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(data ? data.conteudo : {}));
        }

        // SERVE ARQUIVOS ESTÁTICOS (HTML, CSS, JS)
        let filePath = path.join(PUBLIC_DIR, p.pathname === "/" ? "index.html" : p.pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) { res.writeHead(404); res.end(); }
            else { res.writeHead(200); res.end(content); }
        });
        return;
    }

    // --- MÉTODOS POST ---
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
                else if (p.pathname === "/api/gabarito") {
                    await db.collection("gabarito").updateOne({ _id: "atual" }, { $set: { conteudo: data } }, { upsert: true });
                } 
                else if (p.pathname === "/api/processar") {
                    // LÓGICA DE PROCESSAMENTO DE PONTOS
                    const apostas = await db.collection("apostas").find().toArray();
                    const gabaritoDoc = await db.collection("gabarito").findOne({ _id: "atual" });
                    
                    if (gabaritoDoc && gabaritoDoc.conteudo) {
                        const gabarito = gabaritoDoc.conteudo;
                        for (let aposta of apostas) {
                            let totalPontos = 0;
                            for (let matchId in aposta.palpites) {
                                if (gabarito[matchId]) {
                                    const pA = aposta.palpites[matchId].goalsA;
                                    const pB = aposta.palpites[matchId].goalsB;
                                    const rA = gabarito[matchId].realA;
                                    const rB = gabarito[matchId].realB;
                                    if (pA === rA && pB === rB) totalPontos += 10;
                                    else if ((pA > pB && rA > rB) || (pA < pB && rA < rB) || (pA === pB && rA === rB)) totalPontos += 5;
                                }
                            }
                            await db.collection("apostas").updateOne({ _id: aposta._id }, { $set: { pontos: totalPontos } });
                        }
                    }
                }
                
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (err) { 
                console.error("Erro no servidor:", err);
                res.writeHead(500); 
                res.end(JSON.stringify({ error: "Erro no servidor" })); 
            }
        });
        return;
    }
});

start();
