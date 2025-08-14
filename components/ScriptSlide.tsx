import {View, Text, StyleSheet, Dimensions, ScrollView, FlatList, ActivityIndicator} from 'react-native';
import React, {useEffect, useState, useRef} from 'react';

interface ScriptSlideProps {
  id: number;
  visual: string[];
  colorMemo: string[][] | undefined;
  getColorMemo: (slideIdx: number, wordIdx: number) => string
  groupStart: number
}

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const ScriptSlide: React.FC<ScriptSlideProps> = ({id, visual, colorMemo, getColorMemo, groupStart}) => {
  const scrollViewRef = useRef(null)
  const textPositionsRef = useRef<any>({})

  useEffect(() => {
      console.log('groupStart: ', textPositionsRef.current[groupStart])
  },[groupStart])

  return (
    <View style={styles.container}>
      { visual ? (
        <>
          <Text style={styles.slideHeader}>{`Slide ${id+1}`}</Text>
          <View style={styles.scrollContainer}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              horizontal={false}
              nestedScrollEnabled={true} // android only
            >
              <Text
                style={styles.scriptText}
              >
                {visual.map((word, idx) => (
                    <Text
                      key={idx}
                      style={{color: getColorMemo(id, idx)}}
                      onLayout={(e) => {
                        textPositionsRef.current[idx] = e.nativeEvent.layout.y
                      }}
                    >
                      {word}
                    </Text>
                ))}
                </Text>
            </ScrollView>
          </View>
        </>
      ) : (
        <ActivityIndicator/>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill parent (FlatList page)
  },
  slideHeader: {
    fontSize: 40,
  },
  scrollContainer: {
    height: SCREEN_HEIGHT - 95,
  },
  scrollContent: {
    alignItems: 'center',
  },
  scriptText: {
    paddingLeft: 7,
    paddingRight: 7,
    fontSize: 20
  },

  
});

export default ScriptSlide;
