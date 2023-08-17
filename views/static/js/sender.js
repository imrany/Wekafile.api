import { socket } from "../../router.js";

export const sender ={
    handleForm(element){
       element.addEventListener("submit",(e)=>{
           e.preventDefault()
           const file=document.getElementById("file")
           for (let index = 0; index < file.files.length; index++) {
               const data={
                   file:file.files[index],
                   file_name:file.files[index].name,
                   type:file.files[index].type,
                   size:file.files[index].size
               }
               // console.log(file.files[index])
               socket.emit("upload", data, (status) => {
                   console.log(status);
               });
               alert(`File sent`)
           }
           element.reset()
       })
   }
}


