import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { ReactNode } from 'react';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children,
  style,
  textStyle,
}: ButtonProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
    >
      {children || <Text style={textStyles}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#2563EB',
  },
  secondary: {
    backgroundColor: '#64748B',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  disabled: {
    backgroundColor: '#E5E7EB',
  },
  smallSize: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mediumSize: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  largeSize: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#2563EB',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});