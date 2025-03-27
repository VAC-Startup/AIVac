from agent import graph
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    thread_id: str


# Dummy schedule data
DUMMY_SCHEDULE = {
    "FA24": ["MATH 18", "COGS 9", "DSC 10", "ECE 87"],
    "WI25": ["DSC 20", "MATH 20B", "MGT 16", "PHIL 35", "ANTH 87"],
    "SP25": ["MATH 20C", "DSC 30", "DSC 40A", "ANTH 128A"],
    "FA25": ["DSC 40B", "DSC 80", "MATH 181A", "CCE 1"],
    "WI26": ["DSC 100", "DSC 102", "PHIL 130", "CCE 2"],
    "SP26": ["DSC 106", "MATH 189", "DSC 140A", "CCE 3"],
    "FA26": ["DSC 140B", "DSC 148", "PHIL 183", "CCE 120"],
    "WI27": ["DSC 180A", "DSC 170", "TDGE 1", "MUS 1A"],
    "SP27": ["DSC 180B", "DSC 167", "DSC 190"],
    "FA27": ["DSC 196A", "DSC 191", "PHIL 131"],
    "WI28": ["COGS 187A", "PHIL 160", "DSC 192"],
    "SP28": ["COGS 188", "PHIL 164", "DSC 197"]
}



@app.post("/chat")
async def chat(request: ChatRequest):
    print(request.message)
    if "schedule" in request.message:
        time.sleep(3)
        return {
            "messages": [{
                "type": "ai",
                "content": "Here's a recommended course schedule for your data science major:",
                "schedule": DUMMY_SCHEDULE
            }]
        }
    else:
        result = await graph.ainvoke(
            {"messages": [{"role": "user", "content": request.message}]})
        return result
    