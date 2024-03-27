const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const { eventModel, genreModel } = require("./event.model");
const { userModel } = require("../user");
const { StatusCodes } = require("http-status-codes");
const { s3Uploadv2 } = require("../../utils/s3");
const { Op } = require("sequelize");
const formattedQuery = require("../../utils/apiFeatures");
const { Wishlist } = require("../wishlist");
const { db } = require("../../config/database")

exports.createEvent = catchAsyncError(async (req, res, next) => {
  console.log("Create event", req.body);
  const { userId } = req;
  const { genre } = req.body;
  const genreReq = await genreModel.findOne({ where: { name: genre } });
  const creator = await userModel.findByPk(userId);

  if (!genreReq)
    return next(
      new ErrorHandler("Genre not found", StatusCodes.NOT_FOUND)
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
  await event.setGenre(genreReq);
  await event.setCreator(creator)

  const newEvent = await eventModel.findByPk(event.id, {
    include: [
      { model: genreModel, as: "genre", attributes: ["id", "name"] },
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

exports.getEvents = catchAsyncError(async (req, res, next) => {
  const { status, page_number, page_size, genre, wishlisted, search_query } = req.query;
  const { userId } = req;

  let query = {};

  if (status) {
    query.where = {
      status: status,
    };
  }

  if (genre) {
    const genreArray = Array.isArray(genre) ? genre : [genre]; // Ensure genre is an array
    const genreIds = [];

    for (const genreName of genreArray) {
      // Find the genreIds corresponding to each genre name
      const genreRecord = await genreModel.findOne({
        where: {
          name: genreName,
        },
      });

      if (genreRecord) {
        genreIds.push(genreRecord.id);
      }
    }

    if (genreIds.length > 0) {
      // Add the genreIds to the query with OR condition
      query.where = {
        ...query.where,
        Genre: { [Op.or]: genreIds },
      };
    }
  }

  if (wishlisted === "true" && userId) {
    // If userId and wishlisted=true parameter are provided
    const user = await userModel.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const wishlistEvents = await user.getWishlists({
      where: { isWishlisted: true },
      attributes: ["eventId"],
    });

    const eventIds = wishlistEvents.map((wishlistEvent) => wishlistEvent.eventId);

    query.where = {
      ...query.where,
      id: { [Op.in]: eventIds },
    };
  }

  if (search_query) {
    query.where = {
      ...query.where,
      [Op.or]: [
        { title: { [Op.iLike]: `%${search_query}%` } },
        { host: { [Op.iLike]: `%${search_query}%` } },
      ],
    };
  }


  if (page_number && page_size) {
    const currentPage = parseInt(page_number, 10) || 1;
    const limit = parseInt(page_size, 10) || 10;
    const offset = (currentPage - 1) * limit;

    query.offset = offset;
    query.limit = limit;
  }

  console.log("Query", query);

  const events = await eventModel.findAll({
    ...query,
    include: [
      {
        model: genreModel,
        as: "genre",
        attributes: ["id", "name"], // Include genre details in the result
      },
    ],
  });

  res.status(200).json({ success: true, events });
});

exports.getFollowingEvents = catchAsyncError(async (req, res, next) => {
  const { userId } = req;
  const { page_number, page_size } = req.query;

  let query = {
    order: [["createdAt", "DESC"]], // Order events by creation date in descending order
  };
  if (page_number && page_size) {
    const currentPage = parseInt(page_number, 10) || 1;
    const limit = parseInt(page_size, 10) || 10;
    const offset = (currentPage - 1) * limit;

    query.offset = offset;
    query.limit = limit;
  }

  // Get the list of users that the current user is following
  const followingUsers = await userModel.findAll({
    where: {
      id: {
        [Op.in]: db.literal(`(
          SELECT "following_user_id" 
          FROM "Follow" 
          WHERE "follower_user_id" = ${userId}
        )`),
      },
    },
    attributes: ["id"],
  });

  // Extract the IDs of the following users
  const followingUserIds = followingUsers.map((user) => user.id);

  // Get events associated with the following users
  const following_events = await eventModel.findAll({
    where: {
      userId: {
        [Op.in]: followingUserIds,
      },
    },
    ...query,
    include: [
      {
        model: genreModel,
        as: "genre",
        attributes: ["id", "name"],
      },
      {
        model: userModel,
        as: "creator",
        attributes: ["id", "username", "avatar"],
      },
    ],
  });

  res.status(StatusCodes.OK).json({ following_events });
});

exports.getGenres = catchAsyncError(async (req, res) => {

  const genres = await genreModel.findAll({
    attributes: ['id', 'name'], // Select only id and name fields
  });
  res.status(200).json({ success: true, genres });

});