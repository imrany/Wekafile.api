import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails } from "../types/types";
import {genSalt, compare, hash} from "bcryptjs";
import { verify, sign } from "jsonwebtoken"

export const verifyEmail=async(req:any,res:any)=>{
    try {
        const email=req.params.email;
        const code=createCode()
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
            if (error) {
                let mailTranporter=createTransport({
                    service:'gmail',
                    auth:{
                        user:process.env.TRANSPORTER,
                        pass:process.env.PASSWORD
                    }
                });
                let details={
                    from:process.env.TRANSPORTER,
                    to:email,
                    subject:`Verification Code`,
                    text:`Your One-Time Password (OTP) is \n${code}`
                }
                mailTranporter.sendMail(details,(err:any)=>{
                    if(err){
                        res.send({error:`Cannot sent verification code, try again!`});
                    }else{
                        res.send({code:code})
                    }
                })
            }else{
                res.send({error:"User Exist!"})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const registerUser=async(req:any,res:any)=>{
    try {
        const {username,email,password,lastLogin,userPlatform}=req.body;
        if (username&&email&&password) {
            const salt=await genSalt(10);
            const hashedPassword=await hash(password,salt);
            pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
                if (error) {
                    pool.query('INSERT INTO users (username, email, password, lastLogin, userPlatform) VALUES ($1, $2, $3, $4, $5) RETURNING *', [username, email, hashedPassword, lastLogin, userPlatform], (error, results) => {
                        if (error) {
                            console.log(error)
                            res.status(408).send({error:"Failed to add user, Try again!!"})
                        }else{
                            res.status(201).send({
                                msg:`Welcome ${results.rows[0].username}`,
                                data:{
                                    id:results.rows[0].id,
                                    username:results.rows[0].username,
                                    email:results.rows[0].username,
                                    photo:results.rows[0].photo,
                                    token:generateUserToken(results.rows[0].id)
                                }
                            })
                        }
                    }) 
                }else{
                    res.status(409).send({error:"User Exist!"})
                }
            })    
        } else {
            res.status(403).send({error:"Fill all the required fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const loginUser=async(req:any,res:any)=>{
    try {
        const {email,password,lastLogin,userPlatform}=req.body;
        if(email&&password){
            pool.query('SELECT * FROM users WHERE email = $1 AND password = $2',[email,password],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    if (results.rows[0].email&&await compare(password,results.rows[0].password)) {
                        pool.query('UPDATE users SET lastLogin = $1, userPlatform = $2 WHERE email = $3',[lastLogin,userPlatform,results.rows[0].email],(error,results)=>{
                            if(error){
                                console.log(error)
                            }else{
                                res.status(201).send({
                                    msg:`Welcome ${results.rows[0].username}`,
                                    data:{
                                        id:results.rows[0].id,
                                        username:results.rows[0].username,
                                        email:results.rows[0].username,
                                        photo:results.rows[0].photo,
                                        token:generateUserToken(results.rows[0].id)
                                    }
                                })
                            }
                        })
                    } else {
                        res.status(401).send({error:'Invalid Credentials'})
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

export const getUsers=async(req:any,res:any)=>{
    try {
        pool.query('SELECT * FROM users RETURNING *', (error, results) => {
            if (error) {
                res.status(408).send({error:`Failed to get users.`})
            }else{
                res.status(200).json(results.rows)
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const updateUser=async(req:any,res:any)=>{
    try {
        const email = parseInt(res.params.email)
        const { username, password, photo } = req.body
        pool.query(
        'UPDATE users SET username = $1, password = $2,photo = $3 WHERE email = $4',
        [username, password, photo, email],
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
                    text:`Hello ${username},\n Your new account username is ${username}\n\nNew password is ${password},\nVisit https://file-shareio.web.app/`
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
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getUserDetails=async(req:any,res:any)=>{
    try {
        const email = parseInt(res.params.email)
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Account associated with the email address ${email} does not exist!`})
            }else{
                res.status(200).json({
                    data:{
                        username:results.rows[0].username,
                        email:results.rows[0].email,
                        photo:results.rows[0].photo
                    }
                })
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

export const deleteUser=async(req:any,res:any)=>{
    try {
        const email = parseInt(res.params.email)
        pool.query('DELETE FROM users WHERE email = $1', [email], (error, results) => {
            if (error) {
                res.status(408).send({error:`Failed to delete account associated with the email ${email}`})
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
                    subject:`Your Account Was Deleted`,
                    text:`Hello ${results.rows[0].username},\n Your Account was deleted. We are sorry to see your leave, see you again at https://file-shareio.web.app/.\n\nFeel free to share your feedback by replying to this email.`
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
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

const generateUserToken=(id:any)=>{
    return sign({id},`${process.env.JWT_SECRET}`,{
        expiresIn:'10d'
    })
};

function createCode():string {
    let date=new Date()
    let hr=date.getHours()<10?`0${date.getHours()}`:date.getHours()
    const code=`${hr}${date.getFullYear()}`
    return code
}
