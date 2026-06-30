import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { colors, tilePalette, fonts, sp, r } from '@/constants/theme';

const { width } = Dimensions.get('window');
const TILE_GAP = sp.sm;
const TILE_W = (width - sp.lg * 2 - TILE_GAP) / 2;

const SMALL_TILES = [
  {
    key: 'tasks',
    symbol: '✦',
    name: 'Tasks',
    desc: 'Projects & to-dos',
    gradient: [tilePalette.tasks.from, tilePalette.tasks.to] as [string, string],
    route: '/tasks' as const,
  },
  {
    key: 'journal',
    symbol: '✍',
    name: 'Journal',
    desc: 'Daily reflections',
    gradient: [tilePalette.journal.from, tilePalette.journal.to] as [string, string],
    route: '/journal' as const,
  },
  {
    key: 'habits',
    symbol: '◎',
    name: 'Goals',
    desc: 'Habits & growth',
    gradient: [tilePalette.habits.from, tilePalette.habits.to] as [string, string],
    route: '/habits' as const,
  },
  {
    key: 'calendar',
    symbol: '⬡',
    name: 'Calendar',
    desc: 'Events & schedule',
    gradient: [tilePalette.calendar.from, tilePalette.calendar.to] as [string, string],
    route: '/calendar' as const,
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const now = new Date();

  return (
    <View style={[styles.bg, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + sp.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <Text style={styles.logo}>lifeOS</Text>
          <Text style={styles.tagline}>Your life, organised</Text>
          <Text style={styles.dateStr}>
            {format(now, 'EEEE, d MMMM yyyy').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.greeting}>Good {greeting()}.</Text>

        {/* Finance — featured full-width tile */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/finance')}
          style={styles.featureTileWrap}
        >
          <LinearGradient
            colors={['#454d3c', '#2c2f26']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureTile}
          >
            <View style={styles.stripe} />
            <View style={styles.featureInner}>
              <View>
                <Text style={styles.featureSymbol}>💸</Text>
                <Text style={styles.featureName}>Finance</Text>
                <Text style={styles.featureDesc}>
                  Budget, accounts, savings, loans & transactions
                </Text>
              </View>
              <Text style={styles.featureArrow}>→</Text>
            </View>
            <View style={styles.featureStats}>
              {['Accounts', 'Budget', 'Goals', 'Loans'].map(lbl => (
                <View key={lbl} style={styles.featureStat}>
                  <Text style={styles.featureStatVal}>—</Text>
                  <Text style={styles.featureStatLbl}>{lbl}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 2×2 grid */}
        <View style={styles.grid}>
          {SMALL_TILES.map(s => (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.82}
              onPress={() => router.push(s.route)}
              style={{ width: TILE_W }}
            >
              <LinearGradient
                colors={s.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tile}
              >
                <View style={styles.stripe} />
                <Text style={styles.tileSymbol}>{s.symbol}</Text>
                <Text style={styles.tileName}>{s.name}</Text>
                <Text style={styles.tileDesc}>{s.desc}</Text>
                <Text style={styles.tileArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.foot}>lifeOS · Your Life, Organised</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.homeBg },
  scroll: { paddingHorizontal: sp.lg, paddingTop: sp.lg },

  wordmark: { alignItems: 'center', marginBottom: sp.xl },
  logo: { fontFamily: fonts.serif, fontSize: 58, color: colors.light, letterSpacing: -1, lineHeight: 68 },
  tagline: { fontFamily: fonts.monoLight, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: colors.lightMuted, marginTop: 6 },
  dateStr: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.lightFaint, marginTop: 4, letterSpacing: 1 },

  greeting: { fontFamily: fonts.serif, fontSize: 26, color: 'rgba(241,237,228,0.65)', marginBottom: sp.lg },

  // Featured Finance tile
  featureTileWrap: { marginBottom: TILE_GAP },
  featureTile: {
    borderRadius: r.lg, padding: sp.lg,
    borderWidth: 1, borderColor: 'rgba(241,237,228,0.1)',
    overflow: 'hidden',
  },
  featureInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  featureSymbol: { fontSize: 26, marginBottom: sp.xs },
  featureName: { fontFamily: fonts.serif, fontSize: 28, color: colors.light, letterSpacing: -0.5 },
  featureDesc: { fontFamily: fonts.sans, fontSize: 12, color: 'rgba(241,237,228,0.48)', marginTop: 3, lineHeight: 18 },
  featureArrow: { color: 'rgba(241,237,228,0.4)', fontFamily: fonts.sans, fontSize: 20 },
  featureStats: {
    flexDirection: 'row', gap: sp.md, marginTop: sp.md,
    borderTopWidth: 1, borderTopColor: 'rgba(241,237,228,0.12)', paddingTop: sp.sm,
  },
  featureStat: { flex: 1 },
  featureStatVal: { fontFamily: fonts.serifReg, fontSize: 14, color: colors.light },
  featureStatLbl: { fontFamily: fonts.monoLight, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(241,237,228,0.32)', marginTop: 2 },

  // Small tiles
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    borderRadius: r.lg, padding: sp.md, paddingBottom: sp.xl,
    minHeight: 150,
    borderWidth: 1, borderColor: 'rgba(241,237,228,0.1)',
    overflow: 'hidden',
  },
  tileSymbol: { fontSize: 18, color: 'rgba(241,237,228,0.8)', marginBottom: sp.xs },
  tileName: { fontFamily: fonts.serif, fontSize: 20, color: colors.light, letterSpacing: -0.5, marginBottom: 3 },
  tileDesc: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(241,237,228,0.45)', lineHeight: 16 },
  tileArrow: { position: 'absolute', bottom: sp.sm, right: sp.sm, color: 'rgba(241,237,228,0.3)', fontFamily: fonts.sans, fontSize: 14 },

  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(241,237,228,0.18)' },

  foot: { textAlign: 'center', marginTop: sp.xl, fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(241,237,228,0.2)' },
});
