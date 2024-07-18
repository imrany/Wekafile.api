import express from "express"
import { config } from "dotenv"
import cors from "cors"
import socket from "./websocket"
import router from "./routes/api"
import drive from './google/drive'
config()

const cors_option = {
    origin:["http://localhost:3000","https://wekafile.web.app"],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PATCH", "PUT"]
}

const app =express()

app.use(cors(cors_option))
app.set('view engine','ejs');
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use('/drive',drive)
app.use("/api",router)

const port=process.env.PORT||8080
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
    allowEIO3: true,
    maxHttpBufferSize:1e8
});
socket(io);
