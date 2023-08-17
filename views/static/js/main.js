import {socket} from "../../router.js"

export const main={
    show_connected_user(element){
        socket.on("users",(users)=>{
            element.innerHTML=`
            <div class="bg-blue-200 rounded-lg flex flex-col font-light text-gray-600 items-center justify-center max-md:w-[90vw] w-[40vw] h-[40px] mb-[20px]">
                <p class="text-base bg-transparent">${users.length-1} connected users including you.</p>
            </div>
            `
        })
    }
}