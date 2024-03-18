const express = require("express");
const { auth, authRole } = require("../../middlewares/auth");
const {
  getAllUsers,
  createUser,
  getSingleUser,
  deleteUser,
  updateUser,
  register,
} = require("./admin.controller");
const { upload } = require("../../utils/s3");

const adminRouter = express.Router();
const authAdmin = authRole(["Admin"]);

adminRouter
  .route("/users")
  .get(auth, authAdmin, getAllUsers)
  .post(upload.single("image"), auth, authAdmin, createUser);

adminRouter
  .route("/users/:id")
  .get(auth, authAdmin, getSingleUser)
  .delete(auth, authAdmin, deleteUser)
  .put(auth, authAdmin, updateUser);

adminRouter.post("/register", register);

module.exports = adminRouter;
