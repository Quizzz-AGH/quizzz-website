const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { attachCookiesToResponse, createTokenUser, generateGuestEmail } = require("../utils");

// register a new user
// if it's the first account, make it admin
// attach token to response cookies
const register = async (req, res) => {
  const { name, email, password } = req.body;

  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exists");
  }

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";
  const user = await User.create({ name, email, password, role, expiresAt: null });
  const tokenUser = createTokenUser(user);

  attachCookiesToResponse({ res, data: tokenUser, cookieName: "token" });
  res.status(StatusCodes.CREATED).json({ success: true, user });
};

// login user
// attach token to response cookies
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new CustomError.BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.UnauthenticatedError("Invalid credentials");
  }
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid credentials");
  }

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, data: tokenUser, cookieName: "token" });
  res.status(StatusCodes.OK).json({ success: true, user });
};

// logout user
// clear token from response cookies
const logout = async (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ success: true });
};

// login as guest user
// create a new guest user that expires in x hour
// attach token to response cookies
const loginAsGuest = async (req, res) => {
  const name = "Guest";
  const email = generateGuestEmail();
  const password = "secret";
  const role = "guest";

  const user = await User.create({ name, email, password, role });
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, data: tokenUser, cookieName: "token" });

  res.status(StatusCodes.OK).json({ success: true, user });
};

module.exports = {
  register,
  login,
  logout,
  loginAsGuest,
};
