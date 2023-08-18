// const brain =require('brain.js');
// const data=require('../db/data.json');
// const network= new brain.recurrent.LSTM();

// const trainingData=data.map(item=>({
//     input: item.signs,
//     output: item.sickness
// }));
// network.train(trainingData,{
//     iterations:100,
// });
const User=require('../models/userModel');
const Blog=require('../models/blogModel');
const Blogger=require('../models/Bloggers/blogger')
const Chat=require('../models/chat/chat')
const Admin =require('../models/adminModel');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const nodemailer=require('nodemailer');
const mongoose=require('mongoose');
require('dotenv').config();

//gets all blogs
const blogs=async(req,res)=>{
    const news=await Blog.find({}).sort({createdAt:-1})
    res.render('index',{title:'For you',js:'/js/main.js',news,classes:'opened',paths:[
        {
            id:1,
            name:'Home',
            url:'/',
            title:"Back Home"
        },
        {
            id:2,
            name:'Politics',
            url:'/categories/politics',
            title:"Politics"
        },
        {
            id:3,
            name:'Friends',
            url:'/friends',
            title:"Find your friends"
        },
        {
            id:4,
            name:'Login',
            class:'out',
            url:'/login',
            title:"Go to login page"
        },
        {
            id:5,
            name:'Sign up',
            url:'/register',
            class:'out',
            title:"Go to Sign up page"
        }
    ]})
}
//gets blog category
const blogCategory=async(req,res)=>{
    const {cat}=req.params;
    const news=await Blog.find({category:cat}).sort({createdAt:-1})
    res.render('category/cat',{title:cat,js:'/js/main.js',news,classes:'opened',paths:[
        {
            id:1,
            name:'Home',
            url:'/',
            title:"Back Home"
        },
        {
            id:2,
            name:'For you',
            url:'/',
            title:"Lastest Feeds"
        },
        {
            id:3,
            name:'Friends',
            url:'/friends',
            title:"Find your friends"
        },
        {
            id:4,
            name:'Login',
            class:'out',
            url:'/login',
            title:"Go to login page"
        },
        {
            id:5,
            name:'Sign up',
            url:'/register',
            class:'out',
            title:"Go to Sign up page"
        }
    ]})
}

//gets a single blog
const blog=async(req,res)=>{
    const {id}=req.params;
    await Blog.findByIdAndUpdate({_id:id},{$inc:{views:1}})
    const $new=await Blog.findById({_id:id})
    res.render('blog',{js:'/js/main.js',$new,classes:'closed',paths:[
        {
            id:1,
            name:'Home',
            url:'/',
            title:"Back Home"
        },
        {
            id:2,
            name:'For you',
            url:'/',
            title:"Lastest Feeds"
        },
        {
            id:3,
            name:'Politics',
            url:'/categories/politics',
            title:"Politics"
        },
        {
            id:4,
            name:'Friends',
            url:'/friends',
            title:"Find your friends"
        }
    ]})
}

//user verification
const verify=async(req,res)=>{
    try {
        const {email,code}=req.body;
        const userExist=await User.findOne({email});
        //check if user exist in the db
        if(userExist){
            res.send({error:"User Exist!"})
        }else{
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Verification Code`,
                text:`${code} is your Campus blogs verification code`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent verification code, try again!`});
                } else{
                    res.send({msg:'Email sent',email,link:'/verify',code});
                }
            })
        }
    } catch (error) {
        res.status(500).send({error:error.message})
    }
}

//verify code
const verifyCode=async(req,res)=>{
    try {
        const {code}=req.body
        if(code){
            res.send({msg:'proceed',link:'/last'})
        }else{
            res.status(201).send({error:"Code doesn't match the sent code!"})
        }
        
    } catch (error) {
        res.status(500).send({error:error.message})
    }
}

