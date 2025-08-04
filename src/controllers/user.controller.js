import { asyncHandler } from "../utils/asyncHandler.js";

import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    console.log(user, "user found");
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error(" Error in generateAccessAndRefreshTokens:", error);

    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // console.log("✅ registerUser called");
  // console.log("Body:", req.body);

  // res.status(200).json({ message: "OK" });

  // res.status(500).json({
  //     message: "ok"
  // })

  //get user details from frontend
  // validation -not empty
  // check if user already exixts: username, email
  // check for images, check for avatar
  // upload  them to cloudinary, avatar
  // create user object-create entry in db
  // remove password and refresh token fireld from response
  // check for user creation
  // return res

  const { fullName, email, username, password } = req.body;
  console.log("email", email);

  // if(fullName === ""){ //we can check the all through this and another metghod is below
  //     throw new ApiError(400, "fullname is required")
  // }

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
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

  // console.log("req.files:", req.files);
  // console.log("avatarLocalPath:", avatarLocalPath);
  // console.log("coverImageLocalPath:", coverImageLocalPath);

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
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new Apiresponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find the user
  //password check
  //access and refresh token
  //send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log(user);
  //here we add
  //console.log("Trying to login with:", { email, username });

  // const users = await User.find();
  // console.log("All users:", users);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log(isPasswordValid, "correct passward and user found");
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new Apiresponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //this remove the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearcookie("refreshToken", options)
    .json(new Apiresponse(200, {}, "logged Out"));
});

// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

//     if(!incomingRefreshToken){
//         throw new ApiError(401, "unauthorized request")
//     }

//     try {
//         const decodedToken = jwt.verify(
//             incomingRefreshToken,
//             process.env.REFRESH_TOKEN_SECRET
//         )

//         const user = await User.findById(decodedToken?._id)

//         if(!user){
//             throw new ApiError(401, "invalid refresh token")
//         }

//         if(incomingRefreshToken !== user?.refreshToken){
//             throw new ApiError(401, "Refresh token is expired or used")
//         }

//         const options = {
//             httpOnly: true,
//             secure: true
//         }

//         const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

//         return res.status(200)
//         .cookie("accessToken", accessToken, options)
//         .cookie("refreshToken", newRefreshToken, options)
//         .json(
//             new Apiresponse(
//                 200,
//                 {accessToken, refreshToken: newRefreshToken},
//                 "Access token refreshed"
//             )
//         )
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid refresh token")
//     }
// })

// const changeCurrentPassword = asyncHandler(async(req, res) => {
//     const {oldPassword, newPassword} = req.body

//     const user = await User.findById(req.user?.id)
//     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

//     if(!isPasswordCorrect){
//         throw new ApiError(400, "Invalid old password")
//     }

//     user.password = newPassword
//     await user.save({validateBeforeSave: false})

//     return res.status(200)
//     .json(new Apiresponse(200, {}, "Password changed successfully"))
// })

// const getCurrentuser = asyncHandler(async (req, res) => {
//     return res.status(200)
//     .json(new Apiresponse(
//         200,
//         req.user,
//         "user fetched successfully"
//     ))
// })

// const updateAccountDetails = asyncHandler(async(req, res) => {
//     const {fullName, email} = req.body

//     if(!fullName || !email){
//         throw new ApiError(400, "All fields are required")
//     }
//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//                 fullName,
//                 email: email
//             }
//         },
//         {new: true} // update aur new profile krdega
//     ).select("-password")
//     return res
//     .status(200)
//     .json(new Apiresponse(200, user, "Account details updates successfully"))
// })

// const updateUserAvatar = asyncHandler( async(req, res) => {
//     const avatarLocalPath = req.file?.path

//     if(!avatarLocalPath){
//         throw new ApiError(400, "Avatar file is missing")
//     }

//     const avatar = await uploadOnCloudinary(avatarLocalPath)

//     if(!avatar.url){
//         throw new ApiError(400, "Error while uploading on avatar")
//     }

//     const user  = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//             avatar: avatar.url
//             }
//         },
//         {
//             new: true
//         }
//     ).select("-password")

//     return res
//     .status(200)
//     .json(
//         new Apiresponse(200, user, "avatar is updated successfully")
//     )
// })

// const updateUserCoverImage = asyncHandler( async(req, res) => {
//     const coverImageLocalPath = req.file?.path

//     if(!coverImageLocalPath){
//         throw new ApiError(400, "coverImage file is missing")
//     }

//     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

//     if(!coverImage.url){
//         throw new ApiError(400, "Error while uploading on coverImage")
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//             coverImage: coverImage.url
//             }
//         },
//         {
//             new: true
//         }
//     ).select("-password")

//     return res
//     .status(200)
//     .json(
//         new Apiresponse(200, user, "cover image is updated successfully")
//     )
// })

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribedTo",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSunbscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subcriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSunbscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new Apiresponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new Apiresponse(
        200,
        user[0].WatchHistory,
        "watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  //refreshAccessToken
  // changeCurrentPassword,
  // getCurrentuser,
  // updateAccountDetails,
  // updateUserAvatar,
  // updateUserCoverImage
  getUserChannelProfile,
  getWatchHistory,
};

// // src/controllers/user.controller.js
// const registerUser = async (req, res) => {
//     console.log("✅ registerUser called");
//     return res.status(200).json({
//         message: "ok"
//     });
// };

// export { registerUser };
