import pool from "../pg";

const verifyEmail=async(req:any,res:any)=>{
    try {
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

const registerUser=async(req:any,res:any)=>{
    try {
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

const loginUser=async(req:any,res:any)=>{
    try {
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export {
    registerUser,
}