"""
MCP Gesture Hub Agent
Provides catalog service for all available gestures and actions
Uses Fetch.ai uAgents framework + MCP protocol
Deployed to Agentverse
"""

from uagents import Agent, Context, Model
from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
from threading import Thread

# Load gesture catalog
CATALOG_PATH = os.path.join(os.path.dirname(__file__), 'gesture_catalog.json')

with open(CATALOG_PATH, 'r') as f:
    GESTURE_CATALOG = json.load(f)

# Initialize Flask app for MCP endpoints
app = Flask(__name__)
CORS(app)

# Initialize uAgent with environment variables for Agentverse
AGENT_SEED = os.getenv("AGENT_SEED_PHRASE", "gesture_hub_seed_phrase_12345")

gesture_hub_agent = Agent(
    name="gesture_hub",
    seed=AGENT_SEED,
    port=8002,
    endpoint=["http://127.0.0.1:8002/submit"]
)

# MCP Protocol Models
class GestureQuery(Model):
    """Query for gesture information"""
    gesture_id: str = None
    context_type: str = None
    query_type: str  # "all", "by_id", "by_context", "recommended"

class ActionQuery(Model):
    """Query for action information"""
    action_id: str = None
    action_type: str = None  # "keyboard", "mouse", "all"

class CatalogResponse(Model):
    """Response containing catalog data"""
    success: bool
    data: dict
    message: str = ""

# ============================================
# MCP PROTOCOL ENDPOINTS (Flask HTTP)
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "agent": "MCP Gesture Hub",
        "catalog_loaded": True,
        "total_gestures": len(GESTURE_CATALOG.get('gestures', [])),
        "total_actions": len(GESTURE_CATALOG.get('actions', {}).get('keyboard', [])) +
                        len(GESTURE_CATALOG.get('actions', {}).get('mouse', []))
    })

@app.route('/gestures', methods=['GET'])
def get_all_gestures():
    """Get all available gestures"""
    return jsonify({
        "success": True,
        "data": GESTURE_CATALOG.get('gestures', []),
        "count": len(GESTURE_CATALOG.get('gestures', []))
    })

@app.route('/gestures/<gesture_id>', methods=['GET'])
def get_gesture_by_id(gesture_id):
    """Get specific gesture by ID"""
    gestures = GESTURE_CATALOG.get('gestures', [])
    gesture = next((g for g in gestures if g['id'] == gesture_id), None)

    if gesture:
        return jsonify({
            "success": True,
            "data": gesture
        })
    else:
        return jsonify({
            "success": False,
            "message": f"Gesture '{gesture_id}' not found"
        }), 404

@app.route('/actions', methods=['GET'])
def get_all_actions():
    """Get all available actions (keyboard + mouse)"""
    return jsonify({
        "success": True,
        "data": GESTURE_CATALOG.get('actions', {}),
        "keyboard_count": len(GESTURE_CATALOG.get('actions', {}).get('keyboard', [])),
        "mouse_count": len(GESTURE_CATALOG.get('actions', {}).get('mouse', []))
    })

@app.route('/actions/keyboard', methods=['GET'])
def get_keyboard_actions():
    """Get keyboard actions only"""
    return jsonify({
        "success": True,
        "data": GESTURE_CATALOG.get('actions', {}).get('keyboard', []),
        "count": len(GESTURE_CATALOG.get('actions', {}).get('keyboard', []))
    })

@app.route('/actions/mouse', methods=['GET'])
def get_mouse_actions():
    """Get mouse actions only"""
    return jsonify({
        "success": True,
        "data": GESTURE_CATALOG.get('actions', {}).get('mouse', []),
        "count": len(GESTURE_CATALOG.get('actions', {}).get('mouse', []))
    })

@app.route('/actions/<action_type>/<action_id>', methods=['GET'])
def get_action_by_id(action_type, action_id):
    """Get specific action by type and ID"""
    if action_type not in ['keyboard', 'mouse']:
        return jsonify({
            "success": False,
            "message": f"Invalid action_type '{action_type}'. Use 'keyboard' or 'mouse'"
        }), 400

    actions = GESTURE_CATALOG.get('actions', {}).get(action_type, [])
    action = next((a for a in actions if a['id'] == action_id), None)

    if action:
        return jsonify({
            "success": True,
            "data": action
        })
    else:
        return jsonify({
            "success": False,
            "message": f"Action '{action_id}' not found in {action_type} actions"
        }), 404

