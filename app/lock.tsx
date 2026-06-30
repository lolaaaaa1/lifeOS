import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, sp, r } from '@/constants/theme';
import { pinStore } from '@/lib/pinStore';

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'loading' | 'enter' | 'setup' | 'confirm'>('loading');
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    pinStore.get().then(stored => {
      setMode(stored ? 'enter' : 'setup');
    });
  }, []);

  const triggerShake = () => {
    setShake(true);
    Vibration.vibrate(400);
    setTimeout(() => { setShake(false); setPin(''); }, 500);
  };

  const handleDigit = (d: string) => {
    if (d === '') return;
    if (d === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    const next = pin + d;
    setPin(next);

    if (next.length < 4) return;

    if (mode === 'enter') {
      pinStore.get().then(stored => {
        if (next === stored) {
          router.replace('/');
        } else {
          triggerShake();
        }
      });
    } else if (mode === 'setup') {
      setSetupPin(next);
      setPin('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (next === setupPin) {
        pinStore.set(next).then(() => router.replace('/'));
      } else {
        triggerShake();
        setMode('setup');
        setSetupPin('');
      }
    }
  };

  if (mode === 'loading') return <View style={styles.bg} />;

  const label =
    mode === 'setup' ? 'Create your PIN' :
    mode === 'confirm' ? 'Confirm your PIN' :
    'Enter your PIN';

  return (
    <View style={[styles.bg, { paddingTop: insets.top, paddingBottom: insets.bottom + sp.lg }]}>
      <Text style={styles.logo}>lifeOS</Text>

      <Text style={styles.label}>{label}</Text>

      {/* Dots */}
      <View style={[styles.dots, shake && styles.dotsShake]}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>

      {/* Numpad */}
      <View style={styles.pad}>

        {DIGITS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((d, di) => (
              <TouchableOpacity
                key={di}
                style={[styles.key, d === '' && styles.keyGhost]}
                onPress={() => handleDigit(d)}
                activeOpacity={d === '' ? 1 : 0.6}
              >
                <Text style={[styles.keyTxt, d === '⌫' && styles.keyBack]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {mode === 'enter' && (
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() =>
            Alert.alert(
              'Reset PIN',
              'This will clear your PIN and let you set a new one. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => {
                    pinStore.clear().then(() => {
                      setPin('');
                      setSetupPin('');
                      setMode('setup');
                    });
                  },
                },
              ]
            )
          }
        >
          <Text style={styles.resetTxt}>Forgot PIN?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.homeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: fonts.serif,
    fontSize: 42,
    color: colors.light,
    letterSpacing: -1,
    marginBottom: sp.xxl,
  },
  label: {
    fontFamily: fonts.monoLight,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.lightMuted,
    textTransform: 'uppercase',
    marginBottom: sp.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: sp.xxl,
  },
  dotsShake: {
    transform: [{ translateX: 8 }],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(241,237,228,0.35)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.light,
    borderColor: colors.light,
  },
  pad: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(241,237,228,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyTxt: {
    fontFamily: fonts.serifReg,
    fontSize: 28,
    color: colors.light,
  },
  keyBack: {
    fontFamily: fonts.sans,
    fontSize: 22,
  },
  resetBtn: { marginTop: sp.xl },
  resetTxt: {
    fontFamily: fonts.monoLight,
    fontSize: 11,
    color: 'rgba(241,237,228,0.35)',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
});
