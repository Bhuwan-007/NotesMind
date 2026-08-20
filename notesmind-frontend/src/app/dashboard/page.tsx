"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleNewRequest = () => {
    // Stage 3 integration point
    alert("New Request Flow - Coming in Stage 3");
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="bg-primary border-b border-border text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center font-document font-bold text-xl">
                NotesMind
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-sm font-medium hover:text-primary-subtle"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-ink font-ui">
              Dashboard
            </h1>
            <button
              onClick={handleNewRequest}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              + New Request
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-8">
            <div className="bg-bg-surface border border-border sm:rounded-md p-6">
              <h2 className="text-lg font-medium text-ink mb-4 font-document">
                Recent Cases
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-bg-muted text-left text-xs font-medium text-ink-muted uppercase tracking-wider font-mono">
                        Case ID
                      </th>
                      <th className="px-6 py-3 bg-bg-muted text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 bg-bg-muted text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 bg-bg-muted text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg-surface divide-y divide-border">
                    {/* Placeholder data */}
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-ink">
                        NM-2024-001
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        Guest Faculty Honorarium
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent-subtle text-accent">
                          Pending HOD
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">
                        Oct 24, 2024
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-ink">
                        NM-2024-002
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        Lab Equipment Purchase
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success text-white">
                          Approved
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-muted">
                        Oct 22, 2024
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
