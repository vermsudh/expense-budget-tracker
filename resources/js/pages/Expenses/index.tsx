import { Head, Link, router } from '@inertiajs/react';

interface Expense {
    id: number;
    title: string;
    amount: string;   // Eloquent's `decimal` column serializes to JSON as a STRING, not a number — a real gotcha worth knowing
    category: string;
    date: string;
    notes: string | null;
}

interface Props {
    expenses: Expense[];
}

export default function Index({ expenses }: Props) {
    const handleDelete = (id: number) => {
        router.delete(`/expenses/${id}`);
    };

    return (
        <div>
            <Head title="Expenses" />

            <h1>Expenses</h1>

            <Link href="/expenses/create">Add Expense</Link>

            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Amount</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((expense) => (
                        <tr key={expense.id}>
                            <td>{expense.title}</td>
                            <td>{expense.amount}</td>
                            <td>{expense.category}</td>
                            <td>{expense.date}</td>
                            <td>
                                <Link href={`/expenses/${expense.id}/edit`}>Edit</Link>
                                <button onClick={() => handleDelete(expense.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}