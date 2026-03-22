import React from 'react';

interface JsonViewerProps {
  data: any;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  return (
    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono shadow-inner border border-slate-700 max-h-96">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
};
