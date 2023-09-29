import pool from "../pg";

export default function socket(io:any){
    let users:any=[{userid:"",photo:"",platform:""}]
    io.on("connection", function(socket: any) {
        var clientIp = socket.request.connection.remoteAddress;
        console.log(`a user connected: ${socket.id}, ClientIP : ${clientIp} `);

        socket.on("fetch_from_sharedfiles", (email:string, err:any) => {
            pool.query('SELECT filename,email,file,uploadedAt,size,type,groupname FROM group_uploads WHERE email = $1 OR $1 = ANY(allowedEmails) OR privacy=false',[email], (error, results) => {
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
        
        //disconnect
        socket.on("disconnect", (reason:any) => {
            socket.emit(`${users.id} has left`)
        });
    });
}