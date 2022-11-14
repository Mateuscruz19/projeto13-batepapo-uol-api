import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import { MongoClient,ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const userSchema = joi.object({
    name: joi.string().required()
})

const maintenanceSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required(),
    time: joi.required()
})

const menssageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required()
})

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI)

try{
    await mongoClient.connect()
} catch (err){
    console.log(err)
}
const db = mongoClient.db("bate_papo_uol") 
const collectionParticipants = db.collection("participants");
const collectionMaintenance = db.collection("maintenance")
const collectionMessages = db.collection("Messages")

// PART 1 - POST /participants

app.post("/participants", async (req,res) => {
    // User Schema verification:
    const nome = req.body 
    const validation = userSchema.validate(nome, {abortEarly: false})
    const user = {nome: req.body.name,lastStatus: Date.now()}

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)
        res.status(402).send(errors);
        return;  
    }

    try{
        await db.collection("participants").insertOne(user)
        console.log(collectionMaintenance)
    } catch (err){
        res.status(422).send(err);
    }

     // Maintenance post verification
     const day = dayjs().format("hh:mm:ss")
     const body = {from: nome, to: 'Todos', text: 'entra na sala...', type: 'status', time: day}
     const validation2 = maintenanceSchema.validate(body, {abortEarly:false})

     if(validation.error) {
         const er = validation2.error.details.map(detail => detail.message)
         res.send(er);
         return;
     }

     try{
         await db.collection("maintenance").insertOne(body)
         res.status(201).send("Working")
         console.log(collectionParticipants)
     } catch (err){
         res.status(422).send("Falhou");
     }
    
});

app.get ("/participants", async (req,res) => {
    const participants = await collectionParticipants.find({}).toArray()
    res.send(participants)
});

app.post("/messages", async (req,res) => {
   const message = req.body
   const { User } = req.headers;

   try{
    const userExists = await collectionParticipants.findOne({ name: User})
    if(!userExists) {
        res.status(422).send({message: "Usuario não está conectado"})
        return
    }

    const validation = menssageSchema.validate(message, {abortEarly: false})

    if(validation.error){
        const errors = validation.error.details.map(detail => detail.message)

        res.status(422).send(errors);
        return;  
    }
    const day = dayjs().format("hh:mm:ss")

    await collectionMessages.insertOne({
        ...message,
        from: User,
        time: day
    });

    res.status(201).send("Mensagem enviada com sucesso");
    
   } catch (err) {
        console.log(err)
        res.sendStatus(500)
   }

     res.send("OK")
});


app.listen(process.env.PORT, () =>
 console.log(`Server running in port ${process.env.PORT}`))