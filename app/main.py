from agent import graph
from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import json



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PDFCourse(BaseModel):
    course_id: str
    course_name: str
    credits: int
    completed: bool = True


class PDFData(BaseModel):
    extractedCourses: List[Dict[str, Any]]
    rawText: str
    fileName: str
    uploadTime: str


class ChatRequest(BaseModel):
    message: str
    thread_id: str
    pdfData: Optional[PDFData] = None
    
class SchedulePreferences(BaseModel):
    major: str = "Data Science"
    maxUnitsPerTerm: Optional[int] = 16
    preferredDays: Optional[List[str]] = None
    
class ScheduleRequest(BaseModel):
    preferences: SchedulePreferences
    pdfData: Optional[PDFData] = None


# Dummy schedule data with completed courses
DUMMY_SCHEDULE = {
    "FA24": [
        {"course_id": "MATH 11", "completed": True},
        {"course_id": "CSE 11", "completed": True},
        {"course_id": "CHEM 6A", "completed": True}
    ],
    "WI25": [
        {"course_id": "MATH 20C", "completed": False},
        {"course_id": "DSC 30", "completed": False},
        {"course_id": "CCE 1", "completed": False}
    ],
    "SP25": [
        {"course_id": "DSC 40A", "completed": False},
        {"course_id": "DSC 80", "completed": False},
        {"course_id": "CCE 2", "completed": False}
    ],
    "FA25": [
        {"course_id": "DSC 40B", "completed": False},
        {"course_id": "MATH 181A", "completed": False},
        {"course_id": "CCE 3", "completed": False}
    ],
    "WI26": [
        {"course_id": "DSC 100", "completed": False},
        {"course_id": "DSC 102", "completed": False},
        {"course_id": "CCE 120", "completed": False}
    ],
    "SP26": [
        {"course_id": "DSC 106", "completed": False},
        {"course_id": "MATH 189", "completed": False},
        {"course_id": "DSC 140A", "completed": False}
    ],
    "FA26": [
        {"course_id": "DSC 140B", "completed": False},
        {"course_id": "DSC 148", "completed": False},
        {"course_id": "PHIL 150", "completed": False}
    ],
    "WI27": [
        {"course_id": "DSC 180A", "completed": False},
        {"course_id": "PHIL 160", "completed": False},
        {"course_id": "TDGE 11", "completed": False}
    ],
    "SP27": [
        {"course_id": "DSC 180B", "completed": False},
        {"course_id": "PHIL 170", "completed": False},
        {"course_id": "MUS 1A", "completed": False}
    ],
    "FA27": [
        {"course_id": "ANTH 101", "completed": False},
        {"course_id": "PHIL 180", "completed": False},
        {"course_id": "MUS 4", "completed": False}
    ]
}


@app.post("/schedule/generate")
async def generate_schedule(request: ScheduleRequest):
    """
    Generate a course schedule based on preferences and transcript data.
    This endpoint is specifically for schedule generation, separate from chat.
    """

    overall = graph.invoke({"question": "Make a schedule for me, given my previous record"})
    print(overall)
    python_dict = json.loads(overall["json_str"])
    print(python_dict)

    return {
            "schedule": python_dict,
            "message": overall["agent_answer"],
            "status": "success"
        }



@app.post("/chat")
async def chat(request: ChatRequest):
    # Check for special commands
    msg = request.message.lower().strip()
    
    # Command to show the current schedule (maintained for backward compatibility)
    if msg == "schedule":
        # If PDF data is available, we could use it to personalize the schedule
        has_pdf = request.pdfData is not None
        
        if has_pdf:
            completed_courses = [c["course_id"] for c in request.pdfData.extractedCourses]
            content = f"Based on your transcript with {len(completed_courses)} completed courses, here's a recommended schedule:"
        else:
            content = "Here's a recommended course schedule for your data science major:"
        
        return {
            "messages": [{
                "type": "ai",
                "content": content,
                "schedule": DUMMY_SCHEDULE
            }]
        }
    
    # Command to analyze transcript courses 
    elif msg in ["courses", "my courses", "show courses"]:
        if request.pdfData and request.pdfData.extractedCourses:
            courses = request.pdfData.extractedCourses
            course_list = "\n".join([f"- {c['course_id']}: {c['course_name']} ({c['credits']} credits)" for c in courses])
            return {
                "messages": [{
                    "type": "ai",
                    "content": f"From your transcript, I found these completed courses:\n\n{course_list}"
                }]
            }
        else:
            return {
                "messages": [{
                    "type": "ai",
                    "content": "You haven't uploaded a transcript yet. Please upload a PDF transcript first."
                }]
            }
    
    # Regular chat - pass PDF context to the AI if available
    else:
        config = {"configurable": {"thread_id": request.thread_id}}
        
        # Prepare the context with PDF data if available
        context = {"question": request.message}
        
        if request.pdfData:
            # Add PDF data as context for the AI
            context["pdf_data"] = {
                "courses": [c["course_id"] for c in request.pdfData.extractedCourses],
                "transcript_text": request.pdfData.rawText,
                "file_name": request.pdfData.fileName
            }
            
            # Print debug info about the PDF context
            print(f"Including PDF data in AI context: {len(request.pdfData.extractedCourses)} courses from {request.pdfData.fileName}")
        
        # Invoke the AI with the enhanced context
        result = await graph.ainvoke(context)
        return result["agent_answer"]
    