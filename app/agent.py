from langgraph.graph import  StateGraph
from langgraph.graph import MessagesState, StateGraph
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.graph import END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from typing_extensions import TypedDict, List
from langchain import hub
from langchain.schema import Document
from langgraph.graph import StateGraph, START, END
from typing import Annotated
from langchain_anthropic import ChatAnthropic

from langchain.agents import create_react_agent, AgentExecutor

from prompts import *

os.environ["LANGSMITH_TRACING"]= "true"
os.environ["LANGSMITH_API_KEY"]= "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"
os.environ["LANGSMITH_ENDPOINT"]= "https://api.smith.langchain.com"
os.environ["LANGSMITH_PROJECT"]= "vac_proj"
os.environ["OPENAI_API_KEY"] = "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"
os.environ["PINECONE_API_KEY"] = "pcsk_5b67TL_BgErCnfngE1K8C6Kh4SuPuiFZNDyALbvtqi1fUn1gxzEK5p2KYm4nue6fwxEp4C"
os.environ["TAVILY_API_KEY"] = "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"
os.environ["ANTHROPIC_API_KEY"] = "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"
load_dotenv()


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
index_name = "openaicourses"
pc = Pinecone(api_key="pcsk_5b67TL_BgErCnfngE1K8C6Kh4SuPuiFZNDyALbvtqi1fUn1gxzEK5p2KYm4nue6fwxEp4C")
index = pc.Index(index_name)
vector_store = PineconeVectorStore(embedding=embeddings, index=index)


record = '[ { "term": "FA24", "courseCode": "MATH 18", "title": "Linear Algebra", "units": 4.0, "grade": "A+" }, { "term": "FA24", "courseCode": "COGS 9", "title": "Introduction to Data Science", "units": 4.0, "grade": "A" }, { "term": "FA24", "courseCode": "DSC 10", "title": "Principles of Data Science", "units": 4.0, "grade": "A" }, { "term": "FA24", "courseCode": "ECE 87", "title": "First-year Seminar", "units": 1.0, "grade": "P" } ]'
audit = '{ "majorRequirements": { "dataScienceBS": { "lowerDivision": [ { "name": "Mathematics", "stillNeeded": 1, "possibleCourses": ["MATH 20C", "31BH"], "note": "You already have MATH 18, MATH 20A (TP), MATH 20B (WIP). Need 1 more (MATH 20C or 31BH)." }, { "name": "Data Science Core (Lower Div)", "stillNeeded": 4, "possibleCourses": ["DSC 30", "DSC 40A", "DSC 40B", "DSC 80"], "note": "Completed DSC 10, COGS 9; DSC 20 is WIP." }, { "name": "Subject Domain", "note": "Partial coverage from BILD 1 (2 units TP) and BILD 3 (4 units TP); might need 1 more domain course." } ], "upperDivision": [ { "name": "Core Courses", "stillNeeded": 7, "possibleCourses": [ "MATH 189", "DSC 100", "DSC 102", "DSC 106", "DSC 140A (or CSE 150A)", "DSC 140B (or CSE 151A)", "DSC 148 (or CSE 158)" ], "note": "No upper-division DSC courses completed or in-progress yet." }, { "name": "Core Math/Statistics", "description": "MATH 181A or MATH 183 or ECON 120A", "stillNeeded": 1, "possibleCourses": ["MATH 181A", "MATH 183", "ECON 120A"] }, { "name": "Senior Project", "stillNeeded": 2, "possibleCourses": ["DSC 180A", "DSC 180B"] }, { "name": "Electives", "stillNeededUnits": 20.0, "possibleCourses": [ "BICD 100", "BIEB 174", "COGS 108", "COGS 109", "CSE 106", "CSE 151B", "CSE 152A", "CSE 152B", "CSE 156", "CSE 166", "CSE 180", "ECON 120B", "ECON 120C", "... (Other listed DSC elective options) ..." ] }, { "name": "48 Upper Division Units in Major", "stillNeededUnits": 48.0, "note": "Need at least 48 upper-division units in the Data Science major." } ] } }, "collegeRequirements": { "eighthCollege": { "criticalCommunityEngagement": { "stillNeeded": 4, "courses": ["CCE 1", "CCE 2", "CCE 3", "CCE 120"] }, "breadth": { "arts": { "stillNeeded": 2, "possibleCourses": [ "MUS 8", "MUS 11", "TDAC 120", "TDHT 103", "VIS 1", "... (Additional arts courses listed) ..." ] }, "humanities": { "stillNeeded": 1, "note": "PHIL 35 is WIP", "possibleCourses": [ "AAS 10", "ENVR 140", "HIAF 111", "HILA 119", "... (Many others listed in the audit) ..." ] }, "socialSciences": { "stillNeeded": 1, "possibleCourses": [ "ANTH 1", "CGS 2A", "COGS 12", "ECON 1", "ETHN 1", "POLI 13", "PSYC 131", "SOCI 30", "... (Additional social science courses listed) ..." ] } } } }, "universityRequirements": { "climateChangeEducation": { "name": "Jane Teranes Climate Change Ed (JTCCER)", "stillNeeded": 1 }, "upperDivisionUnits": { "minimumRequired": 60.0, "note": "Need 60 total UD units at UCSD (not just in the major)." }, "totalUnits": { "minimumRequired": 180, "note": "69 units earned, 17 WIP. More needed." }, "passNoPassLimit": { "note": "Currently under 25% P/NP. Watch future courses but no immediate issue." }, "DEIRequirement": { "note": "PHIL 35 is WIP, may satisfy DEI. 3 of 3 DEI items shown as earned." } } }'

