import express from "express"
import { deleteUploadFile, deleteUser, getMyUploads, removeSharedUploads, getUserDetails,giveAccess, getUsers, loginUser, postMyUploads, protectUser, registerUser, updateUser, verifyEmail, createUserUploadFolder, getSharedUploads } from "../controllers/user"
import { deleteSharedFile, deleteGroup, getGroupDetails,  loginGroup, registerGroup, fetch_public_group_details, getAllGroups, updateGroup, removeMember, uploadFile, join_group, exit_group, giveGroupAccess } from "../controllers/groups"
const router=express.Router()

router.post("/verify",verifyEmail)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.get("/accounts/:email",protectUser,getUserDetails)
// router.get("/accounts",protectUser,getUsers)
router.patch("/accounts/:email",protectUser,updateUser)
router.post("/accounts/:email/:folder_id",protectUser,deleteUser)
router.get("/uploads/:email",protectUser,getMyUploads)
router.get("/shared/:username/:email",protectUser,getSharedUploads)
router.delete("/shared/:email",protectUser,removeSharedUploads)
router.post("/uploads/:email",protectUser,postMyUploads)
router.delete("/uploads/:filename",protectUser,deleteUploadFile)
router.post("/file/access/:email",protectUser,giveAccess)
router.post("/provider/user/:email",protectUser,createUserUploadFolder)


//group routes
router.post("/group/file/access/:email",protectUser,giveGroupAccess)
router.post("/auth/group/register",protectUser,registerGroup)
router.post("/auth/group/login",protectUser,loginGroup)
router.post('/group_upload/:email',protectUser,uploadFile)
router.get("/groups/:email",protectUser,getGroupDetails)
router.get("/fetch_groups/:email",protectUser,getAllGroups)
router.post("/groups/:email/:folder_id",protectUser,deleteGroup)
router.patch("/groups/:email",protectUser,updateGroup)
router.patch("/groups_member/:email",protectUser,removeMember)

router.get("/public_groups/:groupname/:email",fetch_public_group_details)
router.post("/join_group/:groupname/:email",protectUser,join_group)
router.post("/exit_group/:groupname/:email",protectUser,exit_group)

router.delete("/delete/sharedfile/:filename",protectUser,deleteSharedFile)
export default router
