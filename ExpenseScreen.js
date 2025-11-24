import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const [total, setTotal] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState([]);

  const loadExpenses = async () => {
    const rows = await db.getAllAsync('SELECT * FROM expenses ORDER BY id DESC;');
    setExpenses(rows);

    const overall = await db.getAllAsync('SELECT SUM(amount) AS total FROM expenses;');
    setTotal(overall[0]?.total ? overall[0].total : 0);

    const cats = await db.getAllAsync('SELECT category, SUM(amount) AS total FROM expenses GROUP BY category;');
    setCategoryTotals(cats);
  };

  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }
    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();

    if (!trimmedCategory) {
      return;
    }

    const dateValue = new Date().toISOString().split('T')[0];

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null, dateValue]
    );
    setAmount('');
    setCategory('');
    setNote('');
    await loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    await loadExpenses();
  };

  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
        {item.date ? <Text style={styles.expenseDate}>{item.date}</Text> : null}
      </View>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL
        );
      `);

      await loadExpenses();
    }

    setup();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker 2.0</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <Button title="Add Expense" onPress={addExpense} />
      </View>

      {/* ---- Totals Section ---- */}
      <View style={styles.totalsContainer}>
        <Text style={styles.totalText}>
          Total Spent: ${Number(total).toFixed(2)}
        </Text>
        {categoryTotals.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.categoryHeader}>By Category:</Text>
            {categoryTotals.map((c) => (
              <Text key={c.category} style={styles.categoryItem}>
                {c.category}: ${Number(c.total).toFixed(2)}
              </Text>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
      />

      <Text style={styles.footer}>
        Enter your expenses and they’ll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff0088ff',
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  totalsContainer: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalText: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: '700',
  },
  categoryHeader: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryItem: {
    color: '#93c5fd',
    fontSize: 14,
    marginLeft: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  expenseCategory: {
    color: '#93c5fd',
    fontSize: 14,
  },
  expenseNote: {
    color: '#d1d5db',
    fontSize: 13,
  },
  expenseDate: {
    color: '#9ca3af',
    fontSize: 12,
  },
  delete: {
    color: '#ff0000ff',
    fontSize: 20,
    marginLeft: 10,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
});