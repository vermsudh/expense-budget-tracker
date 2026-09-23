<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ExpenseController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('expenses', ExpenseController::class);

     Route::resource('expenses', ExpenseController::class)->except(['show']);
});

require __DIR__.'/settings.php';
