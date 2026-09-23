import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        amount: '',
        category: '',
        date: '',
        notes: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/expenses');
    };

    const inputClass =
        'w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10';
    const errorClass = 'text-red-600 text-xs mt-1';

    return (
        <div className="max-w-lg mx-auto p-6">
            <Head title="Add Expense" />
            <h1 className="text-2xl font-semibold mb-6">Add Expense</h1>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input className={inputClass} value={data.title} onChange={(e) => setData('title', e.target.value)} />
                    {errors.title && <div className={errorClass}>{errors.title}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Amount</label>
                    <input type="number" step="0.01" className={inputClass} value={data.amount} onChange={(e) => setData('amount', e.target.value)} />
                    {errors.amount && <div className={errorClass}>{errors.amount}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input className={inputClass} value={data.category} onChange={(e) => setData('category', e.target.value)} />
                    {errors.category && <div className={errorClass}>{errors.category}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input type="date" className={inputClass} value={data.date} onChange={(e) => setData('date', e.target.value)} />
                    {errors.date && <div className={errorClass}>{errors.date}</div>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea className={inputClass} rows={3} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                    {errors.notes && <div className={errorClass}>{errors.notes}</div>}
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={processing} className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50">
                        {processing ? 'Saving...' : 'Save Expense'}
                    </button>
                    <Link href="/expenses" className="text-sm text-gray-600 hover:underline">Cancel</Link>
                </div>
            </form>
        </div>
    );
}