from fastapi import FastAPI, Request
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

# Will be used to fully confirm if a line has been said
## Logic:
### When isFinal = true, get start index (x), end index (y), length of text (l)
### Via chosen API route send the following data:
#### text, an array of subtrings of script.slice(x,y) with max length of l
#### * each element of the array should be {text, end index}
### run python component
### receive the end index of the match with highest score
### color all words until end index to green
### set startIndex = endIndex

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

class MatchRequest(BaseModel):
    text: str
    cand: str

@app.post("/matchScript")
def matchScript(data: MatchRequest):
    print(data)
    speech = data.text
    textCand = json.loads(data.cand)
    speechEncode = model.encode(speech, convert_to_tensor=True)
    textCandEncode = model.encode(textCand, convert_to_tensor=True)
    similarities = model.similarity(speechEncode, textCandEncode)
    matches = []
    for idx_j, cand in enumerate(textCand):
        matches.append({
            "index": cand.index,
            "score": similarities[0][idx_j]
        })
    
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches[0].index



