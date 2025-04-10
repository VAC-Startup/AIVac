import React, { useState, useEffect } from "react";
import CoursePlanner from "./CoursePlanner";
import { useSchedule } from "../../context/ScheduleContext";

// Helper function to convert schedule format
const convertBackendScheduleToAppFormat = (backendSchedule) => {
  // Create an empty schedule structure with at least one slot per term
  const appSchedule = Array(4).fill().map(() => ({
    fall: [null],
    winter: [null],
    spring: [null]
  }));
  
  // Map from backend term codes to app's format
  const termMapping = {
    'FA': 'fall',
    'WI': 'winter',
    'SP': 'spring'
  };
  
  // Process each term in the backend schedule
  Object.entries(backendSchedule).forEach(([termCode, courses]) => {
    // Extract year and term from the term code (e.g., 'FA25')
    const termPrefix = termCode.substring(0, 2);
    const term = termMapping[termPrefix];
    let yearNum = parseInt(termCode.substring(2));
    
    // Map academic years
    let year = yearNum - 24;
    
    // Adjust winter and spring quarters to be in the same academic year as their preceding fall
    if (termPrefix === 'WI' || termPrefix === 'SP') {
      year = year - 1;
    }
    
    console.log(`Processing term ${termCode}: mapped to year=${year}, term=${term}`);
    
    if (year >= 0 && year < 4 && term) {
      // Add each course to the appropriate term
      courses.forEach((courseItem, index) => {
        // Handle both string and object formats
        let course;
        
        if (typeof courseItem === 'string') {
          // Simple course object with minimal required fields
          course = {
            course_id: courseItem,
            course_name: courseItem, // Could be enhanced with a lookup for full names
            credits: 4 // Default credits value
          };
        } else {
          // Handle object format with completed flag
          course = {
            course_id: courseItem.course_id,
            course_name: courseItem.course_id, // Use ID as name if not provided
            credits: courseItem.credits || 4,
            completed: courseItem.completed === true // Make sure completed is a boolean
          };
        }
        
        // For each term, replace the initial null with courses
        // or add courses to the end of the array
        if (index === 0 && appSchedule[year][term][0] === null) {
          // Replace the initial null placeholder
          appSchedule[year][term][0] = course;
        } else {
          // Either add to an existing slot or expand the array
          if (index < appSchedule[year][term].length) {
            appSchedule[year][term][index] = course;
          } else {
            appSchedule[year][term].push(course);
          }
        }
      });
    }
  });
  
  return appSchedule;
};

