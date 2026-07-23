import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Basado en el ancho estándar (iPhone 11/12/13/Pro)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
