import express from "express"
import { config } from "dotenv"
import path from "path"
import cors from "cors"
config()

const cors_option = {
    origin: "*",
    methods: ["GET", "POST"]
 }

const app =express()
// app.set('view engine','ejs');
app.use(express.static(`views`));
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cors({}))

app.get("/*",(req,res)=>{
    res.sendFile(path.resolve("views","index.html"))
})

const port=process.env.PORT||8000
const server=app.listen(port,()=>{
    console.log(`Server running on port ${port}`)
})

let io = require("socket.io")(server,{
    cors: {
        origin: ["http://localhost:8000","http://localhost:3001"],
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});
 
let users:any=[{userid:"",photo:"",platform:""}]
io.on("connection", function(socket: any) {
    var clientIp = socket.request.connection.remoteAddress;
    console.log(`a user connected: ${socket.id}, ClientIP : ${clientIp} `);

    socket.on("peers",(client_id:any)=>{
        let user
        for (let index = 0; index < users.length; index++) {
             user = users[index];
        }
        if(client_id.userid!==user.userid){
            users.push(client_id)
        }
        console.log(users.slice(1,users.length))
        socket.emit("peers",users.slice(1,users.length))
    })

    socket.on("upload", (file:any, err:any) => {
        console.log(file);  
        if(err){
            console.log(err)
        }
        socket.broadcast.emit("download",file)
    });

    //disconnect
    socket.on("disconnect", (reason:any) => {
        socket.emit(`${users.id} has left`)
    });
});
  