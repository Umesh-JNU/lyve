const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middlewares/error");
const dotenv = require("dotenv");
const app = express();

const path = "./config/config.env";
// const path = "./config/local.env";
dotenv.config({ path });

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
  })
);

app.get("/", (req, res, next) => res.json({ message: "Server is running" }));

//use all router here
const { userRoute, eventRouter, adminRouter, wishlistRoute, userModel } = require("./src");

app.use("/api/users", userRoute);
app.use("/api/events", eventRouter);
app.use("/api/admin", adminRouter);
app.use("/api/post", wishlistRoute)

app.all("*", async (req, res) => {
  res.status(404).json({
    error: {
      message: "Not Found. Kindly Check the API path as well as request type",
    },
  });
});

app.use(errorMiddleware);

const insertQuery = async () => {
  // create admin
  await userModel.create({
    email: "yashb.quantumitinnovation@gmail.com",
    password: "password",
    username: "Yashbarge",
    mobile_no: "7667826351",
    country: "India",
    dob: "2002-04-30",
    isVerified: true,
    role: "User",
    gender: 'Male',
    avatar: "https://jeff-truck.s3.amazonaws.com/biz/1710496638163-user-logo.jpg",
  });

};

(async () => { await insertQuery(); })();
module.exports = app;
