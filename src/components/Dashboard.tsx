import React, { useState } from "react";
import { Search, Loader2, ArrowUpRight, Save, Clock, CheckCircle } from "lucide-react";
import { Deal } from "../types";
import { createSpreadsheet, appendToSheet, createTask } from "../lib/workspaceApi";

export default function Dashboard() {
  const [category, setCategory] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    
    setIsScanning(true);
    setExportSuccess(false);
    setError("");
    setDeals([]);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      });

      if (!response.ok) {
        throw new Error("Failed to scan deals.");
      }

      const data = await response.json();
      setDeals(data.products || []);
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while scanning. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const processUrl = (url: string) => {
    if (!affiliateTag.trim()) return url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("tag", affiliateTag.trim());
      return urlObj.toString();
    } catch (e) {
      // If parsing fails, do simple string append
      return url.includes("?") 
        ? `${url}&tag=${affiliateTag.trim()}`
        : `${url}?tag=${affiliateTag.trim()}`;
    }
  };

  const handleExport = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to create a new spreadsheet and task in your Google account for these ${deals.length} deals?`
    );
    if (!confirmed) return;

    setIsExporting(true);
    setError("");
    setExportSuccess(false);

    try {
      // 1. Create OR get spreadsheet
      // For simplicity, we just create a new spreadsheet called "Amazon Deals Export".
      // In a real app we might store the spreadsheet ID in user's Firebase doc or local storage.
      const dateStr = new Date().toLocaleDateString();
      const spreadsheetId = await createSpreadsheet(`Amazon Deals: ${category} (${dateStr})`);

      // 2. Prepare rows
      const headerRow = ["Product Name", "Deal Price", "Original Price", "Affiliate Link"];
      const valueRows = deals.map(d => [
        d.productName,
        d.dealPrice,
        d.originalPrice,
        processUrl(d.amazonUrl)
      ]);

      const allRows = [headerRow, ...valueRows];

      // 3. Append to sheet
      await appendToSheet(spreadsheetId, "Sheet1!A1", allRows);

      // 4. Create Task to setup recurring review
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await createTask(
        `Review Deals: ${category}`,
        `Check newly scanned deals and schedule blog posts. Spreadsheet ID: ${spreadsheetId}`,
        tomorrow.toISOString()
      );

      setExportSuccess(true);
    } catch (err: any) {
         console.error(err);
         setError(err.message || "Failed to export data to Google Workspace.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Scanned Items</p>
          <h2 className="text-3xl font-bold text-slate-900">12,842</h2>
          <p className="text-emerald-500 text-xs font-medium mt-1">+420 in last 24h</p>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Price Drops</p>
          <h2 className="text-3xl font-bold text-emerald-600">184</h2>
          <p className="text-slate-400 text-xs mt-1">Awaiting affiliate sync</p>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg. Reduction %</p>
          <h2 className="text-3xl font-bold text-slate-900">22.4%</h2>
          <p className="text-slate-400 text-xs mt-1">Category: Electronics</p>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scheduled Alerts</p>
          <h2 className="text-3xl font-bold text-blue-600">42</h2>
          <p className="text-slate-400 text-xs mt-1">Recurring every 60m</p>
        </div>
      </div>

      {/* Settings & Controls */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-slate-700 leading-tight">Scanner Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">Search for the latest price drops and attach your affiliate tag automatically.</p>
        </div>

        <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <label htmlFor="category" className="block text-sm font-bold text-slate-700">Category to Scan</label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Wireless Noise Cancelling Headphones"
              className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none text-sm text-slate-800"
              required
            />
          </div>

          <div className="flex-1 space-y-1">
            <label htmlFor="tag" className="block text-sm font-bold text-slate-700">Amazon Affiliate Tag (Optional)</label>
            <input
              type="text"
              id="tag"
              value={affiliateTag}
              onChange={(e) => setAffiliateTag(e.target.value)}
              placeholder="e.g. myblog-20"
              className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none text-sm text-slate-800"
            />
          </div>
          
          <div className="md:self-end">
            <button
              type="submit"
              disabled={isScanning}
              className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors h-[38px] text-sm"
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>Scan Deals</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Results View */}
      {(deals.length > 0 || isScanning) && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              Live Opportunities Feed {isScanning && <span className="text-xs font-normal text-slate-500 animate-pulse ml-2">Searching the web...</span>}
            </h3>

            {deals.length > 0 && !isScanning && (
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 flex items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Export to Spreadsheet
                </button>
              </div>
            )}
          </div>
          
          {exportSuccess && (
            <div className="bg-emerald-50 text-emerald-700 border-b border-emerald-200 px-6 py-3 text-sm flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Successfully exported to a new Google Sheet and created a follow-up Task!</span>
            </div>
          )}

          {deals.length > 0 && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Product Name</th>
                    <th className="px-6 py-3 border-b border-slate-200">Department</th>
                    <th className="px-6 py-3 border-b border-slate-200">Price (Now)</th>
                    <th className="px-6 py-3 border-b border-slate-200">Price (Old)</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Affiliate Link</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                  {deals.map((deal, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4" style={{ maxWidth: '300px' }}>
                        <div className="font-medium line-clamp-2 md:line-clamp-none text-slate-900">{deal.productName}</div>
                        {deal.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{deal.description}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {deal.department && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {deal.department}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{deal.dealPrice}</td>
                      <td className="px-6 py-4 text-slate-400 line-through">{deal.originalPrice}</td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={processUrl(deal.amazonUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-mono text-blue-600 hover:text-blue-800 break-all max-w-[200px]"
                        >
                          View Deal <ArrowUpRight className="w-3 h-3 ml-1" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-tighter">
                <span>Showing {deals.length} active drops</span>
              </div>
            </div>
          )}

          {deals.length === 0 && !isScanning && !error && (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">
               No deals found. Try a different category.
            </div>
          )}
        </div>
      )}

      {/* Recurring Alerts Summary */}
      <div className="bg-slate-900 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg border border-slate-700 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-white font-bold">Optimization Alert Active</h4>
            <p className="text-slate-400 text-sm mt-1">Automatically scanning your favorite categories for price reductions every hour.</p>
          </div>
        </div>
        <button className="px-4 py-2 border shrink-0 border-slate-700 text-slate-300 rounded hover:bg-slate-800 text-sm font-medium transition-all">Configure Automation Settings</button>
      </div>
    </div>
  );
}
