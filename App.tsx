import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Button,
  Alert,
  Platform,
  PermissionsAndroid,
  ScrollView,
  FlatList,
} from 'react-native';
//import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import ScriptSlide from './components/ScriptSlide.tsx';
import Fuse from 'fuse.js';
import Vosk from 'react-native-vosk';
import axios from 'axios';
import {localip} from './importantID.js';

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
  const flatListRef = useRef<FlatList | null>(null);
  const scrollViewRef = useRef<(ScrollView | null)[]>([]);
  const textPositionsRef = useRef<number[][]>([[]]);
  const wordIdx = useRef({left: 0, right: 1, groupStart: 0});

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
    axios
      .post(`http://${localip}:8000/getScript`)
      .then((res: any) => {
        setScriptData(res?.data);
        textPositionsRef.current = Array.from(
          {length: res?.data.length},
          () => [],
        );
        scrollViewRef.current = Array.from(
          {length: res?.data.length},
          () => null,
        );
        setColorMemo(Array.from({length: res?.data.length}, () => []));
        console.log('getScript success: ', res?.data);
      })
      .catch(e => console.error(e));
  }, []);

  //ScrollTo
  useEffect(() => {
    console.log(scrollViewRef.current[currSlideIdx+1], textPositionsRef.current, wordIdx.current);
    if (startVosk && scrollViewRef.current && scrollViewRef.current[currSlideIdx]) {
      if (wordIdx.current.groupStart >= textPositionsRef.current[currSlideIdx].length) {
        wordIdx.current = {left: 0, right: 1, groupStart: 0}
        flatListRef.current?.scrollToIndex({
          index: currSlideIdx+1,
          animated: true,
        });
        setCurrSlideIdx(prev => (prev+1))
        console.log('next slide: ', currSlideIdx)
      } else {
        console.log(
          'scrollTo: ',
          textPositionsRef.current[currSlideIdx][wordIdx.current.groupStart]
        );
        console.log(scrollViewRef.current);
        scrollViewRef.current[currSlideIdx].scrollTo({
          y: textPositionsRef.current[currSlideIdx][wordIdx.current.groupStart],
          animated: true,
        });
      }
    }
  }, [wordIdx.current.groupStart]);

  const getWordsNo = (phrase: string) => {
    const visualWords = phrase.trim().split(/\s+/);
    const compareWords = visualWords.map(word =>
      word.replace(/[^a-zA-Z]/g, ''),
    );
    return compareWords.length;
  };

  const groupWords = (idx: number, length: number) => {
    let res = [];
    const start = Math.min(wordIdx.current.left, wordIdx.current.groupStart);
    const end = Math.min(wordIdx.current.right, scriptData[idx].compare.length);
    for (let i = start; i < end; ++i) {
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
      console.log(candidates);
      if (len > 2 && candidates.length > 0) {
        axios
          .post(`http://${localip}:8000/matchScript`, {
            actual: res,
            candidates: JSON.stringify(candidates),
            threshold: 0.9,
          })
          .then(res => {
            if (res.status === 200) {
              const end = res.data.text.end;
              updateColorMemo(
                currSlideIdx,
                wordIdx.current.groupStart,
                end,
                'green',
              );
              console.log(res?.data, wordIdx.current.groupStart, end);
              wordIdx.current.groupStart = end;
              wordIdx.current.left = end;
              if (wordIdx.current.right < end) {
                wordIdx.current.right = end + 1;
              }
            }
          })
          .catch(e => {
            console.error(e);
          });
      }
    });

    const partialResultEvent = vosk.onPartialResult((res: any) => {
      console.log('partialResult: ', res, wordIdx.current);
      const closest = searchInScript(currSlideIdx, wordIdx.current, res?.text);
      if (closest) {
        let color = 'red';
        if (closest.score === 0) {
          color = 'orange';
        }
        updateColorMemo(
          currSlideIdx,
          closest.refIndex,
          closest.refIndex + 1,
          color,
        );
        if ( wordIdx.current.right < closest.refIndex) {
          wordIdx.current.right = closest.refIndex + 1;
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
        ref={flatListRef}
        style={styles.scriptSlideContainer}
        data={scriptData}
        renderItem={({item}) => (
          <ScriptSlide
            id={item.id}
            visual={item.visual}
            getColorMemo={getColorMemo}
            scrollViewRef={scrollViewRef.current}
            textPositionsRef={textPositionsRef.current}
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
    padding: 15,
  },
  scriptSlideContainer: {
    backgroundColor: '#FFF',
  },
});

export default App;
