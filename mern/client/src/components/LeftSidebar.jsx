import React, { useState, useRef } from "react";
import {
  Calendar,
  BookOpen,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  File,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useSchedule } from "../context/ScheduleContext";
import { processPdfWithAI, formatExtractedCourses } from "../utils/pdfProcessor";

const LeftSidebar = ({ setCurrentPage, currentPage }) => {
  const { addCoursesFromPdf } = useSchedule();
  const [collapsed, setCollapsed] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null); // null, 'uploading', 'success', 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const toggleSidebar = () => setCollapsed(!collapsed);

  const menuItems = [
    { id: "planner", icon: <Calendar size={20} />, label: "4-Year Planner" },
    { id: "storage", icon: <BookOpen size={20} />, label: "Course Storage" },
    { id: "quarter", icon: <ZoomIn size={20} />, label: "Quarter View" },
  ];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    setUploadStatus(null);
    setUploadProgress(0);

    if (!selectedFile) {
      setFile(null);
      setFileName("");
      return;
    }

    // For debugging purposes: log the file details
    console.log("Selected file:", {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size
    });
    
    // In development mode, accept any file type for testing
    // In production, you'd want to be strict about PDF files only
    if (false && selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith('.pdf')) {
      console.error("Invalid file type:", selectedFile.type);
      setUploadStatus("error");
      setFile(null);
      setFileName("");
      return;
    }

    // Set file information
    setFile(selectedFile);
    setFileName(selectedFile.name);

    // Start processing with dummy data
    processUploadedPdf();
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const processUploadedPdf = async () => {
    setUploadStatus("uploading");
    setUploadProgress(0);
    
    // Start a progress animation for user feedback
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 5, 90)); // Only go to 90% for AI processing
    }, 200);
    
    try {
      console.log("Starting PDF processing for file:", file?.name);
      
      // Send the PDF to the AI processor
      const extractedData = await processPdfWithAI(file);
      console.log("Extracted data from PDF:", extractedData);
      
      if (!extractedData || !Array.isArray(extractedData)) {
        throw new Error("Invalid data format returned from PDF processor");
      }
      
      // Format the extracted course data
      const formattedCourses = formatExtractedCourses(extractedData);
      console.log("Formatted courses:", formattedCourses);
      
      // Update the schedule with courses from PDF
      addCoursesFromPdf(formattedCourses);
      
      // Complete the progress bar
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("success");
    } catch (error) {
      console.error("Error processing PDF:", error);
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadStatus("error");
      
      // Show browser alert for debugging
      alert(`PDF processing error: ${error.message}`);
    }
  };
  
  // For development/testing, include a mock function
  const simulateUpload = () => {
    // If we have a real file, use the actual processor
    if (file) {
      processUploadedPdf();
      return;
    }
    
    // Otherwise use mock data
    setUploadStatus("uploading");
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus("success");
          
          // Use mock data for testing
          const mockExtractedCourses = [
            { 
              course_id: "CS101", 
              course_name: "Introduction to Programming", 
              credits: 4,
              completed: true
            },
            { 
              course_id: "MATH101", 
              course_name: "Calculus I", 
              credits: 4,
              completed: true
            }
          ];
          
          // Update the schedule with courses from PDF
          addCoursesFromPdf(mockExtractedCourses);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div
      className={`flex flex-col bg-white border-r shadow-sm h-full transition-all duration-300 ${
        collapsed ? "w-16" : "w-48"
      }`}
    >
      <div className="flex items-center justify-between p-2 border-b">
        {!collapsed && (
          <span className="font-semibold text-gray-700">Navigate</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-gray-200 rounded transition"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1">
        {menuItems.map((item) => {
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex items-center w-full px-3 py-2 transition font-medium rounded-r-md
                ${
                  isActive
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-700"
                }
                hover:bg-gray-100`}
            >
              {item.icon}
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        onChange={handleFileChange}
      />

      {/* PDF Upload Button */}
      <div className="border-t">
        <div className="p-2">
          <button
            onClick={triggerFileInput}
            className={`flex items-center w-full px-3 py-2 transition font-medium rounded
              ${
                uploadStatus === "success"
                  ? "bg-green-100 text-green-700"
                  : uploadStatus === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            disabled={uploadStatus === "uploading"}
          >
            {uploadStatus === "uploading" ? (
              <div className="flex items-center justify-center w-full">
                <Upload size={20} className="animate-pulse" />
                {!collapsed && (
                  <div className="ml-3 w-full">
                    <div className="text-xs mb-1 flex justify-between">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-1"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : uploadStatus === "success" ? (
              <>
                <CheckCircle size={20} />
                {!collapsed && (
                  <span className="ml-3 truncate">PDF Uploaded</span>
                )}
              </>
            ) : uploadStatus === "error" ? (
              <>
                <AlertCircle size={20} />
                {!collapsed && <span className="ml-3">Invalid File</span>}
              </>
            ) : (
              <>
                <File size={20} />
                {!collapsed && <span className="ml-3">Upload PDF</span>}
              </>
            )}
          </button>

          {!collapsed && file && uploadStatus !== "error" && (
            <div
              className="px-3 py-1 text-xs text-gray-500 truncate"
              title={fileName}
            >
              {fileName.length > 20
                ? fileName.substring(0, 17) + "..."
                : fileName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
