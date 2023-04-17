import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const PORT = 5000;



let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message))


setInterval(() => {
    const now = Date.now();
    const inactive = participants.filter(p => now - p.lastStatus > 10000);

    inactive.forEach(p => {
        participants.slice(participants.indexOf(p), 1);

        
    });
}, 15000);

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
        return res.status(422).send(erros);
    }

    try {

        const existingParticipant = await db.collection("participants").findOne({name: obj.name});
        if(existingParticipant){
            return res.status(409).send("Já existe um participante com esse nome");
        }

        await db.collection("participants").insertOne(obj);

        const newMessagePost = {
            from: obj.name,
            to: "Todos",
            text: "entra na sala...",
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        };

        await db.collection("messages").insertOne(newMessagePost);
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

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;

    const from = req.headers.user;
    const time = dayjs().format('HH:mm:ss');
    const newMessage = { from, to, text, type, time }

    const messageSchema = Joi.object({
        from: Joi.required().exist(),
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid("message", "private_message").required(),
    })

    const novoObj = {from, to, text, type} 

    const validation = messageSchema.validate(novoObj, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        return res.status(422).send(errors);
    }

    try {

        const participant = await db.collection("participants").findOne({name: from});
        if(!participant){
            return res.status(422).send("Participante não encontrado na sala.");
        }

         await db.collection("messages").insertOne(newMessage);
        res.sendStatus(201)
    } catch (err) {
        res.sendStatus(500);
    }

})

app.get("/messages", (req, res) => {
    const userID = req.headers.user;
    const { type } = req.query;
    const limit = parseInt(req.query.limit);

    const promise = db.collection("messages")
        .find({
            $or: [
                { to: "Todos" },
                { to: userID },
                { from: userID },
            ]
        }).toArray();
    promise
        .then(message => {

            if (isNaN(limit) || limit <= 0) {
                return res.sendStatus(422);
            } else if (limit) {
                const limitedMessage = message.slice(0, limit);
                const filteredMessage = limitedMessage.filter(op => type ? op.type === type : true);
                return res.send(filteredMessage);

            } else {
                const filteredMessage = message.filter(op => type ? op.type === type : true);
                return res.send(filteredMessage);
            }
        })

        .catch(err => res.sendStatus(500));
});


app.post("/status", (req, res) => {

    const user = req.headers.user;
    if(!user){
        return res.sendStatus(404);
    }

    const participant = participants.find(p => p.name === user);
    if(!participant){
        return res.sendStatus(404);
    }

    participant.lastStatus = Date.now();
    return res.sendStatus(200);

});



app.listen(PORT, () => console.log(`rodando servidor na porta ${PORT}`));