//user register
const register=async(req,res)=>{
    try {
        const {firstName,lastName,email,password,university}=req.body
        if(firstName&&lastName&&email&&password&&university){
            //hashing the password
            const salt=await bcrypt.genSalt(10);
            const hashedPassword=await bcrypt.hash(password,salt);
            //creating user account in db
            const newUser=await User.create({
                firstName,
                lastName,
                university,
                email,
                password:hashedPassword
            });
            if(newUser){
                res.status(200).send({
                    msg:`Welcome ${newUser.firstName} ${newUser.lastName}`,
                    _id:newUser.id,
                    firstName:newUser.firstName,
                    lastName:newUser.lastName,
                    university:newUser.university,
                    email:newUser.email,
                    token:generateUserToken(newUser.id)
                })
            }else{
                res.status(201).send({error:"Invalid user data!"})
            }
        }else{
            res.status(401).send({error:"Enter the required fields!"})
        }
    } catch (error) {
        res.status(500).send({error:error.message})
    }
}

//register admin
const registerAdmin =async(req,res)=>{
    try{
        const {firstName,lastName,email}=req.body;
        const findUser=await User.findOne({email})
        const findBlogger=await Blogger.findOne({email})
        const findAdmin=await Admin.findOne({email})
        if(findUser&&findBlogger&&!findAdmin){
            await Blogger.findOneAndDelete({email})
            await Admin.create({firstName,lastName,email})
            //send email to the registered user after registration succeeds
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Account update`,
                text:`Dear ${firstName} ${lastName},`,
                html:`<!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your are now an Campus blogs Administrator.</h2>
                    <p>
                        Your account has been upgrade to admin access,  
                        you can now access our administrative roles.
                    </p>
                    <p>
                        You are required to log out of your account and log in to update your dashboard. 
                        <a style="padding:10px 15px; border-radius:8px; border:1px solid gray;" href="https://campus-blog.onrender.com/dashboard/${email}" target="_blank">Link to Dashboard</a>
                    </p>
                </body>
                </html> `
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent email, try again!`});
                } else{
                    res.status(200).send({msg:'Admin created ,Email sent'});
                }
            })
        }else if(findUser&&!findBlogger&&!findAdmin){
            await Admin.create({firstName,lastName,email})
            //send email to the registered user after registration succeeds
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Account update`,
                text:`Dear ${firstName} ${lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your are now a Campus blogs blogger.</h2>
                    <p>
                        you can now create and edit blogs, article and news on campus blogs.
                    </p>
                    <p>
                        You are required to log out of your account and log in to update your dashboard. 
                        <a style="padding:10px 15px; border-radius:8px; border:1px solid gray;" href="https://campus-blog.onrender.com/dashboard/${email}" target="_blank">Link to Dashboard</a>
                    </p>
                </body>
                </html>  `
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent email, try again!`});
                } else{
                    res.status(200).send({msg:'Admin created ,Email sent'});
                }
            })
        }else{
            res.status(404).send({error:'This user is not register!'})
        }
    }catch(err){
        res.status(500).send({error:err.message})
    }
}

//user login
const login=async(req,res)=>{
    try {
        const {email,password}=req.body
        if(email&&password){
           const findAdmin=await Admin.findOne({email})
           const findBlogger=await Blogger.findOne({email})
           if(findAdmin&&!findBlogger){
            const user=await User.findOne({email});
            if(user&&(await bcrypt.compare(password,user.password))){
                res.status(200).send({admin:`Admin: ${user.firstName} ${user.lastName}`,
                    _id:user.id,
                    firstName:user.firstName,
                    lastName:user.lastName,
                    university:user.university,
                    email:user.email, 
                    photo:user.photo,
                    adminToken:generateAdminToken(findAdmin.id)
                })
            }else{
                res.status(400).send({error:'Invalid Credentials'})
            }
           }else if(findBlogger&&!findAdmin){
            const user=await User.findOne({email});
            if(user&&(await bcrypt.compare(password,user.password))){
                res.status(200).send({blogger:`Blogger: ${user.firstName} ${user.lastName}`,
                    _id:user.id,
                    firstName:user.firstName,
                    lastName:user.lastName,
                    university:user.university,
                    email:user.email, 
                    photo:user.photo,
                    bloggerToken:generateBloggerToken(findBlogger.id)
                })
            }else{
                res.status(400).send({error:'Invalid Credentials'})
            }
           }else{
            const user=await User.findOne({email});
            if(user&&(await bcrypt.compare(password,user.password))){
                res.status(200).send({msg:`Welcome ${user.firstName} ${user.lastName}`,
                    _id:user.id,
                    firstName:user.firstName,
                    lastName:user.lastName,
                    university:user.university,
                    email:user.email, 
                    photo:user.photo,
                    token:generateUserToken(user.id)
                })
            }else{
                res.status(400).send({error:'Invalid Credentials'})
            }
           }
        }else{
            res.status(401).send({error:"Enter the required fields!"})
        }
    } catch (error) {
        res.status(500).send({error:error.message})
    }
}

