export interface MailDetails{
    from:any,
    to:string
    subject:string,
    text:string
}
export interface Req{
    body:{
        username:string,
        email:string,
        password:string,
        lastLogin:string,
        userPlatform:string,
        photo:string
    },
    params:{
        email:string,
        id:string
    }
}