from flask import Flask, Response, jsonify
import cv2
import threading
import time
import os
import logging
from typing import Dict, Optional, Union

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

class Camera:
    def __init__(self, source: Union[int, str], name: str):
        """
        Initialize a camera object
        
        Args:
            source: Camera source (0, 1, etc. for USB cameras or URL/IP for network cameras)
            name: A friendly name for this camera
        """
        self.source = source
        self.name = name
        self.cap = None
        self.frame = None
        self.last_frame_time = 0
        self.lock = threading.Lock()
        self.is_running = False
        self.thread = None
    
    def start(self):
        """Start the camera capture thread"""
        if self.is_running:
            return
        
        logger.info(f"Starting camera '{self.name}' from source {self.source}")
        
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop)
        self.thread.daemon = True
        self.thread.start()
    
    def stop(self):
        """Stop the camera capture thread"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
        
        if self.cap:
            self.cap.release()
            self.cap = None
    
    def _capture_loop(self):
        """Main capture loop that runs in a separate thread"""
        try:
            # Initialize the capture
            self.cap = cv2.VideoCapture(self.source)
            
            if not self.cap.isOpened():
                logger.error(f"Failed to open camera '{self.name}' from source {self.source}")
                self.is_running = False
                return
            
            while self.is_running:
                success, frame = self.cap.read()
                
                if not success:
                    logger.warning(f"Failed to read frame from camera '{self.name}'")
                    time.sleep(0.1)
                    continue
                
                with self.lock:
                    self.frame = frame
                    self.last_frame_time = time.time()
                
                # Sleep a bit to avoid consuming too much CPU
                time.sleep(0.03)  # ~30 FPS
                
        except Exception as e:
            logger.exception(f"Error in camera thread for '{self.name}': {e}")
        finally:
            if self.cap:
                self.cap.release()
            
            self.is_running = False
    
    def get_frame(self):
        """Get the latest frame from the camera"""
        with self.lock:
            if self.frame is None:
                return None
            
            # Return a copy to avoid potential threading issues
            return self.frame.copy()
    
    def get_status(self):
        """Get the status of this camera"""
        frame_age = time.time() - self.last_frame_time if self.last_frame_time > 0 else float('inf')
        
        # Convert source to string to ensure it's JSON serializable
        source_str = str(self.source)
        
        return {
            "name": self.name,
            "source": source_str,
            "running": self.is_running,
            "connected": self.is_running and frame_age < 5.0,  # Consider disconnected if no frame for 5 seconds
            "last_frame_age": round(frame_age, 2)
        }

# Global dict to store camera objects
cameras: Dict[str, Camera] = {}

def get_jpg_frame(camera_id):
    """Generate JPEG frames from the camera"""
    camera = cameras.get(camera_id)
    if not camera:
        return None
    
    frame = camera.get_frame()
    if frame is None:
        return None
    
    # Encode frame as JPEG
    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        return None
    
    return buffer.tobytes()

@app.route('/')
def index():
    """Simple index page"""
    camera_links = ""
    for camera_id in cameras:
        camera_links += f'<li><a href="/api/cameras/{camera_id}/stream">Stream: {camera_id}</a> | <a href="/api/cameras/{camera_id}/snapshot">Snapshot: {camera_id}</a></li>'
    
    return f"""
    <html>
      <head>
        <title>Webcam API</title>
      </head>
      <body>
        <h1>Webcam API</h1>
        <h2>Available cameras:</h2>
        <ul>
          {camera_links}
        </ul>
        <p><a href="/api/cameras">View all camera details (JSON)</a></p>
      </body>
    </html>
    """

@app.route('/api/cameras', methods=['GET'])
def list_cameras():
    """Get a list of all cameras"""
    result = {}
    for camera_id, camera in cameras.items():
        result[camera_id] = camera.get_status()
    
    return jsonify(result)

@app.route('/api/cameras/<camera_id>/status', methods=['GET'])
def camera_status(camera_id):
    """Get status of a specific camera"""
    camera = cameras.get(camera_id)
    if not camera:
        return jsonify({"error": f"Camera '{camera_id}' not found"}), 404
    
    return jsonify(camera.get_status())

@app.route('/api/cameras/<camera_id>/stream')
def video_feed(camera_id):
    """Video streaming route for a specific camera"""
    def generate():
        while True:
            frame = get_jpg_frame(camera_id)
            if frame is None:
                time.sleep(0.1)
                continue
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    
    camera = cameras.get(camera_id)
    if not camera:
        return jsonify({"error": f"Camera '{camera_id}' not found"}), 404
    
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/cameras/<camera_id>/snapshot')
def snapshot(camera_id):
    """Get a single snapshot from the camera"""
    frame = get_jpg_frame(camera_id)
    if frame is None:
        return jsonify({"error": "Could not capture frame"}), 500
    
    return Response(frame, mimetype='image/jpeg')

@app.route('/api/cameras/<camera_id>/start', methods=['POST'])
def start_camera(camera_id):
    """Start a camera"""
    camera = cameras.get(camera_id)
    if not camera:
        return jsonify({"error": f"Camera '{camera_id}' not found"}), 404
    
    camera.start()
    return jsonify({"status": "started", "camera": camera.get_status()})

@app.route('/api/cameras/<camera_id>/stop', methods=['POST'])
def stop_camera(camera_id):
    """Stop a camera"""
    camera = cameras.get(camera_id)
    if not camera:
        return jsonify({"error": f"Camera '{camera_id}' not found"}), 404
    
    camera.stop()
    return jsonify({"status": "stopped", "camera": camera.get_status()})

def initialize_cameras():
    """Initialize cameras from configuration"""
    # You would typically load this from a config file
    # For demo purposes, we'll add a few predefined cameras
    
    # USB webcam (typically 0 is the first connected camera)
    cameras["main"] = Camera(2, "Main Camera")
    
    # IP camera example (replace with your actual IP camera URL)
    cameras["ip_cam"] = Camera("http://192.168.18.40:4747/video?640x480", "IP Camera")
    
    # Start all cameras by default
    for camera in cameras.values():
        camera.start()

if __name__ == '__main__':
    initialize_cameras()
    app.run(host='0.0.0.0', port=5000, debug=True)