@app.route('/contexts', methods=['GET'])
def get_all_contexts():
    """Get all context recommendations"""
    return jsonify({
        "success": True,
        "data": GESTURE_CATALOG.get('contexts', {}),
        "count": len(GESTURE_CATALOG.get('contexts', {}))
    })

@app.route('/contexts/<context_type>', methods=['GET'])
def get_context_recommendations(context_type):
    """Get gesture recommendations for specific context"""
    contexts = GESTURE_CATALOG.get('contexts', {})
    context = contexts.get(context_type)

    if context:
        # Also include full gesture objects for recommended gestures
        recommended_gesture_ids = context.get('recommended_gestures', [])
        all_gestures = GESTURE_CATALOG.get('gestures', [])
        recommended_gestures = [g for g in all_gestures if g['id'] in recommended_gesture_ids]

        return jsonify({
            "success": True,
            "data": {
                **context,
                "recommended_gesture_objects": recommended_gestures
            }
        })
    else:
        return jsonify({
            "success": False,
            "message": f"Context '{context_type}' not found"
        }), 404

@app.route('/query/gestures-for-context/<context_type>', methods=['GET'])
def query_gestures_for_context(context_type):
    """
    Smart query: Get recommended gestures with full details for a context
    This is what the AI Mode Workflow Agent will use
    """
    contexts = GESTURE_CATALOG.get('contexts', {})
    context = contexts.get(context_type)

    if not context:
        return jsonify({
            "success": False,
            "message": f"Context '{context_type}' not found",
            "available_contexts": list(contexts.keys())
        }), 404

    # Get full gesture objects
    recommended_ids = context.get('recommended_gestures', [])
    avoid_ids = context.get('avoid_gestures', [])
    all_gestures = GESTURE_CATALOG.get('gestures', [])

    recommended_gestures = [g for g in all_gestures if g['id'] in recommended_ids]
    avoid_gestures = [g for g in all_gestures if g['id'] in avoid_ids]

    return jsonify({
        "success": True,
        "context_type": context_type,
        "description": context.get('description', ''),
        "platforms": context.get('platforms', []),
        "recommended_gestures": recommended_gestures,
        "avoid_gestures": avoid_gestures,
        "recommended_count": len(recommended_gestures)
    })

@app.route('/catalog', methods=['GET'])
def get_full_catalog():
    """Get entire gesture catalog (for debugging/admin)"""
    return jsonify({
        "success": True,
        "catalog": GESTURE_CATALOG
    })

# ============================================
# uAGENT MESSAGE HANDLERS
# ============================================

@gesture_hub_agent.on_event("startup")
async def startup(ctx: Context):
    """Agent startup event"""
    ctx.logger.info(f"🚀 MCP Gesture Hub Agent started")
    ctx.logger.info(f"📦 Loaded {len(GESTURE_CATALOG.get('gestures', []))} gestures")
    ctx.logger.info(f"⌨️  Loaded {len(GESTURE_CATALOG.get('actions', {}).get('keyboard', []))} keyboard actions")
    ctx.logger.info(f"🖱️  Loaded {len(GESTURE_CATALOG.get('actions', {}).get('mouse', []))} mouse actions")
    ctx.logger.info(f"📱 Loaded {len(GESTURE_CATALOG.get('contexts', {}))} contexts")
    ctx.logger.info(f"🌐 MCP HTTP endpoints available at http://127.0.0.1:8002")

