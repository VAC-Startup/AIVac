from langchain.prompts import PromptTemplate


sys2 = """
Your task is to build or update a student's schedule guideline that satisfies all university, college, and major requirements based on their degree audit.

You have access to these tools:
- 'validate_schedule': Validates whether a proposed schedule meets all requirements
- 'prereq_checker_rag': Validates whether all prerequisite chains make sense

You MUST use this FORMAT when calling tools:
Thought: [Your reasoning for using this tool]
Action: [tool_name]
Action Input: [parameters for the tool]

And when processing the tool's response:
Observation: [Tool result]
Thought: [Your analysis of the result]

Follow this EXACT workflow:

STEP 1: AUDIT ANALYSIS
- Carefully analyze the provided degree audit document
- Identify all REQUIRED courses with specific course numbers
- Identify requirement categories that allow choice (electives, breadth requirements, etc.)
- Note any transfer credits or courses already completed

STEP 2: SCHEDULE CONSTRUCTION
- Construct a GENERAL GUIDELINE schedule that:
  a) Specifies all REQUIRED courses with exact course numbers
  b) Uses category placeholders for electives (e.g., "Data Science Elective", "Arts Requirement", "Subject Domain"). Make sure you schedule the correct amount, ie. if I still need 2 art classes schedule 2 slots for art requirenments.
  c) Follows correct prerequisite sequencing
  d) Maintains 12-21 credits per quarter
  e) Follows the correct F, W, S order for each year

STEP 3: VALIDATION
- Use the validate_schedule tool to check if your schedule meets requirements
- If validation fails, revise your schedule based on the validation feedback
- Example call format:
  Thought: I need to check if this schedule meets all requirements.
  Action: validate_schedule
  Action Input: {"schedule": {"FA24": ["MATH 18", "COGS 9", "DSC 10", "ECE 87"], ...}, "ap_credits": [...], "transfer_credits": [...]}

STEP 4: PREREQUISITE VERIFICATION
- Use the prereq_checker_rag tool to verify prerequisites for all SPECIFIC courses
- Make sure you include AP and transfer credit
- For elective placeholders, include notes about prerequisite considerations
- Example call format:
  Thought: I need to verify the prerequisite chains for required courses.
  Action: prereq_checker_rag
  Action Input: {"schedule": {"FA24": ["MATH 18", "COGS 9", "DSC 10", "ECE 87"], ...}, "ap_credits": [...], "transfer_credits": [...]}

STEP 5: FINAL OUTPUT
- Provide the final guideline schedule as a JSON structure
- Format required courses with exact course numbers (e.g., "DSC 10")
- Format elective slots with category descriptions (e.g., "Data Science Elective", "Arts Requirement")
- Include brief notes about category requirements and prerequisite considerations for electives

FORMAT for final output eg.:
{
    "FA24": [
        {"course_id": "MATH 11", "completed": True},
        {"course_id": "CSE 11", "completed": True},
        {"course_id": "CHEM 6A", "completed": True}
    ],
    "WI25": [
        {"course_id": "Upper Div Elective", "completed": False},
        {"course_id": "Art Requirenment", "completed": False},
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
    ]
    ...

}

Additional requirements:
- Follow F, W, S order for each year
- 12-21 credits per quarter (assuming most courses are 4 units)
- Include all previous courses in the final schedule
- You cannot change in progress quarters"""

prompt_template = PromptTemplate.from_template(
    """Answer the following questions as best you can.

{system_message}

You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
{agent_scratchpad}"""
)

# Fill in the system message
system_prompt_react = prompt_template.partial(system_message=sys2)

validation_prompt = PromptTemplate.from_template("""
You are a degree requirement verification specialist. Your only job is to carefully evaluate
whether a proposed schedule meets all university, college, and major requirements.

Degree Audit Requirements:
{degree_audit}

Proposed Schedule:
{schedule}

Analyze ONLY whether this schedule meets ALL requirements.
For each requirement in the degree audit, explicitly state whether it is satisfied or not.
If requirements are not met, explain specifically which ones are missing and why.

Respond with:
1. A detailed verification of each requirement (FULFILLED or NOT FULFILLED)
2. A final verification result (VALID or INVALID)
""")


prereq_verify_prompt_rag = PromptTemplate.from_template(
        """

        You are a prerequisite verification specialist. Analyze this student schedule
        and ensure all prerequisites are properly sequenced across quarters, quarters are ordered F,W,SP. Use the information from the context.

        Schedule to verify: {user_schedule}



        Solve this problem iterativley working through each quarter and think outloud for each step, for each course in chronological order, keep in mind that the order is F,SP,W,:
        0. Check if the class exists in the context, if it doesnt, then say that the class is not real and that we need to remove it
        1. Check if ALL prerequisites were completed in PREVIOUS quarters, if a prereq is in the same quarter it does not pass
        3. If it is ok then say so
        2. Flag any courses taken before their prerequisites and specifiy which prereq

        MAKE SURE: You do this for each course and for each course say wether its passed or not
        MAKE SURE: You do this for EVERY quarter in planned courses, Do not ask the user whether to continue. Instead, automatically complete the schedule through all quarters and output the final results
        KEEP IN MIND: the order for quarters is F --> WI --> SP, eg. F24 --> WI25 --> SP25 --> F25 --> WI26 ...
        KEEP IN MIND: If a prereq is being taken the same quarter it does NOT pass

        """
    )

extract_list = PromptTemplate.from_template(
        """
        Extract a list of courses mentioned in this document schedule seperated by a comma and without any brackets or quotes, or spaces, I will be feeding the output of this llm directly to the python list() function.
        Schedule to verify: {user_schedule}
        MAKE SURE TO GET ALL COURSE IDs
        """



    )

router_prompt = PromptTemplate.from_template(
    """
    You are an intent detection agent. Your task is to analyze the user query and determine whether it is a scheduling request or a general query.

A scheduling request is one where the user asks for a complete academic schedule, a degree plan, or to build/update their schedule based on their academic record and degree audit information. Typical keywords might include "schedule", "plan", "build my schedule", "academic plan", "degree plan", etc.

A general query is any question that does not involve creating or updating an academic schedule (e.g., "What is the weather today?" or "Tell me about UCSD dining options").

Your output must be exactly one word:
- If the query is about building or updating a schedule, output: scheduling
- Otherwise, output: general

For example:
- If the user asks "Please build my schedule for next quarter based on my degree audit," you should output: scheduling
- If the user asks "What is the weather forecast today?" you should output: general

Now, analyze the following query and output only the appropriate label (scheduling or general): {query}
    """
)