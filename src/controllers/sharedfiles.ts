import pool from "../pg"
import { FileReq } from "../types/types"

export async function getSharedFiles(req:FileReq,res:any){
    try {
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}