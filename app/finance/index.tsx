import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  Animated, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fonts, sp, r } from '@/constants/theme';
import {
  fmt, monthKey, CURRENCIES, Currency,
  type FinanceSettings, type Transaction, type Account,
} from '@/constants/financeTypes';
import {
  finSettings, transactions as txnStore,
  accounts as accStore, finGoals, loans as loanStore, uid,
} from '@/lib/financeStore';

const NAV = [
  { label: 'Transactions', icon: 'receipt-outline' as const, route: '/finance/transactions' },
  { label: 'Budget',       icon: 'pie-chart-outline' as const, route: '/finance/budget' },
  { label: 'Accounts',     icon: 'wallet-outline' as const, route: '/finance/accounts' },
  { label: 'Goals',        icon: 'flag-outline' as const, route: '/finance/goals' },
  { label: 'Loans',        icon: 'swap-horizontal-outline' as const, route: '/finance/loans' },
];

const TXN_TYPE_COLOR: Record<string, string> = {
  income: colors.green,
  expense: colors.red,
  saving: colors.gold,
  transfer: colors.muted,
};

const DRAWER_WIDTH = 260;

export default function FinanceDashboard() {
  const insets = useSafeAreaInsets();
  const [cfg, setCfg] = useState<FinanceSettings>({ income: 0, incomeCurrency: 'GHS', defaultCurrency: 'GHS', currentMonth: monthKey() });
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [goalsCount, setGoalsCount] = useState(0);
  const [loansCount, setLoansCount] = useState(0);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  };
  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }).start(() => setDrawerOpen(false));
  };

  // Income modal
  const [showIncome, setShowIncome] = useState(false);
  const [incomeVal, setIncomeVal] = useState('');
  const [incomeCur, setIncomeCur] = useState<Currency>('GHS');

  const load = useCallback(async () => {
    const [s, txns, accs, gs, ls] = await Promise.all([
      finSettings.get(),
      txnStore.getAll(),
      accStore.getAll(),
      finGoals.getAll(),
      loanStore.getAll(),
    ]);
    setCfg(s);
    setAllTxns(txns);
    setAllAccounts(accs);
    setGoalsCount(gs.length);
    setLoansCount(ls.filter(l => l.status === 'outstanding').length);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const thisMonth = cfg.currentMonth;
  const monthTxns = allTxns.filter(t => t.month === thisMonth);
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount + t.charges, 0);
  const savings = monthTxns.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses - savings;

  const totalBalance = allAccounts.reduce((s, a) => s + a.balance, 0);
  const recent = allTxns.slice(0, 5);

  const saveIncome = async () => {
    const updated = { ...cfg, income: parseFloat(incomeVal) || 0, incomeCurrency: incomeCur };
    await finSettings.set(updated);
    setShowIncome(false);
    load();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
          <Ionicons name="menu-outline" size={24} color={colors.inkLight} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>lifeOS</Text>
          <Text style={styles.title}>Personal Finance</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/finance/transactions')} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Drawer */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { paddingTop: insets.top, transform: [{ translateX: drawerAnim }] }]}>
          <Text style={styles.drawerTitle}>Finance</Text>
          <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); router.canGoBack() ? router.back() : router.replace('/'); }}>
            <Ionicons name="arrow-back-outline" size={18} color="rgba(241,237,228,0.6)" />
            <Text style={styles.drawerItemTxt}>Home</Text>
          </TouchableOpacity>
          <View style={styles.drawerDivider} />
          {NAV.map(n => (
            <TouchableOpacity key={n.label} style={styles.drawerItem} onPress={() => { closeDrawer(); router.push(n.route as any); }}>
              <Ionicons name={n.icon} size={18} color="rgba(241,237,228,0.6)" />
              <Text style={styles.drawerItemTxt}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Hero — Total Balance */}
        <LinearGradient colors={['#3f4633', '#2c2f26']} style={styles.hero}>
          <Text style={styles.heroLbl}>Total Balance</Text>
          <Text style={styles.heroVal}>{fmt(totalBalance, cfg.defaultCurrency)}</Text>

          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLbl}>Income this month</Text>
              <Text style={styles.heroStatVal}>{fmt(income, cfg.defaultCurrency)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLbl}>Monthly income</Text>
              <TouchableOpacity onPress={() => { setIncomeVal(cfg.income.toString()); setIncomeCur(cfg.incomeCurrency); setShowIncome(true); }}>
                <Text style={[styles.heroStatVal, { color: '#a8b898' }]}>
                  {cfg.income > 0 ? fmt(cfg.income, cfg.incomeCurrency) : 'Set income →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Month summary chips */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { borderColor: colors.green + '60' }]}>
            <Text style={styles.summaryLbl}>Income</Text>
            <Text style={[styles.summaryVal, { color: colors.green }]}>{fmt(income, cfg.defaultCurrency)}</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: colors.red + '60' }]}>
            <Text style={styles.summaryLbl}>Spent</Text>
            <Text style={[styles.summaryVal, { color: colors.red }]}>{fmt(expenses, cfg.defaultCurrency)}</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: colors.gold + '60' }]}>
            <Text style={styles.summaryLbl}>Saved</Text>
            <Text style={[styles.summaryVal, { color: colors.gold }]}>{fmt(savings, cfg.defaultCurrency)}</Text>
          </View>
          <View style={[styles.summaryChip, { borderColor: colors.border2 }]}>
            <Text style={styles.summaryLbl}>Net</Text>
            <Text style={[styles.summaryVal, { color: net >= 0 ? colors.ink : colors.red }]}>{fmt(net, cfg.defaultCurrency)}</Text>
          </View>
        </View>

        {/* Quick nav */}
        <View style={styles.navGrid}>
          {NAV.map(n => (
            <TouchableOpacity key={n.label} style={styles.navCard} onPress={() => router.push(n.route as any)}>
              <Ionicons name={n.icon} size={22} color={colors.accent} />
              <Text style={styles.navLbl}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Accounts summary */}
        {allAccounts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Accounts</Text>
              <TouchableOpacity onPress={() => router.push('/finance/accounts')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp.sm, paddingHorizontal: sp.lg }}>
              {allAccounts.map(a => (
                <View key={a.id} style={[styles.accChip, { borderLeftColor: a.color, borderLeftWidth: 3 }]}>
                  <Text style={styles.accName}>{a.name}</Text>
                  <Text style={styles.accBal}>{fmt(a.balance, a.currency)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => router.push('/finance/transactions')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>No transactions yet</Text>
              <TouchableOpacity onPress={() => router.push('/finance/transactions')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnTxt}>+ Add first transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View style={[styles.txnDot, { backgroundColor: TXN_TYPE_COLOR[t.type] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.desc}</Text>
                  <Text style={styles.txnMeta}>{t.cat} · {t.date}</Text>
                </View>
                <Text style={[styles.txnAmt, { color: t.type === 'income' ? colors.green : t.type === 'expense' ? colors.red : colors.gold }]}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Income modal */}
      <Modal visible={showIncome} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Monthly Income</Text>
            <TouchableOpacity onPress={() => setShowIncome(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.lbl}>AMOUNT</Text>
            <TextInput style={styles.input} value={incomeVal} onChangeText={setIncomeVal}
              keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.muted} autoFocus />
            <Text style={styles.lbl}>CURRENCY</Text>
            <View style={styles.curRow}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setIncomeCur(c)}
                  style={[styles.curChip, incomeCur === c && styles.curChipOn]}>
                  <Text style={[styles.curChipTxt, incomeCur === c && { color: colors.surface }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveIncome}>
              <Text style={styles.saveBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sp.lg, paddingVertical: sp.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  hamburger: { padding: 4, minWidth: 40 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.inkLight, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(44,47,38,0.5)', zIndex: 10 } as any,
  drawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_WIDTH,
    backgroundColor: '#2c2f26', zIndex: 20,
    paddingHorizontal: 16, paddingBottom: 24,
  },
  drawerTitle: { fontFamily: fonts.serif, fontSize: 22, color: 'rgba(241,237,228,0.9)', marginTop: 24, marginBottom: 20, paddingLeft: 4 },
  drawerDivider: { height: 1, backgroundColor: 'rgba(241,237,228,0.08)', marginVertical: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 8 },
  drawerItemTxt: { fontFamily: fonts.sansMed, fontSize: 14, color: 'rgba(241,237,228,0.75)' },
  eyebrow: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 3, color: colors.accent },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  fab: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  hero: { padding: sp.lg, margin: sp.md, borderRadius: r.lg, overflow: 'hidden' },
  heroLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(241,237,228,0.5)', marginBottom: 6 },
  heroVal: { fontFamily: fonts.serif, fontSize: 40, color: colors.light, letterSpacing: -1, lineHeight: 46 },
  heroRow: { flexDirection: 'row', gap: sp.lg, marginTop: sp.md, paddingTop: sp.md, borderTopWidth: 1, borderTopColor: 'rgba(241,237,228,0.1)' },
  heroStat: { flex: 1 },
  heroStatLbl: { fontFamily: fonts.monoLight, fontSize: 9, color: 'rgba(241,237,228,0.45)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  heroStatVal: { fontFamily: fonts.serifReg, fontSize: 15, color: colors.light },

  summaryRow: { flexDirection: 'row', gap: sp.xs, paddingHorizontal: sp.md, marginBottom: sp.xs },
  summaryChip: {
    flex: 1, borderRadius: r.sm, borderWidth: 1,
    padding: sp.xs + 2, backgroundColor: colors.surface,
    alignItems: 'center',
  },
  summaryLbl: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  summaryVal: { fontFamily: fonts.serifReg, fontSize: 13, marginTop: 2 },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, padding: sp.md },
  navCard: {
    flex: 1, minWidth: '28%', backgroundColor: colors.surface,
    borderRadius: r.md, borderWidth: 1, borderColor: colors.border,
    padding: sp.md, alignItems: 'center', gap: sp.xs,
  },
  navLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.inkLight },

  section: { marginTop: sp.sm },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: sp.lg, marginBottom: sp.sm,
  },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 16, color: colors.inkLight },
  seeAll: { fontFamily: fonts.monoLight, fontSize: 10, color: colors.accent, letterSpacing: 1 },

  accChip: {
    backgroundColor: colors.surface, borderRadius: r.sm,
    borderWidth: 1, borderColor: colors.border,
    padding: sp.md, minWidth: 140,
  },
  accName: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  accBal: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, marginTop: 2 },

  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingVertical: sp.sm, paddingHorizontal: sp.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  txnDot: { width: 8, height: 8, borderRadius: 4 },
  txnDesc: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.ink },
  txnMeta: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, marginTop: 2, letterSpacing: 0.5 },
  txnAmt: { fontFamily: fonts.serifReg, fontSize: 15 },

  empty: { alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },

  modal: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: sp.lg, paddingBottom: sp.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  modalBody: { padding: sp.lg },
  lbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: colors.muted, marginBottom: 6, marginTop: sp.md },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: r.sm, padding: sp.sm + 2,
    fontFamily: fonts.sans, fontSize: 16, color: colors.ink,
  },
  curRow: { flexDirection: 'row', gap: sp.sm },
  curChip: {
    flex: 1, paddingVertical: sp.sm, alignItems: 'center',
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2,
  },
  curChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  curChipTxt: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.inkLight },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
