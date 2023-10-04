import express from "express"
import { google } from "googleapis"

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

const service = google.drive({
    version: 'v3',
    auth: oauth2Client
});

const drive=express.Router()

const handleAuth=async(req:any,res:any,next:any)=>{
    let token
    if(req.headers.authorization){
        try{
            token=req.headers.authorization
            oauth2Client.setCredentials(JSON.parse(token))
            next()
        }catch (error:any){
            res.status(401).send({error:'Not Authorised☠'})
            console.log(error)
        }
    }
    if(!token){
      res.status(401).send({error:'No Token Available☠'})
    }
};

//uploading profile and storing details to db
//uploading user file and storing details to db
//fetching user uploads from drive
//deleting user uploads and db details
drive.get('/auth/google',async(req:any,res:any)=>{
    try {
        const url=oauth2Client.generateAuthUrl({
            access_type:"offline",
            scope:['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/drive']
        })
        res.redirect(url)
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
})

drive.get('/google/redirect',async(req:any,res:any)=>{
    try {
        const code:any=req.query.code
        const {tokens}= await oauth2Client.getToken(code)
        oauth2Client.setCredentials(tokens)
        let redirect_url=`${process.env.CLIENT_URL}/provider?access_token=${JSON.stringify(tokens)}`
        res.redirect(redirect_url)
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
})

//create a wekafile user folder
drive.post('/create/:username',handleAuth,async(req:any,res:any)=>{
    try {
        const {username}=req.params
        const fileMetadata = {
            name: `wekafile_${username}`,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const file = await service.files.create({
            // resource: fileMetadata,
            requestBody:fileMetadata,
            fields: 'id',
        });
        console.log('Wekafile folder created', file.data.id);
    } catch (error:any) {
        console.log(error)
    }
})

//fetch user upload from drive by fieldId
drive.get('/files/:id',handleAuth,async(req:any,res:any)=>{
    try {
        const {id}=req.params
        await service.permissions.create({
            fileId:id,
            requestBody:{
                role:"reader",
                type:"anyone"
            }
        })
        service.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' },
            function (err:any, response:any) {
                response.data
                    .on('end', () => {
                        console.log('Done');
                    })
                    .on('error', (err:any)=> {
                        console.log('Error', err);
                    })
                    .pipe(res);
            }
        );
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
})


//fetch all user uploads  e.g file not folders from drive
drive.get('/files',handleAuth,async(req,res)=>{
    const files:any[] = [];
    try {
        const response:any = await service.files.list({
            // q: 'mimeType=\'image/jpeg\'',
            q: 'mimeType!=\'application/vnd.google-apps.folder\'',
            fields: 'nextPageToken, files(id,name,createdTime,kind,mimeType,modifiedTime,size)',
        });
        Array.prototype.push.apply(files, response.files);
        if(response.data.files.length===0){
            console.log({error:"No files found"})
        }else{
            res.send({files:response.data.files});
            console.log(response.data)
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
})

export default drive
