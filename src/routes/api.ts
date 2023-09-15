import express from "express"
import { deleteUser, getUserDetails, getUsers, loginUser, protectUser, registerUser, updateUser, verifyEmail } from "../controllers/user"
import { changeGroupVisiblity, deleteSharedFile, deleteGroup, getGroupDetails, giveAccess, loginGroup, protectGroup, registerGroup, verifyGroup, fetch_public_group_details } from "../controllers/groups"
const router=express.Router()

router.post("/verify",verifyEmail)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.get("/accounts/:email",protectUser,getUserDetails)
// router.get("/accounts",protectUser,getUsers)
router.patch("/accounts/:email",protectUser,updateUser)
router.delete("/accounts/:email",protectUser,deleteUser)

//group routes
router.post("/verify/group",verifyGroup)
router.post("/file/access/:email",protectGroup,giveAccess)
router.post("/auth/group/register",registerGroup)
router.post("/auth/group/login",loginGroup)
router.get("/groups/:email",protectGroup,getGroupDetails)
router.delete("/groups/:email",protectGroup,deleteGroup)
router.patch("/groups_visibility/:email",protectGroup,changeGroupVisiblity)

router.get("/public_groups/:groupname",fetch_public_group_details)

router.delete("/delete/sharedfile/:filename",protectGroup,deleteSharedFile)
export default router