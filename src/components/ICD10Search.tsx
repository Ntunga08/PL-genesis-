import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ICD10Code {
  code: string;
  description: string;
}

interface ICD10SearchProps {
  label?: string;
  selectedCode?: string;
  selectedDescription?: string;
  onSelect: (code: string, description: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function ICD10Search({
  label = 'ICD-10 Code',
  selectedCode,
  selectedDescription,
  onSelect,
  onClear,
  placeholder = 'Search by code or diagnosis (e.g. J18, pneumonia)...',
}: ICD10SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ICD10Code[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setOpen(false); return; }

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const handleSelect = (item: ICD10Code) => {
    onSelect(item.code, item.description);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>

      {selectedCode ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-blue-50 border-blue-200">
          <Badge variant="outline" className="font-mono text-blue-700 border-blue-300 bg-white">
            {selectedCode}
          </Badge>
          <span className="text-sm text-blue-800 flex-1">{selectedDescription}</span>
          <button onClick={onClear} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={handleChange}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={placeholder}
              className="pl-8"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 border-b last:border-0"
                >
                  <Badge variant="outline" className="font-mono text-xs mt-0.5 shrink-0">
                    {item.code}
                  </Badge>
                  <span className="text-sm text-gray-700">{item.description}</span>
                </button>
              ))}
            </div>
          )}

          {open && !loading && query.length >= 2 && results.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-sm px-3 py-2 text-sm text-muted-foreground">
              No codes found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
