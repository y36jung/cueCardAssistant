import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Button,
  Alert,
  Platform,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

import ScriptSlide from './components/ScriptSlide.tsx';

import Fuse from 'fuse.js';

import Vosk from 'react-native-vosk';

import axios from 'axios';

import { localip, port } from './importantID.js';
/*
Design for Script Matching
- Receive script data
- Process and save script content to be suitable for script matching
  - remove any characters that are not alphabets (if there are numbers, convert them into phonetic words)
  - Save script content as array of substring with each element of array being with groups of 4~5 words

- Record live transcription

- Script match during transcription
  - Suppose there is a range [a,b] that measures the correctness of transcription to script
  - Suppose x is the value of correctness for a specific group of words. Then:
    - If a <= x <= b --> consider as 'correct'
    - If a+c <= x <= b+c where c > 0 is some arbitrary number --> consider as 'tolerable'
    - else --> consider as 'wrong'
  - IMPORTANT: Only move to next group of words if the match result of the recent group is not 'wrong'
** Users will be given choice to calibrate these numbers in order to increase script matching accuracy

- Provide users with live indicators of script matching
  - If 'correct' --> font color green
  - If 'tolerable' --> font color orange
  - else --> font color red

- Slide transition based on result of script matching
  - Transition to next slide if:
    - Last group of words in current slide is 'correct'
    - Last group of words in current slide is 'tolerable', and a certain percentage of other group of words are 'equal' (maybe 0.90)
    - First group of words in next slide is 'correct'
*/

// THIS MAY REQUIRE THE SYSTEM TO BE DESIGNED AS SUCH:
//  - Frontend: react-native
//  - Backend: Python (FastAPI)
//      - Script processing
//      - Training tokenizers
//      - Encoding via tokenizers
//      - Semantic Search

/* 
Training Tokenizer (when script is rendering)
- Get pretrained training corpus of text
- Get new training corpus using script of presentation
- Train tokenizer of old training corpus using new training corpus
- Save this tokenizer and use for encoding and semantic search


Design for implementing semantic search via onnx runtime
- Partition script into array of strings (PHRASES), where each string is a 'phrase' of the script
  -  a 'phrase' will be defined by the upcoming punctuation mark
    (period, comma, colon, semi-colon, closed-parenthesis, hyphen, dash, question mark, exclamation mark)
- encode PHRASES using tokenizer on initial render, and store data in react hook or ref?
- Upon onResult event, encode result using tokenizer
- Run a loop on PHRASES and compute cosin similarity with result and get the best match

*/

