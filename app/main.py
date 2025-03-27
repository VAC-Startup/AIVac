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
  "WI25": ["DSC 20", "MATH 20B", "MGT 16", "PHIL 35"],
  "SP25": ["MATH 20C", "DSC 30", "CCE 1", "PHIL 101"],
  "FA25": ["DSC 40A", "CCE 2", "MUS 1A", "PHIL 150"],
  "WI26": ["DSC 80", "DSC 40B", "CCE 3", "MUS 1B"],
  "SP26": ["DSC 100", "MATH 181A", "CCE 120", "PHIL 160"],
  "FA26": ["DSC 102", "DSC 106", "DSC 140A", "SIO 109"],
  "WI27": ["DSC 140B", "DSC 148", "MATH 189", "TDGE 1"],
  "SP27": ["DSC 180A", "DSC 164", "DSC 167", "PHIL 175"],
  "FA27": ["DSC 180B", "DSC 170", "DSC 168", "PHIL 180"],
  "WI28": ["DSC 190", "DSC 195", "DSC 196", "ANTH 101"],
  "SP28": ["DSC 197", "DSC 191", "PHIL 185", "TDGE 25"]
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
    