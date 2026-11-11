"""ReAct agent with LangChain/LangGraph tools backed by a Bedrock chat model."""
from langchain_aws import ChatBedrockConverse
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

llm = ChatBedrockConverse(model="us.anthropic.claude-3-5-haiku-20241022-v1:0", temperature=0)

INVENTORY = {"laptop": 14, "monitor": 3, "headset": 0}


@tool
def check_stock(item: str) -> int:
    """Return units in stock for an item."""
    return INVENTORY.get(item.lower(), 0)


@tool
def reorder(item: str, quantity: int) -> str:
    """Place a purchase order for an item."""
    return f"PO created: {quantity} x {item}"


agent = create_react_agent(llm, [check_stock, reorder])
result = agent.invoke({"messages": [("user", "Check stock for headsets and monitors. Reorder 10 of anything under 5 units.")]})
for m in result["messages"]:
    m.pretty_print()
