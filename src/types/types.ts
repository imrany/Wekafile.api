export interface MailDetails{
    from:any,
    to:string
    subject:string,
    text:string
}
export interface Req{
    body:{
        data:{
            username:string,
            email:string,
            old_password:string,
            password:string,
            lastLogin:string,
            userPlatform:string,
            photo:string
        },
        access_token:string
    },
    params:{
        email:string,
        folder_id:string,
        id:string
    }
}

export interface ReqGroup{
    body:{
        access_token:string,
        data:{
            groupname:string,
            email:string,
            password:string,
            lastLogin:string,
            userPlatform:string,
            photo:string,
            grouptype:string,
            privacy:boolean,
            ipAddress:string,
            members :string[]
        }
    },
    params:{
        email:string,
        folder_id:string,
        id:string
    }
}

export interface FileReq{
    body:{
        filename:string,
        groupname:string,
        uploadedAt:string,
        size:string,
        file:any,
        type:string,
        sharedTo:number
    },
    params:{
        email:string
    }
}