@gesture_hub_agent.on_query(model=GestureQuery)
async def handle_gesture_query(ctx: Context, sender: str, msg: GestureQuery):
    """Handle gesture queries from other agents"""
    ctx.logger.info(f"📥 Received gesture query from {sender}: {msg.query_type}")

    try:
        if msg.query_type == "all":
            data = GESTURE_CATALOG.get('gestures', [])

        elif msg.query_type == "by_id" and msg.gesture_id:
            gestures = GESTURE_CATALOG.get('gestures', [])
            data = next((g for g in gestures if g['id'] == msg.gesture_id), None)
            if not data:
                await ctx.send(sender, CatalogResponse(
                    success=False,
                    data={},
                    message=f"Gesture '{msg.gesture_id}' not found"
                ))
                return

        elif msg.query_type == "by_context" and msg.context_type:
            contexts = GESTURE_CATALOG.get('contexts', {})
            context = contexts.get(msg.context_type)
            if context:
                recommended_ids = context.get('recommended_gestures', [])
                all_gestures = GESTURE_CATALOG.get('gestures', [])
                data = [g for g in all_gestures if g['id'] in recommended_ids]
            else:
                data = []

        elif msg.query_type == "recommended" and msg.context_type:
            # Same as by_context but includes context metadata
            contexts = GESTURE_CATALOG.get('contexts', {})
            context = contexts.get(msg.context_type, {})
            recommended_ids = context.get('recommended_gestures', [])
            all_gestures = GESTURE_CATALOG.get('gestures', [])
            recommended_gestures = [g for g in all_gestures if g['id'] in recommended_ids]

            data = {
                "context": context,
                "gestures": recommended_gestures
            }
        else:
            await ctx.send(sender, CatalogResponse(
                success=False,
                data={},
                message="Invalid query parameters"
            ))
            return

        await ctx.send(sender, CatalogResponse(
            success=True,
            data=data,
            message="Query successful"
        ))

    except Exception as e:
        ctx.logger.error(f"❌ Error handling gesture query: {e}")
        await ctx.send(sender, CatalogResponse(
            success=False,
            data={},
            message=str(e)
        ))

@gesture_hub_agent.on_query(model=ActionQuery)
async def handle_action_query(ctx: Context, sender: str, msg: ActionQuery):
    """Handle action queries from other agents"""
    ctx.logger.info(f"📥 Received action query from {sender}: {msg.action_type}")

    try:
        actions = GESTURE_CATALOG.get('actions', {})

        if msg.action_type == "all":
            data = actions
        elif msg.action_type in ["keyboard", "mouse"]:
            data = actions.get(msg.action_type, [])

            # If specific action_id requested
            if msg.action_id:
                data = next((a for a in data if a['id'] == msg.action_id), None)
                if not data:
                    await ctx.send(sender, CatalogResponse(
                        success=False,
                        data={},
                        message=f"Action '{msg.action_id}' not found in {msg.action_type}"
                    ))
                    return
        else:
            await ctx.send(sender, CatalogResponse(
                success=False,
                data={},
                message=f"Invalid action_type '{msg.action_type}'"
            ))
            return

        await ctx.send(sender, CatalogResponse(
            success=True,
            data=data,
            message="Query successful"
        ))

    except Exception as e:
        ctx.logger.error(f"❌ Error handling action query: {e}")
        await ctx.send(sender, CatalogResponse(
            success=False,
            data={},
            message=str(e)
        ))

# ============================================
# RUN BOTH FLASK + uAGENT
# ============================================

def run_flask():
    """Run Flask server in separate thread"""
    app.run(host='0.0.0.0', port=8002, debug=False, use_reloader=False)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 MCP Gesture Hub Agent")
    print("=" * 60)
    print(f"📦 Gestures loaded: {len(GESTURE_CATALOG.get('gestures', []))}")
    print(f"⌨️  Keyboard actions: {len(GESTURE_CATALOG.get('actions', {}).get('keyboard', []))}")
    print(f"🖱️  Mouse actions: {len(GESTURE_CATALOG.get('actions', {}).get('mouse', []))}")
    print(f"📱 Contexts: {len(GESTURE_CATALOG.get('contexts', {}))}")
    print()
    print("🌐 MCP HTTP Endpoints:")
    print("   GET  /health")
    print("   GET  /gestures")
    print("   GET  /gestures/<id>")
    print("   GET  /actions")
    print("   GET  /actions/keyboard")
    print("   GET  /actions/mouse")
    print("   GET  /contexts")
    print("   GET  /contexts/<type>")
    print("   GET  /query/gestures-for-context/<type>")
    print()
    print("🤖 uAgent Protocol:")
    print("   Address: Will be displayed after startup")
    print("   Port: 8002")
    print("=" * 60)
    print()

    # Start Flask in separate thread
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Run uAgent in main thread
    gesture_hub_agent.run()
