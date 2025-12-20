import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table as TableIcon,
  FolderOpen,
  ExternalLink,
  Loader2,
  Search,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Types
interface SchemaAsset {
  catalog: string;
  schema: string;
  tables: Array<{ name: string; full_name: string; table_type?: string; comment?: string }>;
  volumes: Array<{ name: string; full_name: string }>;
}

interface TablePreview {
  table: string;
  rows: Array<Record<string, any>>;
  columns: string[];
}

type AssetType = "table" | "volume" | "pdf";

interface SelectedAsset {
  type: AssetType;
  catalog: string;
  schema: string;
  name: string;
  fullPath?: string;
  volumePath?: string;
  tableType?: string;
  comment?: string;
}

// API Functions
async function fetchSchemas(): Promise<SchemaAsset[]> {
  const response = await fetch("/api/explore/schemas");
  if (!response.ok) throw new Error("Failed to fetch schemas");
  return response.json();
}

async function fetchTablePreview(catalog: string, schema: string, table: string): Promise<TablePreview> {
  const response = await fetch(`/api/explore/tables/${catalog}/${schema}/${table}/preview`);
  if (!response.ok) throw new Error("Failed to fetch table preview");
  return response.json();
}

export function Explore() {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState(false);

  // Fetch all schemas
  const { data: schemas, isLoading: schemasLoading, error } = useQuery({
    queryKey: ["explore", "schemas"],
    queryFn: fetchSchemas,
  });

  // Filter tables based on search
  const filteredSchemas = useMemo(() => {
    if (!schemas || !searchQuery) return schemas;

    return schemas.map(schemaAsset => ({
      ...schemaAsset,
      tables: schemaAsset.tables.filter(table =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      volumes: schemaAsset.volumes.filter(volume =>
        volume.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(schemaAsset =>
      schemaAsset.tables.length > 0 || schemaAsset.volumes.length > 0
    );
  }, [schemas, searchQuery]);

  const toggleSchema = (schemaKey: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaKey)) {
      newExpanded.delete(schemaKey);
    } else {
      newExpanded.add(schemaKey);
    }
    setExpandedSchemas(newExpanded);
  };

  const selectTable = (catalog: string, schema: string, table: any) => {
    setSelectedAsset({
      type: "table",
      catalog,
      schema,
      name: table.name,
      fullPath: table.full_name,
      tableType: table.table_type,
      comment: table.comment,
    });
  };

  const copyTablePath = () => {
    if (selectedAsset?.fullPath) {
      navigator.clipboard.writeText(selectedAsset.fullPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const openInDatabricks = () => {
    if (selectedAsset?.fullPath) {
      const [catalog, schema, table] = selectedAsset.fullPath.split('.');
      const url = `${window.location.origin}/explore/data/${catalog}/${schema}/${table}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <div
        className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border p-4"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(30, 41, 59, 0.8)",
        }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-3">Data Catalog</h2>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border text-sm"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.5)",
                borderColor: "rgba(71, 85, 105, 0.8)",
                color: "white",
              }}
            />
          </div>
        </div>

        {schemasLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading schemas...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm">
            Failed to load schemas. Please check your connection.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSchemas?.map((schemaAsset) => {
              const schemaKey = `${schemaAsset.catalog}.${schemaAsset.schema}`;
              const isExpanded = expandedSchemas.has(schemaKey);
              const totalAssets = schemaAsset.tables.length + schemaAsset.volumes.length;

              if (totalAssets === 0) return null;

              return (
                <div key={schemaKey}>
                  {/* Schema Header */}
                  <button
                    onClick={() => toggleSchema(schemaKey)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-700/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <Database className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white flex-1">
                      {schemaAsset.schema}
                    </span>
                    <span className="text-xs text-gray-500">{totalAssets}</span>
                  </button>

                  {/* Expanded: Tables */}
                  {isExpanded && schemaAsset.tables.length > 0 && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Tables
                      </div>
                      {schemaAsset.tables.map((table) => (
                        <button
                          key={table.full_name}
                          onClick={() => selectTable(schemaAsset.catalog, schemaAsset.schema, table)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-700/50"
                          style={{
                            backgroundColor:
                              selectedAsset?.fullPath === table.full_name
                                ? "rgba(59, 130, 246, 0.2)"
                                : undefined,
                          }}
                        >
                          <TableIcon className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-gray-300 text-xs">{table.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Expanded: Volumes */}
                  {isExpanded && schemaAsset.volumes.length > 0 && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Volumes
                      </div>
                      {schemaAsset.volumes.map((volume) => (
                        <div key={volume.full_name} className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400">
                          <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                          <span>{volume.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedAsset ? (
          <DetailPanel
            asset={selectedAsset}
            onCopyPath={copyTablePath}
            onOpenInDatabricks={openInDatabricks}
            copiedPath={copiedPath}
          />
        ) : (
          <Card className="border-slate-700/50 bg-slate-900/50">
            <CardContent className="flex h-96 items-center justify-center">
              <div className="text-center">
                <Database className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">
                  Select a table to explore
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a table from the sidebar to view its schema and data
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Detail Panel Component
function DetailPanel({
  asset,
  onCopyPath,
  onOpenInDatabricks,
  copiedPath
}: {
  asset: SelectedAsset;
  onCopyPath: () => void;
  onOpenInDatabricks: () => void;
  copiedPath: boolean;
}) {
  if (asset.type === "table") {
    return <TableDetail asset={asset} onCopyPath={onCopyPath} onOpenInDatabricks={onOpenInDatabricks} copiedPath={copiedPath} />;
  }
  return null;
}

// Table Detail Component
function TableDetail({
  asset,
  onCopyPath,
  onOpenInDatabricks,
  copiedPath
}: {
  asset: SelectedAsset;
  onCopyPath: () => void;
  onOpenInDatabricks: () => void;
  copiedPath: boolean;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["table-preview", asset.catalog, asset.schema, asset.name],
    queryFn: () => fetchTablePreview(asset.catalog, asset.schema, asset.name),
    enabled: asset.type === "table",
  });

  return (
    <Card className="border-slate-700/50 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-xl">{asset.name}</CardTitle>
            <p className="mt-1 text-sm text-gray-400 font-mono">
              {asset.fullPath}
            </p>
            {asset.comment && (
              <p className="mt-2 text-sm text-gray-300">{asset.comment}</p>
            )}
            {asset.tableType && (
              <div className="mt-2 inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                {asset.tableType}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyPath}
              className="gap-2"
            >
              {copiedPath ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Path
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenInDatabricks}
              className="gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Databricks
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading table data...
          </div>
        ) : error ? (
          <div className="text-red-400">Failed to load table preview</div>
        ) : data ? (
          <div>
            {/* Column List */}
            {data.columns && data.columns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Columns ({data.columns.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.columns.map((col) => (
                    <div
                      key={col}
                      className="px-3 py-2 rounded text-xs font-mono"
                      style={{
                        backgroundColor: "rgba(30, 41, 59, 0.5)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {col}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            {data.rows && data.rows.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Data Preview (first {data.rows.length} rows)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead>
                      <tr>
                        {data.columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {data.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/50">
                          {data.columns.map((col) => (
                            <td
                              key={col}
                              className="whitespace-nowrap px-4 py-2 text-sm text-gray-300"
                            >
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
