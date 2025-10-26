#!/usr/bin/env python3
"""
Register AI Workflow Agent to Agentverse
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

try:
    from uagents_core.utils.registration import (
        register_chat_agent,
        RegistrationRequestCredentials,
    )
except ImportError:
    print("❌ uagents_core not found. Installing...")
    os.system("pip3 install uagents")
    from uagents_core.utils.registration import (
        register_chat_agent,
        RegistrationRequestCredentials,
    )

# Get credentials from environment
AGENTVERSE_KEY = os.environ.get("AGENTVERSE_KEY")
AGENT_SEED_PHRASE = os.environ.get("AGENT_SEED_PHRASE")

if not AGENTVERSE_KEY or not AGENT_SEED_PHRASE:
    print("❌ Missing environment variables!")
    print("Please set AGENTVERSE_KEY and AGENT_SEED_PHRASE in .env file")
    exit(1)

print("=" * 60)
print("🚀 Registering AI Workflow Agent to Agentverse")
print("=" * 60)
print(f"Agent Name: ai-workflow-generator")
print(f"Seed Phrase: {AGENT_SEED_PHRASE[:20]}...")
print(f"Agentverse Key: {AGENTVERSE_KEY[:20]}...")
print()

try:
    register_chat_agent(
        "ai-workflow-generator",
        "https://agentverse.ai/v1/submit",
        active=True,
        credentials=RegistrationRequestCredentials(
            agentverse_api_key=AGENTVERSE_KEY,
            agent_seed_phrase=AGENT_SEED_PHRASE,
        ),
    )
    print("✅ AI Workflow Agent registered successfully!")
    print()
    print("Next steps:")
    print("1. Go to https://agentverse.ai/agents")
    print("2. You should see 'ai-workflow-generator' in your agents list")
    print("3. Click on it to view details and get the agent address")
    print()
except Exception as e:
    print(f"❌ Registration failed: {e}")
    exit(1)
