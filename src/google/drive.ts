import express from "express"
import { google } from "googleapis"
import formidable from "formidable"
import {writeFileSync, createReadStream, readFileSync } from 'fs'

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
    try{
        if(req.headers.authorization){
            let token=req.headers.authorization
            const authenticate=oauth2Client.setCredentials(JSON.parse(token))
            console.log(authenticate)
            next()
        }else{
            res.status(401).send({error:'No Token Available☠'})
        }
    }catch (error:any){
        res.status(401).send({error:'Not Authorised☠'})
        console.log(error)
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
        writeFileSync('creds.json',JSON.stringify(tokens))
        const creds:any=readFileSync('creds.json')
        let redirect_url=`${process.env.CLIENT_URL}/provider?access_token=${creds}`
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
            maxFileSize:10 * 1024 * 1024 //10mbs
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
            const response=await service.files.create(
                {
                    resource: fileMetadata,
                    media: media,
                    fields: "id",
                }
            );
            if(response.data){
                if(type==='users'){
                    console.log(`${files.originalFilename} uploaded to folder ${folder_id} in drive`);
                    res.send({id:response.data.id});
                }else if(type==='groups'){
                    console.log(`${files.originalFilename} uploaded to drive group folder ${folder_id} `);
                    res.send({id:response.data.id});
                }
            }else{
                res.send({error:'File upload error!'})
                console.log({error:response})
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
        res.send({id:`${response.data.id} was deleted`})
    } catch (error:any) {
      res.status(500).send({error:error.message})
    }
});

//rename drive folder
drive.post('/rename/:name/:folder_id',handleAuth,async(req:any, res:any) => {
    try {
        const folderId=req.params.folder_id
        const name=req.params.name
        const fileMetadata = {
            name: `wekafile_${name}`,
        };
        const response=await service.files.update({ 
            resource: fileMetadata,
            "fileId":folderId,
            fields: "id",
        })
        res.send({id:`${response.data.id} was renamed`})
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
            function (error:any, response:any) {
              if(error){
                console.log(error.message)
                res.send({error:error.message})
                return error
              }
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
