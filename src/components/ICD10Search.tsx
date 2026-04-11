import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export interface ICD10Code {
  code: string;
  description: string;
}

// ── Single-select props ──────────────────────────────────────────────────────
interface SingleProps {
  multiple?: false;
  label?: string;
  selectedCode?: string;
  selectedDescription?: string;
  onSelect: (code: string, description: string) => void;
  onClear: () => void;
  placeholder?: string;
}

// ── Multi-select props ───────────────────────────────────────────────────────
interface MultiProps {
  multiple: true;
  label?: string;
  selectedCodes?: ICD10Code[];
  onSelect: (codes: ICD10Code[]) => void;
  placeholder?: string;
}

type ICD10SearchProps = SingleProps | MultiProps;

function SearchBox({
  placeholder,
  onPick,
}: {
  placeholder: string;
  onPick: (item: ICD10Code) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ICD10Code[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 1) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/icd10/search', { params: { q: value } });
        setResults(res.data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelect = (item: ICD10Code) => {
    onPick(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="pl-8"
      />
      {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map(item => (
            <button key={item.code} type="button" onMouseDown={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 border-b last:border-0">
              <Badge variant="outline" className="font-mono text-xs mt-0.5 shrink-0">{item.code}</Badge>
              <span className="text-sm text-gray-700">{item.description}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.length >= 1 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-sm px-3 py-2 text-sm text-muted-foreground">
          No codes found for "{query}"
        </div>
      )}
    </div>
  );
}

export function ICD10Search(props: ICD10SearchProps) {
  const label = props.label ?? 'ICD-10 Code';
  const placeholder = props.placeholder ?? 'Search by code or diagnosis (e.g. J18, pneumonia)...';

  // ── Multi-select mode ──────────────────────────────────────────────────────
  if (props.multiple) {
    const selected = props.selectedCodes ?? [];
    const add = (item: ICD10Code) => {
      if (selected.some(s => s.code === item.code)) return; // no duplicates
      props.onSelect([...selected, item]);
    };
    const remove = (code: string) => props.onSelect(selected.filter(s => s.code !== code));

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map(s => (
              <div key={s.code} className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <Badge variant="outline" className="font-mono text-blue-700 border-blue-300 bg-white text-xs">{s.code}</Badge>
                <span className="text-blue-800 max-w-[200px] truncate">{s.description}</span>
                <button onClick={() => remove(s.code)} className="text-blue-400 hover:text-blue-600 ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <SearchBox placeholder={placeholder} onPick={add} />
      </div>
    );
  }

  // ── Single-select mode (backward-compatible) ───────────────────────────────
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {props.selectedCode ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-blue-50 border-blue-200">
          <Badge variant="outline" className="font-mono text-blue-700 border-blue-300 bg-white">{props.selectedCode}</Badge>
          <span className="text-sm text-blue-800 flex-1">{props.selectedDescription}</span>
          <button onClick={props.onClear} className="text-blue-400 hover:text-blue-600"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <SearchBox placeholder={placeholder} onPick={item => props.onSelect(item.code, item.description)} />
      )}
    </div>
  );
}
