import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Trash2,
  Users,
  Shield,
  Star,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Squad, Player, PlayerRole } from '../types';

interface ParsedPlayerRow {
  id: string;
  selected: boolean;
  name: string;
  jerseyNumber: number | string;
  role: PlayerRole;
  isCaptain: boolean;
  isWicketKeeper: boolean;
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
}

interface ExcelPlayerImporterModalProps {
  squad: Squad;
  isOpen: boolean;
  onClose: () => void;
  onImport: (newPlayers: Player[], mode: 'append' | 'replace') => void;
}

export const ExcelPlayerImporterModal: React.FC<ExcelPlayerImporterModalProps> = ({
  squad,
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedPlayerRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process a loaded worksheet into candidate player rows
  const processWorksheet = (ws: XLSX.WorkSheet, squadPlayers: Player[]) => {
    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    if (!rawData || rawData.length === 0) {
      setErrorNotice('The selected spreadsheet sheet is completely empty.');
      setPreviewRows([]);
      return;
    }

    let headerIndex = -1;
    let colName = -1;
    let colJersey = -1;
    let colRole = -1;
    let colCap = -1;
    let colWk = -1;

    // Detect header row if present
    for (let r = 0; r < Math.min(rawData.length, 6); r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toLowerCase();
        if (val.includes('name') || val.includes('player')) colName = c;
        else if (val.includes('jersey') || val.includes('number') || val === 'no' || val === '#') colJersey = c;
        else if (val.includes('role') || val.includes('type') || val.includes('special')) colRole = c;
        else if (val.includes('capt') || val === '(c)') colCap = c;
        else if (val.includes('keeper') || val.includes('wk') || val === '(wk)') colWk = c;
      }

      if (colName !== -1) {
        headerIndex = r;
        break;
      }
    }

    const rowsToScan = headerIndex !== -1 ? rawData.slice(headerIndex + 1) : rawData;
    const candidates: ParsedPlayerRow[] = [];
    const seenNames = new Set<string>();

    // Existing names in squad for duplicate warning if appending
    const existingSquadNames = new Set(squadPlayers.map((p) => p.name.trim().toLowerCase()));

    let autoJerseyCounter = squadPlayers.length + 1;

    for (let rIdx = 0; rIdx < rowsToScan.length; rIdx++) {
      const row = rowsToScan[rIdx];
      if (!Array.isArray(row) || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
        continue; // skip blank rows
      }

      let pName = '';
      let pJersey: number | string = '';
      let pRole: PlayerRole = 'Batsman';
      let pCap = false;
      let pWk = false;

      if (colName !== -1) {
        pName = String(row[colName] || '').trim();
        if (colJersey !== -1 && row[colJersey] !== undefined && row[colJersey] !== '') {
          pJersey = row[colJersey];
        }
        if (colRole !== -1 && row[colRole]) {
          const roleStr = String(row[colRole]).toLowerCase();
          if (roleStr.includes('bowl')) pRole = 'Bowler';
          else if (roleStr.includes('all') || roleStr.includes('round')) pRole = 'All-Rounder';
          else if (roleStr.includes('keeper') || roleStr.includes('wk')) {
            pRole = 'Wicket-Keeper';
            pWk = true;
          }
        }
        if (colCap !== -1 && row[colCap]) {
          const cVal = String(row[colCap]).toLowerCase();
          if (cVal === 'yes' || cVal === 'true' || cVal === '1' || cVal.includes('c')) pCap = true;
        }
        if (colWk !== -1 && row[colWk]) {
          const wkVal = String(row[colWk]).toLowerCase();
          if (wkVal === 'yes' || wkVal === 'true' || wkVal === '1' || wkVal.includes('wk')) pWk = true;
        }
      } else {
        // No explicit header found: intelligent heuristic mapping
        // Scan cells in the row
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (!val) continue;

          if (!pJersey && /^\d+$/.test(val) && Number(val) > 0 && Number(val) <= 999) {
            pJersey = parseInt(val, 10);
          } else if (!pName && val.length > 1 && !/^\d+$/.test(val)) {
            pName = val;
          } else if (pName && !pRole) {
            const low = val.toLowerCase();
            if (low.includes('bowl')) pRole = 'Bowler';
            else if (low.includes('all') || low.includes('round')) pRole = 'All-Rounder';
            else if (low.includes('keeper') || low.includes('wk')) {
              pRole = 'Wicket-Keeper';
              pWk = true;
            }
          }
        }
      }

      // Detect (C) and (WK) in the name itself
      const nameLower = pName.toLowerCase();
      if (nameLower.includes('(c)') || nameLower.includes('(capt)')) pCap = true;
      if (nameLower.includes('(wk)') || nameLower.includes('(keeper)')) pWk = true;
      pName = pName.replace(/\(c\)|\(capt\)|\(wk\)|\(keeper\)/gi, '').trim();

      if (!pName) continue; // Skip rows without a name

      // Validation logic
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage: string | undefined = undefined;

      const normName = pName.toLowerCase();
      if (seenNames.has(normName)) {
        status = 'error';
        statusMessage = 'Duplicate name in this sheet';
      } else if (existingSquadNames.has(normName)) {
        status = 'warning';
        statusMessage = 'Player already in current squad';
      }

      if (!pJersey || pJersey === '') {
        pJersey = autoJerseyCounter++;
        if (status === 'valid') {
          status = 'warning';
          statusMessage = 'Auto-assigned jersey #' + pJersey;
        }
      }

      seenNames.add(normName);

      candidates.push({
        id: `imp-${rIdx}-${Date.now()}`,
        selected: status !== 'error',
        name: pName,
        jerseyNumber: pJersey,
        role: pRole,
        isCaptain: pCap,
        isWicketKeeper: pWk,
        status,
        statusMessage,
      });
    }

    if (candidates.length === 0) {
      setErrorNotice('No valid player records found in this sheet. Please check columns.');
    } else {
      setErrorNotice('');
    }

    setPreviewRows(candidates);
  };

  // Handle file reading
  const handleFile = (selectedFile: File) => {
    setErrorNotice('');
    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);

        const ws = wb.Sheets[firstSheet];
        processWorksheet(ws, squad.players);
      } catch (err: any) {
        console.error('Excel read failed', err);
        setErrorNotice('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
        setPreviewRows([]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorNotice('Error reading file from disk.');
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Sheet switch
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const ws = workbook.Sheets[sheetName];
      processWorksheet(ws, squad.players);
    }
  };

  // Row selection toggle
  const toggleRow = (id: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  // Select/Deselect all
  const toggleAll = (select: boolean) => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  // Row edits
  const updateRowField = (id: string, field: keyof ParsedPlayerRow, value: any) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Delete row from preview
  const removeRow = (id: string) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Final Import
  const handleExecuteImport = () => {
    const selectedRows = previewRows.filter((r) => r.selected && r.name.trim());
    if (selectedRows.length === 0) {
      setErrorNotice('Please select at least one player to import.');
      return;
    }

    const formattedPlayers: Player[] = selectedRows.map((r) => ({
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: r.name.trim(),
      jerseyNumber: r.jerseyNumber || squad.players.length + 1,
      role: r.role,
      isCaptain: r.isCaptain,
      isWicketKeeper: r.isWicketKeeper,
    }));

    onImport(formattedPlayers, importMode);
    onClose();
  };

  // Download Sample Excel Template
  const handleDownloadSample = () => {
    try {
      const sampleData = [
        ['Jersey Number', 'Player Name', 'Role', 'Captain (Yes/No)', 'Wicket Keeper (Yes/No)'],
        [18, 'Pathum Nissanka', 'Batsman', 'No', 'No'],
        [13, 'Kusal Mendis', 'Wicket-Keeper', 'No', 'Yes'],
        [72, 'Charith Asalanka', 'All-Rounder', 'Yes', 'No'],
        [61, 'Maheesh Theekshana', 'Bowler', 'No', 'No'],
        [81, 'Matheesha Pathirana', 'Bowler', 'No', 'No'],
        [7, 'Dasun Shanaka', 'All-Rounder', 'No', 'No'],
        [21, 'Kamindu Mendis', 'Batsman', 'No', 'No'],
        [98, 'Dilshan Madushanka', 'Bowler', 'No', 'No'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Squad_Players');
      XLSX.writeFile(wb, `${squad.shortCode || 'Squad'}_Players_Template.xlsx`);
    } catch (e) {
      console.error('Failed to download template', e);
    }
  };

  const validCount = previewRows.filter((r) => r.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-tech font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
                IMPORT PLAYERS FROM EXCEL
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {squad.teamName}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select .xlsx or .xls spreadsheet file • Instant preview & validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Picker Zone */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-950/30'
                : file
                ? 'border-emerald-500/60 bg-slate-950/80 hover:border-emerald-400'
                : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/40 hover:bg-slate-950/80'
            }`}
          >
            <Upload className="w-8 h-8 text-emerald-400 mb-1 animate-pulse" />
            <div className="font-tech font-bold text-sm text-white">
              {file ? file.name : 'Click to select Excel file or drag & drop here'}
            </div>
            <p className="text-xs text-slate-400">
              Supports Microsoft Excel <span className="text-emerald-400 font-mono font-bold">.xlsx</span>,{' '}
              <span className="text-emerald-400 font-mono font-bold">.xls</span>, and CSV spreadsheets
            </p>
            {file && (
              <span className="mt-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700">
                {(file.size / 1024).toFixed(1)} KB • Loaded successfully
              </span>
            )}
          </div>

          {/* Sheet Selector & Sample Template button */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="font-tech font-bold text-slate-400">SHEET:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-tech font-bold focus:outline-none focus:border-emerald-500"
                >
                  {sheetNames.map((sn) => (
                    <option key={sn} value={sn}>
                      {sn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-tech font-bold border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" /> DOWNLOAD SAMPLE .XLSX TEMPLATE
            </button>
          </div>

          {/* Error notice */}
          {errorNotice && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2 font-tech">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Table Preview of Extracted Data */}
          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-tech font-bold text-white uppercase tracking-wider">
                    EXTRACTED PLAYERS PREVIEW ({validCount} of {previewRows.length} selected)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAll(true)}
                      className="text-[11px] text-emerald-400 hover:underline font-tech"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => toggleAll(false)}
                      className="text-[11px] text-slate-400 hover:underline font-tech"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-tech">
                  <span className="text-slate-400">Import Mode:</span>
                  <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-500"
                    />
                    <span>Append ({squad.players.length} existing)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-red-300">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-red-500"
                    />
                    <span>Replace Entire Squad</span>
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs font-sans-ui">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-tech font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="px-3 py-2.5 w-10 text-center">IMPORT</th>
                      <th className="px-3 py-2.5 w-20">JERSEY</th>
                      <th className="px-3 py-2.5">PLAYER NAME</th>
                      <th className="px-3 py-2.5 w-36">ROLE</th>
                      <th className="px-3 py-2.5 w-28 text-center">BADGES</th>
                      <th className="px-3 py-2.5">VALIDATION</th>
                      <th className="px-3 py-2.5 w-12 text-center">DEL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-tech">
                    {previewRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition ${
                          row.selected
                            ? 'hover:bg-slate-900/60'
                            : 'opacity-45 bg-slate-950/40 hover:opacity-75'
                        }`}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(row.id)}
                            className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.jerseyNumber}
                            onChange={(e) => updateRowField(row.id, 'jerseyNumber', e.target.value)}
                            className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateRowField(row.id, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.role}
                            onChange={(e) =>
                              updateRowField(row.id, 'role', e.target.value as PlayerRole)
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket-Keeper">Wicket-Keeper</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateRowField(row.id, 'isCaptain', !row.isCaptain)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                                row.isCaptain
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                              }`}
                              title="Toggle Captain"
                            >
                              (C)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateRowField(row.id, 'isWicketKeeper', !row.isWicketKeeper)
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                                row.isWicketKeeper
                                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                              }`}
                              title="Toggle Wicket Keeper"
                            >
                              (WK)
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {row.status === 'valid' ? (
                            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : row.status === 'warning' ? (
                            <span className="text-amber-400 text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {row.statusMessage || 'Check data'}
                            </span>
                          ) : (
                            <span className="text-red-400 text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {row.statusMessage || 'Duplicate'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 transition"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90">
          <div className="text-xs font-tech text-slate-400">
            {previewRows.length > 0 ? (
              <span>
                Ready to import <strong className="text-emerald-400 font-bold">{validCount}</strong>{' '}
                players into <strong className="text-white">{squad.teamName}</strong>
              </span>
            ) : (
              <span>Select an Excel file to begin</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-tech font-bold text-xs uppercase transition"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validCount === 0}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-tech font-black text-xs uppercase shadow transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> IMPORT {validCount} PLAYERS NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
