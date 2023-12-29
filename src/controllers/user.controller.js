import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";


// common used method
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // console.log("accessToken", accessToken);
    // console.log("refreshToken", refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // console.log("user  saved");
    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /**
        // get user details from frontend
        // validations
        // check if user already exists in db using unique(email)
        //* check for images, check for avatar
        //          upload them to cloudinary, avatar
        // make user Object - create entry in db
        // remove password and refreshToken from response
        // res aya h ya nhi (user creation)
        // return res 
    */

  const { username, email, fullName, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  //   console.log("req.body >> ", req.body);
  //   console.log("req.files >> ", req.files);
  //   console.log("Existed user >> ", existedUser);
  //   console.log("AvatarLocalPath >> ", avatarLocalPath);
  //   console.log("avatar >> ", avatar);
  //   console.log("createdUser >> ", createdUser);

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  /*
    get email username and password from req.body
    validate entries
    check user exists from that email/username and explicitly get password from User model
    compare password
      ->  set accessToken and refreshToken in cookies
      ->  User.save
      ->  if right then res.send(success)
    
  */
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username and email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], // ya to email ya fir username ke base pe mil jae
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is Invalid");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
    
  // console.log("tokens>>",accessToken, refreshToken);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken, // data
        },
        "User logged in Successfully" // message
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  // jane se pehle milke ke jaiyega (middleware)
  // cookies ko clear krdo
  // access token or refresh token ko bhi to clear krna hoga

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully "));
});


export { registerUser, loginUser, logoutUser };
