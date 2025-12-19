import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  FolderOpen,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FullPDFView } from "@/components/chat/FullPDFView";
import { CitationBlock } from "@/types/chat";

// Types
interface SchemaAsset {
  catalog: string;
  schema: string;
  tables: Array<{ name: string; full_name: string }>;
  volumes: Array<{ name: string; full_name: string }>;
}

interface FileInfo {
  path: string;
  name: string;
  is_directory: boolean;
  file_size?: number;
  modification_time?: number;
}

interface TablePreview {
  table: string;
  rows: Array<Record<string, any>>;
  columns: string[];
}

type AssetType = "table" | "volume" | "file" | "pdf";

interface SelectedAsset {
  type: AssetType;
  catalog: string;
  schema: string;
  name: string;
  fullPath?: string;
  volumePath?: string;
}

// Fetch schemas and assets
async function fetchSchemas(): Promise<SchemaAsset[]> {
  const response = await fetch("/api/explore/schemas");
  if (!response.ok) throw new Error("Failed to fetch schemas");
  return response.json();
}

// Fetch volume files
async function fetchVolumeFiles(
  catalog: string,
  schema: string,
  volume: string,
  path: string = "/"
): Promise<FileInfo[]> {
  const params = new URLSearchParams({ path });
  const response = await fetch(
    `/api/explore/volumes/${catalog}/${schema}/${volume}/files?${params}`
  );
  if (!response.ok) throw new Error("Failed to fetch volume files");
  return response.json();
}

// Fetch table preview
async function fetchTablePreview(
  catalog: string,
  schema: string,
  table: string
): Promise<TablePreview> {
  const response = await fetch(
    `/api/explore/tables/${catalog}/${schema}/${table}/preview`
  );
  if (!response.ok) throw new Error("Failed to fetch table preview");
  return response.json();
}

