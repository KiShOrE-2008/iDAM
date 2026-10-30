'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AdminLayout, AdminCard, LoadState } from '@/components/admin/AdminLayout';
import { AdminUser, fetchAdminUsers, formatInr, formatDateTime } from '@/lib/admin/service';

export default function AdminUsersPage() {
  return (
    <AdminLayout title="Users" subtitle="Everyone with an iDAM account. Search by name, email or phone.">
      <UsersBody />
    </AdminLayout>
  );
}

function UsersBody() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    fetchAdminUsers(search || null).then(setRows).catch((e) => setError(e.message));
  }, [search]);

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); setSearch(query.trim()); }}
        className="flex items-center bg-white border border-slate-300 rounded-md px-3 py-2 w-full sm:w-72 focus-within:border-ink"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, email or phone"
          aria-label="Search users"
          className="ml-2 flex-1 text-xs font-medium outline-none bg-transparent"
        />
      </form>

      <LoadState loading={!rows} error={error}>
        <AdminCard>
          {rows && rows.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No users match.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-slate-500 text-left">
                  <tr>
                    {['Name', 'Email', 'Phone', 'Role', 'Listings', 'Bookings', 'Spent', 'Joined'].map((h, i) => (
                      <th key={h} className={`py-1.5 px-1 font-bold whitespace-nowrap ${i >= 4 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows?.map((u, i) => (
                    <tr key={u.id} className="row-in border-t border-slate-100" style={{ animationDelay: `${Math.min(i, 15) * 20}ms` }}>
                      <td className="py-2 px-1 font-bold max-w-[180px] truncate">{u.name || '—'}</td>
                      <td className="py-2 px-1 max-w-[220px] truncate">{u.email || '—'}</td>
                      <td className="py-2 px-1 whitespace-nowrap">{u.phone || '—'}</td>
                      <td className="py-2 px-1">
                        <span className={`text-xs font-bold rounded px-1.5 py-0.5 ${u.role === 'admin' ? 'bg-ink text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {u.listings > 0 && u.role !== 'admin' ? 'owner' : u.role}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right tabular-nums">{u.listings}</td>
                      <td className="py-2 px-1 text-right tabular-nums">{u.bookings}</td>
                      <td className="py-2 px-1 text-right tabular-nums font-bold">{formatInr(u.spent)}</td>
                      <td className="py-2 px-1 text-right whitespace-nowrap">{formatDateTime(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </LoadState>
    </>
  );
}
