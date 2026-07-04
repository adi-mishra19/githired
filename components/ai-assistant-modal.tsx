"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicChart } from "@/components/charts/dynamic-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Search, History, Download, Code2, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  insights?: string;
  chartType?: string;
  visualization?: any;
  error?: string;
  sql?: string;
  explanation?: string;
  executionTime?: string;
  visualizationNote?: string;
}

export function AIAssistantModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState("templates");
  const [showSQL, setShowSQL] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load templates when modal opens
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadHistory();
      loadSuggestions();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/ai/templates");
      if (res.ok) {
        const data = await res.json();
        console.log("Frontend - Templates data received:", data);
        console.log("Frontend - Templates count:", data.templates?.length);
        console.log("Frontend - Categories:", data.categories);
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
      } else {
        console.error("Failed to fetch templates, status:", res.status);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/ai/query?limit=10");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await fetch("/api/ai/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  const executeQuery = async (queryText?: string, templateId?: string) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText || query,
          templateId
        })
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        setSelectedTab("results");
        loadHistory(); // Refresh history
      } else {
        toast.error(data.error || "Failed to execute query");
      }
    } catch (error) {
      toast.error("Failed to execute query");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeQuery(query);
    }
  };

  const handleTemplateClick = (template: Template) => {
    setQuery(template.name);
    executeQuery(template.name, template.id);
  };

  const handleHistoryClick = (historyItem: any) => {
    setResult({
      success: true,
      data: historyItem.results,
      insights: historyItem.insights,
      chartType: historyItem.chartType
    });
    setSelectedTab("results");
  };

  const exportData = () => {
    if (!result?.data || result.data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csv = [
      Object.keys(result.data[0]).join(","),
      ...result.data.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-query-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully");
  };

  return (
    <>
      {/* Trigger Button (will be placed in sidebar) */}
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        <span>AI Assistant</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[50vw] !max-w-[1400px] max-h-[90vh] overflow-hidden flex flex-col sm:!max-w-[50vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analytics Assistant
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ask anything about your data... (e.g., 'How does my CGPA compare?')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? "Analyzing..." : "Ask AI"}
            </Button>
          </form>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">
                <Sparkles className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="results">
                Results
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto">
              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Smart Suggestions for You
                  </h3>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                            suggestion.priority === "high"
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              : suggestion.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          }`}>
                            {suggestion.priority}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm mb-1 break-words">
                              {suggestion.title}
                            </div>
                            <div className="text-xs text-muted-foreground break-words">
                              {suggestion.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Query Templates */}
              {categories.map((category) => (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates
                      .filter((t) => t.category === category)
                      .map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start text-left hover:bg-accent whitespace-normal"
                          onClick={() => handleTemplateClick(template)}
                          disabled={loading}
                        >
                          <div className="font-semibold mb-1 w-full overflow-hidden text-ellipsis line-clamp-2">{template.name}</div>
                          <div className="text-xs text-muted-foreground w-full overflow-hidden text-ellipsis line-clamp-2">
                            {template.description}
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : result ? (
                <div className="space-y-6">
                  {result.success ? (
                    <>
                      {/* SQL Query Display */}
                      {result.sql && (
                        <div className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setShowSQL(!showSQL)}
                            className="w-full flex items-center justify-between bg-muted/50 px-4 py-3 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Code2 className="h-4 w-4" />
                              <span className="font-semibold text-sm">Generated SQL Query</span>
                              {result.executionTime && (
                                <span className="text-xs text-muted-foreground">
                                  • Executed in {result.executionTime}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {showSQL ? "Hide" : "Show"} query
                            </span>
                          </button>
                          {showSQL && (
                            <div className="p-4 bg-slate-950 dark:bg-slate-900">
                              <pre className="text-xs text-slate-50 overflow-x-auto">
                                <code>{result.sql}</code>
                              </pre>
                              {result.explanation && (
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                  <div className="flex items-start gap-2 text-slate-300">
                                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs">{result.explanation}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Insights */}
                      {result.insights && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            Key Insights
                          </h3>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{result.insights}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {result.visualizationNote && (
                        <Card className="p-4 border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10">
                          <h4 className="font-semibold mb-1 text-sm text-primary">Visualization unavailable</h4>
                          <p className="text-sm text-muted-foreground">{result.visualizationNote}</p>
                        </Card>
                      )}

                      {/* Chart */}
                      {result.data && result.data.length > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Visualization</h3>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={exportData}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export CSV
                            </Button>
                          </div>
                          <DynamicChart
                            data={result.data}
                            chartType={result.chartType as any}
                            visualization={result.visualization}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-destructive">
                      {result.error || "Something went wrong"}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a template or ask a question to see results
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-y-auto">
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-4 flex flex-col items-start"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="font-medium mb-1">{item.query}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()} • {item.executionTime}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No query history yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

