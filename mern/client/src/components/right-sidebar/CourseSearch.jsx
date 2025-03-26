import React from "react";
import CourseItem from "./CourseItem";

const CourseSearch = ({
  searchTerm,
  setSearchTerm,
  searchResults,
  handleKeyDown,
  handleDragStart,
  handleDragEnd,
  isCourseLoading
}) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Course Search</h2>
      <input
        type="text"
        placeholder="Search courses..."
        className="w-full p-2 mb-4 border border-gray-300 rounded"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isCourseLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {searchResults.map((course) => (
            <CourseItem
              key={course.id}
              course={course}
              onDragStart={(e) => handleDragStart(e, course, true)}
              onDragEnd={handleDragEnd}
            />
          ))}
      </div>
      )}
    </div>
  );
};

export default CourseSearch;