export function Explore() {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);

  // Fetch all schemas
  const { data: schemas, isLoading: schemasLoading } = useQuery({
    queryKey: ["explore", "schemas"],
    queryFn: fetchSchemas,
  });

  const toggleSchema = (schemaKey: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaKey)) {
      newExpanded.delete(schemaKey);
    } else {
      newExpanded.add(schemaKey);
    }
    setExpandedSchemas(newExpanded);
  };

  const toggleVolume = (volumeKey: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeKey)) {
      newExpanded.delete(volumeKey);
    } else {
      newExpanded.add(volumeKey);
    }
    setExpandedVolumes(newExpanded);
  };

  const selectTable = (catalog: string, schema: string, table: string) => {
    setSelectedAsset({
      type: "table",
      catalog,
      schema,
      name: table,
      fullPath: `${catalog}.${schema}.${table}`,
    });
  };

  const selectVolume = (catalog: string, schema: string, volume: string) => {
    setSelectedAsset({
      type: "volume",
      catalog,
      schema,
      name: volume,
      volumePath: `${catalog}.${schema}.${volume}`,
    });
  };

  const selectFile = (
    catalog: string,
    schema: string,
    volume: string,
    file: FileInfo
  ) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    setSelectedAsset({
      type: isPdf ? "pdf" : "file",
      catalog,
      schema,
      name: file.name,
      fullPath: file.path,
      volumePath: `${catalog}.${schema}.${volume}`,
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar: Asset Tree */}
      <div
        className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border p-4"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(30, 41, 59, 0.8)",
        }}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Data Catalog</h2>

        {schemasLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading schemas...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {schemas?.map((schemaAsset) => {
              const schemaKey = `${schemaAsset.catalog}.${schemaAsset.schema}`;
              const isExpanded = expandedSchemas.has(schemaKey);

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
                    <span className="font-medium text-white">
                      {schemaAsset.schema}
                    </span>
                  </button>

                  {/* Expanded: Tables & Volumes */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {/* Tables */}
                      {schemaAsset.tables.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Tables
                          </div>
                          {schemaAsset.tables.map((table) => (
                            <button
                              key={table.full_name}
                              onClick={() =>
                                selectTable(
                                  schemaAsset.catalog,
                                  schemaAsset.schema,
                                  table.name
                                )
                              }
                              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-700/50"
                              style={{
                                backgroundColor:
                                  selectedAsset?.fullPath === table.full_name
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : undefined,
                              }}
                            >
                              <Table className="h-3.5 w-3.5 text-green-400" />
                              <span className="text-gray-300">{table.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Volumes */}
                      {schemaAsset.volumes.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Volumes
                          </div>
                          {schemaAsset.volumes.map((volume) => {
                            const volumeKey = volume.full_name;
                            const isVolumeExpanded = expandedVolumes.has(volumeKey);

                            return (
                              <div key={volumeKey}>
                                <button
                                  onClick={() => {
                                    toggleVolume(volumeKey);
                                    selectVolume(
                                      schemaAsset.catalog,
                                      schemaAsset.schema,
                                      volume.name
                                    );
                                  }}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-700/50"
                                >
                                  {isVolumeExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                  <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                                  <span className="text-gray-300">
                                    {volume.name}
                                  </span>
                                </button>

                                {/* Volume Files */}
                                {isVolumeExpanded && (
                                  <VolumeFileTree
                                    catalog={schemaAsset.catalog}
                                    schema={schemaAsset.schema}
                                    volume={volume.name}
                                    onSelectFile={(file) =>
                                      selectFile(
                                        schemaAsset.catalog,
                                        schemaAsset.schema,
                                        volume.name,
                                        file
                                      )
                                    }
                                    selectedPath={selectedAsset?.fullPath}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Panel: Preview */}
      <div className="flex-1 overflow-y-auto">
        {selectedAsset ? (
          <AssetPreview asset={selectedAsset} />
        ) : (
          <Card className="border-slate-700/50 bg-slate-900/50">
            <CardContent className="flex h-96 items-center justify-center">
              <div className="text-center">
                <Database className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-300">
                  Select an asset to preview
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a table or volume from the sidebar
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Volume File Tree Component
function VolumeFileTree({
  catalog,
  schema,
  volume,
  onSelectFile,
  selectedPath,
  path = "/",
}: {
  catalog: string;
  schema: string;
  volume: string;
  onSelectFile: (file: FileInfo) => void;
  selectedPath?: string;
  path?: string;
}) {
  const { data: files, isLoading } = useQuery({
    queryKey: ["explore", "volume-files", catalog, schema, volume, path],
    queryFn: () => fetchVolumeFiles(catalog, schema, volume, path),
  });

  if (isLoading) {
    return (
      <div className="ml-6 flex items-center gap-2 py-1 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading files...
      </div>
    );
  }

  return (
    <div className="ml-6 space-y-0.5">
      {files?.map((file) => (
        <button
          key={file.path}
          onClick={() => !file.is_directory && onSelectFile(file)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-slate-700/50"
          style={{
            backgroundColor:
              selectedPath === file.path
                ? "rgba(59, 130, 246, 0.2)"
                : undefined,
          }}
        >
          <FileText className="h-3 w-3 text-gray-400" />
          <span className="text-gray-400">{file.name}</span>
        </button>
      ))}
    </div>
  );
}

// Asset Preview Component
function AssetPreview({ asset }: { asset: SelectedAsset }) {
  const { type, catalog, schema, name, fullPath, volumePath } = asset;

  // Generate Databricks URL
  const getDatabricksUrl = () => {
    const baseUrl = window.location.origin;
    if (type === "table") {
      return `${baseUrl}/explore/data/${catalog}/${schema}/${name}`;
    } else if (type === "volume" || type === "file" || type === "pdf") {
      return `${baseUrl}/explore/data/volumes/${volumePath}`;
    }
    return baseUrl;
  };

  if (type === "table") {
    return <TablePreviewPanel catalog={catalog} schema={schema} table={name} databricksUrl={getDatabricksUrl()} />;
  } else if (type === "pdf") {
    // Convert to CitationBlock for PDF preview
    const pdfBlock: CitationBlock = {
      id: `pdf-preview-${fullPath}`,
      type: "citation",
      title: name,
      url: fullPath || "",
    };
    return (
      <div className="h-full rounded-lg border" style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}>
        <FullPDFView block={pdfBlock} />
      </div>
    );
  } else if (type === "volume") {
    return (
      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Volume: {name}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getDatabricksUrl(), "_blank")}
              className="gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Databricks
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            Browse files in the sidebar to preview
          </p>
        </CardContent>
      </Card>
    );
  } else {
    return (
      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Preview not available for this file type</p>
        </CardContent>
      </Card>
    );
  }
}

// Table Preview Panel
function TablePreviewPanel({
  catalog,
  schema,
  table,
  databricksUrl,
}: {
  catalog: string;
  schema: string;
  table: string;
  databricksUrl: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["explore", "table-preview", catalog, schema, table],
    queryFn: () => fetchTablePreview(catalog, schema, table),
  });

  return (
    <Card className="border-slate-700/50 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{table}</CardTitle>
            <p className="mt-1 text-sm text-gray-400">
              {catalog}.{schema}.{table}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(databricksUrl, "_blank")}
            className="gap-2"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Databricks
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preview...
          </div>
        ) : error ? (
          <div className="text-red-400">Failed to load table preview</div>
        ) : data && data.rows.length > 0 ? (
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
            <div className="mt-4 text-xs text-gray-500">
              Showing first {data.rows.length} rows
            </div>
          </div>
        ) : (
          <div className="text-gray-400">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
