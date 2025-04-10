import React, { useState, useRef, useEffect } from "react";
import CourseSearch from "./CourseSearch";
import CourseAssistant from "./CourseAssistant";
import CourseItem from "./CourseItem";
import CourseDetails from "./CourseDetails";
import { debounce } from "lodash";
import { useSchedule } from "../../context/ScheduleContext";

const RightSidebar = () => {
  const { updateFromAI } = useSchedule();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [currentMessage, setCurrentMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSectionHeight, setSearchSectionHeight] = useState(50);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const chatEndRef = useRef(null);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsCourseLoading(true);
      console.log("🎯 Sending query:", query);

      const response = await fetch("http://localhost:5050/search-courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      console.log("📡 Raw response:", response);

      if (!response.ok) {
        const errorText = await response.text(); // grab server error content
        console.error(
          "❌ Server responded with error:",
          response.status,
          errorText
        );
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Results from backend:", data.results);
      setSearchResults(
        data.results.map((course) => ({
          ...course,
          credits: isNaN(Number(course.credits)) ? 0 : Number(course.credits),
        }))
      );
    } catch (error) {
      console.error("❌ Search error:", error);
    } finally {
      setIsCourseLoading(false);
    }
  };
  const debouncedSearch = debounce(handleSearch, 500);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleDragStart = (e, course) => {
    e.dataTransfer.setData("course", JSON.stringify(course));
    e.dataTransfer.setData("isFromSidebar", "true");
  };

  const handleDragEnd = () => {};
  
  // Convert the backend schedule format to our application format
  const convertBackendScheduleToAppFormat = (backendSchedule) => {
    // Create an empty schedule structure with at least one slot per term
    const appSchedule = Array(4).fill().map(() => ({
      fall: [null],
      winter: [null],
      spring: [null]
    }));
    
    // Map from backend term codes to our app's format
    const termMapping = {
      'FA': 'fall',
      'WI': 'winter',
      'SP': 'spring'
    };
    
    // Debug the full input
    console.log("Processing full schedule:", backendSchedule);
    
    // Process each term in the backend schedule
    Object.entries(backendSchedule).forEach(([termCode, courses]) => {
      // Extract year and term from the term code (e.g., 'FA25')
      const termPrefix = termCode.substring(0, 2);
      const term = termMapping[termPrefix];
      let yearNum = parseInt(termCode.substring(2));
      
      // Map academic years to our app's 0-3 index
      // For Fall 2024, this gives year 0
      // For Fall 2025, this gives year 1 
      let year = yearNum - 24;
      
      // Adjust winter and spring quarters to be in the same academic year as their preceding fall
      // This places Winter 2025 and Spring 2025 with Fall 2024 in year 0
      if (termPrefix === 'WI' || termPrefix === 'SP') {
        year = year - 1;
      }
      
      console.log(`Processing term ${termCode}: mapped to year=${year}, term=${term}, courses=`, courses);
      
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
            
            console.log(`Created course object for ${courseItem.course_id}:`, course);
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
    
    console.log("Final converted schedule:", JSON.stringify(appSchedule, null, 2));
    return appSchedule;
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = { role: "user", content: currentMessage };
    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5050/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentMessage,
          thread_id: "default-thread",
        }),
      });

      const data = await response.json();
      console.log("AI response data:", JSON.stringify(data, null, 2));
      
      let content = "";
      let hasSchedule = false;
      let schedule = null;
      
      // Handle different response formats based on message type
      if (data.messages && Array.isArray(data.messages)) {
        // Format for "schedule" command - contains messages array
        const aiMessage = data.messages.filter(msg => msg.type === "ai").pop();
        console.log("Schedule format AI message:", JSON.stringify(aiMessage, null, 2));
        
        if (aiMessage) {
          content = aiMessage.content;
          hasSchedule = !!aiMessage.schedule;
          schedule = aiMessage.schedule;
        }
      } else {
        // Format for regular chat - direct response object
        console.log("Regular chat response:", data);
        content = data;
      }
      
      if (hasSchedule && schedule) {
        console.log("Schedule found in AI response:", schedule);
        
        // Convert the schedule format from the backend to our app's format
        const convertedSchedule = convertBackendScheduleToAppFormat(schedule);
        
        // Update the schedule in our context
        updateFromAI(convertedSchedule);
      }
      
      const assistantMessage = {
        role: "assistant",
        content: content || "No response",
        hasSchedule: hasSchedule
      };
      
      setChatMessages((prev) => [
        ...prev,
        assistantMessage
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="relative bg-white shadow"
      style={{ width: `${rightSidebarWidth}px` }}
    >
      {/* Resize handle on the left side -- Divider between planner and Right Side Bar */}
      <div
        className="absolute top-0 left-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-ew-resize z-10"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = rightSidebarWidth;

          const handleMouseMove = (moveEvent) => {
            const deltaX = startX - moveEvent.clientX;
            const newWidth = Math.max(250, Math.min(500, startWidth + deltaX));
            setRightSidebarWidth(newWidth);
          };

          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            setIsResizing(false);
          };

          setIsResizing(true);
          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mouseup", handleMouseUp);
        }}
      ></div>

      <div className="flex flex-col h-full min-h-0">
        {/* Course search area */}
        <div
          style={{ height: `${searchSectionHeight}%` }}
          className="flex-shrink-0"
        >
          <div className="h-full overflow-y-auto">
            {selectedCourse ? (
              <CourseDetails
                course={selectedCourse}
                onBack={() => setSelectedCourse(null)}
              />
            ) : (
              <CourseSearch
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                setSearchResults={setSearchResults}
                searchResults={searchResults}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                isCourseLoading={isCourseLoading}
                debouncedSearch={debouncedSearch}
                onCourseDoubleClick={(course) => setSelectedCourse(course)}
              />
            )}
          </div>
        </div>

        {/* Divider between search and chat */}
        <div
          className="bg-gray-300 h-1 cursor-ns-resize"
          onMouseDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = searchSectionHeight;

            const handleMouseMove = (moveEvent) => {
              const deltaY = moveEvent.clientY - startY;
              const containerHeight = e.target.parentElement.offsetHeight;
              const newHeightPercent = Math.max(
                20,
                Math.min(80, startHeight + (deltaY / containerHeight) * 100)
              );
              setSearchSectionHeight(newHeightPercent);
            };

            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
        />

        {/* Course assistant chat area */}
        <div className="flex flex-col flex-grow overflow-hidden">
          <CourseAssistant
            chatMessages={chatMessages}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            isLoading={isLoading}
            sendMessage={sendMessage}
            chatEndRef={chatEndRef}
            onKeyPress={handleKeyPress}
          />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
