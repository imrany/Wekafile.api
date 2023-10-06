import express from "express"
import { google } from "googleapis"
import formidable from "formidable"
import {createReadStream} from 'fs'

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
drive.post('/upload',handleAuth,async(req:any, res:any) => {
    try {
        var form =formidable({
            keepExtensions:true,
            maxFileSize:5 * 1024 * 1024 //5mbs
        });
        form.parse(req)
        form.on('file',async(name:any, files:any) => {
            const fileMetadata = {
                name: files.originalFilename,
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
            console.log(`${files.originalFilename} uploaded to drive`);
            res.send({id:response.data.id});
        });
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
});

//delete drive file
drive.delete('/delete/:id',handleAuth,async(req:any, res:any) => {
  try {
    var fileId = req.params.id;
    const response=await service.files.delete({ 'fileId': fileId })
    res.send({msg:response.data})
  } catch (error:any) {
    res.status(500).send({error:error.message})
  }
});

// app.post('/download/:id', (req, res) => {
//     if (req.body.token == null) return res.status(400).send('Token not found');
//     oAuth2Client.setCredentials(req.body.token);
//     const drive = google.drive({ version: 'v3', auth: oAuth2Client });
//     var fileId = req.params.id;
//     drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' },
//         function (err, response) {
//             response.data
//                 .on('end', () => {
//                     console.log('Done');
//                 })
//                 .on('error', err => {
//                     console.log('Error', err);
//                 })
//                 .pipe(res);
//         }
//     );
// })

export default drive
