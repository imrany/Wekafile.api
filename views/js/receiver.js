import { loader } from "./ui.js"

const receive=document.querySelector(".receive")
window.addEventListener("load",async()=>{
    loader.on()
    try {
        let url=`/read_file`
        const response=await fetch(url)
        const parseRes=await response.json()
        loader.off()
        if(parseRes.error){
            receive.innerHTML=`
                <p>${parseRes.error}</p>
            `
        }else{
            parseRes.map(i=>{
                receive.innerHTML+=`
                    <a href="${i}" download>${i}</a>
                `
            })
        }
    } catch (error) {
        loader.off()
        receive.innerHTML=`
            <p>${error.message}</p>
        `
    }
})