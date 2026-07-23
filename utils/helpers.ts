import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const getResponsiveSize = (baseSize: number) => {
  const scale = width / 375;
  const newSize = baseSize * scale;
  return Math.max(newSize, baseSize * 0.8);
};

export const getResponsiveHeight = (baseHeight: number) => {
  const scale = height / 812;
  return Math.max(baseHeight * scale, baseHeight * 0.7);
};

export const formatPhoneNumber = (text: string) => {
  const numericValue = text.replace(/[^0-9]/g, "");
  if (numericValue.length <= 3) return numericValue;
  if (numericValue.length <= 6)
    return `${numericValue.slice(0, 3)}-${numericValue.slice(3)}`;
  return `${numericValue.slice(0, 3)}-${numericValue.slice(
    3,
    6
  )}-${numericValue.slice(6, 10)}`;
};

export const formatProperCase = (name: string | undefined) => {
  if (!name) {
    return "";
  }
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatClientPhone = (text: string) => {
  const numericValue = text.replace(/[^0-9]/g, "");
  if (numericValue.length === 0) return "";
  if (numericValue.length <= 3) return `(${numericValue}`;
  if (numericValue.length <= 6)
    return `(${numericValue.slice(0, 3)})-${numericValue.slice(3)}`;
  return `(${numericValue.slice(0, 3)})-${numericValue.slice(
    3,
    6
  )}-${numericValue.slice(6, 10)}`;
};
