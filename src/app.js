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


app.post("/status", async (req, res) => {

    const user = req.headers.user;

try {
    const now = Date.now();
    const result = await db.collection("participants").findOneAndUpdate(
        {name: user},
        {$et: {lastStatus: now}},
    )

    if(!result.value){
        return res.sendStatus(404);
    }
    res.sendStatus(200);

} catch(err){
    res.sendStatus(500);

}
});

setInterval( async () => {

    try{
        const nowD = Date.now();
        const inactive = await db.collection("participants")
        .find({lastStatus:{$lt: nowD - 15000}})
        .toArray();

        inactive.forEach(async (p)=> {
            await db.collection("participants").deleteOne({_id: p._id});

            const finalMessage = {
                from: p.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss")
            }
            await db.collection("messages").insertOne(finalMessage);
        });
    } catch(err){
        
    }

    
}, 15000);



app.listen(PORT, () => console.log(`rodando servidor na porta ${PORT}`));