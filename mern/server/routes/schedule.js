import express from "express";
import { pdfDataStore } from "./pdf-simple.js";

const router = express.Router();

// Dummy schedule data with completed courses (copied from main.py)
const DUMMY_SCHEDULE = {
  "FA24": [
    {"course_id": "MATH 11", "completed": true},
    {"course_id": "CSE 11", "completed": true},
    {"course_id": "CHEM 6A", "completed": true}
  ],
  "WI25": [
    {"course_id": "MATH 20C", "completed": false},
    {"course_id": "DSC 30", "completed": false},
    {"course_id": "CCE 1", "completed": false}
  ],
  "SP25": [
    {"course_id": "DSC 40A", "completed": false},
    {"course_id": "DSC 80", "completed": false},
    {"course_id": "CCE 2", "completed": false}
  ],
  "FA25": [
    {"course_id": "DSC 40B", "completed": false},
    {"course_id": "MATH 181A", "completed": false},
    {"course_id": "CCE 3", "completed": false}
  ],
  "WI26": [
    {"course_id": "DSC 100", "completed": false},
    {"course_id": "DSC 102", "completed": false},
    {"course_id": "CCE 120", "completed": false}
  ],
  "SP26": [
    {"course_id": "DSC 106", "completed": false},
    {"course_id": "MATH 189", "completed": false},
    {"course_id": "DSC 140A", "completed": false}
  ],
  "FA26": [
    {"course_id": "DSC 140B", "completed": false},
    {"course_id": "DSC 148", "completed": false},
    {"course_id": "PHIL 150", "completed": false}
  ],
  "WI27": [
    {"course_id": "DSC 180A", "completed": false},
    {"course_id": "PHIL 160", "completed": false},
    {"course_id": "TDGE 11", "completed": false}
  ],
  "SP27": [
    {"course_id": "DSC 180B", "completed": false},
    {"course_id": "PHIL 170", "completed": false},
    {"course_id": "MUS 1A", "completed": false}
  ],
  "FA27": [
    {"course_id": "ANTH 101", "completed": false},
    {"course_id": "PHIL 180", "completed": false},
    {"course_id": "MUS 4", "completed": false}
  ]
};

// Endpoint to generate a schedule, taking uploaded transcript data into account
router.post("/generate", async (req, res) => {
  console.log("Schedule generation requested with preferences:", req.body);
  
  try {
    // Check if we have uploaded transcript data
    const hasTranscriptData = !!pdfDataStore.extractedCourses && pdfDataStore.extractedCourses.length > 0;
    
    // Prepare request object for the FastAPI backend
    const requestBody = {
      preferences: {
        major: req.body.major || "Data Science",
        maxUnitsPerTerm: req.body.preferences?.maxUnitsPerTerm || 16,
        preferredDays: req.body.preferences?.preferredDays || ["Mon", "Wed", "Fri"]
      }
    };
    
    // Add PDF data if available
    if (hasTranscriptData) {
      console.log(`Including ${pdfDataStore.extractedCourses.length} courses from transcript`);
      requestBody.pdfData = {
        extractedCourses: pdfDataStore.extractedCourses,
        rawText: pdfDataStore.rawText,
        fileName: pdfDataStore.fileName,
        uploadTime: pdfDataStore.uploadTime
      };
    }
    
    // Call the FastAPI backend to generate the schedule
    console.log("Sending request to FastAPI backend");
    const response = await fetch("http://0.0.0.0:8000/schedule/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      console.error(`FastAPI responded with status: ${response.status}`);
      throw new Error(`Failed to generate schedule: ${response.status}`);
    }
    
    // Parse and return the response from FastAPI
    const data = await response.json();
    console.log("Received schedule from FastAPI backend");
    
    return res.json(data);
  } catch (error) {
    console.error("Error generating schedule:", error);
    return res.status(500).json({ 
      error: "Failed to generate schedule: " + error.message,
      status: "error" 
    });
  }
});

export default router;