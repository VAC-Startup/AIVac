import express from "express";
import cors from "cors";
import chat from "./routes/chat.js";
import searchRouter from "./routes/search.js";
import pdfRouter from "./routes/pdf-simple.js"; // Using simple version for testing
import scheduleRouter from "./routes/schedule.js"; // New dedicated schedule route
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });


const PORT = process.env.PORT || 5050;
const app = express();

// Enable detailed CORS support
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

app.use(express.json());

// Add simple logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use("/chat", chat);
app.use("/search-courses", searchRouter);
app.use("/process-pdf", pdfRouter);
app.use("/schedule", scheduleRouter); // Register the schedule routes


// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
