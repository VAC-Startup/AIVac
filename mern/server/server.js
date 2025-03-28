// import express from "express";
// import cors from "cors";
// import records from "./routes/record.js";
// import chat from "./routes/chat.js";

// const PORT = process.env.PORT || 5050;
// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use("/record", records);
// app.use("/chat", chat);

// // start the Express server
// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });
import express from "express";
import cors from "cors";
import records from "./routes/record.js";
import chat from "./routes/chat.js";
import searchRouter from "./routes/search.js";



const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/record", records);
app.use("/chat", chat);
app.use("/search-courses", searchRouter);


// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
