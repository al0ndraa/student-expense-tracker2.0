import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync("expenses.db");

export default function App() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [totalOverall, setTotalOverall] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState([]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  useEffect(() => {
    const createTable = async () => {
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL,
          category TEXT,
          note TEXT,
          date TEXT
        );
      `);
      await loadExpenses();
    };
    createTable();
  }, []);

  const loadExpenses = async () => {
    const rows = await db.getAllAsync("SELECT * FROM expenses ORDER BY date DESC");
    setExpenses(rows);
    calculateTotals(rows);
  };

  const calculateTotals = (rows) => {
    const overallSum = rows.reduce((sum, item) => sum + Number(item.amount), 0);
    setTotalOverall(overallSum);

    const categoryMap = {};
    rows.forEach(item => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = 0;
      }
      categoryMap[item.category] += Number(item.amount);
    });
    const categoryArray = Object.entries(categoryMap).map(([cat, total]) => ({ category: cat, total }));
    setCategoryTotals(categoryArray);
  };

  const addExpense = async () => {
    if (!amount || !category) {
      alert("Please enter amount and category");
      return;
    }
    const date = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);`,
      [amount, category, note, date]
    );
    setAmount('');
    setCategory('');
    setNote('');
    await loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync("DELETE FROM expenses WHERE id = ?;", [id]);
    await loadExpenses();
  };

  const openEditModal = (expense) => {
    setEditExpense(expense);
    setEditModalVisible(true);
  };

  const saveEditedExpense = async () => {
    if (!editExpense.amount || !editExpense.category) {
      alert("Please fill in all required fields");
      return;
    }

    await db.runAsync(
      `UPDATE expenses
       SET amount = ?, category = ?, note = ?, date = ?
       WHERE id = ?;`,
      [
        editExpense.amount,
        editExpense.category,
        editExpense.note,
        new Date().toISOString(),
        editExpense.id,
      ]
    );

    setEditModalVisible(false);
    setEditExpense(null);
    await loadExpenses();
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View>
        <Text style={styles.expenseText}>💰 {item.amount.toFixed(2)}</Text>
        <Text>{item.category} — {item.note}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
          <Text style={{ color: "white" }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteExpense(item.id)} style={styles.deleteButton}>
          <Text style={{ color: "white" }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategoryTotal = ({ item }) => (
    <View style={styles.categoryItem}>
      <Text style={styles.categoryText}>{item.category}</Text>
      <Text style={styles.categoryAmount}>${item.total.toFixed(2)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Expense Tracker 💵</Text>

      <TextInput
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
      />
      <TextInput
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
        style={styles.input}
      />
      <TextInput
        placeholder="Note"
        value={note}
        onChangeText={setNote}
        style={styles.input}
      />
      <Button title="Add Expense" onPress={addExpense} />

      <Text style={styles.total}>Total Spent: ${totalOverall.toFixed(2)}</Text>

      <Text style={styles.sectionHeader}>Spending by Category:</Text>
      <FlatList
        data={categoryTotals}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderCategoryTotal}
        ListEmptyComponent={<Text style={{ color: '#999', textAlign: 'center' }}>No expenses yet</Text>}
      />


      <Text style={styles.sectionHeader}>All Expenses:</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpenseItem}
        ListEmptyComponent={<Text style={{ color: '#999', textAlign: 'center' }}>No expenses recorded</Text>}
      />

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Expense</Text>
            <TextInput
              placeholder="Amount"
              keyboardType="numeric"
              value={String(editExpense?.amount || '')}
              onChangeText={(text) =>
                setEditExpense({ ...editExpense, amount: text })
              }
              style={styles.input}
            />
            <TextInput
              placeholder="Category"
              value={editExpense?.category || ''}
              onChangeText={(text) =>
                setEditExpense({ ...editExpense, category: text })
              }
              style={styles.input}
            />
            <TextInput
              placeholder="Note"
              value={editExpense?.note || ''}
              onChangeText={(text) =>
                setEditExpense({ ...editExpense, note: text })
              }
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <Button title="Save" onPress={saveEditedExpense} />
              <Button title="Cancel" color="grey" onPress={() => setEditModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f7f7' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginVertical: 5, backgroundColor: 'white' },
  total: { marginVertical: 10, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#ddd',
    paddingVertical: 10
  },
  expenseText: { fontSize: 16, fontWeight: 'bold' },
  actions: { flexDirection: 'row' },
  editButton: { backgroundColor: "#2196F3", padding: 6, borderRadius: 4, marginHorizontal: 4 },
  deleteButton: { backgroundColor: "red", padding: 6, borderRadius: 4 },
  categoryItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#eef', padding: 8, borderRadius: 5, marginVertical: 2
  },
  categoryText: { fontSize: 16 },
  categoryAmount: { fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 8, width: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
});
