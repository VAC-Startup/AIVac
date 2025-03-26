import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index(process.env.PINECONE_INDEX);

function normalizeCourseID(query) {
  const noSpecial = query.replace(/[^a-zA-Z0-9]/g, "");
  const parts = noSpecial.match(/[a-zA-Z]+|\d+/g);
  if (parts?.length >= 2) {
    return `${parts[0].toUpperCase()} ${parts.slice(1).join("")}`;
  }
  return query.toUpperCase();
}

function tokenize(text) {
  return text.toLowerCase().match(/[a-zA-Z]+|\d+/g) || [];
}

export async function searchCourses(query) {
  // Step 1: Use OpenAI to enrich query
  const prompt = `
You are a helpful assistant that interprets and corrects fuzzy or informal course queries.

Your task is to normalize a user's course search into a clean course ID (e.g., 'DSC 10'), optionally followed by a short course name.

Be smart about typos and shorthand:
- "ds10", "datasci 10", "dsc1000", or "d s c 10" → "DSC 10"
- "math 181a", "mathematics 181A" → "MATH 181A"
- "data vis" → "DSC 106: Data Visualization"

Always return a clean course string the user most likely meant.

Query: ${query}`;

  const enriched = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "system", content: prompt }],
    temperature: 0.2,
  });

  const enrichedQuery = enriched.choices[0].message.content.trim();
  console.log("🧠 Enriched query:", enrichedQuery);

  // Step 2: Get embedding
  const embeddingResponse = await openai.embeddings.create({
    input: enrichedQuery,
    model: "text-embedding-3-small",
  });

  const vector = embeddingResponse.data[0].embedding;

  // Step 3: Query Pinecone
  const result = await index.query({
    vector,
    topK: 300,
    includeMetadata: true,
  });

  const matches = result.matches.map(match => ({
    id: match.id,
    ...match.metadata,
  }));

  // Step 4: Re-rank by keyword match
  const normalizedID = normalizeCourseID(query);
  const queryTokens = tokenize(query);

  const scored = matches.map(course => {
    let score = 0;
    const text = course.text?.toLowerCase() || "";
    const courseId = course.course_id?.toLowerCase() || "";

    if (courseId === normalizedID.toLowerCase()) score += 2000;
    else if (courseId.includes(normalizedID.toLowerCase())) score += 200;

    queryTokens.forEach(token => {
      score += (text.match(new RegExp(token, "g")) || []).length * 10;
    });

    return {
      id: course.course_id || course.id,
      name: course.course_name,
      units: course.credits || 4.0,
      department: (course.course_id || "").split(" ")[0],
      prerequisites: course.prerequisites || [],
      offeredIn: course.offeredIn || ["fall", "winter", "spring"],
      score,
    };
  });

  const topResults = scored.sort((a, b) => b.score - a.score).slice(0, 10);
  return topResults;
}
