import express from "express";
import fetch from "node-fetch";
import { pdfDataStore } from "./pdf-simple.js";

const router = express.Router();

// Proxy endpoint for chat
router.post("/", async (req, res) => {
  try {
    // Create an enhanced request that includes PDF data if available
    const enhancedRequest = { ...req.body };
    
    // Check if we have PDF data to include
    if (pdfDataStore.extractedCourses && pdfDataStore.rawText) {
      console.log("Including PDF data in chat request");
      enhancedRequest.pdfData = {
        extractedCourses: pdfDataStore.extractedCourses,
        rawText: pdfDataStore.rawText,
        fileName: pdfDataStore.fileName,
        uploadTime: pdfDataStore.uploadTime
      };
    }
    
    // Special cases for transcript-related commands
    const msg = req.body.message ? req.body.message.toLowerCase().trim() : "";
    
    // Transcript status command
    if (["transcript", "debug", "status", "pdf status"].includes(msg)) {
      // Log the current PDF data store state
      console.log("Current PDF data store state:", {
        hasExtractedCourses: !!pdfDataStore.extractedCourses,
        hasRawText: !!pdfDataStore.rawText,
        fileName: pdfDataStore.fileName,
        uploadTime: pdfDataStore.uploadTime,
        courseCount: pdfDataStore.extractedCourses ? pdfDataStore.extractedCourses.length : 0
      });
      
      if (pdfDataStore.extractedCourses && pdfDataStore.extractedCourses.length > 0) {
        return res.json({
          messages: [{
            type: "ai",
            content: `Here's what I found in your transcript (${pdfDataStore.fileName || "unnamed file"}):\n\n${pdfDataStore.rawText || "No raw text available"}\n\n${pdfDataStore.extractedCourses.length} courses found.\nUploaded at: ${pdfDataStore.uploadTime || "unknown time"}`,
            courses: pdfDataStore.extractedCourses
          }]
        });
      } else {
        return res.json({
          messages: [{
            type: "ai",
            content: "I don't see any transcript data. Please upload a PDF transcript first, then try asking about your courses. PDF Status: " +
              JSON.stringify({
                hasExtractedCourses: !!pdfDataStore.extractedCourses,
                hasRawText: !!pdfDataStore.rawText,
                fileName: pdfDataStore.fileName,
                uploadTime: pdfDataStore.uploadTime
              })
          }]
        });
      }
    }
    
    // My courses command
    else if (["courses", "my courses", "show courses", "show my courses"].includes(msg)) {
      if (pdfDataStore.extractedCourses && pdfDataStore.extractedCourses.length > 0) {
        const courseList = pdfDataStore.extractedCourses.map(course => 
          `- ${course.course_id}: ${course.course_name} (${course.credits} credits)`
        ).join('\n');
        
        return res.json({
          messages: [{
            type: "ai",
            content: `Here are the courses from your transcript:\n\n${courseList}`
          }]
        });
      } else {
        return res.json({
          messages: [{
            type: "ai",
            content: "You haven't uploaded a transcript yet, or no courses were found in it. Please upload a PDF transcript first."
          }]
        });
      }
    }
    
    // Forward the enhanced request to the Python backend
    const response = await fetch("http://0.0.0.0:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enhancedRequest),
    });

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", data);

    res.json(data);
  } catch (error) {
    console.error("Error proxying chat request:", error);
    res.status(500).json({ error: "Failed to process chat request" });
  }
});

export default router;
