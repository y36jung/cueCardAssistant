import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import React, {useEffect, useState, useRef} from 'react';

interface ScriptSlideProps {
  id: number;
  visual: string[];
  getColorMemo: (slideIdx: number, wordIdx: number) => string;
  scrollViewRef: (ScrollView | null)[];
  textPositionsRef: number[][]
}

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const ScriptSlide: React.FC<ScriptSlideProps> = ({
  id,
  visual,
  getColorMemo,
  scrollViewRef,
  textPositionsRef
}) => {
  
  return (
    <View style={styles.container}>
      {visual ? (
        <>
          <Text style={styles.slideHeader}>{`Slide ${id + 1}`}</Text>
          <View style={styles.scrollContainer}>
            <ScrollView
              ref={(el) => {scrollViewRef[id]= el}}
              contentContainerStyle={styles.scrollContent}
              horizontal={false}
              nestedScrollEnabled={true} // android only
            >
              <View style={styles.textContainer}>
                {visual.map((word, idx) => (
                  <Text
                    key={idx}
                    style={{...styles.scriptText, color: getColorMemo(id, idx)}}
                    onLayout={e => {
                      textPositionsRef[id][idx] = e.nativeEvent.layout.y
                    }}>
                    {word}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill parent (FlatList page)
  },
  textContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingLeft: 7,
    paddingRight: 7
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
    fontSize: 20,
  },
});

export default ScriptSlide;
