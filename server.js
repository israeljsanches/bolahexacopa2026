const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const client = new MongoClient(process.env.MONGO_URI);

async function getCollection(name) {
    await client.connect();
    return client.db("bolao_db").collection(name);
}

const server = http.createServer(async (req, res) => {
    const p = url.parse(req.url, true);

    if (req.method === "GET") {
        if (p.pathname === "/api/visitas") {
            const collection = await getCollection("apostas");
            const data = await collection.find({}).toArray();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(data));
        }
        if (p.pathname === "/api/gabarito") {
            const collection = await getCollection("gabarito");
            const data = await collection.findOne({ _id: "atual" });
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(data ? data.conteudo : {}));
        }
        let filePath = path.join(PUBLIC_DIR, p.pathname === "/" ? "index.html" : p.pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) { res.writeHead(404); res.end(); }
            else { res.writeHead(200); res.end(content); }
        });
        return;
    }

    if (req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const data = body ? JSON.parse(body) : null;
                if (p.pathname === "/api/visitas") {
                    const collection = await getCollection("apostas");
                    await collection.deleteMany({});
                    await collection.insertMany(data);
                } else if (p.pathname === "/api/gabarito") {
                    const collection = await getCollection("gabarito");
                    await collection.updateOne({ _id: "atual" }, { $set: { conteudo: data } }, { upsert: true });
                } else if (p.pathname === "/api/processar") {
                    // Mantenha sua lógica de processamento aqui se precisar...
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando!`));