import express from "express"
import { deleteUser, getUserDetails, getUsers, loginUser, protectUser, registerUser, updateUser, verifyEmail } from "../controllers/user"
import { getSharedFiles } from "../controllers/sharedfiles"
import { deleteGroup, getGroupDetails, getGroups, loginGroup, protectGroup, registerGroup, verifyGroup } from "../controllers/groups"
const router=express.Router()

router.post("/verify",verifyEmail)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.get("/accounts/:email",protectUser,getUserDetails)
// router.get("/accounts",protectUser,getUsers)
router.patch("/accounts/:email",protectUser,updateUser)
router.delete("/accounts/:email",protectUser,deleteUser)

//shared files route
router.get("/sharedfiles/:email",protectGroup,getSharedFiles)

//group routes
router.post("/verify/group",verifyGroup)
router.post("/auth/group/register",registerGroup)
router.post("/auth/group/login",loginGroup)
router.get("/groups/:email",protectGroup,getGroupDetails)
router.get("/groups",protectGroup,getGroups)
router.delete("/groups/:email",protectGroup,deleteGroup)

export default router