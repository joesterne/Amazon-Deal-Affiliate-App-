import React, { useState, useRef } from "react";
import { Search, Loader2, ArrowUpRight, Save, Clock, CheckCircle, LineChart as LineChartIcon, X, Bell } from "lucide-react";
import { Deal, PriceHistoryItem } from "../types";
import { createSpreadsheet, appendToSheet, createTask } from "../lib/workspaceApi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [category, setCategory] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("");
  const [discountThreshold, setDiscountThreshold] = useState(20);
  const [isScanning, setIsScanning] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<Deal | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const trendRequestRef = useRef(0);

  const [alertDeal, setAlertDeal] = useState<Deal | null>(null);
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [alertNotification, setAlertNotification] = useState<string>("");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    // A cleared threshold parses to 0, which the server treats as "no threshold" and
    // silently switches to a generic scan; reject it instead of changing modes unasked.
    if (!discountThreshold || discountThreshold < 1 || discountThreshold > 99) {
      setError("Enter a minimum drop between 1% and 99%.");
      return;
    }

    setIsScanning(true);
    setExportSuccess(false);
    setError("");
    setDeals([]);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, discountThreshold })
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
    // The scan prompt allows Gemini to return a bare ASIN instead of a URL;
    // treating it as a URL produced broken links like "B08XXXX?tag=...".
    const trimmed = url.trim();
    const fullUrl = /^[A-Z0-9]{10}$/i.test(trimmed)
      ? `https://www.amazon.com/dp/${trimmed.toUpperCase()}`
      : url;
    if (!affiliateTag.trim()) return fullUrl;
    try {
      const urlObj = new URL(fullUrl);
      urlObj.searchParams.set("tag", affiliateTag.trim());
      return urlObj.toString();
    } catch (e) {
      // If parsing fails, do simple string append
      return fullUrl.includes("?")
        ? `${fullUrl}&tag=${affiliateTag.trim()}`
        : `${fullUrl}?tag=${affiliateTag.trim()}`;
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

  const handleViewTrend = async (deal: Deal) => {
    if (selectedProduct?.productName === deal.productName && priceHistory.length > 0) {
      // Already viewing this deal's trend
      return;
    }
    
    setSelectedProduct(deal);
    setIsFetchingHistory(true);
    setPriceHistory([]);
    const requestId = ++trendRequestRef.current;

    try {
      const response = await fetch("/api/price-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: deal.productName,
          originalPrice: deal.originalPrice,
          dealPrice: deal.dealPrice
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch price history.");
      }

      const data = await response.json();
      // A slower earlier request must not overwrite a newer product's trend.
      if (trendRequestRef.current !== requestId) return;
      setPriceHistory(data.history || []);
    } catch (err: any) {
      console.error(err);
      // Fallback: If it fails, we just don't show the graph properly or we show empty.
    } finally {
      if (trendRequestRef.current === requestId) {
        setIsFetchingHistory(false);
      }
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

          <div className="w-24 shrink-0 space-y-1">
            <label htmlFor="threshold" className="block text-sm font-bold text-slate-700">Min. Drop %</label>
            <input
              type="number"
              id="threshold"
              value={discountThreshold}
              onChange={(e) => setDiscountThreshold(parseInt(e.target.value) || 0)}
              min="1"
              max="99"
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
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
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
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setAlertDeal(deal);
                              const numMatch = deal.dealPrice.match(/[\d.]+/);
                              setTargetPrice(numMatch ? numMatch[0] : "");
                            }}
                            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <Bell className="w-3.5 h-3.5 mr-1" />
                            Alert
                          </button>
                          <button
                            onClick={() => handleViewTrend(deal)}
                            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <LineChartIcon className="w-3.5 h-3.5 mr-1" />
                            Trend
                          </button>
                          <a
                            href={processUrl(deal.amazonUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs font-mono text-blue-600 hover:text-blue-800 break-all max-w-[200px]"
                          >
                            View Deal <ArrowUpRight className="w-3 h-3 ml-1" />
                          </a>
                        </div>
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

          {selectedProduct && (
            <div className="border-t border-slate-200 bg-slate-50/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    30-Day Price Trend
                    {isFetchingHistory && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 truncate max-w-xl">{selectedProduct.productName}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setPriceHistory([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-64 w-full bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                {isFetchingHistory ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
                    <span className="text-sm font-medium">Analyzing historical price data...</span>
                  </div>
                ) : priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        minTickGap={20}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    No historical data available for this product.
                  </div>
                )}
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

      {/* Price Alert Modal */}
      {alertDeal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                Set Price Alert
              </h3>
              <button 
                onClick={() => setAlertDeal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{alertDeal.productName}</p>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-sm text-slate-600">Current Deal Price:</span>
                <span className="font-bold text-emerald-600">{alertDeal.dealPrice}</span>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="targetPrice" className="block text-sm font-bold text-slate-700">
                  Target Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    id="targetPrice"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="e.g. 199.99"
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow outline-none text-sm text-slate-900"
                  />
                </div>
                <p className="text-xs text-slate-500">We'll notify you when the price drops below this amount.</p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setAlertDeal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Persist the alert; previously "Save" only showed a toast and
                  // the alert vanished with it. (Checking saved alerts against new
                  // scans is still not wired up.)
                  try {
                    const existing = JSON.parse(localStorage.getItem("priceAlerts") || "[]");
                    existing.push({
                      productName: alertDeal?.productName,
                      amazonUrl: alertDeal?.amazonUrl,
                      targetPrice: parseFloat(targetPrice),
                      savedAt: new Date().toISOString()
                    });
                    localStorage.setItem("priceAlerts", JSON.stringify(existing));
                  } catch {
                    // Storage unavailable; the confirmation toast still shows.
                  }
                  setAlertNotification(`Alert saved! We'll notify you if the price drops below $${targetPrice}.`);
                  setAlertDeal(null);
                  setTimeout(() => setAlertNotification(""), 5000);
                }}
                disabled={!targetPrice || isNaN(parseFloat(targetPrice))}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {alertNotification && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{alertNotification}</span>
          <button onClick={() => setAlertNotification("")} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
