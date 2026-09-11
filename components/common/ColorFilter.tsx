import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ColorFamily, COLOR_FAMILIES } from '@/utils/colors';

interface ColorFamilySelectorProps {
  selectedFamily: string;
  onSelectFamily: (family: string) => void;
  showAllOption?: boolean;
}

export default function ColorFamilySelector({
  selectedFamily,
  onSelectFamily,
  showAllOption = true
}: ColorFamilySelectorProps) {
  
  const renderColors = (family: string) => {
    if (family === 'ALL') {
      const containerWidth = 4 * 12 + 8;
      return (
        <View style={[styles.colorCirclesContainer, { width: containerWidth }]}>
          <View style={[styles.miniCircle, { backgroundColor: '#000000', left: 0 }]} />
          <View style={[styles.miniCircle, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', left: 12 }]} />
          <View style={[styles.miniCircle, { backgroundColor: '#FF0000', left: 24 }]} />
          <View style={[styles.miniCircle, { backgroundColor: '#0000FF', left: 36 }]} />
        </View>
      );
    }
    
    const familyData = COLOR_FAMILIES.find(f => f.family.toUpperCase() === family.toUpperCase());
    if (!familyData) return null;

    // Display all colors in the family
    const previewColors = familyData.colors;
    const containerWidth = previewColors.length * 12 + 8;
    
    return (
      <View style={[styles.colorCirclesContainer, { width: containerWidth }]}>
        {previewColors.map((color, index) => (
          <View 
            key={`${color.hex}-${index}`}
            style={[
              styles.miniCircle, 
              { 
                backgroundColor: color.hex, 
                left: index * 12,
                borderWidth: color.hex.toLowerCase() === '#ffffff' ? 1 : 0,
                borderColor: '#E2E8F0'
              }
            ]} 
          />
        ))}
      </View>
    );
  };

  const families = showAllOption 
    ? ['ALL', ...COLOR_FAMILIES.map(f => f.family)]
    : COLOR_FAMILIES.map(f => f.family);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {families.map((fam) => {
        const isSelected = selectedFamily.toUpperCase() === fam.toUpperCase();
        
        return (
          <TouchableOpacity
            key={fam}
            style={[
              styles.chip,
              isSelected && styles.chipSelected
            ]}
            onPress={() => onSelectFamily(fam)}
          >
            <Text style={[
              styles.chipText,
              isSelected && styles.chipTextSelected
            ]}>
              {fam.toUpperCase()}
            </Text>
            
            {renderColors(fam)}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  contentContainer: {
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 120,
    justifyContent: 'space-between',
    marginRight: 12, // fallback for older RN versions
  },
  chipSelected: {
    backgroundColor: '#F1F5F9',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 16,
    letterSpacing: 0.5,
  },
  chipTextSelected: {
    color: '#0F172A',
  },
  colorCirclesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 20,
    width: '100%',
  },
  miniCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FFFFFF', // To create the overlap stroke effect
  },
});
