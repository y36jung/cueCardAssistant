# 📱 Virtual Cue Card Assistant

## ✨ Motivation
The current form of presentation is terrible. Flipping through cue cards, controlling slides, and the short pauses during slide transitions felt long enough to break the immersion of story-telling, which is not ideal for the generation's tendency to reach for their mobile devices.

To solve this problem, I have built a mobile app using React Native. The Virtual Cue Card Assistant is an app that detects voice input and tracks the progress of the script reading, similar to that of a karaoke machine.

Using FastAPI, voice recognition and semantic search AI models are leveraged for the functionalities stated above. With the addition of WebSocket connections between the app and the presentation computer, the slides are automatically controlled by speech for smooth, hands-free transition of slides.


## 🛑 Disclaimer
This is simply a personal side-project done for my own learning.

## 📚 Tech Stack
### 👁️ Frontend:
- React-Native (TypeScript)

### 🤝 Backend:
- FastAPI (Python)

### 🧠 AI Models:
- [Vosk AI (Voice Recognition)](https://alphacephei.com/vosk/)
- [sentence-transformers/all-MiniLM-L6-v2 (Semantic Search)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)


## 🛠️ Functionalities
- Takes voice input and indicates said words in green on current page
- Page scolls (if possible) such that detected words are positioned to the top of the screen
- Once all words are detected in current page, the app turns to the next page


## 🤔 Future Improvements/Add-ons
- Integrate on-device AI model for semantic search for improved processing speed
- Integrate WebSocket connection for automated slide transitions
- Integrate local/online script storage system via local storage and GCP
- Improve UX/UI for smoother user experience


## 👀 Tech Demos
- [Interim Tech Demo 1](https://www.youtube.com/watch?v=R-6jZCe5FfE)
