import pool from "../pg";
import { createTransport } from "nodemailer"
import { MailDetails, ReqGroup } from "../types/types";
import axios from "axios";

export const registerGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {groupname,grouptype,email,lastLogin,userPlatform, privacy}=req.body.data;
        const request=await axios.post(`${process.env.API_URL}/drive/create/${groupname}`,{},{
            headers:{
                Authorization:`${req.body.access_token}`,
            }
        })
        const folderId=request.data.id
        if (folderId&&groupname&&grouptype&&email){
            pool.query('INSERT INTO groups (groupname,grouptype,email,lastLogin,userPlatform,privacy,folder_id,access_token) VALUES ($1, $2, $3, $4, $5, $6, $7,$8) RETURNING groupname,email', [groupname,grouptype,email,lastLogin,userPlatform,privacy,folderId,req.body.access_token], (error:any, results) => {
                if (error) {
                    res.status(408).send({error:`Account using ${email} already exist!`})
                    console.log(error)
                }else{
                    let group_results=results.rows[0]
                    pool.query('UPDATE users SET group_ownership = $1, group_folder_id=$2 WHERE email = $3 RETURNING *',[group_results.groupname,folderId,group_results.email],(error,results)=>{
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
        }else{
            res.status(403).send({error:"Fill all the required fields!!"})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const loginGroup=async(req:ReqGroup,res:any)=>{
    try {
        const {email,lastLogin,userPlatform}=req.body.data;
        if(email &&lastLogin&&userPlatform){
            pool.query('SELECT * FROM groups WHERE email = $1',[email],async (error,results)=>{
                if(error){
                    console.log(error)
                    res.status(400).send({error:'Failed to sign in, try again!'})
                }else{
                    if(results.rows[0]){
                        if (results.rows[0].email) {
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
                            folder_id:results.rows[0].folder_id,
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
        const {email,folder_id} = req.params
        const response=await axios.delete(`${process.env.API_URL}/drive/delete/${folder_id}`,{
            headers:{
                Authorization:`${req.body.access_token}`,
            }
        })
        const folderId=response.data.id
        if (folderId) {
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
                                            res.status(200).send({msg:`Group associated with email ${group_results.email} deteled successful`})
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
            res.status(404).send({error:`Try again later!!`})
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const giveGroupAccess=async(req:any,res:any)=>{
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
        const email=req.params.email
        pool.query('DELETE FROM group_uploads WHERE filename = $1 AND email=$2 RETURNING *',[filename,email],async(error,results)=>{
            if (error) {
                res.status(408).send({error:`Failed to delete file ${filename.slice(0,25)}...`})
            }else{
                if (results.rows[0]) {
                    const response=await axios.delete(`${process.env.API_URL}/drive/delete/file/${results.rows[0].file}`,{
                        headers:{
                            Authorization:`${req.body.access_token}`,
                        }
                    })
                    const fileId=response.data.id
                    if (fileId) {
                        res.status(200).send({msg:`You've successfully deleted ${filename.slice(0,25)}...`})
                    } else {
                        res.status(404).send({error:`${filename.slice(0,25)} not found`})
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
        pool.query('SELECT email,grouptype,groupname,photo, privacy,folder_id,access_token,members FROM groups WHERE groupname = $1 AND $2=ANY(members) OR groupname=$1 AND privacy=false OR groupname=$1 AND email=$2',[groupname,email], (error, results) => {
            if (error) {
                console.log(error)
                res.status(404).send({error:`Failed to select group ${groupname}!!`})
            }else{
                const details=results.rows[0]
               if(details){
                    pool.query('SELECT filename,email,file,uploadedAt,size,type,allowedEmails,groupname FROM group_uploads WHERE groupname = $1 AND $2=ANY(allowedEmails) OR groupname = $1 AND email=$2 OR groupname=$1 AND privacy=false',[details.groupname,email], (error, results) => {
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
               }else{
                res.status(404).send({error:`Group ${groupname} does not exit!`})
               }
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

export const getAllGroups=async(req:any,res:any)=>{
    try {
        const email=req.params.email
        pool.query("SELECT email,groupname,grouptype,photo,privacy,members FROM groups WHERE email = $1 OR $1=ANY(members) OR privacy=false",[email], (error, results) => {
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

export const uploadFile=async(req:any,res:any)=>{
    try{
        const {file_body}=req.body
        pool.query('SELECT groupname,members,privacy FROM groups WHERE groupname = $1 OR $2=ANY(members) OR email=$2',[file_body.groupname,file_body.email],async (error,results)=>{
            if(error){
                console.log(error)
                res.send({error:`Group ${file_body.groupname} doesn't exist!!`})
            }else{
                const group=results.rows[0]
                if(group){
                    pool.query('SELECT * FROM group_uploads WHERE filename = $1 AND groupname=$2',[file_body.filename,group.groupname],async (error,results)=>{
                        if(error){
                            console.log(error)
                            res.send({error:'Failed store file, this file already exist!!'})
                        }else{
                            if(results.rows){
                                pool.query('INSERT INTO group_uploads (filename,groupname,uploadedAt,size,file,type,email,privacy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [file_body.filename,file_body.groupname,file_body.uploadedAt,file_body.size,file_body.file,file_body.type,file_body.email,group.privacy], (error:any, results) => {
                                    if (error) {
                                        res.send({error:`Failed store file, ${file_body.filename.slice(0,25)}... already exist!!`})
                                    }else{
                                        pool.query('UPDATE group_uploads SET allowedEmails =$1 WHERE groupname = $2', [group.members,group.groupname], (error:any, results) => {
                                            if (error) {
                                                res.send({error:`Failed update file, ${file_body.filename.slice(0,25)}...!!`})
                                            }else{
                                                res.send({
                                                    msg:`${file_body.filename.slice(0,25)}... was successfully added`,
                                                })
                                            }
                                        })
                                    }
                                })   
                            }else{
                                res.send({error:`Failed store file, ${file_body.filename.slice(0,25)}... already exist!!`})
                            }
                        }
                    })
                }
            }
        })
    }catch(error:any){
        res.status(500).send({error:error.message})
    }
}

export const join_group=async(req:any,res:any)=>{
    try{
        const {groupname,email}=req.params
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
            if (results.rows[0]) {
                pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_APPEND(allowedEmails,$1) WHERE groupname = $2',[email,groupname], (error, results) => {
                    if(error){
                        console.log(error)
                        res.send({error:"Cannot add member!!"})
                    }else{
                        pool.query('UPDATE groups SET members = ARRAY_APPEND(members,$1) WHERE groupname = $2',[email,groupname], (error, results) => {
                            if(error){
                                console.log(error)
                                res.send({error:"Cannot add member!!"})
                            }else{
                                res.send({msg:`You were added successfully`})
                            }
                        })
                    }
                })
            }else{
                res.send({error:`Account associated with email ${email} does not exist.`})
            }
        })
    }catch(error:any){
        res.status(500).send({error:error.message})
    }
}

export const exit_group=async(req:any,res:any)=>{
    try{
        const {groupname,email}=req.params
        pool.query('SELECT * FROM users WHERE email = $1', [email], (error, results) => {
            if (results.rows[0]) {
                pool.query('UPDATE group_uploads SET allowedEmails = ARRAY_REMOVE(allowedEmails,$1) WHERE groupname = $2',[email,groupname], (error, results) => {
                    if(error){
                        console.log(error)
                        res.send({error:"Cannot exit group!"})
                    }else{
                        pool.query('UPDATE groups SET members = ARRAY_REMOVE(members,$1) WHERE groupname = $2',[email,groupname], (error, results) => {
                            if(error){
                                console.log(error)
                                res.send({error:"Cannot exit group!!"})
                            }else{
                                res.send({msg:`You were removed successfully`})
                            }
                        })
                    }
                })
            }else{
                res.send({error:`Account associated with email ${email} does not exist.`})
            }
        })
    }catch(error:any){
        res.status(500).send({error:error.message})
    }
}

export const updateGroup=async(req:any,res:any)=>{
    try {
        const email = req.params.email
        const { groupname, grouptype, groupphoto, privacy, member } = req.body
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
                'UPDATE groups SET groupname = $1, photo = $2 WHERE email = $3',
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
        }else if(groupname&&!privacy&&grouptype){
                //update username and photo only
                pool.query(
                    'UPDATE groups SET groupname = $1, grouptype = $2 WHERE email = $3',
                    [groupname, grouptype, email],
                    (error, results) => {
                        if (error) {
                            console.log(error)
                            res.status(501).send({error:`Failed to update group name and group type`})
                        }else{
                            pool.query(
                            'UPDATE users SET group_ownership = $1 WHERE email = $2',
                            [groupname, email],
                            (error, results) => {
                                if (error) {
                                    console.log(error)
                                    res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                                }else{
                                    res.status(200).send({msg:`Group name and group type updated successful`})
                                }
                            })        
                        }
                })
        }else if(!groupname&&!privacy&&groupphoto){
            //update photo only
            pool.query(
                'SELECT photo,access_token FROM groups WHERE email = $1',
                [email],
                async(error, results) => {
                if (error) {
                    console.log(error)
                }else{
                    if(results.rows[0].photo!==null){
                        const response=await axios.delete(`${process.env.API_URL}/drive/delete/file/${results.rows[0].photo}`,{
                            headers:{
                                Authorization:`${results.rows[0].access_token}`,
                            }
                        })
                        const id=response.data.id
                        console.log(`Group photo was updated and previous id ${id} was deleted`)
                    }
                    pool.query(
                        'UPDATE groups SET photo = $1 WHERE email = $2',
                        [groupphoto, email],
                        (error, results) => {
                        if (error) {
                            console.log(error)
                            res.status(501).send({error:`Failed to update group photo`})
                        }else{
                            res.status(200).send({msg:`Group photo updated`})
                        }   
                    })
                }   
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
            //update groupname only
            pool.query(
                'UPDATE users SET group_ownership = $1 WHERE email = $2',
                [groupname, email],
                (error, results) => {
                    if (error) {
                        console.log(error)
                        res.status(501).send({error:`Failed to update group details associated with email address ${email}}`})
                    }else{
                        pool.query(
                            'UPDATE groups SET groupname = $1 WHERE email = $2 RETURNING folder_id,access_token',
                            [groupname, email],
                            async(error, results) => {
                                if (error) {
                                    console.log(error)
                                    res.status(501).send({error:`Failed to update graoup details associated with email address ${email}}`})
                                }else{
                                    const response=await axios.post(`${process.env.API_URL}/drive/rename/${groupname}/${results.rows[0].folder_id}`,{
                                        headers:{
                                            Authorization:`${results.rows[0].access_token}`,
                                        }
                                    })
                                    const folderId=response.data.id
                                    console.log(`Folder ${folderId} was rename to wekafile_${groupname}`)
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
