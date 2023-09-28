import express from "express"
import { deleteUploadFile, deleteUser, getMyUploads, getUserDetails, getUsers, loginUser, postMyUploads, protectUser, registerUser, updateUser, verifyEmail } from "../controllers/user"
import { changeGroupVisiblity, deleteSharedFile, deleteGroup, getGroupDetails, giveAccess, loginGroup, registerGroup, fetch_public_group_details } from "../controllers/groups"
const router=express.Router()

router.post("/verify",verifyEmail)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.get("/accounts/:email",protectUser,getUserDetails)
// router.get("/accounts",protectUser,getUsers)
router.patch("/accounts/:email",protectUser,updateUser)
router.delete("/accounts/:email",protectUser,deleteUser)
router.get("/uploads/:email",protectUser,getMyUploads)
router.post("/uploads/:email",protectUser,postMyUploads)
router.delete("/uploads/:filename",protectUser,deleteUploadFile)


//group routes
router.post("/file/access/:email",protectUser,giveAccess)
router.post("/auth/group/register",protectUser,registerGroup)
router.post("/auth/group/login",protectUser,loginGroup)
router.get("/groups/:email",protectUser,getGroupDetails)
router.delete("/groups/:email",protectUser,deleteGroup)
router.patch("/groups_visibility/:email",protectUser,changeGroupVisiblity)
router.patch("/groups/:email",protectUser,updateUser)

router.get("/public_groups/:groupname",fetch_public_group_details)

router.delete("/delete/sharedfile/:filename",protectUser,deleteSharedFile)
export default router