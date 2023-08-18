export interface MailDetails{
    from:any,
    to:any
    subject:string,
    text:string
}

export interface VerifyEmail{
    body:{
        email:string,
        code:string
    }
}