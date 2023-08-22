import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, ReqGroup } from "../types/types";
import {genSalt, compare, hash} from "bcryptjs";
import { verify, sign } from "jsonwebtoken"

export const verifyGroup=async(req:ReqGroup,res:any)=>{
    try {
        const email=req.body.email;
        const code=createCode()
        pool.query('SELECT * FROM groups WHERE email = $1', [email], (error, results) => {
            if (!results.rows[0]) {
                let mailTranporter=createTransport({
                    service:'gmail',
                    auth:{
                        user:process.env.TRANSPORTER,
                        pass:process.env.PASSWORD
                    }
                });
                let details:MailDetails={
                    from:process.env.TRANSPORTER,
                    to:email,
                    subject:`Group verification Code`,
                    text:`Your Fileshare One-Time Password (OTP) is \n${code}`
                }
                mailTranporter.sendMail(details,(err:any)=>{
                    if(err){
                        res.send({error:`Cannot sent verification code, try again!`});
                    }else{
                        res.send({code:code})
                    }
                })
            }else{
                res.send({error:`A group using ${email} already exist!`})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const registerGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {groupname,grouptype,email,password,lastLogin,userPlatform}=req.body;
        console.log({groupname,grouptype,email,password,lastLogin,userPlatform})
        if (groupname&&grouptype&&email&&password) {
            const salt=await genSalt(10);
            const hashedPassword=await hash(password,salt);
            pool.query('INSERT INTO groups (groupname,grouptype,email,password,lastLogin,userPlatform) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [`@${groupname}`,grouptype,email,hashedPassword,lastLogin,userPlatform], (error:any, results) => {
                if (error) {
                    res.status(408).send({error:`Account using ${email} already exist!`})
                }else{
                    let mailTranporter=createTransport({
                        service:'gmail',
                        auth:{
                            user:process.env.TRANSPORTER,
                            pass:process.env.PASSWORD
                        }
                    });
                    let details:MailDetails={
                        from:process.env.TRANSPORTER,
                        to:results.rows[0].email,
                        subject:`Welcome to Fileshare groups`,
                        text:`Welcome to Fileshare, Group ${results.rows[0].groupname},\n Your group email is ${results.rows[0].email}.\n Your Group password ${password}.\n\n You may share this details to you collegues.`
                    }
                    mailTranporter.sendMail(details,(err:any)=>{
                        if(err){
                            res.send({error:`Cannot sent email, try again!`});
                        } else{
                            res.status(201).send({
                                msg:`Welcome ${results.rows[0].groupname}`,
                                data:{
                                    id:results.rows[0].id,
                                    groupname:results.rows[0].groupname,
                                    email:results.rows[0].email,
                                    photo:results.rows[0].photo,
                                    token:generateGroupToken(results.rows[0].id)
                                }
                            })
                        }
                    })   
                }
            })   
        } else {
            res.status(403).send({error:"Fill all the required fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const loginGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {email,password,lastLogin,userPlatform}=req.body;
        if(email&&password&&lastLogin&&userPlatform){
            pool.query('SELECT * FROM groups WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    if(results.rows[0]){
                        if (results.rows[0].email&&await compare(password,results.rows[0].password)) {
                            pool.query('UPDATE groups SET lastLogin = $1, userPlatform = $2 WHERE email = $3 RETURNING *',[lastLogin,userPlatform,results.rows[0].email],(error,results)=>{
                                if(error){
                                    console.log(error)
                                }else{
                                    res.status(201).send({
                                        msg:`Welcome ${results.rows[0].groupname}`,
                                        data:{
                                            id:results.rows[0].id,
                                            groupname:results.rows[0].groupname,
                                            email:results.rows[0].email,
                                            photo:results.rows[0].photo,
                                            token:generateGroupToken(results.rows[0].id)
                                        }
                                    })
                                }
                            })
                        } else {
                            res.status(401).send({error:'Invalid Credentials'})
                        }
                    }else{
                        res.status(404).send({error:`A group associated with email ${email} does not exist!`})
                    }
                }
            })
        }else{
            res.status(403).send({error:"Fill all the required fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getGroups=async(req:ReqGroup,res:any)=>{
    try {
        pool.query('SELECT * FROM groups', (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed to get groups.`})
            }else{
                res.status(200).json(results.rows)
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getGroupDetails=async(req:ReqGroup,res:any)=>{
    try {
        const email = req.params.email
        pool.query('SELECT * FROM groups WHERE email = $1', [email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Group associated with the email address ${email} does not exist!`})
            }else{
                if(results.rows[0]){
                    res.status(200).json({
                        data:{
                            groupname:results.rows[0].groupname,
                            email:results.rows[0].email,
                            photo:results.rows[0].photo,
                            grouptype:results.rows[0].grouptype
                        }
                    })
                }else{
                    res.status(404).send({error:`Group associated with the email address ${email} does not exist!`})
                }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const protectGroup=async(req:any,res:any,next:any)=>{
    let token
    if(req.headers.authorization&&req.headers.authorization.startsWith('Bearer')){
        try{
            token=req.headers.authorization.split(' ')[1]
            verify(token,`${process.env.JWT_GROUP}`);
            next()
        }catch (error:any){
            res.status(401).send({error:'Not Authorised☠'})
        }
    }
    if(!token){
      res.status(401).send({error:'No Token Available☠'})
    }
};

export const deleteGroup=async(req:ReqGroup,res:any)=>{
    try {
        const email = req.params.email
        pool.query('DELETE FROM groups WHERE email = $1 RETURNING *', [email], (error, results) => {
            if (error) {
                res.status(408).send({error:`Failed to delete group associated with the email ${email}`})
            }else{
                if (results.rows[0]) {
                    let mailTranporter=createTransport({
                        service:'gmail',
                        auth:{
                            user:process.env.TRANSPORTER,
                            pass:process.env.PASSWORD
                        }
                    });
                    let details:MailDetails={
                        from:process.env.TRANSPORTER,
                        to:results.rows[0].email,
                        subject:`Your Group Account Was Deleted`,
                        text:`Hello ${results.rows[0].groupname},\n Your Group was deleted. We are sorry to see your leave, see you again at https://file-shareio.web.app/.\n\nFeel free to share your feedback by replying to this email.`
                    }
                    mailTranporter.sendMail(details,(err:any)=>{
                        if(err){
                            res.send({error:`Cannot sent email, try again!`});
                        } else{
                            res.status(200).send({msg:`Group associated with email ${results.rows[0].email} deteled successful`})
                        }
                    })   
                } else {
                    res.status(404).send({error:`Group associated with email ${email} does not exist!`})
                }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

const generateGroupToken=(id:string)=>{
    return sign({id},`${process.env.JWT_GROUP}`,{
        expiresIn:'10d'
    })
};

function createCode():string {
    let date=new Date()
    let hr=date.getMinutes()<10?`0${date.getMinutes()}`:date.getMinutes()
    const code=`${date.getFullYear()}${hr}`
    return code
}
