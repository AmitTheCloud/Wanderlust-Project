// Load .env only in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Routers
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// --------------------------------------------------------------------
// ✅ Corrected MongoDB URL handling
//
// Local development: uses ATLASDB_URL from .env
// Kubernetes: uses env MONGO_URI provided in Deployment
// --------------------------------------------------------------------
const dbUrl = process.env.MONGO_URI || process.env.ATLASDB_URL;

if (!dbUrl) {
  console.error("❌ ERROR: No MongoDB URL found. Set MONGO_URI or ATLASDB_URL");
  process.exit(1);
}

// Connect to MongoDB
async function main() {
  await mongoose.connect(dbUrl);
}

main()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --------------------------------------------------------------------
// Express App Setup
// --------------------------------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// --------------------------------------------------------------------
// Session Store (Fixed Error Handler)
// --------------------------------------------------------------------
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: { secret: process.env.SECRET || "fallbacksecret" },
  touchAfter: 24 * 3600, // time in seconds
});

store.on("error", (err) => {
  console.error("❌ Session Store Error:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET || "fallbacksecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// --------------------------------------------------------------------
// Authentication Setup
// --------------------------------------------------------------------
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash + User middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// --------------------------------------------------------------------
// Routes
// --------------------------------------------------------------------
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// 404 Handler
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

// --------------------------------------------------------------------
// Server Listener
// --------------------------------------------------------------------
// IMPORTANT: Your container exposes PORT=3000 from Dockerfile,
// but app.listen uses 8080 → MISMATCH
//
// FIX: use process.env.PORT (Kubernetes compatible)
// --------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
