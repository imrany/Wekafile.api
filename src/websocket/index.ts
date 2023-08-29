import pool from "../pg";

export default function socket(io:any){
    let users:any=[{userid:"",photo:"",platform:""}]
    io.on("connection", function(socket: any) {
        var clientIp = socket.request.connection.remoteAddress;
        console.log(`a user connected: ${socket.id}, ClientIP : ${clientIp} `);

        socket.on("peers",(client_id:any)=>{
            let user
            for (let index = 0; index < users.length; index++) {
                user = users[index];
            }
            if(client_id.userid!==user.userid){
                users.push(client_id)
            }
            console.log(users.slice(1,users.length))
            socket.emit("peers",users.slice(1,users.length))
        })

        socket.on("upload_to_sharedfiles", (file_body:any, err:any) => {
            pool.query('SELECT * FROM sharedfiles WHERE filename = $1',[file_body.filename],async (error,results)=>{
                if(error){
                    console.log(error)
                    socket.emit("response",{error:'Failed store file, this file already exist!!'})
                }else{
                    if(results.rows){
                        pool.query('INSERT INTO sharedfiles (filename,groupname,uploadedAt,size,file,type,email,privacy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [file_body.filename,file_body.groupname,file_body.uploadedAt,file_body.size,file_body.file,file_body.type,file_body.email,file_body.privacy], (error:any, results) => {
                            if (error) {
                                socket.emit("response",{error:`Failed store file, ${file_body.filename} already exist!!`})
                            }else{
                                socket.emit("response",{
                                    msg:`${file_body.filename} was successfully added`,
                                })
                                socket.broadcast.emit("notification",{
                                    msg:`A new file had been shared.`,
                                })
                            }
                        })   
                    }else{
                        socket.emit("response",{error:`Failed store file, ${file_body.filename} already exist!!`})
                    }
                }
            })

            if(err){
                console.log(err)
            }
            // socket.broadcast.emit("download",file_body)
        });

        socket.on("fetch_from_sharedfiles", (email:string, err:any) => {
            pool.query('SELECT * FROM sharedfiles WHERE email = $1 OR $1 = ANY(allowedEmails) OR privacy=false',[email], (error, results) => {
                if (error) {
                    console.log(error)
                    socket.emit("response",{error:`Failed fetch shared files.`})
                }else{
                    socket.emit("response",{files:results.rows,count:results.rowCount})
                }
            })

            if(err){
                console.log(err)
            }
        });

        socket.on("fetch_groups", (email:string, err:any) => {
            pool.query('SELECT * FROM groups', (error, results) => {
                if (error) {
                    console.log(error)
                    socket.emit("response",{error:`Failed to get groups.`})
                }else{
                    socket.emit("response",{groups:results.rows,count:results.rowCount})
                }
            })

            if(err){
                console.log(err)
            }
        });

        //disconnect
        socket.on("disconnect", (reason:any) => {
            socket.emit(`${users.id} has left`)
        });
    });
}