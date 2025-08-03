import express from "express"
import cors from "cors"
import cookiesParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"})) //json file accept
app.use(express.urlencoded({extended: true, limit: "16kb"}))  //also for url data
app.use(express.static("public"))
app.use(cookiesParser()) //use , brower ki cookie accept kr apu saath hi use set kr pau

//routes import
import userRouter from './routes/user.routes.js' 

//routes declaration
app.use("/api/v1/users", userRouter)


console.log("✅ App loaded");



// http://localhost:8000/api/v1/users/register
export { app }