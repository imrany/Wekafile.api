import express from "express"
import { deleteUser, getUserDetails, getUsers, loginUser, protectUser, registerUser, updateUser, verifyEmail } from "../controllers/user"
import { getSharedFiles, storeSharedFiles } from "../controllers/sharedfiles"
const router=express.Router()

router.post("/verify",verifyEmail)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.get("/accounts/:email",protectUser,getUserDetails)
// router.get("/accounts",protectUser,getUsers)
router.patch("/accounts/:email",protectUser,updateUser)
router.delete("/accounts/:email",protectUser,deleteUser)

//shared files route
router.get("/sharedfiles/:email",protectUser,getSharedFiles)
router.post("/sharedfiles/:email",protectUser,storeSharedFiles)
export default router