rag_prompt = hub.pull("rlm/rag-prompt")

# Define state for application
class State(TypedDict):
    question: str
    context: List[Document]
    answer: str


def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}



def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = rag_prompt.invoke({"question": state["question"],
                              "context": docs_content})
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini-2024-07-18")
    response = llm.invoke(messages)
    return {"answer": response.content}



# Compile application and test
graph_builder_chat = StateGraph(State).add_sequence([retrieve, generate])
graph_builder_chat.add_edge(START, "retrieve")
graph_chat = graph_builder_chat.compile()






# Define state for application
class StatePreq(TypedDict):
    plan: str
    context: List[Document]
    answer: str

# Define application steps
def retrieve_rag_prereq(state: StatePreq):
    llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)
    list_sched = llm.invoke(extract_list.format(user_schedule=state["plan"])).content.split(",")
    retrieved_docs = []
    for item in list_sched:
      document_id = item.replace(" ","")
      result = index.fetch(ids=[document_id])
      # Convert to LangChain Document
      if document_id in result.vectors:
          record = result.vectors[document_id]
          filtered_metadata = {
              'course_id': record.metadata.get('course_id', ''),
              'prerequisites': record.metadata.get('prerequisites', '')
          }
          page_content = f"Course: {filtered_metadata['course_id']}\nPrerequisites: {filtered_metadata['prerequisites']}"
    
    
          document = Document(
              page_content=page_content,
              metadata=filtered_metadata
          )
          # print(f"Successfully retrieved document: {document_id}")
      else:
          # print(f"Document with ID {document_id} not found")
          document = None
      retrieved_docs.append(document)
    state["context"] = retrieved_docs
    return state


def generate_preq(state: StatePreq):
    # llm = ChatOpenAI(model="gpt-4o-2024-08-06", temperature=0)
    llm = ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0)
    docs_content = "\n\n".join(doc.page_content for doc in state["context"] if doc != None)
    question = prereq_verify_prompt_rag.format(user_schedule=state["plan"])
    messages = rag_prompt.invoke({"question": question,
                              "context": docs_content})
    response = llm.invoke(messages)
    state["answer"] = response.content
    return state