const CoursePlannerContainer = () => {
  // Get schedule from context
  const { 
    schedule, 
    addCourse, 
    removeCourse, 
    moveCourse,
    updateSchedule
  } = useSchedule();

  const [yearLabels] = useState([
    "2024-2025",
    "2025-2026",
    "2026-2027",
    "2027-2028",
  ]);

  const [collapsedYears, setCollapsedYears] = useState(Array(4).fill(false));
  const [previewState, setPreviewState] = useState(null);
  const [dragTarget, setDragTarget] = useState({
    yearIndex: null,
    term: null,
    courseIndex: null,
  });
  const [invalidDrop, setInvalidDrop] = useState(false);

  const toggleYearCollapse = (yearIndex) => {
    const newState = [...collapsedYears];
    newState[yearIndex] = !newState[yearIndex];
    setCollapsedYears(newState);
  };

  const calculateTermUnits = (courses) => {
    return courses.reduce(
      (total, course) => total + (course ? course.credits : 0),
      0
    );
  };

  const calculateAnnualUnits = (yearIndex) => {
    const year = schedule[yearIndex];
    return (
      calculateTermUnits(year.fall) +
      calculateTermUnits(year.winter) +
      calculateTermUnits(year.spring)
    );
  };

  const handleDragStart = (
    e,
    course,
    isFromSidebar = false,
    yearIndex = null,
    term = null,
    courseIndex = null
  ) => {
    e.dataTransfer.setData("course", JSON.stringify(course));
    e.dataTransfer.setData("isFromSidebar", isFromSidebar.toString());

    if (!isFromSidebar) {
      e.dataTransfer.setData("sourceYearIndex", yearIndex.toString());
      e.dataTransfer.setData("sourceTerm", term);
      e.dataTransfer.setData("sourceCourseIndex", courseIndex.toString());
    }
  };

  const handleDragOver = (e, yearIndex, term, courseIndex) => {
    e.preventDefault();
    setDragTarget({ yearIndex, term, courseIndex });
  };

  const handleDrop = (e, yearIndex, term, courseIndex) => {
    e.preventDefault();

    const courseData = e.dataTransfer.getData("course");
    const isFromSidebar = e.dataTransfer.getData("isFromSidebar") === "true";

    if (!courseData) return;

    const course = JSON.parse(courseData);
    const newSchedule = [...schedule];
    const targetYear = newSchedule[yearIndex];
    if (!targetYear || !targetYear[term]) return; // ✅ defensive check

    const targetSlot = targetYear[term];
    const existingCourse = targetSlot[courseIndex];

    if (!isFromSidebar) {
      const sourceYearIndex = parseInt(
        e.dataTransfer.getData("sourceYearIndex")
      );
      const sourceTerm = e.dataTransfer.getData("sourceTerm");
      const sourceCourseIndex = parseInt(
        e.dataTransfer.getData("sourceCourseIndex")
      );
      console.log("Swap attempt:", {
        sourceYearIndex,
        sourceTerm,
        sourceCourseIndex,
        targetYearIndex: yearIndex,
        targetTerm: term,
        targetCourseIndex: courseIndex,
      });

      if (
        sourceYearIndex === yearIndex &&
        sourceTerm === term &&
        sourceCourseIndex === courseIndex
      )
        return;

      // Using the context's moveCourse function
      if (existingCourse) {
        // If target has a course, swap them
        const tempCourse = existingCourse;
        addCourse(yearIndex, term, courseIndex, course);
        addCourse(sourceYearIndex, sourceTerm, sourceCourseIndex, tempCourse);
      } else {
        // If target is empty, just move the course
        addCourse(yearIndex, term, courseIndex, course);
        removeCourse(sourceYearIndex, sourceTerm, sourceCourseIndex);
      }
    } else {
      // Add a new course from the sidebar
      addCourse(yearIndex, term, courseIndex, course);
    }

    // Ensure one empty slot remains
    if (!newSchedule[yearIndex][term].some(c => c === null)) {
      const updatedTerm = [...newSchedule[yearIndex][term]];
      updatedTerm.push(null);
      
      const updatedYear = {...newSchedule[yearIndex]};
      updatedYear[term] = updatedTerm;
      
      const updatedSchedule = [...newSchedule];
      updatedSchedule[yearIndex] = updatedYear;
      
      updateSchedule(updatedSchedule);
    }

    setPreviewState(null);
  };

  const handleDragEnd = () => {
    setPreviewState(null);
    setInvalidDrop(false);
    setDragTarget({ yearIndex: null, term: null, courseIndex: null });
  };

  const handleRemoveCourse = (yearIndex, term, courseIndex) => {
    // Remove course using context function
    removeCourse(yearIndex, term, courseIndex);
    
    // Get updated schedule for trimming logic
    const newSchedule = [...schedule];
    const termCourses = newSchedule[yearIndex][term];
    
    // Count nulls
    const nullCount = termCourses.filter((c) => c === null).length;

    // Trim excess nulls if more than 1 null and total > 3 slots
    if (termCourses.length > 3 && nullCount > 1) {
      const trimmed = termCourses.filter((c) => c !== null); // keep non-null courses

      // Ensure 3 slots minimum + 1 empty
      while (trimmed.length < 2) trimmed.push(null);
      trimmed.push(null); // one empty slot

      // Update entire schedule with trimmed term
      const updatedYear = {...newSchedule[yearIndex]};
      updatedYear[term] = trimmed;
      
      const updatedSchedule = [...newSchedule];
      updatedSchedule[yearIndex] = updatedYear;
      
      updateSchedule(updatedSchedule);
    }
  };

  const getSlotClassName = (yearIndex, term, courseIndex) => {
    let className = "border rounded mb-2 p-2 ";

    // Check if this is the current drag target
    if (
      dragTarget.yearIndex === yearIndex &&
      dragTarget.term === term &&
      dragTarget.courseIndex === courseIndex
    ) {
      // If invalid drop, show red highlight
      if (invalidDrop) {
        className += "border-red-500 border-2 bg-red-50 ";
      } else {
        className += "border-blue-500 border-2 bg-blue-50 ";
      }
    }

    // Check if this is the destination in a preview
    if (
      previewState &&
      previewState.targetYearIndex === yearIndex &&
      previewState.targetTerm === term &&
      previewState.targetCourseIndex === courseIndex
    ) {
      className += "border-yellow-400 border-2 bg-yellow-50 ";
    }

    return className;
  };

  const generateSchedule = async () => {
    try {
      // Show loading indicator
      setIsLoading(true);
      
      // Make a direct request to the dedicated schedule generation endpoint
      const response = await fetch("http://localhost:5050/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          major: "Data Science", // Could be dynamic based on user selection
          preferences: {
            maxUnitsPerTerm: 16,
            preferredDays: ["Mon", "Wed", "Fri"]
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Schedule generation response:", data);
      
      // Check if the response contains a schedule
      if (data.schedule) {
        console.log("Schedule found, processing:", data.schedule);
        
        // Convert the schedule format
        const convertedSchedule = convertBackendScheduleToAppFormat(data.schedule);
        console.log("Converted schedule:", convertedSchedule);
        
        // Update the schedule
        updateSchedule(convertedSchedule);
      } else {
        console.error("No schedule data received from the server");
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div>
      <div className="flex justify-between items-center p-3 bg-gray-100 rounded-md mb-4">
        <h2 className="text-lg font-semibold">Course Planner</h2>
        <button 
          className={`px-4 py-2 rounded ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          onClick={generateSchedule}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </div>

      <CoursePlanner
        schedule={schedule}
        yearLabels={yearLabels}
        collapsedYears={collapsedYears}
        toggleYearCollapse={toggleYearCollapse}
        calculateAnnualUnits={calculateAnnualUnits}
        calculateTermUnits={calculateTermUnits}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleRemoveCourse={handleRemoveCourse}
        previewState={previewState}
        dragTarget={dragTarget}
        invalidDrop={invalidDrop}
        getSlotClassName={getSlotClassName}
      />
    </div>
  );
};

export default CoursePlannerContainer;
