import { receiver } from "./static/js/receiver.js";
import { sender } from "./static/js/sender.js";
import { main } from "./static/js/main.js";
import { setTitle } from "./router.js";

export function switches(routes){
    let path;
    if(location.pathname==="/"){
        path="/main"
    }else{
        path=location.pathname
    }
    switch (`/pages${path}.html`) {
        case routes["/"]:
            setTimeout(() => {
                main.show_connected_user(document.getElementById("users"))
            }, 150);
            break;
        case routes["/sender"]:
            setTitle("Sender")
            setTimeout(() => {
                sender.handleForm(document.querySelector("form"))
            }, 150);
            break;
        case routes["/receiver"]:
            setTitle("Receiver")
            receiver()
            break;
    }
}