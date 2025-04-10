import { createContext, useContext, useState } from 'react';

// Initialize with empty schedule structure (at least one slot per term)
const initialSchedule = Array(4).fill().map(() => ({
  fall: [null],
  winter: [null],
  spring: [null]
}));

const ScheduleContext = createContext();

export const useSchedule = () => useContext(ScheduleContext);

export const ScheduleProvider = ({ children }) => {
  const [schedule, setSchedule] = useState(initialSchedule);
  
  // Update entire schedule (used by PDF upload or AI recommendations)
  const updateSchedule = (newSchedule) => {
    setSchedule(newSchedule);
  };
  
  // Add a course to a specific slot
  const addCourse = (year, term, index, course) => {
    const newSchedule = [...schedule];
    newSchedule[year][term][index] = course;
    setSchedule(newSchedule);
  };
  
  // Remove a course from a specific slot
  const removeCourse = (year, term, index) => {
    const newSchedule = [...schedule];
    newSchedule[year][term][index] = null;
    setSchedule(newSchedule);
  };
  
  // Move a course from one slot to another
  const moveCourse = (fromYear, fromTerm, fromIndex, toYear, toTerm, toIndex) => {
    const newSchedule = [...schedule];
    const course = newSchedule[fromYear][fromTerm][fromIndex];
    newSchedule[fromYear][fromTerm][fromIndex] = null;
    newSchedule[toYear][toTerm][toIndex] = course;
    setSchedule(newSchedule);
  };
  
  // Add courses from PDF upload (courses already taken)
  const addCoursesFromPdf = (courses) => {
    if (!courses || courses.length === 0) return;
    
    console.log("Adding courses from PDF:", courses);
    
    // Create a new schedule based on the current one
    const newSchedule = [...schedule];
    
    // Create a dedicated "Completed Courses" section in Year 0, Term 0 (Fall of first year)
    // We'll add the completed courses at the top of the schedule
    
    // Create an empty slot if needed
    if (!newSchedule[0].fall) {
      newSchedule[0].fall = [];
    }
    
    // Get existing courses from the slot
    const existingCourses = newSchedule[0].fall.filter(course => course !== null);
    
    // Combine with new completed courses
    const allCourses = [
      ...courses,
      ...existingCourses
    ];
    
    // Update the fall term of year 0 with all courses
    newSchedule[0].fall = allCourses;
    
    // Ensure there's at least one empty slot for new courses
    if (!newSchedule[0].fall.some(course => course === null)) {
      newSchedule[0].fall.push(null);
    }
    
    // Update the schedule
    setSchedule(newSchedule);
  };
  
  // Update schedule based on AI recommendations
  const updateFromAI = (aiSchedule) => {
    // This would take the AI's recommended schedule and merge it with existing schedule
    if (aiSchedule) {
      console.log("Updating schedule from AI recommendations");
      setSchedule(aiSchedule);
    }
  };

  return (
    <ScheduleContext.Provider 
      value={{ 
        schedule, 
        updateSchedule,
        addCourse, 
        removeCourse, 
        moveCourse,
        addCoursesFromPdf,
        updateFromAI
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};