import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi, { valid } from "joi";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const PORT = 5000;
const participantes = [];

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message))

app.post("/participants", async (req, res) => {

    const { name } = req.body;
    const lastStatus = Date.now();

    const obj = {
        name,
        lastStatus
    }

    const nameSchema = Joi.object({
        name: Joi.string().required()
    });

    const validation = nameSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const erros = validation.error.details.map(detail => detail.message);
        res.status(422).send(erros);
    }

    try {
        await db.collection("participants").insertOne(obj);
        res.sendStatus(201);
    } catch (err) {
        res.sendStatus(500)
    }
});

app.get("/participants", async (req, res) => {



    try {
        const participante = await db.collection("participants").find({}).toArray();
        res.send(participante);
    } catch (err) {
        res.sendStatus(500)
    }
});

app.post("/messages", (req, res) => {

    const user = req.headers;
    const time = dayjs().format('HH:mm:ss');


    const messageSchema = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid("message", "private_message"),
        from: Joi.required()
    })

    const validation = messageSchema.validate(req.body, { abortEarly: false })
    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors);
    }

    const newMessage = { from: user, to, text, type, time }


    const promise = db.collection("messages").insertOne(newMessage);
    promise.then(() => res.sendStatus(201));
    promise.catch(() => res.sendStatus(500));

})

app.get("/messages", (req, res) => {

    const { user } = req.headers;
    const { type } = req.query;
    const limit = parseInt(req.query.limit);


    const promise = db.collection("messages").find({}).toArray();
    promise.then(
        message => {

            if (isNaN(limit) || limit <= 0) {
                res.sendStatus(422);
            } else if (limit) {
                const limitedMessage = message.slice(0, limit);
                const filteredMessage = limitedMessage.filter(op => type ? op.type === type : true);
                res.send(filteredMessage);

            } else {
                const filteredMessage = message.filter(op => type ? op.type === type : true);
                res.send(filteredMessage);
            }
        });

    promise.catch(() => res.sendStatus(500));
})


app.post("/status", (req, res) => {

})

app.listen(PORT, () => console.log(`rodando servidor na porta ${PORT}`));