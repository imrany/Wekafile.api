import {checker} from "./static/js/notification.js"
import {switches} from "./switches.js"
export const socket = io("/");

function navigateTo(event){
    window.history.pushState({}, "", event.target.href);
    handleLocation();
};

document.addEventListener("DOMContentLoaded",()=>{
    document.body.addEventListener("click",(e)=>{
        if(e.target.matches("[data-link]")){
            e.preventDefault()
            navigateTo(e)
        }
    })
})

const routes = {
    404: "/pages/404.html",
    "/": "/pages/main.html",
    "/sender": "/pages/sender.html",
    "/receiver": "/pages/receiver.html",
};

const handleLocation = async () => {
    const path = window.location.pathname;
    const route = routes[path] || routes[404];
    switches(routes)
    const html = await fetch(route).then((data) => data.text());
    document.getElementById("root").innerHTML = html;
};

const client_pair_id=()=>{
    if (!localStorage.getItem("client_id")) {
        const id=window.prompt("Please set your device identify")
        const client_id={
            id:id,
            platform:navigator.platform
        }
        const stringified=JSON.stringify(client_id)
        localStorage.setItem("client_id",stringified)
    }
    const parsed=JSON.parse(localStorage.getItem("client_id"))
    socket.emit("user",parsed)
}

export function setTitle(title){
    window.document.title=title
}

window.onpopstate = handleLocation;
window.route = navigateTo;

client_pair_id()
handleLocation();
checker()

