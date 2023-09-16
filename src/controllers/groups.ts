import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, ReqGroup } from "../types/types";
import { verify, sign } from "jsonwebtoken"
import { unlinkSync, existsSync } from "fs"
import { createFolder, removeFolder } from "..";

export const registerGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {groupname,grouptype,email,lastLogin,userPlatform, privacy}=req.body;
        if (groupname&&grouptype&&email) {
            if (await createFolder("groups",email)==="create folder") {
                pool.query('INSERT INTO groups (groupname,grouptype,email,lastLogin,userPlatform,privacy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [`@${groupname}`,grouptype,email,lastLogin,userPlatform,privacy], (error:any, results) => {
                    let group_results=results.rows[0]
                    if (error) {
                        res.status(408).send({error:`Account using ${email} already exist!`})
                    }else{
                        pool.query('UPDATE users SET group_ownership = $1 WHERE email = $2 RETURNING *',[group_results.groupname,group_results.email],(error,results)=>{
                            if(error){
                                console.log(error)
                            }else{
                                res.status(201).send({
                                    msg:`${group_results.groupname} was successfully created`,
                                    data:{
                                        token:generateGroupToken(results.rows[0].id)
                                    }
                                })
                            }
                        })
                    }
                })   
            } else {
                res.send({error:"Try again!!"})
            }
        } else {
            res.status(403).send({error:"Fill all the required fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const loginGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {email,lastLogin,userPlatform}=req.body;
        if(email &&lastLogin&&userPlatform){
            pool.query('SELECT * FROM groups WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    await createFolder("groups",results.rows[0].email)
                    if(results.rows[0]){
                        if (results.rows[0].email) {
                            await createFolder("groups",results.rows[0].email)
                            pool.query('UPDATE groups SET lastLogin = $1, userPlatform = $2 WHERE email = $3 RETURNING *',[lastLogin,userPlatform,results.rows[0].email],(error,results)=>{
                                if(error){
                                    console.log(error)
                                }else{
                                    res.status(201).send({
                                        msg:`Welcome to ${results.rows[0].groupname}`,
                                        data:{
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
        removeFolder("groups",email)
        if (removeFolder("groups",email)==="remove folder") {
            pool.query('DELETE FROM group_uploads WHERE email = $1 RETURNING *', [email], (error, results) => {
                if (error) {
                    res.status(408).send({error:`Failed to delete shared files associated with the email ${email}`})
                }else{
                    if (results.rows) {
                        pool.query('DELETE FROM groups WHERE email = $1 RETURNING *', [email], (error, results) => {
                            if (error) {
                                res.status(408).send({error:`Failed to delete group associated with the email ${email}`})
                            }else{
                                let group_results=results.rows[0]
                                if (group_results) {
                                    pool.query('DELETE group_ownership FROM users WHERE email = $1 RETURNING *', [email], (error, results) => {
                                        if (error) {
                                            res.status(408).send({error:`Failed to delete group_ownership from user, ${email}`})
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
                                                to:group_results.email,
                                                subject:`Your Group Account Was Deleted`,
                                                text:`Hello ${group_results.groupname},\n Your Group was deleted. We are sorry to see your leave, see you again at https://wekafile.web.app/.\n\nFeel free to share your feedback by replying to this email.`
                                            }
                                            mailTranporter.sendMail(details,(err:any)=>{
                                                if(err){
                                                    res.send({error:`Cannot sent email, try again!`});
                                                } else{
                                                    res.status(200).send({msg:`Group associated with email ${group_results.email} deteled successful`})
                                                }
                                            }) 
                                        }
                                    })
                                } else {
                                    res.status(404).send({error:`Group associated with email ${email} does not exist!`})
                                }
                            }
                        })
                    }
                }
            })
        }else{
            res.send({error:"Try again!!"})
        }
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
                pool.query('SELECT * FROM group_uploads WHERE email = $1 AND filename=$2',[email,filename],(error,result)=>{
                    if(error){
                        console.log({error:error})
                    }else{
                        if (result.rows[0]) {
                            pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE filename = $2',[allowedEmail,filename], (error, results) => {
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
                pool.query('UPDATE group_uploads SET privacy = $1 WHERE email = $2',[privacy,email], (error, results) => {
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
        pool.query('DELETE FROM group_uploads WHERE filename = $1 RETURNING *',[filename],(error,results)=>{
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

export const fetch_public_group_details=async(req:any,res:any)=>{
    try {
        const {groupname}=req.params
        pool.query('SELECT email,grouptype,groupname,photo, privacy, members FROM groups WHERE groupname = $1 AND privacy=false',[groupname], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed to select group ${groupname}!!`})
            }else{
                const details=results.rows[0]
                pool.query('SELECT filename,email,file,uploadedAt,size,type,groupname FROM group_uploads WHERE groupname = $1 AND privacy=false',[details.groupname], (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(404).send({error:`Failed to select group ${details.groupname}!!`})
                    }else{
                        res.send({
                            details,
                            files:results.rows,
                            count:results.rowCount
                        })
                    }
                })
            }
        })
    } catch (error) {
        
    }
}

export const updateGroupPic=async(req:any,res:any)=>{
    try{
        const {email}=req.params
        const {photo}=req.body
        pool.query('UPDATE groups SET photo = $1 WHERE email = $2 RETURNING *',[photo,email],(error,results)=>{
            if(error){
                console.log(error)
            }else{
                res.status(201).send({msg:`You've update your group picture`})
            }
        })
    }catch{

    }
}
const generateGroupToken=(id:string)=>{
    return sign({id},`${process.env.JWT_GROUP}`,{
        expiresIn:'10d'
    })
};