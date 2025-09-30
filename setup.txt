### Connecting real device to app:

# Check if Android Debug Brdige is in the system's PATH:

adb version

# If not, run following in terminal

export PATH=$PATH:~/Library/Android/sdk/platform-tools 
source ~/.zshrc

# Check connected devices:

adb devices




### Testing on Android Device:

npx react-native run-android




### Establishing WebSocket Connection:

# Run websocket service code:
python3 ws_listener.py

## IF ABOVE DOES NOT WORK
# First, start virtual environment:

source activate venv 

# To close virtual environment:

source deactivate