//register a blogger
const registerBlogger=async(req,res)=>{
    try{
        const {firstName,lastName,email}=req.body;
        const findUser=await User.findOne({email})
        const findAdmin=await Admin.findOne({email})
        const findBlogger=await Blogger.findOne({email})
        //if user is an admin then admin account get del and blogger account created bcoz admins have all permissions
        if(findUser&&findAdmin&&!findBlogger){
            await Admin.findOneAndDelete({email})
            await Blogger.create({firstName,lastName,email})
            //send email to the registered user after registration succeeds
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Account update`,
                text:`Dear ${firstName} ${lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your are now a Campus blogs blogger.</h2>
                    <p>
                        you can now create and edit blogs, article and news on campus blogs.
                    </p>
                    <p>
                        You are required to log out of your account and log in to update your dashboard. 
                        <a style="padding:10px 15px; border-radius:8px; border:1px solid gray;" href="https://campus-blog.onrender.com/dashboard/${email}" target="_blank">Link to Dashboard</a>
                    </p>
                </body>
                </html>  `
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent email, try again!`});
                } else{
                    res.status(200).send({msg:'Blogger created ,Email sent'});
                }
            })
        }else if(findUser&&!findAdmin&&!findBlogger){
            await Blogger.create({firstName,lastName,email})
            //send email to the registered user after registration succeeds
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Account update`,
                text:`Dear ${firstName} ${lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your are now a Campus blogs blogger.</h2>
                    <p>
                        you can now create and edit blogs, article and news on campus blogs.
                    </p>
                    <p>
                        You are required to log out of your account and log in to update your dashboard. 
                        <a style="padding:10px 15px; border-radius:8px; border:1px solid gray;" href="https://campus-blog.onrender.com/dashboard/${email}" target="_blank">Link to Dashboard</a>
                    </p>
                </body>
                </html>  `
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent email, try again!`});
                } else{
                    res.status(200).send({msg:'Blogger created ,Email sent'});
                }
            })
        }else if(findBlogger){
            res.status(201).send({error:'This blogger is already register!'})
        }else if(findAdmin){
            res.status(201).send({error:'You cannot add an admin as a blogger!'})
        }else{
            res.status(404).send({error:'This user is not register!'})
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//User auth Middlerware
const protectUser=async(req,res,next)=>{
    let token
    if(req.headers.authorization&&req.headers.authorization.startsWith('Bearer')){
        try{
            //get token from headers
            token=req.headers.authorization.split(' ')[1]
            //verify token
            const decoded=jwt.verify(token,process.env.JWT_SECRET);
            //get user from the token
            req.user=await User.findById(decoded.id).select('password')
            next()
  
        }catch (error){
            res.status(401).send({error:'Not Authorised☠'})
        }
    }
    if(!token){
      res.status(401).send({error:'No Token Available☠'})
    }
  };

//admin auth Middlerware
const protectAdmin=async(req,res,next)=>{
    let token
    if(req.headers.authorization&&req.headers.authorization.startsWith('Bearer')){
        try{
            //get token from headers
            token=req.headers.authorization.split(' ')[1]
            //verify token
            jwt.verify(token,process.env.JWT_ADMIN_SECRET);
            next()
  
        }catch (error){
            res.status(401).send({error:'Not Authorised☠'})
        }
    }
    if(!token){
      res.status(401).send({error:'No Token Available☠'})
    }
  };

  //generate User token
  const generateUserToken=(id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:'309d'
    })
  };
  //generate admin token
  const generateAdminToken=(id)=>{
    return jwt.sign({id},process.env.JWT_ADMIN_SECRET,{
        expiresIn:'309d'
    })
  };
  //generate blogger token
  const generateBloggerToken=(id)=>{
    return jwt.sign({id},process.env.JWT_BLOGGER_SECRET,{
        expiresIn:'309d'
    })
  };

  //delete user
  const deleteUser=async(req,res)=>{
    try {
        const {email}=req.params;
        if(!User.findOne({email})){
            return res.status(404).json({error:'No such User'})
          } 

        const user=await User.findOne({email})
        const admin=await Admin.findOne({email})
        const blogger=await Blogger.findOne({email})
        if(user&&admin){
            await Chat.deleteMany({email})
            await User.findOneAndDelete({email})
            await Admin.findOneAndDelete({email})
            //send email to the admin after account deleted
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:user.email,//receiver
                subject:`Your Account Was Deleted`,
                text:`Dear ${user.firstName} ${user.lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your Campus blogs account got deleted.</h2>
                    <p>
                        It's sad to see you leave. Send us your feedback and help us improve at.
                    </p>
                    <a style="padding:10px 15px; border-radius:8px; border:1px solid orange;" href="https://chat.whatsapp.com/GyQ1aVOjILvDbtn95kwmVl" target="_blank">Campus blogs Feedback</a>
                </body>
                </html>`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Try again!`});
                } else{
                    res.status(200).send({msg:'Admin account delete successful'});
                }
            })
        }else if(user&&blogger){
            await Chat.deleteMany({email})
            await User.findOneAndDelete({email})
            await Blogger.findOneAndDelete({email})
            //send email to the blogger after account deleted
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:user.email,//receiver
                subject:`Your Account Was Deleted`,
                text:`Dear ${user.firstName} ${user.lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your Campus blogs account got deleted.</h2>
                    <p>
                        It's sad to see you leave. Send us your feedback and help us improve at.
                    </p>
                    <a style="padding:10px 15px; border-radius:8px; border:1px solid orange;" href="https://chat.whatsapp.com/GyQ1aVOjILvDbtn95kwmVl" target="_blank">Campus blogs Feedback</a>
                </body>
                </html>`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Try again!`});
                } else{
                    res.status(200).send({msg:'Blogger account delete successful'});
                }
            })
        }else if(user){
            await Chat.deleteMany({email})
            await User.findOneAndDelete({email})
            //send email to the user after account deleted
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:user.email,//receiver
                subject:`Your Account Was Deleted`,
                text:`Dear ${user.firstName} ${user.lastName},`,
                html:` <!doctype html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <title>Account update</title>
                    <style>
                        body{
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                        }
                    </style>
                </head>
                <body>
                <h2>Your Campus blogs account got deleted.</h2>
                    <p>
                        It's sad to see you leave. Send us your feedback and help us improve at.
                    </p>
                    <a style="padding:10px 15px; border-radius:8px; border:1px solid orange;" href="https://chat.whatsapp.com/GyQ1aVOjILvDbtn95kwmVl" target="_blank">Campus blogs Feedback</a>
                </body>
                </html>`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Try again!`});
                } else{
                    res.status(200).send({msg:'User account delete successful'});
                }
            })
        }else{
            res.json({error:"Cannot Delete account!"})
        }
    } catch (error) {
        res.status(500).json({error:'Cannot Delete account, try again!'})
    }    
  }

  //add blog to db
  const postBlog=async(req,res)=>{
    try {
        const {title,image,body,author,authorImage,category,date}=req.body;
        const createBlog=await Blog.create({title,image,body,category,author,authorImage,date})
        const userEmails=await User.find({})
        if(createBlog){
            const desc=body.slice(0,200)
            userEmails.map(i=>{
                //send post email to all users when add is added
                let mailTranporter=nodemailer.createTransport({
                    service:'gmail',
                    auth:{
                        user:process.env.TRANSPORTER,
                        pass:process.env.PASSWORD
                    }
                });
                let details={
                    from:process.env.TRANSPORTER,
                    to:i.email,//receivers
                    subject:`A new blog post was added`,
                    text:`Dear ${i.firstName}, you might like this :)`,
                    html:` <!doctype html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width">
                        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                        <title>Account update</title>
                        <style>
                            body{
                                display:flex;
                                flex-direction:column;
                                align-items:center;
                                justify-content:center;
                                color:black;
                            }
                            .blog-image{
                                width:85vw; 
                                height:250px; 
                                border-radius:15px; 
                                margin:15px;
                            }
                            @media screen and (min-width:700px){
                                .blog-image{
                                    width:50vw;
                                }
                            }
                        </style>
                    </head>
                    <body>
                    <h2>A new blog post just got posted!!</h2>
                        <p>
                            View the lastest blog at campus blogs and get updated.
                        </p><br/><br/>
                        <div style="margin-bottom:45px;">
                            <img src="${image} alt="blog image" class="blog-image"/>
                            <strong>${title}</strong><br/>
                            <p>${desc}</p>
                            <div style="display:flex; margin-top:5px;">
                                <img src="${authorImage}" alt="author's image" style="width:50px; height:50px; border-radius:50px;"/> 
                                <div style="margin:-4px 0 0 10px;"><span style="color:gray;">${author}</span> on <span style="color:gray;">${date}</span></div>
                            </div>
                        </div>
                        <a style="padding:10px 15px; border-radius:8px; border:1px solid orange;" href="https://campus-blog.onrender.com/blogs/${id}" target="_blank">Read more</a>
                    </body>
                    </html>`
                }
                mailTranporter.sendMail(details,(err)=>{
                    if(err){
                        return res.send({error:err.message});
                    } 
                })
            })
        }else{
            res.send({error:'Cannot post blog!'})
        }
    } catch (error) {
        res.status(500).send({error:error.message})
    }
  }

  //api route for mobile (addition ...not need by the site)
  const getAllBlogs=async(req,res)=>{
      try{
          const blogs=await Blog.find({}).sort({createdAt:-1})
          res.send(blogs)
      }catch(error){
          res.status(500).send({error:error.message})
      }
  }
  
  const getBlog=async(req,res)=>{
    try{
        const {id}=req.params;
        const blog=await Blog.findById({_id:id})
        res.send(blog)
    }catch(error){
        res.status(500).send({error:error.message})
    }
  }

  //admin seeing all register user
  const getUser=async(req,res)=>{
    try {
        const users=await User.find({})
        const admins=await Admin.find({})
        const bloggers=await Blogger.find({})
        res.send({users,admins,bloggers})
    } catch (error) {
        res.status(500).send({error:error.message})
    }
  }

//update your password (forgot password)
const changePassword=async(req,res)=>{
    try{
        const {email}=req.params
        const {password}=req.body;
        //hashing the password
        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);
        //updating the hashed password to db
        const updatePassword=await User.findOneAndUpdate({email},{
            password:hashedPassword
        })
        if(updatePassword){
            //send email after password change
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Your password was changed`,
                text:`We've sent your the email to inform you that your password has been changed successfully.\n Your new password is ${password} .\nView your dashbord details at https://campus-blog.onrender.com/dashboard/${email}`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot sent email, try again!`});
                } else{
                    res.status(200).send({msg:'Password Changed, try login again',link:'/login'});
                }
            })
        }else{
            res.status(404).send({error:'This user doesnt exist, try again!'})
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//update user profile pic /information
const updateUserPic=async(req,res)=>{
    try{
        const {email}=req.params
        const updateUserInfo=await User.findOneAndUpdate({email},{
            ...req.body
        })
        //will also update all blogs author image if the user is an author
       await Blog.updateMany({email},{$set:{
            authorImage:req.body.photo
       }})
        //will also update user chats image
       await Chat.updateMany({email},{$set:{
            photo:req.body.photo
       }})
        if(updateUserInfo){
            //send email after user info is changed
            let mailTranporter=nodemailer.createTransport({
                service:'gmail',
                auth:{
                    user:process.env.TRANSPORTER,
                    pass:process.env.PASSWORD
                }
            });
            let details={
                from:process.env.TRANSPORTER,
                to:email,//receiver
                subject:`Your User Profile was changed`,
                text:`Your user profile was changed.\nView your dashbord details at https://campus-blog.onrender.com/dashboard/${email}`
            }
            mailTranporter.sendMail(details,(err)=>{
                if(err){
                    res.send({error:`Cannot update profile, try again!`});
                } else{
                    res.status(200).send({msg:'Profile Changed'});
                }
            })
        }else{
            res.status(404).send({error:'Cannot update profile, user does not exist, try again!'})
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//delete blog
const deleteBlog=async(req,res)=>{
    try{
        const {id}=req.params
        const deleteBlogOnDb=await Blog.findByIdAndDelete({_id:id})
        if(deleteBlogOnDb){
            res.send({msg:`Blog was delete successfully`});
        }else{
            res.send({error:`Cannot delete this blog!`});
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//get user details
const userDetail=async(req,res)=>{
    try{
        const {email}=req.params
        const findUser=await User.findOne({email})
        if(findUser){
            res.render('dashboard',{title:`${findUser.firstName} ${findUser.lastName}`,user:{
                firstName:findUser.firstName,
                lastName:findUser.lastName,
                email:findUser.email,
                university:findUser.university,
                photo:findUser.photo
            },classes:'closed',js:"/js/main.js",paths:[
                {
                    id:1,
                    name:'For you',
                    url:'/',
                    title:"Lastest Feeds"
                },
                {
                    id:2,
                    name:'Home',
                    url:'/',
                    title:"Back Home"
                },
                {
                    id:3,
                    name:'Politics',
                    url:'/categories/politics',
                    title:"Politics"
                },
                {
                    id:4,
                    name:'Friends',
                    url:'/friends',
                    title:"Find your friends"
                }
            ]})
        }else{
            res.status(404).send({error:`User not found!`});
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//post chat
const postChat=async(req,res)=>{    
    try{
        const {email}=req.params
        const user=await User.findOne({email})
        if(user){
            const {message,date,time,file}=req.body
            const addChat= await Chat.create({
                firstName:user.firstName,
                lastName:user.lastName,
                file,
                message,
                photo:user.photo,
                email,
                date,
                time
            })
            res.status(200).send({msg:`Sent`});
            if(!addChat){
                res.status(201).send({error:`Try again!`});
            }
        }else{
            res.status(404).send({error:`User not found!`});
        }
    }catch(error){
        res.status(500).send({error:error.message})
    }
}

//get all chats
const getChats=async(req,res)=>{
    const chats=await Chat.find({})
    res.render('chats/index',{title:'Friends',js:'/js/main.js',chats,classes:'opened',paths:[
        {
            id:1,
            name:'Home',
            url:'/',
            title:"Back Home"
        },
        {
            id:2,
            name:'For you',
            url:'/',
            title:"Lastest Feeds"
        },
        {
            id:3,
            name:'Politics',
            url:'/categories/politics',
            title:"Politics"
        },
        {
            id:4,
            name:'Login',
            class:'out',
            url:'/login',
            title:"Go to login page"
        },
        {
            id:5,
            name:'Sign up',
            url:'/register',
            class:'out',
            title:"Go to Sign up page"
        }
    ]})
}

module.exports={
    register,
    verify,
    login,
    blogs,
    verifyCode,
    blog,
    deleteUser,
    protectUser,
    postBlog,
    getAllBlogs,
    getBlog,
    registerAdmin,
    protectAdmin,
    getUser,
    registerBlogger,
    blogCategory,
    changePassword,
    updateUserPic,
    deleteBlog,
    userDetail,
    postChat,
    getChats,
}
