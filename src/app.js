import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";


const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const PORT = 5000;
const participantes = [];

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect().then(()=> db = mongoClient.db("batePapoUol"))

app.post("/participants", (req, res) => {

    const { name } = req.body;

    const promise = db.collection("participante").insertOne({name, lastStatus});
    promise.then(() => res.sendStatus(201));
    promise.catch(() => res.sendStatus(500));

})

app.get("/participants", (req, res) => {

    const promise = db.collection("participante").find({}).toArray();
    promise.then(participante => res.send(participante));
    promise.catch(() => res.sendStatus(500));

})

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body;
    res.send();
})

app.get("/messages", (req, res) => {
    res.send();
})

app.listen(PORT, () => console.log(`rodando servidor na porta ${PORT}`));