const { userRoute, userModel } = require("./user");
const { eventModel, eventRouter } = require("./events");
const { adminRouter } = require("./admin");

userModel.hasMany(eventModel, { foreignKey: "userID", as: "events" });
eventModel.belongsTo(userModel, { foreignKey: "userId", as: "user" });

module.exports = { userModel, userRoute, eventModel, eventRouter, adminRouter };
