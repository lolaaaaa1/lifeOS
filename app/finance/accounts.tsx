import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, sp, r } from '@/constants/theme';
import { fmt, CURRENCIES, type Currency, type AccountType, type Account } from '@/constants/financeTypes';
import { accounts as store, uid } from '@/lib/financeStore';

const ACC_COLORS = ['#5c6650','#9c7d3f','#a8533f','#6b7c5e','#8a6a5e','#3f4654','#6e6248'];
const ACC_TYPES: AccountType[] = ['bank','mobile_money','cash','savings'];
const ACC_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank', mobile_money: 'Mobile Money', cash: 'Cash', savings: 'Savings',
};
const ACC_TYPE_ICONS: Record<AccountType, string> = {
  bank: '🏦', mobile_money: '📱', cash: '💵', savings: '🐖',
};

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [fName, setFName] = useState('');
  const [fBalance, setFBalance] = useState('');
  const [fCur, setFCur] = useState<Currency>('GHS');
  const [fType, setFType] = useState<AccountType>('bank');
  const [fColor, setFColor] = useState(ACC_COLORS[0]);

  const load = useCallback(async () => setList(await store.getAll()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditId(null); setFName(''); setFBalance('');
    setFCur('GHS'); setFType('bank'); setFColor(ACC_COLORS[0]);
    setShowModal(true);
  };

  const openEdit = (a: Account) => {
    setEditId(a.id); setFName(a.name); setFBalance(a.balance.toString());
    setFCur(a.currency); setFType(a.type); setFColor(a.color);
    setShowModal(true);
  };

  const saveAccount = async () => {
    if (!fName.trim()) return;
    const data = {
      name: fName.trim(),
      balance: parseFloat(fBalance) || 0,
      currency: fCur,
      type: fType,
      color: fColor,
    };
    if (editId) {
      await store.update(editId, data);
    } else {
      await store.add({ id: uid(), ...data });
    }
    setShowModal(false);
    load();
  };

  const deleteAcc = (a: Account) =>
    Alert.alert('Delete account?', a.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await store.remove(a.id); load(); } },
    ]);

  const total = list.reduce((s, a) => s + a.balance, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.inkLight} />
          <Text style={styles.backTxt}>Finance</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Banking</Text>
          <Text style={styles.title}>Accounts</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.fab}>
          <Ionicons name="add" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalLbl}>Total across all accounts</Text>
        <Text style={styles.totalVal}>{fmt(total)}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        {list.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No accounts yet</Text>
            <TouchableOpacity onPress={openAdd} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnTxt}>+ Add account</Text>
            </TouchableOpacity>
          </View>
        )}
        {list.map(a => (
          <TouchableOpacity key={a.id} onPress={() => openEdit(a)} onLongPress={() => deleteAcc(a)}
            style={[styles.card, { borderTopColor: a.color, borderTopWidth: 3 }]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardIcon}>{ACC_TYPE_ICONS[a.type]}</Text>
              <View style={styles.cardTypeBadge}>
                <Text style={styles.cardTypeTxt}>{ACC_TYPE_LABELS[a.type]}</Text>
              </View>
            </View>
            <Text style={styles.cardName}>{a.name}</Text>
            <Text style={styles.cardBal}>{fmt(a.balance, a.currency)}</Text>
            <Text style={styles.cardCur}>{a.currency}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Account' : 'Add Account'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>ACCOUNT NAME</Text>
            <TextInput style={styles.input} value={fName} onChangeText={setFName}
              placeholder="e.g. Vodafone Cash, Ecobank" placeholderTextColor={colors.muted} autoFocus />

            <Text style={styles.lbl}>BALANCE</Text>
            <TextInput style={styles.input} value={fBalance} onChangeText={setFBalance}
              placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="numeric" />

            <Text style={styles.lbl}>CURRENCY</Text>
            <View style={styles.row4}>
              {CURRENCIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setFCur(c)}
                  style={[styles.chip4, fCur === c && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.chip4Txt, fCur === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.lbl}>TYPE</Text>
            <View style={styles.row4}>
              {ACC_TYPES.map(t => (
                <TouchableOpacity key={t} onPress={() => setFType(t)}
                  style={[styles.chip4, fType === t && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.chip4Txt, fType === t && { color: '#fff' }]}>{ACC_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.lbl}>COLOUR</Text>
            <View style={styles.colorRow}>
              {ACC_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setFColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, fColor === c && styles.colorDotOn]} />
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, !fName.trim() && { opacity: 0.45 }]}
              onPress={saveAccount} disabled={!fName.trim()}>
              <Text style={styles.saveBtnTxt}>{editId ? 'Update' : 'Add Account'}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backTxt: { fontFamily: fonts.monoLight, fontSize: 11, color: colors.inkLight, letterSpacing: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  fab: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  totalBar: {
    backgroundColor: colors.surface2, borderBottomWidth: 1, borderBottomColor: colors.border,
    padding: sp.md, alignItems: 'center',
  },
  totalLbl: { fontFamily: fonts.monoLight, fontSize: 9, letterSpacing: 2, color: colors.muted, textTransform: 'uppercase' },
  totalVal: { fontFamily: fonts.serif, fontSize: 32, color: colors.ink, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: sp.md, gap: sp.sm },
  empty: { flex: 1, alignItems: 'center', padding: sp.xl },
  emptyTxt: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  emptyBtn: { marginTop: sp.sm, borderRadius: 50, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: sp.md, paddingVertical: 6 },
  emptyBtnTxt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.accent },
  card: {
    width: '48%', backgroundColor: colors.surface,
    borderRadius: r.md, borderWidth: 1, borderColor: colors.border,
    padding: sp.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.xs },
  cardIcon: { fontSize: 20 },
  cardTypeBadge: { backgroundColor: colors.bg2, borderRadius: 50, paddingHorizontal: sp.xs + 2, paddingVertical: 2 },
  cardTypeTxt: { fontFamily: fonts.monoLight, fontSize: 8, color: colors.muted, letterSpacing: 1 },
  cardName: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.inkLight, marginBottom: 4 },
  cardBal: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  cardCur: { fontFamily: fonts.monoLight, fontSize: 9, color: colors.muted, marginTop: 2 },
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
    fontFamily: fonts.sans, fontSize: 14, color: colors.ink,
  },
  row4: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.xs },
  chip4: {
    paddingHorizontal: sp.sm + 2, paddingVertical: 7,
    borderRadius: 50, borderWidth: 1, borderColor: colors.border2,
  },
  chip4Txt: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.inkLight },
  colorRow: { flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap', marginTop: sp.xs },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ink },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 50,
    paddingVertical: sp.sm + 2, alignItems: 'center', marginTop: sp.lg, marginBottom: sp.xl,
  },
  saveBtnTxt: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.surface },
});
