const express = require("express");
const router = express.Router();
const { auth, authRole } = require("../../middlewares/auth");
const { upload } = require("../../utils/s3");
const {
  createEvent,
  deleteEvent,
  createGenre,
  getUpcomingEvents,
  getRecommendedEvents,
  getEvents
} = require("./event.controller");

router.post("/create", upload.single("thumbnail"), auth, createEvent);

router.delete("/delete/:eventId", auth, deleteEvent);

router.get("/get-events", auth, getEvents);

router.route("/recommended-events").get(auth, getRecommendedEvents);

module.exports = router;
