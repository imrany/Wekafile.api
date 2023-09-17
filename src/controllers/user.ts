import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, Req } from "../types/types";
import {genSalt, compare, hash} from "bcryptjs";
import { verify, sign } from "jsonwebtoken"
import { createFolder, removeFolder } from "..";
import { unlinkSync, existsSync } from "fs"

export const verifyEmail=async(req:Req,res:any)=>{
    try {
        const email=req.body.email;
        const code=createCode()
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
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
                    subject:`Verification Code`,
                    text:`Your Wekafile One-Time Password (OTP) is \n${code}`
                }
                mailTranporter.sendMail(details,(err:any)=>{
                    if(err){
                        res.send({error:`Cannot sent verification code, try again!`});
                    }else{
                        res.send({code:code})
                    }
                })
            }else{
                res.send({error:`Account using ${email} already exist!`})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const registerUser=async(req:Req,res:any)=>{
    try {
        const {username,email,password,lastLogin,userPlatform}=req.body;
        if (username&&email&&password) {
            const salt=await genSalt(10);
            const hashedPassword=await hash(password,salt);
            if (await createFolder("users",email)==="create folder") {
                pool.query('INSERT INTO users (username, email, password, lastLogin, userPlatform) VALUES ($1, $2, $3, $4, $5) RETURNING *', [`@${username}`, email, hashedPassword, lastLogin, userPlatform], (error:any, results) => {
                    if (error) {
                        res.status(408).send({error:`Account using ${email} already exist!`})
                    }else{
                        res.status(201).send({
                            msg:`Welcome ${results.rows[0].username}`,
                            data:{
                                id:results.rows[0].id,
                                username:results.rows[0].username,
                                email:results.rows[0].email,
                                photo:results.rows[0].photo,
                                group_ownership:results.rows[0].group_ownership,
                                token:generateUserToken(results.rows[0].id)
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

export const loginUser=async(req:Req,res:any)=>{
    try {
        const {email,password,lastLogin,userPlatform}=req.body;
        if(email&&password&&lastLogin&&userPlatform){
            pool.query('SELECT * FROM users WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    if(results.rows[0]){
                        await createFolder("users",results.rows[0].email)
                        if (results.rows[0].email&&await compare(password,results.rows[0].password)) {
                            pool.query('UPDATE users SET lastLogin = $1, userPlatform = $2 WHERE email = $3 RETURNING *',[lastLogin,userPlatform,results.rows[0].email],(error,results)=>{
                                if(error){
                                    console.log(error)
                                }else{
                                    res.status(201).send({
                                        msg:`Welcome ${results.rows[0].username}`,
                                        data:{
                                            id:results.rows[0].id,
                                            username:results.rows[0].username,
                                            email:results.rows[0].email,
                                            photo:results.rows[0].photo,
                                            group_ownership:results.rows[0].group_ownership,
                                            token:generateUserToken(results.rows[0].id)
                                        }
                                    })
                                }
                            })
                        } else {
                            res.status(401).send({error:'Invalid Credentials'})
                        }
                    }else{
                        res.status(404).send({error:`Account associated with email ${email} does not exist!`})
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

export const getUsers=async(req:Req,res:any)=>{
    try {
        pool.query('SELECT * FROM users', (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed to get users.`})
            }else{
                res.status(200).json(results.rows)
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const updateUser=async(req:Req,res:any)=>{
    try {
        const email = req.params.email
        const { username, old_password,password, photo } = req.body
        if(username&&password&&photo){
            //update username, password and photo
            pool.query(
                'UPDATE users SET username = $1, password = $2,photo = $3 WHERE email = $4',
                [username, password, photo, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update account username, password and photo`})
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
                            to:email,
                            subject:`Your Account details were updated`,
                            text:`Hello ${username},\n Your new account username is ${username}\n\nNew password is ${password},\nVisit https://wekafile.web.app/`
                        }
                        mailTranporter.sendMail(details,(err:any)=>{
                            if(err){
                                res.send({error:`Cannot sent email, try again!`});
                            } else{
                                res.status(200).send({msg:`Username, password and photo updated successful`})
                            }
                        })
                    }
            })
        }else if(username&&password&&!photo){
            //update username and password only
            pool.query(
                'UPDATE users SET username = $1, password = $2 WHERE email = $3',
                [username, password, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update account username and password`})
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
                            to:email,
                            subject:`Your Account details were updated`,
                            text:`Hello ${username},\n Your new account username is ${username}\n\nNew password is ${password},\nVisit https://wekafile.web.app/`
                        }
                        mailTranporter.sendMail(details,(err:any)=>{
                            if(err){
                                res.send({error:`Cannot sent email, try again!`});
                            } else{
                                res.status(200).send({msg:`Username and password updated successful`})
                            }
                        })
                    }
            })
        }else if(username&&!password&&photo){
            //update username and photo only
            pool.query(
                'UPDATE users SET username = $1, photo = $2 WHERE email = $2',
                [username, photo, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update account username and photo`})
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
                            to:email,
                            subject:`Your Account details were updated`,
                            text:`Hello ${username},\n Your new account username is ${username}\n\n,Visit https://wekafile.web.app/`
                        }
                        mailTranporter.sendMail(details,(err:any)=>{
                            if(err){
                                res.send({error:`Cannot sent email, try again!`});
                            } else{
                                res.status(200).send({msg:`Username and photo updated successful`})
                            }
                        })
                    }
            })
        }else if(!username&&!password&&photo){
            //update photo only
            pool.query(
                'UPDATE users SET photo = $1 WHERE email = $2',
                [photo, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update account photo`})
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
                            to:email,
                            subject:`Your Account details were updated`,
                            text:`Hello ,\n Your account user profile has been updated.\n\nVisit https://wekafile.web.app/`
                        }
                        mailTranporter.sendMail(details,(err:any)=>{
                            if(err){
                                res.send({error:`Cannot sent email, try again!`});
                            } else{
                                res.status(200).send({msg:`Photo updated`})
                            }
                        })
                    }
            })
        }else if(!username&&password&&!photo){
            //update password only
            pool.query('SELECT * FROM users WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(404).send({error:'User not found!'})
                }else{
                    if (results.rows[0].email&&await compare(old_password,results.rows[0].password)) {
                        const salt=await genSalt(10);
                        const hashedPassword=await hash(password,salt);
                        pool.query(
                            'UPDATE users SET password = $1 WHERE email = $2',
                            [hashedPassword, email],
                            (error, results) => {
                                if (error) {
                                    console.log(error)
                                    res.status(501).send({error:`Failed to update password`})
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
                                        to:email,
                                        subject:`Your Account details were updated`,
                                        text:`Hello, \nNew password is ${password},\nVisit https://wekafile.web.app/`
                                    }
                                    mailTranporter.sendMail(details,(err:any)=>{
                                        if(err){
                                            res.send({error:`Cannot sent email, try again!`});
                                        } else{
                                            res.status(200).send({msg:`Password updated`})
                                        }
                                    })
                                }
                        })
                    }else{
                        res.status(401).send({error:"you've entered false credential!"})
                    }
                }
            })
        }else if(username&&!password&&!photo){
            //update username only
            pool.query(
                'UPDATE users SET username = $1 WHERE email = $2',
                [username, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update account details associated with email address ${email}}`})
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
                            to:email,
                            subject:`Your Account details were updated`,
                            text:`Hello ${username}, \nYour new account username is ${username},\nVisit https://wekafile.web.app/`
                        }
                        mailTranporter.sendMail(details,(err:any)=>{
                            if(err){
                                res.send({error:`Cannot sent email, try again!`});
                            } else{
                                res.status(200).send({msg:`Account details updated successful`})
                            }
                        })
                    }
            })
        }
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getUserDetails=async(req:Req,res:any)=>{
    try {
        const email = req.params.email
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Account associated with the email address ${email} does not exist!`})
            }else{
                if(results.rows[0]){
                    res.status(200).json({
                        data:{
                            username:results.rows[0].username,
                            email:results.rows[0].email,
                            photo:results.rows[0].photo,
                            group_ownership:results.rows[0].group_ownership
                        }
                    })
                }else{
                    res.status(404).send({error:`Account associated with the email address ${email} does not exist!`})
                }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const protectUser=async(req:any,res:any,next:any)=>{
    let token
    if(req.headers.authorization&&req.headers.authorization.startsWith('Bearer')){
        try{
            token=req.headers.authorization.split(' ')[1]
            verify(token,`${process.env.JWT_SECRET}`);
            next()
        }catch (error:any){
            res.status(401).send({error:'Not Authorised☠'})
        }
    }
    if(!token){
      res.status(401).send({error:'No Token Available☠'})
    }
};

export const getMyUploads=async(req:any,res:any)=>{
    try {
        const email=req.params.email
        pool.query('SELECT filename,email,file,uploadedAt,size,type,username FROM user_uploads WHERE email = $1',[email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed uploads.`})
            }else{
                res.send({files:results.rows,count:results.rowCount})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const postMyUploads=async(req:any,res:any)=>{
    try {
        const file_body=req.body.file_body
        pool.query('SELECT * FROM user_uploads WHERE filename = $1',[file_body.filename],async (error,results)=>{
            if(error){
                console.log(error)
                res.status(400).send({error:'Failed upload file'})
            }else{
                if(results.rows){
                    pool.query('INSERT INTO user_uploads (filename,username,uploadedAt,size,file,type,email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [file_body.filename,file_body.username,file_body.uploadedAt,file_body.size,file_body.file,file_body.type,file_body.email], (error:any, results) => {
                        if (error) {
                            res.status(400).send({error:`Failed to upload file, ${file_body.filename.slice(0,25)}... already exist!!`})
                        }else{
                            res.send({
                                msg:`${file_body.filename.slice(0,25)}... was successfully added`,
                            })
                        }
                    })   
                }else{
                    res.status(400).send({error:`Failed store file, ${file_body.filename.slice(0,25)}... already exist!!`})
                }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const deleteUser=async(req:Req,res:any)=>{
    try {
        const email = req.params.email
        await removeFolder("users",email)
        if (await removeFolder("users",email)==="remove folder") {
            pool.query(`
            DELETE FROM user_uploads WHERE email=$1 RETURNING *
            `, [email], (error, results) => {
                if (error) {
                    res.status(408).send({error:`Failed to delete uploads associated with the email ${email}`})
                    console.log(error)
                }else{
                    if (results.rows) {
                        pool.query('DELETE FROM users WHERE email = $1 RETURNING *', [email], (error, results) => {
                            if (error) {
                                res.status(408).send({error:`Failed to delete account associated with the email ${email}`})
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
                                        subject:`Your Account Was Deleted`,
                                        text:`Hello ${results.rows[0].username},\n Your Account was deleted. We are sorry to see your leave, see you again at https://wekafile.web.app/.\n\nFeel free to share your feedback by replying to this email.`
                                    }
                                    mailTranporter.sendMail(details,(err:any)=>{
                                        if(err){
                                            res.send({error:`Cannot sent email, try again!`});
                                        } else{
                                            res.status(200).send({msg:`Account associated with email ${results.rows[0].email} deteled successful`})
                                        }
                                    })   
                                } else {
                                    res.status(404).send({error:`Account associated with email ${email} does not exist!`})
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

export const giveAccessToUpload=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const {filename,allowedEmail}=req.body
        pool.query('SELECT * FROM groups WHERE email = $1', [allowedEmail], (error, results) => {
            if (results.rows) {
                pool.query('SELECT * FROM user_uploads WHERE email = $1 AND filename=$2',[email,filename],(error,result)=>{
                    if(error){
                        console.log({error:error})
                    }else{
                        if (result.rows[0]) {
                            pool.query('UPDATE user_uploads SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE filename = $2',[allowedEmail,filename], (error, results) => {
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

export const deleteUploadFile=async(req:any,res:any)=>{
    try {
        const filename=req.params.filename
        pool.query('DELETE FROM user_uploads WHERE filename = $1 RETURNING *',[filename],(error,results)=>{
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

const generateUserToken=(id:string)=>{
    return sign({id},`${process.env.JWT_SECRET}`,{
        expiresIn:'10d'
    })
};

function createCode():string {
    let date=new Date()
    let hr=date.getMinutes()<10?`0${date.getMinutes()}`:date.getMinutes()
    const code=`${hr}${date.getFullYear()}`
    return code
}
