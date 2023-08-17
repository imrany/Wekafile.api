import { loader } from "./ui.js";

const form=document.querySelector("form")
form.addEventListener("submit",async(e)=>{
    loader.on()
    e.preventDefault()
    const file=document.getElementById("file")
    const formData=new FormData()
    for (let index = 0; index < file.files.length; index++) {
    formData.append("files",file.files[index])
    }
    try {
        let url=`/upload`
        const response=await fetch(url,{
            method:"POST",
            body:formData
        })
        form.reset()
        loader.off()
        const parseRes=await response.json()
        if(parseRes.error){
            alert(parseRes.error)
        }else{
            alert(parseRes.msg)
        }
    } catch (error) {
        alert(error.message)
        loader.off()
    }
})