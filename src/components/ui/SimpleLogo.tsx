import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface SimpleLogoProps {
  size?: number;
  showBrand?: boolean;
  brandSize?: number;
  color?: string;
}

export const SimpleLogo: React.FC<SimpleLogoProps> = ({ 
  size = 32, 
  showBrand = true, 
  brandSize = 20,
  color = Colors.primary
}) => {
  return (
    <View style={styles.container}>
      {/* Logo design inspired by compass/star shape */}
      <View style={[styles.logoContainer, { width: size, height: size }]}>
        {/* Outer compass points */}
        <View style={[styles.outerStar, { width: size, height: size, borderColor: color }]}>
          {/* Four main compass points */}
          <View style={[styles.compassPoint, styles.topPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.bottomPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.leftPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.rightPoint, { backgroundColor: color }]} />
          
          {/* Diagonal points */}
          <View style={[styles.compassPoint, styles.topLeftPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.topRightPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.bottomLeftPoint, { backgroundColor: color }]} />
          <View style={[styles.compassPoint, styles.bottomRightPoint, { backgroundColor: color }]} />
        </View>
        
        {/* Center square with H */}
        <View style={[styles.centerSquare, { 
          width: size * 0.4, 
          height: size * 0.4,
          borderColor: color,
        }]}>
          <Text style={[styles.centerText, { 
            fontSize: size * 0.25, 
            color: color 
          }]}>
            H
          </Text>
        </View>
      </View>
      
      {showBrand && (
        <Text style={[styles.brandText, { fontSize: brandSize, color: Colors.text.primary }]}>
          HEIMURSAGA
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  
  logoContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  outerStar: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
  },
  
  compassPoint: {
    position: 'absolute',
    width: 3,
    height: 12,
  },
  
  // Main compass points
  topPoint: {
    top: -6,
    left: '50%',
    marginLeft: -1.5,
  },
  
  bottomPoint: {
    bottom: -6,
    left: '50%',
    marginLeft: -1.5,
  },
  
  leftPoint: {
    left: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 3,
  },
  
  rightPoint: {
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 3,
  },
  
  // Diagonal points
  topLeftPoint: {
    top: -4,
    left: -4,
    transform: [{ rotate: '45deg' }],
  },
  
  topRightPoint: {
    top: -4,
    right: -4,
    transform: [{ rotate: '-45deg' }],
  },
  
  bottomLeftPoint: {
    bottom: -4,
    left: -4,
    transform: [{ rotate: '-45deg' }],
  },
  
  bottomRightPoint: {
    bottom: -4,
    right: -4,
    transform: [{ rotate: '45deg' }],
  },
  
  centerSquare: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  centerText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  brandText: {
    fontWeight: '400',
    letterSpacing: 2,
    marginTop: 8,
  },
});