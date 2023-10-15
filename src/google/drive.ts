import express from "express"
import { google } from "googleapis"
import formidable from "formidable"
import {createReadStream} from 'fs'
import pool from "../pg";

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

const service:any = google.drive({
    version: 'v3',
    auth: oauth2Client
});

const drive=express.Router()

const handleAuth=async(req:any,res:any,next:any)=>{
    let token
    if(req.headers.authorization){
        try{
            token=req.headers.authorization
            await oauth2Client.setCredentials(JSON.parse(token))
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
});

//upload file
drive.post('/upload/:type/:folder_id',handleAuth,async(req:any, res:any) => {
    try {
        const {folder_id,type}=req.params
        var form =formidable({
            keepExtensions:true,
            maxFileSize:10 * 1024 * 1024 //5mbs
        });
        form.parse(req)
        form.on('file',async(name:any, files:any) => {
            const fileMetadata = {
                name: files.originalFilename,
                parents: [folder_id],
            };
            const media = {
                mimeType: files.mimetype,
                body: createReadStream(files.filepath),
            };
            if(type==='users'){
                const response=await service.files.create(
                    {
                        resource: fileMetadata,
                        media: media,
                        fields: "id",
                    }
                );
                console.log(`${files.originalFilename} uploaded to folder ${folder_id} in drive`);
                res.send({id:response.data.id});
            }else if(type==='groups'){
                const response=await service.files.create(
                    {
                        resource: fileMetadata,
                        media: media,
                        fields: "id",
                    }
                );
                console.log(`${files.originalFilename} uploaded to drive group folder ${folder_id} `);
                res.send({id:response.data.id});
            }
        });
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
});

//delete drive file
drive.delete('/delete/file/:id',handleAuth,async(req:any, res:any) => {
  try {
    var fileId = req.params.id;
    const response=await service.files.delete({ 'fileId': fileId })
    res.send({id:response.data.id})
  } catch (error:any) {
    res.status(500).send({error:error.message})
  }
});

//delete drive folder
drive.delete('/delete/:folder_id',handleAuth,async(req:any, res:any) => {
    try {
        const folderId=req.params.folder_id
        const response=await service.files.delete({ 
            "fileId":folderId,
            fields: "id",
        })
        res.send({id:`${folderId} was deleted`})
    } catch (error:any) {
      res.status(500).send({error:error.message})
    }
});

//create drive folder
drive.post('/create/:name',handleAuth,async(req:any, res:any) => {
    try {
        var name = req.params.name;
        const fileMetadata = {
            name: `wekafile_${name}`,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const response = await service.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        console.log('Folder Id:', response.data.id);
        res.send({id:response.data.id})
        await service.permissions.create({
          'fileId':response.data.id,
          requestBody:{
            role:"reader",
            type:"anyone"
          }
        })
    } catch (error:any) {
      console.log(error)
      res.status(500).send({error:error.message})
    }
});
  

drive.get('/download/:id', handleAuth,(req, res) => {
    try {
        let fileId = req.params.id;
        service.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' },
            function (err:any, response:any) {
                response.data
                    .on('end', () => {
                        console.log('Done');
                    })
                    .on('error', (err:any) => {
                        console.log('Error', err);
                    })
                    .pipe(res);
            }
        );
    } catch (error:any) {
        console.log(error)
        res.status(500).send({error:error.message}) 
    }
})

export default drive
