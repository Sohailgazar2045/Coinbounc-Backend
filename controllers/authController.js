const Joi = require("joi");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTServices = require("../services/JWTServices");
const RefreshToken = require("../models/token");
const token = require("../models/token");

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const authController = {
  async register(req, res, next) {
    //1. validate user input
    const userRegistrationSchema = Joi.object({
      username: Joi.string().min(5).max(20).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmpassword: Joi.ref("password"),
    });
    const { error } = userRegistrationSchema.validate(req.body);

    //2. if error in validation -> return error via middleware
    if (error) {
      return next(error);
    }
    //3. if email and username is already register then -> return error to user
    const { username, name, email, password } = req.body;
    try {
      const emailInUse = await User.exists({ email });
      const usernameInUse = await User.exists({ username });
      if (emailInUse) {
        const error = {
          status: 409,
          message: "User already registered  ,  use other email ",
        };
        return next(error);
      }
      if (usernameInUse) {
        const error = {
          status: 409,
          message: "Username is unavailable  ,  choose other username ",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //4. password hashing
    const hashedPasssword = await bcrypt.hash(password, 10);

    // 5. store data in database // and also save access token and refresh token

    let accessToken;
    let refreshToken;
    let user;

    try {
      const userToRegister = new User({
        username,
        name,
        email,
        password: hashedPasssword,
      });
      user = await userToRegister.save();

      // token generation
      accessToken = JWTServices.signAccessToken({ _id: user._id }, "30m");
      refreshToken = JWTServices.signRefreshToken({ _id: user._id }, "60m");
    } catch (error) {
      return next(error);
    }

    // store refresh token in database
    await JWTServices.storeRefreshToken(refreshToken, user._id);
    // store token in cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    //6. send response
    const userdto = new UserDTO(user);
    return res.status(201).json({ user: userdto, auth: true });
  },

  // login controller
  async login(req, res, next) {
    const userLoginSchema = Joi.object({
      username: Joi.string().min(5).max(20).required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });
    const { error } = userLoginSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    // 1. validate user input

    const { username, password } = req.body;
    let user;
    try {
      // match username
      user = await User.findOne({ username });
      if (!user) {
        const error = {
          status: 401,
          message: "Invalid username or password ",
        };
        return next(error);
      }

      // match password
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "Invalid username or password ",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    // generatere token

    const accessToken = JWTServices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTServices.signRefreshToken({ _id: user._id }, "60m");

    // update token in database when that user get login  becuae on login there are also new token are generating
    try {
      await RefreshToken.updateOne(
        {
          _id: user._id,
        },
        { token: refreshToken },
        { upsert: true } // if token is not already exist then create new for it
      );
    } catch (error) {
      return next(error);
    }
    // add token in cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    // use dto to send filtered data mean which data we want to show in response and hide data in response
    const userdto = new UserDTO(user);
    // send response
    return res.status(201).json({ user: userdto, auth: true });
  },

  /// logout controller
  async logout(req, res, next) {
    // delete refresh token
    const { refreshToken } = req.cookies;
    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }

    // delete cookie
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    // send response
    res.status(200).json({ user: null, auth: false });
  },

  /// refresh controller

  async refresh(req, res, next) {
    // 1. get refreshToken from cookies
    // 2. verify refreshToken
    // 3. generate new tokens
    // 4. update db, return response

    const originalRefreshToken = req.cookies.refreshToken;

    let id;

    try {
      id = JWTServices.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };

      return next(error);
    }

    try {
      const match = RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });

      if (!match) {
        const error = {
          status: 401,
          message: "Unauthorized",
        };

        return next(error);
      }
    } catch (e) {
      return next(e);
    }

    try {
      const accessToken = JWTServices.signAccessToken({ _id: id }, "30m");

      const refreshToken = JWTServices.signRefreshToken({ _id: id }, "60m");

      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (e) {
      return next(e);
    }

    const user = await User.findOne({ _id: id });

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
};

module.exports = authController;
