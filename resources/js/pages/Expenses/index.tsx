import { Head, Link, router } from '@inertiajs/react';

interface Expense {
    id: number;
    title: string;
    amount: string;
    category: string;
    date: string;
    notes: string | null;
}

interface Props {
    expenses: Expense[];
}

export default function Index({ expenses }: Props) {
    const handleDelete = (id: number) => {
        if (confirm('Delete this expense?')) {
            router.delete(`/expenses/${id}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Head title="Expenses" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Expenses</h1>
                <Link
                    href="/expenses/create"
                    className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
                >
                    Add Expense
                </Link>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Title</th>
                            <th className="text-left px-4 py-3 font-medium">Amount</th>
                            <th className="text-left px-4 py-3 font-medium">Category</th>
                            <th className="text-left px-4 py-3 font-medium">Date</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center px-4 py-8 text-gray-500">
                                    No expenses yet — add your first one.
                                </td>
                            </tr>
                        )}
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="border-b last:border-0">
                                <td className="px-4 py-3">{expense.title}</td>
                                <td className="px-4 py-3">₹{expense.amount}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{expense.date}</td>
                                <td className="px-4 py-3 text-right space-x-3">
                                    <Link
                                        href={`/expenses/${expense.id}/edit`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}