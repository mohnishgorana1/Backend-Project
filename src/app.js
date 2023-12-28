import express from 'express'
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 8000;


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    // optionsSuccessStatus:200,
    credentials: true,
}))

//* configurations ####
app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({extended: true, limit: '16kb'}))
app.use(express.static('public'))
app.use(cookieParser())


//routes
import userRouter from './routes/user.routes.js'

app.use('/api/v1/users' ,userRouter)

app.get('/', (req, res) => {
    res.send("HELL YOUTuBE")
})

export { app } 