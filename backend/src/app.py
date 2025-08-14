from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
import json, string, os


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

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
 

@app.post("/test")
def test():
    return {"success": "Connection to test is a success!"}


@app.post('/getScript')
def getScript():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    filePath = os.path.join(base_dir, '../../db/script.json')
    try:
        with open(filePath, 'r') as file:
            scriptData = json.load(file)
            res = []
            for script in scriptData:
                slideScript = script["content"].strip().split()
                punc = ['.',',','!','?',':',';']
                visualScript = []
                compareScript = []
                translator = str.maketrans('','',string.punctuation)
                scriptPhrase = []
                phraseIndex = []
                phrase = ''
                start = 0
                for index, word in enumerate(slideScript):
                    compareScript.append(word.translate(translator))
                    visualScript.append(word + ' ')
                    phrase += word + ' '
                    hasPunc = False
                    for char in word:
                        if char in punc:
                            hasPunc = True
                    if hasPunc:
                        phraseIndex.append([start, index])
                        start = index + 1
                        scriptPhrase.append(phrase)
                        phrase = ''
                res.append({
                    "id": script["id"],
                    "visual": visualScript,
                    "compare": compareScript,
                    "phrase": scriptPhrase,
                    "phraseIndex": phraseIndex
                })
            return res
    except FileNotFoundError:
        print(f"Error: The file '{filePath}' was not found.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{filePath}'. Check if the file contains valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

class ScriptRequest(BaseModel):
    actual: str
    candidates: str
    threshold: float


@app.post("/matchScript")
def matchScript(req: ScriptRequest):
    candidates = json.loads(req.candidates)
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    actualEncode = model.encode(req.actual, convert_to_tensor=True)
    candidatesEncode = model.encode(candidates, convert_to_tensor=True)
    similarities = model.similarity(actualEncode, candidatesEncode)
    matches = []

    for idx_j, text in enumerate(candidates):
        score = similarities[0][idx_j].item()
        res = {
            "text": text,
            "index": idx_j,
            "score": score
        }
        if score >= req.threshold:
            return res
        else:
            matches.append(res)
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches[0]