@tool
def prereq_checker_rag(schedule: Annotated[str, "The proposed schedule thats prereqs is to be checked"]) -> str:
    """
    Given a JSON string representing the student's proposed schedule and AP +transfer credit,
    this tool retrieves course documents from the vector database and
    generates a verification answer that checks if prerequisites are fulfilled.

    It returns the LLM's response as a string.
    """
    state: StatePreq = {"plan": schedule, "context": [], "answer": ""}
    state = retrieve_rag_prereq(state)
    state = generate_preq(state)
    return state["answer"]




# Create the validation tool
@tool
def validate_schedule(
    schedule: Annotated[str, "The proposed schedule thats accuracy is to be checked"]
                      ):
    """Validates whether a schedule meets all degree audit requirements. Provide the current schedule, degree audit, and proposed additions"""
    validation_llm = ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0)
    response = validation_llm.invoke(
        validation_prompt.format(
            degree_audit=audit,
            schedule=schedule,
        )
    )
    return response


from langchain.memory import ChatMessageHistory

from langchain_core.runnables.history import RunnableWithMessageHistory


llm_agent = ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0)
# llm = ChatOpenAI(model="o3-mini-2025-01-31")
memory = ChatMessageHistory(session_id="test-session2")


agent = create_react_agent(llm_agent, [validate_schedule, prereq_checker_rag], prompt=system_prompt_react)
agent_executor = AgentExecutor(agent=agent, tools=[validate_schedule, prereq_checker_rag], verbose=True, handle_parsing_errors=True)

agent_with_chat_history = RunnableWithMessageHistory(
    agent_executor,
    # This is needed because in most real world scenarios, a session id is needed
    # It isn't really used here because we are using a simple in memory ChatMessageHistory
    lambda session_id: memory,
    input_messages_key="input",
    history_messages_key="chat_history",
)

class StateSched(TypedDict):
    question: str
    agent_answer: str
    json_str: str



def generate_schedule(state: StateSched):
    input_str = state["question"]+": "+record + " degree_audit: "+audit
    agent_output = agent_with_chat_history.invoke(
        {"input": input_str},
        config={"configurable": {"session_id": "<foo>"}},)
    return {"agent_answer": agent_output["output"]}

import re

def extract_json(state: StateSched):

    # Pattern to find content within curly braces
    pattern = r'{[^{}]*(?:{[^{}]*}[^{}]*)*}'
    match = re.search(pattern, state["agent_answer"])
    
    if not match:
        return None
    
    dict_str = match.group(0)

    return {"json_str": dict_str}


# Compile application and test
graph_builder_sched = StateGraph(StateSched).add_sequence([generate_schedule, extract_json])
graph_builder_sched.add_edge(START, "generate_schedule")
graph_sched = graph_builder_sched.compile()

# Define state for application
class State(TypedDict):
    question: str
    context: List[Document]
    answer: str


def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}



def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = rag_prompt.invoke({"question": state["question"],
                              "context": docs_content})
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini-2024-07-18")
    response = llm.invoke(messages)
    return {"answer": response.content}


# Compile application and test
graph_builder_rag = StateGraph(State).add_sequence([retrieve, generate])
graph_builder_rag.add_edge(START, "retrieve")
graph_rag = graph_builder_rag.compile()


class StateOverall(TypedDict):
    question: str
    route: str
    agent_answer: str
    json_str: str


def intent_router(state: StateOverall):
    llm = ChatOpenAI(model="gpt-4o-mini-2024-07-18", temperature=0)
    llm_output = llm.invoke(router_prompt.format(query=state["question"]))
    state["route"] = llm_output.content
    return state

def generate_response(state: StateOverall):
  if state["route"] == "scheduling":
    input_str = state["question"]
    initial_state = {"question": input_str}
    response = graph_sched.invoke(initial_state)
    state["agent_answer"] = "I have updated the schedule"
    state["json_str"] = response["json_str"]
  else:
    state["agent_answer"] =  graph_rag.invoke({"question":state["question"]})["answer"]


  return state


graph_builder = StateGraph(StateOverall).add_sequence([intent_router, generate_response])
graph_builder.add_edge(START, "intent_router")
graph = graph_builder.compile()