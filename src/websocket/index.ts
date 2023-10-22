import pool from "../pg";

export default function socket(io:any){
    io.on("connection", function(socket: any) {
        var clientIp = socket.request.connection.remoteAddress;
        console.log(`a user connected: ${socket.id}, ClientIP : ${clientIp} `);

        socket.on("update", (update:string, err:any) => {
            socket.emit("response",update)
            if(err){
                console.log(err)
            }
        });
        
        //disconnect
        socket.on("disconnect", (reason:any) => {
            socket.emit(`${reason} has left`)
        });
    });
}