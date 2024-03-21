const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const { eventModel, genreModel } = require("./event.model");
const { userModel } = require("../user");
const { StatusCodes } = require("http-status-codes");
const { s3Uploadv2 } = require("../../utils/s3");
const { Op } = require("sequelize");

exports.createEvent = catchAsyncError(async (req, res, next) => {
  console.log("Create event", req.body);
  const { userId } = req;
  const { genreId } = req.body;
  const genre = await genreModel.findByPk(genreId);
  const creator = await userModel.findByPk(userId);

  if (!genre)
    return next(
      new ErrorHandler("Genre with entered Id not found", StatusCodes.NOT_FOUND)
    );


  // const thumbnailFile = req.file;
  const thumbnailFile = req.file;
  if (!thumbnailFile) {
    throw new ErrorHandler("Thumbnail is required", StatusCodes.BAD_REQUEST);
  }
  if (thumbnailFile) {
    const imageUrl = await s3Uploadv2(thumbnailFile);
    req.body.thumbnail = imageUrl.Location;
  }

  const eventData = {
    ...req.body,
  };

  const event = await eventModel.create(eventData);
  await event.setGenre(genre);
  await event.setCreator(creator)

  const newEvent = await eventModel.findByPk(event.id, {
    include: [
      { model: genreModel, as: "genre", attributes: ["id", "name"] },
      { model: userModel, as: "creator" },
    ],
  });

  res.status(StatusCodes.CREATED).json({ event: newEvent });
});

exports.deleteEvent = catchAsyncError(async (req, res, next) => {
  const {
    params: { eventId },
  } = req;

  await eventModel.destroy({ where: { id: eventId } });

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Event deleted Successfully" });
});

exports.createGenre = catchAsyncError(async (req, res, next) => {
  console.log("Create Genre", req.body);
  const genre = await genreModel.create({ ...req.body });
  res.status(StatusCodes.CREATED).json({ genre });
});

exports.getUpcomingEvents = catchAsyncError(async (req, res, next) => {
  const { userId } = req;

  const upcomingEvents = await eventModel.findAll({
    where: {
      [Op.or]: [{}, {}],
    },
  });
});

exports.getRecommendedEvents = catchAsyncError(async (req, res, next) => {
  try {
    // Fetch all events ordered by createdAt in descending order
    const allEvents = await eventModel.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        { model: genreModel, as: "genre", attributes: ["id", "name"] },
        { model: userModel, as: "creator", attributes: ["id", "username", "avatar"] },
      ],
    });

    res.status(StatusCodes.OK).json({ allEvents });
  } catch (error) {
    console.error("Error fetching events:", error);
    next(new ErrorHandler("Error fetching events", StatusCodes.INTERNAL_SERVER_ERROR));
  }
})