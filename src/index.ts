import express from "express"
import { config } from "dotenv"
import cors from "cors"
import socket from "./websocket"
import router from "./routes/api"
config()

var allowlist = ["http://localhost:3000","https://file-shareio.web.app"]
var cors_option = function (req:any, callback:any) {
  var corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { 
        origin: true,
        methods: ["GET", "POST", "DELETE", "UPDATE", "PATCH", "PUT"]
    } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

const app =express()
// app.set('view engine','ejs');
app.use(express.static(`views`));
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cors(cors_option))
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
    allowEIO3: true
});
socket(io);