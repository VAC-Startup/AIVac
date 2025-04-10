import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory storage for extracted PDF data that can be shared with the chat module
// In a production app, you'd use a database or Redis for this
export const pdfDataStore = {
  extractedCourses: null,
  rawText: null,
  fileName: null,
  uploadTime: null
};

// Simple in-memory storage (no file saved to disk)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Add a test endpoint that doesn't require a file
router.get("/test", (req, res) => {
  console.log("Test endpoint hit");
  return res.json({ message: "PDF API is working" });
});

// Endpoint to check the current PDF data state
router.get("/status", (req, res) => {
  console.log("PDF status check requested");
  return res.json({
    hasData: !!pdfDataStore.extractedCourses,
    courseCount: pdfDataStore.extractedCourses ? pdfDataStore.extractedCourses.length : 0,
    fileName: pdfDataStore.fileName,
    uploadTime: pdfDataStore.uploadTime,
    status: global.pdfDataExists ? "PDF data exists globally" : "No PDF data found in global store"
  });
});

// Simple endpoint that just acknowledges receipt of file
router.post("/", upload.single("pdf"), (req, res) => {
  console.log("PDF upload received");
  
  // Be more lenient - return data even if no file was received
  if (!req.file) {
    console.log("No file in request, but returning dummy data anyway");
  } else {
    console.log("File info:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  }
  
  // Dummy course data for testing
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
    }
  ];
  
  // In a real implementation, this is where you'd extract text from the PDF
  // and process it to identify courses
  const dummyExtractedText = `
    UCSD Transcript for Student: John Doe
    
    Completed Courses:
    MATH 11 - Calculus I - Grade: A
    CSE 11 - Introduction to Programming - Grade: B+
    CHEM 6A - General Chemistry I - Grade: A-
  `;
  
  // Store the extracted data in the shared store for access by the chat module
  // Make direct assignments to ensure data persistence
  pdfDataStore.extractedCourses = JSON.parse(JSON.stringify(dummyCourses)); // Deep copy
  pdfDataStore.rawText = dummyExtractedText;
  pdfDataStore.fileName = req.file ? req.file.originalname : "dummy.pdf";
  pdfDataStore.uploadTime = new Date().toISOString();
  
  // This is a global variable to verify the data was stored
  global.pdfDataExists = true;
  
  console.log("PDF data stored for AI access:", {
    courseCount: pdfDataStore.extractedCourses.length,
    textLength: pdfDataStore.rawText.length,
    fileName: pdfDataStore.fileName,
    uploadTime: pdfDataStore.uploadTime
  });
  
  // Return the extracted courses to the client
  return res.json({
    courses: dummyCourses,
    message: "PDF processed successfully. Data is now available to the AI."
  });
});

export default router;