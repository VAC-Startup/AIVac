
import fs from "fs";
import path from "path";

// Load and parse course data JSON
const courseDataPath = path.resolve("./controllers/v3.json");

let allCourses = [];
try {
  allCourses = JSON.parse(fs.readFileSync(courseDataPath, "utf-8"));
  console.log(`📚 Loaded ${allCourses.length} courses from JSON`);
} catch (err) {
  console.error("❌ Failed to load course data:", err);
}

function normalizeCourseID(query) {
  return query.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function searchCourses(query) {
  const normalized = normalizeCourseID(query); // e.g., "dsc10"
  const hasDigits = /\d/.test(normalized);
  console.log(`🔎 Normalized query: '${normalized}' (hasDigits: ${hasDigits})`);

  if (!normalized) {
    console.warn("⚠️ Empty or invalid normalized query");
    return [];
  }

  if (!hasDigits) {
    // Prefix match
    const prefixMatches = allCourses.filter(course =>
      course.normalized_course_id?.toLowerCase().startsWith(normalized)
    );
    console.log(`📌 Found ${prefixMatches.length} prefix matches for '${normalized}'`);
    return prefixMatches;
  }

  // Exact match
  const exactMatch = allCourses.find(
    course => course.normalized_course_id?.toLowerCase() === normalized
  );
  if (exactMatch) {
    console.log(`✅ Exact match found for '${normalized}'`);
    return [exactMatch];
  } else {
    console.log(`❌ No exact match found for '${normalized}'`);
    return [];
  }
}
