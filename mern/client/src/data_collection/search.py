# smart_course_search.py

import os
import openai
import pinecone
import numpy as np
import re
from pinecone import Pinecone, ServerlessSpec
from rapidfuzz.fuzz import ratio
from dotenv import load_dotenv

# Load your environment variables
load_dotenv(override = True)

# Set up API keys from .env
openai.api_key = os.getenv("OPENAI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_env = os.getenv("PINECONE_ENV")
index_name = os.getenv("PINECONE_INDEX")

# Initialize Pinecone
#pinecone.init(api_key=pinecone_api_key, environment=pinecone_env)
#pinecone.init(api_key=pinecone_api_key)
pc = Pinecone(
        api_key=os.environ.get("PINECONE_API_KEY")
    )
index = pc.Index(index_name)

#embedding function 
def get_embedding(text):
    response = openai.embeddings.create(
        input=[text],
        model='text-embedding-3-small'
    )
    return list(np.array(response.data[0].embedding))

def enrich_query_text(query):
    return f"Find information about course {query} and related courses in its sequence or track."

# def rerank_by_course_id(results, query):
#     query = query.lower().replace(" ", "")
    
#     def score(course):
#         course_id = course["course_id"].lower().replace(" ", "")
#         if course_id == query:
#             return 100  # Exact match = max priority
#         elif query in course_id:
#             return 80   # Partial match (e.g., "dsc" in "dsc10")
#         return 0       # Otherwise fallback to original score

#     return sorted(results, key=score, reverse=True)



def rerank_by_course_id(results, query):
    query = query.lower()
    query = re.sub(r"[^a-z0-9]", "", query)
    
    def score(course):
        course_id = course["course_id"].lower()
        base_score = 0
        if course_id == query:
            base_score = 100
        elif query in course_id:
            base_score = 80
        else:
            fuzzy = ratio(query, course_id)
            base_score = fuzzy  # use fuzzy ratio (0-100)

        return base_score

    return sorted(results, key=score, reverse=True)

# Search function
def search_courses(query: str, top_k: int = 10, raw_k: int = 25):
    # Step 1: Embed the query
    try:
        # response = openai.Embedding.create(
        #     input=query,
        #     model="text-embedding-3-small"
        # )
        # query_embedding = response["data"][0]["embedding"]
        query_embedding = get_embedding(enrich_query_text(query))
    except Exception as e:
        print("Error embedding query:", e)
        return []

    # Step 2: Query Pinecone with the vector
    try:
        result = index.query(
            vector=query_embedding,
            top_k=raw_k,
            include_metadata=True
        )
    except Exception as e:
        print("Error querying Pinecone:", e)
        return []

    # Step 3: Return top course matches
    matches = [{"id": match["id"], **match["metadata"]} for match in result.get("matches", [])]
    ranked = rerank_by_course_id(matches, query)
    return ranked[:top_k]

# Example usage
if __name__ == "__main__":
    query = input("Search for a course: ")
    results = search_courses(query)
    results = rerank_by_course_id(results, query)

    if not results:
        print("No matches found.")
    else:
        for i, course in enumerate(results):
            print(f"\nResult {i+1}:")
            print(f"ID: {course['id']}")
            print(f"Name: {course['course_name']}")
            print(f"Description: {course['description']}")
            print(f"Credits: {course['credits']}")
            print(f"Prereqs: {course.get('prerequisites', 'None')}")
            print(f"Professors: {course['professors']}")
