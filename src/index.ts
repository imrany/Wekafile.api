import express from "express"
import { config } from "dotenv"
import multer from "multer"
import cors from "cors"
import {readdir, mkdir, existsSync, renameSync } from "fs"
import socket from "./websocket"
import router from "./routes/api"
config()

const cors_option = {
    origin:["http://localhost:3000","https://file-shareio.web.app"],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PATCH", "PUT"]
}

const app =express()
const path="./uploads"
const store=multer.diskStorage({
    destination:(req:any,file:any,callback:any)=>{
        callback(null,path)
    },
    filename:(req:any,file:any,callback:any)=>{
        callback(null,file.originalname)
    }
})
const upload=multer({
    storage:store,
    // limits: { fileSize: 1000000 }, which is equivalent to 1MB.
})

app.set('view engine','ejs');
// app.use(express.static(`views`));
app.use('/uploads',express.static(`uploads`));
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(cors(cors_option))
app.use("/api",router)

//routes
app.post("/upload/:email",upload.single("file"),async(req:any,res:any)=>{
    try {
        console.log(req.file)
        renameSync(req.file.path, `${path}/${req.params.email}/${req.file.filename}`)
        console.log("Successfully moved the file!")
        res.status(200).send({url:`${path}/${req.params.email}/${req.file.filename}`})
    } catch (error:any) {
        res.status(505).send({error:error.message})
    }
})

app.get("/read_file",async(req:any,res:any)=>{
    try {
        readdir(path,"utf8",(err:any,files)=>{
            if(err){
                console.log(err)
                mkdir(path,()=>{
                    console.log(`uploads dir made`)
                })
            }else{
                res.send(files)
            }
        })
    } catch (error:any) {
        res.status(505).send({error:error.message})
    }
})

export function createFolder(email:string){
    if (!existsSync(`./uploads/${email}`)) {
        mkdir(`./uploads/${email}`,()=>{
            console.log("create folder")
        })
        return "create folder"
    }else{
        return "Dont create"
    }    
}

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