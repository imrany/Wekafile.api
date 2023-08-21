import pool from "../pg"
import { FileReq } from "../types/types"

export async function getSharedFiles(req:FileReq,res:any){
    try {
        const {email}=req.params
        pool.query('SELECT * FROM sharedfiles WHERE email = $1',[email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed fetch shared files.`})
            }else{
                res.status(200).json({files:results.rows,count:results.rowCount})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export async function storeSharedFiles(req:FileReq,res:any){
    try {
        const {email}=req.params
        const {filename,username,uploadedAt,size,file,type,sharedTo}=req.body 
        if(filename&&email&&username&&uploadedAt&&size&&file&&type&&sharedTo){
            pool.query('SELECT * FROM sharedfiles WHERE filename = $1',[filename],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed store file, this file already exist!!'})
                }else{
                    if(results.rows[0]){
                        pool.query('INSERT INTO sharedfiles (filename,username,uploadedAt,size,file,type,sharedTo,email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [filename,username,uploadedAt,size,file,type,sharedTo,email], (error:any, results) => {
                            if (error) {
                                res.status(408).send({error:`Failed store file, ${filename} already exist!!`})
                            }else{
                                res.status(201).send({
                                    msg:`${filename} was successfully added`,
                                })
                            }
                        })   
                    }else{
                        res.status(404).send({error:`Failed store file, ${filename} already exist!!`})
                    }
                }
            })
        }else{
            res.status(403).send({error:"Cannot store file, missing some fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}