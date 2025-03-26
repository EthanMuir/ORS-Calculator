from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import socket
import json
import time

app = Flask(__name__)
# Enable CORS for all routes and all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Global store for the latest vital signs data
latest_data = {
    "heartRate": 70.5,
    "breathRate": 16.2,
    "pd": -20,
    "timestamp": time.time() * 1000
}

# Lock for thread-safe updates to latest_data
data_lock = threading.Lock()

# TCP server socket
def start_tcp_server(host='0.0.0.0', port=5025):
    """Start a TCP server that listens for incoming data from the Raspberry Pi"""
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_sock.bind((host, port))
    server_sock.listen(1)
    
    print(f"TCP server started on {host}:{port}. Waiting for connections...")
    
    while True:
        client_sock, client_info = server_sock.accept()
        print(f"Accepted connection from {client_info}")
        
        # Start a thread to handle this client
        client_thread = threading.Thread(target=handle_client, args=(client_sock,))
        client_thread.daemon = True
        client_thread.start()

def handle_client(client_sock):
    """Handle data received from a connected client"""
    buffer = ""
    try:
        while True:
            # Receive data from the client
            data = client_sock.recv(1024)
            if not data:
                break
            
            # Add received data to buffer
            buffer += data.decode('utf-8')
            
            # Process any complete JSON objects in the buffer
            while '\n' in buffer:
                line, buffer = buffer.split('\n', 1)
                
                # Try to parse the received data as JSON
                try:
                    json_data = json.loads(line)
                    
                    # Update latest data with thread safety
                    with data_lock:
                        latest_data["heartRate"] = json_data.get("heartRate", 0)
                        latest_data["breathRate"] = json_data.get("breathRate", 0)
                        latest_data["pd"] = json_data.get("pd", 0)
                        latest_data["timestamp"] = json_data.get("timestamp", time.time() * 1000)
                    
                    print(f"Received data: {json_data}")
                except json.JSONDecodeError:
                    print(f"Error decoding JSON data: {line}")
                except Exception as e:
                    print(f"Error handling client data: {e}")
    finally:
        # Clean up the connection
        client_sock.close()
        print("Client disconnected")

# API endpoint to get the latest vital signs data
@app.route('/api/vitals', methods=['GET'])
def get_vitals():
    with data_lock:
        response = jsonify(latest_data)
        # Add CORS headers explicitly
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response

# Handle OPTIONS requests for CORS preflight
@app.route('/api/vitals', methods=['OPTIONS'])
def options_vitals():
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Simple endpoint to simulate data for testing
@app.route('/api/simulate', methods=['POST'])
def simulate_data():
    """API endpoint to inject simulated data for testing"""
    try:
        data = request.get_json()
        
        with data_lock:
            latest_data["heartRate"] = data.get("heartRate", latest_data["heartRate"])
            latest_data["breathRate"] = data.get("breathRate", latest_data["breathRate"])
            latest_data["pd"] = data.get("pd", latest_data["pd"])
            latest_data["timestamp"] = time.time() * 1000
        
        return jsonify({"status": "success", "data": latest_data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

# Start the TCP server in a separate thread
if __name__ == '__main__':
    # Start the server thread
    server_thread = threading.Thread(target=start_tcp_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Print the IP address for easier connection
    import socket
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    print(f"Server running on: {ip_address}")
    print(f"API available at: http://{ip_address}:5030/api/vitals")
    
    # Start the Flask server
    app.run(host='0.0.0.0', port=5030, debug=True, use_reloader=False)