import express from "express"
import { config } from "dotenv"
import cors from "cors"
import socket from "./websocket"
import router from "./routes/api"
config()

const cors_option = {
    origin:["http://localhost:8000","http://localhost:3000"],
    methods: ["GET", "POST", "DELETE", "PATCH", "PUT"]
 }

const app =express()
// app.set('view engine','ejs');
app.use(express.static(`views`));
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cors(cors_option))
app.use("/api",router)


const port=process.env.PORT||8000
const server=app.listen(port,()=>{
    console.log(`Server running on port ${port}`)
})

let io = require("socket.io")(server,{
    cors: {
        origin: cors_option.origin,
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});
socket(io);