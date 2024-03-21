const { userRoute, userModel } = require("./user");
const { eventModel, eventRouter } = require("./events");
const { adminRouter } = require("./admin");
const { wishlistRoute, Wishlist } = require("./wishlist");
userModel.hasMany(eventModel, { foreignKey: "userID", as: "events" });
eventModel.belongsTo(userModel, { foreignKey: "userId", as: "creator" });

eventModel.hasMany(Wishlist, { foreignKey: "eventId", as: "wishlists" });
Wishlist.belongsTo(eventModel, { foreignKey: "eventId" });

userModel.hasMany(Wishlist, { foreignKey: "userId", as: "wishlists" });
Wishlist.belongsTo(userModel, { foreignKey: "userId" });

module.exports = { userModel, userRoute, eventModel, eventRouter, adminRouter, wishlistRoute };
