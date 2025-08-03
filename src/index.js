// require('dotenv').config({path: './env})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
//import express from 'express';


dotenv.config({
    path: './.env'
});


import { app } from "./app.js";


// const app = express();

// app.on("error", (error) =>{
//         console.log("ERRR:", error);
//         //throw error
//         process.exit(1);
//     });


connectDB()  //after async and await we promis is neccessary
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
        //console.log(`Server is running at port : ${process.env.PORT}`);
    });
})
.catch((err) => {
    console.log("MONGO db connection failed !!!", err);
    //process.exit(1);
});


// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// 1st approach
/*
// import express from "express"
// const app = express()

// ( async () => {
//     try{
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on("error", (error) => {
//         console.log("ERR: ", error);
//         throw error
//        })
//        app.listen(process.env.PORT, () =>{
            console.log(`App is listening on port $ {process.env.PORT}`);
//   })
//     }catch(error){
//         console.log("ERROR: ", error)
//         throw err
//     }
// })*/