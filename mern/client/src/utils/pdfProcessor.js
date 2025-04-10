// PDF processing utility using AI to extract course information

// Function to process PDF and send to server
export const processPdfWithAI = async (pdfFile) => {
  try {
    console.log("PDF received for processing:", pdfFile?.name || "Unknown file");
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Send the PDF to the backend endpoint
    console.log("Sending PDF to server...");
    const response = await fetch('http://localhost:5050/process-pdf', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    console.log("Server response:", data);
    
    if (!data.courses || !Array.isArray(data.courses)) {
      console.error("Invalid response format, expected courses array");
      throw new Error("Invalid server response format");
    }
    
    return data.courses;
    
    /* When you're ready to connect to the real backend, uncomment this code:
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Send the PDF to your backend endpoint
    const response = await fetch('http://localhost:5050/process-pdf', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    return data.courses;
    */
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
};

// Format the extracted courses into the expected structure
export const formatExtractedCourses = (extractedData) => {
  return extractedData.map(course => ({
    course_id: course.courseId || course.course_id,
    course_name: course.courseName || course.course_name || course.name || course.course_id,
    credits: parseInt(course.credits || course.units || '4'),
    completed: true, // Mark as completed since these are from transcript
    // Optional fields if available
    description: course.description || '',
    prerequisites: course.prerequisites || '',
    offerings: course.offerings || []
  }));
};