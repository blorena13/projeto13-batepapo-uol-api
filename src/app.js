import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const PORT = 5000;
const participantes = [];

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect()
.then(()=> db = mongoClient.db())
.catch((err) => console.log(err.message))

app.post("/participants", (req, res) => {

    const { name } = req.body;
    const lastStatus = Date.now();

    const obj = {
        name,
        lastStatus
    }
    

    const promise = db.collection("participants").insertOne(obj);
    promise.then(() => res.sendStatus(201));
    promise.catch(() => res.sendStatus(500));

})

app.get("/participants", (req, res) => {

    const promise = db.collection("participants").find({}).toArray();
    promise.then(participante => res.send(participante));
    promise.catch(() => res.sendStatus(500));

})

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body;
    
    const time = dayjs().format('HH:mm:ss');

    const newMessage = {to, text, type, time}

    const promise = db.collection("messages").insertOne(newMessage);
    promise.then(()=> res.sendStatus(201));
    promise.catch(()=> res.sendStatus(500));
    
})

app.get("/messages", (req, res) => {
    res.send();
})

app.post("/status", (req, res) => {
    
})

app.listen(PORT, () => console.log(`rodando servidor na porta ${PORT}`));