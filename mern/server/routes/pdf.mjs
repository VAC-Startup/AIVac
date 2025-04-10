import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // During development, accept any file type
    console.log("Received file upload:", file.originalname, file.mimetype);
    
    // For development, accept any file
    cb(null, true);
    
    // In production, use this stricter validation:
    /*
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
    */
  }
});

const router = express.Router();

// Endpoint to process PDF files
router.post("/", upload.single("pdf"), async (req, res) => {
  try {
    console.log("PDF upload request received:", req.file ? "File received" : "No file");
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log("File details:", {
      path: req.file.path,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // For testing/placeholder - return dummy data
    // In a real implementation, you would:
    // 1. Call the AI service to extract content from the PDF
    // 2. Process the extracted text to identify courses
    // 3. Return the structured course data
    
    const dummyCourses = [
      {
        course_id: "MATH 11",
        course_name: "Calculus I",
        credits: 4,
        completed: true
      },
      {
        course_id: "CSE 11",
        course_name: "Introduction to Programming",
        credits: 4, 
        completed: true
      },
      {
        course_id: "CHEM 6A",
        course_name: "General Chemistry I",
        credits: 4,
        completed: true
      },
      {
        course_id: "BILD 1",
        course_name: "The Cell",
        credits: 4,
        completed: true
      },
      {
        course_id: "WCWP 10A",
        course_name: "The Writing Course",
        credits: 4,
        completed: true
      }
    ];

    // For a real implementation, you would process the PDF here
    // const filepath = req.file.path;
    // const extractedData = await processWithAI(filepath);
    // const courses = mapExtractedDataToCourses(extractedData);

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    // Return the extracted courses
    return res.json({ 
      courses: dummyCourses,
      message: "PDF processed successfully" 
    });

  } catch (error) {
    console.error("Error processing PDF:", error);
    return res.status(500).json({ error: "Failed to process PDF file" });
  }
});

// Function to integrate with your AI service (placeholder)
async function processWithAI(filepath) {
  try {
    // This is where you would integrate with your Python AI service
    // Example using axios to call an API
    /*
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filepath));
    
    const response = await axios.post('http://localhost:8000/process-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
    */
    
    // Placeholder implementation
    return {
      text: "Sample extracted text",
      courses: ["MATH 11", "CSE 11"]
    };
  } catch (error) {
    console.error("Error calling AI service:", error);
    throw error;
  }
}

export default router;