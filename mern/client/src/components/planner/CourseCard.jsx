import React from "react";

const CourseCard = ({
  course,
  onRemove,
  onDragStart,
  onDragEnd,
  isPreviewing = false,
}) => {
  if (!course) return null;

  const isCompleted = course.completed === true;

  return (
    <div
      className={`flex justify-between items-center cursor-move ${
        isCompleted ? "bg-green-50" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center">
        {isCompleted && (
          <span className="text-green-500 mr-1">✓</span>
        )}
        <span>
          {course.course_id}
          {isPreviewing && (
            <span className="ml-2 text-yellow-600 text-xs">(Moving)</span>
          )}
        </span>
        {isCompleted && (
          <span className="ml-2 text-green-600 text-xs">(Completed)</span>
        )}
      </div>
      <div className="flex items-center">
        <span className={`${
          isCompleted 
            ? "bg-green-200 text-green-700" 
            : "bg-gray-300 text-gray-700"
          } rounded-full px-2 py-1 text-xs mr-2`}
        >
          {course.credits.toFixed(1)}
        </span>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-xs"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
