import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, ReqGroup } from "../types/types";
import { unlinkSync, existsSync } from "fs"
import { createFolder, removeFolder } from "..";

export const registerGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {groupname,grouptype,email,photo,lastLogin,userPlatform, privacy}=req.body;
        console.log(groupname,grouptype,email,photo,lastLogin,userPlatform, privacy)
        if (groupname&&grouptype&&email) {
            pool.query('INSERT INTO groups (groupname,grouptype,email,lastLogin,userPlatform,privacy,photo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [`@${groupname}`,grouptype,email,lastLogin,userPlatform,privacy,photo], (error:any, results) => {
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
        const {email,lastLogin,userPlatform}=req.body;
        if(email &&lastLogin&&userPlatform){
            pool.query('SELECT * FROM groups WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    createFolder("groups",results.rows[0].email)
                    if(results.rows[0]){
                        if (results.rows[0].email) {
                            await createFolder("groups",results.rows[0].email)
                            pool.query('UPDATE groups SET lastLogin = $1, userPlatform = $2 WHERE email = $3 RETURNING *',[lastLogin,userPlatform,results.rows[0].email],(error,results)=>{
                                if(error){
                                    console.log(error)
                                }else{
                                    res.status(201).send({
                                        msg:`Welcome to ${results.rows[0].groupname}`,
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

export const deleteGroup=async(req:ReqGroup,res:any)=>{
    try {
        const email = req.params.email
        removeFolder("groups",email)
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
                                pool.query('UPDATE users SET group_ownership = null WHERE email = $1 RETURNING *', [email], (error, results) => {
                                    if (error) {
                                        res.status(408).send({error:`Failed to remove group_ownership from user, ${email}`})
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
        const {groupname,email}=req.params
        pool.query('SELECT email,grouptype,groupname,photo, privacy, members FROM groups WHERE groupname = $1 AND privacy=false OR email=$2',[groupname,email], (error, results) => {
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
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getAllGroups=async(req:any,res:any)=>{
    try {
        const email=req.params.email
        pool.query('SELECT * FROM groups WHERE email = $1 OR privacy=false',[email], (error, results) => {
            if (error) {
                console.log(error)
                res.send({error:`Failed to get groups.`})
            }else{
                res.send({groups:results.rows,count:results.rowCount})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const removeMember=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const { member } = req.body
        pool.query('SELECT * FROM users WHERE email = $1', [member], (error, results) => {
            if (results.rows[0]) {
                pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_REMOVE(allowedEmails,$1) WHERE email = $2',[member,email], (error, results) => {
                    if(error){
                        console.log(error)
                        res.send({error:"Cannot remove member!!"})
                    }else{
                        pool.query('UPDATE groups SET members = ARRAY_REMOVE(members,$1) WHERE email = $2',[member,email], (error, results) => {
                            if(error){
                                console.log(error)
                                res.send({error:"Cannot remove member!!"})
                            }else{
                                res.send({msg:`Member removed successfully`})
                            }
                        })
                    }
                })
            }else{
                res.send({error:`Account associated with email ${member} does not exist.`})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const updateGroup=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const { groupname, groupphoto, privacy, member } = req.body
        if(groupname&&privacy&&groupphoto){
            //update username, password and photo
            pool.query(
                'UPDATE groups SET groupname = $1, privacy = $2,photo = $3 WHERE email = $4',
                [groupname, privacy, groupphoto, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group group name, privacy and group photo`})
                    }else{
                        pool.query(
                        'UPDATE users SET group_ownership = $1 WHERE email = $2',
                        [groupname, email],
                        (error, results) => {
                            if (error) {
                                console.log(error)
                                res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                            }else{
                                pool.query('UPDATE group_uploads SET privacy = $1 WHERE email = $2',[privacy,email], (error, results) => {
                                    if(error){
                                        console.log(error)
                                        res.send({error:`Cannot find shared files associated with group ${email}!`})
                                    }else{
                                        res.status(200).send({msg:`Group name, privacy and group photo updated successful`})
                                    }
                                })
                            }
                        })
                    }
            })
        }else if(groupname&&privacy&&!groupphoto){
            //update username and password only
            pool.query(
                'UPDATE groups SET groupname = $1, privacy = $2 WHERE email = $3',
                [groupname, privacy, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group group name and privacy`})
                    }else{
                        pool.query(
                        'UPDATE users SET group_ownership = $1 WHERE email = $2',
                        [groupname, email],
                        (error, results) => {
                            if (error) {
                                console.log(error)
                                res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                            }else{
                                pool.query('UPDATE group_uploads SET privacy = $1 WHERE email = $2',[privacy,email], (error, results) => {
                                    if(error){
                                        console.log(error)
                                        res.send({error:`Cannot find shared files associated with group ${email}!`})
                                    }else{
                                        res.status(200).send({msg:`Group name and privacy updated successful`})
                                    }
                                })
                            }
                        })
                    }
            })
        }else if(groupname&&!privacy&&groupphoto){
            //update username and photo only
            pool.query(
                'UPDATE groups SET groupname = $1, photo = $2 WHERE email = $2',
                [groupname, groupphoto, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group name and photo`})
                    }else{
                        pool.query(
                        'UPDATE users SET group_ownership = $1 WHERE email = $2',
                        [groupname, email],
                        (error, results) => {
                            if (error) {
                                console.log(error)
                                res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                            }else{
                                res.status(200).send({msg:`Group name and group photo updated successful`})
                            }
                        })        
                    }
            })
        }else if(!groupname&&!privacy&&groupphoto){
            //update photo only
            pool.query(
                'UPDATE groups SET photo = $1 WHERE email = $2',
                [groupphoto, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group photo`})
                    }else{
                        res.status(200).send({msg:`Group photo updated`})
                    }   pool.query('SELECT * FROM users WHERE email = $1', [member], (error, results) => {
                if (results.rows[0]) {
                    pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE email = $2',[member,email], (error, results) => {
                        if(error){
                            console.log(error)
                            res.send({error:"Cannot add member!!"})
                        }else{
                            pool.query('UPDATE groups SET members = ARRAY_APPEND(members,$1) WHERE email = $2',[member,email], (error, results) => {
                                if(error){
                                    console.log(error)
                                    res.send({error:"Cannot add member!!"})
                                }else{
                                    res.send({msg:`Member added successfully`})
                                }
                            })
                        }
                    })
                }else{
                    res.send({error:`Account associated with email ${member} does not exist.`})
                }
            })
            })
        }else if(!groupname&&privacy&&!groupphoto){
            //update password only
            pool.query('SELECT * FROM groups WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(404).send({error:'User not found!'})
                }else{
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
                }
            })
        }else if(groupname&&!privacy&&!groupphoto){
            //update username only
            pool.query(
                'UPDATE users SET group_ownership = $1 WHERE email = $2',
                [groupname, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                    }else{
                        pool.query(
                            'UPDATE groups SET groupname = $1 WHERE email = $2',
                            [groupname, email],
                            (error, results) => {
                                if (error) {
                                    console.log(error)
                                    res.status(501).send({error:`Failed to update graoup details associated with email address ${email}}`})
                                }else{
                                    res.status(200).send({msg:`Group name updated successful`})
                                }
                        })
                    }
            })
        }else if(member){
            pool.query('SELECT * FROM users WHERE email = $1', [member], (error, results) => {
                if (results.rows[0]) {
                    pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE email = $2',[member,email], (error, results) => {
                        if(error){
                            console.log(error)
                            res.send({error:"Cannot add member!!"})
                        }else{
                            pool.query('UPDATE groups SET members = ARRAY_APPEND(members,$1) WHERE email = $2',[member,email], (error, results) => {
                                if(error){
                                    console.log(error)
                                    res.send({error:"Cannot add member!!"})
                                }else{
                                    res.send({msg:`Member added successfully`})
                                }
                            })
                        }
                    })
                }else{
                    res.send({error:`Account associated with email ${member} does not exist.`})
                }
            })
        }
        
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}