import express from "express"
import { config } from "dotenv"
import multer from "multer"
import cors from "cors"
import {rmSync, mkdir,mkdirSync, existsSync, renameSync } from "fs"
import socket from "./websocket"
import router from "./routes/api"
config()

const cors_option = {
    origin:["http://localhost:3000","https://wekafile.web.app"],
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
    //limits: { fileSize: 1000000 }, //which is equivalent to 1MB.
})

app.use(cors(cors_option))
app.set('view engine','ejs');
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use('/uploads',express.static(`uploads`));
app.use("/api",router)

//routes
app.post("/upload/:accountType/:email",upload.single("file"),async(req:any,res:any)=>{
    try {
        renameSync(req.file.path, `${path}/${req.params.accountType}/${req.params.email}/${req.file.filename}`)
        console.log(`Successfull moved file ${req.file.filename} to ${path}/${req.params.accountType}/${req.params.email}/${req.file.filename}`)
        res.status(200).send({url:`${path}/${req.params.accountType}/${req.params.email}/${req.file.filename}`})
    } catch (error:any) {
        res.status(505).send({error:error.message})
    }
})

app.post("/upload/profile/:accountType/:email",upload.single("file"),async(req:any,res:any)=>{
    try {
        createFolder(req.params.accountType,req.params.email).then((msg:any)=>{
            renameSync(req.file.path, `${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`)
            console.log(`Successfull moved file ${req.file.filename} to ${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`)
            res.status(200).send({url:`${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`})
        }).catch((err:any)=>{
            renameSync(req.file.path, `${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`)
            console.log(`Successfull moved file ${req.file.filename} to ${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`)
            res.status(200).send({url:`${path}/${req.params.accountType}/${req.params.email}/profile.${req.file.mimetype.slice(6,req.file.mimetype.length)}`})
        })
    } catch (error:any) {
        res.status(505).send({error:error.message})
    }
})

export function createFolder(accountType:string,email:string){
    return new Promise((resolve,reject)=>{
        if (existsSync(`./uploads/${accountType}/${email}`)) {
            reject("folder exists")
        }    
        mkdirSync(`./uploads/${accountType}/${email}`, { recursive: true })
        resolve("folder created")
    })
}

export function removeFolder(accountType:string,email:string){
    return new Promise((resolve,reject)=>{
        if (!existsSync(`./uploads/${accountType}/${email}`)) {
            reject("folder doesn't exist")
        }    
        rmSync(`./uploads/${accountType}/${email}`, { recursive: true, force: true })
        resolve("folder removed")
    })
}

function createUploadFolder(){
    if (!existsSync(path)) {
        mkdir(path,()=>{
            console.log(`${path} created`)
        })
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
createUploadFolder()
