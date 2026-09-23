import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Expense {
    id: number;
    title: string;
    amount: string;
    category: string;
    date: string;
    notes: string | null;
}

interface Props {
    expense: Expense;
}

export default function Edit({ expense }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.notes ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/expenses/${expense.id}`);
    };

    return (
        <div>
            <Head title="Edit Expense" />

            <h1>Edit Expense</h1>

            <form onSubmit={submit}>
                <div>
                    <label htmlFor="title">Title</label>
                    <input
                        id="title"
                        type="text"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                    />
                    {errors.title && <div>{errors.title}</div>}
                </div>

                <div>
                    <label htmlFor="amount">Amount</label>
                    <input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                    />
                    {errors.amount && <div>{errors.amount}</div>}
                </div>

                <div>
                    <label htmlFor="category">Category</label>
                    <input
                        id="category"
                        type="text"
                        value={data.category}
                        onChange={(e) => setData('category', e.target.value)}
                    />
                    {errors.category && <div>{errors.category}</div>}
                </div>

                <div>
                    <label htmlFor="date">Date</label>
                    <input
                        id="date"
                        type="date"
                        value={data.date}
                        onChange={(e) => setData('date', e.target.value)}
                    />
                    {errors.date && <div>{errors.date}</div>}
                </div>

                <div>
                    <label htmlFor="notes">Notes</label>
                    <textarea
                        id="notes"
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                    />
                    {errors.notes && <div>{errors.notes}</div>}
                </div>

                <button type="submit" disabled={processing}>
                    {processing ? 'Saving...' : 'Update Expense'}
                </button>
            </form>

            <Link href="/expenses">Cancel</Link>
        </div>
    );
}