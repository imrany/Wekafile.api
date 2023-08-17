import {socket} from "../../router.js"
import { notification } from "./notification.js";

export function receiver(){
    socket.on("download", function(data) {
        console.log(data);
        notification.receive(data)
        // alert("You've received a new file.")
        let blob1 = new Blob([new Uint8Array(data.file)],{type:`${data.type}`}) 
        let url =URL.createObjectURL(blob1)
        
        document.querySelector(".receive").innerHTML+=`
            <a href="${url}" download="${data.file_name}">${data.file_name}</a>
        `
    });
}
