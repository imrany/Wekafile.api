import axios from 'axios'
import pool from "../pg"
import * as dotenv from 'dotenv'
dotenv.config()

function formated(){
    const dt=new Date;
    let m=dt.getMonth()
    m++
    const month=m<10?`0${m}`:m
    const minutes=dt.getMinutes()<10?`0${dt.getMinutes()}`:dt.getMinutes()
    const date=dt.getDate()<10?`0${dt.getDate()}`:dt.getDate()
    const sec=dt.getSeconds()<10?`0${dt.getSeconds()}`:dt.getSeconds()
    const hour=dt.getHours()<10?`0${dt.getHours()}`:dt.getHours()
    const YmdHMS=`${dt.getFullYear()}${month}${date}${hour}${minutes}${sec}`
    return YmdHMS;
}

//generate password
const newPassword=()=>{
    const YmdHMS=formated()
    const passString=`${process.env.SHORT_CODE}${process.env.PASSKEY}${YmdHMS}`;
    const base64string=Buffer.from(passString).toString('base64')
    return base64string;
}

//token
export const token=(req:any,res:any,next:any)=>{
    const url= 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const auth= 'Basic ' + Buffer.from(process.env.CONSUMER_KEY +':'+ process.env.CONSUMER_SECRET).toString('base64'); 
    const headers={ 
        Authorization: auth 
    };
    axios.get(url,{
        headers:headers
    }).then((response)=>{
        let data=response.data;
        let access_token=data.access_token;
        req.token=access_token;
        next();
    })
    .catch(err=>res.send({error:err.message}));
}

//stk push
export const stkPush=(req:any,res:any,next:any)=>{
 const {
    car_id,
    firstName,
    lastName,
    email,
    phoneNumber,
    numberOfDays,
    numberOfLuggage,
    numberOfPerson,
    drive,
    fromAddress,
    toAddress,
    journeyTime,
    journeyDate,
    reason,
    amount,
    transactionOption
 }=req.body;
 const token=req.token;
 const headers={
    Authorization:'Bearer '+token
 };
 const stkURL='https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
 let data={
    "BusinessShortCode": process.env.SHORT_CODE,//for Till use store number
    "Password": newPassword(),
    "Timestamp": formated(),
    "TransactionType": "CustomerPayBillOnline",//for Till use -> CustomerBuyGoodsOnline
    "Amount": 1,
    "PartyA": `254${phoneNumber}`, //254703730090
    "PartyB": process.env.SHORT_CODE,
    "PhoneNumber": `254${phoneNumber}`, //254703730090
    "CallBackURL": process.env.CALLBACK_URL, 
    "AccountReference": process.env.ACCOUNT_REF,
    "TransactionDesc": process.env.TRANSACTION_DESC
 };
 axios.post(stkURL,data,{
    headers:headers
 }).then(response=>{
    req.data={
        car_id,
        firstName,
        lastName,
        email,
        phoneNumber,
        numberOfDays,
        numberOfLuggage,
        numberOfPerson,
        drive,
        fromAddress,
        toAddress,
        journeyTime,
        journeyDate,
        reason,
        amount,
        transactionOption,
        response:response.data   
    }
    next();
    }).catch(err=>res.send({error:err.response.data}))
}

//callback 
export const callBack=async(req:any,res:any,next:any)=>{
    try {
        const {
            MerchantRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        }=req.body.Body.stkCallback;
        if(CallbackMetadata){
            pool.query('INSERT INTO mpesa_transactions (MerchantRequestID, ResultCode, ResultDesc, amount, MpesaReceiptNo, TransactionDate, PhoneNumber) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [
                MerchantRequestID,
                ResultCode,
                ResultDesc,
                CallbackMetadata.Item[0].Value, //amount
                CallbackMetadata.Item[1].Value, //MpesaReceiptNo
                CallbackMetadata.Item[3].Value, //TransactionDate
                CallbackMetadata.Item[4].Value //PhoneNumber
            ],
            (error, results) => {
                if (error) {
                res.send({error:error})
                }else{
                    res.status(201).send({msg:`Received`})
                    console.log({msg:"Transaction process was successfull",stored:results.rows[0]})
                }
            })
        }else{
            res.send({msg:"Recieved"})
            console.log({msg:"Transaction process was cancelled"},req.body)
        }
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}

// get transactions
export const getTransaction=async(req:any,res:any)=>{
    try {
        pool.query('SELECT * FROM mpesa_transactions RETURNING *',
        (error, results) => {
            if (error) {
            res.send({error:error})
            }else{
                res.status(201).send({msg:`transaction data`,transactions:results.rows})
            }
        })
    } catch (error:any) {
        res.status(500).send({error:error.message})
    }
}