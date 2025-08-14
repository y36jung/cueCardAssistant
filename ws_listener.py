# Save as ppt_ws_server.py
import asyncio
import websockets
import ssl
import socket
import pyautogui
import json
import keyboard  # NEW: for listening to PC keyboard events

#ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
#ssl_context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

connected_clients = set()

async def handler(websocket):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            key = data.get("value")
            pyautogui.press(key)
    finally:
        connected_clients.remove(websocket)

async def broadcast_keypress():
    loop = asyncio.get_event_loop()
    while True:
        event = await loop.run_in_executor(None, keyboard.read_event)
        if event.event_type == keyboard.KEY_DOWN:
            msg = json.dumps({"key": event.name})
            # Broadcast to all connected clients
            await asyncio.gather(*[ws.send(msg) for ws in connected_clients if ws.open])

async def main():
    server = await websockets.serve(
        handler, "0.0.0.0", 0#, ssl=ssl_context
    )
    port = server.sockets[0].getsockname()[1]
    ip = get_local_ip()
    print(f"WSS server running on wss://{ip}:{port}")

    # Optionally, start a simple HTTP server to serve the IP/port for discovery
    import http.server, socketserver, threading
    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f"{ip}:{port}".encode())
    httpd = socketserver.TCPServer(("", 8080), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    await asyncio.gather(
        asyncio.Future(),  # run forever
        broadcast_keypress()
    )

if __name__ == "__main__":
    asyncio.run(main())