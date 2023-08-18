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

        socket.on("upload", (file:any, err:any) => {
            console.log(file);  
            if(err){
                console.log(err)
            }
            socket.broadcast.emit("download",file)
        });

        //disconnect
        socket.on("disconnect", (reason:any) => {
            socket.emit(`${users.id} has left`)
        });
    });
}