import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, ReqGroup } from "../types/types";
import {genSalt, compare, hash} from "bcryptjs";
import { verify, sign } from "jsonwebtoken"
import { unlinkSync, existsSync, mkdirSync, rmdir } from "fs"

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
        const {groupname,grouptype,email,password,lastLogin,userPlatform, privacy}=req.body;
        console.log({groupname,grouptype,email,password,lastLogin,userPlatform})
        if (groupname&&grouptype&&email&&password) {
            const salt=await genSalt(10);
            const hashedPassword=await hash(password,salt);
            pool.query('INSERT INTO groups (groupname,grouptype,email,password,lastLogin,userPlatform,privacy) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [`@${groupname}`,grouptype,email,hashedPassword,lastLogin,userPlatform,privacy], (error:any, results) => {
                if (error) {
                    res.status(408).send({error:`Account using ${email} already exist!`})
                }else{
                    try {
                        if (!existsSync(`../../uploads/${email}`)) {
                          mkdirSync(`../../uploads/${email}`);
                        }
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
                                        privacy:results.rows[0].privacy,
                                        token:generateGroupToken(results.rows[0].id)
                                    }
                                })
                            }
                        })  
                    } catch (err:any) {
                        res.status(408).send({error:err.message})
                        console.error(err);
                    }
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
                                        msg:`Welcome to ${results.rows[0].groupname}`,
                                        data:{
                                            id:results.rows[0].id,
                                            groupname:results.rows[0].groupname,
                                            email:results.rows[0].email,
                                            photo:results.rows[0].photo,
                                            privacy:results.rows[0].privacy,
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
                            privacy:results.rows[0].privacy,
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

        pool.query('DELETE FROM sharedfiles WHERE email = $1 RETURNING *', [email], (error, results) => {
            if (error) {
                res.status(408).send({error:`Failed to delete shared files associated with the email ${email}`})
            }else{
                if (results.rows) {
                    pool.query('DELETE FROM groups WHERE email = $1 RETURNING *', [email], (error, results) => {
                        if (error) {
                            res.status(408).send({error:`Failed to delete group associated with the email ${email}`})
                        }else{
                            if (results.rows[0]) {
                                if (existsSync(`../../uploads/${email}`)) {
                                    rmdir(`../../uploads/${email}`, (err) => {
                                        if (err) {
                                          console.error(err);
                                          return;
                                        }
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
                                    });
                                }  
                            } else {
                                res.status(404).send({error:`Group associated with email ${email} does not exist!`})
                            }
                        }
                    })
                }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const giveAccess=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const {filename,allowedEmail}=req.body
        pool.query('SELECT * FROM groups WHERE email = $1', [allowedEmail], (error, results) => {
            if (results.rows) {
                pool.query('SELECT * FROM sharedfiles WHERE email = $1 AND filename=$2',[email,filename],(error,result)=>{
                    if(error){
                        console.log({error:error})
                    }else{
                        if (result.rows[0]) {
                            pool.query('UPDATE sharedfiles SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE filename = $2',[allowedEmail,filename], (error, results) => {
                                if(error){
                                    console.log(error)
                                    res.send({error:"Cannot give access!!"})
                                }else{
                                    res.send({msg:`Access created`})
                                }
                            })
                        } else {
                            res.status(404).send({error:`Not Found`})
                        }
                    }
                })
                
            }else{
                res.send({error:`Group using ${allowedEmail} does not exist!`})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const changeGroupVisiblity=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const privacy=req.body.privacy
        pool.query('UPDATE groups SET privacy = $1 WHERE email = $2 RETURNING *',[privacy,email], (error, results) => {
            if(error){
                console.log(error)
                res.send({error:`Group associated with email ${email} does not exist!`})
            }else{
                const resp=privacy===true?"private":"public"
                let data={
                    id:results.rows[0].id,
                    groupname:results.rows[0].groupname,
                    email:results.rows[0].email,
                    photo:results.rows[0].photo,
                    privacy:results.rows[0].privacy,
                    token:generateGroupToken(results.rows[0].id)
                }
                pool.query('UPDATE sharedfiles SET privacy = $1 WHERE email = $2',[privacy,email], (error, results) => {
                    if(error){
                        console.log(error)
                        res.send({error:`Cannot find shared files associated with group ${email}!`})
                    }else{
                        res.send({msg:`Group is now ${resp}`,data})
                    }
                })
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const deleteSharedFile=async(req:any,res:any)=>{
    try {
        const filename=req.params.filename
        pool.query('DELETE FROM sharedfiles WHERE filename = $1 RETURNING *',[filename],(error,results)=>{
            if (error) {
                res.status(408).send({error:`Failed to delete file ${filename.slice(0,25)}...`})
            }else{
                if (results.rows[0]) {
                    if (existsSync(results.rows[0].file)) {
                        // The file exists, so you can proceed with deleting it
                        try {
                            unlinkSync(results.rows[0].file)
                            res.status(200).send({msg:`You've successfully deleted ${filename.slice(0,25)}...`})
                        } catch (err:any) {
                            res.status(404).send({error:err.message})
                        }
                    } else {
                        console.log('File not found')
                    }
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
