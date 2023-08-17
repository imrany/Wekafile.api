export const notification={
    receive:(data)=>{
        const notification=new Notification("You've received a new file",{
            body:`${data.file_name}`,
            icon:'../favicon.jpg',
          });
          notification.onclick=function(){
            window.parent.focus();
            let blob1 = new Blob([new Uint8Array(data.file)],{type:`${data.type}`}) 
            let aDom = document.createElement('a')
            if('download' in aDom){
                aDom.type = 'download'
                aDom.href = URL.createObjectURL(blob1)
                // aDom.href="/receiver"
                // aDom.download = `${data.file_name}`
                aDom.target="_blank"
                aDom.click()
            }
            this.close();
          }
    }
}

export function checker(){
    //checking and asking permission
    if(Notification.permission === 'granted'){
        //showNotification();
    }else if(Notification.permission !== 'denied'){
        Notification.requestPermission().then(permission =>{
            if(permission === "granted"){
                //showNotification();
            }
        });
    };
}

checker()