const App: React.FC = () => {
  const vosk = useRef(new Vosk()).current;
  const [startVosk, setStartVosk] = useState<boolean>(false);
  const [scriptData, setScriptData] = useState<any[]>([
    {
      id: 0,
      visual: [''],
      compare: [''],
    },
  ]);
  const [colorMemo, setColorMemo] = useState<Array<Array<string>>>();
  const fuseOptions = {
    includeScore: true,
  };
  const [currSlideIdx, setCurrSlideIdx] = useState<number>(0);
  let wordIdx = {left: 0, right: 1, groupStart: 0};

  const updateColorMemo = (
    slideIdx: number,
    startIdx: number,
    endIdx: number,
    color: string,
  ) => {
    setColorMemo(prev => {
      const safePrev = prev ?? [];
      const newArr = [...safePrev];
      newArr[slideIdx] = [...(newArr[slideIdx] ?? [])];
      for (let i = startIdx; i < endIdx; ++i) {
        newArr[slideIdx][i] = color;
      }
      return newArr;
    });
  };

  const getColorMemo = (slideIdx: number, wordIdx: number): string => {
    if (colorMemo && colorMemo[slideIdx] && colorMemo[slideIdx][wordIdx]) {
      return colorMemo[slideIdx][wordIdx];
    }
    return 'black';
  };

  // Fetch script data
  useEffect(() => {
    axios.post(`http://${localip}:${port}/getScript`)
      .then((res: any) => {
        setScriptData(res?.data)
        setColorMemo(Array.from({length: res?.data.length}, () => []))
        console.log('getScript success: ', res?.data)
      })
      .catch((e) => console.error(e))
  }, []);

  const getWordsNo = (phrase: string) => {
    const visualWords = phrase.trim().split(/\s+/);
    const compareWords = visualWords.map(word =>
      word.replace(/[^a-zA-Z]/g, ''),
    );
    return compareWords.length;
  };

  const groupWords = (idx: number, length: number) => {
    let res = [];
    for (let i = 0; i < scriptData[idx].compare.length; ++i) {
      const phrase = scriptData[idx].compare.slice(i, i + length).join(' ');
      res.push({
        phrase: phrase,
        start: i,
        end: i + length,
      });
    }
    return res;
  };

  // const requestMicrophonePermission = async () => {
  //   if (Platform.OS === 'android') {
  //     const granted = await PermissionsAndroid.request(
  //       PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  //       {
  //         title: 'Microphone Permission',
  //         message:
  //           'This app needs access to your microphone for voice commands.',
  //         buttonNeutral: 'Ask Me Later',
  //         buttonNegative: 'Cancel',
  //         buttonPositive: 'OK',
  //       },
  //     );
  //     return granted === PermissionsAndroid.RESULTS.GRANTED;
  //   } else {
  //     const result = await request(PERMISSIONS.IOS.MICROPHONE);
  //     return result === RESULTS.GRANTED;
  //   }
  // };

  // // Start recognition if permitted
  // const startRecognitionIfPermitted = async () => {
  //   const hasPermission = await requestMicrophonePermission();
  //   console.log('Microphone permission granted:', hasPermission);
  //   if (!hasPermission) {
  //     Alert.alert(
  //       'Permission Denied',
  //       'Microphone access is required for voice commands. Please enable it in settings.',
  //     );
  //     return;
  //   }
  //   VoskModuleService.startRecognition();
  // };

  const searchInScript = (scriptIdx: number, wordIdx: any, word: string) => {
    const fuse = new Fuse(scriptData[scriptIdx].compare, fuseOptions);
    const result = fuse
      .search(word)
      .filter(item => wordIdx.left <= item.refIndex);
    return result[0];
  };

  const startRec = () => {
    vosk
      .loadModel('model-android')
      .then(() => {
        vosk.start().then(() => {
          console.log('react-native-vosk started!');
          setStartVosk(true);
        });
      })
      .catch(e => {
        console.error(e);
      });
  };

  const stopRec = () => {
    vosk.stop();
    vosk.unload();
    setStartVosk(false);
  };

  useEffect(() => {
    const resultEvent = vosk.onResult(async res => {
      const len = getWordsNo(res);
      const candidates = groupWords(currSlideIdx, len);
      console.log(candidates)
      if (len > 2) {
        // ipconfig getifaddr en0
        axios
          .post(`http://${localip}:${port}/matchScript`, {
            actual: res,
            candidates: JSON.stringify(candidates),
            threshold: 0.9
          })
          .then(res => {
            if (res.status === 200) {
              const end = res.data.text.end
              updateColorMemo(currSlideIdx, wordIdx.groupStart, end, 'green');
              console.log(res?.data, wordIdx.groupStart, end);
              wordIdx.groupStart = end
              wordIdx.left = wordIdx.groupStart
              wordIdx.right = wordIdx.left + 1
            }
          })
          .catch(e => {
            console.error(e);
          });
      }
    });

    const partialResultEvent = vosk.onPartialResult((res: any) => {
      console.log('partialResult: ', res);
      const closest = searchInScript(currSlideIdx, wordIdx, res?.text);
      if (closest) {
        let color = 'red';
        if (closest.score === 0) {
          color = 'green';
        }
        if (closest.refIndex <= wordIdx.right) {
          updateColorMemo(
            currSlideIdx,
            closest.refIndex,
            closest.refIndex + 1,
            color,
          );
          wordIdx.left = closest.refIndex + 1;
          wordIdx.right = closest.refIndex + 1;
        } else {
          wordIdx.right = wordIdx.right + 1;
        }
      }
    });

    const finalResultEvent = vosk.onFinalResult(res => {
      console.log('finalResult: ', res);
    });

    const errorEvent = vosk.onError(e => {
      console.error(e);
    });

    return () => {
      resultEvent.remove();
      partialResultEvent.remove();
      finalResultEvent.remove();
      errorEvent.remove();
    };
  }, [vosk, scriptData, currSlideIdx]);

  return (
    <View style={styles.container}>
      <Button
        title={startVosk ? 'Stop Recording' : 'Start Recording'}
        onPress={startVosk ? stopRec : startRec}
      />
      <FlatList
        style={styles.scriptSlideContainer}
        data={scriptData}
        renderItem={({item}) => (
          <ScriptSlide
            id={item.id}
            visual={item.visual}
            colorMemo={colorMemo}
            getColorMemo={getColorMemo}
            groupStart={wordIdx.groupStart}
          />
        )}
        pagingEnabled={true}
        horizontal={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  scriptSlideContainer: {
    backgroundColor: '#FFF',
  },
});

export default App;
